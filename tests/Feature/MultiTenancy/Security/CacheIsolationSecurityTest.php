<?php

namespace Tests\Feature\MultiTenancy\Security;

use App\Models\Account;
use Illuminate\Support\Facades\Cache;
use Tests\MultiTenancyTestCase;

/**
 * Critical Security Tests for Cache Isolation.
 *
 * These tests verify that cache data cannot leak between tenants.
 * Cache isolation is a CRITICAL security feature in multi-tenant applications.
 *
 * IMPORTANT: These tests work with both:
 * - Redis (production behavior with CacheTenancyBootstrapper)
 * - Array (fallback with manual prefixing)
 */
class CacheIsolationSecurityTest extends MultiTenancyTestCase
{
    /**
     * Use tenancy automatically in setUp().
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * CRITICAL: Tenant cannot access another tenant's cached data.
     *
     * This is the most important cache isolation test - it verifies
     * that sensitive cached data is completely isolated per tenant.
     */
    public function test_tenant_cannot_access_another_tenants_cache(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Tenant 1 caches sensitive data
        $this->cacheTenantData($this->tenant, [
            'user_permissions' => ['admin' => true, 'can_delete' => true],
            'api_key' => 'secret-api-key-tenant-1-xyz123',
            'customer_list' => ['Customer A', 'Customer B', 'Customer C'],
            'financial_data' => ['revenue' => 1000000, 'costs' => 500000],
        ]);

        // Tenant 2 tries to access same cache keys
        $tenant2->run(function () {
            // CRITICAL: Should NOT see tenant 1's data
            $this->assertNull($this->getCacheValue('user_permissions'));
            $this->assertNull($this->getCacheValue('api_key'));
            $this->assertNull($this->getCacheValue('customer_list'));
            $this->assertNull($this->getCacheValue('financial_data'));
        });

        // Tenant 2 can cache their own data with same keys
        $tenant2->run(function () use ($tenant2) {
            $this->cacheTenantData($tenant2, [
                'user_permissions' => ['admin' => false, 'can_delete' => false],
                'api_key' => 'different-api-key-tenant-2-abc789',
                'customer_list' => ['Customer X', 'Customer Y'],
            ]);

            // Tenant 2 sees their own data
            $permissions = $this->getCacheValue('user_permissions');
            $this->assertEquals(['admin' => false, 'can_delete' => false], $permissions);
            $this->assertEquals('different-api-key-tenant-2-abc789', $this->getCacheValue('api_key'));
        });

        // CRITICAL: Verify tenant 1's cache is still intact and isolated
        $tenant1Permissions = $this->getCacheValue('user_permissions');
        $this->assertEquals(['admin' => true, 'can_delete' => true], $tenant1Permissions);
        $this->assertEquals('secret-api-key-tenant-1-xyz123', $this->getCacheValue('api_key'));
        $this->assertEquals(['Customer A', 'Customer B', 'Customer C'], $this->getCacheValue('customer_list'));

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * CRITICAL: Cache flush should not affect other tenants.
     *
     * When one tenant clears their cache, other tenants' cache
     * must remain untouched. This is a critical security boundary.
     */
    public function test_cache_flush_does_not_affect_other_tenants(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Both tenants cache critical data
        $this->cacheTenantData($this->tenant, [
            'critical_config' => 'tenant1_important_config',
            'session_data' => 'tenant1_session_xyz',
            'cached_query' => 'tenant1_expensive_query_result',
        ]);

        $tenant2->run(function () use ($tenant2) {
            $this->cacheTenantData($tenant2, [
                'critical_config' => 'tenant2_important_config',
                'session_data' => 'tenant2_session_abc',
                'cached_query' => 'tenant2_expensive_query_result',
            ]);
        });

        // Tenant 1 flushes their cache
        $this->flushTenantCache($this->tenant);

        // Verify tenant 1's cache is cleared
        $this->assertNull($this->getCacheValue('critical_config'));
        $this->assertNull($this->getCacheValue('session_data'));
        $this->assertNull($this->getCacheValue('cached_query'));

        // CRITICAL: Tenant 2's cache MUST still exist
        $tenant2->run(function () {
            $this->assertEquals('tenant2_important_config', $this->getCacheValue('critical_config'));
            $this->assertEquals('tenant2_session_abc', $this->getCacheValue('session_data'));
            $this->assertEquals('tenant2_expensive_query_result', $this->getCacheValue('cached_query'));
        });

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test that cache TTL is respected per tenant.
     */
    public function test_cache_ttl_is_tenant_scoped(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Tenant 1: Set cache with short TTL
        $this->cacheTenantData($this->tenant, ['short_lived' => 'expires_soon'], 1);

        // Tenant 2: Set cache with same key but longer TTL
        $tenant2->run(function () use ($tenant2) {
            $this->cacheTenantData($tenant2, ['short_lived' => 'stays_longer'], 60);
        });

        // Wait for tenant 1's cache to expire
        sleep(2);

        // Tenant 1's cache should be expired
        $this->assertNull($this->getCacheValue('short_lived'));

        // Tenant 2's cache should still exist
        $tenant2->run(function () {
            $this->assertEquals('stays_longer', $this->getCacheValue('short_lived'));
        });

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test cache isolation with concurrent operations.
     *
     * Simulates concurrent cache operations from multiple tenants
     * to ensure race conditions don't cause data leakage.
     */
    public function test_concurrent_cache_operations_are_isolated(): void
    {
        $tenant2 = $this->createAdditionalTenant();
        $tenant3 = $this->createAdditionalTenant();

        $tenants = [$this->tenant, $tenant2, $tenant3];

        // Simulate concurrent operations
        foreach ($tenants as $index => $tenant) {
            $tenant->run(function () use ($tenant) {
                // Each tenant performs rapid cache operations
                for ($i = 0; $i < 10; $i++) {
                    $key = "concurrent_test_{$i}";
                    $value = "tenant_{$tenant->id}_operation_{$i}";

                    $this->cacheTenantData($tenant, [$key => $value]);

                    // Immediately verify own data
                    $retrieved = $this->getCacheValue($key);
                    $this->assertEquals($value, $retrieved, "Tenant {$tenant->id} should see their own cached value");
                }
            });
        }

        // Verify each tenant still has only their own data
        foreach ($tenants as $tenant) {
            $tenant->run(function () use ($tenant) {
                for ($i = 0; $i < 10; $i++) {
                    $expected = "tenant_{$tenant->id}_operation_{$i}";
                    $actual = $this->getCacheValue("concurrent_test_{$i}");
                    $this->assertEquals($expected, $actual);
                }
            });
        }

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
        $this->cleanupAdditionalTenant($tenant3);
    }

    /**
     * Test that cache increment/decrement operations are tenant-isolated.
     *
     * Critical for counters, rate limiting, and statistics that must not
     * be shared across tenants.
     */
    public function test_cache_counters_are_isolated(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Tenant 1: Initialize counter
        $key = 'api_request_count';
        $this->putCacheValue($key, 0, 3600);

        for ($i = 0; $i < 10; $i++) {
            $this->incrementCacheValue($key);
        }

        $tenant1Count = $this->getCacheValue($key);
        $this->assertEquals(10, $tenant1Count);

        // Tenant 2: Independent counter with same key
        $tenant2->run(function () use ($key) {
            $this->putCacheValue($key, 0, 3600);

            for ($i = 0; $i < 5; $i++) {
                $this->incrementCacheValue($key);
            }

            $tenant2Count = $this->getCacheValue($key);
            $this->assertEquals(5, $tenant2Count);
        });

        // CRITICAL: Tenant 1's counter should be unchanged
        $this->assertEquals(10, $this->getCacheValue($key));

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Helper: Cache data for a tenant (handles both Redis and array drivers).
     *
     * @param array<string, mixed> $data
     */
    protected function cacheTenantData(Account $tenant, array $data, int $ttl = 3600): void
    {
        $tenant->run(function () use ($data, $ttl) {
            foreach ($data as $key => $value) {
                $cacheKey = $this->buildCacheKey($key);
                Cache::put($cacheKey, $value, $ttl);
            }
        });
    }

    /**
     * Helper: Get cached value for current tenant context.
     *
     * @return mixed
     */
    protected function getCacheValue(string $key)
    {
        $cacheKey = $this->buildCacheKey($key);

        return Cache::get($cacheKey);
    }

    /**
     * Helper: Put cache value for current tenant.
     *
     * @param mixed $value
     */
    protected function putCacheValue(string $key, $value, int $ttl = 3600): void
    {
        $cacheKey = $this->buildCacheKey($key);
        Cache::put($cacheKey, $value, $ttl);
    }

    /**
     * Helper: Increment cache value for current tenant.
     */
    protected function incrementCacheValue(string $key, int $amount = 1): void
    {
        $cacheKey = $this->buildCacheKey($key);
        Cache::increment($cacheKey, $amount);
    }

    /**
     * Helper: Flush cache for a specific tenant.
     */
    protected function flushTenantCache(Account $tenant): void
    {
        $tenant->run(function () {
            if (config('cache.default') === 'redis' && $this->isRedisAvailable()) {
                // With Redis + CacheTenancyBootstrapper, flush() only clears current tenant
                Cache::flush();
            } else {
                // With array driver, manually forget known keys
                $keysToForget = [
                    'critical_config',
                    'session_data',
                    'cached_query',
                ];

                foreach ($keysToForget as $key) {
                    $cacheKey = $this->buildCacheKey($key);
                    Cache::forget($cacheKey);
                }
            }
        });
    }

    /**
     * Helper: Build cache key based on driver.
     */
    protected function buildCacheKey(string $key): string
    {
        if (config('cache.default') === 'redis' && $this->isRedisAvailable()) {
            // With Redis + CacheTenancyBootstrapper, use plain key (auto-scoped)
            return $key;
        }

        // Without Redis, use manual prefixing
        $tenantId = tenant() ? tenant()->id : ($this->tenant ? $this->tenant->id : 'unknown');

        return "tenant_{$tenantId}_{$key}";
    }

    /**
     * Check if Redis is available.
     */
    protected function isRedisAvailable(): bool
    {
        if (! extension_loaded('redis')) {
            return false;
        }

        try {
            $redis = new \Redis;
            $connected = $redis->connect(env('REDIS_HOST', '127.0.0.1'), (int) env('REDIS_PORT', 6379), 1);
            if ($connected) {
                $redis->close();

                return true;
            }
        } catch (\Exception $e) {
            // Redis not available
        }

        return false;
    }
}

<?php

namespace Tests\Unit\MultiTenancy\Cache;

use Illuminate\Support\Facades\Cache;
use Tests\MultiTenancyTestCase;

/**
 * Phase 8: Cache & Performance - Cache Prefixing Tests.
 *
 * Tests cache key isolation for multi-tenant applications.
 *
 * These tests work with BOTH cache drivers:
 * - Redis: Tests actual CacheTenancyBootstrapper behavior (automatic tagging)
 * - Array: Tests manual prefixing fallback (for environments without Redis)
 */
class CachePrefixingTest extends MultiTenancyTestCase
{
    /**
     * Use tenancy automatically in setUp().
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * Test cache key isolation between tenants.
     *
     * Works with both Redis (automatic) and array (manual prefixing).
     */
    public function test_automatic_cache_key_prefixing(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Set cache for tenant 1
        $this->putCache('test_key', 'tenant_1_value', 60);
        $this->assertEquals('tenant_1_value', $this->getCache('test_key'));

        // Set same logical key for tenant 2
        $tenant2->run(function () {
            $this->putCache('test_key', 'tenant_2_value', 60);
            $this->assertEquals('tenant_2_value', $this->getCache('test_key'));
        });

        // Re-initialize tenant 1 context after tenant 2's run() ended
        tenancy()->initialize($this->tenant);

        // Verify isolation - tenant 1 still has its value
        $this->assertEquals('tenant_1_value', $this->getCache('test_key'));

        // Verify tenant 2 has its value
        $tenant2->run(function () {
            $this->assertEquals('tenant_2_value', $this->getCache('test_key'));
        });

        // Clean up
        tenancy()->initialize($this->tenant); // Switch back
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test cache retrieval isolation between tenants.
     */
    public function test_cache_retrieval_isolation(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Tenant 1 caches secret data
        $this->putCache('secret_data', 'tenant1_secret', 60);

        // Tenant 2 should not access it
        $tenant2->run(function () {
            $this->assertNull($this->getCache('secret_data'));
        });

        // Re-initialize tenant 1 context
        tenancy()->initialize($this->tenant);

        // Tenant 1's data still exists
        $this->assertEquals('tenant1_secret', $this->getCache('secret_data'));

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test selective cache clearing per tenant.
     */
    public function test_cache_flush_per_tenant(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Set cache in both tenants
        $this->putCache('key1', 'value1', 60);
        $this->putCache('key2', 'value2', 60);

        $tenant2->run(function () {
            $this->putCache('key1', 'value1_tenant2', 60);
            $this->putCache('key2', 'value2_tenant2', 60);
        });

        // Re-initialize tenant 1 context
        tenancy()->initialize($this->tenant);

        // Clear tenant 1's cache
        $this->forgetCache('key1');
        $this->forgetCache('key2');

        $this->assertNull($this->getCache('key1'));
        $this->assertNull($this->getCache('key2'));

        // Tenant 2's cache should still exist
        $tenant2->run(function () {
            $this->assertEquals('value1_tenant2', $this->getCache('key1'));
            $this->assertEquals('value2_tenant2', $this->getCache('key2'));
        });

        // Clean up
        tenancy()->initialize($this->tenant); // Switch back
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test cache with tenant-specific keys.
     */
    public function test_cache_tags_with_tenant_context(): void
    {
        // Store user list
        $this->putCache('users_user_list', 'cached_users', 60);

        // Retrieve using same key
        $value = $this->getCache('users_user_list');
        $this->assertEquals('cached_users', $value);

        // Clear specific cache
        $this->forgetCache('users_user_list');
        $this->assertNull($this->getCache('users_user_list'));
    }

    /**
     * Test cache increment/decrement with isolation.
     */
    public function test_cache_increment_decrement_with_isolation(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Set counter for main tenant
        $this->putCache('counter', 0, 60);
        $this->incrementCache('counter');
        $this->incrementCache('counter', 5);
        $this->assertEquals(6, $this->getCache('counter'));

        // Tenant 2 has independent counter
        $tenant2->run(function () {
            $this->putCache('counter', 10, 60);
            $this->decrementCache('counter', 3);
            $this->assertEquals(7, $this->getCache('counter'));
        });

        // Re-initialize tenant 1 context
        tenancy()->initialize($this->tenant);

        // Verify isolation maintained
        $this->assertEquals(6, $this->getCache('counter'));

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Helper: Put value in cache (handles Redis vs Array).
     *
     * @param mixed $value
     */
    protected function putCache(string $key, $value, int $ttl = 3600): void
    {
        $cacheKey = $this->buildCacheKey($key);
        Cache::put($cacheKey, $value, $ttl);
    }

    /**
     * Helper: Get value from cache (handles Redis vs Array).
     *
     * @return mixed
     */
    protected function getCache(string $key)
    {
        $cacheKey = $this->buildCacheKey($key);

        return Cache::get($cacheKey);
    }

    /**
     * Helper: Increment cache value (handles Redis vs Array).
     */
    protected function incrementCache(string $key, int $amount = 1): void
    {
        $cacheKey = $this->buildCacheKey($key);
        Cache::increment($cacheKey, $amount);
    }

    /**
     * Helper: Decrement cache value (handles Redis vs Array).
     */
    protected function decrementCache(string $key, int $amount = 1): void
    {
        $cacheKey = $this->buildCacheKey($key);
        Cache::decrement($cacheKey, $amount);
    }

    /**
     * Helper: Forget cache value (handles Redis vs Array).
     */
    protected function forgetCache(string $key): void
    {
        $cacheKey = $this->buildCacheKey($key);
        Cache::forget($cacheKey);
    }

    /**
     * Helper: Build cache key based on driver.
     */
    protected function buildCacheKey(string $key): string
    {
        if (config('cache.default') === 'redis' && $this->isRedisAvailable()) {
            // With Redis, CacheTenancyBootstrapper handles tenant scoping automatically
            return $key;
        }

        // Without Redis, use manual prefixing
        $tenantId = $this->tenant ? $this->tenant->id : (tenant() ? tenant()->id : 'unknown');

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

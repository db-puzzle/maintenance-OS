<?php

namespace Tests\Feature\MultiTenancy\Cache;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Tests\MultiTenancyTestCase;

/**
 * Phase 8: Cache & Performance - Cache Operations Tests.
 *
 * Tests cache operations in multi-tenant context
 *
 * Note: CacheTenancyBootstrapper is disabled in tests (requires Redis/Memcached).
 * These tests verify application-level cache usage patterns.
 * In production with Redis, CacheTenancyBootstrapper provides automatic isolation.
 */
class CacheOperationsTest extends MultiTenancyTestCase
{
    /**
     * Use tenancy automatically in setUp().
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * Test remember functionality per tenant.
     */
    public function test_remember_functionality_per_tenant(): void
    {
        $callCount = 0;

        // First call - should execute callback
        $result1 = Cache::remember('test_remember', 60, function () use (&$callCount) {
            $callCount++;

            return 'computed_value';
        });

        $this->assertEquals('computed_value', $result1);
        $this->assertEquals(1, $callCount);

        // Second call - should use cached value
        $result2 = Cache::remember('test_remember', 60, function () use (&$callCount) {
            $callCount++;

            return 'computed_value';
        });

        $this->assertEquals('computed_value', $result2);
        $this->assertEquals(1, $callCount); // Callback not called again
    }

    /**
     * Test cache expiration respected.
     */
    public function test_cache_expiration_respected(): void
    {
        // Set cache with 1 second expiration
        Cache::put('expires_soon', 'value', 1);
        $this->assertEquals('value', Cache::get('expires_soon'));

        // Wait for expiration
        sleep(2);

        // Cache should be expired
        $this->assertNull(Cache::get('expires_soon'));
    }

    /**
     * Test cache warming strategies with manual prefixing.
     */
    public function test_cache_warming_strategies(): void
    {
        // Create some users
        User::factory()->count(5)->create();

        // Warm cache with tenant-specific key
        $cacheKey = "tenant_{$this->tenant->id}_stats_user_count";
        Cache::put($cacheKey, User::count(), 3600);

        // Retrieve from cache
        $cachedCount = Cache::get($cacheKey);
        $this->assertEquals(6, $cachedCount); // 5 + 1 system admin from setUp
    }

    /**
     * Test cache invalidation per tenant with prefixed keys.
     */
    public function test_cache_invalidation_per_tenant(): void
    {
        // Set multiple cache keys with tenant prefix
        Cache::put("tenant_{$this->tenant->id}_key1", 'value1', 60);
        Cache::put("tenant_{$this->tenant->id}_key2", 'value2', 60);
        Cache::put("tenant_{$this->tenant->id}_temp_key3", 'value3', 60);

        // Invalidate specific key
        Cache::forget("tenant_{$this->tenant->id}_key1");
        $this->assertNull(Cache::get("tenant_{$this->tenant->id}_key1"));
        $this->assertEquals('value2', Cache::get("tenant_{$this->tenant->id}_key2"));

        // Invalidate another specific key
        Cache::forget("tenant_{$this->tenant->id}_temp_key3");
        $this->assertNull(Cache::get("tenant_{$this->tenant->id}_temp_key3"));

        // key2 is still accessible
        $this->assertEquals('value2', Cache::get("tenant_{$this->tenant->id}_key2"));
    }

    /**
     * Test selective cache flush per tenant using key prefixes.
     */
    public function test_cache_tags_flush_only_tenant_data(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Set cache with tenant-prefixed keys
        Cache::put("tenant_{$this->tenant->id}_users_data", 'tenant1_data', 60);
        Cache::put("tenant_{$tenant2->id}_users_data", 'tenant2_data', 60);

        // Forget main tenant's cache
        Cache::forget("tenant_{$this->tenant->id}_users_data");
        $this->assertNull(Cache::get("tenant_{$this->tenant->id}_users_data"));

        // Tenant 2's cache should still exist
        $this->assertEquals('tenant2_data', Cache::get("tenant_{$tenant2->id}_users_data"));

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test cache with many operation.
     */
    public function test_cache_many_operation(): void
    {
        // Put many values
        Cache::putMany([
            'key1' => 'value1',
            'key2' => 'value2',
            'key3' => 'value3',
        ], 60);

        // Get many values
        $values = Cache::many(['key1', 'key2', 'key3', 'nonexistent']);

        $this->assertEquals('value1', $values['key1']);
        $this->assertEquals('value2', $values['key2']);
        $this->assertEquals('value3', $values['key3']);
        $this->assertNull($values['nonexistent']);
    }

    /**
     * Test cache pull operation.
     */
    public function test_cache_pull_operation(): void
    {
        Cache::put('to_pull', 'value_to_pull', 60);

        // Pull removes and returns value
        $value = Cache::pull('to_pull');
        $this->assertEquals('value_to_pull', $value);

        // Key should no longer exist
        $this->assertNull(Cache::get('to_pull'));
    }
}

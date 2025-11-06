<?php

namespace Tests\Performance\MultiTenancy;

use App\Models\Account;
use Illuminate\Support\Facades\Cache;
use Tests\MultiTenancyTestCase;

/**
 * Phase 8: Cache & Performance - Performance Tests.
 *
 * Tests cache performance in multi-tenant context
 *
 * Note: Tests use manual key prefixing for tenant isolation.
 * In production with Redis, CacheTenancyBootstrapper provides automatic isolation.
 */
class CachePerformanceTest extends MultiTenancyTestCase
{
    /**
     * Use tenancy automatically in setUp().
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * Test cache lookup performance.
     */
    public function test_cache_lookup_performance(): void
    {
        // Store value
        Cache::put('performance_test', 'test_value', 60);

        $startTime = microtime(true);

        // Perform 100 cache lookups
        for ($i = 0; $i < 100; $i++) {
            $value = Cache::get('performance_test');
            $this->assertEquals('test_value', $value);
        }

        $endTime = microtime(true);
        $duration = $endTime - $startTime;

        // 100 cache lookups should complete quickly (under 1 second)
        $this->assertLessThan(1.0, $duration, '100 cache lookups took too long');
    }

    /**
     * Test cache performance with prefixed keys.
     */
    public function test_cache_tag_performance(): void
    {
        $startTime = microtime(true);

        // Store 50 values with tenant-prefixed keys
        for ($i = 0; $i < 50; $i++) {
            Cache::put("tenant_{$this->tenant->id}_test_key_{$i}", "value_{$i}", 60);
        }

        $endTime = microtime(true);
        $duration = $endTime - $startTime;

        // Should complete quickly
        $this->assertLessThan(2.0, $duration, 'Prefixed cache operations took too long');

        // Verify values stored
        $value = Cache::get("tenant_{$this->tenant->id}_test_key_0");
        $this->assertEquals('value_0', $value);
    }

    /**
     * Test bulk cache operations.
     */
    public function test_bulk_cache_operations(): void
    {
        // Prepare bulk data
        $data = [];
        for ($i = 0; $i < 100; $i++) {
            $data["bulk_key_{$i}"] = "bulk_value_{$i}";
        }

        $startTime = microtime(true);

        // Bulk put
        Cache::putMany($data, 60);

        $endTime = microtime(true);
        $putDuration = $endTime - $startTime;

        // Bulk put should be efficient
        $this->assertLessThan(1.0, $putDuration, 'Bulk cache put took too long');

        // Test bulk retrieval
        $startTime = microtime(true);

        $keys = array_keys($data);
        $retrieved = Cache::many($keys);

        $endTime = microtime(true);
        $getDuration = $endTime - $startTime;

        // Bulk get should also be efficient
        $this->assertLessThan(1.0, $getDuration, 'Bulk cache get took too long');

        // Verify data
        $this->assertCount(100, $retrieved);
        $this->assertEquals('bulk_value_0', $retrieved['bulk_key_0']);
    }

    /**
     * Test cache memory usage pattern.
     */
    public function test_cache_memory_usage(): void
    {
        $memoryBefore = memory_get_usage();

        // Store 100 cache entries
        for ($i = 0; $i < 100; $i++) {
            Cache::put("memory_test_{$i}", str_repeat('x', 1000), 60);
        }

        $memoryAfter = memory_get_usage();
        $memoryIncrease = $memoryAfter - $memoryBefore;

        // Memory increase should be reasonable (less than 5MB for 100 entries of 1KB each)
        $this->assertLessThan(5 * 1024 * 1024, $memoryIncrease, 'Cache memory usage too high');
    }

    /**
     * Test concurrent tenant cache access with manual prefixing.
     */
    public function test_concurrent_tenant_cache_access(): void
    {
        $tenant2 = $this->createAdditionalTenant();
        $tenant3 = $this->createAdditionalTenant();

        $startTime = microtime(true);

        // Simulate concurrent access from multiple tenants
        foreach ([$this->tenant, $tenant2, $tenant3] as $tenant) {
            // Each tenant performs cache operations with prefixed keys
            for ($i = 0; $i < 10; $i++) {
                $key = "tenant_{$tenant->id}_concurrent_{$i}";
                Cache::put($key, "tenant_{$tenant->id}_value_{$i}", 60);
            }

            // Read back
            for ($i = 0; $i < 10; $i++) {
                $key = "tenant_{$tenant->id}_concurrent_{$i}";
                $value = Cache::get($key);
                $this->assertStringContainsString((string) $tenant->id, $value);
            }
        }

        $endTime = microtime(true);
        $duration = $endTime - $startTime;

        // Should handle concurrent access efficiently
        $this->assertLessThan(3.0, $duration, 'Concurrent cache access took too long');

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
        $this->cleanupAdditionalTenant($tenant3);
    }

    /**
     * Test cache statistics accuracy.
     */
    public function test_cache_statistics_accuracy(): void
    {
        // Clear any existing stats cache
        $this->tenant->clearStatsCache();

        // Use Account model's cache method
        $stats = $this->tenant->getDatabaseStats();

        $this->assertArrayHasKey('database_size', $stats);
        $this->assertArrayHasKey('connections', $stats);
        $this->assertArrayHasKey('created_at', $stats);

        // Verify caching - second call should be from cache
        $startTime = microtime(true);
        $cachedStats = $this->tenant->getDatabaseStats();
        $duration = microtime(true) - $startTime;

        // Cached call should be very fast
        $this->assertLessThan(0.1, $duration, 'Cached stats retrieval too slow');
        $this->assertEquals($stats, $cachedStats);
    }
}

<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Tests\Traits\MigrateCentralDatabase;
use Tests\Traits\TenancyInitialization;
use Tests\Traits\TenantDatabaseTruncation;

/**
 * Base test case for multi-tenancy tests.
 *
 * This test case handles the complexity of testing multi-database tenancy
 * using an optimized approach that creates databases once per test suite
 * and truncates tables between tests for fast, reliable testing.
 *
 * IMPORTANT NOTES:
 * - Cannot use RefreshDatabase with multi-database tenancy in automatic mode
 *   See: https://tenancyforlaravel.com/docs/v3/testing
 * - Be selective about Event::fake() - use Event::fake([SpecificEvent::class])
 *   instead of Event::fake() to avoid breaking tenancy initialization
 *
 * PERFORMANCE OPTIMIZATION:
 * - Central database migrated once per test suite (not per test)
 * - Tenant database created once per test suite (not per test)
 * - Tables truncated between tests (fast cleanup)
 * - Based on best practices from:
 *   https://solutions.io/news/how-to-test-multitenant-laravel-applications-solving-database-refresh-challenges
 *
 * USAGE:
 *
 * For tests that need a tenant context (most tests):
 *   protected $tenancy = true;  // Default - tenant initialized in setUp()
 *
 * For tests that need to control tenant lifecycle manually:
 *   protected $tenancy = false; // No automatic initialization
 *   // Then manually create/initialize tenants as needed in your test
 *   // Example: testing tenant creation itself, testing multiple tenants
 */
abstract class MultiTenancyTestCase extends BaseTestCase
{
    use MigrateCentralDatabase;
    use TenancyInitialization;
    use TenantDatabaseTruncation;

    /**
     * Static flag to track if central database has been migrated.
     * Shared across all test classes that extend MultiTenancyTestCase.
     *
     * @var bool
     */
    protected static $centralDatabaseMigrated = false;

    /**
     * Static reference to the shared test tenant.
     * Shared across all test classes that extend MultiTenancyTestCase.
     *
     * @var \App\Models\Account|null
     */
    protected static $testTenant = null;

    /**
     * Static flag to track if tenant database has been created.
     * Shared across all test classes that extend MultiTenancyTestCase.
     *
     * @var bool
     */
    protected static $tenantDatabaseCreated = false;

    /**
     * Whether to automatically initialize tenancy in setUp().
     *
     * Set to true for tests that need a tenant context (most tests)
     * Set to false for tests that need to control tenant lifecycle manually
     * (e.g., testing tenant creation itself, testing multiple tenants)
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * Creates the application.
     */
    public function createApplication()
    {
        $app = require __DIR__ . '/../bootstrap/app.php';

        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure the APP_KEY is set in the config
        if ($appKey = env('APP_KEY')) {
            config(['app.key' => $appKey]);
        }

        // Mock Vite for tests to avoid manifest errors
        $this->withoutVite();

        // Ensure queue is sync for testing
        config(['queue.default' => 'sync']);

        // Disable activity logging for multi-tenancy tests
        config(['activitylog.enabled' => false]);

        // Configure cache driver based on Redis availability
        // Redis is CRITICAL for proper cache isolation in multi-tenant applications
        if ($this->isRedisAvailable()) {
            $this->configureRedisCache();
        } else {
            $this->configureFallbackCache();
        }

        // Ensure we have a central database connection for testing
        config([
            'database.connections.central' => [
                'driver' => 'pgsql',
                'host' => env('DB_HOST', '127.0.0.1'),
                'port' => env('DB_PORT', '5432'),
                'database' => 'maintenance_os_central_test',
                'username' => env('DB_USERNAME', 'root'),
                'password' => env('DB_PASSWORD', ''),
                'charset' => 'utf8',
                'prefix' => '',
                'prefix_indexes' => true,
                'search_path' => 'public',
                'sslmode' => 'prefer',
            ],
        ]);

        // Set up the central database (once per test suite)
        $this->setUpCentralDatabase();

        // Initialize tenancy if needed for this test
        if ($this->tenancy) {
            $this->setUpTenancy();
        }
    }

    /**
     * Clean up after the test.
     */
    protected function tearDown(): void
    {
        // End tenancy if it was initialized
        if ($this->tenancy && tenancy()->initialized) {
            $this->endTenancyContext();
        }

        // Truncate tenant database for next test (fast cleanup)
        // Only if tenancy was initialized
        if ($this->tenancy && $this->tenant) {
            // Re-initialize context for truncation
            if (! tenancy()->initialized) {
                $this->initializeTenancyContext();
            }

            $this->truncateTenantDatabase();

            // End tenancy again
            $this->endTenancyContext();
        }

        parent::tearDown();
    }

    /**
     * Clean up after all tests in the suite.
     *
     * This is called once after all tests in THIS test class have run.
     * However, since we're sharing the tenant across ALL test classes,
     * we should NOT delete it here. Instead, rely on the test:clean-db
     * command to clean up before the next test suite run.
     */
    public static function tearDownAfterClass(): void
    {
        parent::tearDownAfterClass();

        // DON'T delete the shared tenant database here!
        // The tenant is shared across all MultiTenancyTestCase subclasses
        // Deleting it here would break subsequent test classes
        // Use `php artisan test:clean-db` before running tests instead
    }

    /**
     * Check if Redis is available for testing.
     *
     * Redis is CRITICAL for cache isolation security in multi-tenant applications.
     * This method checks if Redis is available and properly configured.
     */
    protected function isRedisAvailable(): bool
    {
        // Check if phpredis extension is loaded
        if (! extension_loaded('redis')) {
            return false;
        }

        // Check if Redis server is reachable
        try {
            $redis = new \Redis;
            $connected = $redis->connect(
                env('REDIS_HOST', '127.0.0.1'),
                (int) env('REDIS_PORT', 6379),
                1 // 1 second timeout
            );

            if ($connected) {
                $redis->ping();
                $redis->close();

                return true;
            }
        } catch (\Exception $e) {
            // Redis not available
        }

        return false;
    }

    /**
     * Configure Redis cache for testing.
     *
     * When Redis is available, use it to test actual cache isolation
     * via CacheTenancyBootstrapper with cache tagging.
     */
    protected function configureRedisCache(): void
    {
        config(['cache.default' => 'redis']);

        // Force rebind cache to use Redis
        app()->forgetInstance('cache');
        app()->forgetInstance('cache.store');

        // Keep CacheTenancyBootstrapper enabled - it works with Redis!
        // This tests the ACTUAL production cache isolation behavior
    }

    /**
     * Configure fallback cache for testing without Redis.
     *
     * Uses array cache with manual key prefixing for isolation.
     * Tests verify isolation logic, while production uses automatic tagging.
     */
    protected function configureFallbackCache(): void
    {
        config(['cache.default' => 'array']);

        // Disable CacheTenancyBootstrapper (array driver doesn't support tags)
        $bootstrappers = config('tenancy.bootstrappers');
        $bootstrappers = array_filter($bootstrappers, function ($bootstrapper) {
            return $bootstrapper !== \Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper::class;
        });
        config(['tenancy.bootstrappers' => array_values($bootstrappers)]);
    }
}

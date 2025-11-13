<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

/**
 * Base test case for testing central app features.
 *
 * Use this test case when testing features that operate on the central database,
 * such as Account management, tenant creation, or other central-app-only functionality.
 *
 * This test case:
 * - Uses RefreshDatabase for clean state between tests
 * - Does NOT initialize tenancy
 * - Operates on the central database only
 */
abstract class CentralTestCase extends BaseTestCase
{
    use RefreshDatabase;

    /**
     * Define the database connection to use for testing.
     *
     * @var string
     */
    protected $connection = 'central';

    /**
     * Creates the application.
     */
    public function createApplication()
    {
        $app = require __DIR__ . '/../bootstrap/app.php';

        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        return $app;
    }

    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // SAFETY CHECK: Ensure we're not using production databases
        $this->verifyTestDatabaseConfiguration();

        // Ensure the APP_KEY is set in the config
        if ($appKey = env('APP_KEY')) {
            config(['app.key' => $appKey]);
        }

        // Mock Vite for tests to avoid manifest errors
        $this->withoutVite();

        // Ensure queue is sync for testing
        config(['queue.default' => 'sync']);

        // Disable activity logging for central tests
        config(['activitylog.enabled' => false]);

        // Ensure we're using the central database connection
        config(['database.default' => 'central']);
    }

    /**
     * Refresh the in-memory database.
     *
     * Overridden to use the central migrations path.
     */
    protected function refreshInMemoryDatabase(): void
    {
        $this->artisan('migrate:fresh', [
            '--database' => 'central',
            '--path' => 'database/migrations/central',
        ]);

        $this->app[\Illuminate\Contracts\Console\Kernel::class]->setArtisan(null);
    }

    /**
     * Refresh a conventional test database.
     *
     * Overridden to use the central migrations path.
     */
    protected function refreshTestDatabase(): void
    {
        if (! \Illuminate\Foundation\Testing\RefreshDatabaseState::$migrated) {
            $this->artisan('migrate:fresh', [
                '--database' => 'central',
                '--path' => 'database/migrations/central',
                '--drop-views' => $this->shouldDropViews(),
                '--drop-types' => $this->shouldDropTypes(),
            ]);

            $this->app[\Illuminate\Contracts\Console\Kernel::class]->setArtisan(null);

            \Illuminate\Foundation\Testing\RefreshDatabaseState::$migrated = true;
        }

        $this->beginDatabaseTransaction();
    }

    /**
     * Verify that tests are configured to use test databases, not production databases.
     *
     * This safety check prevents accidentally running tests against production data.
     *
     * @throws \Exception if production database is detected
     */
    protected function verifyTestDatabaseConfiguration(): void
    {
        // Check central database
        $centralDatabase = config('database.connections.central.database');

        if (! str_contains($centralDatabase, 'test')) {
            throw new \Exception(
                "DANGER: Central tests are configured to use a production database!\n" .
                "Central Database: {$centralDatabase}\n" .
                "Expected database name to contain 'test'.\n" .
                'Please check your phpunit.xml configuration for DB_CENTRAL_DATABASE.'
            );
        }
    }
}

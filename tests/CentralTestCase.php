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
}

<?php

namespace Tests\Traits;

use Illuminate\Support\Facades\DB;

/**
 * Migrate the central database once per test suite.
 *
 * This trait ensures the central database is migrated only once during
 * the entire test suite execution, rather than for each individual test.
 * This preserves tenant records and significantly improves test performance.
 *
 * Inspired by Laravel's RefreshDatabase trait but adapted for multi-tenancy.
 *
 * @see https://solutions.io/news/how-to-test-multitenant-laravel-applications-solving-database-refresh-challenges
 */
trait MigrateCentralDatabase
{
    /**
     * Set up the central database for testing.
     *
     * This method is called during setUp() and will only migrate the
     * central database once per test suite execution.
     */
    protected function setUpCentralDatabase(): void
    {
        // Only migrate if not already done
        // Note: static properties must be defined in MultiTenancyTestCase
        // to be shared across all test classes
        if (! static::$centralDatabaseMigrated) {
            // Clean up any orphaned tenant databases from previous test runs
            $this->cleanupOrphanedTenantDatabases();

            // Ensure central database exists
            $this->ensureCentralDatabaseExists();

            // Run central migrations once
            $this->migrateCentralDatabase();

            // Mark as migrated
            static::$centralDatabaseMigrated = true;
        }
    }

    /**
     * Migrate the central database.
     */
    protected function migrateCentralDatabase(): void
    {
        $this->artisan('migrate:fresh', [
            '--database' => 'central',
            '--path' => 'database/migrations/central',
            '--realpath' => true,
            '--force' => true,
        ]);
    }

    /**
     * Ensure the central database exists.
     */
    protected function ensureCentralDatabaseExists(): void
    {
        $database = 'maintenance_os_central_test';

        try {
            // Try to create the database if it doesn't exist
            DB::connection('pgsql')->statement("CREATE DATABASE \"{$database}\"");
        } catch (\Exception $e) {
            // Database probably already exists
        }
    }

    /**
     * Clean up orphaned tenant databases from previous test runs.
     *
     * This is called once during the first test setup to ensure
     * a clean state for the test suite.
     */
    protected function cleanupOrphanedTenantDatabases(): void
    {
        try {
            // Get all tenant databases that match our test pattern
            $databases = DB::connection('pgsql')->select("
                SELECT datname 
                FROM pg_database 
                WHERE datname LIKE 'tenant_%'
                AND datistemplate = false
            ");

            foreach ($databases as $database) {
                try {
                    // First disconnect any active connections to the database
                    DB::connection('pgsql')->statement('
                        SELECT pg_terminate_backend(pid) 
                        FROM pg_stat_activity 
                        WHERE datname = ? 
                        AND pid <> pg_backend_pid()
                    ', [$database->datname]);

                    // Now drop the database
                    DB::connection('pgsql')->statement("DROP DATABASE IF EXISTS \"{$database->datname}\"");
                } catch (\Exception $e) {
                    // Log but don't fail - database might be in use
                }
            }
        } catch (\Exception $e) {
            // If we can't clean up databases, continue anyway
        }
    }
}

<?php

namespace Tests\Traits;

use App\Models\Account;

trait CleansUpTenants
{
    /**
     * List of tenant subdomains to clean up after tests.
     *
     * @var array<string>
     */
    protected array $testTenantSubdomains = [];

    /**
     * Clean up test tenants after each test.
     */
    protected function cleanupTestTenants(): void
    {
        if (! empty($this->testTenantSubdomains)) {
            Account::whereIn('subdomain', $this->testTenantSubdomains)->each(function ($tenant) {
                try {
                    $dbName = $tenant->database_name;

                    // First, terminate any active connections to the tenant database
                    try {
                        \DB::connection('pgsql')->statement('
                            SELECT pg_terminate_backend(pid) 
                            FROM pg_stat_activity 
                            WHERE datname = ? 
                            AND pid <> pg_backend_pid()
                        ', [$dbName]);
                    } catch (\Exception $e) {
                        // Ignore connection termination errors
                    }

                    // Delete the database using the manager
                    $tenant->database()->manager()->deleteDatabase($tenant);

                    // Then delete the tenant record
                    $tenant->delete();
                } catch (\Exception $e) {
                    // If database deletion fails, try direct DROP DATABASE
                    try {
                        $dbName = $tenant->database_name;
                        \DB::connection('pgsql')->statement("DROP DATABASE IF EXISTS \"{$dbName}\"");
                    } catch (\Exception $dropEx) {
                        // Ignore drop errors
                    }

                    // Always try to delete the tenant record
                    try {
                        $tenant->delete();
                    } catch (\Exception $e2) {
                        // Ignore
                    }
                }
            });
        }
    }

    /**
     * Add a tenant subdomain to be cleaned up.
     */
    protected function addTestTenant(string $subdomain): void
    {
        $this->testTenantSubdomains[] = $subdomain;
    }

    /**
     * Clean up a specific test tenant before creating.
     */
    protected function cleanupTestTenant(string $subdomain): void
    {
        $tenant = Account::where('subdomain', $subdomain)->first();
        if ($tenant) {
            try {
                $dbName = $tenant->database_name;

                // First, terminate any active connections to the tenant database
                try {
                    \DB::connection('pgsql')->statement('
                        SELECT pg_terminate_backend(pid) 
                        FROM pg_stat_activity 
                        WHERE datname = ? 
                        AND pid <> pg_backend_pid()
                    ', [$dbName]);
                } catch (\Exception $e) {
                    // Ignore connection termination errors
                }

                // Delete the database using the manager
                $tenant->database()->manager()->deleteDatabase($tenant);

                // Then delete the tenant record
                $tenant->delete();
            } catch (\Exception $e) {
                // If database deletion fails, try direct DROP DATABASE
                try {
                    $dbName = $tenant->database_name;
                    \DB::connection('pgsql')->statement("DROP DATABASE IF EXISTS \"{$dbName}\"");
                } catch (\Exception $dropEx) {
                    // Ignore drop errors
                }

                // Always try to delete the tenant record
                try {
                    $tenant->delete();
                } catch (\Exception $e2) {
                    // Ignore
                }
            }
        }
    }

    /**
     * Override tearDown to include tenant cleanup.
     */
    protected function tearDown(): void
    {
        $this->cleanupTestTenants();
        parent::tearDown();
    }
}

<?php

namespace Tests\Traits;

use App\Models\Account;
use Illuminate\Support\Facades\DB;

/**
 * Initialize tenancy once per test suite.
 *
 * This trait creates a test tenant database once and reuses it across
 * all tests. Individual tests only need to switch tenant context.
 * This eliminates the expensive database creation overhead for each test.
 *
 * @see https://solutions.io/news/how-to-test-multitenant-laravel-applications-solving-database-refresh-challenges
 */
trait TenancyInitialization
{
    /**
     * Current test's tenant instance reference.
     *
     * @var Account|null
     */
    protected $tenant = null;

    /**
     * Set up tenancy for testing.
     *
     * Creates the test tenant database once per test suite,
     * then switches context for each test.
     */
    protected function setUpTenancy(): void
    {
        // Create test tenant database once per test suite
        // Note: static properties must be defined in MultiTenancyTestCase
        // to be shared across all test classes
        if (! static::$tenantDatabaseCreated) {
            $this->createTestTenant();
            static::$tenantDatabaseCreated = true;
        }

        // Set the tenant reference for this test
        $this->tenant = static::$testTenant;

        // Initialize tenancy context for this test
        $this->initializeTenancyContext();
    }

    /**
     * Create the test tenant and its database.
     *
     * This is called once per test suite to create a reusable
     * tenant database.
     */
    protected function createTestTenant(): void
    {
        // Generate a unique subdomain for the test suite
        $subdomain = 'testsuite' . str_replace('.', '', microtime(true));

        // Create a test tenant
        static::$testTenant = Account::create([
            'name' => 'Test Suite Tenant',
            'subdomain' => $subdomain,
            'metadata' => [
                'admin_email' => "admin@{$subdomain}.test",
            ],
        ]);

        // Wait for jobs to complete (they're sync in tests)
        sleep(1);

        // Verify tenant database was created
        $dbName = static::$testTenant->database_name;
        $dbExists = DB::connection('central')->select(
            'SELECT 1 FROM pg_database WHERE datname = ?',
            [$dbName]
        );

        if (empty($dbExists)) {
            throw new \Exception("Tenant database '{$dbName}' was not created");
        }
    }

    /**
     * Initialize tenancy context for the current test.
     *
     * This switches the application to operate within the tenant's
     * database context.
     */
    protected function initializeTenancyContext(): void
    {
        // Initialize tenancy - this switches to the tenant database
        tenancy()->initialize($this->tenant);
    }

    /**
     * End tenancy context after the test.
     */
    protected function endTenancyContext(): void
    {
        if (tenancy()->initialized) {
            tenancy()->end();
        }
    }

    /**
     * Create an additional tenant for tests that need multiple tenants.
     *
     * This creates a temporary tenant that will be cleaned up
     * after the test. Use this for tests that need to verify
     * multi-tenant isolation or cross-tenant operations.
     *
     * @param array $attributes Additional attributes for the tenant
     * @return Account The created tenant
     */
    protected function createAdditionalTenant(array $attributes = []): Account
    {
        // Generate a unique subdomain if not provided
        if (! isset($attributes['subdomain'])) {
            $attributes['subdomain'] = 'temp' . str_replace('.', '', microtime(true)) . rand(1000, 9999);
        }

        // Set default name if not provided
        if (! isset($attributes['name'])) {
            $attributes['name'] = 'Temporary Test Tenant';
        }

        // Set default metadata if not provided
        if (! isset($attributes['metadata'])) {
            $attributes['metadata'] = [
                'admin_email' => "admin@{$attributes['subdomain']}.test",
            ];
        }

        // Create the tenant
        $tenant = Account::create($attributes);

        // Wait for database creation
        sleep(1);

        return $tenant;
    }

    /**
     * Clean up a temporary tenant created during tests.
     */
    protected function cleanupAdditionalTenant(Account $tenant): void
    {
        try {
            // Delete the database
            $tenant->database()->manager()->deleteDatabase($tenant);
        } catch (\Exception $e) {
            // Ignore errors
        }

        try {
            // Delete the tenant record
            $tenant->delete();
        } catch (\Exception $e) {
            // Ignore errors
        }
    }
}

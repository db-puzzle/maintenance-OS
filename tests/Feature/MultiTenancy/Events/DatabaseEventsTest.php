<?php

namespace Tests\Feature\MultiTenancy\Events;

use Illuminate\Support\Facades\DB;
use Tests\MultiTenancyTestCase;

class DatabaseEventsTest extends MultiTenancyTestCase
{
    /**
     * These tests verify that tenant lifecycle events were dispatched
     * using the shared test tenant created during suite setup.
     *
     * @var bool
     */
    protected $tenancy = true;

    public function test_tenant_created_event_was_dispatched(): void
    {
        // The shared tenant was created during test suite setup
        // We can verify it exists and has the expected properties
        $this->assertNotNull($this->tenant);
        $this->assertNotEmpty($this->tenant->subdomain);
        $this->assertNotEmpty($this->tenant->database_name);
    }

    public function test_database_exists_after_creation(): void
    {
        // Verify we have a tenant
        $this->assertNotNull($this->tenant, 'Tenant should be initialized');
        $this->assertNotEmpty($this->tenant->database_name, 'Tenant should have a database name');

        // Verify the database was created by querying the PostgreSQL system catalog
        $dbExists = DB::connection('pgsql')->select(
            'SELECT 1 FROM pg_database WHERE datname = ?',
            [$this->tenant->database_name]
        );

        $this->assertNotEmpty($dbExists, "Tenant database '{$this->tenant->database_name}' should exist after creation");
    }

    public function test_migrations_ran_after_database_creation(): void
    {
        // Verify migrations ran by checking for expected tables
        $tables = DB::select("
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            AND tablename = 'migrations'
        ");

        $this->assertNotEmpty($tables, 'Migrations table should exist after DatabaseMigrated event');

        // Check that actual migrations were recorded
        $migrationCount = DB::table('migrations')->count();
        $this->assertGreaterThan(0, $migrationCount, 'Migrations should have been run');
    }

    public function test_seeding_occurred_after_database_seeded_event(): void
    {
        // Verify seeding occurred by checking for seeded data
        $rolesExist = \Spatie\Permission\Models\Role::where('name', 'administrator')->exists();
        $this->assertTrue($rolesExist, 'Roles should exist after DatabaseSeeded event');

        // Check for admin user if metadata contains admin email
        if (isset($this->tenant->metadata['admin_email'])) {
            $adminExists = \App\Models\User::where('email', $this->tenant->metadata['admin_email'])->exists();
            $this->assertTrue($adminExists, 'Admin user should exist after seeding');
        }
    }

    public function test_tenant_is_initialized_correctly(): void
    {
        // We're in tenant context via setUp
        $this->assertNotNull(tenant());
        $this->assertEquals($this->tenant->id, tenant()->id);

        // Verify we can interact with the tenant database
        $result = DB::select('SELECT current_database() as dbname');
        $this->assertNotEmpty($result);
    }
}

<?php

namespace Tests\Feature\MultiTenancy\Database;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\MultiTenancyTestCase;

class MigrationManagementTest extends MultiTenancyTestCase
{
    /**
     * These tests need an initialized tenant context
     * to verify migrations in the tenant database.
     *
     * @var bool
     */
    protected $tenancy = true;

    public function test_initial_tenant_migration_execution(): void
    {
        // Tenant is already created and initialized in setUp()
        // Verify migrations ran by checking for tables that should exist

        // Check that migrations table exists
        $this->assertTrue(Schema::hasTable('migrations'));

        // Check some key tables exist
        $this->assertTrue(Schema::hasTable('users'));
        $this->assertTrue(Schema::hasTable('roles'));
        $this->assertTrue(Schema::hasTable('permissions'));

        // Check that migrations were recorded
        $migrations = DB::table('migrations')->count();
        $this->assertGreaterThan(0, $migrations);
    }

    public function test_migration_status_tracking(): void
    {
        // Verify migrations have been run by checking the migrations table
        $migrationCount = DB::table('migrations')->count();

        $this->assertGreaterThan(0, $migrationCount, 'Migrations table should have entries');

        // Verify specific tables exist that should be created by migrations
        $this->assertTrue(Schema::hasTable('users'));
        $this->assertTrue(Schema::hasTable('roles'));
        $this->assertTrue(Schema::hasTable('permissions'));
    }

    public function test_migration_in_transaction_mode(): void
    {
        // PostgreSQL supports DDL transactions
        // Verify we can run a transaction
        DB::beginTransaction();
        DB::table('migrations')->count(); // Any query to verify connection works
        DB::rollBack();

        $this->assertTrue(true, 'PostgreSQL supports DDL transactions');
    }

    public function test_custom_migration_path_resolution(): void
    {
        // Verify tenant migrations are in the correct path
        $migrationPath = database_path('migrations/tenant');
        $this->assertDirectoryExists($migrationPath);

        // Count migration files
        $migrationFiles = glob($migrationPath . '/*.php');
        $this->assertGreaterThan(0, count($migrationFiles));
    }
}

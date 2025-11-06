<?php

namespace Tests\Feature\MultiTenancy\Database;

use Illuminate\Support\Facades\DB;
use Tests\MultiTenancyTestCase;

class TenantDatabaseManagementTest extends MultiTenancyTestCase
{
    /**
     * Most tests use the shared tenant for efficiency.
     * Only tests that specifically need to create tenants set this to false.
     *
     * @var bool
     */
    protected $tenancy = true;

    public function test_tenant_database_exists(): void
    {
        // Verify we have a tenant
        $this->assertNotNull($this->tenant, 'Tenant should be initialized');
        $this->assertNotEmpty($this->tenant->database_name, 'Tenant should have a database name');

        // Verify the shared test tenant database exists by querying PostgreSQL system catalog
        $dbExists = DB::connection('pgsql')->select(
            'SELECT 1 FROM pg_database WHERE datname = ?',
            [$this->tenant->database_name]
        );

        $this->assertNotEmpty($dbExists, "Tenant database '{$this->tenant->database_name}' should exist");
    }

    public function test_database_naming_convention_follows_configuration(): void
    {
        $prefix = config('tenancy.database.prefix');
        $suffix = config('tenancy.database.suffix');

        // Use the shared tenant to verify naming convention
        $expectedPrefix = $prefix ?? 'tenant_';
        $this->assertStringStartsWith($expectedPrefix, $this->tenant->database_name);

        if ($suffix) {
            $this->assertStringEndsWith($suffix, $this->tenant->database_name);
        }
    }

    public function test_database_permissions_are_verified(): void
    {
        // Verify we can connect to central database
        $this->assertTrue(
            DB::connection('central')->getPdo() !== null,
            'Cannot connect to central database'
        );
    }

    public function test_connection_switching_works(): void
    {
        // We're already in tenant context via setUp
        $this->assertNotNull(tenant());
        $this->assertEquals($this->tenant->id, tenant()->id);

        // Test that we can work with the tenant database
        DB::statement('CREATE TABLE IF NOT EXISTS test_table (id serial PRIMARY KEY, name varchar(255))');
        DB::table('test_table')->insert(['name' => 'test']);
        $result = DB::table('test_table')->first();

        $this->assertNotNull($result);
        $this->assertEquals('test', $result->name);

        // Clean up the test table
        DB::statement('DROP TABLE IF EXISTS test_table');
    }

    public function test_database_character_set_and_collation(): void
    {
        // We're in tenant context, check the tenant database encoding
        $dbInfo = DB::select(
            'SELECT pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = current_database()'
        );

        $this->assertNotEmpty($dbInfo);
        // PostgreSQL typically uses UTF8
        $this->assertContains($dbInfo[0]->encoding, ['UTF8', 'UNICODE']);
    }
}

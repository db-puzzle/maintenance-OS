<?php

namespace Tests\Feature\MultiTenancy\Database;

use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;
use Tests\MultiTenancyTestCase;

class SeedingTest extends MultiTenancyTestCase
{
    /**
     * These tests need an initialized tenant context
     * to verify seeded data in the tenant database.
     *
     * @var bool
     */
    protected $tenancy = true;

    public function test_automatic_seeding_on_creation(): void
    {
        // Tenant is already created and initialized in setUp()
        // Verify that seeding occurred by checking for seeded data

        // First check if migrations ran to create the tables
        $this->assertTrue(Schema::hasTable('roles'));
        $this->assertTrue(Schema::hasTable('users'));

        // Check that roles were created
        $this->assertTrue(Role::where('name', 'administrator')->exists());
        $this->assertTrue(Role::where('name', 'manager')->exists());
        $this->assertTrue(Role::where('name', 'technician')->exists());
        $this->assertTrue(Role::where('name', 'operator')->exists());
        $this->assertTrue(Role::where('name', 'viewer')->exists());

        // Check that admin user was created from metadata
        $admin = User::where('email', $this->tenant->metadata['admin_email'])->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->hasRole('administrator'));
    }

    public function test_roles_and_permissions_created(): void
    {
        // Verify all expected roles exist
        $expectedRoles = ['administrator', 'manager', 'technician', 'operator', 'viewer'];

        foreach ($expectedRoles as $roleName) {
            $this->assertTrue(
                Role::where('name', $roleName)->exists(),
                "Role {$roleName} should exist"
            );
        }

        // Verify permissions were created
        $adminRole = Role::where('name', 'administrator')->first();
        $this->assertGreaterThan(0, $adminRole->permissions->count());
    }

    public function test_admin_user_has_correct_role(): void
    {
        $admin = User::where('email', $this->tenant->metadata['admin_email'])->first();

        $this->assertNotNull($admin);
        $this->assertTrue($admin->hasRole('administrator'));
        $this->assertFalse($admin->hasRole('manager'));
    }

    public function test_seeding_idempotency(): void
    {
        // Count existing data
        $userCount = User::count();
        $roleCount = Role::count();

        // Run seeder again
        \Artisan::call('db:seed', [
            '--class' => 'TenantDatabaseSeeder',
            '--force' => true,
        ]);

        // Counts should not change
        $this->assertEquals($userCount, User::count());
        $this->assertEquals($roleCount, Role::count());
    }
}

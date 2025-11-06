<?php

namespace Tests\Feature\MultiTenancy\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\MultiTenancyTestCase;

/**
 * Test first user admin functionality in multi-tenant context.
 *
 * Verifies that the first user created in a tenant automatically
 * receives administrator privileges.
 */
class FirstUserAdminTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy for tests that create their own tenants.
     */
    protected $tenancy = false;

    /**
     * Test that the first user created becomes admin.
     */
    public function test_first_user_created_becomes_admin(): void
    {
        // Create tenant WITHOUT admin_email in metadata so seeder won't create an admin
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Tenant',
            'subdomain' => 'first-admin-' . time(),
            'metadata' => [], // Empty metadata - no admin will be created by seeder
        ]);

        $tenant->run(function () {
            // Ensure administrator role exists (roles are seeded automatically via CreateTenantAdmin job)
            // But we need to verify it exists
            $this->assertDatabaseHas('roles', ['name' => 'administrator']);

            // Verify no users exist yet
            $this->assertEquals(0, User::count(), 'Should have no users before test');

            // Create first user
            $user = User::create([
                'name' => 'First User',
                'email' => 'first@example.com',
                'password' => Hash::make('password'),
            ]);

            // Refresh user to get roles
            $user->refresh();

            // Verify user has administrator role
            $this->assertTrue($user->hasRole('administrator'), 'First user should have administrator role');
        });
    }

    /**
     * Test that subsequent users are not automatically admin.
     */
    public function test_subsequent_users_are_not_admin(): void
    {
        // Create tenant WITHOUT admin_email in metadata
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Tenant',
            'subdomain' => 'subsequent-' . time(),
            'metadata' => [], // Empty metadata - no admin will be created by seeder
        ]);

        $tenant->run(function () {
            // Ensure administrator role exists
            $this->assertDatabaseHas('roles', ['name' => 'administrator']);

            // Verify no users exist yet
            $this->assertEquals(0, User::count(), 'Should have no users before test');

            // Create first user (will be admin)
            $firstUser = User::create([
                'name' => 'First User',
                'email' => 'first@example.com',
                'password' => Hash::make('password'),
            ]);

            // Create second user
            $secondUser = User::create([
                'name' => 'Second User',
                'email' => 'second@example.com',
                'password' => Hash::make('password'),
            ]);

            // Refresh to get roles
            $firstUser->refresh();
            $secondUser->refresh();

            // Verify first user is admin
            $this->assertTrue($firstUser->hasRole('administrator'), 'First user should be admin');

            // Verify second user is NOT admin
            $this->assertFalse($secondUser->hasRole('administrator'), 'Second user should not be auto-assigned admin role');
        });
    }

    /**
     * Test that first user admin assignment is tenant-isolated.
     */
    public function test_first_user_admin_is_tenant_isolated(): void
    {
        // Create tenants WITHOUT admin_email in metadata
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Tenant 1',
            'subdomain' => 'isolated1-' . time(),
            'metadata' => [], // Empty metadata - no admin will be created by seeder
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Tenant 2',
            'subdomain' => 'isolated2-' . time(),
            'metadata' => [], // Empty metadata - no admin will be created by seeder
        ]);

        // Create first user in tenant1
        $user1 = $tenant1->run(function () {
            return User::create([
                'name' => 'User 1',
                'email' => 'user1@example.com',
                'password' => Hash::make('password'),
            ]);
        });

        // Create first user in tenant2
        $user2 = $tenant2->run(function () {
            return User::create([
                'name' => 'User 2',
                'email' => 'user2@example.com',
                'password' => Hash::make('password'),
            ]);
        });

        // Verify both users are admins in their respective tenants
        $tenant1->run(function () use ($user1) {
            $user = User::find($user1->id);
            $this->assertTrue($user->hasRole('administrator'), 'First user in tenant1 should be admin');
        });

        $tenant2->run(function () use ($user2) {
            $user = User::find($user2->id);
            $this->assertTrue($user->hasRole('administrator'), 'First user in tenant2 should be admin');
        });
    }
}

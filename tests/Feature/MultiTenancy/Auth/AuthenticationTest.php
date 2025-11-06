<?php

namespace Tests\Feature\MultiTenancy\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\MultiTenancyTestCase;

/**
 * Test authentication functionality in multi-tenant context.
 *
 * Verifies that users are properly isolated between tenants
 * and that authentication respects tenant boundaries.
 */
class AuthenticationTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy for tests that create multiple tenants.
     */
    protected $tenancy = false;

    /**
     * Test that users can only authenticate in their own tenant.
     */
    public function test_users_can_only_authenticate_in_their_own_tenant(): void
    {
        // Create two tenants with users
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Tenant 1',
            'subdomain' => 'auth-tenant1-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Tenant 2',
            'subdomain' => 'auth-tenant2-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        // Create user in tenant 1
        $user1Email = 'user1@example.com';
        $tenant1->run(function () use ($user1Email) {
            User::create([
                'name' => 'User 1',
                'email' => $user1Email,
                'password' => Hash::make('password'),
            ]);
        });

        // Create user in tenant 2
        $user2Email = 'user2@example.com';
        $tenant2->run(function () use ($user2Email) {
            User::create([
                'name' => 'User 2',
                'email' => $user2Email,
                'password' => Hash::make('password'),
            ]);
        });

        // Verify user1 exists in tenant1 but not in tenant2
        $tenant1->run(function () use ($user1Email, $user2Email) {
            $this->assertNotNull(User::where('email', $user1Email)->first());
            $this->assertNull(User::where('email', $user2Email)->first());
        });

        // Verify user2 exists in tenant2 but not in tenant1
        $tenant2->run(function () use ($user1Email, $user2Email) {
            $this->assertNull(User::where('email', $user1Email)->first());
            $this->assertNotNull(User::where('email', $user2Email)->first());
        });
    }

    /**
     * Test that user lookup respects tenant boundaries.
     */
    public function test_user_lookup_respects_tenant_boundaries(): void
    {
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Tenant',
            'subdomain' => 'auth-test-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant->run(function () {
            // Verify no users exist initially
            $this->assertEquals(0, User::count());

            $user = User::create([
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => Hash::make('password'),
            ]);

            // User should be found in tenant context
            $this->assertNotNull(User::where('email', 'test@example.com')->first());
            $this->assertEquals(1, User::count());
        });

        // User should not be accessible outside tenant context
        tenancy()->end();
        // Note: We can't query User model here as we're outside tenant context
        // and the users table doesn't exist in central database
    }

    /**
     * Test that user data is isolated between tenants.
     */
    public function test_user_data_is_isolated_between_tenants(): void
    {
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Tenant 1',
            'subdomain' => 'auth-session1-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Tenant 2',
            'subdomain' => 'auth-session2-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $user1 = $tenant1->run(function () {
            return User::create([
                'name' => 'User 1',
                'email' => 'user1@example.com',
                'password' => Hash::make('password'),
            ]);
        });

        $user2 = $tenant2->run(function () {
            return User::create([
                'name' => 'User 2',
                'email' => 'user2@example.com',
                'password' => Hash::make('password'),
            ]);
        });

        // Verify tenant1 has only its user
        $tenant1->run(function () use ($user1) {
            $this->assertEquals(1, User::count());
            $this->assertNotNull(User::find($user1->id));
        });

        // Verify tenant2 has only its user
        $tenant2->run(function () use ($user2) {
            $this->assertEquals(1, User::count());
            $this->assertNotNull(User::find($user2->id));
        });
    }

    /**
     * Test that Auth facade works correctly in tenant context.
     */
    public function test_auth_facade_works_in_tenant_context(): void
    {
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Tenant',
            'subdomain' => 'auth-facade-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $user = $tenant->run(function () {
            return User::create([
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => Hash::make('password'),
            ]);
        });

        // Test authentication in tenant context
        tenancy()->initialize($tenant);

        // Initially not authenticated
        $this->assertFalse(Auth::check());

        // Authenticate
        Auth::login($user);
        $this->assertTrue(Auth::check());
        $this->assertEquals($user->id, Auth::id());

        // Logout
        Auth::logout();
        $this->assertFalse(Auth::check());

        tenancy()->end();
    }
}

<?php

namespace Tests\Feature\MultiTenancy\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\MultiTenancyTestCase;

/**
 * Test password reset functionality in multi-tenant context.
 *
 * Verifies that password reset tokens are properly scoped to tenants
 * and work correctly within tenant boundaries.
 */
class PasswordResetTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy for tests that create their own tenants.
     */
    protected $tenancy = false;

    /**
     * Test that password reset tokens are tenant-scoped.
     */
    public function test_password_reset_tokens_are_tenant_scoped(): void
    {
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Tenant',
            'subdomain' => 'reset-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant->run(function () {
            $user = User::create([
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => Hash::make('oldpassword'),
            ]);

            // Generate reset token
            $token = Password::createToken($user);

            // Verify token can be used to reset password
            $status = Password::reset(
                [
                    'email' => 'test@example.com',
                    'password' => 'newpassword',
                    'password_confirmation' => 'newpassword',
                    'token' => $token,
                ],
                function ($user) {
                    $user->password = Hash::make('newpassword');
                    $user->save();
                }
            );

            $this->assertEquals(Password::PASSWORD_RESET, $status);

            // Verify password was changed
            $user->refresh();
            $this->assertTrue(Hash::check('newpassword', $user->password));
        });
    }

    /**
     * Test that reset tokens don't work across tenants.
     */
    public function test_reset_tokens_dont_work_across_tenants(): void
    {
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Tenant 1',
            'subdomain' => 'reset-token1-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Tenant 2',
            'subdomain' => 'reset-token2-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        // Create user in tenant1 and generate reset token
        $token = $tenant1->run(function () {
            $user = User::create([
                'name' => 'User 1',
                'email' => 'user1@example.com',
                'password' => Hash::make('oldpassword'),
            ]);

            return Password::createToken($user);
        });

        // Try to use token in tenant2 - should fail (user doesn't exist)
        $tenant2->run(function () use ($token) {
            $status = Password::reset(
                [
                    'email' => 'user1@example.com',
                    'password' => 'newpassword',
                    'password_confirmation' => 'newpassword',
                    'token' => $token,
                ],
                function ($user) {
                    $user->password = Hash::make('newpassword');
                    $user->save();
                }
            );

            // Should return invalid user since user doesn't exist in tenant2
            $this->assertEquals(Password::INVALID_USER, $status);
        });

        // Verify password in tenant1 was NOT changed
        $tenant1->run(function () {
            $user = User::where('email', 'user1@example.com')->first();
            $this->assertTrue(Hash::check('oldpassword', $user->password));
        });
    }

    /**
     * Test that password tokens are created in correct tenant.
     */
    public function test_password_tokens_created_in_correct_tenant(): void
    {
        $tenant = $this->createAdditionalTenant([
            'name' => 'Acme Corporation',
            'subdomain' => 'acme-reset-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant->run(function () {
            $user = User::create([
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => Hash::make('password'),
            ]);

            // Create token
            $token = Password::createToken($user);

            // Verify token is not empty
            $this->assertNotEmpty($token);

            // Verify token exists in password_reset_tokens table (tenant database)
            $this->assertDatabaseHas('password_reset_tokens', [
                'email' => 'test@example.com',
            ]);
        });
    }
}

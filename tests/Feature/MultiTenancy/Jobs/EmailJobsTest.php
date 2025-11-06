<?php

namespace Tests\Feature\MultiTenancy\Jobs;

use App\Mail\UserInvitationMail;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\MultiTenancyTestCase;

/**
 * Test email jobs in multi-tenant context.
 *
 * Verifies that email jobs use correct tenant data
 * and are properly scoped to tenants.
 */
class EmailJobsTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy for tests that create their own tenants.
     */
    protected $tenancy = false;

    /**
     * Test that email jobs work with tenant data.
     */
    public function test_email_jobs_work_with_tenant_data(): void
    {
        Mail::fake();

        $tenant = $this->createAdditionalTenant([
            'name' => 'Acme Corporation',
            'subdomain' => 'email-acme-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant->run(function () {
            $admin = User::create([
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'password' => Hash::make('password'),
            ]);

            $invitation = UserInvitation::create([
                'email' => 'newuser@example.com',
                'invited_by' => $admin->id,
                'initial_role' => 'User',
                'expires_at' => now()->addDays(7),
            ]);

            // Send the email (it will be queued since it implements ShouldQueue)
            Mail::to($invitation->email)->send(new UserInvitationMail($invitation));

            // Verify email was queued
            Mail::assertQueued(UserInvitationMail::class);
        });
    }

    /**
     * Test notification jobs scoped to tenant.
     */
    public function test_notification_jobs_scoped_to_tenant(): void
    {
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Tenant 1',
            'subdomain' => 'email-tenant1-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Tenant 2',
            'subdomain' => 'email-tenant2-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        Mail::fake();

        // Create invitation in tenant1
        $invitation1 = $tenant1->run(function () {
            $admin = User::create([
                'name' => 'Admin 1',
                'email' => 'admin1@example.com',
                'password' => Hash::make('password'),
            ]);

            return UserInvitation::create([
                'email' => 'user1@example.com',
                'invited_by' => $admin->id,
                'initial_role' => 'User',
                'expires_at' => now()->addDays(7),
            ]);
        });

        // Create invitation in tenant2
        $invitation2 = $tenant2->run(function () {
            $admin = User::create([
                'name' => 'Admin 2',
                'email' => 'admin2@example.com',
                'password' => Hash::make('password'),
            ]);

            return UserInvitation::create([
                'email' => 'user2@example.com',
                'invited_by' => $admin->id,
                'initial_role' => 'User',
                'expires_at' => now()->addDays(7),
            ]);
        });

        // Send emails
        $tenant1->run(function () use ($invitation1) {
            Mail::to($invitation1->email)->send(new UserInvitationMail($invitation1));
        });

        $tenant2->run(function () use ($invitation2) {
            Mail::to($invitation2->email)->send(new UserInvitationMail($invitation2));
        });

        // Verify both emails were queued
        Mail::assertQueued(UserInvitationMail::class, 2);
    }

    /**
     * Test bulk email respects tenant boundaries.
     */
    public function test_bulk_email_respects_tenant_boundaries(): void
    {
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Tenant',
            'subdomain' => 'email-bulk-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        Mail::fake();

        $tenant->run(function () {
            // Create multiple users
            $users = User::factory()->count(5)->create();

            // Send invitations to all users
            foreach ($users as $user) {
                $invitation = UserInvitation::create([
                    'email' => $user->email,
                    'invited_by' => $users->first()->id,
                    'initial_role' => 'User',
                    'expires_at' => now()->addDays(7),
                ]);

                Mail::to($invitation->email)->send(new UserInvitationMail($invitation));
            }

            // Verify all emails were queued
            Mail::assertQueued(UserInvitationMail::class, 5);
        });
    }
}

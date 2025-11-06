<?php

namespace Tests\Feature\MultiTenancy\Auth;

use App\Mail\UserInvitationMail;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\MultiTenancyTestCase;

/**
 * Test user invitation functionality in multi-tenant context.
 *
 * Verifies that user invitations work correctly within tenant boundaries
 * and that invitation emails contain the correct tenant subdomain.
 */
class UserInvitationTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy for tests that create their own tenants.
     */
    protected $tenancy = false;

    /**
     * Test that admin can send user invitations.
     */
    public function test_admin_can_send_user_invitations(): void
    {
        Mail::fake();

        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Tenant',
            'subdomain' => 'invitation-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant->run(function () {
            // Create admin user (will auto-get administrator role as first user)
            $admin = User::create([
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'password' => Hash::make('password'),
            ]);

            // Create invitation
            $invitation = UserInvitation::create([
                'email' => 'newuser@example.com',
                'invited_by' => $admin->id,
                'initial_role' => 'User',
                'expires_at' => now()->addDays(7),
            ]);

            // Send invitation email (it implements ShouldQueue, so it's queued)
            Mail::to($invitation->email)->send(new UserInvitationMail($invitation));

            // Assert email was queued (not sent, since it implements ShouldQueue)
            Mail::assertQueued(UserInvitationMail::class, function ($mail) use ($invitation) {
                return $mail->invitation->id === $invitation->id;
            });
        });
    }

    /**
     * Test that invitation email contains tenant organization name.
     */
    public function test_invitation_email_contains_tenant_organization_name(): void
    {
        Mail::fake();

        $tenant = $this->createAdditionalTenant([
            'name' => 'Acme Corporation',
            'subdomain' => 'acme-' . time(),
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

            // Build the mailable to test its content
            $mailable = new UserInvitationMail($invitation);
            $mailable->build();

            // Assert tenant name is in the subject
            $this->assertStringContainsString('Acme Corporation', $mailable->subject);
        });
    }

    /**
     * Test that invitation is scoped to tenant.
     */
    public function test_invitation_is_scoped_to_tenant(): void
    {
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Tenant 1',
            'subdomain' => 'invite-scope1-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Tenant 2',
            'subdomain' => 'invite-scope2-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

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

        // Verify invitation1 is only visible in tenant1
        $tenant1->run(function () use ($invitation1, $invitation2) {
            $this->assertDatabaseHas('user_invitations', [
                'id' => $invitation1->id,
                'email' => 'user1@example.com',
            ]);

            // Should not see invitation2
            $this->assertDatabaseMissing('user_invitations', [
                'id' => $invitation2->id,
                'email' => 'user2@example.com',
            ]);
        });

        // Verify invitation2 is only visible in tenant2
        $tenant2->run(function () use ($invitation1, $invitation2) {
            $this->assertDatabaseHas('user_invitations', [
                'id' => $invitation2->id,
                'email' => 'user2@example.com',
            ]);

            // Should not see invitation1
            $this->assertDatabaseMissing('user_invitations', [
                'id' => $invitation1->id,
                'email' => 'user1@example.com',
            ]);
        });
    }
}

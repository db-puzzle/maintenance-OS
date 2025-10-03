<?php

use App\Models\PermissionAuditLog;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    // Create an admin user to send invitations
    $this->admin = User::factory()->create();
});

it('allows user to accept invitation and logs them in automatically', function () {
    // Create an invitation
    $invitation = UserInvitation::create([
        'email' => 'newuser@example.com',
        'invited_by' => $this->admin->id,
        'initial_role' => null,
        'initial_permissions' => null,
    ]);

    // Visit the invitation acceptance page using the signed URL
    $response = $this->get($invitation->url);
    $response->assertOk();
    $response->assertInertia(
        fn ($page) => $page
            ->component('invitations/accept')
            ->has(
                'invitation',
                fn ($inv) => $inv
                    ->where('email', 'newuser@example.com')
                    ->where('token', $invitation->token)
                    ->etc()
            )
    );

    // Accept the invitation
    $response = $this->post(route('invitations.accept', $invitation->token), [
        'name' => 'New User',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    // Should redirect to home page
    $response->assertRedirect(route('home'));
    $response->assertSessionHas('success', 'Welcome! Your account has been created successfully.');

    // User should be created
    $newUser = User::where('email', 'newuser@example.com')->first();
    expect($newUser)->not->toBeNull();
    expect($newUser->name)->toBe('New User');
    expect(Hash::check('Password123', $newUser->password))->toBeTrue();
    expect($newUser->email_verified_at)->not->toBeNull();

    // User should be logged in
    $this->assertAuthenticatedAs($newUser);

    // Invitation should be marked as accepted
    $invitation->refresh();
    expect($invitation->accepted_at)->not->toBeNull();
    expect($invitation->accepted_by)->toBe($newUser->id);

    // Audit log should be created
    $auditLog = PermissionAuditLog::where('event_type', 'invitation.accepted')
        ->where('user_id', $newUser->id)
        ->first();

    expect($auditLog)->not->toBeNull();
    expect($auditLog->metadata)->toMatchArray([
        'email' => 'newuser@example.com',
        'user' => 'New User',
        'invited_by' => $this->admin->name,
        'invitation_id' => $invitation->id,
    ]);
});

it('validates password requirements when accepting invitation', function () {
    $invitation = UserInvitation::create([
        'email' => 'test@example.com',
        'invited_by' => $this->admin->id,
    ]);

    // Try with weak password
    $response = $this->post(route('invitations.accept', $invitation->token), [
        'name' => 'Test User',
        'password' => 'weak',
        'password_confirmation' => 'weak',
    ]);

    $response->assertSessionHasErrors(['password']);

    // User should not be created
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();

    // Invitation should not be accepted
    $invitation->refresh();
    expect($invitation->accepted_at)->toBeNull();
});

it('prevents accepting expired invitations', function () {
    $invitation = UserInvitation::create([
        'email' => 'expired@example.com',
        'invited_by' => $this->admin->id,
        'expires_at' => now()->subDay(), // Expired yesterday
    ]);

    // Try to view the invitation page
    // Since the invitation is expired, the signed URL will be invalid and return 403
    $response = $this->get($invitation->url);
    $response->assertForbidden();

    // Try to accept the invitation
    $response = $this->post(route('invitations.accept', $invitation->token), [
        'name' => 'Test User',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('error', 'This invitation is no longer valid.');
});

it('prevents accepting already accepted invitations', function () {
    $existingUser = User::factory()->create();

    $invitation = UserInvitation::create([
        'email' => 'accepted@example.com',
        'invited_by' => $this->admin->id,
        'accepted_at' => now(),
        'accepted_by' => $existingUser->id,
    ]);

    // Try to view the invitation page
    $response = $this->get($invitation->url);
    $response->assertRedirect(route('login'));
    $response->assertSessionHas('error', 'This invitation is no longer valid.');
});

it('assigns initial roles when specified in invitation', function () {
    $role = \App\Models\Role::create([
        'name' => 'Editor',
        'display_name' => 'Editor',
        'guard_name' => 'web',
    ]);

    $invitation = UserInvitation::create([
        'email' => 'roletest@example.com',
        'invited_by' => $this->admin->id,
        'initial_role' => json_encode([
            [
                'role_id' => $role->id,
                'role_name' => $role->name,
            ],
        ]),
    ]);

    // Accept the invitation
    $this->post(route('invitations.accept', $invitation->token), [
        'name' => 'Role Test User',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    // Check that the user has the role
    $newUser = User::where('email', 'roletest@example.com')->first();
    expect($newUser->hasRole($role->name))->toBeTrue();
});

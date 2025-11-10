<?php

use App\Models\User;
use App\Models\UserInvitation;

uses(Tests\TestCase::class, \Illuminate\Foundation\Testing\RefreshDatabase::class);

test('user registration route does not exist on tenant domains', function () {
    $response = $this->get('/register');

    $response->assertStatus(404);
});

test('cannot register new users via POST on tenant domains', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertStatus(404);
    $this->assertGuest();
});

test('login page does not show signup link', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
    $response->assertDontSee('Sign up');
    $response->assertSee('Need access? Contact your administrator for an invitation.');
});

test('users can still be invited and accept invitations', function () {
    // Create an admin user to send invitations
    $admin = User::factory()->create();
    $admin->assignRole('Administrator');

    // Create an invitation
    $invitation = UserInvitation::create([
        'email' => 'invited@example.com',
        'invited_by' => $admin->id,
        'initial_role' => null,
        'message' => 'Welcome!',
    ]);

    // Accept invitation
    $response = $this->post("/invitations/{$invitation->token}/accept", [
        'name' => 'Invited User',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect(route('home'));
    expect(User::where('email', 'invited@example.com')->exists())->toBeTrue();
});

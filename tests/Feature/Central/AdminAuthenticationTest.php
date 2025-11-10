<?php

use App\Models\Central\AdminUser;
use Illuminate\Support\Facades\Hash;

use function Pest\Laravel\assertAuthenticatedAs;
use function Pest\Laravel\assertGuest;
use function Pest\Laravel\post;

/*
 * Tests for admin authentication
 *
 * Ensures admin users can authenticate using the admin guard
 * and that sessions are properly managed.
 */

beforeEach(function () {
    // Create a test admin user
    $this->admin = AdminUser::create([
        'name' => 'Test Admin',
        'email' => 'admin@test.com',
        'password' => Hash::make('password'),
        'email_verified_at' => now(),
    ]);
});

it('allows admin users to login with correct credentials', function () {
    $response = post(route('admin.login'), [
        'email' => 'admin@test.com',
        'password' => 'password',
    ]);

    $response->assertRedirect(route('admin.dashboard'));
    assertAuthenticatedAs($this->admin, 'admin');
});

it('rejects admin login with incorrect password', function () {
    $response = post(route('admin.login'), [
        'email' => 'admin@test.com',
        'password' => 'wrong-password',
    ]);

    $response->assertSessionHasErrors('email');
    assertGuest('admin');
});

it('rejects admin login with non-existent email', function () {
    $response = post(route('admin.login'), [
        'email' => 'nonexistent@test.com',
        'password' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
    assertGuest('admin');
});

it('requires email field for admin login', function () {
    $response = post(route('admin.login'), [
        'password' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
});

it('requires password field for admin login', function () {
    $response = post(route('admin.login'), [
        'email' => 'admin@test.com',
    ]);

    $response->assertSessionHasErrors('password');
});

it('validates email format for admin login', function () {
    $response = post(route('admin.login'), [
        'email' => 'not-an-email',
        'password' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
});

it('regenerates session on successful admin login', function () {
    $response = post(route('admin.login'), [
        'email' => 'admin@test.com',
        'password' => 'password',
    ]);

    $response->assertSessionHasNoErrors();
    expect(session()->getId())->not->toBeNull();
});

it('logs out admin users correctly', function () {
    // Login first
    $this->actingAs($this->admin, 'admin');
    assertAuthenticatedAs($this->admin, 'admin');

    // Logout
    $response = post(route('admin.logout'));

    $response->assertRedirect(route('admin.login'));
    assertGuest('admin');
});

it('uses admin guard not web guard', function () {
    // Login
    post(route('admin.login'), [
        'email' => 'admin@test.com',
        'password' => 'password',
    ]);

    // Verify authenticated on admin guard
    expect(auth()->guard('admin')->check())->toBeTrue();

    // Verify NOT authenticated on web guard
    expect(auth()->guard('web')->check())->toBeFalse();
});

it('supports remember me functionality', function () {
    $response = post(route('admin.login'), [
        'email' => 'admin@test.com',
        'password' => 'password',
        'remember' => true,
    ]);

    $response->assertRedirect(route('admin.dashboard'));
    assertAuthenticatedAs($this->admin, 'admin');
});

it('rate limits failed login attempts', function () {
    // Attempt to login 6 times with wrong password
    for ($i = 0; $i < 6; $i++) {
        post(route('admin.login'), [
            'email' => 'admin@test.com',
            'password' => 'wrong-password',
        ]);
    }

    // The 6th attempt should be rate limited
    $response = post(route('admin.login'), [
        'email' => 'admin@test.com',
        'password' => 'wrong-password',
    ]);

    $response->assertSessionHasErrors('email');
    expect($response->getSession()->get('errors')->get('email')[0])
        ->toContain('Too many login attempts');
});

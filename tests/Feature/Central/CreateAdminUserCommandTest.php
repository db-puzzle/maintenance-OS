<?php

use App\Models\Central\AdminUser;
use Illuminate\Support\Facades\Hash;

use function Pest\Laravel\artisan;

/*
 * Tests for admin:create-user command
 *
 * Ensures the command creates admin users correctly with proper
 * validation and error handling.
 */

it('creates an admin user with provided arguments', function () {
    // Run command with arguments
    artisan('admin:create-user', [
        'name' => 'Test Admin',
        'email' => 'test@example.com',
        '--password' => 'test-password-123',
    ])->assertSuccessful();

    // Assert admin user was created
    expect(AdminUser::count())->toBe(1);

    $admin = AdminUser::first();
    expect($admin->name)->toBe('Test Admin');
    expect($admin->email)->toBe('test@example.com');
    expect($admin->email_verified_at)->not->toBeNull();
    expect(Hash::check('test-password-123', $admin->password))->toBeTrue();
});

it('prevents creating duplicate admin users with same email', function () {
    // Create an existing admin user
    AdminUser::create([
        'name' => 'Existing Admin',
        'email' => 'duplicate@example.com',
        'password' => Hash::make('password'),
        'email_verified_at' => now(),
    ]);

    // Try to create admin with same email
    artisan('admin:create-user', [
        'name' => 'Duplicate Admin',
        'email' => 'duplicate@example.com',
        '--password' => 'another-password',
    ])->assertFailed();

    // Assert only one admin user exists
    expect(AdminUser::count())->toBe(1);
    expect(AdminUser::first()->name)->toBe('Existing Admin');
});

it('creates admin user with hashed password', function () {
    artisan('admin:create-user', [
        'name' => 'Password Test Admin',
        'email' => 'password-test@example.com',
        '--password' => 'my-secure-password',
    ])->assertSuccessful();

    $admin = AdminUser::first();

    // Password should not be stored in plain text
    expect($admin->password)->not->toBe('my-secure-password');

    // Password should be hashed
    expect(strlen($admin->password))->toBeGreaterThan(50);

    // Password should verify correctly
    expect(Hash::check('my-secure-password', $admin->password))->toBeTrue();
});

it('sets email as verified automatically', function () {
    artisan('admin:create-user', [
        'name' => 'Auto Verified Admin',
        'email' => 'verified@example.com',
        '--password' => 'password123',
    ])->assertSuccessful();

    $admin = AdminUser::first();
    expect($admin->email_verified_at)->not->toBeNull();
    expect($admin->hasVerifiedEmail())->toBeTrue();
});

it('creates multiple admin users successfully', function () {
    // Create first admin
    artisan('admin:create-user', [
        'name' => 'First Admin',
        'email' => 'first@example.com',
        '--password' => 'password1',
    ])->assertSuccessful();

    // Create second admin
    artisan('admin:create-user', [
        'name' => 'Second Admin',
        'email' => 'second@example.com',
        '--password' => 'password2',
    ])->assertSuccessful();

    // Assert both admins exist
    expect(AdminUser::count())->toBe(2);
    expect(AdminUser::pluck('email')->toArray())->toContain('first@example.com', 'second@example.com');
});

it('displays warning when using password option', function () {
    artisan('admin:create-user', [
        'name' => 'Warning Test',
        'email' => 'warning@example.com',
        '--password' => 'test-pass',
    ])
        ->expectsOutput('⚠️  Warning: Passing passwords via command line is not secure.')
        ->assertSuccessful();
});

it('displays success message with user details', function () {
    artisan('admin:create-user', [
        'name' => 'Display Test Admin',
        'email' => 'display@example.com',
        '--password' => 'password',
    ])
        ->expectsOutput('✓ System administrator created successfully!')
        ->assertSuccessful();
});

it('returns success code when admin is created', function () {
    // Test that the command returns success exit code
    artisan('admin:create-user', [
        'name' => 'Success Test Admin',
        'email' => 'success@example.com',
        '--password' => 'password123',
    ])->assertSuccessful();

    // Verify the admin was actually created
    expect(AdminUser::where('email', 'success@example.com')->exists())->toBeTrue();
});

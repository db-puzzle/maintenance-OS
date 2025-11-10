<?php

use App\Models\Central\AdminUser;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Support\Facades\Hash;

/*
 * Tests for AdminUserSeeder
 *
 * Ensures the initial system administrator is created correctly
 * via the seeder with proper validation and environment variable support.
 */

it('creates an admin user when none exist', function () {
    // Ensure no admin users exist
    expect(AdminUser::count())->toBe(0);

    // Run the seeder
    $this->artisan('db:seed', ['--class' => AdminUserSeeder::class])
        ->assertSuccessful();

    // Assert admin user was created
    expect(AdminUser::count())->toBe(1);

    $admin = AdminUser::first();
    expect($admin->name)->toBe('System Administrator');
    expect($admin->email)->toBe('admin@example.com');
    expect($admin->email_verified_at)->not->toBeNull();
    expect(Hash::check('password', $admin->password))->toBeTrue();
});

it('does not create duplicate admin users', function () {
    // Create an existing admin user
    AdminUser::create([
        'name' => 'Existing Admin',
        'email' => 'existing@example.com',
        'password' => Hash::make('password'),
        'email_verified_at' => now(),
    ]);

    expect(AdminUser::count())->toBe(1);

    // Run the seeder
    $this->artisan('db:seed', ['--class' => AdminUserSeeder::class])
        ->assertSuccessful();

    // Assert no additional admin user was created
    expect(AdminUser::count())->toBe(1);

    $admin = AdminUser::first();
    expect($admin->email)->toBe('existing@example.com');
});

it('uses environment variables for admin credentials', function () {
    // Set environment variables
    config([
        'app.env.ADMIN_NAME' => 'Custom Admin',
        'app.env.ADMIN_EMAIL' => 'custom@example.com',
        'app.env.ADMIN_PASSWORD' => 'custom-password',
    ]);

    // Mock env() function behavior by temporarily setting environment
    putenv('ADMIN_NAME=Custom Admin');
    putenv('ADMIN_EMAIL=custom@example.com');
    putenv('ADMIN_PASSWORD=custom-password');

    // Run the seeder
    $this->artisan('db:seed', ['--class' => AdminUserSeeder::class])
        ->assertSuccessful();

    // Assert admin user was created with custom credentials
    $admin = AdminUser::first();
    expect($admin->name)->toBe('Custom Admin');
    expect($admin->email)->toBe('custom@example.com');
    expect(Hash::check('custom-password', $admin->password))->toBeTrue();

    // Clean up environment
    putenv('ADMIN_NAME');
    putenv('ADMIN_EMAIL');
    putenv('ADMIN_PASSWORD');
});

it('creates admin user with verified email', function () {
    // Run the seeder
    $this->artisan('db:seed', ['--class' => AdminUserSeeder::class])
        ->assertSuccessful();

    $admin = AdminUser::first();
    expect($admin->email_verified_at)->not->toBeNull();
    expect($admin->email_verified_at)->toBeInstanceOf(\Illuminate\Support\Carbon::class);
});

it('stores passwords as hashes', function () {
    // Run the seeder
    $this->artisan('db:seed', ['--class' => AdminUserSeeder::class])
        ->assertSuccessful();

    $admin = AdminUser::first();

    // Password should not be stored in plain text
    expect($admin->password)->not->toBe('password');

    // Password should be hashed
    expect(strlen($admin->password))->toBeGreaterThan(50);

    // Password should verify correctly
    expect(Hash::check('password', $admin->password))->toBeTrue();
});

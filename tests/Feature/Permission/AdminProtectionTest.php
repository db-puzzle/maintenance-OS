<?php

use App\Models\User;

// Helper function to create system admin user
function createSystemAdminUser(): User
{
    return User::factory()->create([
        'email' => 'system@admin.com',
        'name' => 'System Administrator',
        'password' => bcrypt('system-admin-password')
    ]);
}

// Helper function to create test user safely
function createTestUser(array $attributes = []): User
{
    $user = User::factory()->create($attributes);
    
    // Double-check this user is not the first user (admin protection verification)
    expect($user->id)->toBeGreaterThan(1, 'Created user should not be the first user (admin)');
    
    return $user;
}

// Note: System admin creation is now handled globally in TestCase.php
// This ensures ALL tests have admin protection, not just this file

test('it prevents test users from accidentally becoming admin', function () {
    // The system admin should already exist from beforeEach()
    expect(User::where('email', 'system@admin.com')->count())->toBe(1);
    
    // Create a test user using the safe method
    $testUser = createTestUser([
        'email' => 'test@example.com',
        'name' => 'Test User'
    ]);
    
    // Verify the test user is NOT the first user
    expect($testUser->id)->toBeGreaterThan(1);
    
    // Verify we have exactly 2 users
    expect(User::count())->toBe(2);
});

test('it ensures system admin is always first user', function () {
    // Get the first user
    $firstUser = User::find(1);
    
    // Verify it's the system admin
    expect($firstUser)->not->toBeNull();
    expect($firstUser->email)->toBe('system@admin.com');
    expect($firstUser->name)->toBe('System Administrator');
    expect($firstUser->isAdministrator())->toBeTrue();
});

test('multiple test users are never admin by accident', function () {
    // Create multiple test users
    $users = [];
    for ($i = 0; $i < 5; $i++) {
        $users[] = createTestUser([
            'email' => "test{$i}@example.com"
        ]);
    }
    
    // Verify none of them are the first user
    foreach ($users as $user) {
        expect($user->id)->toBeGreaterThan(1);
        expect($user->isAdministrator())->toBeFalse();
    }
    
    // We should have 6 users total (1 system admin + 5 test users)
    expect(User::count())->toBe(6);
});

test('it is safe to use factory directly after setup', function () {
    // Even using factory directly should be safe now
    $user = User::factory()->create(['email' => 'direct@example.com']);
    
    // This user should NOT be the first user
    expect($user->id)->toBeGreaterThan(1);
    
    // But using createTestUser is still recommended for clarity
    $safeUser = createTestUser(['email' => 'safe@example.com']);
    expect($safeUser->id)->toBeGreaterThan(1);
});

test('it verifies admin protection system creates and validates properly', function () {
    // The test setup already verifies admin protection in TestCase.php
    // Here we verify the system is working as expected
    
    // Should start with only 1 user (admin) after the protection sequence
    expect(User::count())->toBe(1);
    
    // Get the first user
    $firstUser = User::find(1);
    
    // Verify first user is the system admin and has administrator privileges
    expect($firstUser)->not->toBeNull();
    expect($firstUser->email)->toBe('system@admin.com');
    expect($firstUser->isAdministrator())->toBeTrue();
    
    // Create 5 test users to demonstrate protection
    $testUsers = [];
    for ($i = 1; $i <= 5; $i++) {
        $testUsers[] = User::factory()->create([
            'email' => "demo.user{$i}@example.com",
            'name' => "Demo User {$i}"
        ]);
    }
    
    // Verify we now have 6 users
    expect(User::count())->toBe(6);
    
    // Verify none of the new users are administrators
    foreach ($testUsers as $user) {
        expect($user->id)->toBeGreaterThan(1);
        expect($user->isAdministrator())->toBeFalse();
    }
    
    // Clean up the test users
    User::where('id', '>', 1)->forceDelete();
    
    // Verify only the admin user remains
    expect(User::count())->toBe(1);
    expect(User::first()->isAdministrator())->toBeTrue();
});

test('new users created are not administrators', function () {
    // Create a regular user
    $regularUser = User::factory()->create([
        'email' => 'regular@example.com',
        'name' => 'Regular User'
    ]);
    
    // Verify the user is not an administrator
    expect($regularUser->isAdministrator())->toBeFalse();
    
    // Create another user with different attributes
    $anotherUser = User::factory()->create([
        'email' => 'another@example.com',
        'name' => 'Another User',
        'password' => bcrypt('password123')
    ]);
    
    // Verify this user is also not an administrator
    expect($anotherUser->isAdministrator())->toBeFalse();
    
    // Verify only the first user (system admin) is an administrator
    $systemAdmin = User::find(1);
    expect($systemAdmin->isAdministrator())->toBeTrue();
    expect($systemAdmin->email)->toBe('system@admin.com');
    
    // Verify we have 3 users total (1 admin + 2 regular users)
    expect(User::count())->toBe(3);
}); 
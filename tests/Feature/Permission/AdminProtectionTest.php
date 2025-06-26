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
    // Ensure system admin exists first
    if (User::count() === 0) {
        createSystemAdminUser();
    }
    
    $user = User::factory()->create($attributes);
    
    // Double-check this user is not the first user
    expect($user->id)->toBeGreaterThan(1, 'Created user should not be the first user (admin)');
    
    return $user;
}

beforeEach(function () {
    // IMPORTANT: Always create the first system admin user
    // This prevents test users from accidentally becoming admins
    if (User::count() === 0) {
        createSystemAdminUser();
    }
});

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
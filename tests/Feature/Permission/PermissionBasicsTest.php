<?php

use App\Models\User;

test('it demonstrates transactional cleanup with users', function () {
    // Verify we start with system admin only (admin protection)
    expect(User::count())->toBe(1);

    // Create some test data
    User::factory()->count(3)->create();

    // Verify data was created (1 system admin + 3 test users)
    expect(User::count())->toBe(4);

    // After this test completes, the RefreshDatabase trait
    // will automatically clean up this data
});

test('it verifies previous test data was cleaned up', function () {
    // This test demonstrates that the previous test's data
    // was automatically cleaned up by the RefreshDatabase trait
    // Only system admin remains (admin protection)
    expect(User::count())->toBe(1);

    // Create different data to verify isolation
    User::factory()->count(5)->create();

    expect(User::count())->toBe(6); // 1 system admin + 5 test users
});

test('it shows database isolation between tests', function () {
    // Again, verify previous test data was cleaned up
    // Only system admin remains (admin protection)
    expect(User::count())->toBe(1);

    // Each test gets a fresh database with only system admin
    $user = User::factory()->create(['name' => 'Isolated User']);
    
    expect(\DB::table('users')->where('name', 'Isolated User')->exists())->toBeTrue();
    expect(User::count())->toBe(2); // 1 system admin + 1 test user
});

test('it can test user creation and database queries', function () {
    // Demonstrate testing basic CRUD operations
    $user = User::factory()->create([
        'name' => 'Test User',
        'email' => 'test@example.com'
    ]);

    // Test database assertions
    expect(\DB::table('users')->where([
        'email' => 'test@example.com',
        'name' => 'Test User'
    ])->exists())->toBeTrue();

    // Test model relationships work
    expect($user)->toBeInstanceOf(User::class);
    expect($user->email)->toBe('test@example.com');
    
    // Verify this test user is not an admin (admin protection working)
    expect($user->isAdministrator())->toBeFalse();
    expect(User::count())->toBe(2); // 1 system admin + 1 test user
}); 
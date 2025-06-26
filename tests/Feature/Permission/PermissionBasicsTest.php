<?php

use App\Models\User;

test('it demonstrates transactional cleanup with users', function () {
    // Verify we start with clean database
    expect(User::count())->toBe(0);

    // Create some test data
    User::factory()->count(3)->create();

    // Verify data was created
    expect(User::count())->toBe(3);

    // After this test completes, the RefreshDatabase trait
    // will automatically clean up this data
});

test('it verifies previous test data was cleaned up', function () {
    // This test demonstrates that the previous test's data
    // was automatically cleaned up by the RefreshDatabase trait
    expect(User::count())->toBe(0);

    // Create different data to verify isolation
    User::factory()->count(5)->create();

    expect(User::count())->toBe(5);
});

test('it shows database isolation between tests', function () {
    // Again, verify previous test data was cleaned up
    expect(User::count())->toBe(0);

    // Each test gets a fresh, empty database
    $user = User::factory()->create(['name' => 'Isolated User']);
    
    expect(\DB::table('users')->where('name', 'Isolated User')->exists())->toBeTrue();
    expect(User::count())->toBe(1);
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
}); 
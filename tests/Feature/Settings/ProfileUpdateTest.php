<?php

use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/profile');

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'timezone' => 'America/New_York',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->timezone)->toBe('America/New_York');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => $user->email,
            'timezone' => $user->timezone ?? 'UTC',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    // Create an admin user first to ensure we're not deleting the last admin
    $adminUser = User::factory()->create();
    
    // Create the test user (will not be an admin since it's not the first user)
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete('/settings/profile', [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    
    // Check that the user is soft deleted
    expect($user->fresh()->trashed())->toBeTrue();
});

test('administrator cannot delete their account if they are the last admin', function () {
    // Get the system admin (first user)
    $systemAdmin = User::find(1);
    expect($systemAdmin)->not->toBeNull();
    expect($systemAdmin->isAdministrator())->toBeTrue();
    
    // Create another admin user
    $adminRole = \App\Models\Role::where('is_administrator', true)->first();
    $secondAdmin = User::factory()->create();
    $secondAdmin->assignRole($adminRole);
    
    // Delete the second admin to make systemAdmin the last one
    $secondAdmin->delete();

    $response = $this
        ->actingAs($systemAdmin)
        ->delete('/settings/profile', [
            'password' => 'system-admin-password',
        ]);

    // The deletion should fail because they are the last administrator
    $response->assertRedirect();
    $response->assertSessionHas('error');
    
    // Verify the admin is still not deleted
    expect($systemAdmin->fresh()->trashed())->toBeFalse();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/settings/profile')
        ->delete('/settings/profile', [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/settings/profile');

    expect($user->fresh())->not->toBeNull();
});

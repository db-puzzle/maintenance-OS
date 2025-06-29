<?php

use App\Models\User;
use App\Models\Role;
use App\Services\AdministratorProtectionService;

beforeEach(function () {
    $this->adminProtectionService = app(AdministratorProtectionService::class);
    
    // The first user (system admin) is already created by the test setup
    // Get the system admin
    $this->systemAdmin = User::find(1);
    expect($this->systemAdmin)->not->toBeNull();
    expect($this->systemAdmin->email)->toBe('system@admin.com');
    
    // Create or get administrator role
    $adminRole = Role::firstOrCreate(
        ['name' => 'Administrator', 'guard_name' => 'web'],
        ['is_administrator' => true, 'is_system' => true]
    );
    
    // Create or get other roles
    Role::firstOrCreate([
        'name' => 'Plant Manager',
        'guard_name' => 'web',
    ]);
    
    // Create additional test admin users
    $this->admin1 = User::factory()->create(['name' => 'Admin 1']);
    $this->admin1->assignRole($adminRole);
    
    $this->admin2 = User::factory()->create(['name' => 'Admin 2']);
    $this->admin2->assignRole($adminRole);
    
    $this->regularUser = User::factory()->create(['name' => 'Regular User']);
    $this->regularUser->assignRole('Plant Manager');
});

test('identifies last administrator', function () {
    // With three admins (system + 2 test admins), none should be the last
    expect($this->adminProtectionService->isLastAdministrator($this->systemAdmin))->toBeFalse();
    expect($this->adminProtectionService->isLastAdministrator($this->admin1))->toBeFalse();
    expect($this->adminProtectionService->isLastAdministrator($this->admin2))->toBeFalse();
    
    // Regular user should never be considered last admin
    expect($this->adminProtectionService->isLastAdministrator($this->regularUser))->toBeFalse();
    
    // Soft delete two admins
    $this->admin1->delete();
    $this->admin2->delete();
    
    // Now systemAdmin should be the last active administrator
    expect($this->adminProtectionService->isLastAdministrator($this->systemAdmin))->toBeTrue();
    
    // But when including soft-deleted, systemAdmin is not the last
    expect($this->adminProtectionService->isLastAdministrator($this->systemAdmin, true))->toBeFalse();
});

test('cannot delete last administrator', function () {
    $this->actingAs($this->systemAdmin);
    
    // Verify we're logged in as system admin
    expect(auth()->user()->id)->toBe($this->systemAdmin->id);
    expect(auth()->user()->isAdministrator())->toBeTrue();
    
    // Delete admin1 and admin2 first - should succeed
    $response = $this->delete(route('users.destroy', $this->admin1));
    $response->assertRedirect();
    $response->assertSessionHas('success');
    $this->assertSoftDeleted('users', ['id' => $this->admin1->id]);
    
    $response = $this->delete(route('users.destroy', $this->admin2));
    $response->assertRedirect();
    $response->assertSessionHas('success');
    $this->assertSoftDeleted('users', ['id' => $this->admin2->id]);
    
    // Try to delete systemAdmin - should fail (last administrator protection kicks in before self-deletion check)
    $response = $this->delete(route('users.destroy', $this->systemAdmin));
    $response->assertRedirect();
    $response->assertSessionHas('error');
    expect($response->getSession()->get('error'))->toContain('last active administrator');
    
    // Login as another user to test last admin protection
    // Create a non-admin user with delete permissions
    $deleteUser = User::factory()->create(['name' => 'Delete Manager']);
    $deleteUser->givePermissionTo('users.delete');
    $this->actingAs($deleteUser);
    
    // Now try to delete systemAdmin as the last admin - should fail
    $response = $this->delete(route('users.destroy', $this->systemAdmin));
    $response->assertRedirect();
    $response->assertSessionHas('error');
    expect($response->getSession()->get('error'))->toContain('last active administrator');
    
    // Verify systemAdmin is still not deleted
    $this->assertDatabaseHas('users', [
        'id' => $this->systemAdmin->id,
        'deleted_at' => null
    ]);
});

test('cannot force delete last administrator', function () {
    $this->actingAs($this->systemAdmin);
    
    // Soft delete admin1 and admin2
    $this->admin1->delete();
    $this->admin2->delete();
    
    // Try to force delete systemAdmin - should fail
    $response = $this->delete(route('users.force-delete', $this->systemAdmin));
    $response->assertRedirect();
    $response->assertSessionHas('error');
    $this->assertDatabaseHas('users', ['id' => $this->systemAdmin->id]);
    
    // Force delete admin1 - should succeed because systemAdmin is still active
    $response = $this->delete(route('users.force-delete', $this->admin1));
    $response->assertRedirect();
    $response->assertSessionHas('success');
    $this->assertDatabaseMissing('users', ['id' => $this->admin1->id]);
});

test('cannot remove role from last administrator', function () {
    $this->actingAs($this->systemAdmin);
    
    // Delete admin1 and admin2
    $this->admin1->delete();
    $this->admin2->delete();
    
    $adminRole = Role::where('name', 'Administrator')->first();
    
    // Try to remove administrator role from systemAdmin
    $response = $this->delete(route('users.roles.remove', $this->systemAdmin), [
        'role_id' => $adminRole->id
    ]);
    
    $response->assertRedirect();
    $response->assertSessionHas('error');
    
    // Verify systemAdmin still has the role
    expect($this->systemAdmin->fresh()->hasRole('Administrator'))->toBeTrue();
});

test('protection messages are descriptive', function () {
    // Delete admin1 and admin2 to make systemAdmin the last
    $this->admin1->delete();
    $this->admin2->delete();
    
    // Test delete message
    $check = $this->adminProtectionService->canPerformOperation($this->systemAdmin, 'delete');
    expect($check['allowed'])->toBeFalse();
    expect($check['message'])->toContain('System Administrator');
    expect($check['message'])->toContain('last active administrator');
    expect($check['message'])->toContain('assign the administrator role to another user');
    
    // Test force delete message
    $check = $this->adminProtectionService->canPerformOperation($this->systemAdmin, 'forceDelete');
    expect($check['allowed'])->toBeFalse();
    expect($check['message'])->toContain('2 soft-deleted');
    
    // Test remove role message
    $check = $this->adminProtectionService->canPerformOperation($this->systemAdmin, 'removeRole');
    expect($check['allowed'])->toBeFalse();
    expect($check['message'])->toContain('Cannot remove the Administrator role');
});

test('administrator count methods', function () {
    // Initially 3 active administrators (system + 2 test admins)
    expect($this->adminProtectionService->getActiveAdministratorCount())->toBe(3);
    
    // Excluding admin1 should give 2
    expect($this->adminProtectionService->getActiveAdministratorCount($this->admin1))->toBe(2);
    
    // Soft delete one
    $this->admin2->delete();
    expect($this->adminProtectionService->getActiveAdministratorCount())->toBe(2);
    
    // Get all administrators should return 3
    $allAdmins = $this->adminProtectionService->getAllAdministrators();
    expect($allAdmins)->toHaveCount(3);
});

test('critical state detection and recovery', function () {
    // System should not be in critical state
    expect($this->adminProtectionService->isInCriticalState())->toBeFalse();
    
    // Authenticate as system admin first (we'll need this for the audit log)
    $this->actingAs($this->systemAdmin);
    
    // Soft delete all admins (bypassing protection for testing)
    $this->systemAdmin->delete();
    $this->admin1->delete();
    $this->admin2->delete();
    
    // Now system is in critical state
    expect($this->adminProtectionService->isInCriticalState())->toBeTrue();
    
    // Attempt recovery
    $recovered = $this->adminProtectionService->attemptRecovery();
    expect($recovered)->not->toBeNull();
    expect($recovered->deleted_at)->toBeNull();
    expect($this->adminProtectionService->isInCriticalState())->toBeFalse();
});

test('cannot delete self', function () {
    $this->actingAs($this->admin1);
    
    $response = $this->delete(route('users.destroy', $this->admin1));
    $response->assertRedirect();
    $response->assertSessionHas('error', 'You cannot delete your own account.');
});

test('regular users can be deleted', function () {
    $this->actingAs($this->systemAdmin);
    
    $response = $this->delete(route('users.destroy', $this->regularUser));
    $response->assertRedirect();
    $response->assertSessionHas('success');
    $this->assertSoftDeleted('users', ['id' => $this->regularUser->id]);
});

test('database trigger protection', function () {
    // Skip if not PostgreSQL
    if (config('database.default') !== 'pgsql') {
        $this->markTestSkipped('Database triggers only implemented for PostgreSQL');
    }
    
    // Delete admin1 and admin2
    $this->admin1->delete();
    $this->admin2->delete();
    
    // Try to directly soft-delete the last admin via database
    expect(fn() => DB::table('users')
        ->where('id', $this->systemAdmin->id)
        ->update(['deleted_at' => now()])
    )->toThrow(Exception::class, 'Cannot soft delete the last administrator');
}); 
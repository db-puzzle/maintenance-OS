<?php

use App\Mail\UserInvitationMail;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\Role;
use App\Models\User;
use App\Models\UserInvitation;

beforeEach(function () {
    // Create an admin user
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Administrator');
});

it('formats role display correctly with entity names instead of IDs', function () {
    // Act as admin to avoid audit log issues
    $this->actingAs($this->admin);

    // Create plants
    $plant1 = Plant::factory()->create(['name' => 'Plant Alpha']);
    $plant2 = Plant::factory()->create(['name' => 'Plant Beta']);
    $plant3 = Plant::factory()->create(['name' => 'Plant Gamma']);

    // Create a role
    $role = Role::firstOrCreate(['name' => 'Plant Manager']);

    // Create invitation with multiple scoped roles
    $roleAssignments = [
        ['role_id' => $role->id, 'role_name' => $role->name, 'entity_type' => 'plant', 'entity_id' => $plant2->id],
        ['role_id' => $role->id, 'role_name' => $role->name, 'entity_type' => 'plant', 'entity_id' => $plant1->id],
        ['role_id' => $role->id, 'role_name' => $role->name, 'entity_type' => 'plant', 'entity_id' => $plant3->id],
    ];

    $invitation = UserInvitation::create([
        'email' => 'test@example.com',
        'invited_by' => $this->admin->id,
        'initial_role' => json_encode($roleAssignments),
    ]);

    // Build the mailable
    $mailable = new UserInvitationMail($invitation);
    $builtMailable = $mailable->build();

    // Get the view data
    $viewData = $builtMailable->viewData;
    $roleDisplayList = $viewData['roleDisplayList'];

    // Assert that we have 3 separate role assignments
    expect($roleDisplayList)->toHaveCount(3);

    // Assert that the role display contains entity names, not IDs
    expect(implode(' ', $roleDisplayList))->toContain('Plant Alpha');
    expect(implode(' ', $roleDisplayList))->toContain('Plant Beta');
    expect(implode(' ', $roleDisplayList))->toContain('Plant Gamma');

    // Assert that it doesn't contain ID references
    expect(implode(' ', $roleDisplayList))->not->toContain('#1');
    expect(implode(' ', $roleDisplayList))->not->toContain('#2');
    expect(implode(' ', $roleDisplayList))->not->toContain('#3');

    // Assert that each role is listed separately
    expect($roleDisplayList[0])->toContain('Plant Manager');
    expect($roleDisplayList[0])->toContain('planta');
    expect($roleDisplayList[1])->toContain('Plant Manager');
    expect($roleDisplayList[2])->toContain('Plant Manager');
});

it('formats role display correctly for areas', function () {
    // Act as admin to avoid audit log issues
    $this->actingAs($this->admin);

    $plant = Plant::factory()->create(['name' => 'Main Plant']);
    $area1 = Area::factory()->create(['plant_id' => $plant->id, 'name' => 'Area A']);
    $area2 = Area::factory()->create(['plant_id' => $plant->id, 'name' => 'Area B']);

    $role = Role::firstOrCreate(['name' => 'Area Manager']);

    $roleAssignments = [
        ['role_id' => $role->id, 'role_name' => $role->name, 'entity_type' => 'area', 'entity_id' => $area1->id],
        ['role_id' => $role->id, 'role_name' => $role->name, 'entity_type' => 'area', 'entity_id' => $area2->id],
    ];

    $invitation = UserInvitation::create([
        'email' => 'area-manager@example.com',
        'invited_by' => $this->admin->id,
        'initial_role' => json_encode($roleAssignments),
    ]);

    $mailable = new UserInvitationMail($invitation);
    $builtMailable = $mailable->build();
    $viewData = $builtMailable->viewData;
    $roleDisplayList = $viewData['roleDisplayList'];

    expect($roleDisplayList)->toHaveCount(2);
    expect($roleDisplayList[0])->toContain('Area A');
    expect($roleDisplayList[1])->toContain('Area B');
    expect($roleDisplayList[0])->toContain('área');
});

it('formats role display correctly for sectors', function () {
    // Act as admin to avoid audit log issues
    $this->actingAs($this->admin);

    $plant = Plant::factory()->create(['name' => 'Main Plant']);
    $area = Area::factory()->create(['plant_id' => $plant->id, 'name' => 'Production Area']);
    $sector1 = Sector::factory()->create(['area_id' => $area->id, 'name' => 'Sector 1']);
    $sector2 = Sector::factory()->create(['area_id' => $area->id, 'name' => 'Sector 2']);

    $role = Role::firstOrCreate(['name' => 'Sector Supervisor']);

    $roleAssignments = [
        ['role_id' => $role->id, 'role_name' => $role->name, 'entity_type' => 'sector', 'entity_id' => $sector1->id],
        ['role_id' => $role->id, 'role_name' => $role->name, 'entity_type' => 'sector', 'entity_id' => $sector2->id],
    ];

    $invitation = UserInvitation::create([
        'email' => 'sector-supervisor@example.com',
        'invited_by' => $this->admin->id,
        'initial_role' => json_encode($roleAssignments),
    ]);

    $mailable = new UserInvitationMail($invitation);
    $builtMailable = $mailable->build();
    $viewData = $builtMailable->viewData;
    $roleDisplayList = $viewData['roleDisplayList'];

    expect($roleDisplayList)->toHaveCount(2);
    expect($roleDisplayList[0])->toContain('Sector 1');
    expect($roleDisplayList[1])->toContain('Sector 2');
    expect($roleDisplayList[0])->toContain('setor');
});

it('handles legacy role format correctly', function () {
    $invitation = UserInvitation::create([
        'email' => 'legacy@example.com',
        'invited_by' => $this->admin->id,
        'initial_role' => 'Plant Manager',
    ]);

    $mailable = new UserInvitationMail($invitation);
    $builtMailable = $mailable->build();
    $viewData = $builtMailable->viewData;
    $roleDisplayList = $viewData['roleDisplayList'];

    expect($roleDisplayList)->toHaveCount(1);
    expect($roleDisplayList[0])->toBe('Plant Manager');
});

it('handles role without scope correctly', function () {
    $role = Role::firstOrCreate(['name' => 'Administrator']);

    $roleAssignments = [
        ['role_id' => $role->id, 'role_name' => $role->name],
    ];

    $invitation = UserInvitation::create([
        'email' => 'admin@example.com',
        'invited_by' => $this->admin->id,
        'initial_role' => json_encode($roleAssignments),
    ]);

    $mailable = new UserInvitationMail($invitation);
    $builtMailable = $mailable->build();
    $viewData = $builtMailable->viewData;
    $roleDisplayList = $viewData['roleDisplayList'];

    expect($roleDisplayList)->toHaveCount(1);
    expect($roleDisplayList[0])->toBe('Administrator');
    expect($roleDisplayList[0])->not->toContain('para');
});

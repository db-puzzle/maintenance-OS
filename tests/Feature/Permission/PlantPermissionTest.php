<?php

namespace Tests\Feature\Permission;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlantPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $plantManager;
    protected User $userWithViewPermission;
    protected User $userWithoutPermission;
    protected Plant $plant;
    protected Plant $otherPlant;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin user first
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Administrator');

        // Act as admin when creating hierarchy to ensure audit logs have a user_id
        $this->actingAs($this->admin);

        // Create plants
        $this->plant = Plant::factory()->create(['name' => 'Test Plant']);
        $this->otherPlant = Plant::factory()->create(['name' => 'Other Plant']);

        // Create user with plant manager permissions
        $this->plantManager = User::factory()->create();
        $this->plantManager->givePermissionTo([
            "plants.view.{$this->plant->id}",
            "plants.update.{$this->plant->id}",
            "plants.delete.{$this->plant->id}",
            "plants.manage-shifts.{$this->plant->id}",
            'system.create-plants',
        ]);

        // Create user with only view permission
        $this->userWithViewPermission = User::factory()->create();
        $this->userWithViewPermission->givePermissionTo("plants.view.{$this->plant->id}");

        // Create user without any permissions
        $this->userWithoutPermission = User::factory()->create();
    }

    public function test_user_without_permission_cannot_view_plant_list()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->get(route('asset-hierarchy.plants'));

        $response->assertStatus(403);
    }

    public function test_user_with_view_permission_can_view_plant_list()
    {
        $response = $this->actingAs($this->userWithViewPermission)
            ->get(route('asset-hierarchy.plants'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/plants/index')
            ->has('plants.data', 1) // Should only see the one plant they have permission for
            ->where('plants.data.0.name', 'Test Plant')
        );
    }

    public function test_admin_can_view_all_plants()
    {
        $response = $this->actingAs($this->admin)
            ->get(route('asset-hierarchy.plants'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/plants/index')
            ->has('plants.data', 2) // Admin should see both plants
        );
    }

    public function test_user_without_permission_cannot_view_specific_plant()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->get(route('asset-hierarchy.plants.show', $this->plant));

        $response->assertStatus(403);
    }

    public function test_user_with_view_permission_can_view_specific_plant()
    {
        $response = $this->actingAs($this->userWithViewPermission)
            ->get(route('asset-hierarchy.plants.show', $this->plant));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/plants/show')
            ->has('plant')
            ->where('plant.id', $this->plant->id)
        );
    }

    public function test_user_with_area_permission_can_view_plant()
    {
        // Create area in the plant
        $area = Area::factory()->create(['plant_id' => $this->plant->id]);
        
        // Create user with area permission
        $areaUser = User::factory()->create();
        $areaUser->givePermissionTo("areas.view.{$area->id}");

        $response = $this->actingAs($areaUser)
            ->get(route('asset-hierarchy.plants.show', $this->plant));

        $response->assertStatus(200);
    }

    public function test_only_admin_and_users_with_system_permission_can_create_plants()
    {
        // User without permission cannot create
        $response = $this->actingAs($this->userWithoutPermission)
            ->post(route('asset-hierarchy.plants.store'), [
                'name' => 'New Plant',
                'city' => 'Test City',
            ]);

        $response->assertStatus(403);

        // Plant manager with system.create-plants can create
        $response = $this->actingAs($this->plantManager)
            ->post(route('asset-hierarchy.plants.store'), [
                'name' => 'New Plant',
                'city' => 'Test City',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('plants', ['name' => 'New Plant']);

        // Admin can create
        $response = $this->actingAs($this->admin)
            ->post(route('asset-hierarchy.plants.store'), [
                'name' => 'Admin Plant',
                'city' => 'Admin City',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('plants', ['name' => 'Admin Plant']);
    }

    public function test_only_authorized_users_can_update_plant()
    {
        // User without permission cannot update
        $response = $this->actingAs($this->userWithoutPermission)
            ->put(route('asset-hierarchy.plants.update', $this->plant), [
                'name' => 'Updated Name',
            ]);

        $response->assertStatus(403);

        // User with only view permission cannot update
        $response = $this->actingAs($this->userWithViewPermission)
            ->put(route('asset-hierarchy.plants.update', $this->plant), [
                'name' => 'Updated Name',
            ]);

        $response->assertStatus(403);

        // Plant manager can update
        $response = $this->actingAs($this->plantManager)
            ->put(route('asset-hierarchy.plants.update', $this->plant), [
                'name' => 'Manager Updated',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('plants', [
            'id' => $this->plant->id,
            'name' => 'Manager Updated',
        ]);

        // Admin can update
        $response = $this->actingAs($this->admin)
            ->put(route('asset-hierarchy.plants.update', $this->plant), [
                'name' => 'Admin Updated',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('plants', [
            'id' => $this->plant->id,
            'name' => 'Admin Updated',
        ]);
    }

    public function test_only_authorized_users_can_delete_plant()
    {
        // Create a plant without dependencies for deletion test
        $deletablePlant = Plant::factory()->create(['name' => 'Deletable Plant']);

        // User without permission cannot delete
        $response = $this->actingAs($this->userWithoutPermission)
            ->delete(route('asset-hierarchy.plants.destroy', $deletablePlant));

        $response->assertStatus(403);

        // User with only view permission cannot delete
        $response = $this->actingAs($this->userWithViewPermission)
            ->delete(route('asset-hierarchy.plants.destroy', $deletablePlant));

        $response->assertStatus(403);

        // Create another deletable plant for plant manager test
        $managerDeletablePlant = Plant::factory()->create(['name' => 'Manager Deletable']);
        $managerWithDelete = User::factory()->create();
        $managerWithDelete->givePermissionTo("plants.delete.{$managerDeletablePlant->id}");

        // Plant manager with delete permission can delete
        $response = $this->actingAs($managerWithDelete)
            ->delete(route('asset-hierarchy.plants.destroy', $managerDeletablePlant));

        $response->assertRedirect();
        $this->assertDatabaseMissing('plants', ['id' => $managerDeletablePlant->id]);

        // Admin can delete
        $response = $this->actingAs($this->admin)
            ->delete(route('asset-hierarchy.plants.destroy', $deletablePlant));

        $response->assertRedirect();
        $this->assertDatabaseMissing('plants', ['id' => $deletablePlant->id]);
    }

    public function test_plant_list_filters_by_user_permissions()
    {
        // Create user with permission to only one plant
        $singlePlantUser = User::factory()->create();
        $singlePlantUser->givePermissionTo("plants.view.{$this->plant->id}");

        $response = $this->actingAs($singlePlantUser)
            ->get(route('asset-hierarchy.plants'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/plants/index')
            ->has('plants.data', 1)
            ->where('plants.data.0.id', $this->plant->id)
        );

        // User should not see the other plant
        $plantIds = collect($response->original->getData()['page']['props']['plants']['data'])
            ->pluck('id')
            ->toArray();
        $this->assertNotContains($this->otherPlant->id, $plantIds);
    }

    public function test_user_with_sector_permission_can_access_plant()
    {
        // Create hierarchy
        $area = Area::factory()->create(['plant_id' => $this->plant->id]);
        $sector = Sector::factory()->create(['area_id' => $area->id]);

        // Create user with sector permission
        $sectorUser = User::factory()->create();
        $sectorUser->givePermissionTo("sectors.view.{$sector->id}");

        // User should be able to view the plant through sector permission
        $response = $this->actingAs($sectorUser)
            ->get(route('asset-hierarchy.plants.show', $this->plant));

        $response->assertStatus(200);

        // User should see the plant in the list
        $response = $this->actingAs($sectorUser)
            ->get(route('asset-hierarchy.plants'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('plants.data', 1)
            ->where('plants.data.0.id', $this->plant->id)
        );
    }

    public function test_manage_shifts_permission()
    {
        // User without manage-shifts permission
        $userWithoutShiftPermission = User::factory()->create();
        $userWithoutShiftPermission->givePermissionTo("plants.view.{$this->plant->id}");

        // This test would need a shift management endpoint to fully test
        // For now, we just verify the policy method works
        $this->assertFalse($userWithoutShiftPermission->can('manageShifts', $this->plant));
        $this->assertTrue($this->plantManager->can('manageShifts', $this->plant));
        $this->assertTrue($this->admin->can('manageShifts', $this->plant));

        // Test with shifts.manage.plant permission
        $shiftManager = User::factory()->create();
        $shiftManager->givePermissionTo("shifts.manage.plant.{$this->plant->id}");
        $this->assertTrue($shiftManager->can('manageShifts', $this->plant));
    }
} 
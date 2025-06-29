<?php

namespace Tests\Feature\Permission;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AreaPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $areaManager;
    protected User $userWithViewPermission;
    protected User $userWithoutPermission;
    protected Plant $plant;
    protected Plant $otherPlant;
    protected Area $area;
    protected Area $otherArea;

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

        // Create areas
        $this->area = Area::factory()->create([
            'name' => 'Test Area',
            'plant_id' => $this->plant->id,
        ]);
        $this->otherArea = Area::factory()->create([
            'name' => 'Other Area',
            'plant_id' => $this->otherPlant->id,
        ]);

        // Create user with area manager permissions
        $this->areaManager = User::factory()->create();
        $this->areaManager->givePermissionTo([
            "areas.view.{$this->area->id}",
            "areas.update.{$this->area->id}",
            "areas.delete.{$this->area->id}",
        ]);

        // Create user with only view permission
        $this->userWithViewPermission = User::factory()->create();
        $this->userWithViewPermission->givePermissionTo("areas.view.{$this->area->id}");

        // Create user without any permissions
        $this->userWithoutPermission = User::factory()->create();
    }

    public function test_user_without_permission_cannot_view_area_list()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->get(route('asset-hierarchy.areas'));

        $response->assertStatus(403);
    }

    public function test_user_with_view_permission_can_view_area_list()
    {
        $response = $this->actingAs($this->userWithViewPermission)
            ->get(route('asset-hierarchy.areas'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/areas/index')
            ->has('areas.data', 1) // Should only see the one area they have permission for
            ->where('areas.data.0.name', 'Test Area')
        );
    }

    public function test_admin_can_view_all_areas()
    {
        $response = $this->actingAs($this->admin)
            ->get(route('asset-hierarchy.areas'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/areas/index')
            ->has('areas.data', 2) // Admin should see both areas
        );
    }

    public function test_user_without_permission_cannot_view_specific_area()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->get(route('asset-hierarchy.areas.show', $this->area));

        $response->assertStatus(403);
    }

    public function test_user_with_view_permission_can_view_specific_area()
    {
        $response = $this->actingAs($this->userWithViewPermission)
            ->get(route('asset-hierarchy.areas.show', $this->area));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/areas/show')
            ->has('area')
            ->where('area.id', $this->area->id)
        );
    }

    public function test_user_with_plant_permission_can_view_area()
    {
        // Create user with plant permission
        $plantUser = User::factory()->create();
        $plantUser->givePermissionTo("plants.view.{$this->plant->id}");

        $response = $this->actingAs($plantUser)
            ->get(route('asset-hierarchy.areas.show', $this->area));

        $response->assertStatus(200);
    }

    public function test_user_with_sector_permission_can_view_area()
    {
        // Create sector in the area
        $sector = Sector::factory()->create(['area_id' => $this->area->id]);
        
        // Create user with sector permission
        $sectorUser = User::factory()->create();
        $sectorUser->givePermissionTo("sectors.view.{$sector->id}");

        $response = $this->actingAs($sectorUser)
            ->get(route('asset-hierarchy.areas.show', $this->area));

        $response->assertStatus(200);
    }

    public function test_only_admin_and_plant_managers_can_create_areas()
    {
        // User without permission cannot create
        $response = $this->actingAs($this->userWithoutPermission)
            ->post(route('asset-hierarchy.areas.store'), [
                'name' => 'New Area',
                'plant_id' => $this->plant->id,
            ]);

        $response->assertStatus(403);

        // Area manager cannot create (no plant update permission)
        $response = $this->actingAs($this->areaManager)
            ->post(route('asset-hierarchy.areas.store'), [
                'name' => 'New Area',
                'plant_id' => $this->plant->id,
            ]);

        $response->assertStatus(403);

        // User with plant update permission can create areas in that plant
        $plantManager = User::factory()->create();
        $plantManager->givePermissionTo("plants.update.{$this->plant->id}");

        $response = $this->actingAs($plantManager)
            ->post(route('asset-hierarchy.areas.store'), [
                'name' => 'Plant Manager Area',
                'plant_id' => $this->plant->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('areas', ['name' => 'Plant Manager Area']);

        // But cannot create in other plants
        $response = $this->actingAs($plantManager)
            ->post(route('asset-hierarchy.areas.store'), [
                'name' => 'Unauthorized Area',
                'plant_id' => $this->otherPlant->id,
            ]);

        $response->assertStatus(403);

        // Admin can create
        $response = $this->actingAs($this->admin)
            ->post(route('asset-hierarchy.areas.store'), [
                'name' => 'Admin Area',
                'plant_id' => $this->plant->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('areas', ['name' => 'Admin Area']);
    }

    public function test_only_authorized_users_can_update_area()
    {
        // User without permission cannot update
        $response = $this->actingAs($this->userWithoutPermission)
            ->put(route('asset-hierarchy.areas.update', $this->area), [
                'name' => 'Updated Name',
                'plant_id' => $this->plant->id,
            ]);

        $response->assertStatus(403);

        // User with only view permission cannot update
        $response = $this->actingAs($this->userWithViewPermission)
            ->put(route('asset-hierarchy.areas.update', $this->area), [
                'name' => 'Updated Name',
                'plant_id' => $this->plant->id,
            ]);

        $response->assertStatus(403);

        // Area manager can update
        $response = $this->actingAs($this->areaManager)
            ->put(route('asset-hierarchy.areas.update', $this->area), [
                'name' => 'Manager Updated',
                'plant_id' => $this->plant->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('areas', [
            'id' => $this->area->id,
            'name' => 'Manager Updated',
        ]);

        // Admin can update
        $response = $this->actingAs($this->admin)
            ->put(route('asset-hierarchy.areas.update', $this->area), [
                'name' => 'Admin Updated',
                'plant_id' => $this->plant->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('areas', [
            'id' => $this->area->id,
            'name' => 'Admin Updated',
        ]);
    }

    public function test_user_with_plant_update_permission_can_update_area()
    {
        // Create user with plant update permission
        $plantManager = User::factory()->create();
        $plantManager->givePermissionTo("plants.update.{$this->plant->id}");

        // Plant manager should be able to update areas in their plant
        $response = $this->actingAs($plantManager)
            ->put(route('asset-hierarchy.areas.update', $this->area), [
                'name' => 'Plant Manager Updated',
                'plant_id' => $this->plant->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('areas', [
            'id' => $this->area->id,
            'name' => 'Plant Manager Updated',
        ]);
    }

    public function test_only_authorized_users_can_delete_area()
    {
        // Create an area without dependencies for deletion test
        $deletableArea = Area::factory()->create([
            'name' => 'Deletable Area',
            'plant_id' => $this->plant->id,
        ]);

        // User without permission cannot delete
        $response = $this->actingAs($this->userWithoutPermission)
            ->delete(route('asset-hierarchy.areas.destroy', $deletableArea));

        $response->assertStatus(403);

        // User with only view permission cannot delete
        $response = $this->actingAs($this->userWithViewPermission)
            ->delete(route('asset-hierarchy.areas.destroy', $deletableArea));

        $response->assertStatus(403);

        // Create another deletable area for area manager test
        $managerDeletableArea = Area::factory()->create([
            'name' => 'Manager Deletable',
            'plant_id' => $this->plant->id,
        ]);
        $managerWithDelete = User::factory()->create();
        $managerWithDelete->givePermissionTo("areas.delete.{$managerDeletableArea->id}");

        // Area manager with delete permission can delete
        $response = $this->actingAs($managerWithDelete)
            ->delete(route('asset-hierarchy.areas.destroy', $managerDeletableArea));

        $response->assertRedirect();
        $this->assertDatabaseMissing('areas', ['id' => $managerDeletableArea->id]);

        // Admin can delete
        $response = $this->actingAs($this->admin)
            ->delete(route('asset-hierarchy.areas.destroy', $deletableArea));

        $response->assertRedirect();
        $this->assertDatabaseMissing('areas', ['id' => $deletableArea->id]);
    }

    public function test_user_with_plant_delete_permission_can_delete_area()
    {
        // Create user with plant delete permission
        $plantManager = User::factory()->create();
        $plantManager->givePermissionTo("plants.delete.{$this->plant->id}");

        // Create deletable area
        $deletableArea = Area::factory()->create([
            'name' => 'Plant Manager Deletable',
            'plant_id' => $this->plant->id,
        ]);

        // Plant manager should be able to delete areas in their plant
        $response = $this->actingAs($plantManager)
            ->delete(route('asset-hierarchy.areas.destroy', $deletableArea));

        $response->assertRedirect();
        $this->assertDatabaseMissing('areas', ['id' => $deletableArea->id]);
    }

    public function test_area_list_filters_by_user_permissions()
    {
        // Create user with permission to only one area
        $singleAreaUser = User::factory()->create();
        $singleAreaUser->givePermissionTo("areas.view.{$this->area->id}");

        $response = $this->actingAs($singleAreaUser)
            ->get(route('asset-hierarchy.areas'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/areas/index')
            ->has('areas.data', 1)
            ->where('areas.data.0.id', $this->area->id)
        );

        // User should not see the other area
        $areaIds = collect($response->original->getData()['page']['props']['areas']['data'])
            ->pluck('id')
            ->toArray();
        $this->assertNotContains($this->otherArea->id, $areaIds);
    }

    public function test_user_with_plant_permission_sees_all_areas_in_plant()
    {
        // Create additional area in the same plant
        $anotherArea = Area::factory()->create([
            'name' => 'Another Area',
            'plant_id' => $this->plant->id,
        ]);

        // Create user with plant permission
        $plantUser = User::factory()->create();
        $plantUser->givePermissionTo("plants.view.{$this->plant->id}");

        $response = $this->actingAs($plantUser)
            ->get(route('asset-hierarchy.areas'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('areas.data', 2) // Should see both areas in the plant
        );

        // Verify both areas are from the same plant
        $areas = collect($response->original->getData()['page']['props']['areas']['data']);
        $this->assertEquals(2, $areas->where('plant_id', $this->plant->id)->count());
        $this->assertEquals(0, $areas->where('plant_id', $this->otherPlant->id)->count());
    }

    public function test_user_with_sector_permission_can_access_area()
    {
        // Create sector
        $sector = Sector::factory()->create(['area_id' => $this->area->id]);

        // Create user with sector permission
        $sectorUser = User::factory()->create();
        $sectorUser->givePermissionTo("sectors.view.{$sector->id}");

        // User should be able to view the area through sector permission
        $response = $this->actingAs($sectorUser)
            ->get(route('asset-hierarchy.areas.show', $this->area));

        $response->assertStatus(200);

        // User should see the area in the list
        $response = $this->actingAs($sectorUser)
            ->get(route('asset-hierarchy.areas'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('areas.data', 1)
            ->where('areas.data.0.id', $this->area->id)
        );
    }

    public function test_plants_dropdown_only_shows_accessible_plants()
    {
        // Create user with permission to only one plant
        $plantUser = User::factory()->create();
        $plantUser->givePermissionTo("plants.view.{$this->plant->id}");

        $response = $this->actingAs($plantUser)
            ->get(route('asset-hierarchy.areas'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('plants', 1) // Should only see one plant in dropdown
            ->where('plants.0.id', $this->plant->id)
        );

        // Admin should see all plants
        $response = $this->actingAs($this->admin)
            ->get(route('asset-hierarchy.areas'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->has('plants', 2) // Admin sees all plants
        );
    }
} 
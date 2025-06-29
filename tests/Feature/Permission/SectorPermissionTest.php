<?php

namespace Tests\Feature\Permission;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SectorPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $plantManager;
    protected User $areaManager;
    protected User $sectorManager;
    protected User $viewer;
    protected User $userWithoutPermission;
    protected Plant $plant;
    protected Plant $otherPlant;
    protected Area $area;
    protected Area $otherArea;
    protected Sector $sector;
    protected Sector $otherSector;

    protected function setUp(): void
    {
        parent::setUp();

        // Run seeders to ensure roles and base permissions exist
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);

        // Create admin user
        $this->admin = User::factory()->create(['name' => 'Admin User']);
        $this->admin->assignRole('Administrator');

        // Act as admin when creating hierarchy to ensure audit logs have a user_id
        // and permissions are created by observers
        $this->actingAs($this->admin);

        // Create hierarchy - this will trigger observers to create permissions
        $this->plant = Plant::factory()->create(['name' => 'Test Plant']);
        $this->otherPlant = Plant::factory()->create(['name' => 'Other Plant']);
        
        $this->area = Area::factory()->create([
            'name' => 'Test Area',
            'plant_id' => $this->plant->id
        ]);
        $this->otherArea = Area::factory()->create([
            'name' => 'Other Area',
            'plant_id' => $this->otherPlant->id
        ]);
        
        $this->sector = Sector::factory()->create([
            'name' => 'Test Sector',
            'area_id' => $this->area->id
        ]);
        $this->otherSector = Sector::factory()->create([
            'name' => 'Other Sector',
            'area_id' => $this->otherArea->id
        ]);

        // Create Plant Manager and assign to test plant
        $this->plantManager = User::factory()->create(['name' => 'Plant Manager']);
        $this->plantManager->assignRole('Plant Manager');
        $this->assignPlantManagerPermissions($this->plantManager, $this->plant);

        // Create Area Manager and assign to test area
        $this->areaManager = User::factory()->create(['name' => 'Area Manager']);
        $this->areaManager->assignRole('Area Manager');
        $this->assignAreaManagerPermissions($this->areaManager, $this->area);

        // Create Sector Manager and assign to test sector
        $this->sectorManager = User::factory()->create(['name' => 'Sector Manager']);
        $this->sectorManager->assignRole('Sector Manager');
        $this->assignSectorManagerPermissions($this->sectorManager, $this->sector);

        // Create Viewer with view permission for test sector
        $this->viewer = User::factory()->create(['name' => 'Viewer']);
        $this->viewer->assignRole('Viewer');
        $this->viewer->givePermissionTo("sectors.view.{$this->sector->id}");

        // Create user without any permissions
        $this->userWithoutPermission = User::factory()->create(['name' => 'No Permission User']);
    }

    /**
     * Assign plant manager permissions according to the system design
     */
    protected function assignPlantManagerPermissions(User $user, Plant $plant): void
    {
        $permissions = [
            "plants.view.{$plant->id}",
            "plants.update.{$plant->id}",
            "plants.manage-shifts.{$plant->id}",
            "users.invite.plant.{$plant->id}",
            "areas.create.plant.{$plant->id}",
            "areas.viewAny.plant.{$plant->id}",
            "sectors.viewAny.plant.{$plant->id}",
            "sectors.create.plant.{$plant->id}",
            "assets.viewAny.plant.{$plant->id}",
            "assets.create.plant.{$plant->id}",
            "assets.manage.plant.{$plant->id}",
            "assets.execute-routines.plant.{$plant->id}",
            "assets.import.plant.{$plant->id}",
            "assets.export.plant.{$plant->id}",
            "shifts.viewAny.plant.{$plant->id}",
            "shifts.create.plant.{$plant->id}",
            "shifts.manage.plant.{$plant->id}",
            "asset-types.viewAny.plant.{$plant->id}",
            "asset-types.create.plant.{$plant->id}",
            "manufacturers.viewAny.plant.{$plant->id}",
            "manufacturers.create.plant.{$plant->id}",
        ];

        foreach ($permissions as $permission) {
            if (Permission::where('name', $permission)->exists()) {
                $user->givePermissionTo($permission);
            }
        }
    }

    /**
     * Assign area manager permissions according to the system design
     */
    protected function assignAreaManagerPermissions(User $user, Area $area): void
    {
        $permissions = [
            "users.invite.area.{$area->id}",
            "areas.view.{$area->id}",
            "areas.update.{$area->id}",
            "sectors.create.area.{$area->id}",
            "sectors.viewAny.area.{$area->id}",
            "assets.viewAny.area.{$area->id}",
            "assets.create.area.{$area->id}",
            "assets.manage.area.{$area->id}",
            "assets.execute-routines.area.{$area->id}",
            "assets.export.area.{$area->id}",
        ];

        foreach ($permissions as $permission) {
            if (Permission::where('name', $permission)->exists()) {
                $user->givePermissionTo($permission);
            }
        }
    }

    /**
     * Assign sector manager permissions according to the system design
     */
    protected function assignSectorManagerPermissions(User $user, Sector $sector): void
    {
        $permissions = [
            "users.invite.sector.{$sector->id}",
            "sectors.view.{$sector->id}",
            "sectors.update.{$sector->id}",
            "assets.viewAny.sector.{$sector->id}",
            "assets.create.sector.{$sector->id}",
            "assets.manage.sector.{$sector->id}",
            "assets.execute-routines.sector.{$sector->id}",
            "assets.export.sector.{$sector->id}",
        ];

        foreach ($permissions as $permission) {
            if (Permission::where('name', $permission)->exists()) {
                $user->givePermissionTo($permission);
            }
        }
    }

    public function test_user_without_permission_cannot_view_sector_list()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->get(route('asset-hierarchy.sectors'));

        $response->assertStatus(403);
    }

    public function test_viewer_with_sector_permission_can_view_sector_list()
    {
        $response = $this->actingAs($this->viewer)
            ->get(route('asset-hierarchy.sectors'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/sectors/index')
            ->has('sectors.data', 1) // Should only see the one sector they have permission for
            ->where('sectors.data.0.name', 'Test Sector')
        );
    }

    public function test_area_manager_can_view_all_sectors_in_area()
    {
        // Create another sector in the same area
        $anotherSector = Sector::factory()->create([
            'name' => 'Another Sector',
            'area_id' => $this->area->id
        ]);

        $response = $this->actingAs($this->areaManager)
            ->get(route('asset-hierarchy.sectors'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/sectors/index')
            ->has('sectors.data', 2) // Should see both sectors in their area
        );

        $sectorIds = collect($response->original->getData()['page']['props']['sectors']['data'])
            ->pluck('id')
            ->toArray();
        $this->assertContains($this->sector->id, $sectorIds);
        $this->assertContains($anotherSector->id, $sectorIds);
        $this->assertNotContains($this->otherSector->id, $sectorIds);
    }

    public function test_plant_manager_can_view_all_sectors_in_plant()
    {
        // Create another area and sector in the same plant
        $anotherArea = Area::factory()->create([
            'name' => 'Another Area',
            'plant_id' => $this->plant->id
        ]);
        $plantSector = Sector::factory()->create([
            'name' => 'Plant Sector',
            'area_id' => $anotherArea->id
        ]);

        $response = $this->actingAs($this->plantManager)
            ->get(route('asset-hierarchy.sectors'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/sectors/index')
            ->has('sectors.data', 2) // Should see all sectors in their plant
        );

        $sectorIds = collect($response->original->getData()['page']['props']['sectors']['data'])
            ->pluck('id')
            ->toArray();
        $this->assertContains($this->sector->id, $sectorIds);
        $this->assertContains($plantSector->id, $sectorIds);
        $this->assertNotContains($this->otherSector->id, $sectorIds);
    }

    public function test_admin_can_view_all_sectors()
    {
        $response = $this->actingAs($this->admin)
            ->get(route('asset-hierarchy.sectors'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/sectors/index')
            ->has('sectors.data', 2) // Admin should see all sectors
        );
    }

    public function test_user_without_permission_cannot_view_specific_sector()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->get(route('asset-hierarchy.sectors.show', $this->sector));

        $response->assertStatus(403);
    }

    public function test_viewer_can_view_specific_sector()
    {
        $response = $this->actingAs($this->viewer)
            ->get(route('asset-hierarchy.sectors.show', $this->sector));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/sectors/show')
            ->has('sector')
            ->where('sector.id', $this->sector->id)
        );
    }

    public function test_area_manager_can_create_sectors_in_their_area()
    {
        $response = $this->actingAs($this->areaManager)
            ->post(route('asset-hierarchy.sectors.store'), [
                'name' => 'New Sector by Area Manager',
                'area_id' => $this->area->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sectors', ['name' => 'New Sector by Area Manager']);
    }

    public function test_plant_manager_can_create_sectors_in_their_plant()
    {
        $response = $this->actingAs($this->plantManager)
            ->post(route('asset-hierarchy.sectors.store'), [
                'name' => 'New Sector by Plant Manager',
                'area_id' => $this->area->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sectors', ['name' => 'New Sector by Plant Manager']);
    }

    public function test_sector_manager_cannot_create_sectors()
    {
        // Sector managers don't have create permission by default
        $response = $this->actingAs($this->sectorManager)
            ->post(route('asset-hierarchy.sectors.store'), [
                'name' => 'New Sector',
                'area_id' => $this->area->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_sector_manager_can_update_their_sector()
    {
        $response = $this->actingAs($this->sectorManager)
            ->put(route('asset-hierarchy.sectors.update', $this->sector), [
                'name' => 'Updated by Sector Manager',
                'area_id' => $this->area->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sectors', [
            'id' => $this->sector->id,
            'name' => 'Updated by Sector Manager',
        ]);
    }

    public function test_area_manager_can_update_sectors_in_their_area()
    {
        $response = $this->actingAs($this->areaManager)
            ->put(route('asset-hierarchy.sectors.update', $this->sector), [
                'name' => 'Updated by Area Manager',
                'area_id' => $this->area->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sectors', [
            'id' => $this->sector->id,
            'name' => 'Updated by Area Manager',
        ]);
    }

    public function test_viewer_cannot_update_sector()
    {
        $response = $this->actingAs($this->viewer)
            ->put(route('asset-hierarchy.sectors.update', $this->sector), [
                'name' => 'Updated Name',
                'area_id' => $this->area->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_sector_manager_cannot_delete_sector()
    {
        // Sector managers don't have delete permission by default
        $deletableSector = Sector::factory()->create([
            'name' => 'Deletable Sector',
            'area_id' => $this->area->id
        ]);
        $this->assignSectorManagerPermissions($this->sectorManager, $deletableSector);

        $response = $this->actingAs($this->sectorManager)
            ->delete(route('asset-hierarchy.sectors.destroy', $deletableSector));

        $response->assertStatus(403);
    }

    public function test_area_manager_can_delete_sectors_in_their_area()
    {
        // Give area manager delete permission for this test
        $this->areaManager->givePermissionTo("areas.delete.{$this->area->id}");
        
        // Area managers with delete permission can delete sectors in their area
        $deletableSector = Sector::factory()->create([
            'name' => 'Deletable by Area Manager',
            'area_id' => $this->area->id
        ]);

        $response = $this->actingAs($this->areaManager)
            ->delete(route('asset-hierarchy.sectors.destroy', $deletableSector));

        $response->assertRedirect();
        $this->assertDatabaseMissing('sectors', ['id' => $deletableSector->id]);
    }

    public function test_user_with_sector_delete_permission_can_delete()
    {
        // Create a user with specific sector delete permission
        $deletableSector = Sector::factory()->create([
            'name' => 'Deletable Sector',
            'area_id' => $this->area->id
        ]);
        
        $userWithDelete = User::factory()->create(['name' => 'Delete User']);
        $userWithDelete->givePermissionTo("sectors.delete.{$deletableSector->id}");

        $response = $this->actingAs($userWithDelete)
            ->delete(route('asset-hierarchy.sectors.destroy', $deletableSector));

        $response->assertRedirect();
        $this->assertDatabaseMissing('sectors', ['id' => $deletableSector->id]);
    }

    public function test_cannot_delete_sector_with_assets()
    {
        // Create asset in the sector
        Asset::factory()->create([
            'sector_id' => $this->sector->id,
            'area_id' => $this->area->id,
            'plant_id' => $this->plant->id
        ]);

        $response = $this->actingAs($this->admin)
            ->delete(route('asset-hierarchy.sectors.destroy', $this->sector));

        $response->assertRedirect();
        $response->assertSessionHas('error', 'Não é possível excluir um setor que possui ativos.');
        $this->assertDatabaseHas('sectors', ['id' => $this->sector->id]);
    }

    public function test_plants_dropdown_filters_by_user_permissions()
    {
        // Area manager should only see their plant in the dropdown
        $response = $this->actingAs($this->areaManager)
            ->get(route('asset-hierarchy.sectors'));

        $response->assertStatus(200);
        
        // Check that plants dropdown only shows the plant the user has access to
        $plants = $response->original->getData()['page']['props']['plants'];
        $this->assertCount(1, $plants);
        $this->assertEquals($this->plant->id, $plants[0]['id']);
    }

    public function test_user_with_system_create_sectors_permission_can_create()
    {
        // Create a user with only the system.create-sectors permission
        $systemUser = User::factory()->create(['name' => 'System Create User']);
        
        // First ensure the permission exists
        Permission::firstOrCreate([
            'name' => 'system.create-sectors',
            'guard_name' => 'web'
        ]);
        
        $systemUser->givePermissionTo('system.create-sectors');

        $response = $this->actingAs($systemUser)
            ->post(route('asset-hierarchy.sectors.store'), [
                'name' => 'System Created Sector',
                'area_id' => $this->area->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sectors', ['name' => 'System Created Sector']);
    }

    public function test_permissions_are_created_by_observer_when_sector_is_created()
    {
        // Act as admin to create a new sector
        $this->actingAs($this->admin);
        
        $newSector = Sector::factory()->create([
            'name' => 'Observer Test Sector',
            'area_id' => $this->area->id
        ]);

        // Check that permissions were created by the observer
        $this->assertDatabaseHas('permissions', ['name' => "sectors.view.{$newSector->id}"]);
        $this->assertDatabaseHas('permissions', ['name' => "sectors.update.{$newSector->id}"]);
        $this->assertDatabaseHas('permissions', ['name' => "sectors.delete.{$newSector->id}"]);
        $this->assertDatabaseHas('permissions', ['name' => "users.invite.sector.{$newSector->id}"]);
        $this->assertDatabaseHas('permissions', ['name' => "assets.viewAny.sector.{$newSector->id}"]);
        $this->assertDatabaseHas('permissions', ['name' => "assets.create.sector.{$newSector->id}"]);
        $this->assertDatabaseHas('permissions', ['name' => "assets.manage.sector.{$newSector->id}"]);
        $this->assertDatabaseHas('permissions', ['name' => "assets.execute-routines.sector.{$newSector->id}"]);
        $this->assertDatabaseHas('permissions', ['name' => "assets.export.sector.{$newSector->id}"]);
    }

    public function test_permissions_are_deleted_when_sector_is_deleted()
    {
        // Create a sector to be deleted
        $deletableSector = Sector::factory()->create([
            'name' => 'To Be Deleted',
            'area_id' => $this->area->id
        ]);

        // Verify permissions exist
        $this->assertDatabaseHas('permissions', ['name' => "sectors.view.{$deletableSector->id}"]);

        // Delete the sector
        $this->actingAs($this->admin);
        $deletableSector->delete();

        // Verify permissions were deleted by the observer
        $this->assertDatabaseMissing('permissions', ['name' => "sectors.view.{$deletableSector->id}"]);
        $this->assertDatabaseMissing('permissions', ['name' => "sectors.update.{$deletableSector->id}"]);
        $this->assertDatabaseMissing('permissions', ['name' => "sectors.delete.{$deletableSector->id}"]);
    }
} 
<?php

namespace Tests\Feature\Permission;

use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssetPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $userWithPermission;
    protected User $userWithoutPermission;
    protected Plant $plant;
    protected Area $area;
    protected Sector $sector;
    protected Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin user first
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Administrator');

        // Act as admin when creating hierarchy to ensure audit logs have a user_id
        $this->actingAs($this->admin);

        // Create hierarchy
        $this->plant = Plant::factory()->create();
        $this->area = Area::factory()->create(['plant_id' => $this->plant->id]);
        $this->sector = Sector::factory()->create(['area_id' => $this->area->id]);
        $this->asset = Asset::factory()->create([
            'plant_id' => $this->plant->id,
            'area_id' => $this->area->id,
            'sector_id' => $this->sector->id,
        ]);

        // Create user with permission
        $this->userWithPermission = User::factory()->create();
        // The permission was already created by PlantObserver when the plant was created
        $this->userWithPermission->givePermissionTo("assets.viewAny.plant.{$this->plant->id}");

        // Create user without permission
        $this->userWithoutPermission = User::factory()->create();
    }

    public function test_user_without_permission_cannot_view_asset_list()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->get(route('asset-hierarchy.assets'));

        $response->assertStatus(403);
    }

    public function test_user_with_permission_can_view_asset_list()
    {
        $response = $this->actingAs($this->userWithPermission)
            ->get(route('asset-hierarchy.assets'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/assets/index')
            ->has('asset.data', 1) // Should only see the one asset in their plant
        );
    }

    public function test_admin_can_view_all_assets()
    {
        // Act as admin when creating plants to ensure audit logs have a user_id
        $this->actingAs($this->admin);
        
        // Create another asset in a different plant
        $otherPlant = Plant::factory()->create();
        $otherArea = Area::factory()->create(['plant_id' => $otherPlant->id]);
        $otherSector = Sector::factory()->create(['area_id' => $otherArea->id]);
        $otherAsset = Asset::factory()->create([
            'plant_id' => $otherPlant->id,
            'area_id' => $otherArea->id,
            'sector_id' => $otherSector->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('asset-hierarchy.assets'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/assets/index')
            ->has('asset.data', 2) // Admin should see both assets
        );
    }

    public function test_user_without_permission_cannot_view_specific_asset()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->get(route('asset-hierarchy.assets.show', $this->asset));

        $response->assertStatus(403);
    }

    public function test_user_with_permission_can_view_specific_asset()
    {
        $response = $this->actingAs($this->userWithPermission)
            ->get(route('asset-hierarchy.assets.show', $this->asset));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/assets/show')
            ->has('asset')
        );
    }

    public function test_user_without_permission_cannot_report_runtime()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->post(route('asset-hierarchy.assets.runtime.report', $this->asset), [
                'reported_hours' => 100,
            ]);

        $response->assertStatus(403);
    }

    public function test_user_with_execute_permission_can_report_runtime()
    {
        // Give execute permission (already created by the system when plant was created)
        $this->userWithPermission->givePermissionTo("assets.execute-routines.plant.{$this->plant->id}");

        $response = $this->actingAs($this->userWithPermission)
            ->post(route('asset-hierarchy.assets.runtime.report', $this->asset), [
                'reported_hours' => 100,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Horímetro reportado com sucesso',
        ]);
    }

    public function test_asset_list_filters_by_user_permissions()
    {
        // Create assets in different sectors
        $otherSector = Sector::factory()->create(['area_id' => $this->area->id]);
        $assetInOtherSector = Asset::factory()->create([
            'plant_id' => $this->plant->id,
            'area_id' => $this->area->id,
            'sector_id' => $otherSector->id,
        ]);

        // Give user permission to only one sector
        $userWithSectorPermission = User::factory()->create();
        // Use the sector-level permission that was already created by the system
        $userWithSectorPermission->givePermissionTo("assets.viewAny.sector.{$this->sector->id}");

        $response = $this->actingAs($userWithSectorPermission)
            ->get(route('asset-hierarchy.assets'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('asset-hierarchy/assets/index')
            ->has('asset.data', 1) // Should only see asset in their sector
            ->where('asset.data.0.id', $this->asset->id)
        );
    }

    public function test_user_without_create_permission_cannot_create_asset()
    {
        $response = $this->actingAs($this->userWithoutPermission)
            ->post(route('asset-hierarchy.assets.store'), [
                'tag' => 'TEST-001',
                'plant_id' => $this->plant->id,
                'area_id' => $this->area->id,
                'sector_id' => $this->sector->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_sector_manager_can_create_asset_in_their_sector()
    {
        // Give user sector-level create permission
        $sectorManager = User::factory()->create();
        $sectorManager->givePermissionTo("assets.create.sector.{$this->sector->id}");

        $response = $this->actingAs($sectorManager)
            ->post(route('asset-hierarchy.assets.store'), [
                'tag' => 'TEST-001',
                'plant_id' => $this->plant->id,
                'area_id' => $this->area->id,
                'sector_id' => $this->sector->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('assets', [
            'tag' => 'TEST-001',
            'sector_id' => $this->sector->id,
        ]);
    }

    public function test_area_manager_can_create_asset_in_their_area()
    {
        // Give user area-level create permission
        $areaManager = User::factory()->create();
        $areaManager->givePermissionTo("assets.create.area.{$this->area->id}");

        $response = $this->actingAs($areaManager)
            ->post(route('asset-hierarchy.assets.store'), [
                'tag' => 'TEST-002',
                'plant_id' => $this->plant->id,
                'area_id' => $this->area->id,
                'sector_id' => $this->sector->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('assets', [
            'tag' => 'TEST-002',
            'area_id' => $this->area->id,
        ]);
    }

    public function test_plant_manager_can_create_asset_in_their_plant()
    {
        // Give user plant-level create permission
        $plantManager = User::factory()->create();
        $plantManager->givePermissionTo("assets.create.plant.{$this->plant->id}");

        $response = $this->actingAs($plantManager)
            ->post(route('asset-hierarchy.assets.store'), [
                'tag' => 'TEST-003',
                'plant_id' => $this->plant->id,
                'area_id' => $this->area->id,
                'sector_id' => $this->sector->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('assets', [
            'tag' => 'TEST-003',
            'plant_id' => $this->plant->id,
        ]);
    }

    public function test_user_with_manage_permission_can_create_asset()
    {
        // Give user manage permission (which includes create)
        $manager = User::factory()->create();
        $manager->givePermissionTo("assets.manage.sector.{$this->sector->id}");

        $response = $this->actingAs($manager)
            ->post(route('asset-hierarchy.assets.store'), [
                'tag' => 'TEST-004',
                'plant_id' => $this->plant->id,
                'area_id' => $this->area->id,
                'sector_id' => $this->sector->id,
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('assets', [
            'tag' => 'TEST-004',
            'sector_id' => $this->sector->id,
        ]);
    }

    public function test_user_cannot_create_asset_in_different_sector()
    {
        // Create another sector
        $otherSector = Sector::factory()->create(['area_id' => $this->area->id]);

        // Give user permission only for the first sector
        $sectorManager = User::factory()->create();
        $sectorManager->givePermissionTo("assets.create.sector.{$this->sector->id}");

        // Try to create asset in the other sector
        $response = $this->actingAs($sectorManager)
            ->post(route('asset-hierarchy.assets.store'), [
                'tag' => 'TEST-005',
                'plant_id' => $this->plant->id,
                'area_id' => $this->area->id,
                'sector_id' => $otherSector->id,
            ]);

        $response->assertStatus(403);
    }
} 
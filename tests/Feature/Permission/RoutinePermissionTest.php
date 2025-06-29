<?php

namespace Tests\Feature\Permission;

use Tests\TestCase;
use App\Models\User;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Sector;
use App\Models\Maintenance\Routine;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RoutinePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $plantManager;
    protected User $technician;
    protected Plant $plant;
    protected Area $area;
    protected Sector $sector;
    protected Asset $asset;
    protected Routine $routine;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin (first user is automatically admin)
        $this->admin = User::factory()->create();

        // Authenticate as admin to create hierarchy (to avoid audit log issues)
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
        $this->routine = Routine::factory()->create(['asset_id' => $this->asset->id]);

        // Create users with specific permissions
        $this->plantManager = User::factory()->create();
        // Use the permission that was already created by PlantObserver
        $this->plantManager->givePermissionTo("assets.manage.plant.{$this->plant->id}");

        $this->technician = User::factory()->create();
        // Use the permission that was already created by PlantObserver
        $this->technician->givePermissionTo("assets.execute-routines.plant.{$this->plant->id}");

        // Clear authentication after setup
        auth()->logout();
    }

    public function test_admin_can_manage_routines()
    {
        $response = $this->actingAs($this->admin)
            ->post(route('maintenance.assets.routines.store', $this->asset), [
                'name' => 'Test Routine',
                'trigger_hours' => 24,
                'description' => 'Test description'
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('routines', [
            'name' => 'Test Routine',
            'asset_id' => $this->asset->id
        ]);
    }

    public function test_plant_manager_can_manage_routines()
    {
        $response = $this->actingAs($this->plantManager)
            ->post(route('maintenance.assets.routines.store', $this->asset), [
                'name' => 'Test Routine',
                'trigger_hours' => 24,
                'description' => 'Test description'
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('routines', [
            'name' => 'Test Routine',
            'asset_id' => $this->asset->id
        ]);
    }

    public function test_technician_cannot_manage_routines()
    {
        $response = $this->actingAs($this->technician)
            ->post(route('maintenance.assets.routines.store', $this->asset), [
                'name' => 'Test Routine',
                'trigger_hours' => 24,
                'description' => 'Test description'
            ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('routines', [
            'name' => 'Test Routine',
            'asset_id' => $this->asset->id
        ]);
    }

    public function test_technician_can_execute_routines()
    {
        // This test verifies that a technician with execute-routines permission
        // can execute routines. However, since routine execution requires form
        // responses and we're testing permissions (not the execution flow),
        // we'll test the authorization directly.
        
        // Verify the technician has the correct permission
        $this->assertTrue($this->technician->hasPermissionTo("assets.execute-routines.plant.{$this->plant->id}"));
        
        // Verify the technician can execute routines on this asset
        $this->assertTrue($this->technician->can('execute-routines', $this->asset));
    }

    public function test_user_without_permissions_cannot_execute_routines()
    {
        $unauthorizedUser = User::factory()->create();

        $response = $this->actingAs($unauthorizedUser)
            ->post(route('maintenance.assets.routines.executions.store', [$this->asset, $this->routine]));

        $response->assertForbidden();
        $this->assertDatabaseMissing('routine_executions', [
            'routine_id' => $this->routine->id,
            'executed_by' => $unauthorizedUser->id
        ]);
    }

    public function test_no_separate_routine_permissions_are_created()
    {
        // Verify that no routine-specific permissions exist in the database
        $this->assertDatabaseMissing('permissions', [
            'name' => 'routines.viewAny.plant.' . $this->plant->id
        ]);
        $this->assertDatabaseMissing('permissions', [
            'name' => 'routines.create.plant.' . $this->plant->id
        ]);
        $this->assertDatabaseMissing('permissions', [
            'name' => 'routines.update.plant.' . $this->plant->id
        ]);
        $this->assertDatabaseMissing('permissions', [
            'name' => 'routines.delete.plant.' . $this->plant->id
        ]);
        $this->assertDatabaseMissing('permissions', [
            'name' => 'routines.execute.plant.' . $this->plant->id
        ]);
    }

    public function test_asset_permissions_control_routine_access()
    {
        // Create a user with only asset view permission
        $viewer = User::factory()->create();
        // Use the permission that was already created by PlantObserver
        $viewer->givePermissionTo("assets.viewAny.plant.{$this->plant->id}");

        // Viewer can view routine data
        $response = $this->actingAs($viewer)
            ->get(route('maintenance.routines.form-data', $this->routine));
        $response->assertSuccessful();

        // But cannot manage routines
        $response = $this->actingAs($viewer)
            ->put(route('maintenance.assets.routines.update', [$this->asset, $this->routine]), [
                'name' => 'Updated Routine',
                'trigger_hours' => 48,
                'status' => 'Active',
                'description' => 'Updated description'
            ]);
        $response->assertForbidden();
    }
} 
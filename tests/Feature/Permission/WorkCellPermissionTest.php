<?php

namespace Tests\Feature\Permission;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Production\WorkCell;
use Illuminate\Foundation\Testing\RefreshDatabase;

class WorkCellPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $plantManager;
    protected User $maintenanceSupervisor;
    protected User $planner;
    protected User $technician;
    protected User $viewer;
    protected WorkCell $workCell;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles
        $plantManagerRole = Role::where('name', 'Plant Manager')->first();
        $maintenanceSupervisorRole = Role::where('name', 'Maintenance Supervisor')->first();
        $plannerRole = Role::where('name', 'Planner')->first();
        $technicianRole = Role::where('name', 'Technician')->first();
        $viewerRole = Role::where('name', 'Viewer')->first();

        // Create users with roles
        $this->plantManager = User::factory()->create();
        $this->plantManager->assignRole($plantManagerRole);

        $this->maintenanceSupervisor = User::factory()->create();
        $this->maintenanceSupervisor->assignRole($maintenanceSupervisorRole);

        $this->planner = User::factory()->create();
        $this->planner->assignRole($plannerRole);

        $this->technician = User::factory()->create();
        $this->technician->assignRole($technicianRole);

        $this->viewer = User::factory()->create();
        $this->viewer->assignRole($viewerRole);

        // Create test work cell
        $this->workCell = WorkCell::factory()->create();
    }

    public function test_plant_manager_can_manage_work_cells()
    {
        $this->actingAs($this->plantManager)
            ->get(route('production.work-cells.index'))
            ->assertOk();

        $this->actingAs($this->plantManager)
            ->get(route('production.work-cells.show', $this->workCell))
            ->assertOk();

        $data = [
            'name' => 'New Work Cell',
            'cell_type' => 'internal',
            'available_hours_per_day' => '8',
            'efficiency_percentage' => '85',
            'is_active' => true,
        ];

        $this->actingAs($this->plantManager)
            ->post(route('production.work-cells.store'), $data)
            ->assertRedirect();

        $newWorkCell = WorkCell::where('name', 'New Work Cell')->first();
        $this->assertNotNull($newWorkCell);

        $this->actingAs($this->plantManager)
            ->put(route('production.work-cells.update', $this->workCell), [
                'name' => 'Updated Cell',
                'cell_type' => $this->workCell->cell_type,
                'available_hours_per_day' => '10',
                'efficiency_percentage' => '90',
                'is_active' => true,
            ])
            ->assertRedirect();

        $this->actingAs($this->plantManager)
            ->delete(route('production.work-cells.destroy', $newWorkCell))
            ->assertRedirect();
    }

    public function test_maintenance_supervisor_can_manage_work_cells()
    {
        $this->actingAs($this->maintenanceSupervisor)
            ->get(route('production.work-cells.index'))
            ->assertOk();

        $this->actingAs($this->maintenanceSupervisor)
            ->get(route('production.work-cells.show', $this->workCell))
            ->assertOk();

        $data = [
            'name' => 'Supervisor Work Cell',
            'cell_type' => 'internal',
            'available_hours_per_day' => '8',
            'efficiency_percentage' => '85',
            'is_active' => true,
        ];

        $this->actingAs($this->maintenanceSupervisor)
            ->post(route('production.work-cells.store'), $data)
            ->assertRedirect();

        $this->actingAs($this->maintenanceSupervisor)
            ->put(route('production.work-cells.update', $this->workCell), [
                'name' => 'Updated by Supervisor',
                'cell_type' => $this->workCell->cell_type,
                'available_hours_per_day' => '10',
                'efficiency_percentage' => '90',
                'is_active' => true,
            ])
            ->assertRedirect();

        $newWorkCell = WorkCell::where('name', 'Supervisor Work Cell')->first();
        $this->actingAs($this->maintenanceSupervisor)
            ->delete(route('production.work-cells.destroy', $newWorkCell))
            ->assertRedirect();
    }

    public function test_planner_can_only_view_work_cells()
    {
        $this->actingAs($this->planner)
            ->get(route('production.work-cells.index'))
            ->assertOk();

        $this->actingAs($this->planner)
            ->get(route('production.work-cells.show', $this->workCell))
            ->assertOk();

        $data = [
            'name' => 'Planner Cell',
            'cell_type' => 'internal',
            'available_hours_per_day' => '8',
            'efficiency_percentage' => '85',
            'is_active' => true,
        ];

        $this->actingAs($this->planner)
            ->post(route('production.work-cells.store'), $data)
            ->assertForbidden();

        $this->actingAs($this->planner)
            ->put(route('production.work-cells.update', $this->workCell), $data)
            ->assertForbidden();

        $this->actingAs($this->planner)
            ->delete(route('production.work-cells.destroy', $this->workCell))
            ->assertForbidden();
    }

    public function test_technician_can_only_view_work_cells()
    {
        $this->actingAs($this->technician)
            ->get(route('production.work-cells.index'))
            ->assertOk();

        $this->actingAs($this->technician)
            ->get(route('production.work-cells.show', $this->workCell))
            ->assertOk();

        $data = [
            'name' => 'Technician Cell',
            'cell_type' => 'internal',
            'available_hours_per_day' => '8',
            'efficiency_percentage' => '85',
            'is_active' => true,
        ];

        $this->actingAs($this->technician)
            ->post(route('production.work-cells.store'), $data)
            ->assertForbidden();

        $this->actingAs($this->technician)
            ->put(route('production.work-cells.update', $this->workCell), $data)
            ->assertForbidden();

        $this->actingAs($this->technician)
            ->delete(route('production.work-cells.destroy', $this->workCell))
            ->assertForbidden();
    }

    public function test_viewer_can_only_view_work_cells()
    {
        $this->actingAs($this->viewer)
            ->get(route('production.work-cells.index'))
            ->assertOk();

        $this->actingAs($this->viewer)
            ->get(route('production.work-cells.show', $this->workCell))
            ->assertOk();

        $data = [
            'name' => 'Viewer Cell',
            'cell_type' => 'internal',
            'available_hours_per_day' => '8',
            'efficiency_percentage' => '85',
            'is_active' => true,
        ];

        $this->actingAs($this->viewer)
            ->post(route('production.work-cells.store'), $data)
            ->assertForbidden();

        $this->actingAs($this->viewer)
            ->put(route('production.work-cells.update', $this->workCell), $data)
            ->assertForbidden();

        $this->actingAs($this->viewer)
            ->delete(route('production.work-cells.destroy', $this->workCell))
            ->assertForbidden();
    }

    public function test_user_without_any_permission_cannot_access_work_cells()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('production.work-cells.index'))
            ->assertForbidden();

        $this->actingAs($user)
            ->get(route('production.work-cells.show', $this->workCell))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('production.work-cells.store'), [
                'name' => 'Test Cell',
                'cell_type' => 'internal',
                'available_hours_per_day' => '8',
                'efficiency_percentage' => '85',
                'is_active' => true,
            ])
            ->assertForbidden();

        $this->actingAs($user)
            ->put(route('production.work-cells.update', $this->workCell), [
                'name' => 'Updated',
                'cell_type' => 'internal',
                'available_hours_per_day' => '8',
                'efficiency_percentage' => '85',
                'is_active' => true,
            ])
            ->assertForbidden();

        $this->actingAs($user)
            ->delete(route('production.work-cells.destroy', $this->workCell))
            ->assertForbidden();
    }
}
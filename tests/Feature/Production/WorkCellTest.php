<?php

namespace Tests\Feature\Production;

use Tests\TestCase;
use App\Models\User;
use App\Models\Production\WorkCell;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use App\Models\AssetHierarchy\Manufacturer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;

class WorkCellTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Plant $plant;
    protected Area $area;
    protected Shift $shift;
    protected Manufacturer $manufacturer;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin user with permissions
        $this->admin = User::factory()->create();
        $this->admin->givePermissionTo([
            'production.work-cells.viewAny',
            'production.work-cells.view',
            'production.work-cells.create',
            'production.work-cells.update',
            'production.work-cells.delete',
        ]);

        // Create test data
        $this->plant = Plant::factory()->create();
        $this->area = Area::factory()->create(['plant_id' => $this->plant->id]);
        $this->shift = Shift::factory()->create();
        $this->manufacturer = Manufacturer::factory()->create();
    }

    public function test_can_list_work_cells()
    {
        $workCells = WorkCell::factory()->count(3)->create();

        $this->actingAs($this->admin)
            ->get(route('production.work-cells.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('production/work-cells/index')
                ->has('workCells.data', 3)
                ->has('filters')
                ->has('plants')
                ->has('shifts')
                ->has('manufacturers')
            );
    }

    public function test_can_create_internal_work_cell()
    {
        $data = [
            'name' => 'Test Work Cell',
            'description' => 'Test description',
            'cell_type' => 'internal',
            'available_hours_per_day' => '8',
            'efficiency_percentage' => '85',
            'shift_id' => $this->shift->id,
            'plant_id' => $this->plant->id,
            'area_id' => $this->area->id,
            'is_active' => true,
        ];

        $this->actingAs($this->admin)
            ->post(route('production.work-cells.store'), $data)
            ->assertRedirect();

        $this->assertDatabaseHas('work_cells', [
            'name' => 'Test Work Cell',
            'cell_type' => 'internal',
            'plant_id' => $this->plant->id,
        ]);
    }

    public function test_can_create_external_work_cell()
    {
        $data = [
            'name' => 'External Work Cell',
            'description' => 'External cell description',
            'cell_type' => 'external',
            'available_hours_per_day' => '10',
            'efficiency_percentage' => '90',
            'shift_id' => $this->shift->id,
            'manufacturer_id' => $this->manufacturer->id,
            'is_active' => true,
        ];

        $this->actingAs($this->admin)
            ->post(route('production.work-cells.store'), $data)
            ->assertRedirect();

        $this->assertDatabaseHas('work_cells', [
            'name' => 'External Work Cell',
            'cell_type' => 'external',
            'manufacturer_id' => $this->manufacturer->id,
            'plant_id' => null,
        ]);
    }

    public function test_can_show_work_cell()
    {
        $workCell = WorkCell::factory()->create([
            'plant_id' => $this->plant->id,
            'shift_id' => $this->shift->id,
        ]);

        $this->actingAs($this->admin)
            ->get(route('production.work-cells.show', $workCell))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('production/work-cells/show')
                ->has('workCell', fn (AssertableInertia $prop) => $prop
                    ->where('id', $workCell->id)
                    ->where('name', $workCell->name)
                    ->etc()
                )
                ->has('routingSteps')
                ->has('productionSchedules')
                ->has('utilization')
            );
    }

    public function test_can_update_work_cell()
    {
        $workCell = WorkCell::factory()->create();

        $data = [
            'name' => 'Updated Work Cell',
            'description' => 'Updated description',
            'cell_type' => $workCell->cell_type,
            'available_hours_per_day' => '12',
            'efficiency_percentage' => '95',
            'shift_id' => $this->shift->id,
            'is_active' => false,
        ];

        $this->actingAs($this->admin)
            ->put(route('production.work-cells.update', $workCell), $data)
            ->assertRedirect();

        $this->assertDatabaseHas('work_cells', [
            'id' => $workCell->id,
            'name' => 'Updated Work Cell',
            'available_hours_per_day' => 12,
            'efficiency_percentage' => 95,
            'is_active' => false,
        ]);
    }

    public function test_can_delete_work_cell_without_dependencies()
    {
        $workCell = WorkCell::factory()->create();

        $this->actingAs($this->admin)
            ->delete(route('production.work-cells.destroy', $workCell))
            ->assertRedirect(route('production.work-cells.index'));

        $this->assertDatabaseMissing('work_cells', ['id' => $workCell->id]);
    }

    public function test_cannot_delete_work_cell_with_routing_steps()
    {
        $workCell = WorkCell::factory()->hasRoutingSteps(1)->create();

        $this->actingAs($this->admin)
            ->delete(route('production.work-cells.destroy', $workCell))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertDatabaseHas('work_cells', ['id' => $workCell->id]);
    }

    public function test_can_check_dependencies()
    {
        $workCell = WorkCell::factory()->hasRoutingSteps(2)->create();

        $this->actingAs($this->admin)
            ->get(route('production.work-cells.check-dependencies', $workCell))
            ->assertJson([
                'dependencies' => [
                    'routing_steps' => [
                        'count' => 2,
                        'label' => 'Etapas de Roteiro',
                    ],
                ],
            ]);
    }

    public function test_validates_area_belongs_to_plant()
    {
        $otherArea = Area::factory()->create(); // Different plant

        $data = [
            'name' => 'Test Work Cell',
            'cell_type' => 'internal',
            'available_hours_per_day' => '8',
            'efficiency_percentage' => '85',
            'plant_id' => $this->plant->id,
            'area_id' => $otherArea->id, // Area from different plant
            'is_active' => true,
        ];

        $this->actingAs($this->admin)
            ->post(route('production.work-cells.store'), $data)
            ->assertRedirect()
            ->assertSessionHasErrors(['area_id']);
    }

    public function test_requires_manufacturer_for_external_cells()
    {
        $data = [
            'name' => 'External Cell',
            'cell_type' => 'external',
            'available_hours_per_day' => '8',
            'efficiency_percentage' => '85',
            'is_active' => true,
            // Missing manufacturer_id
        ];

        $this->actingAs($this->admin)
            ->post(route('production.work-cells.store'), $data)
            ->assertRedirect()
            ->assertSessionHasErrors(['manufacturer_id']);
    }

    public function test_user_without_permission_cannot_access_work_cells()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('production.work-cells.index'))
            ->assertForbidden();
    }
}
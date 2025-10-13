<?php

namespace Tests\Feature\Scheduling;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Models\Production\WorkCellItemRate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimeParameterValidationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected WorkCell $workCell;
    protected Item $item;
    protected ManufacturingOrder $order;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        // Manufacturing orders and routes are the relevant permissions
        $this->user->givePermissionTo('production.orders.viewAny');
        $this->user->givePermissionTo('production.orders.view');
        $this->user->givePermissionTo('production.orders.update');
        $this->user->givePermissionTo('production.routes.create');

        $this->workCell = WorkCell::factory()->create();
        $this->item = Item::factory()->create();
        $this->order = ManufacturingOrder::factory()->create(['item_id' => $this->item->id]);
    }

    public function test_validate_time_parameters_endpoint_requires_authentication()
    {
        $response = $this->postJson(route('production.scheduler.validate-time-parameters'), [
            'manufacturing_order_ids' => [$this->order->id],
        ]);

        $response->assertUnauthorized();
    }

    public function test_validate_time_parameters_with_missing_route()
    {
        $this->actingAs($this->user);

        $response = $this->postJson(route('production.scheduler.validate-time-parameters'), [
            'manufacturing_order_ids' => [$this->order->id],
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertEquals('missing', $data[0]['time_parameter_status']);
        $this->assertEquals('missing_route', $data[0]['issues'][0]['type']);
    }

    public function test_validate_time_parameters_with_step_times()
    {
        $this->actingAs($this->user);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $this->order->id,
        ]);

        $step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell->id,
            'setup_time_minutes' => 30,
            'cycle_time_minutes' => 5,
        ]);

        $response = $this->postJson(route('production.scheduler.validate-time-parameters'), [
            'manufacturing_order_ids' => [$this->order->id],
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertEquals('valid', $data[0]['time_parameter_status']);
        $this->assertEquals('step', $data[0]['steps'][0]['effective_time_source']);
        $this->assertEquals(30, $data[0]['steps'][0]['effective_setup_time']);
        $this->assertEquals(5, $data[0]['steps'][0]['effective_cycle_time']);
    }

    public function test_validate_time_parameters_with_work_cell_rates()
    {
        $this->actingAs($this->user);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $this->order->id,
        ]);

        $step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell->id,
            'setup_time_minutes' => null,
            'cycle_time_minutes' => null,
        ]);

        WorkCellItemRate::create([
            'work_cell_id' => $this->workCell->id,
            'item_id' => $this->item->id,
            'setup_time_minutes' => 20,
            'production_rate_per_hour' => 12, // 5 minutes per piece
            'unit_of_measure' => 'pieces',
        ]);

        $response = $this->postJson(route('production.scheduler.validate-time-parameters'), [
            'manufacturing_order_ids' => [$this->order->id],
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertEquals('valid', $data[0]['time_parameter_status']);
        $this->assertEquals('work_cell', $data[0]['steps'][0]['effective_time_source']);
        $this->assertEquals(20, $data[0]['steps'][0]['effective_setup_time']);
        $this->assertEquals(5, $data[0]['steps'][0]['effective_cycle_time']);
    }

    public function test_validate_time_parameters_with_partial_configuration()
    {
        $this->actingAs($this->user);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $this->order->id,
        ]);

        // First step has times
        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell->id,
            'setup_time_minutes' => 30,
            'cycle_time_minutes' => 5,
            'sequence' => 1,
        ]);

        // Second step has no times
        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell->id,
            'setup_time_minutes' => null,
            'cycle_time_minutes' => null,
            'sequence' => 2,
        ]);

        $response = $this->postJson(route('production.scheduler.validate-time-parameters'), [
            'manufacturing_order_ids' => [$this->order->id],
        ]);

        $response->assertOk();
        $data = $response->json();

        $this->assertEquals('partial', $data[0]['time_parameter_status']);
        $this->assertCount(1, $data[0]['issues']);
        $this->assertEquals('missing_time', $data[0]['issues'][0]['type']);
    }

    public function test_update_step_time_parameters()
    {
        $this->actingAs($this->user);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $this->order->id,
        ]);

        $step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'setup_time_minutes' => null,
            'cycle_time_minutes' => null,
        ]);

        $response = $this->patchJson(route('production.steps.update-time', $step->id), [
            'setup_time_minutes' => 45,
            'cycle_time_minutes' => 8.5,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Step time parameters updated successfully');

        $step->refresh();
        $this->assertEquals(45, $step->setup_time_minutes);
        $this->assertEquals(8.5, $step->cycle_time_minutes);
    }

    public function test_update_work_cell_rate()
    {
        $this->actingAs($this->user);
        $this->user->givePermissionTo('production.work-cells.update');

        $response = $this->postJson(route('production.work-cells.update-rate', $this->workCell->id), [
            'item_id' => $this->item->id,
            'setup_time_minutes' => 25,
            'production_rate_per_hour' => 15,
            'unit_of_measure' => 'pieces',
            'notes' => 'Updated rate for testing',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Work cell production rate updated successfully');

        $rate = WorkCellItemRate::where('work_cell_id', $this->workCell->id)
            ->where('item_id', $this->item->id)
            ->first();

        $this->assertNotNull($rate);
        $this->assertEquals(25, $rate->setup_time_minutes);
        $this->assertEquals(15, $rate->production_rate_per_hour);
        $this->assertEquals('pieces', $rate->unit_of_measure);
        $this->assertEquals('Updated rate for testing', $rate->notes);
    }

    public function test_update_existing_work_cell_rate()
    {
        $this->actingAs($this->user);
        $this->user->givePermissionTo('production.work-cells.update');

        // Create existing rate
        $existingRate = WorkCellItemRate::create([
            'work_cell_id' => $this->workCell->id,
            'item_id' => $this->item->id,
            'setup_time_minutes' => 20,
            'production_rate_per_hour' => 10,
            'unit_of_measure' => 'pieces',
        ]);

        $response = $this->postJson(route('production.work-cells.update-rate', $this->workCell->id), [
            'item_id' => $this->item->id,
            'setup_time_minutes' => 30,
            'production_rate_per_hour' => 20,
            'unit_of_measure' => 'units',
            'notes' => 'Rate updated',
        ]);

        $response->assertRedirect();

        $existingRate->refresh();
        $this->assertEquals(30, $existingRate->setup_time_minutes);
        $this->assertEquals(20, $existingRate->production_rate_per_hour);
        $this->assertEquals('units', $existingRate->unit_of_measure);
        $this->assertEquals('Rate updated', $existingRate->notes);
    }

    public function test_prepare_scheduling_page_loads()
    {
        $this->markTestSkipped('Skipping until Inertia page is created');

        $this->actingAs($this->user);

        $response = $this->get(route('production.scheduler.prepare'));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page
                ->component('Production/Scheduler/Prepare')
                ->has('algorithms')
                ->has('currentVersion')
                ->has('workCells')
                ->has('defaultStartDate')
        );
    }
}

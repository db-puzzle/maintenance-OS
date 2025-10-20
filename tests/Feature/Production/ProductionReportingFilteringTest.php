<?php

namespace Tests\Feature\Production;

use App\Models\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\UnitOfMeasure;
use App\Models\Production\WorkCell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductionReportingFilteringTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected WorkCell $workCellA;
    protected WorkCell $workCellB;
    protected WorkCell $workCellC;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin user (first user becomes admin automatically)
        $this->user = User::factory()->create();

        // Create required units of measure
        UnitOfMeasure::create(['code' => 'PC', 'name' => 'Piece', 'uom_type' => 'COUNT']);
        UnitOfMeasure::create(['code' => 'KG', 'name' => 'Kilogram', 'uom_type' => 'MASS']);
        UnitOfMeasure::create(['code' => 'L', 'name' => 'Liter', 'uom_type' => 'VOLUME']);
        UnitOfMeasure::create(['code' => 'M', 'name' => 'Meter', 'uom_type' => 'LENGTH']);

        // Create work cells using factory defaults
        $this->workCellA = WorkCell::factory()->create(['name' => 'Work Cell A']);
        $this->workCellB = WorkCell::factory()->create(['name' => 'Work Cell B']);
        $this->workCellC = WorkCell::factory()->create(['name' => 'Work Cell C']);
    }

    /** @test */
    public function it_only_shows_orders_with_steps_ready_for_selected_work_cell()
    {
        // Create MO with route: Step 1 (Cell A) -> Step 2 (Cell B) -> Step 3 (Cell C)
        $item = Item::factory()->create();
        $order = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'released',
            'quantity' => 100,
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $item->id,
        ]);

        // Step 1 at Work Cell A (pending)
        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCellA->id,
            'display_order' => 1,
            'status' => 'pending',
            'dependency_start_condition' => 'completed',
        ]);

        // Step 2 at Work Cell B (depends on step 1 completion)
        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCellB->id,
            'display_order' => 2,
            'status' => 'pending',
            'depends_on_step_id' => $step1->id,
            'dependency_start_condition' => 'completed',
        ]);

        // Step 3 at Work Cell C (depends on step 2 completion)
        $step3 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCellC->id,
            'display_order' => 3,
            'status' => 'pending',
            'depends_on_step_id' => $step2->id,
            'dependency_start_condition' => 'completed',
        ]);

        // Filter by Work Cell A - should show the order (step 1 is ready)
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellA->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.data.0.id', $order->id)
                ->where('orders.total', 1)
        );

        // Filter by Work Cell B - should NOT show the order (step 1 not completed)
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellB->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.total', 0)
        );

        // Complete step 1
        $step1->update(['status' => 'completed']);

        // Now Work Cell B should show the order
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellB->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.data.0.id', $order->id)
                ->where('orders.total', 1)
        );

        // Work Cell C should still not show the order
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellC->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.total', 0)
        );
    }

    /** @test */
    public function it_respects_progressive_flow_dependencies()
    {
        // Create MO with progressive flow
        $item = Item::factory()->create();
        $order = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'released',
            'quantity' => 100,
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $item->id,
        ]);

        // Step 1 at Work Cell A
        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCellA->id,
            'display_order' => 1,
            'status' => 'in_progress',
            'cumulative_quantity_completed' => 30,
        ]);

        // Step 2 at Work Cell B - can start after 50 units from step 1
        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCellB->id,
            'display_order' => 2,
            'status' => 'pending',
            'depends_on_step_id' => $step1->id,
            'dependency_start_condition' => 'quantity_based',
            'dependency_minimum_quantity' => 50,
        ]);

        // Work Cell B should NOT show the order yet (only 30 units completed)
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellB->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.total', 0)
        );

        // Update step 1 to have 50 units completed
        $step1->update(['cumulative_quantity_completed' => 50]);

        // Now Work Cell B should show the order
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellB->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.data.0.id', $order->id)
                ->where('orders.total', 1)
        );
    }

    /** @test */
    public function it_respects_child_order_dependencies()
    {
        // Create parent and child orders
        $parentItem = Item::factory()->create();
        $childItem = Item::factory()->create();

        $parentOrder = ManufacturingOrder::factory()->create([
            'item_id' => $parentItem->id,
            'status' => 'released',
            'quantity' => 10,
        ]);

        $childOrder1 = ManufacturingOrder::factory()->create([
            'item_id' => $childItem->id,
            'parent_id' => $parentOrder->id,
            'status' => 'in_progress',
            'quantity' => 100,
            'quantity_completed' => 50,
        ]);

        $childOrder2 = ManufacturingOrder::factory()->create([
            'item_id' => $childItem->id,
            'parent_id' => $parentOrder->id,
            'status' => 'in_progress',
            'quantity' => 100,
            'quantity_completed' => 30,
        ]);

        $parentRoute = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $parentOrder->id,
            'item_id' => $parentItem->id,
        ]);

        // Parent step that requires minimum 40 units from children
        $parentStep = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $parentRoute->id,
            'work_cell_id' => $this->workCellA->id,
            'display_order' => 1,
            'status' => 'pending',
            'child_order_dependency_type' => 'children_quantity',
            'child_order_minimum_quantity' => 40,
        ]);

        // Should NOT show parent order yet (min completed is 30)
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellA->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.total', 0)
        );

        // Update child 2 to have 40 units completed
        $childOrder2->update(['quantity_completed' => 40]);

        // Now should show parent order
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellA->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.data.0.id', $parentOrder->id)
                ->where('orders.total', 1)
        );
    }

    /** @test */
    public function it_shows_correct_current_step_for_work_cell()
    {
        // Create MO with multiple steps at same work cell
        $item = Item::factory()->create();
        $order = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'released',
            'quantity' => 100,
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $item->id,
        ]);

        // Step 1 at Work Cell A
        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCellA->id,
            'display_order' => 1,
            'status' => 'completed',
            'name' => 'First Step at A',
        ]);

        // Step 2 at Work Cell B
        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCellB->id,
            'display_order' => 2,
            'status' => 'in_progress',
            'name' => 'Step at B',
        ]);

        // Step 3 at Work Cell A again
        $step3 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCellA->id,
            'display_order' => 3,
            'status' => 'pending',
            'name' => 'Second Step at A',
            'depends_on_step_id' => $step2->id,
        ]);

        // When filtered by Work Cell A, should NOT show order (step 2 at B is blocking)
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellA->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.total', 0)
        );

        // When filtered by Work Cell B, should show order with step 2 as current
        $response = $this->actingAs($this->user)
            ->get(route('production.reporting.index', ['work_cell_id' => $this->workCellB->id]));

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page->where('orders.data.0.id', $order->id)
                ->where('orders.data.0.current_step.name', 'Step at B')
                ->where('orders.total', 1)
        );
    }
}

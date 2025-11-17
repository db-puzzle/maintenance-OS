<?php

namespace Tests\Feature\Production;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use App\Models\Production\UnitOfMeasure;
use App\Models\Production\WorkCell;
use App\Models\User;
use App\Services\Production\ManufacturingStepExecutionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Test the complete step completion flow including:
 * - Step execution completion
 * - Manufacturing order status updates
 * - Parent order notifications
 * - Step dependency queuing
 */
class StepCompletionFlowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test complete flow from step execution to parent notification.
     *
     * This tests the critical path:
     * 1. Step execution completes
     * 2. Manufacturing step is marked complete
     * 3. Manufacturing order status updates to completed
     * 4. Parent order is notified (incrementCompletedChildren)
     * 5. Parent's pending steps are checked and queued
     *
     * @test
     */
    public function it_completes_the_full_chain_from_execution_to_parent_notification(): void
    {
        // Arrange: Create a parent order with one child
        $user = User::factory()->create();
        $workCell = WorkCell::factory()->create();
        $item = Item::factory()->create();
        $uom = UnitOfMeasure::factory()->create(['code' => 'EA', 'name' => 'Each']);

        // Create parent order with one step
        $parentOrder = ManufacturingOrder::factory()->create([
            'status' => 'released',
            'quantity' => 10,
            'unit_of_measure_code' => $uom->code,
            'item_id' => $item->id,
            'child_orders_count' => 1,
            'completed_child_orders_count' => 0,
        ]);

        $parentRoute = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $parentOrder->id,
        ]);

        $parentStep = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $parentRoute->id,
            'status' => 'pending',
            'work_cell_id' => $workCell->id,
            'name' => 'Parent Step',
            'depends_on_child_orders' => true,
            'child_order_dependency_type' => 'all_children_completed',
        ]);

        // Create child order with one step
        $childOrder = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'status' => 'in_progress',
            'quantity' => 5,
            'unit_of_measure_code' => $uom->code,
            'item_id' => $item->id,
        ]);

        $childRoute = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $childOrder->id,
        ]);

        $childStep = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $childRoute->id,
            'status' => 'in_progress',
            'work_cell_id' => $workCell->id,
            'name' => 'Child Step',
        ]);

        $execution = ManufacturingStepExecution::factory()->create([
            'manufacturing_step_id' => $childStep->id,
            'manufacturing_order_id' => $childOrder->id,
            'status' => 'in_progress',
            'work_cell_id' => $workCell->id,
            'executed_by' => $user->id,
            'started_at' => now(),
        ]);

        // Act: Complete the execution using the service
        $service = app(ManufacturingStepExecutionService::class);
        $service->reportProgress($execution, [
            'quantity_completed' => 5,
            'quantity_scrapped' => 0,
            'mark_complete' => true,
        ]);

        // Assert: Check the complete chain
        $execution->refresh();
        $childStep->refresh();
        $childOrder->refresh();
        $parentOrder->refresh();
        $parentStep->refresh();

        // 1. Execution should be completed
        $this->assertEquals('completed', $execution->status);
        $this->assertNotNull($execution->completed_at);

        // 2. Child step should be completed
        $this->assertEquals('completed', $childStep->status);
        $this->assertNotNull($childStep->actual_end_time);

        // 3. Child order should be completed (all steps done)
        $this->assertEquals('completed', $childOrder->status);
        $this->assertNotNull($childOrder->actual_end_date);
        $this->assertEquals(5, $childOrder->quantity_completed);

        // 4. Parent order should be notified
        $this->assertEquals(1, $parentOrder->completed_child_orders_count);

        // 5. Parent step should now be queued (dependencies met)
        $this->assertEquals('queued', $parentStep->status);
    }

    /**
     * Test that MO status updates when last step completes.
     *
     * @test
     */
    public function it_updates_manufacturing_order_status_when_last_step_completes(): void
    {
        // Arrange
        $user = User::factory()->create();
        $workCell = WorkCell::factory()->create();
        $item = Item::factory()->create();
        $uom = UnitOfMeasure::factory()->create(['code' => 'EA', 'name' => 'Each']);

        $order = ManufacturingOrder::factory()->create([
            'status' => 'in_progress',
            'quantity' => 10,
            'unit_of_measure_code' => $uom->code,
            'item_id' => $item->id,
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
        ]);

        $step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'status' => 'in_progress',
            'work_cell_id' => $workCell->id,
        ]);

        $execution = ManufacturingStepExecution::factory()->create([
            'manufacturing_step_id' => $step->id,
            'manufacturing_order_id' => $order->id,
            'status' => 'in_progress',
            'work_cell_id' => $workCell->id,
            'executed_by' => $user->id,
            'started_at' => now(),
        ]);

        // Act
        $service = app(ManufacturingStepExecutionService::class);
        $service->reportProgress($execution, [
            'quantity_completed' => 10,
            'mark_complete' => true,
        ]);

        // Assert
        $order->refresh();
        $this->assertEquals('completed', $order->status);
        $this->assertNotNull($order->actual_end_date);
        $this->assertEquals(10, $order->quantity_completed);
    }

    /**
     * Test observer safety net catches incomplete MO updates.
     *
     * @test
     */
    public function it_observer_safety_net_completes_order_if_service_fails(): void
    {
        // Arrange
        $user = User::factory()->create();
        $workCell = WorkCell::factory()->create();
        $item = Item::factory()->create();
        $uom = UnitOfMeasure::factory()->create(['code' => 'EA', 'name' => 'Each']);

        $order = ManufacturingOrder::factory()->create([
            'status' => 'in_progress',
            'quantity' => 10,
            'unit_of_measure_code' => $uom->code,
            'item_id' => $item->id,
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
        ]);

        $step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'status' => 'in_progress',
            'work_cell_id' => $workCell->id,
        ]);

        $execution = ManufacturingStepExecution::factory()->create([
            'manufacturing_step_id' => $step->id,
            'manufacturing_order_id' => $order->id,
            'status' => 'in_progress',
            'work_cell_id' => $workCell->id,
            'executed_by' => $user->id,
        ]);

        // Act: Directly update execution and step to simulate a failure in the service
        $execution->update(['status' => 'completed', 'completed_at' => now()]);
        $step->update(['status' => 'completed', 'actual_end_time' => now()]);

        // The observer should still catch this and update the order
        $order->refresh();

        // Assert: Observer safety net should have completed the order
        $this->assertEquals('completed', $order->status);
    }

    /**
     * Test incrementCompletedChildren method directly.
     *
     * @test
     */
    public function it_increments_completed_children_count_and_queues_dependent_steps(): void
    {
        // Arrange
        $workCell = WorkCell::factory()->create();
        $item = Item::factory()->create();
        $uom = UnitOfMeasure::factory()->create(['code' => 'EA', 'name' => 'Each']);

        $parentOrder = ManufacturingOrder::factory()->create([
            'status' => 'released',
            'quantity' => 10,
            'unit_of_measure_code' => $uom->code,
            'item_id' => $item->id,
            'child_orders_count' => 2,
            'completed_child_orders_count' => 0,
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $parentOrder->id,
        ]);

        $step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'status' => 'pending',
            'work_cell_id' => $workCell->id,
            'depends_on_child_orders' => true,
            'child_order_dependency_type' => 'all_children_completed',
        ]);

        // Act: Call the method twice to simulate two children completing
        $parentOrder->incrementCompletedChildren();
        $parentOrder->incrementCompletedChildren();

        // Assert
        $parentOrder->refresh();
        $step->refresh();

        $this->assertEquals(2, $parentOrder->completed_child_orders_count);
        $this->assertEquals('queued', $step->status);
    }
}

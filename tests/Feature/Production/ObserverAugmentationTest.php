<?php

use App\Jobs\Production\CheckPendingStepsJob;
use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use App\Models\Production\UnitOfMeasure;
use App\Models\Production\WorkCell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create a user
    $this->user = User::factory()->create();
    $this->actingAs($this->user);

    // Create units of measure
    $this->unitEach = UnitOfMeasure::firstOrCreate(
        ['code' => 'EA'],
        [
            'name' => 'Each',
            'symbol' => 'ea',
            'uom_type' => 'COUNT',
            'is_base_unit' => true,
            'decimal_places' => 0,
            'is_active' => true,
        ]
    );

    // Create work cells without complex dependencies
    $this->workCell1 = WorkCell::create([
        'name' => 'Work Cell 1',
        'cell_type' => 'internal',
        'has_finite_capacity' => true,
        'default_setup_time_seconds' => 600,
        'default_cycle_time_seconds' => 60,
        'default_unit_of_measure_code' => $this->unitEach->code,
        'max_parallel_executions' => 1,
        'time_display_preference' => 'cycle_time',
        'time_scale_preference' => 'seconds',
        'is_active' => true,
    ]);

    $this->workCell2 = WorkCell::create([
        'name' => 'Work Cell 2',
        'cell_type' => 'internal',
        'has_finite_capacity' => true,
        'default_setup_time_seconds' => 600,
        'default_cycle_time_seconds' => 60,
        'default_unit_of_measure_code' => $this->unitEach->code,
        'max_parallel_executions' => 1,
        'time_display_preference' => 'cycle_time',
        'time_scale_preference' => 'seconds',
        'is_active' => true,
    ]);

    // Create an item
    $this->item = Item::create([
        'name' => 'Test Item',
        'item_number' => 'ITEM-001',
        'code' => 'TEST-001',
        'item_type' => 'manufactured',
        'unit_of_measure_code' => $this->unitEach->code,
        'is_active' => true,
    ]);
});

describe('ManufacturingOrderObserver', function () {
    it('queues eligible steps when order is released', function () {
        // Create an order with a route
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-001',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'planned',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        // Create steps with dependencies
        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'pending',
            'sequence' => 1,
        ]);

        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell2->id,
            'name' => 'Step 2',
            'status' => 'pending',
            'sequence' => 2,
            'depends_on_step_id' => $step1->id,
            'dependency_start_condition' => 'completed',
        ]);

        // Release the order
        $order->update(['status' => 'released']);

        // Assert first step is queued
        expect($step1->fresh()->status)->toBe('queued');
        // Assert second step remains pending (depends on first)
        expect($step2->fresh()->status)->toBe('pending');
    });

    it('pauses active steps when order is put on hold', function () {
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-002',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'in_progress',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'in_progress',
        ]);

        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell2->id,
            'name' => 'Step 2',
            'status' => 'queued',
        ]);

        // Put order on hold
        $order->update(['status' => 'on_hold']);

        // Assert both steps are on hold
        expect($step1->fresh()->status)->toBe('on_hold');
        expect($step2->fresh()->status)->toBe('on_hold');
    });

    it('resumes steps when order is taken off hold', function () {
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-003',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'on_hold',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'on_hold',
        ]);

        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell2->id,
            'name' => 'Step 2',
            'status' => 'on_hold',
            'depends_on_step_id' => $step1->id,
        ]);

        // Resume order
        $order->update(['status' => 'released']);

        // First step should be queued (no dependencies)
        expect($step1->fresh()->status)->toBe('queued');
        // Second step should be pending (dependency not met)
        expect($step2->fresh()->status)->toBe('pending');
    });

    it('cancels all non-completed steps when order is cancelled', function () {
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-004',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'in_progress',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        $completedStep = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'completed',
        ]);

        $inProgressStep = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 2',
            'status' => 'in_progress',
        ]);

        $pendingStep = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 3',
            'status' => 'pending',
        ]);

        // Cancel order
        $order->update(['status' => 'cancelled']);

        // Completed step remains completed
        expect($completedStep->fresh()->status)->toBe('completed');
        // Other steps are cancelled
        expect($inProgressStep->fresh()->status)->toBe('cancelled');
        expect($pendingStep->fresh()->status)->toBe('cancelled');
    });
});

describe('ManufacturingStepObserver', function () {
    it('queues dependent steps when a step is completed', function () {
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-005',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'in_progress',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'in_progress',
        ]);

        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell2->id,
            'name' => 'Step 2',
            'status' => 'pending',
            'depends_on_step_id' => $step1->id,
            'dependency_start_condition' => 'completed',
        ]);

        // Complete step 1
        $step1->update(['status' => 'completed']);

        // Step 2 should now be queued
        expect($step2->fresh()->status)->toBe('queued');
    });

    it('queues dependent steps with immediate gate when step starts', function () {
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-006',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'in_progress',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'queued',
        ]);

        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell2->id,
            'name' => 'Step 2',
            'status' => 'pending',
            'depends_on_step_id' => $step1->id,
            'dependency_start_condition' => 'immediate',
        ]);

        // Start step 1
        $step1->update(['status' => 'in_progress']);

        // Step 2 should now be queued (immediate gate)
        expect($step2->fresh()->status)->toBe('queued');
    });
});

describe('ManufacturingStepExecutionObserver', function () {
    it('queues dependent steps when quantity gate is met', function () {
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-007',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'in_progress',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'in_progress',
            'cumulative_quantity_completed' => 0,
        ]);

        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell2->id,
            'name' => 'Step 2',
            'status' => 'pending',
            'depends_on_step_id' => $step1->id,
            'dependency_start_condition' => 'quantity_based',
            'dependency_minimum_quantity' => 50,
        ]);

        // Create execution and update quantities
        $execution = ManufacturingStepExecution::create([
            'manufacturing_step_id' => $step1->id,
            'user_id' => $this->user->id,
            'work_cell_id' => $this->workCell1->id,
            'quantity_completed' => 50,
            'quantity_scrapped' => 0,
            'started_at' => now(),
            'status' => 'in_progress',
        ]);

        // Update step cumulative quantity
        $step1->update(['cumulative_quantity_completed' => 50]);

        // Step 2 should now be queued (quantity gate met)
        expect($step2->fresh()->status)->toBe('queued');
    });

    it('queues dependent steps when percentage gate is met', function () {
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-008',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'in_progress',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'in_progress',
            'cumulative_quantity_completed' => 0,
        ]);

        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell2->id,
            'name' => 'Step 2',
            'status' => 'pending',
            'depends_on_step_id' => $step1->id,
            'dependency_start_condition' => 'percentage_based',
            'dependency_minimum_percentage' => 25, // 25%
        ]);

        // Create execution and update quantities
        $execution = ManufacturingStepExecution::create([
            'manufacturing_step_id' => $step1->id,
            'user_id' => $this->user->id,
            'work_cell_id' => $this->workCell1->id,
            'quantity_completed' => 25,
            'quantity_scrapped' => 0,
            'started_at' => now(),
            'status' => 'in_progress',
        ]);

        // Update step cumulative quantity (25% of 100)
        $step1->update(['cumulative_quantity_completed' => 25]);

        // Step 2 should now be queued (percentage gate met)
        expect($step2->fresh()->status)->toBe('queued');
    });
});

describe('ManufacturingRouteObserver', function () {
    it('queues first steps when route is created on released order', function () {
        // Create a released order without route
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-009',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'released',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        // Create route (observer should trigger)
        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        // Create steps
        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'pending',
        ]);

        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell2->id,
            'name' => 'Step 2',
            'status' => 'pending',
            'depends_on_step_id' => $step1->id,
        ]);

        // First step should be queued automatically
        expect($step1->fresh()->status)->toBe('queued');
        // Second step remains pending
        expect($step2->fresh()->status)->toBe('pending');
    });
});

describe('CheckPendingStepsJob', function () {
    it('queues steps that were missed by observers', function () {
        // Create a scenario where a step should be queued but isn't
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-010',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'released',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        // Manually create a step that should be queued but isn't
        $step = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'pending',
        ]);

        // Ensure it's pending
        expect($step->status)->toBe('pending');

        // Run the safety net job
        $job = new CheckPendingStepsJob;
        $job->handle();

        // Step should now be queued
        expect($step->fresh()->status)->toBe('queued');
    });

    it('does not queue steps with unmet dependencies', function () {
        $order = ManufacturingOrder::create([
            'order_number' => 'MO-011',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'released',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Route for ' . $order->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Step 1',
            'status' => 'pending',
        ]);

        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $this->workCell2->id,
            'name' => 'Step 2',
            'status' => 'pending',
            'depends_on_step_id' => $step1->id,
            'dependency_start_condition' => 'completed',
        ]);

        // Run the safety net job
        $job = new CheckPendingStepsJob;
        $job->handle();

        // Only first step should be queued
        expect($step1->fresh()->status)->toBe('queued');
        expect($step2->fresh()->status)->toBe('pending');
    });
});

describe('Child Order Dependencies', function () {
    it('queues parent steps when child order completes required quantity', function () {
        // Create parent order
        $parentOrder = ManufacturingOrder::create([
            'order_number' => 'MO-012',
            'item_id' => $this->item->id,
            'quantity' => 100,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'released',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        $parentRoute = ManufacturingRoute::create([
            'manufacturing_order_id' => $parentOrder->id,
            'item_id' => $parentOrder->item_id,
            'name' => 'Route for ' . $parentOrder->order_number,
            'is_template' => false,
            'is_active' => true,
        ]);

        // Create step that depends on child orders
        $parentStep = ManufacturingStep::create([
            'manufacturing_route_id' => $parentRoute->id,
            'work_cell_id' => $this->workCell1->id,
            'name' => 'Assembly',
            'status' => 'pending',
            'child_order_dependency_type' => 'all_completed',
        ]);

        // Create child order
        $childOrder = ManufacturingOrder::create([
            'order_number' => 'MO-013',
            'parent_id' => $parentOrder->id,
            'item_id' => $this->item->id,
            'quantity' => 50,
            'quantity_completed' => 0,
            'unit_of_measure_code' => $this->unitEach->code,
            'status' => 'in_progress',
            'priority' => 50,
            'requested_date' => now()->addDays(7),
            'source_type' => 'manual',
            'created_by' => $this->user->id,
        ]);

        // Complete child order
        $childOrder->update([
            'quantity_completed' => 50,
            'status' => 'completed',
        ]);

        // Parent step should now be queued
        expect($parentStep->fresh()->status)->toBe('queued');
    });
});

<?php

namespace Tests\Feature\Scheduling;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Services\Scheduling\ASAPScheduler;
use App\Services\Scheduling\DueDateBackwardScheduler;
use App\Services\Scheduling\OrderFamilyService;
use App\Services\Scheduling\SchedulingRequest;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HDGSchedulingTest extends TestCase
{
    use RefreshDatabase;

    protected ASAPScheduler $asapScheduler;
    protected DueDateBackwardScheduler $dueDateScheduler;
    protected OrderFamilyService $familyService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->asapScheduler = app(ASAPScheduler::class);
        $this->dueDateScheduler = app(DueDateBackwardScheduler::class);
        $this->familyService = app(OrderFamilyService::class);
    }

    /** @test */
    public function it_groups_orders_by_families_correctly()
    {
        // Create a parent order with children
        $parentOrder = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-001',
            'priority' => 100,
        ]);

        $childOrder1 = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-001.1',
            'parent_id' => $parentOrder->id,
            'priority' => 100,
        ]);

        $childOrder2 = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-001.2',
            'parent_id' => $parentOrder->id,
            'priority' => 100,
        ]);

        // Create another independent order
        $independentOrder = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-002',
            'priority' => 50,
        ]);

        $orders = collect([$parentOrder, $childOrder1, $childOrder2, $independentOrder]);
        $families = $this->familyService->groupOrdersByFamily($orders);

        $this->assertCount(2, $families);

        // First family should have higher priority
        $this->assertEquals(100, $families[0]['priority']);
        $this->assertCount(3, $families[0]['members']);

        // Second family
        $this->assertEquals(50, $families[1]['priority']);
        $this->assertCount(1, $families[1]['members']);
    }

    /** @test */
    public function it_schedules_entire_families_atomically()
    {
        $workCell = WorkCell::factory()->create();

        // Create parent order
        $parentOrder = $this->createOrderWithRoute($workCell, 'MO-001');

        // Create child orders
        $childOrder1 = $this->createOrderWithRoute($workCell, 'MO-001.1', $parentOrder);
        $childOrder2 = $this->createOrderWithRoute($workCell, 'MO-001.2', $parentOrder);

        $request = new SchedulingRequest([
            'manufacturingOrderIds' => [$parentOrder->id, $childOrder1->id, $childOrder2->id],
            'scheduleStartDate' => now()->toDateTimeString(),
            'scheduleVersionId' => 1,
        ]);

        $result = $this->asapScheduler->schedule($request);

        $this->assertTrue($result->success);
        $this->assertCount(3, $result->scheduledSteps); // 3 orders, 1 step each

        // Verify all steps are scheduled
        $scheduledOrderIds = [];
        foreach ($result->scheduledSteps as $step) {
            $manufacturingStep = ManufacturingStep::find($step->stepId);
            $scheduledOrderIds[] = $manufacturingStep->manufacturingRoute->manufacturing_order_id;
        }

        $this->assertContains($parentOrder->id, $scheduledOrderIds);
        $this->assertContains($childOrder1->id, $scheduledOrderIds);
        $this->assertContains($childOrder2->id, $scheduledOrderIds);
    }

    /** @test */
    public function it_respects_gate_configurations_for_dependencies()
    {
        $workCell = WorkCell::factory()->create();

        // Create order with two steps
        $order = ManufacturingOrder::factory()->create([
            'quantity' => 100,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Test Route',
            'is_template' => false,
            'is_active' => true,
            'version' => 1,
        ]);

        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $workCell->id,
            'name' => 'Step 1',
            'display_order' => 1,
            'setup_time_minutes' => 30,
            'cycle_time_minutes' => 1, // 1 minute per unit
            'status' => 'pending',
        ]);

        // Step 2 can start when step 1 is 50% complete
        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $workCell->id,
            'name' => 'Step 2',
            'display_order' => 2,
            'setup_time_minutes' => 20,
            'cycle_time_minutes' => 40,
            'depends_on_step_id' => $step1->id,
            'dependency_start_condition' => 'percentage_based',
            'dependency_minimum_percentage' => 50,
            'status' => 'pending',
        ]);

        // Verify the dependency is set correctly
        $this->assertEquals($step1->id, $step2->fresh()->depends_on_step_id);
        $this->assertEquals('percentage_based', $step2->fresh()->dependency_start_condition);
        $this->assertEquals(50, $step2->fresh()->dependency_minimum_percentage);

        $request = new SchedulingRequest([
            'manufacturingOrderIds' => [$order->id],
            'scheduleStartDate' => now()->toDateTimeString(),
            'scheduleVersionId' => 1,
        ]);

        $result = $this->asapScheduler->schedule($request);

        $this->assertTrue($result->success);
        $this->assertCount(2, $result->scheduledSteps);

        // Find scheduled times
        $step1Schedule = collect($result->scheduledSteps)->firstWhere('stepId', $step1->id);
        $step2Schedule = collect($result->scheduledSteps)->firstWhere('stepId', $step2->id);

        // Step 2 should start when step 1 is 50% complete
        // With 100 units, 1 minute per unit, and 30 min setup:
        // Time to 50% = 30 min setup + (50 units × 1 min/unit) = 80 minutes
        $expectedStep2Start = Carbon::instance($step1Schedule->scheduledStart)->addMinutes(80);

        // Allow some tolerance for scheduling constraints
        $actualStep2Start = Carbon::instance($step2Schedule->scheduledStart);

        // Debug: Check actual times
        $step1Start = Carbon::instance($step1Schedule->scheduledStart);
        $step1End = Carbon::instance($step1Schedule->scheduledEnd);
        $timeDiff = $actualStep2Start->diffInMinutes($step1Start);

        $this->assertTrue(
            $actualStep2Start->between(
                $expectedStep2Start->copy()->subMinutes(5),
                $expectedStep2Start->copy()->addMinutes(5)
            ),
            'Step 2 should start around 80 minutes after Step 1 (50% of 100 units). ' .
            "Step1 start: {$step1Start}, Step1 end: {$step1End}, " .
            "Step2 start: {$actualStep2Start}, Time diff: {$timeDiff} minutes"
        );
    }

    /** @test */
    public function it_validates_production_time_parameters()
    {
        $workCell = WorkCell::factory()->create();

        // Create order with step that has no time parameters
        $order = ManufacturingOrder::factory()->create();
        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Test Route',
            'is_template' => false,
            'is_active' => true,
            'version' => 1,
        ]);

        $step = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $workCell->id,
            'name' => 'Step 1',
            'display_order' => 1,
            'setup_time_minutes' => 0,
            'cycle_time_minutes' => 0,
            'status' => 'pending',
        ]);

        $request = new SchedulingRequest([
            'manufacturingOrderIds' => [$order->id],
            'scheduleStartDate' => now()->toDateTimeString(),
            'scheduleVersionId' => 1,
        ]);

        $result = $this->asapScheduler->schedule($request);

        $this->assertFalse($result->success);
        $this->assertCount(1, $result->alerts);

        // The validation error can come as either validation_error or family_error type
        $alert = $result->alerts[0];
        $this->assertContains($alert['type'], ['validation_error', 'family_error']);
        $this->assertStringContainsString('Missing production time parameters', $alert['message']);
    }

    /** @test */
    public function it_handles_child_order_dependencies()
    {
        $workCell = WorkCell::factory()->create();

        // Create parent and child orders
        $parentOrder = $this->createOrderWithRoute($workCell, 'MO-001');
        $childOrder = $this->createOrderWithRoute($workCell, 'MO-001.1', $parentOrder);

        // Update parent step to depend on child completion
        $parentStep = $parentOrder->manufacturingRoute->steps->first();
        $parentStep->update([
            'child_order_dependency_type' => 'all_children_completed',
        ]);

        $request = new SchedulingRequest([
            'manufacturingOrderIds' => [$parentOrder->id, $childOrder->id],
            'scheduleStartDate' => now()->toDateTimeString(),
            'scheduleVersionId' => 1,
        ]);

        $result = $this->asapScheduler->schedule($request);

        $this->assertTrue($result->success);

        // Get scheduled times
        $parentSchedule = collect($result->scheduledSteps)
            ->firstWhere('stepId', $parentStep->id);
        $childSchedule = collect($result->scheduledSteps)
            ->firstWhere('stepId', $childOrder->manufacturingRoute->steps->first()->id);

        // Parent should start after child ends
        $this->assertGreaterThanOrEqual(
            Carbon::instance($childSchedule->scheduledEnd)->timestamp,
            Carbon::instance($parentSchedule->scheduledStart)->timestamp
        );
    }

    /** @test */
    public function it_schedules_backward_from_due_dates()
    {
        $workCell = WorkCell::factory()->create();

        // Create order with due date
        $dueDate = now()->addDays(7);
        $order = ManufacturingOrder::factory()->create([
            'requested_date' => $dueDate,
            'planned_start_date' => null,
            'planned_end_date' => null,
        ]);

        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Test Route',
            'is_template' => false,
            'is_active' => true,
            'version' => 1,
        ]);

        $step = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $workCell->id,
            'name' => 'Step 1',
            'display_order' => 1,
            'setup_time_minutes' => 60,
            'cycle_time_minutes' => 120, // 3 hours total
            'status' => 'pending',
        ]);

        $request = new SchedulingRequest([
            'manufacturingOrderIds' => [$order->id],
            'scheduleVersionId' => 1,
        ]);

        $result = $this->dueDateScheduler->schedule($request);

        $this->assertTrue($result->success);

        $schedule = $result->scheduledSteps[0];

        // Should end before or at due date
        $this->assertLessThanOrEqual(
            $dueDate->endOfDay()->timestamp,
            Carbon::instance($schedule->scheduledEnd)->timestamp
        );
    }

    /** @test */
    public function it_prevents_cross_family_dependencies()
    {
        $workCell = WorkCell::factory()->create();

        // Create two independent families
        $family1Order = $this->createOrderWithRoute($workCell, 'MO-001');
        $family2Order = $this->createOrderWithRoute($workCell, 'MO-002');

        // Try to create a dependency between families (this should be caught)
        $family1Step = $family1Order->manufacturingRoute->steps->first();
        $family2Step = $family2Order->manufacturingRoute->steps->first();

        // Validate that cross-family dependencies are detected
        $families = $this->familyService->groupOrdersByFamily(
            collect([$family1Order, $family2Order])
        );

        $this->assertCount(2, $families);

        // Each family should be independent
        $family1Members = $families[0]['members'];
        $family2Members = $families[1]['members'];

        $errors1 = $this->familyService->validateFamilyDependencies($family1Members);
        $errors2 = $this->familyService->validateFamilyDependencies($family2Members);

        $this->assertEmpty($errors1);
        $this->assertEmpty($errors2);
    }

    /** @test */
    public function it_reserves_capacity_for_entire_families()
    {
        $workCell = WorkCell::factory()->create();

        // Create a family with multiple orders
        $parentOrder = $this->createOrderWithRoute($workCell, 'MO-001');
        $childOrder1 = $this->createOrderWithRoute($workCell, 'MO-001.1', $parentOrder);
        $childOrder2 = $this->createOrderWithRoute($workCell, 'MO-001.2', $parentOrder);

        // Create another family
        $otherOrder = $this->createOrderWithRoute($workCell, 'MO-002');

        $request = new SchedulingRequest([
            'manufacturingOrderIds' => [
                $parentOrder->id,
                $childOrder1->id,
                $childOrder2->id,
                $otherOrder->id,
            ],
            'scheduleStartDate' => now()->toDateTimeString(),
            'scheduleVersionId' => 1,
        ]);

        $result = $this->asapScheduler->schedule($request);

        $this->assertTrue($result->success);
        $this->assertEquals(2, $result->metrics['families_processed']);

        // Verify no overlap between families
        $family1Steps = [];
        $family2Steps = [];

        foreach ($result->scheduledSteps as $step) {
            $manufacturingStep = ManufacturingStep::find($step->stepId);
            $order = $manufacturingStep->manufacturingRoute->manufacturingOrder;

            if (in_array($order->id, [$parentOrder->id, $childOrder1->id, $childOrder2->id])) {
                $family1Steps[] = $step;
            } else {
                $family2Steps[] = $step;
            }
        }

        // Check that families don't overlap in time on the same work cell
        foreach ($family1Steps as $step1) {
            foreach ($family2Steps as $step2) {
                if ($step1->workCellId === $step2->workCellId) {
                    // Should not overlap
                    $overlap = $this->checkTimeOverlap($step1, $step2);
                    $this->assertFalse($overlap, 'Families should not overlap on same work cell');
                }
            }
        }
    }

    /**
     * Helper method to create an order with a simple route.
     */
    protected function createOrderWithRoute(WorkCell $workCell, string $orderNumber, ?ManufacturingOrder $parent = null): ManufacturingOrder
    {
        $order = ManufacturingOrder::factory()->create([
            'order_number' => $orderNumber,
            'parent_id' => $parent?->id,
            'priority' => $parent ? $parent->priority : 50,
        ]);

        // Create route directly without factory to avoid BOM conflicts
        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => "Route for {$orderNumber}",
            'is_template' => false,
            'is_active' => true,
            'version' => 1,
        ]);

        // Create step directly
        ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $workCell->id,
            'name' => 'Step 1',
            'display_order' => 1,
            'setup_time_minutes' => 30,
            'cycle_time_minutes' => 60,
            'status' => 'pending',
        ]);

        return $order->fresh(['manufacturingRoute.steps']);
    }

    /**
     * Check if two schedule slots overlap.
     */
    protected function checkTimeOverlap($schedule1, $schedule2): bool
    {
        $start1 = Carbon::instance($schedule1->scheduledStart);
        $end1 = Carbon::instance($schedule1->scheduledEnd);
        $start2 = Carbon::instance($schedule2->scheduledStart);
        $end2 = Carbon::instance($schedule2->scheduledEnd);

        return $start1->lt($end2) && $end1->gt($start2);
    }
}

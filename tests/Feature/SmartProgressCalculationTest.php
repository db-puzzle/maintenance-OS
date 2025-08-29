<?php

namespace Tests\Feature;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\Item;
use App\Models\Production\WorkCell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SmartProgressCalculationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Item $item;
    protected WorkCell $workCell;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->item = Item::factory()->create();
        $this->workCell = WorkCell::factory()->create();
        
        $this->actingAs($this->user);
    }

    public function test_simple_order_without_route_uses_quantity_completed()
    {
        $order = ManufacturingOrder::factory()->create([
            'quantity' => 100,
            'quantity_completed' => 25,
            'status' => 'in_progress'
        ]);

        $progress = $order->calculateSmartProgress();

        $this->assertEquals(25.0, $progress);
        $this->assertEquals(25.0, $order->smart_progress_percentage);
        $this->assertNotNull($order->progress_calculated_at);
    }

    public function test_order_with_route_calculates_based_on_steps()
    {
        $order = ManufacturingOrder::factory()->create([
            'quantity' => 10,
            'quantity_completed' => 0,
            'status' => 'released'
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id
        ]);

        // Create 3 steps
        $step1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'display_order' => 1,
            'cumulative_quantity_completed' => 10 // All units completed step 1
        ]);

        $step2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'display_order' => 2,
            'cumulative_quantity_completed' => 5 // 5 units completed step 2
        ]);

        $step3 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'display_order' => 3,
            'cumulative_quantity_completed' => 0 // No units completed step 3
        ]);

        // Expected: 10 units × 3 steps = 30 work units total
        // Completed: 10 + 5 + 0 = 15 work units
        // Progress: 15/30 = 50%
        $progress = $order->calculateSmartProgress();

        $this->assertEquals(50.0, $progress);
    }

    public function test_hierarchical_order_includes_children()
    {
        // Parent order: 10 units, 2 steps
        $parentOrder = ManufacturingOrder::factory()->create([
            'quantity' => 10,
            'quantity_completed' => 0,
            'status' => 'released'
        ]);

        $parentRoute = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $parentOrder->id
        ]);

        ManufacturingStep::factory()->count(2)->create([
            'manufacturing_route_id' => $parentRoute->id,
            'cumulative_quantity_completed' => 5 // Each step has 5 units completed
        ]);

        // Child order: 20 units, 1 step
        $childOrder = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'quantity' => 20,
            'quantity_completed' => 0,
            'status' => 'released'
        ]);

        $childRoute = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $childOrder->id
        ]);

        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $childRoute->id,
            'cumulative_quantity_completed' => 10
        ]);

        // Update child count
        $parentOrder->updateChildOrderCounts();

        // Expected work units:
        // Parent: 10 units × 2 steps = 20
        // Child: 20 units × 1 step = 20
        // Total: 40 work units

        // Completed work units:
        // Parent: 5 + 5 = 10
        // Child: 10
        // Total: 20 work units

        // Progress: 20/40 = 50%
        $progress = $parentOrder->calculateSmartProgress();

        $this->assertEquals(50.0, $progress);
    }

    public function test_work_units_breakdown_structure()
    {
        $parentOrder = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-2024-001',
            'quantity' => 10,
            'status' => 'released'
        ]);

        $childOrder = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'order_number' => 'MO-2024-001.1',
            'quantity' => 20,
            'status' => 'released'
        ]);

        $parentRoute = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $parentOrder->id
        ]);

        ManufacturingStep::factory()->count(2)->create([
            'manufacturing_route_id' => $parentRoute->id
        ]);

        $breakdown = $parentOrder->getWorkUnitsBreakdown();

        $this->assertEquals('MO-2024-001', $breakdown['order_number']);
        $this->assertEquals(20, $breakdown['expected_units']); // 10 × 2 steps
        $this->assertCount(1, $breakdown['children']);
        $this->assertEquals('MO-2024-001.1', $breakdown['children'][0]['order_number']);
    }

    public function test_n_plus_one_prevention_on_index()
    {
        // Create complex hierarchy
        $orders = ManufacturingOrder::factory()->count(20)->create();
        
        foreach ($orders as $order) {
            // Each order has 3 children
            $children = ManufacturingOrder::factory()->count(3)->create([
                'parent_id' => $order->id
            ]);
            
            // Each child has a route with 2 steps
            foreach ($children as $child) {
                $route = ManufacturingRoute::factory()->create([
                    'manufacturing_order_id' => $child->id
                ]);
                
                ManufacturingStep::factory()->count(2)->create([
                    'manufacturing_route_id' => $route->id
                ]);
            }
        }

        DB::enableQueryLog();
        
        // Simulate index page load
        $loadedOrders = ManufacturingOrder::with([
            'item',
            'billOfMaterial',
            'parent',
            'children.manufacturingRoute.steps',
            'manufacturingRoute.steps',
            'createdBy'
        ])->paginate(20);
        
        $queryCount = count(DB::getQueryLog());
        
        // Should be minimal queries: base + eager loads
        // Not 20+ queries
        $this->assertLessThan(15, $queryCount, 'Too many queries detected - possible N+1 problem');
    }

    public function test_smart_progress_caching()
    {
        $order = ManufacturingOrder::factory()->create([
            'quantity' => 100,
            'quantity_completed' => 50
        ]);

        // First calculation
        $progress1 = $order->calculateSmartProgress();
        $calculatedAt1 = $order->progress_calculated_at;

        // Wait a moment
        sleep(1);

        // Second calculation with cache enabled
        $progress2 = $order->calculateSmartProgress(true);
        $calculatedAt2 = $order->progress_calculated_at;

        // Should use cached value
        $this->assertEquals($progress1, $progress2);
        $this->assertEquals($calculatedAt1->format('Y-m-d H:i:s'), $calculatedAt2->format('Y-m-d H:i:s'));

        // Force recalculation
        $progress3 = $order->calculateSmartProgress(false);
        $order->refresh();
        $calculatedAt3 = $order->progress_calculated_at;

        // Should have new timestamp
        $this->assertNotEquals($calculatedAt1->format('Y-m-d H:i:s'), $calculatedAt3->format('Y-m-d H:i:s'));
    }

    public function test_progress_invalidation_propagates_to_parent()
    {
        $parentOrder = ManufacturingOrder::factory()->create([
            'smart_progress_percentage' => 50,
            'progress_calculated_at' => now()->subHours(2)
        ]);

        $childOrder = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'smart_progress_percentage' => 75,
            'progress_calculated_at' => now()->subHours(2)
        ]);

        // Invalidate child
        $childOrder->invalidateSmartProgress();

        // Refresh parent
        $parentOrder->refresh();

        // Parent should also be invalidated
        $this->assertNull($parentOrder->progress_calculated_at);
        $this->assertNull($childOrder->progress_calculated_at);
    }

    public function test_smart_progress_with_zero_quantity()
    {
        $order = ManufacturingOrder::factory()->create([
            'quantity' => 0,
            'quantity_completed' => 0,
            'status' => 'completed'
        ]);

        $progress = $order->calculateSmartProgress();

        // Zero quantity completed orders should show 100%
        $this->assertEquals(100.0, $progress);
    }

    public function test_smart_progress_calculation_via_query()
    {
        // Create a complex hierarchy
        $parentOrder = ManufacturingOrder::factory()->create([
            'quantity' => 10
        ]);

        // Create children with routes
        for ($i = 0; $i < 3; $i++) {
            $child = ManufacturingOrder::factory()->create([
                'parent_id' => $parentOrder->id,
                'quantity' => 20
            ]);

            $route = ManufacturingRoute::factory()->create([
                'manufacturing_order_id' => $child->id
            ]);

            ManufacturingStep::factory()->count(2)->create([
                'manufacturing_route_id' => $route->id,
                'cumulative_quantity_completed' => 10
            ]);
        }

        // Calculate using query method
        $progress = $parentOrder->calculateSmartProgressViaQuery();

        // Calculate using PHP method
        $progressPhp = $parentOrder->calculateSmartProgress();

        // Both methods should give same result
        $this->assertEquals($progressPhp, $progress);
    }
}

<?php

namespace Tests\Feature\Production;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Tests for verifying that Manufacturing Orders cannot transition from draft to planned
 * without having route steps defined.
 *
 * Note: These tests require a properly configured test database with migrations run.
 * Run: php artisan migrate --database=testing
 */
class PlanningBulkTransitionTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed permissions
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);

        // Create a user with administrator role
        $this->user = User::factory()->create();
        $this->user->assignRole('Administrator');
        $this->actingAs($this->user);
    }

    #[Test]
    public function it_prevents_transition_to_planned_without_route()
    {
        // Create an order without any route
        $item = Item::factory()->create();
        $order = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        // No route created

        // Attempt to transition to planned
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$order->id],
            'targetState' => 'planned',
            'includeChildren' => false,
        ]);

        // Should redirect back with error
        $response->assertStatus(302);
        $response->assertSessionHas('error');

        // Order should still be draft
        $this->assertEquals('draft', $order->fresh()->status);
    }

    #[Test]
    public function it_prevents_transition_to_planned_with_empty_route()
    {
        // Create an order with a route but no steps
        $item = Item::factory()->create();
        $order = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        // Create route but no steps
        ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
            'is_active' => true,
        ]);

        // Attempt to transition to planned
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$order->id],
            'targetState' => 'planned',
            'includeChildren' => false,
        ]);

        // Should redirect back with error
        $response->assertStatus(302);
        $response->assertSessionHas('error');

        // Order should still be draft
        $this->assertEquals('draft', $order->fresh()->status);
    }

    #[Test]
    public function it_allows_transition_to_planned_with_valid_route()
    {
        // Create an order with a valid route and steps with work cells
        $item = Item::factory()->create();
        $workCell = WorkCell::factory()->create();

        $order = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
            'is_active' => true,
        ]);

        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => $workCell->id,
        ]);

        // Attempt to transition to planned
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$order->id],
            'targetState' => 'planned',
            'includeChildren' => false,
        ]);

        // Should succeed
        $response->assertStatus(302);

        // Order should be planned
        $this->assertEquals('planned', $order->fresh()->status);
    }

    #[Test]
    public function it_skips_children_without_route_steps_in_bulk_transition()
    {
        // Create a parent order with valid route
        $item = Item::factory()->create();
        $workCell = WorkCell::factory()->create();

        // Parent with valid route
        $parentOrder = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $parentRoute = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $parentOrder->id,
            'is_active' => true,
        ]);

        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $parentRoute->id,
            'work_cell_id' => $workCell->id,
        ]);

        // Child 1: Valid route with steps
        $childOrder1 = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $childRoute1 = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $childOrder1->id,
            'is_active' => true,
        ]);

        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $childRoute1->id,
            'work_cell_id' => $workCell->id,
        ]);

        // Child 2: Route but NO steps
        $childOrder2 = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $childOrder2->id,
            'is_active' => true,
        ]);
        // No steps created for childOrder2

        // Child 3: No route at all
        $childOrder3 = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);
        // No route created for childOrder3

        // Transition with includeChildren = true
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$parentOrder->id],
            'targetState' => 'planned',
            'includeChildren' => true,
        ]);

        $response->assertStatus(302);

        // Parent should be planned
        $this->assertEquals('planned', $parentOrder->fresh()->status);

        // Child 1 should be planned (has valid route)
        $this->assertEquals('planned', $childOrder1->fresh()->status);

        // Child 2 should remain draft (route has no steps)
        $this->assertEquals('draft', $childOrder2->fresh()->status);

        // Child 3 should remain draft (no route)
        $this->assertEquals('draft', $childOrder3->fresh()->status);

        // Should have warning message about skipped orders
        $response->assertSessionHas('warning');
    }

    #[Test]
    public function it_prevents_transition_when_steps_lack_work_cells()
    {
        // Create an order with steps but no work cells assigned
        $item = Item::factory()->create();

        $order = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
            'is_active' => true,
        ]);

        // Create step WITHOUT work cell
        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'work_cell_id' => null,
        ]);

        // Attempt to transition to planned
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$order->id],
            'targetState' => 'planned',
            'includeChildren' => false,
        ]);

        // Should redirect back with error
        $response->assertStatus(302);
        $response->assertSessionHas('error');

        // Order should still be draft
        $this->assertEquals('draft', $order->fresh()->status);
    }

    #[Test]
    public function it_handles_multiple_orders_with_mixed_validity()
    {
        // Create multiple orders with different validation states
        $item = Item::factory()->create();
        $workCell = WorkCell::factory()->create();

        // Order 1: Valid route
        $order1 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $route1 = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order1->id,
            'is_active' => true,
        ]);

        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route1->id,
            'work_cell_id' => $workCell->id,
        ]);

        // Order 2: No route
        $order2 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        // Order 3: Route but no steps
        $order3 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order3->id,
            'is_active' => true,
        ]);

        // Attempt to transition all to planned
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$order1->id, $order2->id, $order3->id],
            'targetState' => 'planned',
            'includeChildren' => false,
        ]);

        $response->assertStatus(302);

        // Order 1 should be planned
        $this->assertEquals('planned', $order1->fresh()->status);

        // Order 2 should remain draft
        $this->assertEquals('draft', $order2->fresh()->status);

        // Order 3 should remain draft
        $this->assertEquals('draft', $order3->fresh()->status);

        // Should have warning about skipped orders
        $response->assertSessionHas('warning');
    }

    #[Test]
    public function it_validates_can_be_planned_method_correctly()
    {
        // Test the canBePlanned() method directly
        $item = Item::factory()->create();
        $workCell = WorkCell::factory()->create();

        // Case 1: Order without route cannot be planned
        $order1 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);
        $this->assertFalse($order1->canBePlanned());

        // Case 2: Order with empty route cannot be planned
        $order2 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);
        ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order2->id,
            'is_active' => true,
        ]);
        $this->assertFalse($order2->canBePlanned());

        // Case 3: Order with steps but no work cells cannot be planned
        $order3 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);
        $route3 = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order3->id,
            'is_active' => true,
        ]);
        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route3->id,
            'work_cell_id' => null,
        ]);
        $this->assertFalse($order3->canBePlanned());

        // Case 4: Order with valid route and work cells can be planned
        $order4 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);
        $route4 = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order4->id,
            'is_active' => true,
        ]);
        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route4->id,
            'work_cell_id' => $workCell->id,
        ]);
        $this->assertTrue($order4->canBePlanned());

        // Case 5: Order not in draft status cannot be planned
        $order5 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'planned',
        ]);
        $route5 = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order5->id,
            'is_active' => true,
        ]);
        ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route5->id,
            'work_cell_id' => $workCell->id,
        ]);
        $this->assertFalse($order5->canBePlanned());
    }
}

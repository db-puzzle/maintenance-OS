<?php

namespace Tests\Feature\Production;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\User;
use Database\Seeders\ProductionPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PlanningBulkTransitionWithChildrenTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed permissions
        $this->seed(ProductionPermissionSeeder::class);

        // Create a user with planning permissions
        $this->user = User::factory()->create();
        $this->user->givePermissionTo([
            'production.orders.update',
            'production.orders.plan',
        ]);
        $this->actingAs($this->user);
    }

    #[Test]
    public function it_can_transition_order_to_planned_without_children()
    {
        // Create a parent order with children
        $item = Item::factory()->create();
        $parentOrder = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $childOrder1 = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $childOrder2 = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        // Transition only the parent order to planned (without children)
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$parentOrder->id],
            'targetState' => 'planned',
            'includeChildren' => false,
        ]);

        $response->assertStatus(302);

        // Assert parent is planned
        $this->assertEquals('planned', $parentOrder->fresh()->status);

        // Assert children remain draft
        $this->assertEquals('draft', $childOrder1->fresh()->status);
        $this->assertEquals('draft', $childOrder2->fresh()->status);
    }

    #[Test]
    public function it_can_transition_order_and_all_children_to_planned()
    {
        // Create a parent order with children and grandchildren
        $item = Item::factory()->create();
        $parentOrder = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $childOrder1 = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $childOrder2 = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $grandchildOrder = ManufacturingOrder::factory()->create([
            'parent_id' => $childOrder1->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        // Transition parent and all descendants to planned
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$parentOrder->id],
            'targetState' => 'planned',
            'includeChildren' => true,
        ]);

        $response->assertStatus(302);

        // Assert all orders are planned
        $this->assertEquals('planned', $parentOrder->fresh()->status);
        $this->assertEquals('planned', $childOrder1->fresh()->status);
        $this->assertEquals('planned', $childOrder2->fresh()->status);
        $this->assertEquals('planned', $grandchildOrder->fresh()->status);
    }

    #[Test]
    public function it_does_not_include_children_when_transitioning_to_draft()
    {
        // Create a parent order with children
        $item = Item::factory()->create();
        $parentOrder = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'planned',
        ]);

        $childOrder = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
            'item_id' => $item->id,
            'status' => 'planned',
        ]);

        // Transition to draft with includeChildren = true
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$parentOrder->id],
            'targetState' => 'draft',
            'includeChildren' => true,
        ]);

        $response->assertStatus(302);

        // Assert only parent is draft (includeChildren is ignored for draft transition)
        $this->assertEquals('draft', $parentOrder->fresh()->status);
        $this->assertEquals('planned', $childOrder->fresh()->status);
    }

    #[Test]
    public function it_handles_multiple_parent_orders_with_children()
    {
        // Create two parent orders with children
        $item = Item::factory()->create();

        $parentOrder1 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);
        $childOrder1 = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder1->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        $parentOrder2 = ManufacturingOrder::factory()->create([
            'item_id' => $item->id,
            'status' => 'draft',
        ]);
        $childOrder2 = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder2->id,
            'item_id' => $item->id,
            'status' => 'draft',
        ]);

        // Transition both parents and their children to planned
        $response = $this->post(route('production.planning.orders.bulk-transition'), [
            'orderIds' => [$parentOrder1->id, $parentOrder2->id],
            'targetState' => 'planned',
            'includeChildren' => true,
        ]);

        $response->assertStatus(302);

        // Assert all orders are planned
        $this->assertEquals('planned', $parentOrder1->fresh()->status);
        $this->assertEquals('planned', $childOrder1->fresh()->status);
        $this->assertEquals('planned', $parentOrder2->fresh()->status);
        $this->assertEquals('planned', $childOrder2->fresh()->status);
    }
}

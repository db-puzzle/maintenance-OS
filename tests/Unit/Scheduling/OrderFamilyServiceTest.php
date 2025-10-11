<?php

namespace Tests\Unit\Scheduling;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Services\Scheduling\OrderFamilyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderFamilyServiceTest extends TestCase
{
    use RefreshDatabase;

    protected OrderFamilyService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new OrderFamilyService;
    }

    /** @test */
    public function it_finds_top_parent_correctly()
    {
        // Create hierarchy: grandparent -> parent -> child
        $grandparent = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-001',
        ]);

        $parent = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-001.1',
            'parent_id' => $grandparent->id,
        ]);

        $child = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-001.1.1',
            'parent_id' => $parent->id,
        ]);

        // Test from child
        $topParent = $this->service->getTopParent($child);
        $this->assertEquals($grandparent->id, $topParent->id);

        // Test from parent
        $topParent = $this->service->getTopParent($parent);
        $this->assertEquals($grandparent->id, $topParent->id);

        // Test from grandparent
        $topParent = $this->service->getTopParent($grandparent);
        $this->assertEquals($grandparent->id, $topParent->id);
    }

    /** @test */
    public function it_gets_hierarchy_level_correctly()
    {
        $grandparent = ManufacturingOrder::factory()->create();
        $parent = ManufacturingOrder::factory()->create(['parent_id' => $grandparent->id]);
        $child = ManufacturingOrder::factory()->create(['parent_id' => $parent->id]);

        $this->assertEquals(0, $this->service->getHierarchyLevel($grandparent));
        $this->assertEquals(1, $this->service->getHierarchyLevel($parent));
        $this->assertEquals(2, $this->service->getHierarchyLevel($child));
    }

    /** @test */
    public function it_gets_all_family_members()
    {
        // Create family structure
        $root = ManufacturingOrder::factory()->create(['order_number' => 'MO-001']);
        $child1 = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-001.1',
            'parent_id' => $root->id,
        ]);
        $child2 = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-001.2',
            'parent_id' => $root->id,
        ]);
        $grandchild = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-001.1.1',
            'parent_id' => $child1->id,
        ]);

        // Create unrelated order
        $unrelated = ManufacturingOrder::factory()->create(['order_number' => 'MO-002']);

        // Get family members from any member
        $familyMembers = $this->service->getFamilyMembers($grandchild);

        $this->assertCount(4, $familyMembers);
        $familyIds = $familyMembers->pluck('id')->toArray();

        $this->assertContains($root->id, $familyIds);
        $this->assertContains($child1->id, $familyIds);
        $this->assertContains($child2->id, $familyIds);
        $this->assertContains($grandchild->id, $familyIds);
        $this->assertNotContains($unrelated->id, $familyIds);
    }

    /** @test */
    public function it_checks_if_orders_are_in_same_family()
    {
        $family1Root = ManufacturingOrder::factory()->create();
        $family1Child = ManufacturingOrder::factory()->create(['parent_id' => $family1Root->id]);

        $family2Root = ManufacturingOrder::factory()->create();
        $family2Child = ManufacturingOrder::factory()->create(['parent_id' => $family2Root->id]);

        // Same family
        $this->assertTrue($this->service->areInSameFamily($family1Root, $family1Child));

        // Different families
        $this->assertFalse($this->service->areInSameFamily($family1Root, $family2Root));
        $this->assertFalse($this->service->areInSameFamily($family1Child, $family2Child));
    }

    /** @test */
    public function it_validates_family_dependencies()
    {
        // Create two families
        $family1Order = ManufacturingOrder::factory()->create();
        $family1Route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $family1Order->id,
        ]);
        $family1Step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $family1Route->id,
        ]);

        $family2Order = ManufacturingOrder::factory()->create();
        $family2Route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $family2Order->id,
        ]);
        $family2Step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $family2Route->id,
            'depends_on_step_id' => $family1Step->id, // Cross-family dependency!
        ]);

        // Validate family 2 - should detect external dependency
        $familyMembers = collect([$family2Order]);
        $errors = $this->service->validateFamilyDependencies($familyMembers);

        $this->assertCount(1, $errors);
        $this->assertEquals('external_step_dependency', $errors[0]['type']);
        $this->assertEquals($family2Step->id, $errors[0]['step_id']);
        $this->assertEquals($family1Step->id, $errors[0]['dependency_id']);
    }

    /** @test */
    public function it_groups_orders_by_families_with_correct_priority()
    {
        // Family 1 with priority 100
        $family1Root = ManufacturingOrder::factory()->create(['priority' => 100]);
        $family1Child = ManufacturingOrder::factory()->create([
            'parent_id' => $family1Root->id,
            'priority' => 100,
        ]);

        // Family 2 with priority 200
        $family2Root = ManufacturingOrder::factory()->create(['priority' => 200]);

        // Family 3 with priority 50
        $family3Root = ManufacturingOrder::factory()->create(['priority' => 50]);

        $orders = collect([$family1Root, $family1Child, $family2Root, $family3Root]);
        $families = $this->service->groupOrdersByFamily($orders);

        $this->assertCount(3, $families);

        // Should be sorted by priority descending
        $this->assertEquals(200, $families[0]['priority']);
        $this->assertEquals(100, $families[1]['priority']);
        $this->assertEquals(50, $families[2]['priority']);

        // Family 1 should have 2 members
        $this->assertCount(2, $families[1]['members']);
    }

    /** @test */
    public function it_counts_family_steps_correctly()
    {
        $order1 = ManufacturingOrder::factory()->create();
        $route1 = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order1->id,
        ]);
        ManufacturingStep::factory()->count(3)->create([
            'manufacturing_route_id' => $route1->id,
        ]);

        $order2 = ManufacturingOrder::factory()->create(['parent_id' => $order1->id]);
        $route2 = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order2->id,
        ]);
        ManufacturingStep::factory()->count(2)->create([
            'manufacturing_route_id' => $route2->id,
        ]);

        $familyMembers = $this->service->getFamilyMembers($order1);
        $stepCount = $this->service->countFamilySteps($familyMembers);

        $this->assertEquals(5, $stepCount); // 3 + 2 steps
    }

    /** @test */
    public function it_gets_family_steps_in_hierarchy_order()
    {
        // Create parent order with 2 steps
        $parentOrder = ManufacturingOrder::factory()->create();
        $parentRoute = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $parentOrder->id,
        ]);
        $parentStep1 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $parentRoute->id,
            'display_order' => 1,
        ]);
        $parentStep2 = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $parentRoute->id,
            'display_order' => 2,
        ]);

        // Create child order with 1 step
        $childOrder = ManufacturingOrder::factory()->create([
            'parent_id' => $parentOrder->id,
        ]);
        $childRoute = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $childOrder->id,
        ]);
        $childStep = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $childRoute->id,
            'display_order' => 1,
        ]);

        $familyMembers = $this->service->getFamilyMembers($parentOrder);
        $orderedSteps = $this->service->getFamilyStepsInOrder($familyMembers);

        $this->assertCount(3, $orderedSteps);

        // Child steps should come first (lower hierarchy level)
        $this->assertEquals($childStep->id, $orderedSteps[0]->id);

        // Then parent steps in display order
        $this->assertEquals($parentStep1->id, $orderedSteps[1]->id);
        $this->assertEquals($parentStep2->id, $orderedSteps[2]->id);
    }
}

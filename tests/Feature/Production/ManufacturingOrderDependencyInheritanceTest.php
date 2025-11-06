<?php

namespace Tests\Feature\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomItem;
use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use App\Models\User;
use App\Services\Production\ManufacturingOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManufacturingOrderDependencyInheritanceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private ManufacturingOrderService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->service = new ManufacturingOrderService;
        $this->actingAs($this->user);
    }

    /** @test */
    public function it_inherits_release_dependency_configuration_to_child_orders()
    {
        // Create a category
        $category = ItemCategory::factory()->create();

        // Create items
        $parentItem = Item::factory()->create([
            'item_category_id' => $category->id,
            'can_be_manufactured' => true,
        ]);

        $childItem1 = Item::factory()->create([
            'item_category_id' => $category->id,
            'can_be_manufactured' => true,
        ]);

        $childItem2 = Item::factory()->create([
            'item_category_id' => $category->id,
            'can_be_manufactured' => true,
        ]);

        // Create BOM (factory automatically creates a version with root item)
        $bom = BillOfMaterial::factory()->create([
            'output_item_id' => $parentItem->id,
            'is_active' => true,
        ]);

        // Get the auto-created version and root item
        $bomVersion = $bom->currentVersion;
        $rootBomItem = $bomVersion->items()->whereNull('parent_item_id')->first();

        BomItem::factory()->create([
            'bom_version_id' => $bomVersion->id,
            'item_id' => $childItem1->id,
            'parent_item_id' => $rootBomItem->id,
            'quantity' => 2,
        ]);

        BomItem::factory()->create([
            'bom_version_id' => $bomVersion->id,
            'item_id' => $childItem2->id,
            'parent_item_id' => $rootBomItem->id,
            'quantity' => 3,
        ]);

        // Create parent order with release dependency configuration
        $parentOrder = $this->service->createOrderFromBom([
            'bill_of_material_id' => $bom->id,
            'quantity' => 10,
            'unit_of_measure' => 'EA',
            'priority' => 50,
            'source_type' => 'manual',
            'created_by' => $this->user->id,
            'can_release_before_children' => false, // Cannot release before children
        ]);

        // Load children
        $parentOrder->load('children');

        // Assert children were created
        $this->assertCount(2, $parentOrder->children);

        // Assert all children inherited the release dependency configuration
        foreach ($parentOrder->children as $childOrder) {
            $this->assertFalse($childOrder->can_release_before_children);
        }
    }

    /** @test */
    public function it_inherits_production_dependency_type_to_child_orders()
    {
        // Create items and BOM similar to above
        $category = ItemCategory::factory()->create();
        $parentItem = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);
        $childItem = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);

        $bom = BillOfMaterial::factory()->create(['output_item_id' => $parentItem->id, 'is_active' => true]);
        $bomVersion = $bom->currentVersion;

        $rootBomItem = $bomVersion->items()->whereNull('parent_item_id')->first();

        BomItem::factory()->create([
            'bom_version_id' => $bomVersion->id,
            'item_id' => $childItem->id,
            'parent_item_id' => $rootBomItem->id,
            'quantity' => 5,
        ]);

        // Test different dependency types
        $dependencyTypes = ['none', 'all_children_released', 'children_percentage'];

        foreach ($dependencyTypes as $depType) {
            $parentOrder = $this->service->createOrderFromBom([
                'bill_of_material_id' => $bom->id,
                'quantity' => 100,
                'unit_of_measure' => 'EA',
                'priority' => 50,
                'source_type' => 'manual',
                'created_by' => $this->user->id,
                'dependency_type' => $depType,
                'dependency_minimum_percentage' => $depType === 'children_percentage' ? 75 : 0,
            ]);

            $childOrder = $parentOrder->children()->first();

            // Assert child inherited the dependency type
            $this->assertEquals($depType, $childOrder->dependency_type);

            // For percentage type, assert the percentage is inherited
            if ($depType === 'children_percentage') {
                $this->assertEquals(75, $childOrder->dependency_minimum_percentage);
            }
        }
    }

    /** @test */
    public function it_calculates_proportional_quantity_for_quantity_based_dependencies()
    {
        // Create items and BOM
        $category = ItemCategory::factory()->create();
        $parentItem = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);
        $childItem1 = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);
        $childItem2 = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);

        $bom = BillOfMaterial::factory()->create(['output_item_id' => $parentItem->id, 'is_active' => true]);
        $bomVersion = $bom->currentVersion;

        $rootBomItem = $bomVersion->items()->whereNull('parent_item_id')->first();

        // Child 1: quantity 2 per parent
        BomItem::factory()->create([
            'bom_version_id' => $bomVersion->id,
            'item_id' => $childItem1->id,
            'parent_item_id' => $rootBomItem->id,
            'quantity' => 2,
        ]);

        // Child 2: quantity 5 per parent
        BomItem::factory()->create([
            'bom_version_id' => $bomVersion->id,
            'item_id' => $childItem2->id,
            'parent_item_id' => $rootBomItem->id,
            'quantity' => 5,
        ]);

        // Create parent order with quantity-based dependency
        $parentOrder = $this->service->createOrderFromBom([
            'bill_of_material_id' => $bom->id,
            'quantity' => 100,
            'unit_of_measure' => 'EA',
            'priority' => 50,
            'source_type' => 'manual',
            'created_by' => $this->user->id,
            'dependency_type' => 'children_quantity',
            'dependency_minimum_quantity' => 20, // Parent requires 20 units minimum
        ]);

        $children = $parentOrder->children()->orderBy('item_id')->get();

        // Child 1 has quantity 200 (100 * 2)
        // Proportion = 200/100 = 2
        // Expected minimum = 20 * 2 = 40
        $this->assertEquals(200, $children[0]->quantity);
        $this->assertEquals(40, $children[0]->dependency_minimum_quantity);

        // Child 2 has quantity 500 (100 * 5)
        // Proportion = 500/100 = 5
        // Expected minimum = 20 * 5 = 100
        $this->assertEquals(500, $children[1]->quantity);
        $this->assertEquals(100, $children[1]->dependency_minimum_quantity);
    }

    /** @test */
    public function it_ensures_minimum_quantity_of_one_for_small_proportions()
    {
        // Create items and BOM
        $category = ItemCategory::factory()->create();
        $parentItem = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);
        $childItem = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);

        $bom = BillOfMaterial::factory()->create(['output_item_id' => $parentItem->id, 'is_active' => true]);
        $bomVersion = $bom->currentVersion;

        $rootBomItem = $bomVersion->items()->whereNull('parent_item_id')->first();

        // Child with very small quantity
        BomItem::factory()->create([
            'bom_version_id' => $bomVersion->id,
            'item_id' => $childItem->id,
            'parent_item_id' => $rootBomItem->id,
            'quantity' => 0.1, // 0.1 per parent
        ]);

        // Create parent order with quantity-based dependency
        $parentOrder = $this->service->createOrderFromBom([
            'bill_of_material_id' => $bom->id,
            'quantity' => 10,
            'unit_of_measure' => 'EA',
            'priority' => 50,
            'source_type' => 'manual',
            'created_by' => $this->user->id,
            'dependency_type' => 'children_quantity',
            'dependency_minimum_quantity' => 5,
        ]);

        $childOrder = $parentOrder->children()->first();

        // Child has quantity 1 (10 * 0.1)
        // Proportion = 1/10 = 0.1
        // Calculated minimum = 5 * 0.1 = 0.5, but should be rounded to 1
        $this->assertEquals(1, $childOrder->quantity);
        $this->assertEquals(1, $childOrder->dependency_minimum_quantity);
    }

    /** @test */
    public function it_propagates_dependencies_through_multi_level_bom_hierarchy()
    {
        // Create a 3-level BOM hierarchy
        $category = ItemCategory::factory()->create();

        $level1Item = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);
        $level2Item = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);
        $level3Item = Item::factory()->create(['item_category_id' => $category->id, 'can_be_manufactured' => true]);

        // Level 1 BOM
        $bom1 = BillOfMaterial::factory()->create(['output_item_id' => $level1Item->id, 'is_active' => true]);
        $bomVersion1 = $bom1->currentVersion;

        $rootBomItem1 = $bomVersion1->items()->whereNull('parent_item_id')->first();

        BomItem::factory()->create([
            'bom_version_id' => $bomVersion1->id,
            'item_id' => $level2Item->id,
            'parent_item_id' => $rootBomItem1->id,
            'quantity' => 2,
        ]);

        // Level 2 BOM
        $bom2 = BillOfMaterial::factory()->create(['output_item_id' => $level2Item->id, 'is_active' => true]);
        $bomVersion2 = $bom2->currentVersion;

        $rootBomItem2 = $bomVersion2->items()->whereNull('parent_item_id')->first();

        BomItem::factory()->create([
            'bom_version_id' => $bomVersion2->id,
            'item_id' => $level3Item->id,
            'parent_item_id' => $rootBomItem2->id,
            'quantity' => 3,
        ]);

        // Create top-level order with dependencies
        $topOrder = $this->service->createOrderFromBom([
            'bill_of_material_id' => $bom1->id,
            'quantity' => 10,
            'unit_of_measure' => 'EA',
            'priority' => 50,
            'source_type' => 'manual',
            'created_by' => $this->user->id,
            'dependency_type' => 'children_percentage',
            'dependency_minimum_percentage' => 80,
            'can_release_before_children' => false,
        ]);

        // Load all descendants
        $topOrder->load(['children.children']);

        // Check level 2 order
        $level2Order = $topOrder->children()->first();
        $this->assertEquals('children_percentage', $level2Order->dependency_type);
        $this->assertEquals(80, $level2Order->dependency_minimum_percentage);
        $this->assertFalse($level2Order->can_release_before_children);

        // Check level 3 order
        $level3Order = $level2Order->children()->first();
        $this->assertEquals('children_percentage', $level3Order->dependency_type);
        $this->assertEquals(80, $level3Order->dependency_minimum_percentage);
        $this->assertFalse($level3Order->can_release_before_children);
    }
}

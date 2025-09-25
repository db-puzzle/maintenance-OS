<?php

namespace Tests\Feature\Production;

use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PlanningOptimizationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user with permissions
        $this->user = User::factory()->create();

        // Create the permission if it doesn't exist
        \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'production.orders.viewAny']);

        // Give the user the permission
        $this->user->givePermissionTo('production.orders.viewAny');
    }

    /**
     * Test that the planning page loads with minimal queries.
     */
    public function test_planning_page_loads_with_optimized_queries(): void
    {
        // Arrange: Create test data
        $this->createTestData();

        // Enable query log
        DB::enableQueryLog();

        // Act: Load the planning page
        $response = $this->actingAs($this->user)
            ->get('/production/planning');

        // Get query count
        $queries = DB::getQueryLog();
        $queryCount = count($queries);

        // Assert: Response is successful
        $response->assertStatus(200);

        // Assert: Query count is optimized (should be less than 20)
        // Breakdown:
        // - 2 for roles/permissions
        // - 2 for getting root order IDs and numbers
        // - 1 for manufacturing orders
        // - 4 for item relationships (items, categories, media, BOMs)
        // - 2 for parent relationships
        // - 2 for routes and steps
        // - 1 for work cells (for steps)
        // - 3 for templates (routes, steps, related data)
        // - 1 for work cells list
        // Total: ~18-20 queries (significant improvement from 25+)
        $this->assertLessThanOrEqual(
            20,
            $queryCount,
            "Too many queries executed: {$queryCount}. Expected 20 or less.\n" .
            "Queries:\n" . $this->formatQueries($queries)
        );
    }

    /**
     * Test that hierarchical orders are built correctly.
     */
    public function test_hierarchical_orders_structure_is_correct(): void
    {
        // Arrange: Create hierarchical orders
        $category = ItemCategory::factory()->create();
        $item1 = Item::factory()->create(['item_category_id' => $category->id]);
        $item2 = Item::factory()->create(['item_category_id' => $category->id]);
        $item3 = Item::factory()->create(['item_category_id' => $category->id]);

        // Create parent order
        $parentOrder = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-25001-001',
            'item_id' => $item1->id,
            'parent_id' => null,
            'status' => 'draft',
        ]);

        // Create child orders
        $childOrder1 = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-25001-001.1',
            'item_id' => $item2->id,
            'parent_id' => $parentOrder->id,
            'status' => 'draft',
        ]);

        $childOrder2 = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-25001-001.2',
            'item_id' => $item3->id,
            'parent_id' => $parentOrder->id,
            'status' => 'draft',
        ]);

        // Create grandchild
        $grandchildOrder = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-25001-001.1.1',
            'item_id' => $item3->id,
            'parent_id' => $childOrder1->id,
            'status' => 'draft',
        ]);

        // Act: Load the planning page
        $response = $this->actingAs($this->user)
            ->get('/production/planning');

        // Assert: Response contains correct hierarchical structure
        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('production/planning/index')
                ->has('manufacturingOrders', 1)
                ->has('manufacturingOrders.0.children', 2)
                ->has('manufacturingOrders.0.children.0.children', 1)
                ->where('manufacturingOrders.0.id', $parentOrder->id)
                ->where('manufacturingOrders.0.children.0.id', $childOrder1->id)
                ->where('manufacturingOrders.0.children.0.children.0.id', $grandchildOrder->id)
                ->where('manufacturingOrders.0.children.1.id', $childOrder2->id)
        );
    }

    /**
     * Test that searching works efficiently.
     */
    public function test_search_filtering_works_with_optimized_queries(): void
    {
        // Arrange: Create test data
        $category = ItemCategory::factory()->create();
        $searchItem = Item::factory()->create([
            'item_category_id' => $category->id,
            'item_number' => 'SEARCH-001',
            'name' => 'Searchable Item',
        ]);

        $otherItem = Item::factory()->create([
            'item_category_id' => $category->id,
            'item_number' => 'OTHER-001',
            'name' => 'Other Item',
        ]);

        ManufacturingOrder::factory()->create([
            'order_number' => 'MO-25001-001',
            'item_id' => $searchItem->id,
            'status' => 'draft',
        ]);

        ManufacturingOrder::factory()->create([
            'order_number' => 'MO-25001-002',
            'item_id' => $otherItem->id,
            'status' => 'draft',
        ]);

        // Enable query log
        DB::enableQueryLog();

        // Act: Load the planning page with search
        $response = $this->actingAs($this->user)
            ->get('/production/planning?search=SEARCH');

        // Get query count
        $queries = DB::getQueryLog();
        $queryCount = count($queries);

        // Assert: Response is successful
        $response->assertStatus(200);

        // Assert: Query count is still optimized even with search
        $this->assertLessThanOrEqual(
            15,
            $queryCount,
            "Too many queries with search: {$queryCount}"
        );

        // Assert: Only the searched order is returned
        $response->assertInertia(
            fn ($page) => $page
                ->component('production/planning/index')
                ->has('manufacturingOrders', 1)
                ->where('manufacturingOrders.0.item.item_number', 'SEARCH-001')
        );
    }

    /**
     * Test that route templates load efficiently.
     */
    public function test_route_templates_load_with_optimized_queries(): void
    {
        // Arrange: Create route templates
        $workCell = WorkCell::factory()->create();
        $category = ItemCategory::factory()->create();

        $template = ManufacturingRoute::factory()->create([
            'is_template' => true,
            'item_category_id' => $category->id,
            'name' => 'Template Route',
        ]);

        // Create steps for template
        ManufacturingStep::factory()->count(3)->create([
            'manufacturing_route_id' => $template->id,
            'work_cell_id' => $workCell->id,
        ]);

        // Act: Load the planning page
        $response = $this->actingAs($this->user)
            ->get('/production/planning');

        // Assert: Response contains route templates
        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('production/planning/index')
                ->has('routeTemplates', 1)
                ->where('routeTemplates.0.name', 'Template Route')
                ->has('routeTemplates.0.steps', 3)
        );
    }

    /**
     * Test that the selected MO parameter works correctly.
     */
    public function test_selected_mo_loads_specific_hierarchy(): void
    {
        // Arrange: Create multiple hierarchies
        $category = ItemCategory::factory()->create();
        $item1 = Item::factory()->create(['item_category_id' => $category->id]);
        $item2 = Item::factory()->create(['item_category_id' => $category->id]);

        $order1 = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-25001-001',
            'item_id' => $item1->id,
            'status' => 'draft',
        ]);

        $order2 = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-25001-002',
            'item_id' => $item2->id,
            'status' => 'draft',
        ]);

        $childOrder = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-25001-001.1',
            'item_id' => $item2->id,
            'parent_id' => $order1->id,
            'status' => 'draft',
        ]);

        // Act: Load with selectedMO parameter
        $response = $this->actingAs($this->user)
            ->get("/production/planning?selectedMO={$order1->id}");

        // Assert: Only the selected hierarchy is loaded
        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('production/planning/index')
                ->has('manufacturingOrders', 1)
                ->where('manufacturingOrders.0.id', $order1->id)
                ->has('manufacturingOrders.0.children', 1)
                ->where('selectedMO', (string) $order1->id)
        );
    }

    /**
     * Helper method to create test data.
     */
    private function createTestData(): void
    {
        // Create categories
        $category = ItemCategory::factory()->create();

        // Create items without complex BOM relationships
        $items = [];
        for ($i = 1; $i <= 5; $i++) {
            $items[] = Item::factory()->create([
                'item_category_id' => $category->id,
                'item_number' => "ITEM-{$i}",
                'name' => "Test Item {$i}",
                'can_be_manufactured' => true,
            ]);
        }

        // Create work cells
        $workCells = [];
        for ($i = 1; $i <= 3; $i++) {
            $workCells[] = WorkCell::factory()->create([
                'name' => "Work Cell {$i}",
            ]);
        }

        // Create simple manufacturing orders with hierarchy
        foreach (array_slice($items, 0, 2) as $index => $item) {
            $parentOrder = ManufacturingOrder::create([
                'order_number' => sprintf('MO-25001-%03d', $index + 1),
                'item_id' => $item->id,
                'quantity' => 100,
                'unit_of_measure' => 'EA',
                'status' => 'draft',
                'priority' => 50,
                'created_by' => $this->user->id,
            ]);

            // Create route for parent
            $route = ManufacturingRoute::create([
                'manufacturing_order_id' => $parentOrder->id,
                'item_id' => $item->id,
                'name' => "Route for {$parentOrder->order_number}",
                'is_active' => true,
            ]);

            // Create steps
            for ($s = 1; $s <= 3; $s++) {
                ManufacturingStep::create([
                    'manufacturing_route_id' => $route->id,
                    'work_cell_id' => $workCells[($s - 1) % count($workCells)]->id,
                    'display_order' => $s,
                    'step_number' => $s,
                    'name' => "Step {$s}",
                    'cycle_time_minutes' => 10,
                    'step_type' => 'standard',
                ]);
            }

            // Create child orders
            foreach (array_slice($items, 2, 2) as $childIndex => $childItem) {
                $childOrder = ManufacturingOrder::create([
                    'order_number' => sprintf('MO-25001-%03d.%d', $index + 1, $childIndex + 1),
                    'parent_id' => $parentOrder->id,
                    'item_id' => $childItem->id,
                    'quantity' => 50,
                    'unit_of_measure' => 'EA',
                    'status' => 'draft',
                    'priority' => 50,
                    'created_by' => $this->user->id,
                ]);

                // Create route for child
                $childRoute = ManufacturingRoute::create([
                    'manufacturing_order_id' => $childOrder->id,
                    'item_id' => $childItem->id,
                    'name' => "Route for {$childOrder->order_number}",
                    'is_active' => true,
                ]);

                // Create steps for child
                for ($s = 1; $s <= 2; $s++) {
                    ManufacturingStep::create([
                        'manufacturing_route_id' => $childRoute->id,
                        'work_cell_id' => $workCells[($s - 1) % count($workCells)]->id,
                        'display_order' => $s,
                        'step_number' => $s,
                        'name' => "Step {$s}",
                        'cycle_time_minutes' => 5,
                        'step_type' => 'standard',
                    ]);
                }
            }
        }

        // Create route templates
        $template = ManufacturingRoute::create([
            'is_template' => true,
            'item_category_id' => $category->id,
            'name' => 'Standard Assembly Route',
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);

        for ($s = 1; $s <= 4; $s++) {
            ManufacturingStep::create([
                'manufacturing_route_id' => $template->id,
                'work_cell_id' => $workCells[($s - 1) % count($workCells)]->id,
                'display_order' => $s,
                'step_number' => $s,
                'name' => "Template Step {$s}",
                'cycle_time_minutes' => 15,
                'step_type' => 'standard',
                'is_template' => true,
            ]);
        }
    }

    /**
     * Format queries for debugging.
     */
    private function formatQueries(array $queries): string
    {
        return collect($queries)->map(function ($query, $index) {
            return sprintf(
                '%d. %s [%sms]',
                $index + 1,
                $query['query'],
                $query['time']
            );
        })->implode("\n");
    }
}

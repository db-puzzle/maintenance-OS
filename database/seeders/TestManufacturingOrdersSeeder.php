<?php

namespace Database\Seeders;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use Illuminate\Database\Seeder;

class TestManufacturingOrdersSeeder extends Seeder
{
    public function run()
    {
        // Ensure we have work cells
        $workCells = WorkCell::all();
        if ($workCells->isEmpty()) {
            $workCells = collect([
                WorkCell::create(['name' => 'Work Cell 1', 'code' => 'WC-001']),
                WorkCell::create(['name' => 'Work Cell 2', 'code' => 'WC-002']),
                WorkCell::create(['name' => 'Work Cell 3', 'code' => 'WC-003']),
            ]);
        }

        // Ensure we have items
        $items = Item::all();
        if ($items->isEmpty()) {
            $items = collect([
                Item::create(['code' => 'PROD-001', 'name' => 'Product 1', 'description' => 'Test Product 1']),
                Item::create(['code' => 'PROD-002', 'name' => 'Product 2', 'description' => 'Test Product 2']),
                Item::create(['code' => 'PROD-003', 'name' => 'Product 3', 'description' => 'Test Product 3']),
            ]);
        }

        // Create Family 1: Parent with 2 children
        $parentOrder1 = ManufacturingOrder::create([
            'order_number' => 'MO-2024-001',
            'item_id' => $items->first()->id,
            'quantity' => 100,
            'status' => 'planned',
            'priority' => 100,
            'requested_date' => now()->addDays(7),
        ]);

        $this->createRouteWithSteps($parentOrder1, $workCells->random(2));

        // Child 1
        $childOrder1 = ManufacturingOrder::create([
            'order_number' => 'MO-2024-001.1',
            'parent_id' => $parentOrder1->id,
            'item_id' => $items->get(1)->id,
            'quantity' => 50,
            'status' => 'planned',
            'priority' => 100,
            'requested_date' => now()->addDays(7),
        ]);

        $this->createRouteWithSteps($childOrder1, $workCells->random(2));

        // Child 2
        $childOrder2 = ManufacturingOrder::create([
            'order_number' => 'MO-2024-001.2',
            'parent_id' => $parentOrder1->id,
            'item_id' => $items->get(2)->id,
            'quantity' => 50,
            'status' => 'planned',
            'priority' => 100,
            'requested_date' => now()->addDays(7),
        ]);

        $this->createRouteWithSteps($childOrder2, $workCells->random(2));

        // Create Family 2: Single parent order
        $parentOrder2 = ManufacturingOrder::create([
            'order_number' => 'MO-2024-002',
            'item_id' => $items->get(2)->id,
            'quantity' => 200,
            'status' => 'released',
            'priority' => 150,
            'requested_date' => now()->addDays(5),
        ]);

        $this->createRouteWithSteps($parentOrder2, $workCells->random(3));

        // Create standalone order
        $standaloneOrder = ManufacturingOrder::create([
            'order_number' => 'MO-2024-003',
            'item_id' => $items->first()->id,
            'quantity' => 75,
            'status' => 'planned',
            'priority' => 50,
            'requested_date' => now()->addDays(10),
        ]);

        $this->createRouteWithSteps($standaloneOrder, $workCells->random(2));

        $this->command->info('Test manufacturing orders created successfully!');
    }

    private function createRouteWithSteps(ManufacturingOrder $order, $workCells)
    {
        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => "Route for {$order->order_number}",
            'is_template' => false,
            'is_active' => true,
            'version' => 1,
        ]);

        $previousStepId = null;
        $stepCount = rand(2, 4);

        for ($i = 1; $i <= $stepCount; $i++) {
            $step = ManufacturingStep::create([
                'manufacturing_route_id' => $route->id,
                'work_cell_id' => $workCells->random()->id,
                'name' => "Step {$i} - {$order->order_number}",
                'description' => "Manufacturing step {$i}",
                'display_order' => $i,
                'setup_time_minutes' => rand(15, 60),
                'cycle_time_minutes' => rand(1, 5),
                'status' => 'pending',
                'depends_on_step_id' => $previousStepId,
                'dependency_start_condition' => $previousStepId ? 'completed' : null,
            ]);

            // Add percentage-based gate for some steps
            if ($previousStepId && rand(0, 2) === 1) {
                $step->update([
                    'dependency_start_condition' => 'percentage_based',
                    'dependency_minimum_percentage' => rand(50, 80),
                ]);
            }

            $previousStepId = $step->id;
        }
    }
}

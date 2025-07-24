<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Production\Item;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomVersion;
use App\Models\Production\BomItem;
use App\Models\Production\WorkCell;
use App\Models\Production\ProductionRouting;
use App\Models\Production\RoutingStep;
use App\Models\Production\ProductionOrder;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\ProductionExecution;
use App\Models\Production\QrTracking;
use App\Models\Production\Shipment;
use App\Models\Production\ShipmentItem;
use App\Models\Production\ShipmentPhoto;
use App\Models\Production\ItemBomHistory;

class ProductionTestDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating production test data...');
        
        // Clean up existing data in reverse dependency order
        DB::statement('SET CONSTRAINTS ALL DEFERRED');
        
        ShipmentPhoto::query()->delete();
        ShipmentItem::query()->delete();
        Shipment::query()->delete();
        QrTracking::query()->delete();
        ProductionExecution::query()->delete();
        ProductionSchedule::query()->delete();
        ProductionOrder::query()->delete();
        RoutingStep::query()->delete();
        ProductionRouting::query()->delete();
        BomItem::query()->delete();
        BomVersion::query()->delete();
        ItemBomHistory::query()->delete();
        BillOfMaterial::query()->delete();
        Item::query()->delete();
        WorkCell::query()->delete();
        
        DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
        
        // Create work cells
        $this->command->info('Creating work cells...');
        $workCells = collect([
            WorkCell::factory()->internal()->create(['name' => 'CNC Machining Cell 1', 'code' => 'CNC-01']),
            WorkCell::factory()->internal()->create(['name' => 'Assembly Station A', 'code' => 'ASM-01']),
            WorkCell::factory()->internal()->create(['name' => 'Welding Bay 1', 'code' => 'WLD-01']),
            WorkCell::factory()->internal()->create(['name' => 'Quality Inspection', 'code' => 'QC-01']),
            WorkCell::factory()->internal()->create(['name' => 'Packaging Line 1', 'code' => 'PKG-01']),
            WorkCell::factory()->external()->create(['name' => 'External Heat Treatment', 'code' => 'EXT-01']),
        ]);

        // Create items
        $this->command->info('Creating items...');
        
        // Create raw materials (purchased items)
        $rawMaterials = Item::factory(10)->purchasable()->create(['category' => 'Raw Material']);
        
        // Create components (manufactured items)
        $components = Item::factory(15)->manufacturable()->create(['category' => 'Component']);
        
        // Create sub-assemblies
        $subAssemblies = Item::factory(8)->manufacturable()->sellable()->create(['category' => 'Sub-Assembly']);
        
        // Create finished goods
        $finishedGoods = Item::factory(5)->manufacturable()->sellable()->create(['category' => 'Finished Good']);

        // Create a complex BOM structure for a finished good
        $this->command->info('Creating BOM structures...');
        
        $mainItem = $finishedGoods->first();
        $mainBom = BillOfMaterial::factory()->create([
            'name' => $mainItem->name . ' BOM',
            'description' => 'Main assembly BOM for ' . $mainItem->name,
        ]);
        
        // Assign BOM to item
        $mainItem->update(['current_bom_id' => $mainBom->id]);
        $mainItem->bomHistory()->create([
            'bill_of_material_id' => $mainBom->id,
            'effective_from' => now(),
            'approved_by' => User::first()->id,
            'change_reason' => 'Initial BOM assignment',
        ]);

        // Get the current version of the BOM
        $bomVersion = $mainBom->currentVersion;

        // Create BOM items hierarchy
        // Level 1 - Sub-assemblies
        $level1Items = [];
        foreach ($subAssemblies->take(3) as $index => $subAssembly) {
            $level1Items[] = BomItem::factory()->assembly()->create([
                'bom_version_id' => $bomVersion->id,
                'item_id' => $subAssembly->id,
                'level' => 1,
                'sequence_number' => $index + 1,
            ]);
        }

        // Level 2 - Components under each sub-assembly
        foreach ($level1Items as $parentItem) {
            foreach ($components->random(4) as $index => $component) {
                BomItem::factory()->create([
                    'bom_version_id' => $bomVersion->id,
                    'parent_item_id' => $parentItem->id,
                    'item_id' => $component->id,
                    'level' => 2,
                    'sequence_number' => $index + 1,
                ]);
            }
        }

        // Create production routings
        $this->command->info('Creating production routings...');
        
        // Create routing for the main assembly
        $mainRouting = ProductionRouting::factory()->defined()->create([
            'bom_item_id' => $bomVersion->items()->whereNull('parent_item_id')->first()->id,
            'name' => 'Main Assembly Routing',
        ]);

        // Create production orders
        $this->command->info('Creating production orders...');
        
        // Create orders in various states
        ProductionOrder::factory()->draft()->create([
            'item_id' => $mainItem->id,
            'bill_of_material_id' => $mainBom->id,
        ]);

        ProductionOrder::factory()->scheduled()->create([
            'item_id' => $mainItem->id,
            'bill_of_material_id' => $mainBom->id,
        ]);

        $inProgressOrder = ProductionOrder::factory()->inProgress()->create([
            'item_id' => $mainItem->id,
            'bill_of_material_id' => $mainBom->id,
        ]);

        // Create production schedules for the in-progress order
        $this->command->info('Creating production schedules...');
        
        foreach ($mainRouting->steps as $step) {
            ProductionSchedule::factory()
                ->state(['status' => fake()->randomElement(['scheduled', 'ready', 'in_progress', 'completed'])])
                ->create([
                    'production_order_id' => $inProgressOrder->id,
                    'routing_step_id' => $step->id,
                    'work_cell_id' => $step->work_cell_id,
                ]);
        }

        // Create completed orders with shipments
        $this->command->info('Creating completed orders with shipments...');
        
        $completedOrders = ProductionOrder::factory(3)->completed()->create([
                            'item_id' => Item::factory()->manufacturable(),
            'bill_of_material_id' => BillOfMaterial::factory(),
        ]);

        foreach ($completedOrders as $completedOrder) {
            // Create a shipment for the completed order
            $shipment = Shipment::factory()
                ->delivered()
                ->create();

            // Add items to shipment
            ShipmentItem::factory()
                ->count(3)
                ->for($shipment)
                ->create([
                    'production_order_id' => $completedOrder->id,
                ]);

            // Add photos
            ShipmentPhoto::factory()
                ->packagePhoto()
                ->for($shipment)
                ->create();

            ShipmentPhoto::factory()
                ->loadingPhoto()
                ->for($shipment)
                ->create();
        }

        // Create QR tracking events
        $this->command->info('Creating QR tracking events...');
        
        QrTracking::factory(50)->create();
        
        // Create specific tracking events for the in-progress order
        QrTracking::factory()->startProduction()->create([
            'trackable_type' => ProductionOrder::class,
            'trackable_id' => $inProgressOrder->id,
            'qr_code' => $inProgressOrder->qr_code ?? 'QR-' . $inProgressOrder->order_number,
        ]);

        $this->command->info('Production test data created successfully!');
        $this->command->info('Summary:');
        $this->command->table(
            ['Entity', 'Count'],
            [
                ['Products', Product::count()],
                ['BOMs', BillOfMaterial::count()],
                ['Work Cells', WorkCell::count()],
                ['Production Orders', ProductionOrder::count()],
                ['Shipments', Shipment::count()],
                ['QR Tracking Events', QrTracking::count()],
            ]
        );
    }
} 
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
        $this->command->info('Creating bicycle production test data...');
        
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
        
        // Get the first user as creator
        $creator = User::first();
        
        // Create work cells for bicycle manufacturing
        $this->command->info('Creating work cells...');
        $workCells = [
            'frame' => WorkCell::factory()->create([
                'code' => 'FRAME-01',
                'name' => 'Frame Welding Station',
                'cell_type' => 'internal',
                'created_at' => now(),
            ]),
            'wheel' => WorkCell::factory()->create([
                'code' => 'WHEEL-01',
                'name' => 'Wheel Assembly Station',
                'cell_type' => 'internal',
                'created_at' => now(),
            ]),
            'painting' => WorkCell::factory()->create([
                'code' => 'PAINT-01',
                'name' => 'Painting Booth',
                'cell_type' => 'internal',
                'created_at' => now(),
            ]),
            'assembly' => WorkCell::factory()->create([
                'code' => 'ASSY-01',
                'name' => 'Final Assembly Line',
                'cell_type' => 'internal',
                'created_at' => now(),
            ]),
            'quality' => WorkCell::factory()->create([
                'code' => 'QC-01',
                'name' => 'Quality Control Station',
                'cell_type' => 'internal',
                'created_at' => now(),
            ]),
            'packaging' => WorkCell::factory()->create([
                'code' => 'PACK-01',
                'name' => 'Packaging Station',
                'cell_type' => 'internal',
                'created_at' => now(),
            ]),
        ];

        // Create items - Raw Materials and Purchased Components
        $this->command->info('Creating purchased components and raw materials...');
        
        // Frame components (purchased)
        $frameTubes = Item::create([
            'item_number' => 'TUBE-AL-001',
            'name' => 'Aluminum Frame Tube Set',
            'description' => 'Set of aluminum tubes for frame construction',
            'category' => 'Raw Materials',
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'SET',
            'weight' => 2.5,
            'cost' => 45.00,
            'lead_time_days' => 7,
            'preferred_vendor' => 'Aluminum Supplies Co.',
            'vendor_item_number' => 'AL-TUBE-B100',
            'created_by' => $creator->id,
        ]);

        // Wheel components
        $wheelRim = Item::create([
            'item_number' => 'RIM-26-AL',
            'name' => '26" Aluminum Wheel Rim',
            'description' => '26 inch aluminum wheel rim',
            'category' => 'Wheel Components',
            'item_type' => 'purchased',
            'can_be_sold' => true, // Can be sold as spare part
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.5,
            'cost' => 15.00,
            'list_price' => 35.00,
            'lead_time_days' => 5,
            'preferred_vendor' => 'Wheel Components Ltd.',
            'vendor_item_number' => 'RIM-26-STD',
            'created_by' => $creator->id,
        ]);

        $spokes = Item::create([
            'item_number' => 'SPOKE-SS-260',
            'name' => 'Stainless Steel Spokes 260mm',
            'description' => 'Stainless steel spokes, 260mm length with nipples',
            'category' => 'Wheel Components',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'SET',
            'weight' => 0.2,
            'cost' => 8.00,
            'list_price' => 15.00,
            'lead_time_days' => 3,
            'preferred_vendor' => 'Spoke Masters Inc.',
            'vendor_item_number' => 'SPOKE-260-36',
            'created_by' => $creator->id,
        ]);

        $wheelHub = Item::create([
            'item_number' => 'HUB-QR-F',
            'name' => 'Quick Release Front Hub',
            'description' => 'Quick release front wheel hub',
            'category' => 'Wheel Components',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.3,
            'cost' => 12.00,
            'list_price' => 25.00,
            'lead_time_days' => 5,
            'created_by' => $creator->id,
        ]);

        $tire = Item::create([
            'item_number' => 'TIRE-26-MTB',
            'name' => '26" Mountain Bike Tire',
            'description' => '26x2.1 mountain bike tire',
            'category' => 'Wheel Components',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.7,
            'cost' => 18.00,
            'list_price' => 40.00,
            'lead_time_days' => 3,
            'preferred_vendor' => 'Tire World Distributors',
            'created_by' => $creator->id,
        ]);

        $innerTube = Item::create([
            'item_number' => 'TUBE-26-INNER',
            'name' => '26" Inner Tube',
            'description' => '26x2.1 inner tube with Schrader valve',
            'category' => 'Wheel Components',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.2,
            'cost' => 4.00,
            'list_price' => 12.00,
            'lead_time_days' => 2,
            'created_by' => $creator->id,
        ]);

        // Drivetrain components
        $chainset = Item::create([
            'item_number' => 'CHAINSET-3X8',
            'name' => 'Triple Chainset 48/38/28T',
            'description' => 'Triple chainset with cranks, 48/38/28 teeth',
            'category' => 'Drivetrain',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'SET',
            'weight' => 0.9,
            'cost' => 35.00,
            'list_price' => 75.00,
            'lead_time_days' => 7,
            'created_by' => $creator->id,
        ]);

        $chain = Item::create([
            'item_number' => 'CHAIN-8SP',
            'name' => '8-Speed Chain',
            'description' => '116 link 8-speed chain',
            'category' => 'Drivetrain',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.3,
            'cost' => 12.00,
            'list_price' => 25.00,
            'lead_time_days' => 3,
            'created_by' => $creator->id,
        ]);

        $derailleur = Item::create([
            'item_number' => 'DERAIL-R-8SP',
            'name' => 'Rear Derailleur 8-Speed',
            'description' => '8-speed rear derailleur',
            'category' => 'Drivetrain',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.25,
            'cost' => 28.00,
            'list_price' => 55.00,
            'lead_time_days' => 5,
            'created_by' => $creator->id,
        ]);

        // Control components
        $handlebar = Item::create([
            'item_number' => 'HBAR-MTB-680',
            'name' => 'MTB Handlebar 680mm',
            'description' => 'Mountain bike handlebar, 680mm width',
            'category' => 'Controls',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.3,
            'cost' => 18.00,
            'list_price' => 40.00,
            'lead_time_days' => 4,
            'created_by' => $creator->id,
        ]);

        $brakeLever = Item::create([
            'item_number' => 'BRAKE-LEVER-V',
            'name' => 'V-Brake Lever Set',
            'description' => 'Pair of V-brake levers with cables',
            'category' => 'Controls',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'SET',
            'weight' => 0.2,
            'cost' => 15.00,
            'list_price' => 30.00,
            'lead_time_days' => 3,
            'created_by' => $creator->id,
        ]);

        $saddle = Item::create([
            'item_number' => 'SADDLE-COMFORT',
            'name' => 'Comfort Saddle',
            'description' => 'Ergonomic comfort saddle',
            'category' => 'Seating',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.4,
            'cost' => 22.00,
            'list_price' => 45.00,
            'lead_time_days' => 5,
            'created_by' => $creator->id,
        ]);

        $seatpost = Item::create([
            'item_number' => 'SPOST-27.2-350',
            'name' => 'Seatpost 27.2mm x 350mm',
            'description' => 'Aluminum seatpost, 27.2mm diameter, 350mm length',
            'category' => 'Seating',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.25,
            'cost' => 12.00,
            'list_price' => 25.00,
            'lead_time_days' => 3,
            'created_by' => $creator->id,
        ]);

        // Create manufactured sub-assemblies
        $this->command->info('Creating manufactured sub-assemblies...');

        // Front wheel assembly
        $frontWheel = Item::create([
            'item_number' => 'WHEEL-F-26-ASSY',
            'name' => 'Front Wheel Assembly 26"',
            'description' => 'Complete 26" front wheel assembly with tire',
            'category' => 'Sub-Assemblies',
            'item_type' => 'manufactured',
            'can_be_sold' => true, // Can be sold as spare
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 2.2,
            'cost' => 57.00, // Will be calculated from BOM
            'list_price' => 120.00,
            'lead_time_days' => 2,
            'created_by' => $creator->id,
        ]);

        // Rear wheel assembly (similar to front but with different hub)
        $rearWheelHub = Item::create([
            'item_number' => 'HUB-QR-R-8SP',
            'name' => 'Quick Release Rear Hub 8-Speed',
            'description' => 'Quick release rear wheel hub for 8-speed cassette',
            'category' => 'Wheel Components',
            'item_type' => 'purchased',
            'can_be_sold' => true,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 0.4,
            'cost' => 18.00,
            'list_price' => 35.00,
            'lead_time_days' => 5,
            'created_by' => $creator->id,
        ]);

        $rearWheel = Item::create([
            'item_number' => 'WHEEL-R-26-ASSY',
            'name' => 'Rear Wheel Assembly 26"',
            'description' => 'Complete 26" rear wheel assembly with tire and 8-speed cassette',
            'category' => 'Sub-Assemblies',
            'item_type' => 'manufactured',
            'can_be_sold' => true,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 2.5,
            'cost' => 63.00,
            'list_price' => 135.00,
            'lead_time_days' => 2,
            'created_by' => $creator->id,
        ]);

        // Painted frame assembly
        $paintedFrame = Item::create([
            'item_number' => 'FRAME-MTB-M-PAINTED',
            'name' => 'Painted MTB Frame - Medium',
            'description' => 'Medium size mountain bike frame, welded and painted',
            'category' => 'Sub-Assemblies',
            'item_type' => 'manufactured',
            'can_be_sold' => true,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 2.8,
            'cost' => 65.00,
            'list_price' => 150.00,
            'lead_time_days' => 3,
            'created_by' => $creator->id,
        ]);

        // Complete bicycle (finished product)
        $bicycle = Item::create([
            'item_number' => 'BIKE-MTB-SPORT-26',
            'name' => 'Mountain Bike Sport 26"',
            'description' => 'Complete 26" mountain bike with 24-speed drivetrain',
            'category' => 'Finished Products',
            'item_type' => 'manufactured',
            'can_be_sold' => true,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'EA',
            'weight' => 13.5,
            'cost' => 285.00,
            'list_price' => 599.99,
            'lead_time_days' => 5,
            'created_by' => $creator->id,
        ]);

        // Create BOMs
        $this->command->info('Creating BOMs and establishing relationships...');

        // BOM for Front Wheel
        $frontWheelBom = BillOfMaterial::create([
            'bom_number' => 'BOM-WHEEL-F-001',
            'name' => 'Front Wheel Assembly BOM',
            'description' => 'Bill of materials for front wheel assembly',
            'is_active' => true,
            'created_by' => $creator->id,
        ]);

        $frontWheelVersion = BomVersion::create([
            'bill_of_material_id' => $frontWheelBom->id,
            'version_number' => 1,
            'revision_notes' => 'Initial version',
            'published_at' => now(),
            'published_by' => $creator->id,
            'is_current' => true,
        ]);

        // Assign BOM to front wheel using the proper method
        $frontWheel->updateBom($frontWheelBom, [
            'reason' => 'Initial BOM assignment',
            'change_order' => 'INIT-001',
        ]);

        // Add components to front wheel BOM
        BomItem::create([
            'bom_version_id' => $frontWheelVersion->id,
            'item_id' => $wheelRim->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 10,
        ]);

        BomItem::create([
            'bom_version_id' => $frontWheelVersion->id,
            'item_id' => $spokes->id,
            'quantity' => 1, // 1 set = 36 spokes
            'unit_of_measure' => 'SET',
            'level' => 1,
            'sequence_number' => 20,
        ]);

        BomItem::create([
            'bom_version_id' => $frontWheelVersion->id,
            'item_id' => $wheelHub->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 30,
        ]);

        BomItem::create([
            'bom_version_id' => $frontWheelVersion->id,
            'item_id' => $tire->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 40,
        ]);

        BomItem::create([
            'bom_version_id' => $frontWheelVersion->id,
            'item_id' => $innerTube->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 50,
        ]);

        // BOM for Rear Wheel
        $rearWheelBom = BillOfMaterial::create([
            'bom_number' => 'BOM-WHEEL-R-001',
            'name' => 'Rear Wheel Assembly BOM',
            'description' => 'Bill of materials for rear wheel assembly',
            'is_active' => true,
            'created_by' => $creator->id,
        ]);

        $rearWheelVersion = BomVersion::create([
            'bill_of_material_id' => $rearWheelBom->id,
            'version_number' => 1,
            'revision_notes' => 'Initial version',
            'published_at' => now(),
            'published_by' => $creator->id,
            'is_current' => true,
        ]);

        $rearWheel->updateBom($rearWheelBom, [
            'reason' => 'Initial BOM assignment',
            'change_order' => 'INIT-002',
        ]);

        // Add components to rear wheel BOM (similar to front but with rear hub)
        BomItem::create([
            'bom_version_id' => $rearWheelVersion->id,
            'item_id' => $wheelRim->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 10,
        ]);

        BomItem::create([
            'bom_version_id' => $rearWheelVersion->id,
            'item_id' => $spokes->id,
            'quantity' => 1,
            'unit_of_measure' => 'SET',
            'level' => 1,
            'sequence_number' => 20,
        ]);

        BomItem::create([
            'bom_version_id' => $rearWheelVersion->id,
            'item_id' => $rearWheelHub->id, // Different hub for rear
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 30,
        ]);

        BomItem::create([
            'bom_version_id' => $rearWheelVersion->id,
            'item_id' => $tire->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 40,
        ]);

        BomItem::create([
            'bom_version_id' => $rearWheelVersion->id,
            'item_id' => $innerTube->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 50,
        ]);

        // BOM for Painted Frame
        $frameBom = BillOfMaterial::create([
            'bom_number' => 'BOM-FRAME-MTB-001',
            'name' => 'MTB Frame Assembly BOM',
            'description' => 'Bill of materials for painted MTB frame',
            'is_active' => true,
            'created_by' => $creator->id,
        ]);

        $frameVersion = BomVersion::create([
            'bill_of_material_id' => $frameBom->id,
            'version_number' => 1,
            'revision_notes' => 'Initial version',
            'published_at' => now(),
            'published_by' => $creator->id,
            'is_current' => true,
        ]);

        $paintedFrame->updateBom($frameBom, [
            'reason' => 'Initial BOM assignment',
            'change_order' => 'INIT-003',
        ]);

        // Add paint as a purchased item
        $paint = Item::create([
            'item_number' => 'PAINT-POWDER-BLK',
            'name' => 'Black Powder Coat Paint',
            'description' => 'Black powder coating paint',
            'category' => 'Consumables',
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'KG',
            'weight' => 1.0,
            'cost' => 8.00,
            'lead_time_days' => 2,
            'created_by' => $creator->id,
        ]);

        BomItem::create([
            'bom_version_id' => $frameVersion->id,
            'item_id' => $frameTubes->id,
            'quantity' => 1,
            'unit_of_measure' => 'SET',
            'level' => 1,
            'sequence_number' => 10,
        ]);

        BomItem::create([
            'bom_version_id' => $frameVersion->id,
            'item_id' => $paint->id,
            'quantity' => 0.15, // 150 grams of paint
            'unit_of_measure' => 'KG',
            'level' => 1,
            'sequence_number' => 20,
        ]);

        // BOM for Complete Bicycle
        $bicycleBom = BillOfMaterial::create([
            'bom_number' => 'BOM-BIKE-MTB-001',
            'name' => 'Mountain Bike Complete Assembly BOM',
            'description' => 'Bill of materials for complete mountain bike',
            'is_active' => true,
            'created_by' => $creator->id,
        ]);

        $bicycleVersion = BomVersion::create([
            'bill_of_material_id' => $bicycleBom->id,
            'version_number' => 1,
            'revision_notes' => 'Initial production version',
            'published_at' => now(),
            'published_by' => $creator->id,
            'is_current' => true,
        ]);

        $bicycle->updateBom($bicycleBom, [
            'reason' => 'Initial BOM assignment for production',
            'change_order' => 'INIT-004',
        ]);

        // Add sub-assemblies to bicycle BOM
        $frameItem = BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $paintedFrame->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 10,
        ]);

        $frontWheelItem = BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $frontWheel->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 20,
        ]);

        $rearWheelItem = BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $rearWheel->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 30,
        ]);

        // Add individual components to bicycle BOM
        BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $chainset->id,
            'quantity' => 1,
            'unit_of_measure' => 'SET',
            'level' => 1,
            'sequence_number' => 40,
        ]);

        BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $chain->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 50,
        ]);

        BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $derailleur->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 60,
        ]);

        BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $handlebar->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 70,
        ]);

        BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $brakeLever->id,
            'quantity' => 1,
            'unit_of_measure' => 'SET',
            'level' => 1,
            'sequence_number' => 80,
        ]);

        BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $saddle->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 90,
        ]);

        BomItem::create([
            'bom_version_id' => $bicycleVersion->id,
            'item_id' => $seatpost->id,
            'quantity' => 1,
            'unit_of_measure' => 'EA',
            'level' => 1,
            'sequence_number' => 100,
        ]);

        // Create production routings for manufactured items
        $this->command->info('Creating production routings...');

        // Routing for front wheel assembly
        $frontWheelRouting = ProductionRouting::create([
            'bom_item_id' => $frontWheelItem->id,
            'routing_number' => 'RT-WHEEL-F-001',
            'name' => 'Front Wheel Assembly Routing',
            'description' => 'Assembly process for front wheel',
            'routing_type' => 'defined',
            'is_active' => true,
            'created_by' => $creator->id,
        ]);

        RoutingStep::create([
            'production_routing_id' => $frontWheelRouting->id,
            'step_number' => 10,
            'operation_code' => 'WHEEL-LACE',
            'name' => 'Lace Wheel',
            'description' => 'Lace spokes into rim and hub',
            'work_cell_id' => $workCells['wheel']->id,
            'setup_time_minutes' => 5,
            'cycle_time_minutes' => 20,
            'labor_requirement' => 1,
        ]);

        RoutingStep::create([
            'production_routing_id' => $frontWheelRouting->id,
            'step_number' => 20,
            'operation_code' => 'WHEEL-TRUE',
            'name' => 'True Wheel',
            'description' => 'True and tension wheel',
            'work_cell_id' => $workCells['wheel']->id,
            'cycle_time_minutes' => 15,
            'labor_requirement' => 1,
        ]);

        RoutingStep::create([
            'production_routing_id' => $frontWheelRouting->id,
            'step_number' => 30,
            'operation_code' => 'TIRE-MOUNT',
            'name' => 'Mount Tire',
            'description' => 'Mount tire and tube on wheel',
            'work_cell_id' => $workCells['wheel']->id,
            'cycle_time_minutes' => 10,
            'labor_requirement' => 1,
        ]);

        // Create production orders
        $this->command->info('Creating production orders...');

        // Create a completed order for historical data
        $completedOrder = ProductionOrder::create([
            'order_number' => 'PO-2024-001',
            'item_id' => $bicycle->id,
            'bill_of_material_id' => $bicycleBom->id,
            'quantity' => 5,
            'status' => 'completed',
            'priority' => 50,
            'requested_date' => now()->subDays(10),
            'planned_start_date' => now()->subDays(8),
            'planned_end_date' => now()->subDays(5),
            'actual_start_date' => now()->subDays(8),
            'actual_end_date' => now()->subDays(4),
            'created_by' => $creator->id,
        ]);

        // Create an in-progress order
        $inProgressOrder = ProductionOrder::create([
            'order_number' => 'PO-2024-002',
            'item_id' => $bicycle->id,
            'bill_of_material_id' => $bicycleBom->id,
            'quantity' => 10,
            'status' => 'in_progress',
            'priority' => 75,
            'requested_date' => now()->addDays(5),
            'planned_start_date' => now()->subDays(2),
            'planned_end_date' => now()->addDays(3),
            'actual_start_date' => now()->subDays(1),
            'created_by' => $creator->id,
        ]);

        // Create a planned order
        $plannedOrder = ProductionOrder::create([
            'order_number' => 'PO-2024-003',
            'item_id' => $frontWheel->id, // Order for just wheels as spares
            'bill_of_material_id' => $frontWheelBom->id,
            'quantity' => 20,
            'status' => 'planned',
            'priority' => 40,
            'requested_date' => now()->addDays(15),
            'planned_start_date' => now()->addDays(7),
            'planned_end_date' => now()->addDays(10),
            'created_by' => $creator->id,
        ]);

        // Create QR tracking events for in-progress order
        $this->command->info('Creating QR tracking events...');

        QrTracking::create([
            'trackable_type' => ProductionOrder::class,
            'trackable_id' => $inProgressOrder->id,
            'qr_code' => 'QR-PO-2024-002',
            'event_type' => 'start_production',
            'event_data' => ['location' => 'Frame Welding Station'],
            'location' => $workCells['frame']->code,
            'scanned_by' => $creator->id,
        ]);

        // Create shipment for completed order
        $this->command->info('Creating shipments...');

        $shipment = Shipment::create([
            'shipment_number' => 'SH-2024-001',
            'shipment_type' => 'customer',
            'destination_type' => 'customer',
            'destination_reference' => 'CUST-12345',
            'destination_details' => [
                'name' => 'Bike Shop ABC',
                'address' => '123 Main St, Anytown, USA',
                'contact' => 'John Doe',
                'phone' => '555-1234',
            ],
            'status' => 'delivered',
            'scheduled_ship_date' => now()->subDays(3),
            'actual_ship_date' => now()->subDays(3),
            'actual_delivery_date' => now()->subDay(),
            'carrier' => 'FedEx',
            'tracking_number' => 'FX123456789',
            'created_by' => $creator->id,
        ]);

        ShipmentItem::create([
            'shipment_id' => $shipment->id,
            'production_order_id' => $completedOrder->id,
            'item_number' => $bicycle->item_number,
            'description' => $bicycle->name,
            'quantity' => 5,
            'unit_of_measure' => 'EA',
            'package_number' => 'PKG-001',
            'package_type' => 'Box',
            'weight' => 67.5, // 5 bikes
        ]);

        ShipmentPhoto::create([
            'shipment_id' => $shipment->id,
            'photo_type' => 'package',
            'file_path' => 'shipments/2024/SH-2024-001/package-001.jpg',
            'description' => 'Packaged bicycles ready for shipment',
            'uploaded_by' => $creator->id,
        ]);

        $this->command->info('Bicycle production test data created successfully!');
        $this->command->info('Summary:');
        $this->command->table(
            ['Entity', 'Count'],
            [
                ['Items', Item::count()],
                ['BOMs', BillOfMaterial::count()],
                ['BOM Items', BomItem::count()],
                ['Work Cells', WorkCell::count()],
                ['Production Orders', ProductionOrder::count()],
                ['Shipments', Shipment::count()],
                ['QR Tracking Events', QrTracking::count()],
            ]
        );
        
        $this->command->info('');
        $this->command->info('Key items created:');
        $this->command->info("- Finished Product: {$bicycle->item_number} - {$bicycle->name}");
        $this->command->info("- Sub-assemblies: {$frontWheel->item_number}, {$rearWheel->item_number}, {$paintedFrame->item_number}");
        $this->command->info("- Total purchased components: " . Item::purchasable()->count());
        $this->command->info("- Total manufactured items: " . Item::manufacturable()->count());
    }
} 
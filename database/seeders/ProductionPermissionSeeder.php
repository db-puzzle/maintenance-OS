<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class ProductionPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Item Master
            'production.items.view' => 'View item details',
            'production.items.create' => 'Create new items',
            'production.items.update' => 'Update items',
            'production.items.delete' => 'Delete items',
            'production.items.manage_bom' => 'Manage BOM assignments for items',

            // Bill of Materials
            'production.bom.viewAny' => 'View all BOMs',
            'production.bom.view' => 'View BOM details',
            'production.bom.create' => 'Create new BOMs',
            'production.bom.update' => 'Update BOMs',
            'production.bom.delete' => 'Delete BOMs',
            'production.bom.import' => 'Import BOMs from external sources',
            'production.bom.manageItems' => 'Manage BOM items',

            // Work Cells
            'production.workCells.viewAny' => 'View all work cells',
            'production.workCells.view' => 'View work cell details',
            'production.workCells.create' => 'Create new work cells',
            'production.workCells.update' => 'Update work cells',
            'production.workCells.delete' => 'Delete work cells',

            // Production Routing
            'production.routing.viewAny' => 'View all production routings',
            'production.routing.view' => 'View routing details',
            'production.routing.create' => 'Create new routings',
            'production.routing.update' => 'Update routings',
            'production.routing.delete' => 'Delete routings',
            'production.routing.manageSteps' => 'Manage routing steps',

            // Production Orders
            'production.orders.viewAny' => 'View all production orders',
            'production.orders.view' => 'View order details',
            'production.orders.create' => 'Create new production orders',
            'production.orders.update' => 'Update production orders',
            'production.orders.delete' => 'Delete production orders',
            'production.orders.schedule' => 'Schedule production orders',
            'production.orders.release' => 'Release orders for production',
            'production.orders.cancel' => 'Cancel production orders',

            // Production Schedules
            'production.schedules.viewAny' => 'View all production schedules',
            'production.schedules.view' => 'View schedule details',
            'production.schedules.update' => 'Update production schedules',
            'production.schedules.start' => 'Start scheduled production',
            'production.schedules.complete' => 'Complete production schedules',

            // Production Execution
            'production.executions.viewAny' => 'View all production executions',
            'production.executions.view' => 'View execution details',
            'production.executions.update' => 'Update production executions',
            'production.executions.scan' => 'Scan QR codes for production',
            'production.executions.complete' => 'Complete production executions',

            // QR Tracking
            'production.qr.viewAny' => 'View all QR tracking events',
            'production.qr.view' => 'View QR tracking details',
            'production.qr.generate' => 'Generate QR codes',
            'production.qr.print' => 'Print QR labels',

            // Shipments
            'production.shipments.viewAny' => 'View all shipments',
            'production.shipments.view' => 'View shipment details',
            'production.shipments.create' => 'Create new shipments',
            'production.shipments.update' => 'Update shipments',
            'production.shipments.delete' => 'Delete shipments',
            'production.shipments.markReady' => 'Mark shipments as ready',
            'production.shipments.ship' => 'Ship shipments',
            'production.shipments.deliver' => 'Mark shipments as delivered',
            'production.shipments.uploadPhotos' => 'Upload shipment photos',
        ];

        foreach ($permissions as $name => $description) {
            Permission::updateOrCreate(
                ['name' => $name],
                [
                    'description' => $description,
                    'guard_name' => 'web',
                ]
            );
        }

        $this->command->info('Production permissions created successfully.');
    }
} 
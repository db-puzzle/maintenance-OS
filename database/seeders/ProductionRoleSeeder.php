<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class ProductionRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Production Manager - Full access to production module
        $productionManager = Role::updateOrCreate(
            ['name' => 'production-manager'],
            ['description' => 'Manages all aspects of production including planning, scheduling, and execution']
        );

        $productionManager->syncPermissions([
            // Items - Full access
            'production.items.view',
            'production.items.create',
            'production.items.update',
            'production.items.delete',
            'production.items.manage_bom',
            
            // BOMs - Full access
            'production.bom.viewAny',
            'production.bom.view',
            'production.bom.create',
            'production.bom.update',
            'production.bom.delete',
            'production.bom.import',
            'production.bom.manageItems',
            
            // Work Cells - Full access
            'production.workCells.viewAny',
            'production.workCells.view',
            'production.workCells.create',
            'production.workCells.update',
            'production.workCells.delete',
            
            // Routing - Full access
            'production.routing.viewAny',
            'production.routing.view',
            'production.routing.create',
            'production.routing.update',
            'production.routing.delete',
            'production.routing.manageSteps',
            
            // Orders - Full access
            'production.orders.viewAny',
            'production.orders.view',
            'production.orders.create',
            'production.orders.update',
            'production.orders.delete',
            'production.orders.schedule',
            'production.orders.release',
            'production.orders.cancel',
            
            // Schedules - Full access
            'production.schedules.viewAny',
            'production.schedules.view',
            'production.schedules.update',
            'production.schedules.start',
            'production.schedules.complete',
            
            // Executions - View only
            'production.executions.viewAny',
            'production.executions.view',
            
            // QR - Full access
            'production.qr.viewAny',
            'production.qr.view',
            'production.qr.generate',
            'production.qr.print',
            
            // Shipments - Full access
            'production.shipments.viewAny',
            'production.shipments.view',
            'production.shipments.create',
            'production.shipments.update',
            'production.shipments.delete',
            'production.shipments.markReady',
            'production.shipments.ship',
            'production.shipments.deliver',
            'production.shipments.uploadPhotos',
        ]);

        // Production Planner - Planning and scheduling focus
        $productionPlanner = Role::updateOrCreate(
            ['name' => 'production-planner'],
            ['description' => 'Plans and schedules production orders, manages BOMs and routing']
        );

        $productionPlanner->syncPermissions([
            // Items - View and update
            'production.items.view',
            'production.items.update',
            'production.items.manage_bom',
            
            // BOMs - Full access
            'production.bom.viewAny',
            'production.bom.view',
            'production.bom.create',
            'production.bom.update',
            'production.bom.import',
            'production.bom.manageItems',
            
            // Work Cells - View only
            'production.workCells.viewAny',
            'production.workCells.view',
            
            // Routing - Full access
            'production.routing.viewAny',
            'production.routing.view',
            'production.routing.create',
            'production.routing.update',
            'production.routing.manageSteps',
            
            // Orders - Create and manage
            'production.orders.viewAny',
            'production.orders.view',
            'production.orders.create',
            'production.orders.update',
            'production.orders.schedule',
            'production.orders.cancel',
            
            // Schedules - View and update
            'production.schedules.viewAny',
            'production.schedules.view',
            'production.schedules.update',
            
            // Executions - View only
            'production.executions.viewAny',
            'production.executions.view',
            
            // QR - Generate and print
            'production.qr.viewAny',
            'production.qr.view',
            'production.qr.generate',
            'production.qr.print',
            
            // Shipments - View only
            'production.shipments.viewAny',
            'production.shipments.view',
        ]);

        // Shop Floor Supervisor - Execution focus
        $shopFloorSupervisor = Role::updateOrCreate(
            ['name' => 'shop-floor-supervisor'],
            ['description' => 'Supervises production execution on the shop floor']
        );

        $shopFloorSupervisor->syncPermissions([
            // Items - View only
            'production.items.view',
            
            // BOMs - View only
            'production.bom.viewAny',
            'production.bom.view',
            
            // Work Cells - View only
            'production.workCells.viewAny',
            'production.workCells.view',
            
            // Routing - View only
            'production.routing.viewAny',
            'production.routing.view',
            
            // Orders - View and release
            'production.orders.viewAny',
            'production.orders.view',
            'production.orders.release',
            
            // Schedules - Full execution control
            'production.schedules.viewAny',
            'production.schedules.view',
            'production.schedules.update',
            'production.schedules.start',
            'production.schedules.complete',
            
            // Executions - Full access
            'production.executions.viewAny',
            'production.executions.view',
            'production.executions.update',
            'production.executions.scan',
            'production.executions.complete',
            
            // QR - View and print
            'production.qr.viewAny',
            'production.qr.view',
            'production.qr.print',
            
            // Shipments - View only
            'production.shipments.viewAny',
            'production.shipments.view',
        ]);

        // Machine Operator - Limited execution permissions
        $operator = Role::updateOrCreate(
            ['name' => 'operator'],
            ['description' => 'Operates machines and reports production progress']
        );

        $operator->syncPermissions([
            // Items - View only
            'production.items.view',
            
            // BOMs - View only
            'production.bom.view',
            
            // Routing - View only
            'production.routing.view',
            
            // Orders - View only
            'production.orders.view',
            
            // Schedules - View only
            'production.schedules.view',
            
            // Executions - Scan and complete own work
            'production.executions.view',
            'production.executions.update',
            'production.executions.scan',
            'production.executions.complete',
            
            // QR - View only
            'production.qr.view',
        ]);

        // Shipping Coordinator - Shipment focus
        $shippingCoordinator = Role::updateOrCreate(
            ['name' => 'shipping-coordinator'],
            ['description' => 'Manages shipments and delivery coordination']
        );

        $shippingCoordinator->syncPermissions([
            // Items - View only
            'production.items.view',
            
            // Orders - View only
            'production.orders.viewAny',
            'production.orders.view',
            
            // Schedules - View only
            'production.schedules.viewAny',
            'production.schedules.view',
            
            // QR - View and print
            'production.qr.viewAny',
            'production.qr.view',
            'production.qr.print',
            
            // Shipments - Full access
            'production.shipments.viewAny',
            'production.shipments.view',
            'production.shipments.create',
            'production.shipments.update',
            'production.shipments.delete',
            'production.shipments.markReady',
            'production.shipments.ship',
            'production.shipments.deliver',
            'production.shipments.uploadPhotos',
        ]);

        // Quality Inspector - View and tracking focus
        $qualityInspector = Role::updateOrCreate(
            ['name' => 'quality-inspector'],
            ['description' => 'Inspects production quality and tracks issues']
        );

        $qualityInspector->syncPermissions([
            // Items - View only
            'production.items.view',
            
            // BOMs - View only
            'production.bom.viewAny',
            'production.bom.view',
            
            // Work Cells - View only
            'production.workCells.viewAny',
            'production.workCells.view',
            
            // Routing - View only
            'production.routing.viewAny',
            'production.routing.view',
            
            // Orders - View only
            'production.orders.viewAny',
            'production.orders.view',
            
            // Schedules - View only
            'production.schedules.viewAny',
            'production.schedules.view',
            
            // Executions - View only
            'production.executions.viewAny',
            'production.executions.view',
            
            // QR - Full tracking access
            'production.qr.viewAny',
            'production.qr.view',
            'production.qr.generate',
            'production.qr.print',
            
            // Shipments - View and photo upload
            'production.shipments.viewAny',
            'production.shipments.view',
            'production.shipments.uploadPhotos',
        ]);

        $this->command->info('Production roles created successfully.');
    }
} 
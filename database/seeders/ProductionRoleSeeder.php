<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class ProductionRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Production Manager - Full control over production module
        $productionManager = Role::updateOrCreate(
            ['name' => 'production-manager'],
            [
                'display_name' => 'Production Manager',
                'description' => 'Full control over production module'
            ]
        );

        $productionManager->syncPermissions([
            // All order permissions
            'production.orders.viewAny',
            'production.orders.view',
            'production.orders.create',
            'production.orders.update',
            'production.orders.delete',
            'production.orders.release',
            'production.orders.cancel',
            
            // All route permissions
            'production.routes.viewAny',
            'production.routes.view',
            'production.routes.create',
            'production.routes.update',
            'production.routes.delete',
            'production.routes.createFromTemplate',
            
            // All step permissions
            'production.steps.viewAny',
            'production.steps.view',
            'production.steps.update',
            'production.steps.execute',
            'production.steps.executeQualityCheck',
            'production.steps.handleRework',
            
            // All template permissions
            'production.templates.viewAny',
            'production.templates.view',
            'production.templates.create',
            'production.templates.update',
            'production.templates.delete',
            'production.templates.duplicate',
            
            // All item permissions
            'production.items.viewAny',
            'production.items.view',
            'production.items.create',
            'production.items.update',
            'production.items.delete',
            'production.bom.import',
            'production.bom.manage',
            
            // All quality permissions
            'production.quality.executeCheck',
            'production.quality.recordResult',
            'production.quality.initiateRework',
            'production.quality.scrapPart',
            
            // All shipment permissions
            'production.shipments.viewAny',
            'production.shipments.view',
            'production.shipments.create',
            'production.shipments.update',
            'production.shipments.delete',
            'production.shipments.uploadPhotos',
            'production.shipments.markDelivered',
            
            // All work cell permissions
            'production.workcells.viewAny',
            'production.workcells.view',
            'production.workcells.create',
            'production.workcells.update',
            'production.workcells.delete',
            
            // All report permissions
            'production.reports.viewProductionMetrics',
            'production.reports.viewQualityMetrics',
            'production.reports.viewEfficiencyReports',
            'production.reports.exportData',
        ]);

        // Production Planner - Plans and schedules production
        $productionPlanner = Role::updateOrCreate(
            ['name' => 'production-planner'],
            [
                'display_name' => 'Production Planner',
                'description' => 'Plans and schedules production'
            ]
        );

        $productionPlanner->syncPermissions([
            'production.items.viewAny',
            'production.items.view',
            'production.items.create',
            'production.items.update',
            'production.bom.import',
            'production.bom.manage',
            'production.orders.viewAny',
            'production.orders.view',
            'production.orders.create',
            'production.orders.update',
            'production.orders.cancel',
            'production.routes.viewAny',
            'production.routes.view',
            'production.routes.create',
            'production.routes.update',
            'production.routes.createFromTemplate',
            'production.templates.viewAny',
            'production.templates.view',
            'production.templates.create',
            'production.templates.update',
            'production.templates.duplicate',
            'production.steps.viewAny',
            'production.steps.view',
            'production.workcells.viewAny',
            'production.workcells.view',
            'production.reports.viewProductionMetrics',
            'production.reports.viewEfficiencyReports',
        ]);

        // Shop Floor Supervisor - Supervises production execution
        $shopFloorSupervisor = Role::updateOrCreate(
            ['name' => 'shop-floor-supervisor'],
            [
                'display_name' => 'Shop Floor Supervisor',
                'description' => 'Supervises production execution'
            ]
        );

        $shopFloorSupervisor->syncPermissions([
            'production.orders.viewAny',
            'production.orders.view',
            'production.orders.release',
            'production.routes.viewAny',
            'production.routes.view',
            'production.steps.viewAny',
            'production.steps.view',
            'production.steps.update',
            'production.steps.execute',
            'production.steps.executeQualityCheck',
            'production.steps.handleRework',
            'production.quality.executeCheck',
            'production.quality.recordResult',
            'production.quality.initiateRework',
            'production.quality.scrapPart',
            'production.workcells.viewAny',
            'production.workcells.view',
            'production.reports.viewProductionMetrics',
            'production.reports.viewQualityMetrics',
        ]);

        // Machine Operator - Executes manufacturing steps
        $machineOperator = Role::updateOrCreate(
            ['name' => 'machine-operator'],
            [
                'display_name' => 'Machine Operator',
                'description' => 'Executes manufacturing steps'
            ]
        );

        $machineOperator->syncPermissions([
            'production.orders.view',
            'production.steps.view',
            'production.steps.execute',
            'production.workcells.view',
        ]);

        // Quality Inspector - Performs quality checks
        $qualityInspector = Role::updateOrCreate(
            ['name' => 'quality-inspector'],
            [
                'display_name' => 'Quality Inspector',
                'description' => 'Performs quality checks'
            ]
        );

        $qualityInspector->syncPermissions([
            'production.orders.viewAny',
            'production.orders.view',
            'production.steps.viewAny',
            'production.steps.view',
            'production.steps.executeQualityCheck',
            'production.quality.executeCheck',
            'production.quality.recordResult',
            'production.quality.initiateRework',
            'production.quality.scrapPart',
            'production.reports.viewQualityMetrics',
        ]);

        // Shipping Coordinator - Manages shipments
        $shippingCoordinator = Role::updateOrCreate(
            ['name' => 'shipping-coordinator'],
            [
                'display_name' => 'Shipping Coordinator',
                'description' => 'Manages shipments'
            ]
        );

        $shippingCoordinator->syncPermissions([
            'production.orders.viewAny',
            'production.orders.view',
            'production.shipments.viewAny',
            'production.shipments.view',
            'production.shipments.create',
            'production.shipments.update',
            'production.shipments.delete',
            'production.shipments.uploadPhotos',
            'production.shipments.markDelivered',
        ]);

        // Production Viewer - Read-only access
        $productionViewer = Role::updateOrCreate(
            ['name' => 'production-viewer'],
            [
                'display_name' => 'Production Viewer',
                'description' => 'Read-only access to production data'
            ]
        );

        $productionViewer->syncPermissions([
            'production.orders.viewAny',
            'production.orders.view',
            'production.routes.viewAny',
            'production.routes.view',
            'production.steps.viewAny',
            'production.steps.view',
            'production.templates.viewAny',
            'production.templates.view',
            'production.items.viewAny',
            'production.items.view',
            'production.shipments.viewAny',
            'production.shipments.view',
            'production.workcells.viewAny',
            'production.workcells.view',
            'production.reports.viewProductionMetrics',
            'production.reports.viewQualityMetrics',
            'production.reports.viewEfficiencyReports',
        ]);
    }
} 
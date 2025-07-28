<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class ProductionPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Manufacturing Orders
        $orderPermissions = [
            'production.orders.viewAny' => 'View all manufacturing orders',
            'production.orders.view' => 'View specific manufacturing order',
            'production.orders.create' => 'Create manufacturing orders',
            'production.orders.update' => 'Update manufacturing orders',
            'production.orders.delete' => 'Delete manufacturing orders',
            'production.orders.release' => 'Release orders for production',
            'production.orders.cancel' => 'Cancel manufacturing orders',
        ];

        // Manufacturing Routes
        $routePermissions = [
            'production.routes.viewAny' => 'View all manufacturing routes',
            'production.routes.view' => 'View specific route',
            'production.routes.create' => 'Create manufacturing routes',
            'production.routes.update' => 'Update manufacturing routes',
            'production.routes.delete' => 'Delete manufacturing routes',
            'production.routes.createFromTemplate' => 'Create routes from templates',
        ];

        // Manufacturing Steps
        $stepPermissions = [
            'production.steps.viewAny' => 'View all manufacturing steps',
            'production.steps.view' => 'View specific step',
            'production.steps.update' => 'Update step details',
            'production.steps.execute' => 'Execute manufacturing steps',
            'production.steps.executeQualityCheck' => 'Execute quality checks',
            'production.steps.handleRework' => 'Handle rework decisions',
        ];

        // Route Templates
        $templatePermissions = [
            'production.templates.viewAny' => 'View all route templates',
            'production.templates.view' => 'View specific route template',
            'production.templates.create' => 'Create route templates',
            'production.templates.update' => 'Update route templates',
            'production.templates.delete' => 'Delete route templates',
            'production.templates.duplicate' => 'Duplicate route templates',
        ];

        // Items and BOMs
        $itemPermissions = [
            'production.items.viewAny' => 'View all items',
            'production.items.view' => 'View specific item',
            'production.items.create' => 'Create items',
            'production.items.update' => 'Update items',
            'production.items.delete' => 'Delete items',
            'production.bom.import' => 'Import BOMs from CAD',
            'production.bom.manage' => 'Manage BOM structures',
            // Item Categories
            'production.categories.view' => 'View item categories',
            'production.categories.create' => 'Create item categories',
            'production.categories.update' => 'Update item categories',
            'production.categories.delete' => 'Delete item categories',
        ];

        // Quality Control
        $qualityPermissions = [
            'production.quality.executeCheck' => 'Execute quality checks',
            'production.quality.recordResult' => 'Record quality results',
            'production.quality.initiateRework' => 'Initiate rework process',
            'production.quality.scrapPart' => 'Scrap failed parts',
        ];

        // Shipments
        $shipmentPermissions = [
            'production.shipments.viewAny' => 'View all shipments',
            'production.shipments.view' => 'View specific shipment',
            'production.shipments.create' => 'Create shipments',
            'production.shipments.update' => 'Update shipments',
            'production.shipments.delete' => 'Delete shipments',
            'production.shipments.uploadPhotos' => 'Upload shipment photos',
            'production.shipments.markDelivered' => 'Mark shipments as delivered',
        ];

        // Work Cells
        $workCellPermissions = [
            'production.workcells.viewAny' => 'View all work cells',
            'production.workcells.view' => 'View specific work cell',
            'production.workcells.create' => 'Create work cells',
            'production.workcells.update' => 'Update work cells',
            'production.workcells.delete' => 'Delete work cells',
        ];

        // Reports and Analytics
        $reportPermissions = [
            'production.reports.viewProductionMetrics' => 'View production metrics',
            'production.reports.viewQualityMetrics' => 'View quality metrics',
            'production.reports.viewEfficiencyReports' => 'View efficiency reports',
            'production.reports.exportData' => 'Export production data',
        ];

        // Create all permissions
        $allPermissions = array_merge(
            $orderPermissions,
            $routePermissions,
            $stepPermissions,
            $templatePermissions,
            $itemPermissions,
            $qualityPermissions,
            $shipmentPermissions,
            $workCellPermissions,
            $reportPermissions
        );

        foreach ($allPermissions as $name => $display_name) {
            Permission::updateOrCreate(
                ['name' => $name],
                [
                    'display_name' => $display_name,
                    'guard_name' => 'web',
                ]
            );
        }
    }
} 
<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * V2: Only seed system-level permissions. All entity-specific permissions are created dynamically.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // System-level permissions (the only global permissions in V2)
            $systemPermissions = [
                [
                    'name' => 'system.create-plants',
                    'display_name' => 'Create Plants',
                    'description' => 'Ability to create new plants in the system',
                    'entity_type' => 'system',
                    'sort_order' => 1,
                ],
                [
                    'name' => 'system.bulk-import-assets',
                    'display_name' => 'Bulk Import Assets',
                    'description' => 'Ability to bulk import assets (respects entity permissions)',
                    'entity_type' => 'system',
                    'sort_order' => 2,
                ],
                [
                    'name' => 'system.bulk-export-assets',
                    'display_name' => 'Bulk Export Assets',
                    'description' => 'Ability to bulk export assets (respects entity permissions)',
                    'entity_type' => 'system',
                    'sort_order' => 3,
                ],
                [
                    'name' => 'system.settings.view',
                    'display_name' => 'View System Settings',
                    'description' => 'View system configuration and settings',
                    'entity_type' => 'system',
                    'sort_order' => 4,
                ],
                [
                    'name' => 'system.settings.update',
                    'display_name' => 'Update System Settings',
                    'description' => 'Modify system configuration and settings',
                    'entity_type' => 'system',
                    'sort_order' => 5,
                ],
                [
                    'name' => 'system.audit.view',
                    'display_name' => 'View Audit Trails',
                    'description' => 'View system audit logs and trails',
                    'entity_type' => 'system',
                    'sort_order' => 6,
                ],
            ];

            // User management permissions (not entity-scoped)
            $userPermissions = [
                [
                    'name' => 'users.viewAny',
                    'display_name' => 'View User List',
                    'description' => 'View list of all users',
                    'sort_order' => 10,
                ],
                [
                    'name' => 'users.view',
                    'display_name' => 'View User Details',
                    'description' => 'View detailed user information',
                    'sort_order' => 11,
                ],
                [
                    'name' => 'users.create',
                    'display_name' => 'Create Users',
                    'description' => 'Create new user accounts',
                    'sort_order' => 12,
                ],
                [
                    'name' => 'users.update',
                    'display_name' => 'Update Users',
                    'description' => 'Update any user information',
                    'sort_order' => 13,
                ],
                [
                    'name' => 'users.update.owned',
                    'display_name' => 'Update Own Profile',
                    'description' => 'Update own user profile only',
                    'sort_order' => 14,
                ],
                [
                    'name' => 'users.delete',
                    'display_name' => 'Delete Users',
                    'description' => 'Delete user accounts',
                    'sort_order' => 15,
                ],
                [
                    'name' => 'users.impersonate',
                    'display_name' => 'Impersonate Users',
                    'description' => 'Login as another user',
                    'sort_order' => 16,
                ],
                [
                    'name' => 'users.manage-permissions',
                    'display_name' => 'Manage User Permissions',
                    'description' => 'Assign/revoke permissions (respects scope)',
                    'sort_order' => 17,
                ],
                [
                    'name' => 'users.manage-roles',
                    'display_name' => 'Manage User Roles',
                    'description' => 'Assign/revoke roles to users',
                    'sort_order' => 18,
                ],
                [
                    'name' => 'permissions.grant',
                    'display_name' => 'Grant Permissions',
                    'description' => 'Grant permissions to users (respects scope)',
                    'sort_order' => 19,
                ],
            ];

            // Invitation management permissions
            $invitationPermissions = [
                [
                    'name' => 'invitations.viewAny',
                    'display_name' => 'View All Invitations',
                    'description' => 'View all user invitations',
                    'sort_order' => 20,
                ],
                [
                    'name' => 'invitations.view',
                    'display_name' => 'View Invitation Details',
                    'description' => 'View invitation details',
                    'sort_order' => 21,
                ],
                [
                    'name' => 'invitations.revoke',
                    'display_name' => 'Revoke Invitations',
                    'description' => 'Revoke pending invitations',
                    'sort_order' => 22,
                ],
                [
                    'name' => 'invitations.resend',
                    'display_name' => 'Resend Invitations',
                    'description' => 'Resend invitation emails',
                    'sort_order' => 23,
                ],
            ];

            // Role management permissions
            $rolePermissions = [
                [
                    'name' => 'roles.viewAny',
                    'display_name' => 'View Role List',
                    'description' => 'View list of all roles',
                    'sort_order' => 30,
                ],
                [
                    'name' => 'roles.view',
                    'display_name' => 'View Role Details',
                    'description' => 'View role details and permissions',
                    'sort_order' => 31,
                ],
                [
                    'name' => 'roles.create',
                    'display_name' => 'Create Roles',
                    'description' => 'Create custom roles',
                    'sort_order' => 32,
                ],
                [
                    'name' => 'roles.update',
                    'display_name' => 'Update Roles',
                    'description' => 'Update role permissions',
                    'sort_order' => 33,
                ],
                [
                    'name' => 'roles.delete',
                    'display_name' => 'Delete Roles',
                    'description' => 'Delete custom roles (not system roles)',
                    'sort_order' => 34,
                ],
                [
                    'name' => 'roles.assign',
                    'display_name' => 'Assign Roles',
                    'description' => 'Assign roles to users',
                    'sort_order' => 35,
                ],
            ];

            // Work Order management permissions
            $workOrderPermissions = [
                [
                    'name' => 'work-orders.viewAny',
                    'display_name' => 'View Work Order List',
                    'description' => 'View list of all work orders',
                    'sort_order' => 40,
                ],
                [
                    'name' => 'work-orders.view',
                    'display_name' => 'View Work Order Details',
                    'description' => 'View work order details',
                    'sort_order' => 41,
                ],
                [
                    'name' => 'work-orders.create',
                    'display_name' => 'Create Work Orders',
                    'description' => 'Create new work orders',
                    'sort_order' => 42,
                ],
                [
                    'name' => 'work-orders.update',
                    'display_name' => 'Update Work Orders',
                    'description' => 'Update work order information',
                    'sort_order' => 43,
                ],
                [
                    'name' => 'work-orders.delete',
                    'display_name' => 'Delete Work Orders',
                    'description' => 'Delete work orders',
                    'sort_order' => 44,
                ],
                [
                    'name' => 'work-orders.approve',
                    'display_name' => 'Approve Work Orders',
                    'description' => 'Approve or reject work order requests',
                    'sort_order' => 45,
                ],
                [
                    'name' => 'work-orders.plan',
                    'display_name' => 'Plan Work Orders',
                    'description' => 'Plan resources and schedule work orders',
                    'sort_order' => 46,
                ],
                [
                    'name' => 'work-orders.execute',
                    'display_name' => 'Execute Work Orders',
                    'description' => 'Execute assigned work orders',
                    'sort_order' => 47,
                ],
                [
                    'name' => 'work-orders.complete',
                    'display_name' => 'Complete Work Orders',
                    'description' => 'Mark work orders as completed',
                    'sort_order' => 48,
                ],
                [
                    'name' => 'work-orders.validate',
                    'display_name' => 'Validate Work Orders',
                    'description' => 'Validate quality of completed work',
                    'sort_order' => 49,
                ],
                [
                    'name' => 'work-orders.cancel',
                    'display_name' => 'Cancel Work Orders',
                    'description' => 'Cancel work orders',
                    'sort_order' => 50,
                ],
            ];

            // Skills management permissions
            $skillsPermissions = [
                [
                    'name' => 'skills.viewAny',
                    'display_name' => 'View Skills List',
                    'description' => 'View list of all skills',
                    'sort_order' => 70,
                ],
                [
                    'name' => 'skills.view',
                    'display_name' => 'View Skill Details',
                    'description' => 'View skill details',
                    'sort_order' => 71,
                ],
                [
                    'name' => 'skills.create',
                    'display_name' => 'Create Skills',
                    'description' => 'Create new skills',
                    'sort_order' => 72,
                ],
                [
                    'name' => 'skills.update',
                    'display_name' => 'Update Skills',
                    'description' => 'Update skill information',
                    'sort_order' => 73,
                ],
                [
                    'name' => 'skills.delete',
                    'display_name' => 'Delete Skills',
                    'description' => 'Delete skills',
                    'sort_order' => 74,
                ],
            ];

            // Certifications management permissions
            $certificationsPermissions = [
                [
                    'name' => 'certifications.viewAny',
                    'display_name' => 'View Certifications List',
                    'description' => 'View list of all certifications',
                    'sort_order' => 80,
                ],
                [
                    'name' => 'certifications.view',
                    'display_name' => 'View Certification Details',
                    'description' => 'View certification details',
                    'sort_order' => 81,
                ],
                [
                    'name' => 'certifications.create',
                    'display_name' => 'Create Certifications',
                    'description' => 'Create new certifications',
                    'sort_order' => 82,
                ],
                [
                    'name' => 'certifications.update',
                    'display_name' => 'Update Certifications',
                    'description' => 'Update certification information',
                    'sort_order' => 83,
                ],
                [
                    'name' => 'certifications.delete',
                    'display_name' => 'Delete Certifications',
                    'description' => 'Delete certifications',
                    'sort_order' => 84,
                ],
            ];

            // Production Work Cell permissions
            $workCellPermissions = [
                [
                    'name' => 'production.work-cells.viewAny',
                    'display_name' => 'View Work Cells List',
                    'description' => 'View list of all work cells',
                    'sort_order' => 90,
                ],
                [
                    'name' => 'production.work-cells.view',
                    'display_name' => 'View Work Cell Details',
                    'description' => 'View work cell details',
                    'sort_order' => 91,
                ],
                [
                    'name' => 'production.work-cells.create',
                    'display_name' => 'Create Work Cells',
                    'description' => 'Create new work cells',
                    'sort_order' => 92,
                ],
                [
                    'name' => 'production.work-cells.update',
                    'display_name' => 'Update Work Cells',
                    'description' => 'Update work cell information',
                    'sort_order' => 93,
                ],
                [
                    'name' => 'production.work-cells.delete',
                    'display_name' => 'Delete Work Cells',
                    'description' => 'Delete work cells',
                    'sort_order' => 94,
                ],
                [
                    'name' => 'production.work-cells.viewDashboard',
                    'display_name' => 'View Work Cell Dashboard',
                    'description' => 'Access comprehensive work cell dashboard with analytics',
                    'sort_order' => 95,
                ],
                [
                    'name' => 'production.work-cells.exportData',
                    'display_name' => 'Export Work Cell Data',
                    'description' => 'Export work cell performance and production data',
                    'sort_order' => 96,
                ],
            ];

            // Production Item Category permissions
            $itemCategoryPermissions = [
                [
                    'name' => 'production.categories.viewAny',
                    'display_name' => 'View Item Categories List',
                    'description' => 'View list of all item categories',
                    'sort_order' => 97,
                ],
                [
                    'name' => 'production.categories.view',
                    'display_name' => 'View Item Category Details',
                    'description' => 'View item category details',
                    'sort_order' => 98,
                ],
                [
                    'name' => 'production.categories.create',
                    'display_name' => 'Create Item Categories',
                    'description' => 'Create new item categories',
                    'sort_order' => 99,
                ],
                [
                    'name' => 'production.categories.update',
                    'display_name' => 'Update Item Categories',
                    'description' => 'Update item category information',
                    'sort_order' => 100,
                ],
                [
                    'name' => 'production.categories.delete',
                    'display_name' => 'Delete Item Categories',
                    'description' => 'Delete item categories',
                    'sort_order' => 101,
                ],
            ];

            // Production Item permissions
            $itemPermissions = [
                [
                    'name' => 'production.items.viewAny',
                    'display_name' => 'View Items List',
                    'description' => 'View list of all items',
                    'sort_order' => 102,
                ],
                [
                    'name' => 'production.items.view',
                    'display_name' => 'View Item Details',
                    'description' => 'View item details',
                    'sort_order' => 103,
                ],
                [
                    'name' => 'production.items.create',
                    'display_name' => 'Create Items',
                    'description' => 'Create new items',
                    'sort_order' => 104,
                ],
                [
                    'name' => 'production.items.update',
                    'display_name' => 'Update Items',
                    'description' => 'Update item information',
                    'sort_order' => 105,
                ],
                [
                    'name' => 'production.items.delete',
                    'display_name' => 'Delete Items',
                    'description' => 'Delete items',
                    'sort_order' => 106,
                ],
                [
                    'name' => 'production.items.import',
                    'display_name' => 'Import Items',
                    'description' => 'Import items from CSV or JSON files',
                    'sort_order' => 107,
                ],
                [
                    'name' => 'production.items.export',
                    'display_name' => 'Export Items',
                    'description' => 'Export items to CSV or JSON files',
                    'sort_order' => 108,
                ],
                [
                    'name' => 'production.items.images.manage',
                    'display_name' => 'Manage Item Images',
                    'description' => 'Upload, edit, and delete item images',
                    'sort_order' => 109,
                ],
            ];

            // Production QR Code permissions
            $qrCodePermissions = [
                [
                    'name' => 'production.qr-tags.view',
                    'display_name' => 'View QR Tag Generator',
                    'description' => 'Access the QR tag generator interface',
                    'sort_order' => 112,
                ],
                [
                    'name' => 'production.qr-tags.generate',
                    'display_name' => 'Generate QR Tags',
                    'description' => 'Generate QR code tags for items and manufacturing orders',
                    'sort_order' => 113,
                ],
                [
                    'name' => 'production.qr-scan-logs.view',
                    'display_name' => 'View QR Scan Logs',
                    'description' => 'View QR code scan history and analytics',
                    'sort_order' => 114,
                ],
                [
                    'name' => 'production.orders.create',
                    'display_name' => 'Create Manufacturing Orders',
                    'description' => 'Create new manufacturing orders',
                    'sort_order' => 115,
                ],
                [
                    'name' => 'production.orders.release',
                    'display_name' => 'Release Manufacturing Orders',
                    'description' => 'Release manufacturing orders for production',
                    'sort_order' => 116,
                ],
                [
                    'name' => 'production.orders.cancel',
                    'display_name' => 'Cancel Manufacturing Orders',
                    'description' => 'Cancel manufacturing orders',
                    'sort_order' => 117,
                ],
                [
                    'name' => 'production.routes.create',
                    'display_name' => 'Create Production Routes',
                    'description' => 'Create production routes for manufacturing orders',
                    'sort_order' => 118,
                ],
                [
                    'name' => 'production.steps.execute',
                    'display_name' => 'Execute Manufacturing Steps',
                    'description' => 'Execute steps in the manufacturing process',
                    'sort_order' => 119,
                ],
                [
                    'name' => 'production.quality.executeCheck',
                    'display_name' => 'Execute Quality Checks',
                    'description' => 'Execute quality checks on manufacturing orders',
                    'sort_order' => 120,
                ],
                [
                    'name' => 'production.quality.recordResult',
                    'display_name' => 'Record Quality Results',
                    'description' => 'Record quality check results',
                    'sort_order' => 121,
                ],
                [
                    'name' => 'production.quality.initiateRework',
                    'display_name' => 'Initiate Rework',
                    'description' => 'Initiate rework for failed quality checks',
                    'sort_order' => 122,
                ],
                [
                    'name' => 'production.reports.viewQualityMetrics',
                    'display_name' => 'View Quality Metrics',
                    'description' => 'View quality metrics and reports',
                    'sort_order' => 123,
                ],
            ];

            // Production Order Management permissions (new)
            $productionOrderPermissions = [
                [
                    'name' => 'production.orders.viewAny',
                    'display_name' => 'View Manufacturing Orders List',
                    'description' => 'View list of all manufacturing orders',
                    'sort_order' => 124,
                ],
                [
                    'name' => 'production.orders.view',
                    'display_name' => 'View Manufacturing Order Details',
                    'description' => 'View manufacturing order details',
                    'sort_order' => 125,
                ],
                [
                    'name' => 'production.orders.update',
                    'display_name' => 'Update Manufacturing Orders',
                    'description' => 'Update manufacturing order information',
                    'sort_order' => 126,
                ],
                [
                    'name' => 'production.orders.delete',
                    'display_name' => 'Delete Manufacturing Orders',
                    'description' => 'Delete manufacturing orders',
                    'sort_order' => 127,
                ],
                [
                    'name' => 'production.orders.reportProduction',
                    'display_name' => 'Report Production',
                    'description' => 'Report production quantities without routing steps',
                    'sort_order' => 128,
                ],
                [
                    'name' => 'production.orders.plan',
                    'display_name' => 'Plan Manufacturing Orders',
                    'description' => 'Transition manufacturing orders to planned status',
                    'sort_order' => 129,
                ],
                [
                    'name' => 'production.orders.schedule',
                    'display_name' => 'Schedule Manufacturing Orders',
                    'description' => 'Schedule manufacturing orders for production',
                    'sort_order' => 130,
                ],
                [
                    'name' => 'production.orders.start',
                    'display_name' => 'Start Manufacturing Orders',
                    'description' => 'Start production on released manufacturing orders',
                    'sort_order' => 131,
                ],
                [
                    'name' => 'production.orders.hold',
                    'display_name' => 'Hold Manufacturing Orders',
                    'description' => 'Put manufacturing orders on hold',
                    'sort_order' => 132,
                ],
                [
                    'name' => 'production.orders.resume',
                    'display_name' => 'Resume Manufacturing Orders',
                    'description' => 'Resume manufacturing orders that were on hold',
                    'sort_order' => 133,
                ],
                [
                    'name' => 'production.orders.configure_dependencies',
                    'display_name' => 'Configure Order Dependencies',
                    'description' => 'Configure progressive flow dependencies for manufacturing orders',
                    'sort_order' => 131,
                ],
            ];

            // Production Tracking permissions
            $productionTrackingPermissions = [
                [
                    'name' => 'production.tracking.view',
                    'display_name' => 'View Production Tracking',
                    'description' => 'Access production tracking dashboard',
                    'sort_order' => 132,
                ],
                [
                    'name' => 'production.tracking.viewAll',
                    'display_name' => 'View All Production Tracking',
                    'description' => 'View production tracking for all work cells',
                    'sort_order' => 133,
                ],
                [
                    'name' => 'production.work-cells.viewQueue',
                    'display_name' => 'View Work Cell Queue',
                    'description' => 'View production queue for specific work cells',
                    'sort_order' => 134,
                ],
            ];

            // Production Route permissions
            $productionRoutePermissions = [
                [
                    'name' => 'production.routes.viewAny',
                    'display_name' => 'View Production Routes List',
                    'description' => 'View list of all production routes',
                    'sort_order' => 135,
                ],
                [
                    'name' => 'production.routes.view',
                    'display_name' => 'View Production Route Details',
                    'description' => 'View production route details',
                    'sort_order' => 136,
                ],
                [
                    'name' => 'production.routes.update',
                    'display_name' => 'Update Production Routes',
                    'description' => 'Update production route information',
                    'sort_order' => 137,
                ],
                [
                    'name' => 'production.routes.delete',
                    'display_name' => 'Delete Production Routes',
                    'description' => 'Delete production routes',
                    'sort_order' => 138,
                ],
                [
                    'name' => 'production.routes.createFromTemplate',
                    'display_name' => 'Create Routes from Templates',
                    'description' => 'Use route templates to create production routes',
                    'sort_order' => 139,
                ],
            ];

            // Production Step permissions
            $productionStepPermissions = [
                [
                    'name' => 'production.steps.viewAny',
                    'display_name' => 'View Manufacturing Steps List',
                    'description' => 'View list of all manufacturing steps',
                    'sort_order' => 140,
                ],
                [
                    'name' => 'production.steps.view',
                    'display_name' => 'View Manufacturing Step Details',
                    'description' => 'View manufacturing step details',
                    'sort_order' => 141,
                ],
                [
                    'name' => 'production.steps.update',
                    'display_name' => 'Update Manufacturing Steps',
                    'description' => 'Update manufacturing step information',
                    'sort_order' => 142,
                ],
                [
                    'name' => 'production.steps.hold',
                    'display_name' => 'Hold Manufacturing Steps',
                    'description' => 'Place manufacturing steps on hold',
                    'sort_order' => 143,
                ],
                [
                    'name' => 'production.steps.resume',
                    'display_name' => 'Resume Manufacturing Steps',
                    'description' => 'Resume manufacturing steps from hold',
                    'sort_order' => 144,
                ],
                [
                    'name' => 'production.steps.complete',
                    'display_name' => 'Complete Manufacturing Steps',
                    'description' => 'Mark manufacturing steps as completed',
                    'sort_order' => 145,
                ],
                [
                    'name' => 'production.steps.skip',
                    'display_name' => 'Skip Manufacturing Steps',
                    'description' => 'Skip manufacturing steps',
                    'sort_order' => 146,
                ],
                [
                    'name' => 'production.steps.photos',
                    'display_name' => 'Take Photos During Step Execution',
                    'description' => 'Take photos during step execution',
                    'sort_order' => 147,
                ],
            ];

            // Production BOM permissions
            $productionBomPermissions = [
                [
                    'name' => 'production.bom.viewAny',
                    'display_name' => 'View BOMs List',
                    'description' => 'View list of all bills of materials',
                    'sort_order' => 150,
                ],
                [
                    'name' => 'production.bom.view',
                    'display_name' => 'View BOM Details',
                    'description' => 'View bill of materials details',
                    'sort_order' => 151,
                ],
                [
                    'name' => 'production.bom.create',
                    'display_name' => 'Create BOMs',
                    'description' => 'Create new bills of materials',
                    'sort_order' => 152,
                ],
                [
                    'name' => 'production.bom.update',
                    'display_name' => 'Update BOMs',
                    'description' => 'Update bill of materials information',
                    'sort_order' => 153,
                ],
                [
                    'name' => 'production.bom.delete',
                    'display_name' => 'Delete BOMs',
                    'description' => 'Delete bills of materials',
                    'sort_order' => 154,
                ],
                [
                    'name' => 'production.bom.import',
                    'display_name' => 'Import BOMs',
                    'description' => 'Import bills of materials from CAD or files',
                    'sort_order' => 155,
                ],
            ];

            // Production Shipment permissions
            $productionShipmentPermissions = [
                [
                    'name' => 'production.shipments.viewAny',
                    'display_name' => 'View Shipments List',
                    'description' => 'View list of all shipments',
                    'sort_order' => 160,
                ],
                [
                    'name' => 'production.shipments.view',
                    'display_name' => 'View Shipment Details',
                    'description' => 'View shipment details',
                    'sort_order' => 161,
                ],
                [
                    'name' => 'production.shipments.create',
                    'display_name' => 'Create Shipments',
                    'description' => 'Create new shipments',
                    'sort_order' => 162,
                ],
                [
                    'name' => 'production.shipments.update',
                    'display_name' => 'Update Shipments',
                    'description' => 'Update shipment information',
                    'sort_order' => 163,
                ],
                [
                    'name' => 'production.shipments.delete',
                    'display_name' => 'Delete Shipments',
                    'description' => 'Delete shipments',
                    'sort_order' => 164,
                ],
                [
                    'name' => 'production.shipments.uploadPhotos',
                    'display_name' => 'Upload Shipment Photos',
                    'description' => 'Upload photos and documentation for shipments',
                    'sort_order' => 165,
                ],
                [
                    'name' => 'production.shipments.markDelivered',
                    'display_name' => 'Mark Shipments Delivered',
                    'description' => 'Mark shipments as delivered',
                    'sort_order' => 166,
                ],
            ];

            // Production Analytics permissions
            $productionAnalyticsPermissions = [
                [
                    'name' => 'production.analytics.view',
                    'display_name' => 'View Production Analytics',
                    'description' => 'Access production analytics and dashboards',
                    'sort_order' => 170,
                ],
                [
                    'name' => 'production.analytics.export',
                    'display_name' => 'Export Production Analytics',
                    'description' => 'Export production analytics data',
                    'sort_order' => 171,
                ],
            ];

            // Media management permissions
            $mediaPermissions = [
                [
                    'name' => 'media.view',
                    'display_name' => 'View Media Files',
                    'description' => 'View media files attached to entities',
                    'sort_order' => 180,
                ],
                [
                    'name' => 'media.create',
                    'display_name' => 'Upload Media Files',
                    'description' => 'Upload new media files',
                    'sort_order' => 181,
                ],
                [
                    'name' => 'media.update',
                    'display_name' => 'Update Media Files',
                    'description' => 'Update media file information',
                    'sort_order' => 182,
                ],
                [
                    'name' => 'media.delete',
                    'display_name' => 'Delete Media Files',
                    'description' => 'Delete media files',
                    'sort_order' => 183,
                ],
                [
                    'name' => 'media.download',
                    'display_name' => 'Download Media Files',
                    'description' => 'Download media files',
                    'sort_order' => 184,
                ],
                [
                    'name' => 'media.bulk-upload',
                    'display_name' => 'Bulk Upload Media',
                    'description' => 'Bulk upload multiple media files',
                    'sort_order' => 185,
                ],
                [
                    'name' => 'media.manage-conversions',
                    'display_name' => 'Manage Media Conversions',
                    'description' => 'Regenerate and manage media conversions',
                    'sort_order' => 186,
                ],
            ];

            // Create all permissions
            $allPermissions = array_merge(
                $systemPermissions,
                $userPermissions,
                $invitationPermissions,
                $rolePermissions,
                $workOrderPermissions,
                $skillsPermissions,
                $certificationsPermissions,
                $workCellPermissions,
                $itemCategoryPermissions,
                $itemPermissions,
                $qrCodePermissions,
                $productionOrderPermissions,
                $productionTrackingPermissions,
                $productionRoutePermissions,
                $productionStepPermissions,
                $productionBomPermissions,
                $productionShipmentPermissions,
                $productionAnalyticsPermissions,
                $mediaPermissions
            );

            foreach ($allPermissions as $permissionData) {
                Permission::firstOrCreate(
                    ['name' => $permissionData['name'], 'guard_name' => 'web'],
                    array_merge($permissionData, [
                        'guard_name' => 'web',
                        'is_dynamic' => false,
                    ])
                );
            }
        });
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
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
                    'sort_order' => 1
                ],
                [
                    'name' => 'system.bulk-import-assets',
                    'display_name' => 'Bulk Import Assets',
                    'description' => 'Ability to bulk import assets (respects entity permissions)',
                    'entity_type' => 'system',
                    'sort_order' => 2
                ],
                [
                    'name' => 'system.bulk-export-assets',
                    'display_name' => 'Bulk Export Assets',
                    'description' => 'Ability to bulk export assets (respects entity permissions)',
                    'entity_type' => 'system',
                    'sort_order' => 3
                ],
                [
                    'name' => 'system.settings.view',
                    'display_name' => 'View System Settings',
                    'description' => 'View system configuration and settings',
                    'entity_type' => 'system',
                    'sort_order' => 4
                ],
                [
                    'name' => 'system.settings.update',
                    'display_name' => 'Update System Settings',
                    'description' => 'Modify system configuration and settings',
                    'entity_type' => 'system',
                    'sort_order' => 5
                ],
                [
                    'name' => 'system.audit.view',
                    'display_name' => 'View Audit Trails',
                    'description' => 'View system audit logs and trails',
                    'entity_type' => 'system',
                    'sort_order' => 6
                ]
            ];

            // User management permissions (not entity-scoped)
            $userPermissions = [
                [
                    'name' => 'users.viewAny',
                    'display_name' => 'View User List',
                    'description' => 'View list of all users',
                    'sort_order' => 10
                ],
                [
                    'name' => 'users.view',
                    'display_name' => 'View User Details',
                    'description' => 'View detailed user information',
                    'sort_order' => 11
                ],
                [
                    'name' => 'users.create',
                    'display_name' => 'Create Users',
                    'description' => 'Create new user accounts',
                    'sort_order' => 12
                ],
                [
                    'name' => 'users.update',
                    'display_name' => 'Update Users',
                    'description' => 'Update any user information',
                    'sort_order' => 13
                ],
                [
                    'name' => 'users.update.owned',
                    'display_name' => 'Update Own Profile',
                    'description' => 'Update own user profile only',
                    'sort_order' => 14
                ],
                [
                    'name' => 'users.delete',
                    'display_name' => 'Delete Users',
                    'description' => 'Delete user accounts',
                    'sort_order' => 15
                ],
                [
                    'name' => 'users.impersonate',
                    'display_name' => 'Impersonate Users',
                    'description' => 'Login as another user',
                    'sort_order' => 16
                ],
                [
                    'name' => 'users.manage-permissions',
                    'display_name' => 'Manage User Permissions',
                    'description' => 'Assign/revoke permissions (respects scope)',
                    'sort_order' => 17
                ],
                [
                    'name' => 'users.manage-roles',
                    'display_name' => 'Manage User Roles',
                    'description' => 'Assign/revoke roles to users',
                    'sort_order' => 18
                ],
                [
                    'name' => 'permissions.grant',
                    'display_name' => 'Grant Permissions',
                    'description' => 'Grant permissions to users (respects scope)',
                    'sort_order' => 19
                ]
            ];

            // Invitation management permissions
            $invitationPermissions = [
                [
                    'name' => 'invitations.viewAny',
                    'display_name' => 'View All Invitations',
                    'description' => 'View all user invitations',
                    'sort_order' => 20
                ],
                [
                    'name' => 'invitations.view',
                    'display_name' => 'View Invitation Details',
                    'description' => 'View invitation details',
                    'sort_order' => 21
                ],
                [
                    'name' => 'invitations.revoke',
                    'display_name' => 'Revoke Invitations',
                    'description' => 'Revoke pending invitations',
                    'sort_order' => 22
                ],
                [
                    'name' => 'invitations.resend',
                    'display_name' => 'Resend Invitations',
                    'description' => 'Resend invitation emails',
                    'sort_order' => 23
                ]
            ];

            // Role management permissions
            $rolePermissions = [
                [
                    'name' => 'roles.viewAny',
                    'display_name' => 'View Role List',
                    'description' => 'View list of all roles',
                    'sort_order' => 30
                ],
                [
                    'name' => 'roles.view',
                    'display_name' => 'View Role Details',
                    'description' => 'View role details and permissions',
                    'sort_order' => 31
                ],
                [
                    'name' => 'roles.create',
                    'display_name' => 'Create Roles',
                    'description' => 'Create custom roles',
                    'sort_order' => 32
                ],
                [
                    'name' => 'roles.update',
                    'display_name' => 'Update Roles',
                    'description' => 'Update role permissions',
                    'sort_order' => 33
                ],
                [
                    'name' => 'roles.delete',
                    'display_name' => 'Delete Roles',
                    'description' => 'Delete custom roles (not system roles)',
                    'sort_order' => 34
                ],
                [
                    'name' => 'roles.assign',
                    'display_name' => 'Assign Roles',
                    'description' => 'Assign roles to users',
                    'sort_order' => 35
                ]
            ];

            // Work Order management permissions
            $workOrderPermissions = [
                [
                    'name' => 'work-orders.viewAny',
                    'display_name' => 'View Work Order List',
                    'description' => 'View list of all work orders',
                    'sort_order' => 40
                ],
                [
                    'name' => 'work-orders.view',
                    'display_name' => 'View Work Order Details',
                    'description' => 'View work order details',
                    'sort_order' => 41
                ],
                [
                    'name' => 'work-orders.create',
                    'display_name' => 'Create Work Orders',
                    'description' => 'Create new work orders',
                    'sort_order' => 42
                ],
                [
                    'name' => 'work-orders.update',
                    'display_name' => 'Update Work Orders',
                    'description' => 'Update work order information',
                    'sort_order' => 43
                ],
                [
                    'name' => 'work-orders.delete',
                    'display_name' => 'Delete Work Orders',
                    'description' => 'Delete work orders',
                    'sort_order' => 44
                ],
                [
                    'name' => 'work-orders.approve',
                    'display_name' => 'Approve Work Orders',
                    'description' => 'Approve or reject work order requests',
                    'sort_order' => 45
                ],
                [
                    'name' => 'work-orders.plan',
                    'display_name' => 'Plan Work Orders',
                    'description' => 'Plan resources and schedule work orders',
                    'sort_order' => 46
                ],
                [
                    'name' => 'work-orders.execute',
                    'display_name' => 'Execute Work Orders',
                    'description' => 'Execute assigned work orders',
                    'sort_order' => 47
                ],
                [
                    'name' => 'work-orders.complete',
                    'display_name' => 'Complete Work Orders',
                    'description' => 'Mark work orders as completed',
                    'sort_order' => 48
                ],
                [
                    'name' => 'work-orders.validate',
                    'display_name' => 'Validate Work Orders',
                    'description' => 'Validate quality of completed work',
                    'sort_order' => 49
                ],
                [
                    'name' => 'work-orders.cancel',
                    'display_name' => 'Cancel Work Orders',
                    'description' => 'Cancel work orders',
                    'sort_order' => 50
                ]
            ];

            // Parts management permissions
            $partsPermissions = [
                [
                    'name' => 'parts.viewAny',
                    'display_name' => 'View Parts List',
                    'description' => 'View list of all parts',
                    'sort_order' => 60
                ],
                [
                    'name' => 'parts.view',
                    'display_name' => 'View Part Details',
                    'description' => 'View part details',
                    'sort_order' => 61
                ],
                [
                    'name' => 'parts.create',
                    'display_name' => 'Create Parts',
                    'description' => 'Create new parts',
                    'sort_order' => 62
                ],
                [
                    'name' => 'parts.update',
                    'display_name' => 'Update Parts',
                    'description' => 'Update part information',
                    'sort_order' => 63
                ],
                [
                    'name' => 'parts.delete',
                    'display_name' => 'Delete Parts',
                    'description' => 'Delete parts',
                    'sort_order' => 64
                ],
                [
                    'name' => 'parts.manage-stock',
                    'display_name' => 'Manage Parts Stock',
                    'description' => 'Adjust part quantities and stock levels',
                    'sort_order' => 65
                ],
                [
                    'name' => 'parts.import',
                    'display_name' => 'Import Parts',
                    'description' => 'Import parts from CSV files',
                    'sort_order' => 66
                ],
                [
                    'name' => 'parts.export',
                    'display_name' => 'Export Parts',
                    'description' => 'Export parts to CSV files',
                    'sort_order' => 67
                ]
            ];

            // Skills management permissions
            $skillsPermissions = [
                [
                    'name' => 'skills.viewAny',
                    'display_name' => 'View Skills List',
                    'description' => 'View list of all skills',
                    'sort_order' => 70
                ],
                [
                    'name' => 'skills.view',
                    'display_name' => 'View Skill Details',
                    'description' => 'View skill details',
                    'sort_order' => 71
                ],
                [
                    'name' => 'skills.create',
                    'display_name' => 'Create Skills',
                    'description' => 'Create new skills',
                    'sort_order' => 72
                ],
                [
                    'name' => 'skills.update',
                    'display_name' => 'Update Skills',
                    'description' => 'Update skill information',
                    'sort_order' => 73
                ],
                [
                    'name' => 'skills.delete',
                    'display_name' => 'Delete Skills',
                    'description' => 'Delete skills',
                    'sort_order' => 74
                ]
            ];

            // Certifications management permissions
            $certificationsPermissions = [
                [
                    'name' => 'certifications.viewAny',
                    'display_name' => 'View Certifications List',
                    'description' => 'View list of all certifications',
                    'sort_order' => 80
                ],
                [
                    'name' => 'certifications.view',
                    'display_name' => 'View Certification Details',
                    'description' => 'View certification details',
                    'sort_order' => 81
                ],
                [
                    'name' => 'certifications.create',
                    'display_name' => 'Create Certifications',
                    'description' => 'Create new certifications',
                    'sort_order' => 82
                ],
                [
                    'name' => 'certifications.update',
                    'display_name' => 'Update Certifications',
                    'description' => 'Update certification information',
                    'sort_order' => 83
                ],
                [
                    'name' => 'certifications.delete',
                    'display_name' => 'Delete Certifications',
                    'description' => 'Delete certifications',
                    'sort_order' => 84
                ]
            ];

            // Production Work Cell permissions
            $workCellPermissions = [
                [
                    'name' => 'production.work-cells.viewAny',
                    'display_name' => 'View Work Cells List',
                    'description' => 'View list of all work cells',
                    'sort_order' => 90
                ],
                [
                    'name' => 'production.work-cells.view',
                    'display_name' => 'View Work Cell Details',
                    'description' => 'View work cell details',
                    'sort_order' => 91
                ],
                [
                    'name' => 'production.work-cells.create',
                    'display_name' => 'Create Work Cells',
                    'description' => 'Create new work cells',
                    'sort_order' => 92
                ],
                [
                    'name' => 'production.work-cells.update',
                    'display_name' => 'Update Work Cells',
                    'description' => 'Update work cell information',
                    'sort_order' => 93
                ],
                [
                    'name' => 'production.work-cells.delete',
                    'display_name' => 'Delete Work Cells',
                    'description' => 'Delete work cells',
                    'sort_order' => 94
                ]
            ];

            // Production Item Category permissions
            $itemCategoryPermissions = [
                [
                    'name' => 'production.categories.viewAny',
                    'display_name' => 'View Item Categories List',
                    'description' => 'View list of all item categories',
                    'sort_order' => 95
                ],
                [
                    'name' => 'production.categories.view',
                    'display_name' => 'View Item Category Details',
                    'description' => 'View item category details',
                    'sort_order' => 96
                ],
                [
                    'name' => 'production.categories.create',
                    'display_name' => 'Create Item Categories',
                    'description' => 'Create new item categories',
                    'sort_order' => 97
                ],
                [
                    'name' => 'production.categories.update',
                    'display_name' => 'Update Item Categories',
                    'description' => 'Update item category information',
                    'sort_order' => 98
                ],
                [
                    'name' => 'production.categories.delete',
                    'display_name' => 'Delete Item Categories',
                    'description' => 'Delete item categories',
                    'sort_order' => 99
                ]
            ];

            // Production Item permissions
            $itemPermissions = [
                [
                    'name' => 'production.items.viewAny',
                    'display_name' => 'View Items List',
                    'description' => 'View list of all items',
                    'sort_order' => 100
                ],
                [
                    'name' => 'production.items.view',
                    'display_name' => 'View Item Details',
                    'description' => 'View item details',
                    'sort_order' => 101
                ],
                [
                    'name' => 'production.items.create',
                    'display_name' => 'Create Items',
                    'description' => 'Create new items',
                    'sort_order' => 102
                ],
                [
                    'name' => 'production.items.update',
                    'display_name' => 'Update Items',
                    'description' => 'Update item information',
                    'sort_order' => 103
                ],
                [
                    'name' => 'production.items.delete',
                    'display_name' => 'Delete Items',
                    'description' => 'Delete items',
                    'sort_order' => 104
                ],
                [
                    'name' => 'production.items.import',
                    'display_name' => 'Import Items',
                    'description' => 'Import items from CSV or JSON files',
                    'sort_order' => 105
                ],
                [
                    'name' => 'production.items.export',
                    'display_name' => 'Export Items',
                    'description' => 'Export items to CSV or JSON files',
                    'sort_order' => 106
                ],
                [
                    'name' => 'production.items.images.manage',
                    'display_name' => 'Manage Item Images',
                    'description' => 'Upload, edit, and delete item images',
                    'sort_order' => 107
                ]
            ];

            // Production QR Code permissions
            $qrCodePermissions = [
                [
                    'name' => 'production.qr-tags.view',
                    'display_name' => 'View QR Tag Generator',
                    'description' => 'Access the QR tag generator interface',
                    'sort_order' => 110
                ],
                [
                    'name' => 'production.qr-tags.generate',
                    'display_name' => 'Generate QR Tags',
                    'description' => 'Generate QR code tags for items and manufacturing orders',
                    'sort_order' => 111
                ],
                [
                    'name' => 'production.qr-scan-logs.view',
                    'display_name' => 'View QR Scan Logs',
                    'description' => 'View QR code scan history and analytics',
                    'sort_order' => 112
                ],
                [
                    'name' => 'production.orders.create',
                    'display_name' => 'Create Manufacturing Orders',
                    'description' => 'Create new manufacturing orders',
                    'sort_order' => 113
                ],
                [
                    'name' => 'production.orders.release',
                    'display_name' => 'Release Manufacturing Orders',
                    'description' => 'Release manufacturing orders for production',
                    'sort_order' => 114
                ],
                [
                    'name' => 'production.orders.cancel',
                    'display_name' => 'Cancel Manufacturing Orders',
                    'description' => 'Cancel manufacturing orders',
                    'sort_order' => 115
                ],
                [
                    'name' => 'production.routes.create',
                    'display_name' => 'Create Production Routes',
                    'description' => 'Create production routes for manufacturing orders',
                    'sort_order' => 116
                ],
                [
                    'name' => 'production.steps.execute',
                    'display_name' => 'Execute Manufacturing Steps',
                    'description' => 'Execute steps in the manufacturing process',
                    'sort_order' => 117
                ],
                [
                    'name' => 'production.quality.executeCheck',
                    'display_name' => 'Execute Quality Checks',
                    'description' => 'Execute quality checks on manufacturing orders',
                    'sort_order' => 118
                ],
                [
                    'name' => 'production.quality.recordResult',
                    'display_name' => 'Record Quality Results',
                    'description' => 'Record quality check results',
                    'sort_order' => 119
                ],
                [
                    'name' => 'production.quality.initiateRework',
                    'display_name' => 'Initiate Rework',
                    'description' => 'Initiate rework for failed quality checks',
                    'sort_order' => 120
                ],
                [
                    'name' => 'production.reports.viewQualityMetrics',
                    'display_name' => 'View Quality Metrics',
                    'description' => 'View quality metrics and reports',
                    'sort_order' => 121
                ]
            ];

            // Create all permissions
            $allPermissions = array_merge(
                $systemPermissions,
                $userPermissions,
                $invitationPermissions,
                $rolePermissions,
                $workOrderPermissions,
                $partsPermissions,
                $skillsPermissions,
                $certificationsPermissions,
                $workCellPermissions,
                $itemCategoryPermissions,
                $itemPermissions,
                $qrCodePermissions
            );

            foreach ($allPermissions as $permissionData) {
                Permission::firstOrCreate(
                    ['name' => $permissionData['name'], 'guard_name' => 'web'],
                    array_merge($permissionData, [
                        'guard_name' => 'web',
                        'is_dynamic' => false
                    ])
                );
            }
        });
    }
}
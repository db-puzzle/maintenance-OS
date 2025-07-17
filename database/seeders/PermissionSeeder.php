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

            // Create all permissions
            $allPermissions = array_merge(
                $systemPermissions,
                $userPermissions,
                $invitationPermissions,
                $rolePermissions,
                $workOrderPermissions,
                $partsPermissions
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
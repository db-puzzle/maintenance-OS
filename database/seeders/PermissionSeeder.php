<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
use App\Models\Role;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define only system-level permissions that are NOT dynamically generated
        // Entity-specific permissions (e.g., plants.view.123) are created when entities are created
        $permissions = [
            // User Management
            ['name' => 'users.viewAny', 'display_name' => 'View Users List', 'description' => 'View user list'],
            ['name' => 'users.view', 'display_name' => 'View User Details', 'description' => 'View user details'],
            ['name' => 'users.update', 'display_name' => 'Update Any User', 'description' => 'Update any user'],
            ['name' => 'users.update.owned', 'display_name' => 'Update Own Profile', 'description' => 'Update own profile only'],
            ['name' => 'users.delete', 'display_name' => 'Delete Users', 'description' => 'Delete users'],
            ['name' => 'users.impersonate', 'display_name' => 'Impersonate Users', 'description' => 'Login as another user'],
            ['name' => 'users.manage-permissions', 'display_name' => 'Manage User Permissions', 'description' => 'Assign/revoke permissions (respects scope)'],
            ['name' => 'users.manage-roles', 'display_name' => 'Manage User Roles', 'description' => 'Assign/revoke roles'],
            
            // Note: users.invite.plant.[id], users.invite.area.[id], users.invite.sector.[id] are created dynamically

            // Invitation Management
            ['name' => 'invitations.viewAny', 'display_name' => 'View All Invitations', 'description' => 'View all invitations'],
            ['name' => 'invitations.view', 'display_name' => 'View Invitation Details', 'description' => 'View invitation details'],
            ['name' => 'invitations.revoke', 'display_name' => 'Revoke Invitations', 'description' => 'Revoke pending invitations'],
            ['name' => 'invitations.resend', 'display_name' => 'Resend Invitations', 'description' => 'Resend invitation emails'],

            // Role Management
            ['name' => 'roles.viewAny', 'display_name' => 'View Roles List', 'description' => 'View role list'],
            ['name' => 'roles.view', 'display_name' => 'View Role Details', 'description' => 'View role details'],
            ['name' => 'roles.create', 'display_name' => 'Create Custom Roles', 'description' => 'Create custom roles'],
            ['name' => 'roles.update', 'display_name' => 'Update Role Permissions', 'description' => 'Update role permissions'],
            ['name' => 'roles.delete', 'display_name' => 'Delete Custom Roles', 'description' => 'Delete custom roles (not system roles)'],
            ['name' => 'roles.assign', 'display_name' => 'Assign Roles', 'description' => 'Assign roles to users'],

            // Plants - Only the global create permission
            ['name' => 'system.create-plants', 'display_name' => 'Create Plants', 'description' => 'Ability to create new plants (system-wide)'],
            
            // Note: All other plant, area, sector, asset permissions are created dynamically when entities are created

            // System Administration
            ['name' => 'system.settings.view', 'display_name' => 'View System Settings', 'description' => 'View system settings'],
            ['name' => 'system.settings.update', 'display_name' => 'Update System Settings', 'description' => 'Update system settings'],
            ['name' => 'system.audit.view', 'display_name' => 'View Audit Trails', 'description' => 'View audit trails'],
            ['name' => 'system.backup.create', 'display_name' => 'Create System Backups', 'description' => 'Create system backups'],
            ['name' => 'system.backup.restore', 'display_name' => 'Restore From Backups', 'description' => 'Restore from backups'],
            ['name' => 'system.maintenance-mode', 'display_name' => 'Maintenance Mode', 'description' => 'Enable/disable maintenance mode'],
            
            // Bulk Operations (NEW IN V2)
            ['name' => 'system.bulk-import-assets', 'display_name' => 'Bulk Import Assets', 'description' => 'Bulk import assets (respects entity permissions)'],
            ['name' => 'system.bulk-export-assets', 'display_name' => 'Bulk Export Assets', 'description' => 'Bulk export assets (respects entity permissions)'],
            
            // Special Reports (NEW IN V2)
            ['name' => 'system.dashboard.view', 'display_name' => 'View Executive Dashboards', 'description' => 'View executive dashboards (cross-functional data)'],
            ['name' => 'system.compliance.view', 'display_name' => 'View Compliance Reports', 'description' => 'View compliance reports (regulatory requirements)'],
        ];

        // Create permissions
        foreach ($permissions as $index => $permissionData) {
            Permission::firstOrCreate(
                ['name' => $permissionData['name']],
                array_merge($permissionData, ['sort_order' => $index])
            );
        }

        $this->command->info('System-level permissions created successfully.');
        $this->command->info('Entity-specific permissions will be created automatically when plants, areas, sectors, and assets are created.');
    }
}
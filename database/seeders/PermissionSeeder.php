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
        // Define all permissions from the specification
        $permissions = [
            // User Management
            ['name' => 'users.viewAny', 'display_name' => 'View Users List', 'description' => 'View user list'],
            ['name' => 'users.view', 'display_name' => 'View User Details', 'description' => 'View user details'],
            ['name' => 'users.invite', 'display_name' => 'Send User Invitations', 'description' => 'Send user invitations'],
            ['name' => 'users.update', 'display_name' => 'Update Any User', 'description' => 'Update any user'],
            ['name' => 'users.update.owned', 'display_name' => 'Update Own Profile', 'description' => 'Update own profile only'],
            ['name' => 'users.delete', 'display_name' => 'Delete Users', 'description' => 'Delete users'],
            ['name' => 'users.impersonate', 'display_name' => 'Impersonate Users', 'description' => 'Login as another user'],
            ['name' => 'users.manage-permissions', 'display_name' => 'Manage User Permissions', 'description' => 'Assign/revoke permissions'],
            ['name' => 'users.manage-roles', 'display_name' => 'Manage User Roles', 'description' => 'Assign/revoke roles'],
            ['name' => 'users.grant-super-admin', 'display_name' => 'Grant Super Admin', 'description' => 'Grant Super Administrator privileges'],
            ['name' => 'users.revoke-super-admin', 'display_name' => 'Revoke Super Admin', 'description' => 'Revoke Super Administrator privileges'],

            // Invitation Management
            ['name' => 'invitations.viewAny', 'display_name' => 'View All Invitations', 'description' => 'View all invitations'],
            ['name' => 'invitations.view', 'display_name' => 'View Invitation Details', 'description' => 'View invitation details'],
            ['name' => 'invitations.create', 'display_name' => 'Send New Invitations', 'description' => 'Send new invitations'],
            ['name' => 'invitations.revoke', 'display_name' => 'Revoke Invitations', 'description' => 'Revoke pending invitations'],
            ['name' => 'invitations.resend', 'display_name' => 'Resend Invitations', 'description' => 'Resend invitation emails'],

            // Role Management
            ['name' => 'roles.viewAny', 'display_name' => 'View Roles List', 'description' => 'View role list'],
            ['name' => 'roles.view', 'display_name' => 'View Role Details', 'description' => 'View role details'],
            ['name' => 'roles.create', 'display_name' => 'Create Custom Roles', 'description' => 'Create custom roles'],
            ['name' => 'roles.update', 'display_name' => 'Update Role Permissions', 'description' => 'Update role permissions'],
            ['name' => 'roles.delete', 'display_name' => 'Delete Custom Roles', 'description' => 'Delete custom roles'],
            ['name' => 'roles.assign', 'display_name' => 'Assign Roles', 'description' => 'Assign roles to users'],

            // Plants
            ['name' => 'plants.viewAny', 'display_name' => 'View All Plants', 'description' => 'View all plants'],
            ['name' => 'plants.view', 'display_name' => 'View Plant Details', 'description' => 'View plant details'],
            ['name' => 'plants.create', 'display_name' => 'Create Plants', 'description' => 'Create new plants'],
            ['name' => 'plants.update', 'display_name' => 'Update Plants', 'description' => 'Update plant information'],
            ['name' => 'plants.delete', 'display_name' => 'Delete Plants', 'description' => 'Delete plants'],
            ['name' => 'plants.manage-shifts', 'display_name' => 'Manage Plant Shifts', 'description' => 'Manage plant shifts'],

            // Areas
            ['name' => 'areas.viewAny', 'display_name' => 'View All Areas', 'description' => 'View all areas'],
            ['name' => 'areas.view', 'display_name' => 'View Area Details', 'description' => 'View area details'],
            ['name' => 'areas.create', 'display_name' => 'Create Areas', 'description' => 'Create areas in any plant'],
            ['name' => 'areas.update', 'display_name' => 'Update Areas', 'description' => 'Update any area'],
            ['name' => 'areas.delete', 'display_name' => 'Delete Areas', 'description' => 'Delete any area'],

            // Sectors
            ['name' => 'sectors.viewAny', 'display_name' => 'View All Sectors', 'description' => 'View all sectors'],
            ['name' => 'sectors.view', 'display_name' => 'View Sector Details', 'description' => 'View sector details'],
            ['name' => 'sectors.create', 'display_name' => 'Create Sectors', 'description' => 'Create sectors in any area'],
            ['name' => 'sectors.update', 'display_name' => 'Update Sectors', 'description' => 'Update any sector'],
            ['name' => 'sectors.delete', 'display_name' => 'Delete Sectors', 'description' => 'Delete any sector'],

            // Assets
            ['name' => 'assets.viewAny', 'display_name' => 'View All Assets', 'description' => 'View all assets'],
            ['name' => 'assets.view', 'display_name' => 'View Asset Details', 'description' => 'View asset details'],
            ['name' => 'assets.create', 'display_name' => 'Create Assets', 'description' => 'Create assets anywhere'],
            ['name' => 'assets.update', 'display_name' => 'Update Assets', 'description' => 'Update any asset'],
            ['name' => 'assets.delete', 'display_name' => 'Delete Assets', 'description' => 'Delete any asset'],
            ['name' => 'assets.import', 'display_name' => 'Import Assets', 'description' => 'Bulk import assets'],
            ['name' => 'assets.export', 'display_name' => 'Export Assets', 'description' => 'Export asset data'],
            ['name' => 'assets.manage-qr', 'display_name' => 'Manage QR Codes', 'description' => 'Generate/manage QR codes'],
            ['name' => 'assets.view.owned', 'display_name' => 'View Own Assets', 'description' => 'View only assets created by user'],
            ['name' => 'assets.update.owned', 'display_name' => 'Update Own Assets', 'description' => 'Update only owned assets'],
            ['name' => 'assets.delete.owned', 'display_name' => 'Delete Own Assets', 'description' => 'Delete only owned assets'],

            // Asset Types
            ['name' => 'asset-types.viewAny', 'display_name' => 'View All Asset Types', 'description' => 'View all asset types'],
            ['name' => 'asset-types.view', 'display_name' => 'View Asset Type Details', 'description' => 'View asset type details'],
            ['name' => 'asset-types.create', 'display_name' => 'Create Asset Types', 'description' => 'Create new asset types'],
            ['name' => 'asset-types.update', 'display_name' => 'Update Asset Types', 'description' => 'Update asset types'],
            ['name' => 'asset-types.delete', 'display_name' => 'Delete Asset Types', 'description' => 'Delete asset types'],

            // Manufacturers
            ['name' => 'manufacturers.viewAny', 'display_name' => 'View All Manufacturers', 'description' => 'View all manufacturers'],
            ['name' => 'manufacturers.view', 'display_name' => 'View Manufacturer Details', 'description' => 'View manufacturer details'],
            ['name' => 'manufacturers.create', 'display_name' => 'Create Manufacturers', 'description' => 'Create new manufacturers'],
            ['name' => 'manufacturers.update', 'display_name' => 'Update Manufacturers', 'description' => 'Update manufacturers'],
            ['name' => 'manufacturers.delete', 'display_name' => 'Delete Manufacturers', 'description' => 'Delete manufacturers'],

            // Forms
            ['name' => 'forms.viewAny', 'display_name' => 'View All Forms', 'description' => 'View all forms'],
            ['name' => 'forms.view', 'display_name' => 'View Form Details', 'description' => 'View form details'],
            ['name' => 'forms.create', 'display_name' => 'Create Forms', 'description' => 'Create new forms'],
            ['name' => 'forms.update', 'display_name' => 'Update Forms', 'description' => 'Update forms'],
            ['name' => 'forms.delete', 'display_name' => 'Delete Forms', 'description' => 'Delete forms'],
            ['name' => 'forms.publish', 'display_name' => 'Publish Forms', 'description' => 'Publish form versions'],
            ['name' => 'forms.archive', 'display_name' => 'Archive Forms', 'description' => 'Archive forms'],
            ['name' => 'forms.versions.create', 'display_name' => 'Create Form Versions', 'description' => 'Create new versions'],
            ['name' => 'forms.versions.view', 'display_name' => 'View Form Version History', 'description' => 'View version history'],
            ['name' => 'forms.versions.restore', 'display_name' => 'Restore Form Versions', 'description' => 'Restore old versions'],
            ['name' => 'forms.view.owned', 'display_name' => 'View Own Forms', 'description' => 'View only owned forms'],
            ['name' => 'forms.update.owned', 'display_name' => 'Update Own Forms', 'description' => 'Update only owned forms'],
            ['name' => 'forms.delete.owned', 'display_name' => 'Delete Own Forms', 'description' => 'Delete only owned forms'],

            // Routines
            ['name' => 'routines.viewAny', 'display_name' => 'View All Routines', 'description' => 'View all routines'],
            ['name' => 'routines.view', 'display_name' => 'View Routine Details', 'description' => 'View routine details'],
            ['name' => 'routines.create', 'display_name' => 'Create Routines', 'description' => 'Create routines'],
            ['name' => 'routines.update', 'display_name' => 'Update Routines', 'description' => 'Update routines'],
            ['name' => 'routines.delete', 'display_name' => 'Delete Routines', 'description' => 'Delete routines'],
            ['name' => 'routines.assign', 'display_name' => 'Assign Routines', 'description' => 'Assign routines to assets'],
            ['name' => 'routines.schedule', 'display_name' => 'Schedule Routines', 'description' => 'Set routine schedules'],
            ['name' => 'routines.view.owned', 'display_name' => 'View Own Routines', 'description' => 'View only owned routines'],
            ['name' => 'routines.update.owned', 'display_name' => 'Update Own Routines', 'description' => 'Update only owned routines'],
            ['name' => 'routines.delete.owned', 'display_name' => 'Delete Own Routines', 'description' => 'Delete only owned routines'],

            // Routine Executions
            ['name' => 'routine-executions.viewAny', 'display_name' => 'View All Routine Executions', 'description' => 'View all routine executions'],
            ['name' => 'routine-executions.view', 'display_name' => 'View Routine Execution Details', 'description' => 'View routine execution details'],
            ['name' => 'routine-executions.create', 'display_name' => 'Start Routine Executions', 'description' => 'Start new routine executions'],
            ['name' => 'routine-executions.update', 'display_name' => 'Update Routine Executions', 'description' => 'Update routine execution data'],
            ['name' => 'routine-executions.complete', 'display_name' => 'Complete Routine Executions', 'description' => 'Mark routine executions as complete'],
            ['name' => 'routine-executions.approve', 'display_name' => 'Approve Routine Executions', 'description' => 'Approve completed routine executions'],
            ['name' => 'routine-executions.reject', 'display_name' => 'Reject Routine Executions', 'description' => 'Reject routine executions'],
            ['name' => 'routine-executions.export', 'display_name' => 'Export Routine Executions', 'description' => 'Export routine execution data'],
            ['name' => 'routine-executions.view.assigned', 'display_name' => 'View Assigned Executions', 'description' => 'View only assigned routine executions'],
            ['name' => 'routine-executions.complete.assigned', 'display_name' => 'Complete Assigned Executions', 'description' => 'Complete only assigned routine executions'],

            // Reporting & Analytics
            ['name' => 'reports.view', 'display_name' => 'View All Reports', 'description' => 'View all reports'],
            ['name' => 'reports.create', 'display_name' => 'Create Custom Reports', 'description' => 'Create custom reports'],
            ['name' => 'reports.export', 'display_name' => 'Export Report Data', 'description' => 'Export report data'],
            ['name' => 'reports.schedule', 'display_name' => 'Schedule Reports', 'description' => 'Schedule automatic reports'],
            ['name' => 'reports.maintenance.view', 'display_name' => 'View Maintenance Reports', 'description' => 'View maintenance reports'],
            ['name' => 'reports.assets.view', 'display_name' => 'View Asset Reports', 'description' => 'View asset reports'],
            ['name' => 'reports.compliance.view', 'display_name' => 'View Compliance Reports', 'description' => 'View compliance reports'],
            ['name' => 'reports.performance.view', 'display_name' => 'View Performance Reports', 'description' => 'View performance reports'],

            // System Administration
            ['name' => 'system.settings.view', 'display_name' => 'View System Settings', 'description' => 'View system settings'],
            ['name' => 'system.settings.update', 'display_name' => 'Update System Settings', 'description' => 'Update system settings'],
            ['name' => 'system.logs.view', 'display_name' => 'View System Logs', 'description' => 'View system logs'],
            ['name' => 'system.logs.export', 'display_name' => 'Export System Logs', 'description' => 'Export system logs'],
            ['name' => 'system.audit.view', 'display_name' => 'View Audit Trails', 'description' => 'View audit trails'],
            ['name' => 'system.backup.create', 'display_name' => 'Create System Backups', 'description' => 'Create system backups'],
            ['name' => 'system.backup.restore', 'display_name' => 'Restore From Backups', 'description' => 'Restore from backups'],
            ['name' => 'system.maintenance-mode', 'display_name' => 'Maintenance Mode', 'description' => 'Enable/disable maintenance mode'],

            // Shift Management
            ['name' => 'shifts.viewAny', 'display_name' => 'View All Shifts', 'description' => 'View all shifts'],
            ['name' => 'shifts.view', 'display_name' => 'View Shift Details', 'description' => 'View shift details'],
            ['name' => 'shifts.create', 'display_name' => 'Create Shifts', 'description' => 'Create shifts'],
            ['name' => 'shifts.update', 'display_name' => 'Update Shifts', 'description' => 'Update shifts'],
            ['name' => 'shifts.delete', 'display_name' => 'Delete Shifts', 'description' => 'Delete shifts'],
        ];

        // Create permissions
        foreach ($permissions as $index => $permissionData) {
            Permission::firstOrCreate(
                ['name' => $permissionData['name']],
                array_merge($permissionData, ['sort_order' => $index])
            );
        }

        $this->command->info('Permissions created successfully.');
    }
}
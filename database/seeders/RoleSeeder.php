<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create system roles with default permissions
        $roles = [
            [
                'name' => 'Administrator',
                'is_system' => true,
                'permissions' => [
                    // User Management (except super admin privileges)
                    'users.viewAny', 'users.view', 'users.invite', 'users.update', 'users.delete',
                    'users.manage-permissions', 'users.manage-roles',
                    
                    // Invitations
                    'invitations.viewAny', 'invitations.view', 'invitations.create', 'invitations.revoke', 'invitations.resend',
                    
                    // Roles
                    'roles.viewAny', 'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'roles.assign',
                    
                    // All plant/area/sector/asset permissions
                    'plants.viewAny', 'plants.view', 'plants.create', 'plants.update', 'plants.delete', 'plants.manage-shifts',
                    'areas.viewAny', 'areas.view', 'areas.create', 'areas.update', 'areas.delete',
                    'sectors.viewAny', 'sectors.view', 'sectors.create', 'sectors.update', 'sectors.delete',
                    'assets.viewAny', 'assets.view', 'assets.create', 'assets.update', 'assets.delete',
                    'assets.import', 'assets.export', 'assets.manage-qr',
                    'asset-types.viewAny', 'asset-types.view', 'asset-types.create', 'asset-types.update', 'asset-types.delete',
                    'manufacturers.viewAny', 'manufacturers.view', 'manufacturers.create', 'manufacturers.update', 'manufacturers.delete',
                    
                    // Forms and routines
                    'forms.viewAny', 'forms.view', 'forms.create', 'forms.update', 'forms.delete',
                    'forms.publish', 'forms.archive', 'forms.versions.create', 'forms.versions.view', 'forms.versions.restore',
                    'routines.viewAny', 'routines.view', 'routines.create', 'routines.update', 'routines.delete',
                    'routines.assign', 'routines.schedule',
                    'routine-executions.viewAny', 'routine-executions.view', 'routine-executions.create',
                    'routine-executions.update', 'routine-executions.complete', 'routine-executions.approve',
                    'routine-executions.reject', 'routine-executions.export',
                    
                    // Reports
                    'reports.view', 'reports.create', 'reports.export', 'reports.schedule',
                    'reports.maintenance.view', 'reports.assets.view', 'reports.compliance.view', 'reports.performance.view',
                    
                    // Shifts
                    'shifts.viewAny', 'shifts.view', 'shifts.create', 'shifts.update', 'shifts.delete',
                ]
            ],
            [
                'name' => 'Plant Manager',
                'is_system' => true,
                'permissions' => [
                    // Users (limited)
                    'users.viewAny', 'users.view', 'users.invite',
                    
                    // Plant hierarchy (view only for others, manage for assigned plants via scoped permissions)
                    'plants.viewAny', 'plants.view',
                    'areas.viewAny', 'areas.view', 'areas.create', 'areas.update',
                    'sectors.viewAny', 'sectors.view', 'sectors.create', 'sectors.update',
                    'assets.viewAny', 'assets.view', 'assets.create', 'assets.update', 'assets.export',
                    'asset-types.viewAny', 'asset-types.view',
                    'manufacturers.viewAny', 'manufacturers.view',
                    
                    // Forms and routines
                    'forms.viewAny', 'forms.view', 'forms.create', 'forms.update',
                    'forms.publish', 'forms.versions.view',
                    'routines.viewAny', 'routines.view', 'routines.create', 'routines.update',
                    'routines.assign', 'routines.schedule',
                    'routine-executions.viewAny', 'routine-executions.view', 'routine-executions.approve',
                    'routine-executions.reject', 'routine-executions.export',
                    
                    // Reports
                    'reports.view', 'reports.create', 'reports.export',
                    'reports.maintenance.view', 'reports.assets.view', 'reports.performance.view',
                    
                    // Shifts for plant
                    'shifts.viewAny', 'shifts.view', 'shifts.create', 'shifts.update',
                ]
            ],
            [
                'name' => 'Area Supervisor',
                'is_system' => true,
                'permissions' => [
                    // Limited user view
                    'users.viewAny', 'users.view',
                    
                    // Plant hierarchy (view only for others, manage for assigned areas via scoped permissions)
                    'plants.viewAny', 'plants.view',
                    'areas.viewAny', 'areas.view',
                    'sectors.viewAny', 'sectors.view', 'sectors.create', 'sectors.update',
                    'assets.viewAny', 'assets.view', 'assets.create', 'assets.update',
                    'asset-types.viewAny', 'asset-types.view',
                    'manufacturers.viewAny', 'manufacturers.view',
                    
                    // Forms and routines
                    'forms.viewAny', 'forms.view',
                    'routines.viewAny', 'routines.view', 'routines.assign',
                    'routine-executions.viewAny', 'routine-executions.view', 'routine-executions.approve',
                    'routine-executions.export',
                    
                    // Reports
                    'reports.view', 'reports.export',
                    'reports.maintenance.view', 'reports.assets.view',
                    
                    // Shifts
                    'shifts.viewAny', 'shifts.view',
                ]
            ],
            [
                'name' => 'Technician',
                'is_system' => true,
                'permissions' => [
                    // Own profile only
                    'users.update.owned',
                    
                    // View access to hierarchy
                    'plants.viewAny', 'plants.view',
                    'areas.viewAny', 'areas.view',
                    'sectors.viewAny', 'sectors.view',
                    'assets.viewAny', 'assets.view',
                    'asset-types.viewAny', 'asset-types.view',
                    'manufacturers.viewAny', 'manufacturers.view',
                    
                    // Forms (view only)
                    'forms.viewAny', 'forms.view',
                    
                    // Routines (view only)
                    'routines.viewAny', 'routines.view',
                    
                    // Routine executions (assigned only)
                    'routine-executions.view.assigned', 'routine-executions.complete.assigned',
                    
                    // Basic reports
                    'reports.view',
                    
                    // Shifts (view only)
                    'shifts.viewAny', 'shifts.view',
                ]
            ],
            [
                'name' => 'Viewer',
                'is_system' => true,
                'permissions' => [
                    // Own profile only
                    'users.update.owned',
                    
                    // Read-only access to everything
                    'plants.viewAny', 'plants.view',
                    'areas.viewAny', 'areas.view',
                    'sectors.viewAny', 'sectors.view',
                    'assets.viewAny', 'assets.view',
                    'asset-types.viewAny', 'asset-types.view',
                    'manufacturers.viewAny', 'manufacturers.view',
                    'forms.viewAny', 'forms.view', 'forms.versions.view',
                    'routines.viewAny', 'routines.view',
                    'routine-executions.viewAny', 'routine-executions.view',
                    'reports.view',
                    'shifts.viewAny', 'shifts.view',
                ]
            ]
        ];

        foreach ($roles as $roleData) {
            // Create role
            $role = Role::firstOrCreate(
                ['name' => $roleData['name']],
                ['is_system' => $roleData['is_system']]
            );

            // Assign permissions
            $permissions = Permission::whereIn('name', $roleData['permissions'])->get();
            $role->syncPermissions($permissions);

            $this->command->info("Role '{$role->name}' created with " . count($permissions) . " permissions.");
        }

        $this->command->info('System roles created successfully.');
    }
}
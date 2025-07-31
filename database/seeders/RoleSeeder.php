<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * V2: Create system roles with Administrator as the combined super admin role
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Create Administrator role (combined Super Admin + Admin)
            $administrator = Role::firstOrCreate(
                ['name' => 'Administrator', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'is_administrator' => true,
                    'display_name' => 'Administrator',
                    'description' => 'Full system access with all permissions'
                ]
            );

            // Administrator has wildcard permissions - we still record them for auditability
            // But the hasPermissionTo() method will always return true for administrators
            $administrator->syncPermissions(Permission::all());

            // Create other system roles
            $plantManager = Role::firstOrCreate(
                ['name' => 'Plant Manager', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Plant Manager',
                    'description' => 'Manage all resources within assigned plants'
                ]
            );

            // Plant Manager gets system-level permissions by default
            $plantManagerPermissions = [
                'system.create-plants',
                'system.bulk-import-assets',
                'system.bulk-export-assets',
                'users.viewAny',
                'users.view',
                'roles.viewAny',
                'roles.view',
                // Work Order permissions
                'work-orders.view',
                'work-orders.create',
                'work-orders.update',
                'work-orders.approve',
                'work-orders.plan',
                'work-orders.validate',
                'work-orders.cancel',
                // Production permissions
                'production.orders.create',
                'production.orders.release',
                'production.orders.cancel',
                'production.routes.create',
                // Parts permissions
                'parts.viewAny',
                'parts.view',
                'parts.create',
                'parts.update',
                'parts.delete',
                'parts.manage-stock',
                'parts.import',
                'parts.export',
                // Skills permissions
                'skills.viewAny',
                'skills.view',
                'skills.create',
                'skills.update',
                'skills.delete',
                // Certifications permissions
                'certifications.viewAny',
                'certifications.view',
                'certifications.create',
                'certifications.update',
                'certifications.delete',
                // Production category permissions
                'production.categories.view',
                'production.categories.create',
                'production.categories.update',
                'production.categories.delete',
                // Work Cell permissions
                'production.work-cells.viewAny',
                'production.work-cells.view',
                'production.work-cells.create',
                'production.work-cells.update',
                'production.work-cells.delete',
            ];
            $plantManager->syncPermissions($plantManagerPermissions);

            $areaManager = Role::firstOrCreate(
                ['name' => 'Area Manager', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Area Manager',
                    'description' => 'Manage resources within assigned areas'
                ]
            );
            
            // Area Manager gets limited permissions by default
            $areaManagerPermissions = [
                'users.viewAny',
                'users.view',
                'users.update.owned',
                // Work Order permissions
                'work-orders.view',
                'work-orders.create',
                'work-orders.update',
            ];
            $areaManager->syncPermissions($areaManagerPermissions);

            $sectorManager = Role::firstOrCreate(
                ['name' => 'Sector Manager', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Sector Manager',
                    'description' => 'Manage resources within assigned sectors'
                ]
            );
            
            // Sector Manager gets limited permissions by default
            $sectorManagerPermissions = [
                'users.viewAny',
                'users.view',
                'users.update.owned',
                // Work Order permissions
                'work-orders.view',
                'work-orders.create',
            ];
            $sectorManager->syncPermissions($sectorManagerPermissions);

            $maintenanceSupervisor = Role::firstOrCreate(
                ['name' => 'Maintenance Supervisor', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Maintenance Supervisor',
                    'description' => 'Execute and supervise maintenance tasks at plant, area, or sector level'
                ]
            );
            
            // Maintenance Supervisor gets basic permissions
            $maintenanceSupervisorPermissions = [
                'users.update.owned',
                // Work Order permissions
                'work-orders.view',
                'work-orders.create',
                'work-orders.update',
                'work-orders.approve', // Limited by cost/priority in policy
                'work-orders.plan',
                'work-orders.execute',
                'work-orders.complete',
                'work-orders.validate',
                // Parts permissions
                'parts.viewAny',
                'parts.view',
                'parts.create',
                'parts.update',
                'parts.delete',
                'parts.manage-stock',
                'parts.export',
                // Skills permissions
                'skills.viewAny',
                'skills.view',
                'skills.create',
                'skills.update',
                'skills.delete',
                // Certifications permissions
                'certifications.viewAny',
                'certifications.view',
                'certifications.create',
                'certifications.update',
                'certifications.delete',
                // Production category permissions
                'production.categories.view',
                'production.categories.create',
                'production.categories.update',
                'production.categories.delete',
                // Work Cell permissions
                'production.work-cells.viewAny',
                'production.work-cells.view',
                'production.work-cells.create',
                'production.work-cells.update',
                'production.work-cells.delete',
            ];
            $maintenanceSupervisor->syncPermissions($maintenanceSupervisorPermissions);

            // Create Planner role
            $planner = Role::firstOrCreate(
                ['name' => 'Planner', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Planner',
                    'description' => 'Plan and schedule maintenance work orders'
                ]
            );
            
            // Planner permissions
            $plannerPermissions = [
                'users.update.owned',
                // Work Order permissions
                'work-orders.view',
                'work-orders.create',
                'work-orders.update',
                'work-orders.plan',
                // Parts permissions
                'parts.viewAny',
                'parts.view',
                'parts.create',
                'parts.update',
                'parts.delete',
                'parts.manage-stock',
                'parts.export',
                // Production category permissions
                'production.categories.view',
                // Work Cell permissions
                'production.work-cells.viewAny',
                'production.work-cells.view',
            ];
            $planner->syncPermissions($plannerPermissions);

            $technician = Role::firstOrCreate(
                ['name' => 'Technician', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Technician',
                    'description' => 'Execute maintenance tasks at plant, area, sector, or individual asset level'
                ]
            );
            
            // Technician gets minimal permissions
            $technicianPermissions = [
                'users.update.owned',
                // Work Order permissions
                'work-orders.view', // Can view assigned work orders
                'work-orders.execute', // Can execute assigned work orders
                'work-orders.complete', // Can complete assigned work orders
                // Parts permissions
                'parts.viewAny',
                'parts.view',
                // Skills permissions (view only)
                'skills.viewAny',
                'skills.view',
                // Certifications permissions (view only)
                'certifications.viewAny',
                'certifications.view',
                // Production category permissions (view only)
                'production.categories.view',
                // Work Cell permissions (view only)
                'production.work-cells.viewAny',
                'production.work-cells.view',
            ];
            $technician->syncPermissions($technicianPermissions);

            // Create Validator role
            $validator = Role::firstOrCreate(
                ['name' => 'Validator', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Validator',
                    'description' => 'Validate quality of completed work orders'
                ]
            );
            
            // Validator permissions
            $validatorPermissions = [
                'users.update.owned',
                // Work Order permissions
                'work-orders.view',
                'work-orders.validate',
            ];
            $validator->syncPermissions($validatorPermissions);

            $viewer = Role::firstOrCreate(
                ['name' => 'Viewer', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Viewer',
                    'description' => 'Read-only access to assigned resources at any level'
                ]
            );
            
            // Viewer gets minimal permissions
            $viewerPermissions = [
                'users.update.owned',
                // Work Order permissions
                'work-orders.view', // Read-only access
                // Parts permissions
                'parts.viewAny',
                'parts.view',
                // Skills permissions (view only)
                'skills.viewAny',
                'skills.view',
                // Certifications permissions (view only)
                'certifications.viewAny',
                'certifications.view',
                // Production category permissions (view only)
                'production.categories.view',
                // Work Cell permissions (view only)
                'production.work-cells.viewAny',
                'production.work-cells.view',
            ];
            $viewer->syncPermissions($viewerPermissions);

            $this->command->info('System roles created successfully.');
            $this->command->info('Administrator role has wildcard permissions.');
            $this->command->info('Entity-specific permissions will be assigned when users are assigned to specific entities.');
            $this->command->info('');
            $this->command->info('Role Templates (assigned when user is given role for specific entity):');
            $this->command->info('');
            $this->command->info('Plant Manager (when assigned to a plant):');
            $this->command->info('  - plants.view.[id]');
            $this->command->info('  - plants.update.[id]');
            $this->command->info('  - plants.manage-shifts.[id]');
            $this->command->info('  - users.invite.plant.[id]');
            $this->command->info('  - areas.create.plant.[id]');
            $this->command->info('  - areas.viewAny.plant.[id]');
            $this->command->info('  - sectors.viewAny.plant.[id]');
            $this->command->info('  - sectors.create.plant.[id]');
            $this->command->info('  - assets.viewAny.plant.[id]');
            $this->command->info('  - assets.create.plant.[id]');
            $this->command->info('  - assets.manage.plant.[id]');
            $this->command->info('  - assets.execute-routines.plant.[id]');
            $this->command->info('  - assets.import.plant.[id]');
            $this->command->info('  - assets.export.plant.[id]');
            $this->command->info('  - shifts.viewAny.plant.[id]');
            $this->command->info('  - shifts.create.plant.[id]');
            $this->command->info('  - shifts.manage.plant.[id]');
            $this->command->info('  - asset-types.viewAny.plant.[id]');
            $this->command->info('  - asset-types.create.plant.[id]');
            $this->command->info('  - manufacturers.viewAny.plant.[id]');
            $this->command->info('  - manufacturers.create.plant.[id]');
            $this->command->info('  - work-orders.view.plant.[id]');
            $this->command->info('  - work-orders.create.plant.[id]');
            $this->command->info('  - work-orders.update.plant.[id]');
            $this->command->info('  - work-orders.approve.plant.[id]');
            $this->command->info('  - work-orders.plan.plant.[id]');
            $this->command->info('  - work-orders.validate.plant.[id]');
            $this->command->info('  - work-orders.cancel.plant.[id]');
            $this->command->info('');
            $this->command->info('Area Manager (when assigned to an area):');
            $this->command->info('  - users.invite.area.[id]');
            $this->command->info('  - areas.view.[id]');
            $this->command->info('  - areas.update.[id]');
            $this->command->info('  - sectors.create.area.[id]');
            $this->command->info('  - sectors.viewAny.area.[id]');
            $this->command->info('  - assets.viewAny.area.[id]');
            $this->command->info('  - assets.create.area.[id]');
            $this->command->info('  - assets.manage.area.[id]');
            $this->command->info('  - assets.execute-routines.area.[id]');
            $this->command->info('  - assets.export.area.[id]');
            $this->command->info('  - work-orders.view.area.[id]');
            $this->command->info('  - work-orders.create.area.[id]');
            $this->command->info('  - work-orders.update.area.[id]');
            $this->command->info('');
            $this->command->info('Sector Manager (when assigned to a sector):');
            $this->command->info('  - users.invite.sector.[id]');
            $this->command->info('  - sectors.view.[id]');
            $this->command->info('  - sectors.update.[id]');
            $this->command->info('  - assets.viewAny.sector.[id]');
            $this->command->info('  - assets.create.sector.[id]');
            $this->command->info('  - assets.manage.sector.[id]');
            $this->command->info('  - assets.execute-routines.sector.[id]');
            $this->command->info('  - assets.export.sector.[id]');
            $this->command->info('  - work-orders.view.sector.[id]');
            $this->command->info('  - work-orders.create.sector.[id]');
            $this->command->info('');
            $this->command->info('Maintenance Supervisor (flexible assignment to plant/area/sector):');
            $this->command->info('  - assets.viewAny.[scope].[id]');
            $this->command->info('  - assets.view.[scope].[id]');
            $this->command->info('  - assets.execute-routines.[scope].[id]');
            $this->command->info('  - work-orders.view.[scope].[id]');
            $this->command->info('  - work-orders.create.[scope].[id]');
            $this->command->info('  - work-orders.update.[scope].[id]');
            $this->command->info('  - work-orders.approve.[scope].[id] (limited by cost/priority)');
            $this->command->info('  - work-orders.plan.[scope].[id]');
            $this->command->info('  - work-orders.execute.[scope].[id]');
            $this->command->info('  - work-orders.complete.[scope].[id]');
            $this->command->info('  - work-orders.validate.[scope].[id]');
            $this->command->info('');
            $this->command->info('Planner (flexible assignment to plant/area/sector):');
            $this->command->info('  - assets.viewAny.[scope].[id]');
            $this->command->info('  - assets.view.[scope].[id]');
            $this->command->info('  - work-orders.view.[scope].[id]');
            $this->command->info('  - work-orders.create.[scope].[id]');
            $this->command->info('  - work-orders.update.[scope].[id]');
            $this->command->info('  - work-orders.plan.[scope].[id]');
            $this->command->info('');
            $this->command->info('Technician (flexible assignment to plant/area/sector/asset):');
            $this->command->info('  For individual assets:');
            $this->command->info('  - assets.view.[id]');
            $this->command->info('  - assets.execute-routines.[id]');
            $this->command->info('  For scoped assignment:');
            $this->command->info('  - assets.viewAny.[scope].[id]');
            $this->command->info('  - assets.view.[scope].[id]');
            $this->command->info('  - assets.execute-routines.[scope].[id]');
            $this->command->info('  - work-orders.view.[scope].[id] (assigned only)');
            $this->command->info('  - work-orders.execute.[scope].[id] (assigned only)');
            $this->command->info('  - work-orders.complete.[scope].[id] (assigned only)');
            $this->command->info('');
            $this->command->info('Validator (flexible assignment to plant/area/sector):');
            $this->command->info('  - work-orders.view.[scope].[id]');
            $this->command->info('  - work-orders.validate.[scope].[id]');
            $this->command->info('');
            $this->command->info('Viewer (flexible assignment to any entity):');
            $this->command->info('  - [resource].view.[id]');
            $this->command->info('  - [resource].viewAny.[scope].[id]');
            $this->command->info('  - work-orders.view.[scope].[id]');
        });
    }
}
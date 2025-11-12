<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Seeder for tenant roles.
 * Creates all system roles within the tenant database context.
 * Note: Permissions must be seeded BEFORE this seeder runs (via TenantPermissionSeeder).
 */
class TenantRolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure we're in tenant context
        if (! tenancy()->initialized) {
            $this->command->error('Tenant context not initialized. This seeder must run within a tenant database.');

            return;
        }

        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        DB::transaction(function () {
            // Create Administrator role (combined Super Admin + Admin)
            $administrator = Role::firstOrCreate(
                ['name' => 'Administrator', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'is_administrator' => true,
                    'display_name' => 'Administrator',
                    'description' => 'Full system access with all permissions',
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
                    'description' => 'Manage all resources within assigned plants',
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
                'production.orders.plan',
                'production.orders.schedule',
                'production.orders.release',
                'production.orders.start',
                'production.orders.hold',
                'production.orders.resume',
                'production.orders.cancel',
                'production.routes.create',
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
                'production.categories.viewAny',
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
                // Production Item permissions
                'production.items.viewAny',
                'production.items.view',
                'production.items.create',
                'production.items.update',
                'production.items.delete',
                'production.items.import',
                'production.items.export',
                'production.items.images.manage',
                // Production Order permissions
                'production.orders.viewAny',
                'production.orders.view',
                'production.orders.create',
                'production.orders.update',
                'production.orders.plan',
                'production.orders.schedule',
                'production.orders.release',
                'production.orders.start',
                'production.orders.hold',
                'production.orders.resume',
                'production.orders.cancel',
                // Production Route permissions
                'production.routes.viewAny',
                'production.routes.view',
                'production.routes.create',
                'production.routes.update',
                'production.routes.delete',
            ];
            $plantManager->syncPermissions($plantManagerPermissions);

            $areaManager = Role::firstOrCreate(
                ['name' => 'Area Manager', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Area Manager',
                    'description' => 'Manage resources within assigned areas',
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
                    'description' => 'Manage resources within assigned sectors',
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
                    'description' => 'Execute and supervise maintenance tasks at plant, area, or sector level',
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
                'production.categories.viewAny',
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
                // Production Item permissions
                'production.items.viewAny',
                'production.items.view',
                'production.items.create',
                'production.items.update',
                'production.items.delete',
                'production.items.import',
                'production.items.export',
                'production.items.images.manage',
                // Production Order permissions
                'production.orders.viewAny',
                'production.orders.view',
                'production.orders.start',
                'production.orders.hold',
                'production.orders.resume',
                'production.orders.reportProduction',
                // Production Route permissions
                'production.routes.viewAny',
                'production.routes.view',
            ];
            $maintenanceSupervisor->syncPermissions($maintenanceSupervisorPermissions);

            // Create Planner role
            $planner = Role::firstOrCreate(
                ['name' => 'Planner', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Planner',
                    'description' => 'Plan and schedule maintenance work orders',
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
                // Production category permissions
                'production.categories.viewAny',
                'production.categories.view',
                // Work Cell permissions
                'production.work-cells.viewAny',
                'production.work-cells.view',
                'production.work-cells.viewDashboard',
                'production.work-cells.exportData',
                // Production Item permissions
                'production.items.viewAny',
                'production.items.view',
                'production.items.create',
                'production.items.update',
                'production.items.export',
                'production.items.images.manage',
                // Production Order permissions - needed for Core Planning UI
                'production.orders.viewAny',
                'production.orders.view',
                'production.orders.update',
                'production.orders.plan',
                'production.orders.schedule',
                // Production Route permissions - needed for Core Planning UI
                'production.routes.viewAny',
                'production.routes.view',
                'production.routes.create',
                'production.routes.update',
                'production.routes.createFromTemplate',
            ];
            $planner->syncPermissions($plannerPermissions);

            $technician = Role::firstOrCreate(
                ['name' => 'Technician', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Technician',
                    'description' => 'Execute maintenance tasks at plant, area, sector, or individual asset level',
                ]
            );

            // Technician gets minimal permissions
            $technicianPermissions = [
                'users.update.owned',
                // Work Order permissions
                'work-orders.view', // Can view assigned work orders
                'work-orders.execute', // Can execute assigned work orders
                'work-orders.complete', // Can complete assigned work orders
                // Skills permissions (view only)
                'skills.viewAny',
                'skills.view',
                // Certifications permissions (view only)
                'certifications.viewAny',
                'certifications.view',
                // Production category permissions (view only)
                'production.categories.viewAny',
                'production.categories.view',
                // Work Cell permissions (view only)
                'production.work-cells.viewAny',
                'production.work-cells.view',
                // Production Item permissions (view only)
                'production.items.viewAny',
                'production.items.view',
            ];
            $technician->syncPermissions($technicianPermissions);

            // Create Validator role
            $validator = Role::firstOrCreate(
                ['name' => 'Validator', 'guard_name' => 'web'],
                [
                    'is_system' => true,
                    'display_name' => 'Validator',
                    'description' => 'Validate quality of completed work orders',
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
                    'description' => 'Read-only access to assigned resources at any level',
                ]
            );

            // Viewer gets minimal permissions
            $viewerPermissions = [
                'users.update.owned',
                // Work Order permissions
                'work-orders.view', // Read-only access
                // Skills permissions (view only)
                'skills.viewAny',
                'skills.view',
                // Certifications permissions (view only)
                'certifications.viewAny',
                'certifications.view',
                // Production category permissions (view only)
                'production.categories.viewAny',
                'production.categories.view',
                // Work Cell permissions (view only)
                'production.work-cells.viewAny',
                'production.work-cells.view',
                // Production Item permissions (view only)
                'production.items.viewAny',
                'production.items.view',
            ];
            $viewer->syncPermissions($viewerPermissions);

            $this->command->info('Tenant roles created successfully.');
            $this->command->info('Administrator role has all permissions.');
            $this->command->info('Entity-specific permissions will be assigned when users are assigned to specific entities.');
        });
    }
}

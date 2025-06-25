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
                    'is_administrator' => true
                ]
            );

            // Administrator has wildcard permissions - we still record them for auditability
            // But the hasPermissionTo() method will always return true for administrators
            $administrator->syncPermissions(Permission::all());

            // Create other system roles
            $plantManager = Role::firstOrCreate(
                ['name' => 'Plant Manager', 'guard_name' => 'web'],
                ['is_system' => true]
            );

            // Plant Manager gets system-level permissions by default
            $plantManagerPermissions = [
                'system.create-plants',
                'system.bulk-import-assets',
                'system.bulk-export-assets',
                'users.viewAny',
                'users.view',
                'roles.viewAny',
                'roles.view'
            ];
            $plantManager->syncPermissions($plantManagerPermissions);

            $areaManager = Role::firstOrCreate(
                ['name' => 'Area Manager', 'guard_name' => 'web'],
                ['is_system' => true]
            );
            
            // Area Manager gets limited permissions by default
            $areaManagerPermissions = [
                'users.viewAny',
                'users.view',
                'users.update.owned'
            ];
            $areaManager->syncPermissions($areaManagerPermissions);

            $sectorManager = Role::firstOrCreate(
                ['name' => 'Sector Manager', 'guard_name' => 'web'],
                ['is_system' => true]
            );
            
            // Sector Manager gets limited permissions by default
            $sectorManagerPermissions = [
                'users.viewAny',
                'users.view',
                'users.update.owned'
            ];
            $sectorManager->syncPermissions($sectorManagerPermissions);

            $maintenanceSupervisor = Role::firstOrCreate(
                ['name' => 'Maintenance Supervisor', 'guard_name' => 'web'],
                ['is_system' => true]
            );
            
            // Maintenance Supervisor gets basic permissions
            $maintenanceSupervisorPermissions = [
                'users.update.owned'
            ];
            $maintenanceSupervisor->syncPermissions($maintenanceSupervisorPermissions);

            $technician = Role::firstOrCreate(
                ['name' => 'Technician', 'guard_name' => 'web'],
                ['is_system' => true]
            );
            
            // Technician gets minimal permissions
            $technicianPermissions = [
                'users.update.owned'
            ];
            $technician->syncPermissions($technicianPermissions);

            $viewer = Role::firstOrCreate(
                ['name' => 'Viewer', 'guard_name' => 'web'],
                ['is_system' => true]
            );
            
            // Viewer gets minimal permissions
            $viewerPermissions = [
                'users.update.owned'
            ];
            $viewer->syncPermissions($viewerPermissions);

            $this->command->info('System roles created successfully.');
            $this->command->info('Administrator role has wildcard permissions.');
            $this->command->info('Entity-specific permissions will be assigned when users are assigned to specific entities.');
        });
    }
}
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SchedulerPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create scheduler permissions
        $permissions = [
            'production.schedule.view' => 'View production schedules',
            'production.schedule.create' => 'Create production schedules',
            'production.schedule.edit' => 'Edit production schedules',
            'production.schedule.publish' => 'Publish production schedules',
            'production.schedule.delete' => 'Delete production schedules',
        ];

        foreach ($permissions as $name => $description) {
            Permission::firstOrCreate(
                ['name' => $name],
                ['guard_name' => 'web', 'description' => $description]
            );
        }

        // Assign permissions to roles
        $this->assignPermissionsToRoles();
    }

    /**
     * Assign scheduler permissions to roles.
     */
    private function assignPermissionsToRoles(): void
    {
        // Get or create roles
        $plannerRole = Role::firstOrCreate(['name' => 'Planner', 'guard_name' => 'web']);
        $productionManagerRole = Role::firstOrCreate(['name' => 'Production Manager', 'guard_name' => 'web']);
        $operatorRole = Role::firstOrCreate(['name' => 'Operator', 'guard_name' => 'web']);
        $adminRole = Role::firstOrCreate(['name' => 'Administrator', 'guard_name' => 'web']);

        // Planner gets all scheduler permissions
        $plannerRole->givePermissionTo([
            'production.schedule.view',
            'production.schedule.create',
            'production.schedule.edit',
            'production.schedule.publish',
            'production.schedule.delete',
        ]);

        // Production Manager can view and create drafts
        $productionManagerRole->givePermissionTo([
            'production.schedule.view',
            'production.schedule.create',
        ]);

        // Operator can only view
        $operatorRole->givePermissionTo([
            'production.schedule.view',
        ]);

        // Administrator gets all permissions
        $adminRole->givePermissionTo([
            'production.schedule.view',
            'production.schedule.create',
            'production.schedule.edit',
            'production.schedule.publish',
            'production.schedule.delete',
        ]);
    }
}
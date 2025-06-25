<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Administrator role first with guaranteed ID = 1
        // This ID is used for permission bypass checks
        $administratorRole = Role::firstOrCreate(
            ['id' => 1],
            [
                'name' => 'Administrator',
                'is_system' => true,
                'guard_name' => 'web'
            ]
        );
        
        // If we just created the Administrator role with ID 1, we need to reset the sequence
        // to prevent conflicts with future inserts
        if ($administratorRole->wasRecentlyCreated) {
            // Get the current max ID
            $maxId = Role::max('id') ?? 0;
            
            // Reset the sequence to start after the max ID
            DB::statement("SELECT setval(pg_get_serial_sequence('roles', 'id'), ?)", [$maxId]);
        }
        
        // Administrator doesn't need individual permissions due to bypass mechanism
        // The bypass is implemented in Gate::before() callback with wildcard permissions
        
        $this->command->info("Administrator role created/verified with ID = 1 (wildcard permissions enabled)");
        
        // Create other system roles with default system-level permissions only
        // Entity-specific permissions are assigned when users are associated with entities
        $roles = [
            [
                'name' => 'Plant Manager',
                'is_system' => true,
                'permissions' => [
                    // Default system-level permissions
                    'system.create-plants',
                    'system.bulk-import-assets',
                    'system.bulk-export-assets',
                    
                    // User management (limited)
                    'users.viewAny',
                    'users.view',
                    'users.update.owned',
                    
                    // Role viewing only
                    'roles.viewAny',
                    'roles.view',
                    
                    // Invitation management
                    'invitations.viewAny',
                    'invitations.view',
                    'invitations.resend',
                    
                    // System dashboards
                    'system.dashboard.view',
                    
                    // Note: Entity-specific permissions like plants.view.123, users.invite.plant.123, etc. 
                    // are assigned when the Plant Manager is associated with a specific plant
                ]
            ],
            [
                'name' => 'Area Manager',
                'is_system' => true,
                'permissions' => [
                    // User management (limited)
                    'users.viewAny',
                    'users.view',
                    'users.update.owned',
                    
                    // Invitation viewing
                    'invitations.viewAny',
                    'invitations.view',
                    
                    // System dashboards
                    'system.dashboard.view',
                    
                    // Note: Entity-specific permissions like areas.view.456, users.invite.area.456, etc.
                    // are assigned when the Area Manager is associated with a specific area
                ]
            ],
            [
                'name' => 'Sector Manager',
                'is_system' => true,
                'permissions' => [
                    // User management (limited)
                    'users.viewAny',
                    'users.view',
                    'users.update.owned',
                    
                    // Invitation viewing
                    'invitations.view',
                    
                    // Note: Entity-specific permissions like sectors.view.789, users.invite.sector.789, etc.
                    // are assigned when the Sector Manager is associated with a specific sector
                ]
            ],
            [
                'name' => 'Maintenance Supervisor',
                'is_system' => true,
                'permissions' => [
                    // Own profile only
                    'users.update.owned',
                    
                    // Note: Entity-specific permissions like assets.execute-routines.area.456
                    // are assigned when the Maintenance Supervisor is associated with specific areas
                ]
            ],
            [
                'name' => 'Technician',
                'is_system' => true,
                'permissions' => [
                    // Own profile only
                    'users.update.owned',
                    
                    // Note: Entity-specific permissions like assets.execute-routines.999
                    // are assigned when the Technician is associated with specific assets
                ]
            ],
            [
                'name' => 'Viewer',
                'is_system' => true,
                'permissions' => [
                    // Own profile only
                    'users.update.owned',
                    
                    // Note: Entity-specific permissions like plants.view.123, assets.viewAny.plant.123
                    // are assigned when the Viewer is given access to specific entities
                ]
            ]
        ];

        foreach ($roles as $roleData) {
            // Create role
            $role = Role::firstOrCreate(
                ['name' => $roleData['name']],
                [
                    'is_system' => $roleData['is_system'],
                    'guard_name' => 'web'
                ]
            );

            // Assign permissions
            $permissions = Permission::whereIn('name', $roleData['permissions'])->get();
            $role->syncPermissions($permissions);

            $this->command->info("Role '{$role->name}' created/updated with " . count($permissions) . " default permissions.");
        }

        $this->command->info('System roles created successfully.');
        $this->command->info('Entity-specific permissions will be assigned when users are associated with plants, areas, or sectors.');
    }
}
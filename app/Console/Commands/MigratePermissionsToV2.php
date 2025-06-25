<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Asset;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;

class MigratePermissionsToV2 extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:migrate-v2 
                            {--dry-run : Show what would be done without making changes}
                            {--force : Force migration without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate permissions from V1 to V2 structure';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting Permission System V1 to V2 Migration...');
        
        if (!$this->option('force') && !$this->option('dry-run')) {
            if (!$this->confirm('This will migrate all permissions to V2 structure. Continue?')) {
                return Command::FAILURE;
            }
        }
        
        $dryRun = $this->option('dry-run');
        
        DB::beginTransaction();
        
        try {
            // Step 1: Migrate Administrator role
            $this->migrateAdministratorRole($dryRun);
            
            // Step 2: Remove global resource permissions
            $this->removeGlobalResourcePermissions($dryRun);
            
            // Step 3: Generate permissions for existing entities
            $this->generateEntityPermissions($dryRun);
            
            // Step 4: Migrate user-specific permissions
            $this->migrateUserPermissions($dryRun);
            
            // Step 5: Remove form and routine permissions
            $this->removeDeprecatedPermissions($dryRun);
            
            // Step 6: Add new system permissions
            $this->addNewSystemPermissions($dryRun);
            
            // Step 7: Update role permissions
            $this->updateRolePermissions($dryRun);
            
            if ($dryRun) {
                DB::rollBack();
                $this->info('Dry run complete. No changes were made.');
            } else {
                DB::commit();
                $this->info('Migration complete!');
                
                // Log the migration
                AuditLogService::log(
                    'permissions.migrated',
                    'migrated',
                    null,
                    [],
                    ['version' => 'v2'],
                    [
                        'command' => 'permissions:migrate-v2',
                        'user' => auth()->user()?->name ?? 'system'
                    ]
                );
            }
            
            return Command::SUCCESS;
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Migration failed: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
    
    private function migrateAdministratorRole(bool $dryRun): void
    {
        $this->info('Step 1: Migrating Administrator role...');
        
        // Find users with is_super_admin flag
        $superAdmins = User::where('is_super_admin', true)->get();
        
        // Get or create Administrator role
        $adminRole = Role::firstOrCreate(
            ['name' => 'Administrator', 'guard_name' => 'web'],
            ['is_system' => true, 'is_administrator' => true]
        );
        
        foreach ($superAdmins as $user) {
            $this->line("- Assigning Administrator role to: {$user->name}");
            if (!$dryRun) {
                $user->assignRole($adminRole);
            }
        }
        
        // Merge Super Administrator role if it exists
        $superAdminRole = Role::where('name', 'Super Administrator')->first();
        if ($superAdminRole && $superAdminRole->id !== $adminRole->id) {
            $this->line('- Merging Super Administrator role into Administrator');
            
            if (!$dryRun) {
                // Transfer users
                foreach ($superAdminRole->users as $user) {
                    $user->assignRole($adminRole);
                    $user->removeRole($superAdminRole);
                }
                
                // Delete old role
                $superAdminRole->delete();
            }
        }
    }
    
    private function removeGlobalResourcePermissions(bool $dryRun): void
    {
        $this->info('Step 2: Removing global resource permissions...');
        
        $globalPermissions = [
            'plants.viewAny', 'plants.create', 'plants.view', 'plants.update', 'plants.delete',
            'areas.viewAny', 'areas.create', 'areas.view', 'areas.update', 'areas.delete',
            'sectors.viewAny', 'sectors.create', 'sectors.view', 'sectors.update', 'sectors.delete',
            'assets.viewAny', 'assets.create', 'assets.view', 'assets.update', 'assets.delete',
            'assets.import', 'assets.export'
        ];
        
        foreach ($globalPermissions as $permName) {
            $perm = Permission::where('name', $permName)->first();
            if ($perm) {
                $this->line("- Removing global permission: {$permName}");
                if (!$dryRun) {
                    $perm->delete();
                }
            }
        }
    }
    
    private function generateEntityPermissions(bool $dryRun): void
    {
        $this->info('Step 3: Generating permissions for existing entities...');
        
        // Generate for plants
        $plants = Plant::all();
        foreach ($plants as $plant) {
            $this->line("- Generating permissions for plant: {$plant->name}");
            if (!$dryRun) {
                Permission::generateEntityPermissions('plant', $plant->id);
            }
        }
        
        // Generate for areas
        $areas = Area::all();
        foreach ($areas as $area) {
            $this->line("- Generating permissions for area: {$area->name}");
            if (!$dryRun) {
                Permission::generateEntityPermissions('area', $area->id, $area->plant_id);
            }
        }
        
        // Generate for sectors
        $sectors = Sector::all();
        foreach ($sectors as $sector) {
            $this->line("- Generating permissions for sector: {$sector->name}");
            if (!$dryRun) {
                Permission::generateEntityPermissions('sector', $sector->id, $sector->area_id);
            }
        }
        
        // Generate for assets
        $assets = Asset::all();
        foreach ($assets as $asset) {
            $this->line("- Generating permissions for asset: {$asset->name}");
            if (!$dryRun) {
                Permission::generateEntityPermissions('asset', $asset->id, $asset->sector_id);
            }
        }
    }
    
    private function migrateUserPermissions(bool $dryRun): void
    {
        $this->info('Step 4: Migrating user permissions to entity-scoped...');
        
        // For users with global permissions, we need to determine which entities they should have access to
        $users = User::with('permissions')->get();
        
        foreach ($users as $user) {
            if ($user->isAdministrator()) {
                continue; // Skip administrators
            }
            
            // Check if user had global plant permissions
            if ($user->hasPermissionTo('plants.viewAny')) {
                $this->line("- User {$user->name} had global plant access, granting access to all existing plants");
                
                if (!$dryRun) {
                    foreach (Plant::all() as $plant) {
                        $user->givePermissionTo("plants.view.{$plant->id}");
                    }
                }
            }
            
            // Similar logic for other resources...
        }
    }
    
    private function removeDeprecatedPermissions(bool $dryRun): void
    {
        $this->info('Step 5: Removing deprecated permissions...');
        
        // Remove all form permissions
        $formPermissions = Permission::where('name', 'like', 'forms.%')->get();
        foreach ($formPermissions as $perm) {
            $this->line("- Removing form permission: {$perm->name}");
            if (!$dryRun) {
                $perm->delete();
            }
        }
        
        // Remove all routine permissions (now part of asset permissions)
        $routinePermissions = Permission::where('name', 'like', 'routines.%')
                                       ->orWhere('name', 'like', 'routine-executions.%')
                                       ->get();
        foreach ($routinePermissions as $perm) {
            $this->line("- Removing routine permission: {$perm->name}");
            if (!$dryRun) {
                $perm->delete();
            }
        }
        
        // Remove separate report permissions
        $reportPermissions = Permission::where('name', 'like', 'reports.%')->get();
        foreach ($reportPermissions as $perm) {
            $this->line("- Removing report permission: {$perm->name}");
            if (!$dryRun) {
                $perm->delete();
            }
        }
    }
    
    private function addNewSystemPermissions(bool $dryRun): void
    {
        $this->info('Step 6: Adding new system permissions...');
        
        $newPermissions = [
            'system.bulk-import-assets',
            'system.bulk-export-assets'
        ];
        
        foreach ($newPermissions as $permName) {
            if (!Permission::where('name', $permName)->exists()) {
                $this->line("- Adding new permission: {$permName}");
                if (!$dryRun) {
                    Permission::create([
                        'name' => $permName,
                        'guard_name' => 'web',
                        'entity_type' => 'system'
                    ]);
                }
            }
        }
    }
    
    private function updateRolePermissions(bool $dryRun): void
    {
        $this->info('Step 7: Updating role permissions...');
        
        // Update Plant Manager role
        $plantManager = Role::where('name', 'Plant Manager')->first();
        if ($plantManager) {
            $this->line('- Updating Plant Manager permissions');
            if (!$dryRun) {
                $plantManager->syncPermissions([
                    'system.create-plants',
                    'system.bulk-import-assets',
                    'system.bulk-export-assets',
                    'users.viewAny',
                    'users.view',
                    'roles.viewAny',
                    'roles.view'
                ]);
            }
        }
        
        // Similar updates for other roles...
    }
}
# Permission System Code Examples V2

## Table of Contents
1. [Administrator Bypass Implementation](#administrator-bypass-implementation)
2. [Core Concepts](#core-concepts)
3. [Laravel Integration Strategy](#laravel-integration-strategy)
4. [Database Architecture](#database-architecture)
5. [Permission Model](#permission-model)
6. [Implementation with Laravel](#implementation-with-laravel)
7. [Security Considerations](#security-considerations)
8. [API Design](#api-design)
9. [Testing](#testing)
10. [Performance Optimizations](#performance-optimizations)
11. [Custom Permission Management UI](#custom-permission-management-ui)
12. [Migration from V1](#migration-from-v1)

## Overview

This document outlines code examples of Version 2 of the comprehensive permission system for a maintenance management system.

## Administrator Bypass Implementation

### 1. Configuration File

```php
// config/permissions.php
return [
    /**
     * Administrator Role Configuration
     * This ID is guaranteed by the RoleSeeder and used for permission bypass
     */
    'administrator_role_id' => 1,
    
    /**
     * System roles that cannot be modified
     */
    'system_roles' => ['Administrator', 'Plant Manager', 'Area Supervisor', 'Technician', 'Viewer'],
    
    /**
     * Reserved role names that cannot be created by users
     */
    'reserved_role_names' => ['Admin', 'Administrator', 'Super Admin', 'Root', 'System'],
];
```

### 2. Service Provider Implementation

```php
// app/Providers/PermissionServiceProvider.php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Services\AuditLogService;

class PermissionServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Administrator bypass - this runs before all other authorization checks
        Gate::before(function ($user, $ability) {
            // Check by ID, not name, to prevent impersonation
            if ($user->hasRole(config('permissions.administrator_role_id'))) {
                // Log Administrator actions for audit trail
                if (config('app.debug') || config('permissions.log_admin_actions')) {
                    app(AuditLogService::class)->logAdminAction($user, $ability);
                }
                
                // Return true to bypass all permission checks
                return true;
            }
            
            // Return null to continue with normal authorization
            return null;
        });
    }
}
```

### 3. Updated User Model

```php
// app/Models/User.php
namespace App\Models;

use Spatie\Permission\Traits\HasRoles;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasRoles;
    
    /**
     * Check if user has a role by ID (used for Administrator bypass)
     */
    public function hasRoleById(int $roleId): bool
    {
        return $this->roles()->where('id', $roleId)->exists();
    }
    
    /**
     * Override hasRole to use ID for Administrator check
     */
    public function hasRole($roles, string $guard = null): bool
    {
        // If checking for Administrator role ID specifically
        if (is_int($roles) && $roles === config('permissions.administrator_role_id')) {
            return $this->hasRoleById($roles);
        }
        
        // Otherwise use normal Spatie method
        return $this->hasRoleSpatie($roles, $guard);
    }
    
    /**
     * Alias for original Spatie hasRole method
     */
    public function hasRoleSpatie($roles, string $guard = null): bool
    {
        return parent::hasRole($roles, $guard);
    }
    
    /**
     * Check if user is Administrator
     */
    public function isAdministrator(): bool
    {
        return $this->hasRole(config('permissions.administrator_role_id'));
    }
}
```

### 4. Role Model Protection

```php
// app/Models/Role.php
namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use Illuminate\Database\Eloquent\Builder;

class Role extends SpatieRole
{
    protected $fillable = ['name', 'guard_name', 'is_system'];
    
    protected $casts = [
        'is_system' => 'boolean',
    ];
    
    /**
     * Prevent modification of system roles
     */
    protected static function booted()
    {
        // Prevent updates to system roles
        static::updating(function ($role) {
            if ($role->is_system) {
                throw new \Exception('System roles cannot be modified.');
            }
        });
        
        // Prevent deletion of system roles
        static::deleting(function ($role) {
            if ($role->is_system) {
                throw new \Exception('System roles cannot be deleted.');
            }
            
            // Special check for Administrator role
            if ($role->id === config('permissions.administrator_role_id')) {
                throw new \Exception('Administrator role cannot be deleted.');
            }
        });
        
        // Validate role name on creation
        static::creating(function ($role) {
            $reserved = config('permissions.reserved_role_names', []);
            if (in_array(strtolower($role->name), array_map('strtolower', $reserved))) {
                throw new \Exception('This role name is reserved and cannot be used.');
            }
        });
    }
    
    /**
     * Scope to get non-system roles
     */
    public function scopeUserCreated(Builder $query): Builder
    {
        return $query->where('is_system', false);
    }
    
    /**
     * Check if this is the Administrator role
     */
    public function isAdministrator(): bool
    {
        return $this->id === config('permissions.administrator_role_id');
    }
}
```

### 5. Enhanced Audit Service

```php
// app/Services/AuditLogService.php
namespace App\Services;

use App\Models\User;
use App\Models\PermissionAuditLog;
use Illuminate\Support\Facades\DB;

class AuditLogService
{
    /**
     * Log Administrator action (called from Gate::before)
     */
    public function logAdminAction(User $user, string $ability): void
    {
        // Only log in production or when explicitly enabled
        if (!config('permissions.log_admin_actions', false)) {
            return;
        }
        
        // Batch admin actions to avoid excessive logging
        $key = "admin_actions_{$user->id}_" . now()->format('Y-m-d_H');
        $actions = cache()->get($key, []);
        
        if (!isset($actions[$ability])) {
            $actions[$ability] = 0;
        }
        $actions[$ability]++;
        
        cache()->put($key, $actions, now()->addHours(2));
        
        // Write to database periodically
        if (array_sum($actions) % 100 === 0) {
            $this->flushAdminActions($user->id);
        }
    }
    
    /**
     * Flush admin actions to database
     */
    protected function flushAdminActions(int $userId): void
    {
        $key = "admin_actions_{$userId}_" . now()->format('Y-m-d_H');
        $actions = cache()->get($key, []);
        
        if (empty($actions)) {
            return;
        }
        
        DB::table('admin_action_logs')->insert([
            'user_id' => $userId,
            'actions' => json_encode($actions),
            'hour' => now()->format('Y-m-d H:00:00'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        cache()->forget($key);
    }
    
    /**
     * Log when Administrator role is assigned
     */
    public function logAdministratorAssignment(User $user, User $assignedBy): void
    {
        $this->log('administrator.assigned', [
            'user_id' => $user->id,
            'assigned_by' => $assignedBy->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
        
        // Send notification to all existing administrators
        $admins = User::role(config('permissions.administrator_role_id'))->get();
        foreach ($admins as $admin) {
            $admin->notify(new \App\Notifications\AdministratorAssigned($user, $assignedBy));
        }
    }
}
```

### 6. Administrator Assignment Controller

```php
// app/Http/Controllers/AdministratorController.php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Services\AuditLogService;
use App\Services\PermissionService;
use Illuminate\Http\Request;

class AdministratorController extends Controller
{
    protected $auditLog;
    protected $permissionService;
    
    public function __construct(AuditLogService $auditLog, PermissionService $permissionService)
    {
        $this->auditLog = $auditLog;
        $this->permissionService = $permissionService;
        
        // Only Administrators can access this controller
        $this->middleware(function ($request, $next) {
            if (!$request->user()->isAdministrator()) {
                abort(403);
            }
            return $next($request);
        });
    }
    
    /**
     * Assign Administrator role to a user
     */
    public function assign(Request $request, User $user)
    {
        // Validate request
        $request->validate([
            'confirmation' => 'required|string|in:CONFIRM',
            'reason' => 'required|string|min:10|max:500'
        ]);
        
        // Check if user is already an administrator
        if ($user->isAdministrator()) {
            return back()->with('error', 'User is already an Administrator.');
        }
        
        // Assign the role
        $adminRole = Role::find(config('permissions.administrator_role_id'));
        $user->assignRole($adminRole);
        
        // Log the assignment
        $this->auditLog->logAdministratorAssignment($user, $request->user());
        $this->auditLog->log('administrator.role.assigned', [
            'target_user_id' => $user->id,
            'assigned_by' => $request->user()->id,
            'reason' => $request->reason
        ]);
        
        return redirect()->route('users.show', $user)
            ->with('success', 'Administrator role assigned successfully.');
    }
    
    /**
     * Remove Administrator role from a user
     */
    public function remove(Request $request, User $user)
    {
        // Validate request
        $request->validate([
            'confirmation' => 'required|string|in:CONFIRM',
            'reason' => 'required|string|min:10|max:500'
        ]);
        
        // Check if removal would leave no administrators
        if (!$this->permissionService->canRemoveAdministrator($user)) {
            return back()->with('error', 'Cannot remove the last Administrator.');
        }
        
        // Check if trying to remove own administrator role
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot remove your own Administrator role.');
        }
        
        // Remove the role
        $user->removeRole(config('permissions.administrator_role_id'));
        
        // Log the removal
        $this->auditLog->log('administrator.role.removed', [
            'target_user_id' => $user->id,
            'removed_by' => $request->user()->id,
            'reason' => $request->reason
        ]);
        
        return redirect()->route('users.show', $user)
            ->with('success', 'Administrator role removed successfully.');
    }
}
```

### 7. Migration for Admin Action Logs

```php
// database/migrations/2024_01_01_000004_create_admin_action_logs_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAdminActionLogsTable extends Migration
{
    public function up()
    {
        Schema::create('admin_action_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->json('actions'); // Aggregated actions for the hour
            $table->timestamp('hour'); // Hour bucket for aggregation
            $table->timestamps();
            
            $table->index(['user_id', 'hour']);
            $table->index('hour');
        });
    }
    
    public function down()
    {
        Schema::dropIfExists('admin_action_logs');
    }
}
``` 

## Core Concepts

### 1. Model Observers for Dynamic Permissions

```php
// app/Observers/PlantObserver.php
namespace App\Observers;

use App\Models\Plant;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogService;

class PlantObserver
{
    protected $auditLog;
    
    public function __construct(AuditLogService $auditLog)
    {
        $this->auditLog = $auditLog;
    }
    
    /**
     * Handle the Plant "created" event.
     */
    public function created(Plant $plant)
    {
        DB::transaction(function () use ($plant) {
            // Create plant-specific permissions
            $permissions = [
                [
                    'name' => "plants.view.{$plant->id}",
                    'display_name' => "View {$plant->name}",
                    'description' => "View details of plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "plants.update.{$plant->id}",
                    'display_name' => "Update {$plant->name}",
                    'description' => "Update plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "plants.delete.{$plant->id}",
                    'display_name' => "Delete {$plant->name}",
                    'description' => "Delete plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "plants.manage-shifts.{$plant->id}",
                    'display_name' => "Manage Shifts for {$plant->name}",
                    'description' => "Manage shifts in plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                // Area creation permission for this plant
                [
                    'name' => "areas.create.plant.{$plant->id}",
                    'display_name' => "Create Areas in {$plant->name}",
                    'description' => "Create new areas in plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                // Cascading permissions for child entities
                [
                    'name' => "areas.viewAny.plant.{$plant->id}",
                    'display_name' => "View Areas in {$plant->name}",
                    'description' => "View all areas in plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "routines.viewAny.plant.{$plant->id}",
                    'display_name' => "View Routines in {$plant->name}",
                    'description' => "View all routines in plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "routines.create.plant.{$plant->id}",
                    'display_name' => "Create Routines in {$plant->name}",
                    'description' => "Create routines in plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                // Export permissions
                [
                    'name' => "assets.export.plant.{$plant->id}",
                    'display_name' => "Export Assets from {$plant->name}",
                    'description' => "Export asset data/reports from plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "routine-executions.export.plant.{$plant->id}",
                    'display_name' => "Export Routine Executions from {$plant->name}",
                    'description' => "Export routine execution data/reports from plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
                // User invitation permission for this plant
                [
                    'name' => "users.invite.plant.{$plant->id}",
                    'display_name' => "Invite Users to {$plant->name}",
                    'description' => "Ability to invite users to plant: {$plant->name}",
                    'guard_name' => 'web'
                ],
            ];

            foreach ($permissions as $permissionData) {
                Permission::create($permissionData);
            }

            // Grant the creating user all permissions for this plant
            $plantPermissions = Permission::where('name', 'like', "%.{$plant->id}")
                ->orWhere('name', 'like', "%.plant.{$plant->id}")
                ->get();
            
            auth()->user()->givePermissionTo($plantPermissions);
            
            // Log the automatic permission assignment
            $this->auditLog->log('plant.permissions.auto_assigned', [
                'plant_id' => $plant->id,
                'user_id' => auth()->id(),
                'permissions_count' => $plantPermissions->count()
            ]);
        });
    }

    /**
     * Handle the Plant "deleting" event.
     */
    public function deleting(Plant $plant)
    {
        DB::transaction(function () use ($plant) {
            // Remove all permissions related to this plant
            Permission::where('name', 'like', "%.{$plant->id}")
                ->orWhere('name', 'like', "%.plant.{$plant->id}")
                ->delete();
            
            // Also remove permissions for child areas
            $areaIds = $plant->areas()->pluck('id');
            foreach ($areaIds as $areaId) {
                Permission::where('name', 'like', "%.{$areaId}")
                    ->orWhere('name', 'like', "%.area.{$areaId}")
                    ->delete();
            }
            
            $this->auditLog->log('plant.permissions.removed', [
                'plant_id' => $plant->id,
                'cascade_areas' => $areaIds->toArray()
            ]);
        });
    }
}

// app/Observers/AreaObserver.php
namespace App\Observers;

use App\Models\Area;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogService;

class AreaObserver
{
    protected $auditLog;
    
    public function __construct(AuditLogService $auditLog)
    {
        $this->auditLog = $auditLog;
    }
    
    /**
     * Handle the Area "created" event.
     */
    public function created(Area $area)
    {
        DB::transaction(function () use ($area) {
            // Create area-specific permissions
            $permissions = [
                [
                    'name' => "areas.view.{$area->id}",
                    'display_name' => "View {$area->name}",
                    'description' => "View details of area: {$area->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "areas.update.{$area->id}",
                    'display_name' => "Update {$area->name}",
                    'description' => "Update area: {$area->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "areas.delete.{$area->id}",
                    'display_name' => "Delete {$area->name}",
                    'description' => "Delete area: {$area->name}",
                    'guard_name' => 'web'
                ],
                // User invitation permission for this area
                [
                    'name' => "users.invite.area.{$area->id}",
                    'display_name' => "Invite Users to {$area->name}",
                    'description' => "Ability to invite users to area: {$area->name}",
                    'guard_name' => 'web'
                ],
                // Sector creation permission for this area
                [
                    'name' => "sectors.create.area.{$area->id}",
                    'display_name' => "Create Sectors in {$area->name}",
                    'description' => "Create new sectors in area: {$area->name}",
                    'guard_name' => 'web'
                ],
                // Other permissions...
            ];

            foreach ($permissions as $permissionData) {
                Permission::create($permissionData);
            }

            // Grant the creating user relevant permissions for this area
            if (auth()->check()) {
                $areaPermissions = Permission::where('name', 'like', "%.{$area->id}")
                    ->orWhere('name', 'like', "%.area.{$area->id}")
                    ->get();
                
                auth()->user()->givePermissionTo($areaPermissions);
            }
        });
    }

    /**
     * Handle the Area "deleting" event.
     */
    public function deleting(Area $area)
    {
        DB::transaction(function () use ($area) {
            // Remove all permissions related to this area
            Permission::where('name', 'like', "%.{$area->id}")
                ->orWhere('name', 'like', "%.area.{$area->id}")
                ->delete();
        });
    }
}

// app/Observers/SectorObserver.php
namespace App\Observers;

use App\Models\Sector;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogService;

class SectorObserver
{
    protected $auditLog;
    
    public function __construct(AuditLogService $auditLog)
    {
        $this->auditLog = $auditLog;
    }
    
    /**
     * Handle the Sector "created" event.
     */
    public function created(Sector $sector)
    {
        DB::transaction(function () use ($sector) {
            // Create sector-specific permissions
            $permissions = [
                [
                    'name' => "sectors.view.{$sector->id}",
                    'display_name' => "View {$sector->name}",
                    'description' => "View details of sector: {$sector->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "sectors.update.{$sector->id}",
                    'display_name' => "Update {$sector->name}",
                    'description' => "Update sector: {$sector->name}",
                    'guard_name' => 'web'
                ],
                [
                    'name' => "sectors.delete.{$sector->id}",
                    'display_name' => "Delete {$sector->name}",
                    'description' => "Delete sector: {$sector->name}",
                    'guard_name' => 'web'
                ],
                // User invitation permission for this sector
                [
                    'name' => "users.invite.sector.{$sector->id}",
                    'display_name' => "Invite Users to {$sector->name}",
                    'description' => "Ability to invite users to sector: {$sector->name}",
                    'guard_name' => 'web'
                ],
                // Asset creation permission for this sector
                [
                    'name' => "assets.create.sector.{$sector->id}",
                    'display_name' => "Create Assets in {$sector->name}",
                    'description' => "Create new assets in sector: {$sector->name}",
                    'guard_name' => 'web'
                ],
                // Other permissions...
            ];

            foreach ($permissions as $permissionData) {
                Permission::create($permissionData);
            }

            // Grant the creating user relevant permissions for this sector
            if (auth()->check()) {
                $sectorPermissions = Permission::where('name', 'like', "%.{$sector->id}")
                    ->orWhere('name', 'like', "%.sector.{$sector->id}")
                    ->get();
                
                auth()->user()->givePermissionTo($sectorPermissions);
            }
        });
    }

    /**
     * Handle the Sector "deleting" event.
     */
    public function deleting(Sector $sector)
    {
        DB::transaction(function () use ($sector) {
            // Remove all permissions related to this sector
            Permission::where('name', 'like', "%.{$sector->id}")
                ->orWhere('name', 'like', "%.sector.{$sector->id}")
                ->delete();
        });
    }
}
```

### 2. Shared Entity Validation Service

```php
// app/Services/SharedEntityValidationService.php
namespace App\Services;

use App\Models\User;
use App\Models\Asset;
use App\Models\Shift;
use App\Models\AssetType;
use App\Models\Manufacturer;
use Illuminate\Support\Collection;

class SharedEntityValidationService
{
    protected $permissionService;
    
    public function __construct(PermissionService $permissionService)
    {
        $this->permissionService = $permissionService;
    }
    
    /**
     * Validate if user can update a shared entity
     */
    public function canUpdateSharedEntity($entity, User $user): array
    {
        $affectedAssets = $this->getAffectedAssets($entity);
        $userAccessibleAssets = $this->getUserAccessibleAssets($user);
        
        $inaccessibleAssets = $affectedAssets->whereNotIn('id', $userAccessibleAssets->pluck('id'));
        
        return [
            'can_update' => $inaccessibleAssets->isEmpty(),
            'inaccessible_assets' => $inaccessibleAssets,
            'total_affected' => $affectedAssets->count(),
            'accessible_count' => $affectedAssets->count() - $inaccessibleAssets->count()
        ];
    }
    
    /**
     * Get all assets affected by a shared entity
     */
    protected function getAffectedAssets($entity): Collection
    {
        if ($entity instanceof Shift) {
            return Asset::whereHas('plant', function ($query) use ($entity) {
                $query->whereHas('shifts', function ($q) use ($entity) {
                    $q->where('shifts.id', $entity->id);
                });
            })->get();
        }
        
        if ($entity instanceof AssetType) {
            return Asset::where('asset_type_id', $entity->id)->get();
        }
        
        if ($entity instanceof Manufacturer) {
            return Asset::where('manufacturer_id', $entity->id)->get();
        }
        
        return collect();
    }
    
    /**
     * Get all assets user has update permission for
     */
    protected function getUserAccessibleAssets(User $user): Collection
    {
        // Administrator has access to all
        if ($user->hasRole('Administrator')) {
            return Asset::all();
        }
        
        $assets = collect();
        
        // Get from direct asset permissions
        $assetIds = $user->getAllPermissions()
            ->filter(function ($permission) {
                return str_starts_with($permission->name, 'assets.update.');
            })
            ->map(function ($permission) {
                if (preg_match('/assets\.update\.(\d+)/', $permission->name, $matches)) {
                    return $matches[1];
                }
                return null;
            })
            ->filter();
        
        $assets = $assets->merge(Asset::whereIn('id', $assetIds)->get());
        
        // Get from sector permissions
        $sectorIds = $this->extractEntityIds($user->getAllPermissions(), 'sector');
        $assets = $assets->merge(Asset::whereIn('sector_id', $sectorIds)->get());
        
        // Get from area permissions (includes all sectors in those areas)
        $areaIds = $this->extractEntityIds($user->getAllPermissions(), 'area');
        $assets = $assets->merge(Asset::whereHas('sector', function ($q) use ($areaIds) {
            $q->whereIn('area_id', $areaIds);
        })->get());
        
        // Get from plant permissions (includes all areas/sectors in those plants)
        $plantIds = $this->extractEntityIds($user->getAllPermissions(), 'plant');
        $assets = $assets->merge(Asset::whereHas('sector.area', function ($q) use ($plantIds) {
            $q->whereIn('plant_id', $plantIds);
        })->get());
        
        return $assets->unique('id');
    }
    
    private function extractEntityIds($permissions, $scope)
    {
        return $permissions
            ->map(function ($permission) use ($scope) {
                if (preg_match("/\.$scope\.(\d+)/", $permission->name, $matches)) {
                    return $matches[1];
                }
                return null;
            })
            ->filter()
            ->unique();
    }
}
```

### 3. Updated Permission Service

```php
// app/Services/PermissionService.php
namespace App\Services;

use App\Models\User;
use App\Models\Plant;
use App\Models\Area;
use App\Models\Sector;
use App\Models\Permission;
use Illuminate\Support\Collection;

class PermissionService
{
    /**
     * Check if user can create plants (only global permission)
     */
    public function canCreatePlants(User $user): bool
    {
        return $user->hasRole('Administrator') || $user->can('system.create-plants');
    }
    
    /**
     * Get all plants a user can access
     */
    public function getUserAccessiblePlants(User $user): Collection
    {
        if ($user->hasRole('Administrator')) {
            return Plant::all();
        }

        // Get all plant IDs from user's permissions
        $plantIds = $user->getAllPermissions()
            ->map(function ($permission) {
                // Extract plant ID from permissions like plants.view.123 or areas.create.plant.456
                if (preg_match('/plants?\.\w+\.(\d+)/', $permission->name, $matches)) {
                    return $matches[1];
                }
                if (preg_match('/\w+\.plant\.(\d+)/', $permission->name, $matches)) {
                    return $matches[1];
                }
                return null;
            })
            ->filter()
            ->unique();

        return Plant::whereIn('id', $plantIds)->get();
    }

    /**
     * Get all areas a user can access
     */
    public function getUserAccessibleAreas(User $user): Collection
    {
        if ($user->hasRole('Administrator')) {
            return Area::all();
        }

        $areas = collect();

        // Get areas from direct area permissions
        $areaIds = $user->getAllPermissions()
            ->map(function ($permission) {
                if (preg_match('/areas?\.\w+\.(\d+)/', $permission->name, $matches)) {
                    return $matches[1];
                }
                if (preg_match('/\w+\.area\.(\d+)/', $permission->name, $matches)) {
                    return $matches[1];
                }
                return null;
            })
            ->filter()
            ->unique();

        $areas = $areas->merge(Area::whereIn('id', $areaIds)->get());

        // Get areas from plant permissions (inheritance)
        $plantIds = $this->getUserAccessiblePlants($user)->pluck('id');
        $areas = $areas->merge(Area::whereIn('plant_id', $plantIds)->get());

        return $areas->unique('id');
    }
    
    /**
     * Get all sectors a user can access
     */
    public function getUserAccessibleSectors(User $user): Collection
    {
        if ($user->hasRole('Administrator')) {
            return Sector::all();
        }

        $sectors = collect();

        // Get sectors from direct sector permissions
        $sectorIds = $user->getAllPermissions()
            ->map(function ($permission) {
                if (preg_match('/sectors?\.\w+\.(\d+)/', $permission->name, $matches)) {
                    return $matches[1];
                }
                if (preg_match('/\w+\.sector\.(\d+)/', $permission->name, $matches)) {
                    return $matches[1];
                }
                return null;
            })
            ->filter()
            ->unique();

        $sectors = $sectors->merge(Sector::whereIn('id', $sectorIds)->get());

        // Get sectors from area permissions (inheritance)
        $areaIds = $this->getUserAccessibleAreas($user)->pluck('id');
        $sectors = $sectors->merge(Sector::whereIn('area_id', $areaIds)->get());

        return $sectors->unique('id');
    }
    
    /**
     * Ensure at least one administrator exists
     */
    public function ensureAdministratorExists(): bool
    {
        return User::role('Administrator')->exists();
    }
    
    /**
     * Check if user can be removed from Administrator role
     */
    public function canRemoveAdministrator(User $user): bool
    {
        // Count other administrators
        $otherAdmins = User::role('Administrator')->where('id', '!=', $user->id)->count();
        return $otherAdmins > 0;
    }
}
```

### 4. User Invitation Model
```php
// app/Models/UserInvitation.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserInvitation extends Model
{
    protected $fillable = [
        'email',
        'token',
        'invited_by',
        'inviter_role',
        'inviter_scope_type',
        'inviter_scope_id',
        'initial_role',
        'initial_permissions',
        'permission_scope_type',
        'permission_scope_ids',
        'expires_at',
        'accepted_at',
        'accepted_by',
        'revoked_at',
        'revoked_by',
        'revocation_reason'
    ];

    protected $casts = [
        'initial_permissions' => 'array',
        'permission_scope_ids' => 'array',
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'revoked_at' => 'datetime'
    ];

    protected static function booted()
    {
        static::creating(function ($invitation) {
            $invitation->token = Str::random(64);
            $invitation->expires_at = Carbon::now()->addDays(7);
            
            // Capture inviter's role and scope based on their invitation permissions
            $user = auth()->user();
            $invitationService = app(ManagerInvitationService::class);
            
            // Store the inviter's role for audit purposes
            $invitation->inviter_role = $user->roles->first()?->name;
            
            // Determine scope from invitation permissions
            $invitationScopes = $invitationService->getUserInvitationScopes($user);
            
            if ($user->hasRole('Administrator')) {
                $invitation->inviter_scope_type = 'system';
                $invitation->inviter_scope_ids = null;
            } elseif (!empty($invitationScopes['plants'])) {
                $invitation->inviter_scope_type = 'plant';
                $invitation->inviter_scope_ids = $invitationScopes['plants'];
            } elseif (!empty($invitationScopes['areas'])) {
                $invitation->inviter_scope_type = 'area';
                $invitation->inviter_scope_ids = $invitationScopes['areas'];
            } elseif (!empty($invitationScopes['sectors'])) {
                $invitation->inviter_scope_type = 'sector';
                $invitation->inviter_scope_ids = $invitationScopes['sectors'];
            } else {
                throw new \Exception('User does not have permission to invite users.');
            }
        });
    }

    public function invitedBy()
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function acceptedBy()
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    public function isValid()
    {
        return !$this->accepted_at 
            && !$this->revoked_at 
            && $this->expires_at->isFuture();
    }

    public function generateSignedUrl()
    {
        return URL::temporarySignedRoute(
            'invitations.accept',
            $this->expires_at,
            ['token' => $this->token]
        );
    }
    
    public function getPermissionScope()
    {
        return [
            'type' => $this->permission_scope_type,
            'ids' => $this->permission_scope_ids
        ];
    }
}
```

### 4. Permission-Based Invitation Service

```php
// app/Services/ManagerInvitationService.php
namespace App\Services;

/**
 * User Invitation Service
 * 
 * In V2, user invitation is permission-based rather than role-based.
 * Any user with users.invite.* permissions can invite users to their scope.
 * 
 * Invitation permissions are automatically created when entities are created:
 * - users.invite.plant.[id] - Can invite users to a specific plant
 * - users.invite.area.[id] - Can invite users to a specific area
 * - users.invite.sector.[id] - Can invite users to a specific sector
 * 
 * Manager roles (Plant Manager, Area Manager, Sector Manager) receive
 * these permissions by default when assigned to entities, but any user
 * can be granted invitation permissions independently of their role.
 */

use App\Models\User;
use App\Models\UserInvitation;
use App\Models\Plant;
use App\Models\Area;
use App\Models\Sector;
use App\Models\Permission;
use Illuminate\Support\Collection;

class ManagerInvitationService
{
    protected $permissionService;
    
    public function __construct(PermissionService $permissionService)
    {
        $this->permissionService = $permissionService;
    }
    
    /**
     * Check if a user can invite others based on invitation permissions
     */
    public function canInviteUsers(User $user): bool
    {
        // Administrators can always invite
        if ($user->hasRole('Administrator')) {
            return true;
        }
        
        // Check for any invitation permission
        return $user->getAllPermissions()->contains(function ($permission) {
            return preg_match('/^users\.invite\.(plant|area|sector)\.\d+$/', $permission->name);
        });
    }
    
    /**
     * Get entities where user has invitation permissions
     */
    public function getUserInvitationScopes(User $user): array
    {
        if ($user->hasRole('Administrator')) {
            return [
                'type' => 'system',
                'entities' => 'all'
            ];
        }
        
        $scopes = [
            'plants' => [],
            'areas' => [],
            'sectors' => []
        ];
        
        // Extract invitation permissions
        $user->getAllPermissions()->each(function ($permission) use (&$scopes) {
            if (preg_match('/^users\.invite\.plant\.(\d+)$/', $permission->name, $matches)) {
                $scopes['plants'][] = (int) $matches[1];
            } elseif (preg_match('/^users\.invite\.area\.(\d+)$/', $permission->name, $matches)) {
                $scopes['areas'][] = (int) $matches[1];
            } elseif (preg_match('/^users\.invite\.sector\.(\d+)$/', $permission->name, $matches)) {
                $scopes['sectors'][] = (int) $matches[1];
            }
        });
        
        return $scopes;
    }
    
    /**
     * Get the scope within which a user can grant permissions
     */
    public function getInviterScope(User $user): array
    {
        if ($user->hasRole('Administrator')) {
            return [
                'type' => 'system',
                'entities' => 'all'
            ];
        }
        
        $invitationScopes = $this->getUserInvitationScopes($user);
        
        // Determine the highest level scope
        if (!empty($invitationScopes['plants'])) {
            return [
                'type' => 'plant',
                'entities' => $invitationScopes['plants']
            ];
        }
        
        if (!empty($invitationScopes['areas'])) {
            return [
                'type' => 'area',
                'entities' => $invitationScopes['areas']
            ];
        }
        
        if (!empty($invitationScopes['sectors'])) {
            return [
                'type' => 'sector',
                'entities' => $invitationScopes['sectors']
            ];
        }
        
        return [
            'type' => 'none',
            'entities' => []
        ];
    }
    
    /**
     * Validate that requested permissions are within inviter's scope
     */
    public function validatePermissionsWithinScope(User $inviter, array $requestedPermissions): array
    {
        $inviterScope = $this->getInviterScope($inviter);
        $validPermissions = [];
        $invalidPermissions = [];
        
        // Administrator can grant any permission
        if ($inviterScope['type'] === 'system') {
            return [
                'valid' => $requestedPermissions,
                'invalid' => []
            ];
        }
        
        foreach ($requestedPermissions as $permission) {
            if ($this->isPermissionWithinScope($permission, $inviterScope)) {
                $validPermissions[] = $permission;
            } else {
                $invalidPermissions[] = $permission;
            }
        }
        
        return [
            'valid' => $validPermissions,
            'invalid' => $invalidPermissions
        ];
    }
    
    /**
     * Check if a specific permission is within the inviter's scope
     */
    protected function isPermissionWithinScope(string $permission, array $scope): bool
    {
        // Extract entity type and ID from permission
        if (preg_match('/\.(plant|area|sector)\.(\d+)$/', $permission, $matches)) {
            $permissionType = $matches[1];
            $permissionId = $matches[2];
            
            // Direct match
            if ($scope['type'] === $permissionType && in_array($permissionId, $scope['entities'])) {
                return true;
            }
            
            // Check hierarchical access
            if ($scope['type'] === 'plant' && $permissionType === 'area') {
                // Check if area belongs to one of the inviter's plants
                $area = Area::find($permissionId);
                return $area && in_array($area->plant_id, $scope['entities']);
            }
            
            if ($scope['type'] === 'plant' && $permissionType === 'sector') {
                // Check if sector belongs to one of the inviter's plants
                $sector = Sector::find($permissionId);
                return $sector && $sector->area && in_array($sector->area->plant_id, $scope['entities']);
            }
            
            if ($scope['type'] === 'area' && $permissionType === 'sector') {
                // Check if sector belongs to one of the inviter's areas
                $sector = Sector::find($permissionId);
                return $sector && in_array($sector->area_id, $scope['entities']);
            }
        }
        
        // Check for asset-specific permissions
        if (preg_match('/assets?\.\w+\.(\d+)$/', $permission, $matches)) {
            $assetId = $matches[1];
            $asset = Asset::find($assetId);
            
            if (!$asset) return false;
            
            if ($scope['type'] === 'plant') {
                return in_array($asset->sector->area->plant_id, $scope['entities']);
            }
            
            if ($scope['type'] === 'area') {
                return in_array($asset->sector->area_id, $scope['entities']);
            }
            
            if ($scope['type'] === 'sector') {
                return in_array($asset->sector_id, $scope['entities']);
            }
        }
        
        return false;
    }
    
    /**
     * Grant permissions to existing users (managers can grant within their scope)
     */
    public function grantPermissionsToUser(User $granter, User $recipient, array $permissions): array
    {
        $validation = $this->validatePermissionsWithinScope($granter, $permissions);
        
        if (!empty($validation['valid'])) {
            $recipient->givePermissionTo($validation['valid']);
        }
        
        return [
            'granted' => $validation['valid'],
            'denied' => $validation['invalid'],
            'message' => empty($validation['invalid']) 
                ? 'All permissions granted successfully' 
                : 'Some permissions were outside your scope and were not granted'
        ];
    }
}
```

## Database Architecture

### Additional Tables for V2

```php
// database/migrations/2024_01_01_000003_add_entity_permission_tracking.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddEntityPermissionTracking extends Migration
{
    public function up()
    {
        // Track entity-permission relationships for easier cleanup
        Schema::create('entity_permissions', function (Blueprint $table) {
            $table->id();
            $table->morphs('entity'); // polymorphic relation to Plant, Area, Sector, etc.
            $table->foreignId('permission_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['entity_type', 'entity_id', 'permission_id']);
            $table->index('permission_id');
        });
        
        // Add reference to creating user for entities
        Schema::table('plants', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->constrained('users');
        });
        
        Schema::table('areas', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->constrained('users');
        });
        
        Schema::table('sectors', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->constrained('users');
        });
        
        // Remove is_super_admin column - using role instead
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_super_admin');
        });
        
        // User invitations with manager scope tracking
        Schema::create('user_invitations', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('token', 64)->unique();
            $table->foreignId('invited_by')->constrained('users');
            $table->string('inviter_role')->nullable(); // Role of inviter at time of invitation
            $table->string('inviter_scope_type')->nullable(); // 'system', 'plant', 'area', 'sector'
            $table->json('inviter_scope_ids')->nullable(); // IDs of entities inviter had access to
            $table->string('initial_role')->nullable();
            $table->json('initial_permissions')->nullable();
            $table->string('permission_scope_type')->nullable(); // Type of entities permissions are for
            $table->json('permission_scope_ids')->nullable(); // Specific entity IDs permissions are for
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by')->nullable()->constrained('users');
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users');
            $table->string('revocation_reason')->nullable();
            $table->timestamps();
            $table->index(['email', 'expires_at']);
            $table->index('expires_at');
            $table->index('inviter_role');
        });
    }
}
```

## Permission Model

### V2 Permission Structure

In V2, permissions are strictly entity-based:

```php
// System-level permission (only one)
Permission::create([
    'name' => 'system.create-plants',
    'display_name' => 'Create New Plants',
    'description' => 'Ability to create new plants in the system',
    'guard_name' => 'web'
]);

// Entity-specific permissions (created dynamically)
// When Plant ID 123 "Springfield Plant" is created:
Permission::create([
    'name' => 'plants.view.123',
    'display_name' => 'View Springfield Plant',
    'description' => 'View details of plant: Springfield Plant',
    'guard_name' => 'web'
]);

// When Area ID 456 "Production Area" is created in Plant 123:
Permission::create([
    'name' => 'areas.view.456',
    'display_name' => 'View Production Area',
    'description' => 'View details of area: Production Area in Springfield Plant',
    'guard_name' => 'web'
]);

// When Sector ID 789 "Assembly Line 1" is created in Area 456:
Permission::create([
    'name' => 'sectors.view.789',
    'display_name' => 'View Assembly Line 1',
    'description' => 'View details of sector: Assembly Line 1',
    'guard_name' => 'web'
]);
```

## Implementation Example

### Updated Controllers

```php
// app/Http/Controllers/PlantController.php
namespace App\Http\Controllers;

use App\Models\Plant;
use App\Services\PermissionService;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PlantController extends Controller
{
    protected $permissionService;
    protected $auditLog;

    public function __construct(PermissionService $permissionService, AuditLogService $auditLog)
    {
        $this->permissionService = $permissionService;
        $this->auditLog = $auditLog;
        
        // Only users with system.create-plants can create
        $this->middleware('can:system.create-plants')->only(['create', 'store']);
    }
    
    public function index(Request $request)
    {
        // Only show plants the user has access to
        $plants = $this->permissionService->getUserAccessiblePlants($request->user());
        
        return Inertia::render('Plants/Index', [
            'plants' => $plants,
            'can' => [
                'createPlant' => $request->user()->can('system.create-plants')
            ]
        ]);
    }
    
    public function show(Plant $plant)
    {
        // Authorization handled by policy
        $this->authorize('view', $plant);
        
        return Inertia::render('Plants/Show', [
            'plant' => $plant->load('areas'),
            'can' => [
                'update' => $request->user()->can('update', $plant),
                'delete' => $request->user()->can('delete', $plant),
                'createArea' => $request->user()->can("areas.create.plant.{$plant->id}")
            ]
        ]);
    }
    
    public function store(Request $request)
    {
        // Only users with system.create-plants can reach here
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:plants',
            'location' => 'required|string',
            // other fields...
        ]);
        
        $plant = Plant::create(array_merge($validated, [
            'created_by' => $request->user()->id
        ]));
        
        // Permissions are automatically created by PlantObserver
        // Log the creation
        $this->auditLog->log('plant.created', [
            'plant_id' => $plant->id,
            'created_by' => $request->user()->id
        ]);
        
        return redirect()->route('plants.show', $plant)
            ->with('success', 'Plant created successfully. You have been granted management permissions.');
    }
}
```

### Shared Entity Update Controller

```php
// app/Http/Controllers/ShiftController.php
namespace App\Http\Controllers;

use App\Models\Shift;
use App\Services\SharedEntityValidationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShiftController extends Controller
{
    protected $validationService;
    
    public function __construct(SharedEntityValidationService $validationService)
    {
        $this->validationService = $validationService;
    }
    
    public function update(Request $request, Shift $shift)
    {
        // Validate user can update this shared entity
        $validation = $this->validationService->canUpdateSharedEntity($shift, $request->user());
        
        if (!$validation['can_update']) {
            return response()->json([
                'can_update' => false,
                'message' => 'You do not have permission to update this shift for all affected assets.',
                'inaccessible_count' => $validation['inaccessible_assets']->count(),
                'total_affected' => $validation['total_affected'],
                'suggestion' => 'Would you like to create a copy of this shift for the assets you have access to?'
            ], 403);
        }
        
        // Proceed with update
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            // other fields...
        ]);
        
        $shift->update($validated);
        
        return redirect()->route('shifts.show', $shift)
            ->with('success', 'Shift updated successfully.');
    }
    
    public function duplicate(Request $request, Shift $shift)
    {
        // Create a copy of the shift for assets user has access to
        $validation = $this->validationService->canUpdateSharedEntity($shift, $request->user());
        
        $newShift = $shift->replicate();
        $newShift->name = $shift->name . ' (Copy)';
        $newShift->save();
        
        // Apply to accessible assets only
        $accessibleAssets = Asset::whereIn('id', 
            $validation['total_affected'] - $validation['inaccessible_assets']->count()
        )->get();
        
        foreach ($accessibleAssets as $asset) {
            // Update asset to use new shift
            $asset->update(['shift_id' => $newShift->id]);
        }
        
        return redirect()->route('shifts.show', $newShift)
            ->with('success', 'Shift duplicated and applied to accessible assets.');
    }
}
```

### Manager-Based Invitation Controller

```php
// app/Http/Controllers/UserInvitationController.php
namespace App\Http\Controllers;

use App\Models\UserInvitation;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Services\ManagerInvitationService;
use App\Services\PermissionService;
use App\Notifications\UserInvitation as InvitationNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserInvitationController extends Controller
{
    protected $invitationService;
    protected $permissionService;

    public function __construct(
        ManagerInvitationService $invitationService, 
        PermissionService $permissionService
    ) {
        $this->invitationService = $invitationService;
        $this->permissionService = $permissionService;
    }
    
    public function create(Request $request)
    {
        // Check if user can invite
        if (!$this->invitationService->canInviteUsers($request->user())) {
            abort(403, 'You do not have permission to invite users.');
        }
        
        // Get inviter's scope
        $scope = $this->invitationService->getInviterScope($request->user());
        
        // Get available permissions within scope
        $availablePermissions = $this->getAvailablePermissionsForScope($scope);
        
        return Inertia::render('Invitations/Create', [
            'inviterScope' => $scope,
            'availablePermissions' => $availablePermissions,
            'availableRoles' => $this->getAvailableRolesForScope($scope)
        ]);
    }
    
    public function store(Request $request)
    {
        // Validate user can invite
        if (!$this->invitationService->canInviteUsers($request->user())) {
            abort(403);
        }
        
        $validated = $request->validate([
            'email' => 'required|email|unique:users,email|unique:user_invitations,email',
            'initial_role' => 'nullable|string',
            'initial_permissions' => 'nullable|array',
            'message' => 'nullable|string|max:500'
        ]);
        
        // Validate permissions are within inviter's scope
        $permissionValidation = $this->invitationService->validatePermissionsWithinScope(
            $request->user(),
            $validated['initial_permissions'] ?? []
        );
        
        if (!empty($permissionValidation['invalid'])) {
            return back()->withErrors([
                'initial_permissions' => 'Some permissions are outside your scope: ' . 
                    implode(', ', $permissionValidation['invalid'])
            ]);
        }
        
        // Create invitation with scope information
        $scope = $this->invitationService->getInviterScope($request->user());
        $invitation = UserInvitation::create([
            'email' => $validated['email'],
            'invited_by' => $request->user()->id,
            'inviter_role' => $request->user()->roles->first()->name,
            'inviter_scope_type' => $scope['type'],
            'inviter_scope_ids' => $scope['entities'],
            'initial_role' => $validated['initial_role'],
            'initial_permissions' => $permissionValidation['valid'],
            'permission_scope_type' => $scope['type'],
            'permission_scope_ids' => $scope['entities']
        ]);
        
        // Send invitation email
        \Notification::route('mail', $invitation->email)
            ->notify(new InvitationNotification($invitation));
        
        return redirect()->route('invitations.index')
            ->with('success', 'Invitation sent successfully.');
    }
    
    public function grantPermissions(Request $request, User $user)
    {
        // Check if current user can grant permissions
        if (!$this->invitationService->canInviteUsers($request->user())) {
            abort(403, 'You do not have permission to grant permissions.');
        }
        
        $validated = $request->validate([
            'permissions' => 'required|array'
        ]);
        
        // Grant permissions within scope
        $result = $this->invitationService->grantPermissionsToUser(
            $request->user(),
            $user,
            $validated['permissions']
        );
        
        if (!empty($result['denied'])) {
            return back()->with('warning', $result['message']);
        }
        
        return back()->with('success', $result['message']);
    }
    
    protected function getAvailablePermissionsForScope($scope)
    {
        // Return permissions based on scope type and entities
        if ($scope['type'] === 'system') {
            return Permission::all()->groupBy('resource');
        }
        
        // Filter permissions to only those within the manager's scope
        $permissions = collect();
        
        foreach ($scope['entities'] as $entityId) {
            $pattern = match($scope['type']) {
                'plant' => "%.plant.{$entityId}",
                'area' => "%.area.{$entityId}",
                'sector' => "%.sector.{$entityId}",
                default => null
            };
            
            if ($pattern) {
                $permissions = $permissions->merge(
                    Permission::where('name', 'like', $pattern)->get()
                );
            }
        }
        
        return $permissions->groupBy(function ($permission) {
            return explode('.', $permission->name)[0]; // Group by resource
        });
    }
    
    protected function getAvailableRolesForScope($scope)
    {
        // Managers can only assign non-admin roles
        if ($scope['type'] === 'system') {
            return Role::all();
        }
        
        return Role::whereNotIn('name', ['Administrator'])->get();
    }
}
```

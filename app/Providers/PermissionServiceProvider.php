<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Models\Permission as CustomPermission;
use App\Models\Role as CustomRole;

class PermissionServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Use custom models
        $this->app->bind(Permission::class, CustomPermission::class);
        $this->app->bind(Role::class, CustomRole::class);

        // Register permission hierarchy service
        $this->app->singleton(\App\Services\PermissionHierarchyService::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Register permission check middleware
        $this->app['router']->aliasMiddleware('permission', \App\Http\Middleware\CheckPermission::class);

        // Register the Gate::before check for Administrator wildcard permissions
        Gate::before(function ($user, $ability) {
            // V2: Administrator role has wildcard permissions
            if ($user->isAdministrator()) {
                return true;
            }
            
            // Check ownership-based permissions
            if (str_contains($ability, '.owned')) {
                // This will be handled by individual policy methods
                return null;
            }
            
            // For all other permissions, let the normal permission check proceed
            return null;
        });
        
        // Define additional gates for V2 features
        
        // Gate for checking if user can invite to a specific entity
        Gate::define('invite-to-entity', function ($user, $entityType, $entityId) {
            return $user->canInviteToEntity($entityType, $entityId);
        });
        
        // Gate for checking shared entity update permissions
        Gate::define('update-shared-entity', function ($user, $sharedEntity, $entityType) {
            $hierarchyService = app(\App\Services\PermissionHierarchyService::class);
            $validation = $hierarchyService->validateSharedEntityUpdate($user, $sharedEntity, $entityType);
            return $validation['allowed'];
        });
        
        // Gate for bulk operations
        Gate::define('bulk-import', function ($user) {
            return $user->hasPermissionTo('system.bulk-import-assets');
        });
        
        Gate::define('bulk-export', function ($user) {
            return $user->hasPermissionTo('system.bulk-export-assets');
        });
        
        // Gate for system settings
        Gate::define('view-system-settings', function ($user) {
            return $user->hasPermissionTo('system.settings.view');
        });
        
        Gate::define('update-system-settings', function ($user) {
            return $user->hasPermissionTo('system.settings.update');
        });
        
        // Gate for audit logs
        Gate::define('view-audit-logs', function ($user) {
            return $user->hasPermissionTo('system.audit.view');
        });
        
        // Gate for creating plants (the only global resource permission)
        Gate::define('create-plants', function ($user) {
            return $user->hasPermissionTo('system.create-plants');
        });
        
        // Gate for managing Administrator role
        Gate::define('manage-administrators', function ($user) {
            // Only Administrators can assign the Administrator role
            return $user->isAdministrator();
        });
        
        // Ensure at least one Administrator exists
        $this->ensureAdministratorExists();
    }

    /**
     * Ensure at least one Administrator exists in the system
     */
    private function ensureAdministratorExists(): void
    {
        if (!Role::ensureAdministratorExists()) {
            // If no administrators exist, make the first user an administrator
            $firstUser = \App\Models\User::first();
            if ($firstUser) {
                $adminRole = Role::getAdministratorRole();
                if ($adminRole && !$firstUser->hasRole($adminRole)) {
                    $firstUser->assignRole($adminRole);
                    \Log::warning('No administrators found. Assigned Administrator role to first user: ' . $firstUser->email);
                }
            }
        }
    }
}
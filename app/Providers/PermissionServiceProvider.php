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

        // Register global gates
        Gate::before(function ($user, $ability) {
            // Super admin bypass
            if ($user->is_super_admin) {
                return true;
            }
        });

        // Register permission-based gates after app boots
        $this->app->booted(function () {
            $this->registerPermissionGates();
        });
    }

    /**
     * Register gates based on permissions
     */
    protected function registerPermissionGates(): void
    {
        try {
            // Only register gates if permissions table exists
            if (\Schema::hasTable('permissions')) {
                CustomPermission::get()->each(function ($permission) {
                    Gate::define($permission->name, function ($user) use ($permission) {
                        // Permission check is handled by Spatie package
                        return $user->hasPermissionTo($permission->name);
                    });
                });
            }
        } catch (\Exception $e) {
            // Silently ignore errors during migration/testing
        }
    }
}
<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Collection;

class PermissionService
{
    /**
     * Get all permissions grouped by resource.
     */
    public function getGroupedPermissions(): Collection
    {
        return Permission::all()->groupBy(function ($permission) {
            // Extract resource name from permission name
            $parts = explode('.', $permission->name);

            return count($parts) > 1 ? $parts[0] : 'general';
        });
    }

    /**
     * Sync permissions for a role.
     */
    public function syncRolePermissions(Role $role, array $permissionIds): void
    {
        $permissions = Permission::whereIn('id', $permissionIds)->get();
        $role->syncPermissions($permissions);
    }

    /**
     * Get permissions for a specific resource.
     */
    public function getResourcePermissions(string $resource): Collection
    {
        return Permission::where('name', 'like', $resource . '.%')->get();
    }
}

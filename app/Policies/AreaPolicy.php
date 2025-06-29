<?php

namespace App\Policies;

use App\Models\AssetHierarchy\Area;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AreaPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any areas.
     */
    public function viewAny(User $user)
    {
        // Administrators can view any areas
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has any area-related view permissions
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        
        foreach ($permissions as $permission) {
            // Check for direct area view permissions
            if (preg_match('/^areas\.view\.\d+$/', $permission)) {
                return true;
            }
            // Check for plant-level permissions that would grant area access
            if (preg_match('/^plants\.(view|update|delete|manage-shifts)\.\d+$/', $permission)) {
                return true;
            }
            // Check for any permission that indicates access to entities within areas
            if (preg_match('/^sectors\.\w+\.\d+$/', $permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can view the area.
     */
    public function view(User $user, Area $area)
    {
        // Administrators can view any area
        if ($user->isAdministrator()) {
            return true;
        }

        // Get all user permissions
        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check if user has direct view permission on the area
        if (in_array("areas.view.{$area->id}", $userPermissions)) {
            return true;
        }

        // Check if user has permissions on the parent plant
        if ($area->plant_id) {
            foreach ($userPermissions as $permission) {
                // Check for plant permissions that would grant area access
                if (preg_match("/^plants\.(view|update|delete|manage-shifts)\.{$area->plant_id}$/", $permission)) {
                    return true;
                }
                // Check for plant-scoped permissions
                if (preg_match("/\.plant\.{$area->plant_id}$/", $permission)) {
                    return true;
                }
            }
        }

        // Check if user has permissions for any sector within this area
        $areaSectors = $area->sectors()->pluck('id')->toArray();
        if (!empty($areaSectors)) {
            foreach ($userPermissions as $permission) {
                // Check sector permissions (format: sectors.view.123, sectors.update.123, etc.)
                if (preg_match('/^sectors\.\w+\.(\d+)$/', $permission, $matches)) {
                    if (in_array((int)$matches[1], $areaSectors)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Determine whether the user can create areas.
     */
    public function create(User $user)
    {
        // Administrators can create areas
        if ($user->isAdministrator()) {
            return true;
        }

        // In V2, area creation is controlled at the plant level
        // We need to check if user has update permission on any plant
        // The specific plant permission will be checked when validating the plant_id
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        
        foreach ($permissions as $permission) {
            // Check if user has update permission on any plant
            if (preg_match('/^plants\.update\.\d+$/', $permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can update the area.
     */
    public function update(User $user, Area $area)
    {
        // Administrators can update any area
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has direct update permission on the area
        if ($user->can("areas.update.{$area->id}")) {
            return true;
        }

        // Check if user has update permission on the parent plant
        if ($area->plant_id && $user->can("plants.update.{$area->plant_id}")) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the area.
     */
    public function delete(User $user, Area $area)
    {
        // Administrators can delete any area
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has direct delete permission on the area
        if ($user->can("areas.delete.{$area->id}")) {
            return true;
        }

        // Check if user has delete permission on the parent plant
        if ($area->plant_id && $user->can("plants.delete.{$area->plant_id}")) {
            return true;
        }

        return false;
    }
} 
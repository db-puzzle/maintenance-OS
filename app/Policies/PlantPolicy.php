<?php

namespace App\Policies;

use App\Models\AssetHierarchy\Plant;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PlantPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any plants.
     */
    public function viewAny(User $user)
    {
        // Administrators can view any plants
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has any plant-related view permissions
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        
        foreach ($permissions as $permission) {
            // Check for direct plant view permissions
            if (preg_match('/^plants\.view\.\d+$/', $permission)) {
                return true;
            }
            // Check for any permission that indicates access to entities within plants
            if (preg_match('/^(areas|sectors)\.\w+\.\d+$/', $permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can view the plant.
     */
    public function view(User $user, Plant $plant)
    {
        // Administrators can view any plant
        if ($user->isAdministrator()) {
            return true;
        }

        // Get all user permissions
        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check if user has direct view permission on the plant
        if (in_array("plants.view.{$plant->id}", $userPermissions)) {
            return true;
        }

        // Check if user has any permissions scoped to this plant
        foreach ($userPermissions as $permission) {
            // Direct plant-scoped permissions
            if (preg_match("/\.plant\.{$plant->id}$/", $permission)) {
                return true;
            }
        }

        // Check if user has permissions for any area within this plant
        $plantAreas = $plant->areas()->pluck('id')->toArray();
        if (!empty($plantAreas)) {
            foreach ($userPermissions as $permission) {
                // Check area permissions (format: areas.view.123, areas.update.123, etc.)
                if (preg_match('/^areas\.\w+\.(\d+)$/', $permission, $matches)) {
                    if (in_array((int)$matches[1], $plantAreas)) {
                        return true;
                    }
                }
            }
            
            // Check if user has permissions for any sector within this plant
            $plantSectors = \App\Models\AssetHierarchy\Sector::whereIn('area_id', $plantAreas)->pluck('id')->toArray();
            if (!empty($plantSectors)) {
                foreach ($userPermissions as $permission) {
                    // Check sector permissions (format: sectors.view.123, sectors.update.123, etc.)
                    if (preg_match('/^sectors\.\w+\.(\d+)$/', $permission, $matches)) {
                        if (in_array((int)$matches[1], $plantSectors)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * Determine whether the user can create plants.
     */
    public function create(User $user)
    {
        // Administrators can create plants
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has the system-level plant creation permission
        return $user->can('system.create-plants');
    }

    /**
     * Determine whether the user can update the plant.
     */
    public function update(User $user, Plant $plant)
    {
        // Administrators can update any plant
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has direct update permission on the plant
        return $user->can("plants.update.{$plant->id}");
    }

    /**
     * Determine whether the user can delete the plant.
     */
    public function delete(User $user, Plant $plant)
    {
        // Administrators can delete any plant
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has direct delete permission on the plant
        return $user->can("plants.delete.{$plant->id}");
    }

    /**
     * Determine whether the user can manage shifts for the plant.
     */
    public function manageShifts(User $user, Plant $plant)
    {
        // Administrators can manage shifts for any plant
        if ($user->isAdministrator()) {
            return true;
        }

        // Get all user permissions
        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check if user has direct manage-shifts permission on the plant
        if (in_array("plants.manage-shifts.{$plant->id}", $userPermissions)) {
            return true;
        }

        // Check if user has general shift management permission for this plant
        if (in_array("shifts.manage.plant.{$plant->id}", $userPermissions)) {
            return true;
        }

        return false;
    }
} 
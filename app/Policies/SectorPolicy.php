<?php

namespace App\Policies;

use App\Models\AssetHierarchy\Sector;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SectorPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any sectors.
     */
    public function viewAny(User $user)
    {
        // Administrators can view any sectors
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has any sector-related view permissions
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        
        foreach ($permissions as $permission) {
            // Check for direct sector view permissions
            if (preg_match('/^sectors\.view\.\d+$/', $permission)) {
                return true;
            }
            // Check for area permissions (sectors are within areas)
            if (preg_match('/^areas\.\w+\.\d+$/', $permission)) {
                return true;
            }
            // Check for plant permissions (sectors are within plants through areas)
            if (preg_match('/^plants\.\w+\.\d+$/', $permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can view the sector.
     */
    public function view(User $user, Sector $sector)
    {
        // Administrators can view any sector
        if ($user->isAdministrator()) {
            return true;
        }

        // Get all user permissions
        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check if user has direct view permission on the sector
        if (in_array("sectors.view.{$sector->id}", $userPermissions)) {
            return true;
        }

        // Check if user has any permissions scoped to this sector
        foreach ($userPermissions as $permission) {
            // Direct sector-scoped permissions
            if (preg_match("/\.sector\.{$sector->id}$/", $permission)) {
                return true;
            }
        }

        // Check if user has permissions for the area containing this sector
        if ($sector->area_id) {
            foreach ($userPermissions as $permission) {
                // Check area permissions (format: areas.view.123, areas.update.123, etc.)
                if (preg_match('/^areas\.\w+\.(\d+)$/', $permission, $matches)) {
                    if ((int)$matches[1] === $sector->area_id) {
                        return true;
                    }
                }
            }
            
            // Check if user has permissions for the plant containing this sector
            $area = $sector->area;
            if ($area && $area->plant_id) {
                foreach ($userPermissions as $permission) {
                    // Check plant permissions (format: plants.view.123, plants.update.123, etc.)
                    if (preg_match('/^plants\.\w+\.(\d+)$/', $permission, $matches)) {
                        if ((int)$matches[1] === $area->plant_id) {
                            return true;
                        }
                    }
                    // Check plant-scoped permissions
                    if (preg_match("/\.plant\.{$area->plant_id}$/", $permission)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Determine whether the user can create sectors.
     */
    public function create(User $user)
    {
        // Administrators can create sectors
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has the system-level sector creation permission
        if ($user->can('system.create-sectors')) {
            return true;
        }

        // Get all user permissions
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        
        // Check for area-scoped sector creation permissions
        foreach ($permissions as $permission) {
            // sectors.create.area.123 - can create sectors in specific area
            if (preg_match('/^sectors\.create\.area\.\d+$/', $permission)) {
                return true;
            }
            // sectors.create.plant.123 - can create sectors in any area of specific plant
            if (preg_match('/^sectors\.create\.plant\.\d+$/', $permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can update the sector.
     */
    public function update(User $user, Sector $sector)
    {
        // Administrators can update any sector
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has direct update permission on the sector
        if ($user->can("sectors.update.{$sector->id}")) {
            return true;
        }

        // Check if user has update permission on the area containing this sector
        if ($sector->area_id && $user->can("areas.update.{$sector->area_id}")) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the sector.
     */
    public function delete(User $user, Sector $sector)
    {
        // Administrators can delete any sector
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has direct delete permission on the sector
        if ($user->can("sectors.delete.{$sector->id}")) {
            return true;
        }

        // Check if user has delete permission on the area containing this sector
        if ($sector->area_id && $user->can("areas.delete.{$sector->area_id}")) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can manage shifts for the sector.
     */
    public function manageShifts(User $user, Sector $sector)
    {
        // Administrators can manage shifts for any sector
        if ($user->isAdministrator()) {
            return true;
        }

        // Get all user permissions
        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check if user has direct manage-shifts permission on the sector
        if (in_array("sectors.manage-shifts.{$sector->id}", $userPermissions)) {
            return true;
        }

        // Check if user has general shift management permission for this sector
        if (in_array("shifts.manage.sector.{$sector->id}", $userPermissions)) {
            return true;
        }

        // Check if user has manage-shifts permission on the area
        if ($sector->area_id && in_array("areas.manage-shifts.{$sector->area_id}", $userPermissions)) {
            return true;
        }

        return false;
    }
} 
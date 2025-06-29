<?php

namespace App\Policies;

use App\Models\AssetHierarchy\Asset;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AssetPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any assets.
     */
    public function viewAny(User $user)
    {
        // Administrators can view any assets
        if ($user->isAdministrator()) {
            return true;
        }

        // Check if user has any viewAny permission at any scope
        $permissions = $user->getAllPermissions();
        foreach ($permissions as $permission) {
            if (str_starts_with($permission->name, 'assets.viewAny.')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can view the asset.
     */
    public function view(User $user, Asset $asset)
    {
        // Administrators can view any asset
        if ($user->isAdministrator()) {
            return true;
        }

        // Get all user permissions
        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check if user has direct view permission on the asset
        if (in_array("assets.view.{$asset->id}", $userPermissions)) {
            return true;
        }

        // Check hierarchical permissions (sector -> area -> plant)
        if ($asset->sector_id && in_array("assets.view.sector.{$asset->sector_id}", $userPermissions)) {
            return true;
        }

        if ($asset->area_id && in_array("assets.view.area.{$asset->area_id}", $userPermissions)) {
            return true;
        }

        if ($asset->plant_id && in_array("assets.view.plant.{$asset->plant_id}", $userPermissions)) {
            return true;
        }

        // Check viewAny permissions at different scopes
        if ($asset->sector_id && in_array("assets.viewAny.sector.{$asset->sector_id}", $userPermissions)) {
            return true;
        }

        if ($asset->area_id && in_array("assets.viewAny.area.{$asset->area_id}", $userPermissions)) {
            return true;
        }

        if ($asset->plant_id && in_array("assets.viewAny.plant.{$asset->plant_id}", $userPermissions)) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can manage the asset (create/update/delete routines).
     */
    public function manage(User $user, Asset $asset)
    {
        // Administrators can manage any asset
        if ($user->isAdministrator()) {
            return true;
        }

        // Get all user permissions
        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check if user has direct manage permission on the asset
        if (in_array("assets.manage.{$asset->id}", $userPermissions)) {
            return true;
        }

        // Check hierarchical manage permissions
        if ($asset->sector_id && in_array("assets.manage.sector.{$asset->sector_id}", $userPermissions)) {
            return true;
        }

        if ($asset->area_id && in_array("assets.manage.area.{$asset->area_id}", $userPermissions)) {
            return true;
        }

        if ($asset->plant_id && in_array("assets.manage.plant.{$asset->plant_id}", $userPermissions)) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can execute routines for the asset.
     */
    public function executeRoutines(User $user, Asset $asset)
    {
        // Administrators can execute routines on any asset
        if ($user->isAdministrator()) {
            return true;
        }

        // Get all user permissions
        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check if user has direct execute-routines permission on the asset
        if (in_array("assets.execute-routines.{$asset->id}", $userPermissions)) {
            return true;
        }

        // Check hierarchical execute-routines permissions
        if ($asset->sector_id && in_array("assets.execute-routines.sector.{$asset->sector_id}", $userPermissions)) {
            return true;
        }

        if ($asset->area_id && in_array("assets.execute-routines.area.{$asset->area_id}", $userPermissions)) {
            return true;
        }

        if ($asset->plant_id && in_array("assets.execute-routines.plant.{$asset->plant_id}", $userPermissions)) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can create assets.
     * 
     * @param User $user
     * @param array $context Context containing sector_id, area_id, or plant_id
     */
    public function create(User $user, array $context = [])
    {
        // Administrators can create assets anywhere
        if ($user->isAdministrator()) {
            return true;
        }

        // Extract context
        $sectorId = $context['sector_id'] ?? null;
        $areaId = $context['area_id'] ?? null;
        $plantId = $context['plant_id'] ?? null;

        // Get all user permissions
        $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        // Check if user has create permission at the sector level
        if ($sectorId && in_array("assets.create.sector.{$sectorId}", $userPermissions)) {
            return true;
        }

        // Check if user has create permission at the area level
        if ($areaId && in_array("assets.create.area.{$areaId}", $userPermissions)) {
            return true;
        }

        // Check if user has create permission at the plant level
        if ($plantId && in_array("assets.create.plant.{$plantId}", $userPermissions)) {
            return true;
        }

        // Check if user has manage permission (which includes create) at any level
        if ($sectorId && in_array("assets.manage.sector.{$sectorId}", $userPermissions)) {
            return true;
        }

        if ($areaId && in_array("assets.manage.area.{$areaId}", $userPermissions)) {
            return true;
        }

        if ($plantId && in_array("assets.manage.plant.{$plantId}", $userPermissions)) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can update the asset.
     */
    public function update(User $user, Asset $asset)
    {
        // For now, update uses the same logic as manage
        return $this->manage($user, $asset);
    }

    /**
     * Determine whether the user can delete the asset.
     */
    public function delete(User $user, Asset $asset)
    {
        // For now, delete uses the same logic as manage
        return $this->manage($user, $asset);
    }
} 
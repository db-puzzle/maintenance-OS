<?php

namespace App\Services;

use App\Models\User;
use App\Models\Permission;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;

class PermissionHierarchyService
{
    /**
     * Check if user has permission considering hierarchy
     * V2: All permissions are entity-scoped except system permissions
     */
    public function checkHierarchicalPermission(User $user, string $basePermission, $model = null): bool
    {
        // Administrator always has access
        if ($user->isAdministrator()) {
            return true;
        }

        // Check system-level permissions (only system.* permissions are global in V2)
        if (str_starts_with($basePermission, 'system.')) {
            return $user->can($basePermission);
        }

        // V2: All other permissions MUST be entity-scoped
        if (!$model) {
            return false;
        }

        // Check model-specific permissions based on hierarchy
        return $this->checkModelPermissions($user, $basePermission, $model);
    }

    /**
     * Check model-specific permissions through hierarchy
     */
    private function checkModelPermissions(User $user, string $basePermission, $model): bool
    {
        // For assets, check full hierarchy: asset -> sector -> area -> plant
        if ($model instanceof Asset) {
            return $user->can("{$basePermission}.{$model->id}")
                || $user->can("{$basePermission}.sector.{$model->sector_id}")
                || $user->can("{$basePermission}.area.{$model->area_id}")
                || $user->can("{$basePermission}.plant.{$model->plant_id}")
                || ($this->isOwnershipPermission($basePermission) && $model->created_by === $user->id);
        }

        // For sectors, check: sector -> area -> plant
        if ($model instanceof Sector) {
            return $user->can("{$basePermission}.{$model->id}")
                || $user->can("{$basePermission}.area.{$model->area_id}")
                || $user->can("{$basePermission}.plant.{$model->area->plant_id}");
        }

        // For areas, check: area -> plant
        if ($model instanceof Area) {
            return $user->can("{$basePermission}.{$model->id}")
                || $user->can("{$basePermission}.plant.{$model->plant_id}");
        }

        // For plants, check specific permission
        if ($model instanceof Plant) {
            return $user->can("{$basePermission}.{$model->id}");
        }

        // For other models (shifts, asset types, manufacturers), check specific permission
        return $user->can("{$basePermission}.{$model->id}");
    }

    /**
     * Check if permission is ownership-based
     */
    private function isOwnershipPermission(string $permission): bool
    {
        return str_contains($permission, '.owned');
    }

    /**
     * Get all entities user has access to for a given permission
     * V2: No global permissions except system.*
     */
    public function getAccessibleEntities(User $user, string $resource, string $action): array
    {
        $basePermission = "{$resource}.{$action}";
        
        // Administrator has access to all
        if ($user->isAdministrator()) {
            return ['all' => true];
        }

        // V2: No global permissions for resources
        $accessible = [
            'plants' => [],
            'areas' => [],
            'sectors' => [],
            'assets' => [],
            'owned_only' => false
        ];

        // Check all user permissions
        foreach ($user->getAllEffectivePermissions() as $permission) {
            if (!str_starts_with($permission->name, $basePermission)) {
                continue;
            }

            $parts = explode('.', $permission->name);
            
            // Handle ownership permission
            if (end($parts) === 'owned') {
                $accessible['owned_only'] = true;
                continue;
            }

            // Handle scoped permissions
            if (count($parts) >= 4) {
                $scope = $parts[2];
                $id = $parts[3];
                
                switch ($scope) {
                    case 'plant':
                        $accessible['plants'][] = (int) $id;
                        break;
                    case 'area':
                        $accessible['areas'][] = (int) $id;
                        break;
                    case 'sector':
                        $accessible['sectors'][] = (int) $id;
                        break;
                    default:
                        // Direct entity permissions (e.g., assets.view.123)
                        if (count($parts) === 3 && is_numeric($parts[2])) {
                            $accessible['assets'][] = (int) $parts[2];
                        }
                }
            } elseif (count($parts) === 3 && is_numeric($parts[2])) {
                // Direct entity permissions (e.g., plants.view.123)
                $accessible[$resource][] = (int) $parts[2];
            }
        }

        return $accessible;
    }

    /**
     * Apply permission filters to a query
     */
    public function applyPermissionFilters($query, User $user, string $resource, string $action)
    {
        $accessible = $this->getAccessibleEntities($user, $resource, $action);
        
        if ($accessible === ['all' => true] || $accessible['all'] ?? false) {
            return $query; // No restrictions (Administrator)
        }

        return $query->where(function ($q) use ($accessible, $user) {
            $hasConditions = false;

            // Plant-level access
            if (!empty($accessible['plants'])) {
                $q->orWhereIn('plant_id', $accessible['plants']);
                $hasConditions = true;
            }

            // Area-level access
            if (!empty($accessible['areas'])) {
                $q->orWhereIn('area_id', $accessible['areas']);
                $hasConditions = true;
            }

            // Sector-level access
            if (!empty($accessible['sectors'])) {
                $q->orWhereIn('sector_id', $accessible['sectors']);
                $hasConditions = true;
            }

            // Asset-specific access
            if (!empty($accessible['assets'])) {
                $q->orWhereIn('id', $accessible['assets']);
                $hasConditions = true;
            }

            // Ownership-based access
            if ($accessible['owned_only']) {
                $q->orWhere('created_by', $user->id);
                $hasConditions = true;
            }

            // If no conditions were added, add impossible condition
            if (!$hasConditions) {
                $q->whereRaw('1 = 0'); // No access
            }
        });
    }

    /**
     * Check if user can create in specific context
     * V2: Must have entity-specific creation permission
     */
    public function canCreateInContext(User $user, string $resource, $parentModel = null): bool
    {
        $basePermission = "{$resource}.create";
        
        if ($user->isAdministrator()) {
            return true;
        }

        // System-level creation (only for plants)
        if ($resource === 'plants' && $user->can('system.create-plants')) {
            return true;
        }

        if (!$parentModel) {
            return false;
        }

        // Check context-specific creation permissions
        if ($parentModel instanceof Plant) {
            return $user->can("{$basePermission}.plant.{$parentModel->id}");
        }

        if ($parentModel instanceof Area) {
            return $user->can("{$basePermission}.area.{$parentModel->id}")
                || $user->can("{$basePermission}.plant.{$parentModel->plant_id}");
        }

        if ($parentModel instanceof Sector) {
            return $user->can("{$basePermission}.sector.{$parentModel->id}")
                || $user->can("{$basePermission}.area.{$parentModel->area_id}")
                || $user->can("{$basePermission}.plant.{$parentModel->area->plant_id}");
        }

        return false;
    }

    /**
     * Get user's accessible plants
     * V2: Must have specific plant permissions
     */
    public function getAccessiblePlants(User $user, string $action = 'view'): \Illuminate\Database\Eloquent\Collection
    {
        if ($user->isAdministrator()) {
            return Plant::all();
        }

        $accessible = $this->getAccessibleEntities($user, 'plants', $action);
        
        if (!empty($accessible['plants'])) {
            return Plant::whereIn('id', $accessible['plants'])->get();
        }

        return Plant::whereRaw('1 = 0')->get(); // Return empty Eloquent collection
    }

    /**
     * Get user's accessible areas for a plant
     * V2: Must have specific area or plant permissions
     */
    public function getAccessibleAreas(User $user, Plant $plant = null, string $action = 'view'): \Illuminate\Database\Eloquent\Collection
    {
        if ($user->isAdministrator()) {
            return $plant ? $plant->areas : Area::all();
        }

        $accessible = $this->getAccessibleEntities($user, 'areas', $action);
        
        $query = $plant ? $plant->areas() : Area::query();
        
        // Direct area permissions
        if (!empty($accessible['areas'])) {
            $query->whereIn('id', $accessible['areas']);
        } 
        // Plant-level permissions grant access to all areas
        elseif (!empty($accessible['plants'])) {
            $query->whereIn('plant_id', $accessible['plants']);
        } 
        else {
            return Area::whereRaw('1 = 0')->get(); // Return empty Eloquent collection
        }

        return $query->get();
    }

    /**
     * Get user's accessible sectors for an area
     * V2: Must have specific sector, area, or plant permissions
     */
    public function getAccessibleSectors(User $user, Area $area = null, string $action = 'view'): \Illuminate\Database\Eloquent\Collection
    {
        if ($user->isAdministrator()) {
            return $area ? $area->sectors : Sector::all();
        }

        $accessible = $this->getAccessibleEntities($user, 'sectors', $action);
        
        $query = $area ? $area->sectors() : Sector::query();
        
        // Direct sector permissions
        if (!empty($accessible['sectors'])) {
            $query->whereIn('id', $accessible['sectors']);
        } 
        // Area-level permissions grant access to all sectors
        elseif (!empty($accessible['areas'])) {
            $query->whereIn('area_id', $accessible['areas']);
        } 
        // Plant-level permissions grant access to all sectors
        elseif (!empty($accessible['plants'])) {
            $query->whereHas('area', function ($q) use ($accessible) {
                $q->whereIn('plant_id', $accessible['plants']);
            });
        } 
        else {
            return Sector::whereRaw('1 = 0')->get(); // Return empty Eloquent collection
        }

        return $query->get();
    }

    /**
     * Get user's accessible assets
     * V2: Must have specific asset, sector, area, or plant permissions
     */
    public function getAccessibleAssets(User $user, $parentModel = null, string $action = 'view'): \Illuminate\Database\Eloquent\Builder
    {
        $query = Asset::query();

        if ($user->isAdministrator()) {
            if ($parentModel instanceof Sector) {
                return $query->where('sector_id', $parentModel->id);
            } elseif ($parentModel instanceof Area) {
                return $query->where('area_id', $parentModel->id);
            } elseif ($parentModel instanceof Plant) {
                return $query->where('plant_id', $parentModel->id);
            }
            return $query;
        }

        return $this->applyPermissionFilters($query, $user, 'assets', $action);
    }

    /**
     * Check if user has any access to a resource
     * V2: Must have specific permissions
     */
    public function hasAnyAccess(User $user, string $resource): bool
    {
        if ($user->isAdministrator()) {
            return true;
        }

        $permissions = $user->getAllEffectivePermissions();
        
        return $permissions->contains(function ($permission) use ($resource) {
            return str_starts_with($permission->name, $resource . '.');
        });
    }

    /**
     * Validate shared entity update
     * V2: Check if user has permissions for all affected entities
     */
    public function validateSharedEntityUpdate(User $user, $sharedEntity, string $entityType): array
    {
        if ($user->isAdministrator()) {
            return ['allowed' => true, 'affected_assets' => []];
        }

        // Get all assets using this shared entity
        $affectedAssets = Asset::where("{$entityType}_id", $sharedEntity->id)->get();
        
        $unauthorizedAssets = [];
        foreach ($affectedAssets as $asset) {
            if (!$this->checkHierarchicalPermission($user, 'assets.update', $asset)) {
                $unauthorizedAssets[] = $asset;
            }
        }

        return [
            'allowed' => empty($unauthorizedAssets),
            'affected_assets' => $affectedAssets,
            'unauthorized_assets' => $unauthorizedAssets
        ];
    }

    /**
     * Get user's permissions organized by hierarchy
     */
    public function getUserPermissionHierarchy(User $user): array
    {
        $hierarchy = [];
        $permissions = $user->permissions;
        
        // Group permissions by entity
        $plantPermissions = [];
        $areaPermissions = [];
        $sectorPermissions = [];
        $assetPermissions = [];
        $otherPermissions = [];
        
        foreach ($permissions as $permission) {
            $parts = explode('.', $permission->name);
            
            // Plant permissions
            if (preg_match('/\.plant\.(\d+)$/', $permission->name, $matches)) {
                $plantId = $matches[1];
                if (!isset($plantPermissions[$plantId])) {
                    $plantPermissions[$plantId] = [];
                }
                $plantPermissions[$plantId][] = $permission->name;
            }
            // Area permissions
            elseif (preg_match('/\.area\.(\d+)$/', $permission->name, $matches)) {
                $areaId = $matches[1];
                if (!isset($areaPermissions[$areaId])) {
                    $areaPermissions[$areaId] = [];
                }
                $areaPermissions[$areaId][] = $permission->name;
            }
            // Sector permissions
            elseif (preg_match('/\.sector\.(\d+)$/', $permission->name, $matches)) {
                $sectorId = $matches[1];
                if (!isset($sectorPermissions[$sectorId])) {
                    $sectorPermissions[$sectorId] = [];
                }
                $sectorPermissions[$sectorId][] = $permission->name;
            }
            // Direct entity permissions
            elseif (preg_match('/^(\w+)\.(\w+)\.(\d+)$/', $permission->name, $matches)) {
                $resource = $matches[1];
                $entityId = $matches[3];
                
                if ($resource === 'assets') {
                    if (!isset($assetPermissions[$entityId])) {
                        $assetPermissions[$entityId] = [];
                    }
                    $assetPermissions[$entityId][] = $permission->name;
                } else {
                    $otherPermissions[] = $permission->name;
                }
            }
            else {
                $otherPermissions[] = $permission->name;
            }
        }
        
        // Build hierarchy
        foreach ($plantPermissions as $plantId => $perms) {
            $plant = Plant::find($plantId);
            if (!$plant) continue;
            
            $plantNode = [
                'id' => $plant->id,
                'name' => $plant->name,
                'type' => 'plant',
                'permissions' => $perms,
                'children' => []
            ];
            
            // Add areas under this plant
            foreach ($plant->areas as $area) {
                $areaPerms = $areaPermissions[$area->id] ?? [];
                if (empty($areaPerms) && empty($sectorPermissions)) continue;
                
                $areaNode = [
                    'id' => $area->id,
                    'name' => $area->name,
                    'type' => 'area',
                    'permissions' => $areaPerms,
                    'children' => []
                ];
                
                // Add sectors under this area
                foreach ($area->sectors as $sector) {
                    $sectorPerms = $sectorPermissions[$sector->id] ?? [];
                    if (!empty($sectorPerms)) {
                        $areaNode['children'][] = [
                            'id' => $sector->id,
                            'name' => $sector->name,
                            'type' => 'sector',
                            'permissions' => $sectorPerms,
                            'children' => []
                        ];
                    }
                }
                
                if (!empty($areaPerms) || !empty($areaNode['children'])) {
                    $plantNode['children'][] = $areaNode;
                }
            }
            
            $hierarchy[] = $plantNode;
        }
        
        // Add standalone areas (not under accessible plants)
        $processedAreas = [];
        foreach ($areaPermissions as $areaId => $perms) {
            $area = Area::find($areaId);
            if (!$area || isset($plantPermissions[$area->plant_id])) continue;
            
            $areaNode = [
                'id' => $area->id,
                'name' => $area->name . ' (' . $area->plant->name . ')',
                'type' => 'area',
                'permissions' => $perms,
                'children' => []
            ];
            
            // Add sectors under this area
            foreach ($area->sectors as $sector) {
                $sectorPerms = $sectorPermissions[$sector->id] ?? [];
                if (!empty($sectorPerms)) {
                    $areaNode['children'][] = [
                        'id' => $sector->id,
                        'name' => $sector->name,
                        'type' => 'sector',
                        'permissions' => $sectorPerms,
                        'children' => []
                    ];
                }
            }
            
            $hierarchy[] = $areaNode;
        }
        
        // Add standalone sectors (not under accessible areas)
        foreach ($sectorPermissions as $sectorId => $perms) {
            $sector = Sector::find($sectorId);
            if (!$sector) continue;
            
            // Check if already added under area
            $alreadyAdded = false;
            foreach ($hierarchy as $node) {
                if ($node['type'] === 'area' || ($node['type'] === 'plant' && !empty($node['children']))) {
                    foreach ($node['children'] as $child) {
                        if ($child['type'] === 'sector' && $child['id'] == $sectorId) {
                            $alreadyAdded = true;
                            break 2;
                        }
                    }
                }
            }
            
            if (!$alreadyAdded) {
                $hierarchy[] = [
                    'id' => $sector->id,
                    'name' => $sector->name . ' (' . $sector->area->name . ' - ' . $sector->area->plant->name . ')',
                    'type' => 'sector',
                    'permissions' => $perms,
                    'children' => []
                ];
            }
        }
        
        // Add other permissions as a separate node if any
        if (!empty($otherPermissions)) {
            $hierarchy[] = [
                'id' => 0,
                'name' => 'Other Permissions',
                'type' => 'other',
                'permissions' => $otherPermissions,
                'children' => []
            ];
        }
        
        return $hierarchy;
    }
}
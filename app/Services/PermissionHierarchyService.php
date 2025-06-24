<?php

namespace App\Services;

use App\Models\User;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;

class PermissionHierarchyService
{
    /**
     * Check if user has permission considering hierarchy
     */
    public function checkHierarchicalPermission(User $user, string $basePermission, $model = null): bool
    {
        // Super admin always has access
        if ($user->is_super_admin) {
            return true;
        }

        // Check global permission first
        if ($user->can($basePermission)) {
            return true;
        }

        // If no model provided, only global permission matters
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

        // For other models, just check specific permission
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
     */
    public function getAccessibleEntities(User $user, string $resource, string $action): array
    {
        $basePermission = "{$resource}.{$action}";
        
        // Super admin or global permission = access to all
        if ($user->is_super_admin || $user->can($basePermission)) {
            return ['all' => true];
        }

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
                        $accessible['assets'][] = (int) $id;
                }
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
            return $query; // No restrictions
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
     */
    public function canCreateInContext(User $user, string $resource, $parentModel = null): bool
    {
        $basePermission = "{$resource}.create";
        
        if ($user->is_super_admin || $user->can($basePermission)) {
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
     */
    public function getAccessiblePlants(User $user, string $action = 'view'): \Illuminate\Database\Eloquent\Collection
    {
        if ($user->is_super_admin || $user->can("plants.{$action}")) {
            return Plant::all();
        }

        $accessible = $this->getAccessibleEntities($user, 'plants', $action);
        
        if (!empty($accessible['plants'])) {
            return Plant::whereIn('id', $accessible['plants'])->get();
        }

        return collect();
    }

    /**
     * Get user's accessible areas for a plant
     */
    public function getAccessibleAreas(User $user, Plant $plant = null, string $action = 'view'): \Illuminate\Database\Eloquent\Collection
    {
        if ($user->is_super_admin || $user->can("areas.{$action}")) {
            return $plant ? $plant->areas : Area::all();
        }

        $accessible = $this->getAccessibleEntities($user, 'areas', $action);
        
        $query = $plant ? $plant->areas() : Area::query();
        
        if (!empty($accessible['areas'])) {
            $query->whereIn('id', $accessible['areas']);
        } elseif (!empty($accessible['plants'])) {
            $query->whereIn('plant_id', $accessible['plants']);
        } else {
            return collect();
        }

        return $query->get();
    }

    /**
     * Get user's accessible sectors for an area
     */
    public function getAccessibleSectors(User $user, Area $area = null, string $action = 'view'): \Illuminate\Database\Eloquent\Collection
    {
        if ($user->is_super_admin || $user->can("sectors.{$action}")) {
            return $area ? $area->sectors : Sector::all();
        }

        $accessible = $this->getAccessibleEntities($user, 'sectors', $action);
        
        $query = $area ? $area->sectors() : Sector::query();
        
        if (!empty($accessible['sectors'])) {
            $query->whereIn('id', $accessible['sectors']);
        } elseif (!empty($accessible['areas'])) {
            $query->whereIn('area_id', $accessible['areas']);
        } elseif (!empty($accessible['plants'])) {
            $query->whereHas('area', function ($q) use ($accessible) {
                $q->whereIn('plant_id', $accessible['plants']);
            });
        } else {
            return collect();
        }

        return $query->get();
    }

    /**
     * Get user's accessible assets
     */
    public function getAccessibleAssets(User $user, $parentModel = null, string $action = 'view'): \Illuminate\Database\Eloquent\Builder
    {
        $query = Asset::query();

        if ($user->is_super_admin || $user->can("assets.{$action}")) {
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
     */
    public function hasAnyAccess(User $user, string $resource): bool
    {
        if ($user->is_super_admin) {
            return true;
        }

        $permissions = $user->getAllEffectivePermissions();
        
        return $permissions->contains(function ($permission) use ($resource) {
            return str_starts_with($permission->name, $resource . '.');
        });
    }
}
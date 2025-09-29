<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $requiresEntity = $this->permissions()
            ->where(function ($q) {
                $q->where('name', 'like', '%.plant.%')
                    ->orWhere('name', 'like', '%.area.%')
                    ->orWhere('name', 'like', '%.sector.%')
                    ->orWhere('name', 'like', '%.asset.%');
            })
            ->exists();

        $globalPermissions = $this->permissions()
            ->where(function ($q) {
                $q->where('name', 'not like', '%.plant.%')
                    ->where('name', 'not like', '%.area.%')
                    ->where('name', 'not like', '%.sector.%')
                    ->where('name', 'not like', '%.asset.%');
            })
            ->count();

        $scopedPermissions = $this->permissions()
            ->where(function ($q) {
                $q->where('name', 'like', '%.plant.%')
                    ->orWhere('name', 'like', '%.area.%')
                    ->orWhere('name', 'like', '%.sector.%')
                    ->orWhere('name', 'like', '%.asset.%');
            })
            ->count();

        // Get unique user count (not assignment count)
        $uniqueUsers = $this->users()->count();

        // Calculate total assignments
        $totalAssignments = 0;
        if ($requiresEntity) {
            foreach ($this->users as $user) {
                $totalAssignments += $user->plants()->count() +
                                   $user->areas()->count() +
                                   $user->sectors()->count() +
                                   $user->assets()->count();
            }
        } else {
            $totalAssignments = $uniqueUsers;
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'display_name' => $this->display_name,
            'description' => $this->description,
            'icon' => $this->icon ?? $this->getDefaultIcon(),
            'is_system' => $this->is_system,
            'is_administrator' => $this->is_administrator,
            'parent_role_id' => $this->parent_role_id,
            'requires_entity' => $requiresEntity,
            'can_be_modified' => $this->canBeModified(),
            'can_be_deleted' => $this->canBeDeleted(),
            'permissions_count' => $this->permissions()->count(),
            'global_permissions_count' => $globalPermissions,
            'scoped_permissions_count' => $scopedPermissions,
            'users_count' => $uniqueUsers,
            'assignments_count' => $totalAssignments,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            // Include additional data when requested
            'permissions' => $this->when(
                $request->has('include') && str_contains($request->include, 'permissions'),
                function () {
                    return $this->permissions->map(function ($permission) {
                        $parsed = $permission->parsePermission();

                        return [
                            'id' => $permission->id,
                            'name' => $permission->name,
                            'display_name' => $permission->display_name,
                            'resource' => $parsed['resource'],
                            'action' => $parsed['action'],
                            'scope' => $parsed['scope'],
                            'is_global' => $permission->isGlobal(),
                            'is_scoped' => $permission->isScoped(),
                        ];
                    });
                }
            ),

            'users' => $this->when(
                $request->has('include') && str_contains($request->include, 'users'),
                function () {
                    return $this->users->map(function ($user) {
                        return [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'avatar' => $user->avatar,
                        ];
                    });
                }
            ),

            'entity_coverage' => $this->when(
                $requiresEntity,
                function () {
                    return $this->getEntityCoverage();
                }
            ),
        ];
    }

    /**
     * Get default icon based on role type.
     */
    private function getDefaultIcon(): string
    {
        if ($this->is_administrator) {
            return '⚡';
        }

        if ($this->is_system) {
            return match ($this->name) {
                'plant-manager' => '🏭',
                'area-manager' => '🏢',
                'sector-manager' => '🏗️',
                'technician' => '🔧',
                'operator' => '⚙️',
                'viewer' => '👁️',
                default => '👤',
            };
        }

        return '📋';
    }

    /**
     * Get entity coverage statistics.
     */
    private function getEntityCoverage(): array
    {
        $coverage = [
            'plants' => ['total' => 0, 'covered' => 0],
            'areas' => ['total' => 0, 'covered' => 0],
            'sectors' => ['total' => 0, 'covered' => 0],
        ];

        // Count unique entities with role assignments
        $plantIds = [];
        $areaIds = [];
        $sectorIds = [];

        foreach ($this->users as $user) {
            $plantIds = array_merge($plantIds, $user->plants->pluck('id')->toArray());
            $areaIds = array_merge($areaIds, $user->areas->pluck('id')->toArray());
            $sectorIds = array_merge($sectorIds, $user->sectors->pluck('id')->toArray());
        }

        $coverage['plants']['covered'] = count(array_unique($plantIds));
        $coverage['areas']['covered'] = count(array_unique($areaIds));
        $coverage['sectors']['covered'] = count(array_unique($sectorIds));

        // Get totals
        $coverage['plants']['total'] = \App\Models\AssetHierarchy\Plant::count();
        $coverage['areas']['total'] = \App\Models\AssetHierarchy\Area::count();
        $coverage['sectors']['total'] = \App\Models\AssetHierarchy\Sector::count();

        return $coverage;
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleUserController extends Controller
{
    protected PermissionService $permissionService;

    public function __construct(PermissionService $permissionService)
    {
        $this->middleware('auth');
        $this->middleware('can:assign,role');
        $this->permissionService = $permissionService;
    }

    /**
     * Get users with this role and their entity assignments.
     */
    public function index(Request $request, Role $role)
    {
        $query = $role->users()->with(['plants', 'areas', 'sectors', 'assets']);

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate(20)->withQueryString();

        // Transform users to include entity assignments
        $users->getCollection()->transform(function ($user) use ($role) {
            $assignments = $this->getUserRoleAssignments($user, $role);

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'assignments' => $assignments,
                'total_assignments' => count($assignments),
                'active_permissions_count' => $this->getActivePermissionsCount($user, $role, $assignments),
            ];
        });

        return response()->json([
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'is_system' => $role->is_system,
                'requires_entity' => $this->roleRequiresEntity($role),
            ],
            'users' => $users,
            'stats' => [
                'total_users' => $role->users()->count(),
                'total_assignments' => $this->getTotalAssignments($role),
                'entity_coverage' => $this->getEntityCoverage($role),
            ],
        ]);
    }

    /**
     * Assign role to users with entity selection.
     */
    public function assign(Request $request, Role $role)
    {
        $validated = $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'entity_type' => 'required_if:requires_entity,true|in:plant,area,sector,asset',
            'entity_id' => 'required_if:requires_entity,true|integer',
        ]);

        $requiresEntity = $this->roleRequiresEntity($role);
        $users = User::whereIn('id', $validated['user_ids'])->get();
        $assigned = [];
        $errors = [];

        DB::transaction(function () use ($users, $role, $requiresEntity, $validated, $request, &$assigned, &$errors) {
            foreach ($users as $user) {
                try {
                    // Check if user already has this role
                    if (! $user->hasRole($role)) {
                        $user->assignRole($role);
                    }

                    // Handle entity assignment if required
                    if ($requiresEntity) {
                        $entity = $this->getEntity($validated['entity_type'], $validated['entity_id']);

                        if (! $entity) {
                            $errors[] = "Entity not found for user {$user->name}";
                            continue;
                        }

                        // Check if user already has this assignment
                        if ($this->userHasEntityAssignment($user, $role, $entity)) {
                            $errors[] = "{$user->name} already has {$role->name} role at {$entity->name}";
                            continue;
                        }

                        // Create entity assignment
                        $this->assignEntityToUser($user, $entity);

                        // Apply entity-scoped permissions
                        $permissions = $this->permissionService->getEntityScopedPermissions($role, $entity);
                        foreach ($permissions as $permission) {
                            $user->givePermissionTo($permission);
                        }

                        $assigned[] = [
                            'user' => $user->name,
                            'entity' => $entity->name,
                            'type' => $validated['entity_type'],
                        ];
                    } else {
                        $assigned[] = [
                            'user' => $user->name,
                            'entity' => null,
                            'type' => 'global',
                        ];
                    }

                    // Log the assignment
                    AuditLogService::logRoleChange(
                        'user_assigned',
                        $role,
                        [],
                        ['user_id' => $user->id, 'entity' => $entity ?? null],
                        [
                            'assigned_by' => $request->user()->name,
                            'user_name' => $user->name,
                            'entity_type' => $validated['entity_type'] ?? null,
                            'entity_id' => $validated['entity_id'] ?? null,
                        ]
                    );
                } catch (\Exception $e) {
                    $errors[] = "Failed to assign role to {$user->name}: {$e->getMessage()}";
                }
            }
        });

        return response()->json([
            'message' => count($assigned) > 0 ? 'Role assigned successfully.' : 'No assignments made.',
            'assigned' => $assigned,
            'errors' => $errors,
        ], count($errors) > 0 ? 207 : 200); // 207 Multi-Status if partial success
    }

    /**
     * Remove role from user (including entity assignments).
     */
    public function remove(Request $request, Role $role, User $user)
    {
        $validated = $request->validate([
            'entity_type' => 'nullable|in:plant,area,sector,asset',
            'entity_id' => 'nullable|integer',
        ]);

        if (! $user->hasRole($role)) {
            return response()->json([
                'message' => 'User does not have this role.',
            ], 404);
        }

        DB::transaction(function () use ($user, $role, $validated, $request) {
            // If entity specified, remove only that assignment
            if (isset($validated['entity_type']) && isset($validated['entity_id'])) {
                $entity = $this->getEntity($validated['entity_type'], $validated['entity_id']);

                if ($entity) {
                    // Remove entity assignment
                    $this->removeEntityFromUser($user, $entity);

                    // Remove entity-scoped permissions
                    $permissions = $this->permissionService->getEntityScopedPermissions($role, $entity);
                    foreach ($permissions as $permission) {
                        $user->revokePermissionTo($permission);
                    }
                }

                // Check if user still has other assignments for this role
                $remainingAssignments = $this->getUserRoleAssignments($user, $role);
                if (empty($remainingAssignments)) {
                    // No more assignments, remove the role
                    $user->removeRole($role);
                }
            } else {
                // Remove role completely (and all entity assignments)
                $user->removeRole($role);

                // Remove all entity assignments for this role
                $assignments = $this->getUserRoleAssignments($user, $role);
                foreach ($assignments as $assignment) {
                    $entity = $this->getEntity($assignment['entity_type'], $assignment['entity_id']);
                    if ($entity) {
                        $this->removeEntityFromUser($user, $entity);

                        // Remove entity-scoped permissions
                        $permissions = $this->permissionService->getEntityScopedPermissions($role, $entity);
                        foreach ($permissions as $permission) {
                            $user->revokePermissionTo($permission);
                        }
                    }
                }
            }

            // Log the removal
            AuditLogService::logRoleChange(
                'user_removed',
                $role,
                ['user_id' => $user->id],
                [],
                [
                    'removed_by' => $request->user()->name,
                    'user_name' => $user->name,
                    'entity_type' => $validated['entity_type'] ?? 'all',
                    'entity_id' => $validated['entity_id'] ?? 'all',
                ]
            );
        });

        return response()->json([
            'message' => 'Role removed from user successfully.',
        ]);
    }

    /**
     * Update user's entity assignments for a role.
     */
    public function updateEntities(Request $request, Role $role, User $user)
    {
        if (! $user->hasRole($role)) {
            return response()->json([
                'message' => 'User does not have this role.',
            ], 404);
        }

        $validated = $request->validate([
            'entities' => 'required|array',
            'entities.*.type' => 'required|in:plant,area,sector,asset',
            'entities.*.id' => 'required|integer',
            'entities.*.action' => 'required|in:add,remove',
        ]);

        $results = [
            'added' => [],
            'removed' => [],
            'errors' => [],
        ];

        DB::transaction(function () use ($user, $role, $validated, $request, &$results) {
            foreach ($validated['entities'] as $entityData) {
                $entity = $this->getEntity($entityData['type'], $entityData['id']);

                if (! $entity) {
                    $results['errors'][] = "Entity not found: {$entityData['type']} #{$entityData['id']}";
                    continue;
                }

                if ($entityData['action'] === 'add') {
                    // Add entity assignment
                    if (! $this->userHasEntityAssignment($user, $role, $entity)) {
                        $this->assignEntityToUser($user, $entity);

                        // Apply entity-scoped permissions
                        $permissions = $this->permissionService->getEntityScopedPermissions($role, $entity);
                        foreach ($permissions as $permission) {
                            $user->givePermissionTo($permission);
                        }

                        $results['added'][] = $entity->name;
                    }
                } else {
                    // Remove entity assignment
                    $this->removeEntityFromUser($user, $entity);

                    // Remove entity-scoped permissions
                    $permissions = $this->permissionService->getEntityScopedPermissions($role, $entity);
                    foreach ($permissions as $permission) {
                        $user->revokePermissionTo($permission);
                    }

                    $results['removed'][] = $entity->name;
                }
            }

            // Log the update
            AuditLogService::logRoleChange(
                'user_entities_updated',
                $role,
                [],
                ['user_id' => $user->id, 'entities' => $validated['entities']],
                [
                    'updated_by' => $request->user()->name,
                    'user_name' => $user->name,
                    'entities_added' => count($results['added']),
                    'entities_removed' => count($results['removed']),
                ]
            );
        });

        return response()->json([
            'message' => 'Entity assignments updated successfully.',
            'results' => $results,
        ]);
    }

    /**
     * Get available users for role assignment.
     */
    public function availableUsers(Request $request, Role $role)
    {
        $query = User::query();

        // Filter users who don't have this role or need additional entity assignments
        if ($request->filled('without_role')) {
            $query->whereDoesntHave('roles', function ($q) use ($role) {
                $q->where('roles.id', $role->id);
            });
        }

        // Apply search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->with('roles')->paginate(20)->withQueryString();

        // Transform to include current role assignments
        $users->getCollection()->transform(function ($user) use ($role) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'has_role' => $user->hasRole($role),
                'current_roles' => $user->roles->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'name' => $r->name,
                        'display_name' => $r->display_name,
                    ];
                }),
                'can_assign' => ! $user->hasRole($role) || $this->roleRequiresEntity($role),
            ];
        });

        return response()->json([
            'users' => $users,
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'requires_entity' => $this->roleRequiresEntity($role),
            ],
        ]);
    }

    /**
     * Get available entities for role assignment.
     */
    public function availableEntities(Request $request, Role $role)
    {
        $validated = $request->validate([
            'type' => 'required|in:plant,area,sector,asset',
            'parent_id' => 'nullable|integer',
        ]);

        $entities = [];

        switch ($validated['type']) {
            case 'plant':
                $query = Plant::query();
                break;
            case 'area':
                $query = Area::query();
                if (isset($validated['parent_id'])) {
                    $query->where('plant_id', $validated['parent_id']);
                }
                break;
            case 'sector':
                $query = Sector::query();
                if (isset($validated['parent_id'])) {
                    $query->where('area_id', $validated['parent_id']);
                }
                break;
            case 'asset':
                $query = Asset::query();
                if (isset($validated['parent_id'])) {
                    $query->where('sector_id', $validated['parent_id']);
                }
                break;
            default:
                return response()->json(['entities' => []]);
        }

        // Only show entities user has access to
        if (! auth()->user()->hasRole(Role::getAdministratorRole())) {
            // Apply entity-based filtering based on user's permissions
            // This would need to be implemented based on your permission structure
        }

        $entities = $query->orderBy('name')->get()->map(function ($entity) use ($role) {
            $stats = $this->getEntityStats($entity);
            $assignments = $this->getRoleAssignmentsForEntity($role, $entity);

            return [
                'id' => $entity->id,
                'name' => $entity->name,
                'type' => class_basename($entity),
                'location' => $entity->location ?? null,
                'stats' => $stats,
                'current_assignments' => $assignments,
                'has_assignments' => count($assignments) > 0,
            ];
        });

        return response()->json([
            'entities' => $entities,
            'type' => $validated['type'],
        ]);
    }

    /**
     * Helper Methods.
     */
    private function roleRequiresEntity(Role $role): bool
    {
        // Check if role has any entity-scoped permissions
        return $role->permissions()
            ->where(function ($q) {
                $q->where('name', 'like', '%.plant.%')
                    ->orWhere('name', 'like', '%.area.%')
                    ->orWhere('name', 'like', '%.sector.%')
                    ->orWhere('name', 'like', '%.asset.%');
            })
            ->exists();
    }

    private function getEntity(string $type, int $id)
    {
        return match ($type) {
            'plant' => Plant::find($id),
            'area' => Area::find($id),
            'sector' => Sector::find($id),
            'asset' => Asset::find($id),
            default => null,
        };
    }

    private function getUserRoleAssignments(User $user, Role $role): array
    {
        $assignments = [];

        // Check plant assignments
        foreach ($user->plants as $plant) {
            $assignments[] = [
                'entity_type' => 'plant',
                'entity_id' => $plant->id,
                'entity_name' => $plant->name,
                'assigned_at' => $plant->pivot->created_at,
            ];
        }

        // Check area assignments
        foreach ($user->areas as $area) {
            $assignments[] = [
                'entity_type' => 'area',
                'entity_id' => $area->id,
                'entity_name' => $area->name,
                'assigned_at' => $area->pivot->created_at,
            ];
        }

        // Check sector assignments
        foreach ($user->sectors as $sector) {
            $assignments[] = [
                'entity_type' => 'sector',
                'entity_id' => $sector->id,
                'entity_name' => $sector->name,
                'assigned_at' => $sector->pivot->created_at,
            ];
        }

        // Check asset assignments
        foreach ($user->assets as $asset) {
            $assignments[] = [
                'entity_type' => 'asset',
                'entity_id' => $asset->id,
                'entity_name' => $asset->name,
                'assigned_at' => $asset->pivot->created_at,
            ];
        }

        return $assignments;
    }

    private function userHasEntityAssignment(User $user, Role $role, $entity): bool
    {
        $relation = $this->getEntityRelation($entity);

        return $user->$relation()->where($entity->getTable() . '.id', $entity->id)->exists();
    }

    private function assignEntityToUser(User $user, $entity): void
    {
        $relation = $this->getEntityRelation($entity);
        if (! $user->$relation()->where($entity->getTable() . '.id', $entity->id)->exists()) {
            $user->$relation()->attach($entity->id);
        }
    }

    private function removeEntityFromUser(User $user, $entity): void
    {
        $relation = $this->getEntityRelation($entity);
        $user->$relation()->detach($entity->id);
    }

    private function getEntityRelation($entity): string
    {
        return match (get_class($entity)) {
            Plant::class => 'plants',
            Area::class => 'areas',
            Sector::class => 'sectors',
            Asset::class => 'assets',
            default => throw new \InvalidArgumentException('Invalid entity type'),
        };
    }

    private function getActivePermissionsCount(User $user, Role $role, array $assignments): int
    {
        $count = 0;

        // Count global permissions from role
        $count += $role->permissions()
            ->where(function ($q) {
                $q->where('name', 'not like', '%.plant.%')
                    ->where('name', 'not like', '%.area.%')
                    ->where('name', 'not like', '%.sector.%')
                    ->where('name', 'not like', '%.asset.%');
            })
            ->count();

        // Count entity-scoped permissions
        foreach ($assignments as $assignment) {
            $entity = $this->getEntity($assignment['entity_type'], $assignment['entity_id']);
            if ($entity) {
                $count += $this->permissionService->getEntityScopedPermissions($role, $entity)->count();
            }
        }

        return $count;
    }

    private function getTotalAssignments(Role $role): int
    {
        $count = 0;

        foreach ($role->users as $user) {
            $assignments = $this->getUserRoleAssignments($user, $role);
            $count += count($assignments);
        }

        return $count;
    }

    private function getEntityCoverage(Role $role): array
    {
        $coverage = [
            'plants' => ['total' => Plant::count(), 'covered' => 0],
            'areas' => ['total' => Area::count(), 'covered' => 0],
            'sectors' => ['total' => Sector::count(), 'covered' => 0],
            'assets' => ['total' => Asset::count(), 'covered' => 0],
        ];

        // Count unique entities with role assignments
        $plantIds = [];
        $areaIds = [];
        $sectorIds = [];
        $assetIds = [];

        foreach ($role->users as $user) {
            $plantIds = array_merge($plantIds, $user->plants->pluck('id')->toArray());
            $areaIds = array_merge($areaIds, $user->areas->pluck('id')->toArray());
            $sectorIds = array_merge($sectorIds, $user->sectors->pluck('id')->toArray());
            $assetIds = array_merge($assetIds, $user->assets->pluck('id')->toArray());
        }

        $coverage['plants']['covered'] = count(array_unique($plantIds));
        $coverage['areas']['covered'] = count(array_unique($areaIds));
        $coverage['sectors']['covered'] = count(array_unique($sectorIds));
        $coverage['assets']['covered'] = count(array_unique($assetIds));

        return $coverage;
    }

    private function getEntityStats($entity): array
    {
        $stats = [];

        if ($entity instanceof Plant) {
            $stats = [
                'areas' => $entity->areas()->count(),
                'sectors' => $entity->sectors()->count(),
                'assets' => $entity->assets()->count(),
            ];
        } elseif ($entity instanceof Area) {
            $stats = [
                'sectors' => $entity->sectors()->count(),
                'assets' => $entity->assets()->count(),
            ];
        } elseif ($entity instanceof Sector) {
            $stats = [
                'assets' => $entity->assets()->count(),
            ];
        }

        return $stats;
    }

    private function getRoleAssignmentsForEntity(Role $role, $entity): array
    {
        $relation = $this->getEntityRelation($entity);

        return User::whereHas('roles', function ($q) use ($role) {
            $q->where('roles.id', $role->id);
        })->whereHas($relation, function ($q) use ($entity) {
            $q->where($entity->getTable() . '.id', $entity->id);
        })->get()->map(function ($user) {
            return [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_email' => $user->email,
            ];
        })->toArray();
    }
}

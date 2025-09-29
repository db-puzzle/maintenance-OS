<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RolePermissionController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('can:update,role');
    }

    /**
     * Get role permissions.
     */
    public function index(Role $role)
    {
        $role->load('permissions');

        // Group permissions by resource and type
        $permissions = $role->permissions->map(function ($permission) {
            $parsed = $permission->parsePermission();

            return [
                'id' => $permission->id,
                'name' => $permission->name,
                'display_name' => $permission->display_name,
                'description' => $permission->description,
                'resource' => $parsed['resource'],
                'action' => $parsed['action'],
                'scope' => $parsed['scope'],
                'scope_id' => $parsed['scope_id'],
                'is_global' => $permission->isGlobal(),
                'is_scoped' => $permission->isScoped(),
                'entity_type' => $permission->entity_type,
            ];
        });

        // Get all available permissions grouped by resource
        $allPermissions = Permission::orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->groupBy(function ($permission) {
                return $permission->parsePermission()['resource'];
            })
            ->map(function ($group) {
                return $group->map(function ($permission) {
                    $parsed = $permission->parsePermission();

                    return [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'display_name' => $permission->display_name,
                        'description' => $permission->description,
                        'resource' => $parsed['resource'],
                        'action' => $parsed['action'],
                        'scope' => $parsed['scope'],
                        'is_global' => $permission->isGlobal(),
                        'is_scoped' => $permission->isScoped(),
                        'is_dynamic' => $permission->is_dynamic,
                    ];
                });
            });

        return response()->json([
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'description' => $role->description,
                'is_system' => $role->is_system,
                'is_administrator' => $role->is_administrator,
                'can_be_modified' => $role->canBeModified(),
            ],
            'permissions' => $permissions->groupBy('resource'),
            'available_permissions' => $allPermissions,
            'stats' => [
                'total_permissions' => $permissions->count(),
                'global_permissions' => $permissions->filter(fn ($p) => $p['is_global'])->count(),
                'scoped_permissions' => $permissions->filter(fn ($p) => $p['is_scoped'])->count(),
            ],
        ]);
    }

    /**
     * Update role permissions.
     */
    public function update(Request $request, Role $role)
    {
        // Prevent modification of administrator role
        if (! $role->canBeModified()) {
            return response()->json([
                'message' => 'This role cannot be modified.',
            ], 403);
        }

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $oldPermissions = $role->permissions->pluck('id')->toArray();
        $newPermissions = $validated['permissions'];

        DB::transaction(function () use ($role, $newPermissions, $oldPermissions, $request) {
            // Sync permissions
            $permissions = Permission::whereIn('id', $newPermissions)->get();
            $role->syncPermissions($permissions);

            // Log the change
            $added = array_diff($newPermissions, $oldPermissions);
            $removed = array_diff($oldPermissions, $newPermissions);

            if (count($added) > 0 || count($removed) > 0) {
                AuditLogService::logRoleChange(
                    'permissions_updated',
                    $role,
                    ['permissions' => $oldPermissions],
                    ['permissions' => $newPermissions],
                    [
                        'updated_by' => $request->user()->name,
                        'permissions_added' => count($added),
                        'permissions_removed' => count($removed),
                        'added_permissions' => Permission::whereIn('id', $added)->pluck('name')->toArray(),
                        'removed_permissions' => Permission::whereIn('id', $removed)->pluck('name')->toArray(),
                    ]
                );
            }
        });

        return response()->json([
            'message' => 'Role permissions updated successfully.',
            'role' => $role->fresh()->load('permissions'),
        ]);
    }

    /**
     * Bulk update permissions (add/remove multiple).
     */
    public function bulkUpdate(Request $request, Role $role)
    {
        // Prevent modification of administrator role
        if (! $role->canBeModified()) {
            return response()->json([
                'message' => 'This role cannot be modified.',
            ], 403);
        }

        $validated = $request->validate([
            'action' => 'required|in:add,remove',
            'permissions' => 'required|array|min:1',
            'permissions.*' => 'exists:permissions,name',
        ]);

        $permissions = Permission::whereIn('name', $validated['permissions'])->get();

        if ($permissions->isEmpty()) {
            return response()->json([
                'message' => 'No valid permissions found.',
            ], 422);
        }

        DB::transaction(function () use ($role, $permissions, $validated, $request) {
            $oldPermissions = $role->permissions->pluck('id')->toArray();

            if ($validated['action'] === 'add') {
                // Add permissions without removing existing ones
                $role->givePermissionTo($permissions);
                $message = 'Permissions added successfully.';
            } else {
                // Remove specified permissions
                $role->revokePermissionTo($permissions);
                $message = 'Permissions removed successfully.';
            }

            // Log the change
            $newPermissions = $role->fresh()->permissions->pluck('id')->toArray();

            AuditLogService::logRoleChange(
                'permissions_bulk_updated',
                $role,
                ['permissions' => $oldPermissions],
                ['permissions' => $newPermissions],
                [
                    'updated_by' => $request->user()->name,
                    'action' => $validated['action'],
                    'affected_permissions' => $permissions->pluck('name')->toArray(),
                    'permissions_count' => $permissions->count(),
                ]
            );
        });

        return response()->json([
            'message' => $validated['action'] === 'add'
                ? 'Permissions added successfully.'
                : 'Permissions removed successfully.',
            'role' => $role->fresh()->load('permissions'),
        ]);
    }
}

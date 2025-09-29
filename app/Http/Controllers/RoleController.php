<?php

namespace App\Http\Controllers;

use App\Http\Resources\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('can:roles.viewAny')->only(['index']);
        $this->middleware('can:roles.view')->only(['show']);
        $this->middleware('can:roles.create')->only(['create', 'store']);
        $this->middleware('can:roles.update')->only(['edit', 'update']);
        $this->middleware('can:roles.delete')->only(['destroy']);
    }

    /**
     * Display roles list.
     */
    public function index(Request $request)
    {
        $query = Role::with(['users'])
            ->withCount(['users', 'permissions']);

        // Apply filters
        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->filled('type')) {
            if ($request->type === 'system') {
                $query->system();
            } elseif ($request->type === 'custom') {
                $query->custom();
            }
        }

        // Apply sorting
        $sortField = $request->get('sort', 'name');
        $sortDirection = $request->get('direction', 'asc');

        // Map frontend sort fields to database columns
        $sortableFields = [
            'name' => 'name',
            'type' => 'is_system',
            'users_count' => 'users_count',
            'permissions_count' => 'permissions_count',
            'assignments_count' => 'assignments_count',
        ];

        if (isset($sortableFields[$sortField])) {
            $query->orderBy($sortableFields[$sortField], $sortDirection);
        } else {
            $query->orderBy('is_system', 'desc')
                ->orderBy('name');
        }

        $perPage = $request->get('per_page', 10);
        $roles = $query->paginate($perPage)
            ->withQueryString();

        return Inertia::render('settings/roles/index', [
            'roles' => RoleResource::collection($roles),
            'filters' => $request->only(['search', 'type', 'sort', 'direction', 'per_page']),
            'can' => [
                'create' => auth()->user()->can('roles.create'),
                'viewAny' => auth()->user()->can('roles.viewAny'),
            ],
        ]);
    }

    /**
     * Show role creation form.
     */
    public function create()
    {
        $permissions = Permission::orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->groupBy('resource');

        return Inertia::render('settings/roles/create', [
            'permissions' => $permissions,
            'roles' => Role::all(['id', 'name', 'display_name']), // For parent role selection
            'can' => [
                'create' => auth()->user()->can('roles.create'),
            ],
        ]);
    }

    /**
     * Store new role.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles|regex:/^[a-z0-9_-]+$/',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'parent_role_id' => 'nullable|exists:roles,id',
            'icon' => 'nullable|string|max:10',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'display_name' => $validated['display_name'] ?? null,
            'description' => $validated['description'] ?? null,
            'parent_role_id' => $validated['parent_role_id'] ?? null,
            'icon' => $validated['icon'] ?? null,
            'is_system' => false,
        ]);

        // Assign permissions if provided
        if (! empty($validated['permissions'])) {
            $permissions = Permission::whereIn('id', $validated['permissions'])->get();
            $role->syncPermissions($permissions);
        }

        AuditLogService::logRoleChange(
            'created',
            $role,
            [],
            $role->toArray(),
            [
                'created_by' => $request->user()->name,
                'permissions_assigned' => count($validated['permissions'] ?? []),
            ]
        );

        return redirect()->route('roles.index')
            ->with('success', 'Role created successfully.');
    }

    /**
     * Show role details.
     */
    public function show(Request $request, Role $role)
    {
        $this->authorize('view', $role);

        $role->load(['permissions', 'users']);

        // Create a new request with include parameter for the resource
        $resourceRequest = request()->duplicate();
        $resourceRequest->query->set('include', 'permissions,users');

        return Inertia::render('settings/roles/show', [
            'role' => (new RoleResource($role))->toArray($resourceRequest),
            'can' => [
                'update' => auth()->user()->can('update', $role),
                'delete' => auth()->user()->can('delete', $role),
                'assign' => auth()->user()->can('assign', $role),
                'duplicate' => auth()->user()->can('duplicate', $role),
            ],
        ]);
    }

    /**
     * Show role edit form.
     */
    public function edit(Role $role)
    {
        $role->load('permissions');

        $allPermissions = Permission::orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->groupBy('resource');

        $rolePermissionIds = $role->permissions->pluck('id')->toArray();

        return Inertia::render('settings/roles/edit', [
            'role' => new RoleResource($role),
            'permissions' => $allPermissions,
            'rolePermissionIds' => $rolePermissionIds,
            'roles' => Role::where('id', '!=', $role->id)->get(['id', 'name', 'display_name']), // For parent role selection
            'can' => [
                'update' => auth()->user()->can('update', $role),
            ],
        ]);
    }

    /**
     * Update role.
     */
    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|regex:/^[a-z0-9_-]+$/|unique:roles,name,' . $role->id,
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'parent_role_id' => 'nullable|exists:roles,id|different:id',
            'icon' => 'nullable|string|max:10',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $oldValues = $role->toArray();
        $oldPermissions = $role->permissions->pluck('id')->toArray();

        $role->update([
            'name' => $validated['name'],
            'display_name' => $validated['display_name'] ?? $role->display_name,
            'description' => $validated['description'] ?? $role->description,
            'parent_role_id' => $validated['parent_role_id'] ?? $role->parent_role_id,
            'icon' => $validated['icon'] ?? $role->icon,
        ]);

        // Update permissions
        $newPermissions = $validated['permissions'] ?? [];
        $permissions = Permission::whereIn('id', $newPermissions)->get();
        $role->syncPermissions($permissions);

        AuditLogService::logRoleChange(
            'updated',
            $role,
            array_merge($oldValues, ['permissions' => $oldPermissions]),
            array_merge($role->fresh()->toArray(), ['permissions' => $newPermissions]),
            [
                'updated_by' => $request->user()->name,
                'permissions_changed' => count(array_diff($oldPermissions, $newPermissions)) + count(array_diff($newPermissions, $oldPermissions)),
            ]
        );

        return redirect()->route('roles.index')
            ->with('success', 'Role updated successfully.');
    }

    /**
     * Delete role.
     */
    public function destroy(Role $role)
    {
        // Prevent deletion of system roles
        if ($role->is_system) {
            return back()->with('error', 'System roles cannot be deleted.');
        }

        // Check if role has users
        if ($role->users()->count() > 0) {
            return back()->with('error', 'Cannot delete role that is assigned to users. Please reassign users first.');
        }

        $oldValues = $role->toArray();
        $role->delete();

        AuditLogService::logRoleChange(
            'deleted',
            $role,
            $oldValues,
            [],
            ['deleted_by' => auth()->user()->name]
        );

        return redirect()->route('roles.index')
            ->with('success', 'Role deleted successfully.');
    }

    /**
     * Get role permissions (API).
     */
    public function permissions(Role $role)
    {
        $permissions = $role->permissions()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'resource' => explode('.', $permission->name)[0] ?? 'unknown',
                    'action' => explode('.', $permission->name)[1] ?? 'unknown',
                ];
            });

        return response()->json([
            'permissions' => $permissions,
        ]);
    }

    /**
     * Assign role to user.
     */
    public function assignUser(Request $request, Role $role)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::findOrFail($validated['user_id']);

        if ($user->hasRole($role)) {
            return back()->with('error', 'User already has this role.');
        }

        $user->assignRole($role);

        AuditLogService::logPermissionChange('attached', $user, $role, [
            'assigned_by' => $request->user()->name,
        ]);

        return back()->with('success', "Role '{$role->name}' assigned to {$user->name}.");
    }

    /**
     * Remove role from user.
     */
    public function removeUser(Request $request, Role $role, User $user)
    {
        if (! $user->hasRole($role)) {
            return back()->with('error', 'User does not have this role.');
        }

        $user->removeRole($role);

        AuditLogService::logPermissionChange('detached', $user, $role, [
            'removed_by' => $request->user()->name,
        ]);

        return back()->with('success', "Role '{$role->name}' removed from {$user->name}.");
    }

    /**
     * Duplicate role.
     */
    public function duplicate(Role $role)
    {
        $newRole = Role::create([
            'name' => $role->name . ' (Copy)',
            'is_system' => false,
        ]);

        // Copy permissions
        $permissions = $role->permissions;
        $newRole->syncPermissions($permissions);

        AuditLogService::logRoleChange(
            'duplicated',
            $newRole,
            [],
            $newRole->toArray(),
            [
                'duplicated_from' => $role->name,
                'duplicated_by' => auth()->user()->name,
                'permissions_copied' => $permissions->count(),
            ]
        );

        return redirect()->route('roles.edit', $newRole)
            ->with('success', "Role duplicated successfully. You can now edit '{$newRole->name}'.");
    }
}

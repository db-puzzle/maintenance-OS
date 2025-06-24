<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\AuditLogService;

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
     * Display roles list
     */
    public function index(Request $request)
    {
        $query = Role::with(['users']);

        // Apply filters
        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->filled('type')) {
            if ($request->type === 'system') {
                $query->system();
            } else {
                $query->custom();
            }
        }

        $roles = $query->orderBy('is_system', 'desc')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        // Add computed attributes
        $roles->getCollection()->transform(function ($role) {
            $role->append(['permissions_count', 'users_count']);
            return $role;
        });

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
            'filters' => $request->only(['search', 'type']),
            'stats' => [
                'total' => Role::count(),
                'system' => Role::system()->count(),
                'custom' => Role::custom()->count(),
            ]
        ]);
    }

    /**
     * Show role creation form
     */
    public function create()
    {
        $permissions = Permission::orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->groupBy('resource');

        return Inertia::render('Roles/Create', [
            'permissions' => $permissions,
        ]);
    }

    /**
     * Store new role
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'is_system' => false,
        ]);

        // Assign permissions if provided
        if (!empty($validated['permissions'])) {
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
                'permissions_assigned' => count($validated['permissions'] ?? [])
            ]
        );

        return redirect()->route('roles.index')
            ->with('success', 'Role created successfully.');
    }

    /**
     * Show role details
     */
    public function show(Role $role)
    {
        $role->load(['permissions', 'users.roles']);
        $role->append(['permissions_count', 'users_count']);

        $permissions = $role->permissions->groupBy('resource');

        return Inertia::render('Roles/Show', [
            'role' => $role,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Show role edit form
     */
    public function edit(Role $role)
    {
        $role->load('permissions');

        $allPermissions = Permission::orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->groupBy('resource');

        $rolePermissionIds = $role->permissions->pluck('id')->toArray();

        return Inertia::render('Roles/Edit', [
            'role' => $role,
            'permissions' => $allPermissions,
            'rolePermissions' => $rolePermissionIds,
        ]);
    }

    /**
     * Update role
     */
    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $oldValues = $role->toArray();
        $oldPermissions = $role->permissions->pluck('id')->toArray();

        $role->update(['name' => $validated['name']]);

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
                'permissions_changed' => count(array_diff($oldPermissions, $newPermissions)) + count(array_diff($newPermissions, $oldPermissions))
            ]
        );

        return redirect()->route('roles.index')
            ->with('success', 'Role updated successfully.');
    }

    /**
     * Delete role
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
     * Get role permissions (API)
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
            'permissions' => $permissions
        ]);
    }

    /**
     * Assign role to user
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
            'assigned_by' => $request->user()->name
        ]);

        return back()->with('success', "Role '{$role->name}' assigned to {$user->name}.");
    }

    /**
     * Remove role from user
     */
    public function removeUser(Request $request, Role $role, User $user)
    {
        if (!$user->hasRole($role)) {
            return back()->with('error', 'User does not have this role.');
        }

        $user->removeRole($role);

        AuditLogService::logPermissionChange('detached', $user, $role, [
            'removed_by' => $request->user()->name
        ]);

        return back()->with('success', "Role '{$role->name}' removed from {$user->name}.");
    }

    /**
     * Duplicate role
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
                'permissions_copied' => $permissions->count()
            ]
        );

        return redirect()->route('roles.edit', $newRole)
            ->with('success', "Role duplicated successfully. You can now edit '{$newRole->name}'.");
    }
}
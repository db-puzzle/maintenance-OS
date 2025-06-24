<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\AuditLogService;

class PermissionController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        // Permission check is handled by the authorize method in each action
    }

    /**
     * Display permissions list
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Debug logging
        \Log::info('Permission check debug:', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'is_super_admin' => $user->is_super_admin,
            'is_super_admin_raw' => $user->getAttributes()['is_super_admin'] ?? 'not set',
            'can_result' => $user->can('users.manage-permissions'),
            'permissions_count' => $user->permissions()->count(),
            'roles_count' => $user->roles()->count(),
            'roles' => $user->roles()->pluck('name')->toArray(),
            'direct_permissions' => $user->permissions()->pluck('name')->toArray(),
        ]);
        
        // Check permission (super admin bypass is handled in User model)
        if (!$user->can('users.manage-permissions')) {
            \Log::error('Permission denied for user', [
                'user_id' => $user->id,
                'permission' => 'users.manage-permissions',
                'is_super_admin' => $user->is_super_admin,
            ]);
            abort(403, 'Unauthorized. You need the users.manage-permissions permission.');
        }
        
        $query = Permission::query();

        // Apply filters
        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%")
                  ->orWhere('display_name', 'like', "%{$request->search}%")
                  ->orWhere('description', 'like', "%{$request->search}%");
        }

        if ($request->filled('resource')) {
            $query->forResource($request->resource);
        }

        if ($request->filled('action')) {
            $parts = explode('.', $request->action);
            if (count($parts) >= 2) {
                $query->forAction($parts[0], $parts[1]);
            }
        }

        if ($request->filled('scope_type')) {
            if ($request->scope_type === 'global') {
                $query->global();
            } else {
                $query->where('name', 'like', "%.{$request->scope_type}.%");
            }
        }

        $permissions = $query->with(['roles', 'users'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(50)
            ->withQueryString();

        // Add computed attributes
        $permissions->getCollection()->transform(function ($permission) {
            $permission->append(['resource', 'action', 'scope_type', 'roles_count', 'users_count']);
            return $permission;
        });

        // Get filter options
        $allPermissions = Permission::all();
        $resources = $allPermissions->map(fn($p) => $p->resource)->filter()->unique()->sort()->values();
        $actions = $allPermissions->map(fn($p) => $p->action)->filter()->unique()->sort()->values();
        $scopeTypes = ['global', 'plant', 'area', 'sector', 'asset', 'owned'];

        // Get roles with counts
        $roles = Role::withCount(['permissions', 'users'])
            ->orderBy('name')
            ->get();

        return Inertia::render('permissions/index', [
            'permissions' => $permissions,
            'roles' => $roles,
            'filters' => $request->only(['search', 'resource', 'action', 'scope_type']),
            'resources' => $resources,
            'actions' => $actions,
            'scopes' => $scopeTypes,
        ]);
    }

    /**
     * Show permission creation form
     */
    public function create()
    {
        $allPermissions = Permission::all();
        $resources = $allPermissions->map(fn($p) => $p->resource)->filter()->unique()->sort()->values();
        $actions = $allPermissions->map(fn($p) => $p->action)->filter()->unique()->sort()->values();
        $scopeTypes = ['global', 'plant', 'area', 'sector', 'asset', 'owned'];

        return Inertia::render('Permissions/Create', [
            'resources' => $resources,
            'actions' => $actions,
            'scopeTypes' => $scopeTypes,
        ]);
    }

    /**
     * Store new permission
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $permission = Permission::create($validated);

        AuditLogService::logPermissionDirectChange(
            'created',
            $permission,
            [],
            $permission->toArray(),
            ['created_by' => $request->user()->name]
        );

        return redirect()->route('permissions.index')
            ->with('success', 'Permission created successfully.');
    }

    /**
     * Show permission details
     */
    public function show(Permission $permission)
    {
        $permission->load(['roles.users', 'users']);
        $permission->append(['resource', 'action', 'scope_type', 'roles_count', 'users_count']);

        return Inertia::render('Permissions/Show', [
            'permission' => $permission,
        ]);
    }

    /**
     * Show permission edit form
     */
    public function edit(Permission $permission)
    {
        $allPermissions = Permission::all();
        $resources = $allPermissions->map(fn($p) => $p->resource)->filter()->unique()->sort()->values();
        $actions = $allPermissions->map(fn($p) => $p->action)->filter()->unique()->sort()->values();
        $scopeTypes = ['global', 'plant', 'area', 'sector', 'asset', 'owned'];

        return Inertia::render('Permissions/Edit', [
            'permission' => $permission,
            'resources' => $resources,
            'actions' => $actions,
            'scopeTypes' => $scopeTypes,
        ]);
    }

    /**
     * Update permission
     */
    public function update(Request $request, Permission $permission)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name,' . $permission->id,
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $oldValues = $permission->toArray();
        $permission->update($validated);

        AuditLogService::logPermissionDirectChange(
            'updated',
            $permission,
            $oldValues,
            $permission->fresh()->toArray(),
            ['updated_by' => $request->user()->name]
        );

        return redirect()->route('permissions.index')
            ->with('success', 'Permission updated successfully.');
    }

    /**
     * Delete permission
     */
    public function destroy(Permission $permission)
    {
        // Check if permission is in use
        if ($permission->roles()->count() > 0 || $permission->users()->count() > 0) {
            return back()->with('error', 'Cannot delete permission that is currently assigned to roles or users.');
        }

        $oldValues = $permission->toArray();
        $permission->delete();

        AuditLogService::logPermissionDirectChange(
            'deleted',
            $permission,
            $oldValues,
            [],
            ['deleted_by' => auth()->user()->name]
        );

        return redirect()->route('permissions.index')
            ->with('success', 'Permission deleted successfully.');
    }

    /**
     * Sync permission matrix (bulk assignment)
     */
    public function syncMatrix(Request $request)
    {
        $validated = $request->validate([
            'changes' => 'required|array',
            'changes.*.role_id' => 'required|exists:roles,id',
            'changes.*.permissions' => 'required|array',
            'changes.*.permissions.*' => 'exists:permissions,id',
        ]);

        foreach ($validated['changes'] as $change) {
            $role = Role::findOrFail($change['role_id']);
            $permissionIds = $change['permissions'];
            
            // Get old permissions for audit
            $oldPermissions = $role->permissions->pluck('id')->toArray();
            
            // Sync permissions
            $role->syncPermissions($permissionIds);
            
            // Log the change
            AuditLogService::logRoleChange(
                'permissions_synced',
                $role,
                ['permissions' => $oldPermissions],
                ['permissions' => $permissionIds],
                ['synced_by' => $request->user()->name]
            );
        }

        return back()->with('success', 'Permission matrix updated successfully.');
    }

    /**
     * Check permission API endpoint
     */
    public function check(Request $request)
    {
        $validated = $request->validate([
            'permission' => 'required|string',
            'resource_id' => 'sometimes|integer',
            'resource_type' => 'sometimes|string'
        ]);

        $user = $request->user();
        $allowed = false;

        if (isset($validated['resource_id']) && isset($validated['resource_type'])) {
            $model = app($validated['resource_type'])->find($validated['resource_id']);
            $allowed = $user->can($validated['permission'], $model);
        } else {
            $allowed = $user->can($validated['permission']);
        }

        return response()->json([
            'allowed' => $allowed,
            'permission' => $validated['permission'],
            'user_id' => $user->id,
            'is_super_admin' => $user->is_super_admin
        ]);
    }

    /**
     * Bulk permission check API endpoint
     */
    public function checkBulk(Request $request)
    {
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string',
        ]);

        $user = $request->user();
        $results = [];

        foreach ($validated['permissions'] as $permission) {
            $results[$permission] = $user->can($permission);
        }

        return response()->json([
            'results' => $results,
            'user_id' => $user->id,
            'is_super_admin' => $user->is_super_admin
        ]);
    }
}
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
        $this->middleware('can:users.manage-permissions');
    }

    /**
     * Display permissions list
     */
    public function index(Request $request)
    {
        // Get all permissions for the permission matrix
        $permissions = Permission::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        // Collect all entity IDs by type to avoid N+1 queries
        $entityIds = [
            'plant' => [],
            'area' => [],
            'sector' => [],
            'asset' => [],
        ];
        
        foreach ($permissions as $permission) {
            $parsed = $permission->parsePermission();
            $parts = explode('.', $permission->name);
            
            // Handle scoped permissions (e.g., areas.create.plant.1)
            if ($parsed['scope'] && $parsed['scope_id'] && isset($entityIds[$parsed['scope']])) {
                $entityIds[$parsed['scope']][] = $parsed['scope_id'];
            }
            
            // Handle direct entity permissions (e.g., areas.view.1)
            if (count($parts) === 3 && is_numeric($parts[2])) {
                $resource = $parsed['resource'];
                $entityType = match($resource) {
                    'plants' => 'plant',
                    'areas' => 'area',
                    'sectors' => 'sector',
                    'assets' => 'asset',
                    default => null
                };
                
                if ($entityType && isset($entityIds[$entityType])) {
                    $entityIds[$entityType][] = $parts[2];
                }
            }
        }
        
        // Preload all entities
        $entities = [
            'plant' => \App\Models\AssetHierarchy\Plant::whereIn('id', array_unique($entityIds['plant']))->pluck('name', 'id'),
            'area' => \App\Models\AssetHierarchy\Area::whereIn('id', array_unique($entityIds['area']))->pluck('name', 'id'),
            'sector' => \App\Models\AssetHierarchy\Sector::whereIn('id', array_unique($entityIds['sector']))->pluck('name', 'id'),
            'asset' => \App\Models\AssetHierarchy\Asset::whereIn('id', array_unique($entityIds['asset']))->pluck('tag', 'id'),
        ];
        
        // Add computed attributes
        $permissions->transform(function ($permission) use ($entities) {
            $permission->append(['resource', 'action', 'scope_type']);
            
            // Add scope entity name if it's a scoped permission
            $parsed = $permission->parsePermission();
            $parts = explode('.', $permission->name);
            
            // Check if this is a direct entity permission (resource.action.entityId)
            if (count($parts) === 3 && is_numeric($parts[2])) {
                // This is a direct entity permission like areas.view.1
                $entityId = $parts[2];
                $resource = $parsed['resource'];
                
                // Determine entity type from resource name
                $entityType = match($resource) {
                    'plants' => 'plant',
                    'areas' => 'area',
                    'sectors' => 'sector',
                    'assets' => 'asset',
                    default => null
                };
                
                if ($entityType && isset($entities[$entityType][$entityId])) {
                    $permission->scope_entity_name = $entities[$entityType][$entityId];
                    // Override the scope_type to show the entity type
                    $permission->scope_type = $entityType;
                    // Also set scope for frontend consistency
                    $permission->scope = $entityType;
                }
            } elseif ($parsed['scope'] && $parsed['scope_id']) {
                // This is a scoped permission like areas.create.plant.1
                $entityName = null;
                
                switch ($parsed['scope']) {
                    case 'plant':
                        $entityName = $entities['plant'][$parsed['scope_id']] ?? "Plant #{$parsed['scope_id']}";
                        break;
                    case 'area':
                        $entityName = $entities['area'][$parsed['scope_id']] ?? "Area #{$parsed['scope_id']}";
                        break;
                    case 'sector':
                        $entityName = $entities['sector'][$parsed['scope_id']] ?? "Sector #{$parsed['scope_id']}";
                        break;
                    case 'asset':
                        $entityName = $entities['asset'][$parsed['scope_id']] ?? "Asset #{$parsed['scope_id']}";
                        break;
                }
                
                $permission->scope_entity_name = $entityName;
            }
            
            return $permission;
        });

        // Get roles with counts and permissions
        $roles = Role::withCount(['permissions', 'users'])
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(function ($role) {
                // Transform the role to include permissions as an array of IDs
                $permissionIds = $role->permissions->pluck('id')->toArray();
                
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'is_system' => $role->is_system,
                    'permissions_count' => $role->permissions_count,
                    'users_count' => $role->users_count,
                    'permissions' => $permissionIds
                ];
            });

        return Inertia::render('permissions/index', [
            'permissions' => [
                'data' => $permissions,
                // These are kept for backward compatibility with the permission matrix component
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $permissions->count(),
                'total' => $permissions->count(),
                'from' => $permissions->count() > 0 ? 1 : null,
                'to' => $permissions->count() > 0 ? $permissions->count() : null,
            ],
            'roles' => $roles,
            // Empty arrays for backward compatibility
            'filters' => [],
            'resources' => [],
            'actions' => [],
            'scopes' => [],
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
            'is_administrator' => $user->isAdministrator()
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
            'is_administrator' => $user->isAdministrator()
        ]);
    }
}
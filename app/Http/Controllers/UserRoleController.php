<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Services\UserManagementService;
use App\Services\AuditLogService;
use App\Services\AdministratorProtectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserRoleController extends Controller
{
    protected UserManagementService $userManagementService;
    protected AuditLogService $auditLogService;
    protected AdministratorProtectionService $adminProtectionService;

    public function __construct(
        UserManagementService $userManagementService,
        AuditLogService $auditLogService,
        AdministratorProtectionService $adminProtectionService
    ) {
        $this->middleware('auth');
        $this->userManagementService = $userManagementService;
        $this->auditLogService = $auditLogService;
        $this->adminProtectionService = $adminProtectionService;
    }

    /**
     * Apply role permissions to a specific entity
     */
    public function applyRoleToEntity(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to manage this user\'s roles.');
        }
        
        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
            'entity_type' => 'required|string|in:Plant,Area,Sector',
            'entity_id' => 'required|integer',
            'assign_role' => 'boolean',
        ]);
        
        $role = Role::findOrFail($validated['role_id']);
        
        // Validate that current user can assign this role
        if (!$this->userManagementService->canAssignRole($currentUser, $role)) {
            abort(403, 'You do not have permission to assign this role.');
        }
        
        // Get the entity
        $entityClass = "App\\Models\\AssetHierarchy\\{$validated['entity_type']}";
        $entity = $entityClass::findOrFail($validated['entity_id']);
        
        // Validate entity access
        if (!$this->userManagementService->hasEntityAccess($currentUser, $entity)) {
            abort(403, 'You do not have permission to manage users for this entity.');
        }
        
        DB::beginTransaction();
        try {
            // Assign the role if requested
            if ($validated['assign_role'] ?? true) {
                $user->assignRole($role);
                
                $this->auditLogService->logSimple('role.assigned', [
                    'user_id' => $currentUser->id,
                    'affected_user_id' => $user->id,
                    'role' => $role->name,
                    'entity_type' => $validated['entity_type'],
                    'entity_id' => $validated['entity_id'],
                ]);
            }
            
            // Apply role permissions to entity
            $this->userManagementService->applyRolePermissionsToEntity($user, $role, $entity);
            
            DB::commit();
            
            return back()->with('success', "Role '{$role->name}' permissions applied to {$validated['entity_type']} successfully.");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to apply role: ' . $e->getMessage());
        }
    }

    /**
     * Preview permissions that would be granted
     */
    public function previewPermissions(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            return response()->json(['permissions' => []]);
        }
        
        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
            'entity_type' => 'required|string|in:Plant,Area,Sector',
            'entity_id' => 'required|integer',
        ]);
        
        $role = Role::findOrFail($validated['role_id']);
        
        // Get the entity
        $entityClass = "App\\Models\\AssetHierarchy\\{$validated['entity_type']}";
        $entity = $entityClass::findOrFail($validated['entity_id']);
        
        // Get permissions that would be granted
        $permissions = $this->userManagementService->previewRolePermissions($role, $entity);
        
        // Check which ones user already has
        $existingPermissions = $user->permissions->pluck('name')->toArray();
        
        $preview = [
            'role' => $role->name,
            'entity' => [
                'type' => $validated['entity_type'],
                'id' => $entity->id,
                'name' => $entity->name,
            ],
            'permissions' => collect($permissions)->map(function ($permission) use ($existingPermissions) {
                return [
                    'name' => $permission,
                    'exists' => in_array($permission, $existingPermissions),
                ];
            }),
            'summary' => [
                'total' => count($permissions),
                'new' => collect($permissions)->diff($existingPermissions)->count(),
                'existing' => collect($permissions)->intersect($existingPermissions)->count(),
            ],
        ];
        
        return response()->json($preview);
    }

    /**
     * Remove role from user
     */
    public function removeRole(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to manage this user\'s roles.');
        }
        
        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
        ]);
        
        $role = Role::findOrFail($validated['role_id']);
        
        // Check if removing Administrator role would leave system without administrators
        if ($role->name === 'Administrator') {
            $protectionCheck = $this->adminProtectionService->canPerformOperation($user, 'removeRole');
            if (!$protectionCheck['allowed']) {
                return back()->with('error', $protectionCheck['message']);
            }
        }
        
        DB::beginTransaction();
        try {
            $user->removeRole($role);
            
            $this->auditLogService->logSimple('role.removed', [
                'user_id' => $currentUser->id,
                'affected_user_id' => $user->id,
                'role' => $role->name,
            ]);
            
            DB::commit();
            
            return back()->with('success', "Role '{$role->name}' removed successfully.");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to remove role: ' . $e->getMessage());
        }
    }
} 
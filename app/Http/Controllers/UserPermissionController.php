<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Permission;
use App\Services\UserManagementService;
use App\Services\PermissionValidationService;
use App\Services\PermissionHierarchyService;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class UserPermissionController extends Controller
{
    protected UserManagementService $userManagementService;
    protected PermissionValidationService $permissionValidationService;
    protected PermissionHierarchyService $permissionHierarchyService;
    protected AuditLogService $auditLogService;

    public function __construct(
        UserManagementService $userManagementService,
        PermissionValidationService $permissionValidationService,
        PermissionHierarchyService $permissionHierarchyService,
        AuditLogService $auditLogService
    ) {
        $this->middleware('auth');
        $this->userManagementService = $userManagementService;
        $this->permissionValidationService = $permissionValidationService;
        $this->permissionHierarchyService = $permissionHierarchyService;
        $this->auditLogService = $auditLogService;
    }

    /**
     * Display user's permission matrix
     */
    public function index(User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to view this user\'s permissions.');
        }
        
        // Get hierarchical permission view
        $permissionHierarchy = $this->permissionHierarchyService->getUserPermissionHierarchy($user);
        
        // Get available permissions for granting
        $grantablePermissions = $this->userManagementService->getGrantablePermissions($currentUser);
        
        // Get permission history
        $permissionHistory = \App\Models\PermissionAuditLog::where('affected_user_id', $user->id)
            ->whereIn('event_action', ['permission.granted', 'permission.revoked', 'role.assigned', 'role.removed'])
            ->with('user')
            ->latest()
            ->take(50)
            ->get();
        
        // Get users for copy functionality
        $users = $this->userManagementService->getAccessibleUsers($currentUser)
            ->with(['permissions'])
            ->get(['id', 'name', 'email']);
        
        return Inertia::render('users/permissions', [
            'user' => $user->load(['roles', 'permissions']),
            'permissionHierarchy' => $permissionHierarchy,
            'grantablePermissions' => $grantablePermissions,
            'permissionHistory' => $permissionHistory,
            'roles' => \App\Models\Role::all(),
            'users' => $users,
            'canGrantPermissions' => $currentUser->can('permissions.grant') || $currentUser->can('users.invite.plant.*') || $currentUser->can('users.invite.area.*') || $currentUser->can('users.invite.sector.*'),
        ]);
    }

    /**
     * Grant permissions to user (scope-aware)
     */
    public function grant(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to grant permissions to this user.');
        }
        
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'required|string|exists:permissions,name',
        ]);
        
        // Validate permissions
        $validation = $this->permissionValidationService->validateGrant(
            $currentUser,
            $user,
            $validated['permissions']
        );
        
        if (!empty($validation['errors'])) {
            return back()->with('error', 'Some permissions could not be granted: ' . implode(', ', $validation['errors']));
        }
        
        DB::beginTransaction();
        try {
            foreach ($validation['valid'] as $permissionName) {
                $user->givePermissionTo($permissionName);
                
                // Log the grant
                $this->auditLogService->logSimple('permission.granted', [
                    'user_id' => $currentUser->id,
                    'affected_user_id' => $user->id,
                    'permission' => $permissionName,
                ]);
            }
            
            DB::commit();
            
            return back()->with('success', count($validation['valid']) . ' permissions granted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to grant permissions: ' . $e->getMessage());
        }
    }

    /**
     * Revoke permissions from user (scope-aware)
     */
    public function revoke(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to revoke permissions from this user.');
        }
        
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'required|string',
        ]);
        
        // Validate permissions
        $validation = $this->permissionValidationService->validateRevoke(
            $currentUser,
            $user,
            $validated['permissions']
        );
        
        if (!empty($validation['errors'])) {
            return back()->with('error', 'Some permissions could not be revoked: ' . implode(', ', $validation['errors']));
        }
        
        DB::beginTransaction();
        try {
            foreach ($validation['valid'] as $permissionName) {
                $user->revokePermissionTo($permissionName);
                
                // Log the revoke
                $this->auditLogService->logSimple('permission.revoked', [
                    'user_id' => $currentUser->id,
                    'affected_user_id' => $user->id,
                    'permission' => $permissionName,
                ]);
            }
            
            DB::commit();
            
            return back()->with('success', count($validation['valid']) . ' permissions revoked successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to revoke permissions: ' . $e->getMessage());
        }
    }

    /**
     * Bulk permission operations
     */
    public function bulkUpdate(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to manage this user\'s permissions.');
        }
        
        $validated = $request->validate([
            'grant' => 'array',
            'grant.*' => 'string|exists:permissions,name',
            'revoke' => 'array',
            'revoke.*' => 'string',
        ]);
        
        DB::beginTransaction();
        try {
            $granted = 0;
            $revoked = 0;
            
            // Process grants
            if (!empty($validated['grant'])) {
                $grantValidation = $this->permissionValidationService->validateGrant(
                    $currentUser,
                    $user,
                    $validated['grant']
                );
                
                foreach ($grantValidation['valid'] as $permissionName) {
                    $user->givePermissionTo($permissionName);
                    $granted++;
                    
                    $this->auditLogService->logSimple('permission.granted', [
                        'user_id' => $currentUser->id,
                        'affected_user_id' => $user->id,
                        'permission' => $permissionName,
                    ]);
                }
            }
            
            // Process revokes
            if (!empty($validated['revoke'])) {
                $revokeValidation = $this->permissionValidationService->validateRevoke(
                    $currentUser,
                    $user,
                    $validated['revoke']
                );
                
                foreach ($revokeValidation['valid'] as $permissionName) {
                    $user->revokePermissionTo($permissionName);
                    $revoked++;
                    
                    $this->auditLogService->logSimple('permission.revoked', [
                        'user_id' => $currentUser->id,
                        'affected_user_id' => $user->id,
                        'permission' => $permissionName,
                    ]);
                }
            }
            
            DB::commit();
            
            return back()->with('success', "Bulk update completed: {$granted} granted, {$revoked} revoked.");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to update permissions: ' . $e->getMessage());
        }
    }

    /**
     * Get available permissions for granting
     */
    public function available(User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            return response()->json(['permissions' => []]);
        }
        
        $grantablePermissions = $this->userManagementService->getGrantablePermissions($currentUser);
        $userPermissions = $user->permissions->pluck('name');
        
        // Filter out already granted permissions
        $availablePermissions = $grantablePermissions->reject(function ($permission) use ($userPermissions) {
            return $userPermissions->contains($permission->name);
        });
        
        return response()->json([
            'permissions' => $availablePermissions->values(),
        ]);
    }

    /**
     * Get permission history for user
     */
    public function history(User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to view this user\'s permission history.');
        }
        
        $history = \App\Models\PermissionAuditLog::where('affected_user_id', $user->id)
            ->whereIn('event_action', ['permission.granted', 'permission.revoked', 'role.assigned', 'role.removed'])
            ->with('user')
            ->latest()
            ->paginate(20);
        
        return response()->json([
            'history' => $history,
        ]);
    }

    /**
     * Copy permissions from one user to another
     */
    public function copy(Request $request, User $targetUser)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $targetUser)) {
            abort(403, 'You do not have permission to manage this user\'s permissions.');
        }
        
        $validated = $request->validate([
            'source_user_id' => 'required|exists:users,id',
            'merge' => 'boolean',
        ]);
        
        $sourceUser = User::findOrFail($validated['source_user_id']);
        
        // Validate source user access
        if (!$this->userManagementService->canManageUser($currentUser, $sourceUser)) {
            abort(403, 'You do not have permission to copy from this user.');
        }
        
        DB::beginTransaction();
        try {
            $sourcePermissions = $sourceUser->permissions->pluck('name')->toArray();
            
            // Validate all permissions
            $validation = $this->permissionValidationService->validateGrant(
                $currentUser,
                $targetUser,
                $sourcePermissions
            );
            
            if (!empty($validation['errors'])) {
                DB::rollBack();
                return back()->with('error', 'Some permissions could not be copied: ' . implode(', ', $validation['errors']));
            }
            
            // Clear existing permissions if not merging
            if (!($validated['merge'] ?? false)) {
                $targetUser->syncPermissions([]);
            }
            
            // Copy permissions
            foreach ($validation['valid'] as $permissionName) {
                $targetUser->givePermissionTo($permissionName);
            }
            
            // Log the operation
            $this->auditLogService->logSimple('permissions.copied', [
                'user_id' => $currentUser->id,
                'source_user_id' => $sourceUser->id,
                'affected_user_id' => $targetUser->id,
                'permissions_count' => count($validation['valid']),
                'merge_mode' => $validated['merge'] ?? false,
            ]);
            
            DB::commit();
            
            return back()->with('success', 'Permissions copied successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to copy permissions: ' . $e->getMessage());
        }
    }
} 
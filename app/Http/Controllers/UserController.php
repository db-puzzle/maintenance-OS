<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\Skill;
use App\Models\Certification;
use App\Services\UserManagementService;
use App\Services\PermissionHierarchyService;
use App\Services\AdministratorProtectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    protected UserManagementService $userManagementService;
    protected PermissionHierarchyService $permissionHierarchyService;
    protected AdministratorProtectionService $adminProtectionService;

    public function __construct(
        UserManagementService $userManagementService,
        PermissionHierarchyService $permissionHierarchyService,
        AdministratorProtectionService $adminProtectionService
    ) {
        $this->middleware('auth');
        $this->middleware('can:users.viewAny')->only(['index']);
        $this->middleware('can:users.view')->only(['show']);
        $this->middleware('can:users.create')->only(['create', 'store']);
        $this->middleware('can:users.update')->only(['edit', 'update']);
        $this->middleware('can:users.delete')->only(['destroy']);
        
        $this->userManagementService = $userManagementService;
        $this->permissionHierarchyService = $permissionHierarchyService;
        $this->adminProtectionService = $adminProtectionService;
    }

    /**
     * Display users list with scope filtering
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Start with a base query instead of getting pre-filtered users
        $query = User::query();
        
        // Apply scope filtering
        if (!$user->isAdministrator()) {
            $accessibleUserIds = $this->userManagementService->getAccessibleUserIds($user);
            if (empty($accessibleUserIds)) {
                // If user has no accessible users, return empty result
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('id', $accessibleUserIds);
            }
        }
        
        // Apply filters
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        if ($request->filled('role')) {
            $query->whereHas('roles', function ($q) use ($request) {
                $q->where('name', $request->input('role'));
            });
        }
        
        if ($request->filled('plant_id') && !$user->isAdministrator()) {
            $plantId = $request->input('plant_id');
            $query->whereHas('permissions', function ($q) use ($plantId) {
                $q->where('name', 'like', "%.plant.{$plantId}");
            });
        }
        
        $users = $query->with(['roles', 'permissions'])
                      ->paginate(15)
                      ->withQueryString();
        
        // Get available filters
        $roles = Role::all();
        $plants = $user->isAdministrator() 
            ? \App\Models\AssetHierarchy\Plant::all()
            : $this->permissionHierarchyService->getAccessiblePlants($user);
        
        // Check if user can create users
        $canCreateUsers = $user->can('users.create') || $user->can('users.invite.plant.*') || $user->can('users.invite.area.*') || $user->can('users.invite.sector.*');
        
        // Get assignable entities and roles if user can create users
        $assignableEntities = null;
        $availableRoles = null;
        if ($canCreateUsers) {
            $assignableEntities = $this->userManagementService->getAssignableEntities($user);
            $availableRoles = $this->userManagementService->getAssignableRoles($user);
        }
        
        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role', 'plant_id']),
            'roles' => $availableRoles ?? $roles, // Use availableRoles if set, otherwise all roles for filtering
            'plants' => $plants,
            'canCreateUsers' => $canCreateUsers,
            'assignableEntities' => $assignableEntities,
            'filterRoles' => $roles, // All roles for filtering
        ]);
    }

    /**
     * Display a single user's details
     */
    public function show(User $user)
    {
        $currentUser = auth()->user();
        
        // Check if current user can view this user
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to view this user.');
        }
        
        // Load user with all relationships
        $user->load(['roles', 'permissions', 'skills', 'certifications']);
        
        // Get permission hierarchy
        $permissionHierarchy = $this->permissionHierarchyService->getUserPermissionHierarchy($user);
        
        // Get activity logs
        $activityLogs = \App\Models\PermissionAuditLog::where('user_id', $user->id)
            ->orWhere('affected_user_id', $user->id)
            ->with('user') // Load the user relationship
            ->latest()
            ->take(20)
            ->get();
        
        // Get all available skills and certifications for selection
        $skills = Skill::orderBy('category')->orderBy('name')->get();
        $certifications = Certification::where('active', true)
            ->orderBy('name')
            ->get();
        
        return Inertia::render('users/show', [
            'user' => $user,
            'permissionHierarchy' => $permissionHierarchy,
            'activityLogs' => $activityLogs,
            'skills' => $skills,
            'certifications' => $certifications,
            'canEditUser' => $currentUser->can('users.update') && $this->userManagementService->canManageUser($currentUser, $user),
            'canManagePermissions' => $this->userManagementService->canManageUser($currentUser, $user),
        ]);
    }

    /**
     * Show form for creating new user
     */
    public function create()
    {
        $user = auth()->user();
        
        // Get available roles based on user's permissions
        $availableRoles = $this->userManagementService->getAssignableRoles($user);
        
        // Get entities user can assign to
        $assignableEntities = $this->userManagementService->getAssignableEntities($user);
        
        return Inertia::render('users/create', [
            'roles' => $availableRoles,
            'assignableEntities' => $assignableEntities,
        ]);
    }

    /**
     * Store newly created user
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role_id' => 'nullable|exists:roles,id',
            'entity_type' => 'nullable|string|in:Plant,Area,Sector',
            'entity_id' => 'nullable|integer',
        ]);
        
        DB::beginTransaction();
        try {
            // Create the user first
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);
            
            // If role is provided, assign it directly first
            if (!empty($validated['role_id'])) {
                $role = Role::findOrFail($validated['role_id']);
                $user->assignRole($role);
            }
            
            // If entity is provided, apply role permissions to entity
            if (!empty($validated['role_id']) && !empty($validated['entity_type']) && !empty($validated['entity_id'])) {
                $role = Role::findOrFail($validated['role_id']);
                $entityClass = "App\\Models\\AssetHierarchy\\{$validated['entity_type']}";
                $entity = $entityClass::findOrFail($validated['entity_id']);
                
                if ($entity) {
                    $this->userManagementService->applyRolePermissionsToEntity($user, $role, $entity);
                }
            }
            
            DB::commit();
            
            return redirect()->route('users.show', $user)
                ->with('success', 'User created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to create user: ' . $e->getMessage());
        }
    }

    /**
     * Show form for editing user
     */
    public function edit(User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to edit this user.');
        }
        
        return Inertia::render('users/edit', [
            'user' => $user->load('roles'),
        ]);
    }

    /**
     * Update user (excluding permissions)
     */
    public function update(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to update this user.');
        }
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
        ]);
        
        $user->update($validated);
        
        return redirect()->route('users.show', $user)
            ->with('success', 'User updated successfully.');
    }

    /**
     * Delete user with validation
     */
    public function destroy(User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to delete this user.');
        }
        
        // Check if this is the last administrator
        $protectionCheck = $this->adminProtectionService->canPerformOperation($user, 'delete');
        if (!$protectionCheck['allowed']) {
            return back()->with('error', $protectionCheck['message']);
        }
        
        // Prevent self-deletion
        if ($user->id === $currentUser->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }
        
        DB::beginTransaction();
        try {
            // Log the deletion
            app(\App\Services\AuditLogService::class)->logSimple('user.deleted', [
                'affected_user_id' => $user->id,
                'deleted_by' => $currentUser->id,
            ]);
            
            // Remove all permissions and roles
            $user->syncPermissions([]);
            $user->syncRoles([]);
            
            // Delete the user
            $user->delete();
            
            DB::commit();
            
            return redirect()->route('users.index')
                ->with('success', 'User deleted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to delete user: ' . $e->getMessage());
        }
    }
    
    /**
     * Display list of soft deleted users
     */
    public function deleted(Request $request)
    {
        $currentUser = auth()->user();
        
        // Only administrators can view deleted users
        if (!$currentUser->isAdministrator()) {
            abort(403, 'Only administrators can view deleted users.');
        }
        
        $query = User::onlyTrashed();
        
        // Apply filters
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $deletedUsers = $query->with(['roles', 'permissions'])
                             ->paginate(15)
                             ->withQueryString();
        
        return Inertia::render('users/deleted', [
            'deletedUsers' => $deletedUsers,
            'filters' => $request->only(['search']),
        ]);
    }
    
    /**
     * Restore a soft deleted user
     */
    public function restore(User $user)
    {
        $currentUser = auth()->user();
        
        // Only administrators can restore users
        if (!$currentUser->isAdministrator()) {
            abort(403, 'Only administrators can restore deleted users.');
        }
        
        DB::beginTransaction();
        try {
            $user->restore();
            
            // Log the restoration
            app(\App\Services\AuditLogService::class)->logSimple('user.restored', [
                'affected_user_id' => $user->id,
                'restored_by' => $currentUser->id,
            ]);
            
            DB::commit();
            
            return redirect()->route('users.show', $user)
                ->with('success', 'User restored successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to restore user: ' . $e->getMessage());
        }
    }
    
    /**
     * Permanently delete a user
     */
    public function forceDelete(User $user)
    {
        $currentUser = auth()->user();
        
        // Only administrators can permanently delete users
        if (!$currentUser->isAdministrator()) {
            abort(403, 'Only administrators can permanently delete users.');
        }
        
        // Check if this is the last administrator
        $protectionCheck = $this->adminProtectionService->canPerformOperation($user, 'forceDelete');
        if (!$protectionCheck['allowed']) {
            return back()->with('error', $protectionCheck['message']);
        }
        
        // Additional confirmation check could be added here
        
        DB::beginTransaction();
        try {
            // Log the permanent deletion before it happens
            app(\App\Services\AuditLogService::class)->logSimple('user.permanently_deleted', [
                'affected_user_id' => $user->id,
                'deleted_by' => $currentUser->id,
                'user_name' => $user->name,
                'user_email' => $user->email,
            ]);
            
            // Permanently delete the user
            $user->forceDelete();
            
            DB::commit();
            
            return redirect()->route('users.deleted')
                ->with('success', 'User permanently deleted.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to permanently delete user: ' . $e->getMessage());
        }
    }

    /**
     * Update user skills
     */
    public function updateSkills(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to update this user.');
        }
        
        $validated = $request->validate([
            'skills' => 'array',
            'skills.*' => 'exists:skills,id',
        ]);
        
        // Sync skills
        $user->skills()->sync($validated['skills'] ?? []);
        
        return redirect()->back()
            ->with('success', 'User skills updated successfully.');
    }

    /**
     * Update user certifications
     */
    public function updateCertifications(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        if (!$this->userManagementService->canManageUser($currentUser, $user)) {
            abort(403, 'You do not have permission to update this user.');
        }
        
        $validated = $request->validate([
            'certifications' => 'array',
            'certifications.*' => 'exists:certifications,id',
        ]);
        
        // Sync certifications
        $user->certifications()->sync($validated['certifications'] ?? []);
        
        return redirect()->back()
            ->with('success', 'User certifications updated successfully.');
    }
} 
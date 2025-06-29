<?php

namespace App\Services;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class UserManagementService
{
    protected PermissionHierarchyService $permissionHierarchyService;
    protected AuditLogService $auditLogService;
    
    public function __construct(
        PermissionHierarchyService $permissionHierarchy,
        AuditLogService $auditLog
    ) {
        $this->permissionHierarchyService = $permissionHierarchy;
        $this->auditLogService = $auditLog;
    }

    /**
     * Get users accessible to the current user
     */
    public function getAccessibleUsers(User $viewer)
    {
        if ($viewer->isAdministrator()) {
            return User::query();
        }

        // For Plant Managers: Get users with permissions in their plants
        return $this->getUsersInScope($viewer);
    }

    /**
     * Get IDs of users accessible to the current user
     */
    public function getAccessibleUserIds(User $viewer): array
    {
        if ($viewer->isAdministrator()) {
            return User::pluck('id')->toArray();
        }

        // For Plant Managers: Get users with permissions in their plants
        $accessiblePlants = $this->permissionHierarchyService->getAccessiblePlants($viewer);
        $plantIds = $accessiblePlants->pluck('id')->toArray();
        
        if (empty($plantIds)) {
            return [];
        }
        
        return User::whereHas('permissions', function ($query) use ($plantIds) {
            $query->where(function ($q) use ($plantIds) {
                foreach ($plantIds as $plantId) {
                    $q->orWhere('name', 'like', "%.plant.{$plantId}");
                }
            });
        })->pluck('id')->toArray();
    }

    /**
     * Get users within viewer's scope
     */
    protected function getUsersInScope(User $viewer)
    {
        $accessiblePlants = $this->permissionHierarchyService->getAccessiblePlants($viewer);
        $plantIds = $accessiblePlants->pluck('id');
        
        return User::whereHas('permissions', function ($query) use ($plantIds) {
            $query->where(function ($q) use ($plantIds) {
                foreach ($plantIds as $plantId) {
                    $q->orWhere('name', 'like', "%.plant.{$plantId}");
                }
            });
        });
    }

    /**
     * Create a new user with role-based permissions
     */
    public function createUserWithRole(array $userData, Role $role, $entity, User $createdBy): User
    {
        // Check if user already exists
        $user = User::where('email', $userData['email'])->first();
        
        if (!$user) {
            // Create the user
            $user = User::create([
                'name' => $userData['name'],
                'email' => $userData['email'],
                'password' => bcrypt($userData['password']),
            ]);
        }

        // Assign the role
        $user->assignRole($role);

        // Apply role permissions scoped to entity
        $this->applyRolePermissionsToEntity($user, $role, $entity);

        // Log the creation
        $this->auditLogService->logSimple('user.created_with_role', [
            'affected_user_id' => $user->id,
            'role' => $role->name,
            'entity_type' => class_basename($entity),
            'entity_id' => $entity->id,
            'created_by' => $createdBy->id
        ]);

        return $user;
    }

    /**
     * Apply role permissions to a specific entity
     */
    public function applyRolePermissionsToEntity(User $user, Role $role, $entity): void
    {
        $entityType = class_basename($entity);
        $entityId = $entity->id;
        
        // Get the base permissions for this role
        $basePermissions = $this->getRolePermissionTemplate($role->name);
        
        // Generate scoped permissions
        $scopedPermissions = [];
        foreach ($basePermissions as $permission) {
            $scopedPermission = $this->generateScopedPermission($permission, $entityType, $entityId);
            if ($scopedPermission) {
                $scopedPermissions[] = $scopedPermission;
            }
        }
        
        // Grant the permissions
        foreach ($scopedPermissions as $permission) {
            if (Permission::where('name', $permission)->exists()) {
                $user->givePermissionTo($permission);
                
                $this->auditLogService->logSimple('permission.granted', [
                    'affected_user_id' => $user->id,
                    'permission' => $permission,
                    'role_context' => $role->name,
                    'entity_type' => $entityType,
                    'entity_id' => $entityId,
                ]);
            }
        }
    }

    /**
     * Generate scoped permission from template
     */
    protected function generateScopedPermission(string $template, string $entityType, int $entityId): ?string
    {
        $entityTypeLower = strtolower($entityType);
        
        // Replace placeholders
        $permission = str_replace('[id]', $entityId, $template);
        $permission = str_replace('[scope]', $entityTypeLower, $permission);
        $permission = str_replace('[resource]', $entityTypeLower . 's', $permission);
        
        return $permission;
    }

    /**
     * Get role permission template
     */
    protected function getRolePermissionTemplate(string $roleName): array
    {
        $templates = [
            'Plant Manager' => [
                'plants.view.[id]',
                'plants.update.[id]',
                'plants.manage-shifts.[id]',
                'users.invite.plant.[id]',
                'areas.create.plant.[id]',
                'areas.viewAny.plant.[id]',
                'sectors.viewAny.plant.[id]',
                'sectors.create.plant.[id]',
                'assets.viewAny.plant.[id]',
                'assets.create.plant.[id]',
                'assets.manage.plant.[id]',
                'assets.execute-routines.plant.[id]',
                'assets.import.plant.[id]',
                'assets.export.plant.[id]',
                'shifts.viewAny.plant.[id]',
                'shifts.create.plant.[id]',
                'shifts.manage.plant.[id]',
                'asset-types.viewAny.plant.[id]',
                'asset-types.create.plant.[id]',
                'manufacturers.viewAny.plant.[id]',
                'manufacturers.create.plant.[id]',
            ],
            'Area Manager' => [
                'users.invite.area.[id]',
                'areas.view.[id]',
                'areas.update.[id]',
                'sectors.create.area.[id]',
                'sectors.viewAny.area.[id]',
                'assets.viewAny.area.[id]',
                'assets.create.area.[id]',
                'assets.manage.area.[id]',
                'assets.execute-routines.area.[id]',
                'assets.export.area.[id]',
            ],
            'Sector Manager' => [
                'users.invite.sector.[id]',
                'sectors.view.[id]',
                'sectors.update.[id]',
                'assets.viewAny.sector.[id]',
                'assets.create.sector.[id]',
                'assets.manage.sector.[id]',
                'assets.execute-routines.sector.[id]',
                'assets.export.sector.[id]',
            ],
            'Maintenance Supervisor' => [
                'assets.viewAny.[scope].[id]',
                'assets.view.[scope].[id]',
                'assets.execute-routines.[scope].[id]',
            ],
            'Technician' => [
                // Asset-level permissions (for individual assets)
                'assets.view.[id]',
                'assets.execute-routines.[id]',
                
                // Scope-based permissions (for plant/area/sector assignment)
                'assets.viewAny.[scope].[id]',
                'assets.view.[scope].[id]',
                'assets.execute-routines.[scope].[id]',
            ],
            'Viewer' => [
                '[resource].view.[id]',
                '[resource].viewAny.[scope].[id]',
            ],
        ];
        
        return $templates[$roleName] ?? [];
    }

    /**
     * Check if user can manage another user
     */
    public function canManageUser(User $manager, User $target): bool
    {
        if ($manager->isAdministrator()) {
            return true;
        }

        // Check if target user has permissions only within manager's scope
        return $this->isUserWithinManagerScope($manager, $target);
    }

    /**
     * Check if target user is within manager's scope
     */
    protected function isUserWithinManagerScope(User $manager, User $target): bool
    {
        // Get manager's plant permissions
        $managerPlants = $this->permissionHierarchyService->getAccessiblePlants($manager);
        $managerPlantIds = $managerPlants->pluck('id')->toArray();
        
        // Get target user's permissions
        $targetPermissions = $target->permissions;
        
        // Check if all target permissions are within manager's plants
        foreach ($targetPermissions as $permission) {
            if (preg_match('/\.plant\.(\d+)/', $permission->name, $matches)) {
                $plantId = (int) $matches[1];
                if (!in_array($plantId, $managerPlantIds)) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Get available permissions for granting
     */
    public function getGrantablePermissions(User $granter): Collection
    {
        if ($granter->isAdministrator()) {
            return Permission::all();
        }

        // Return only permissions within granter's scope
        return $this->getScopedPermissions($granter);
    }

    /**
     * Get permissions within user's scope
     */
    protected function getScopedPermissions(User $user): Collection
    {
        $accessiblePlants = $this->permissionHierarchyService->getAccessiblePlants($user);
        $plantIds = $accessiblePlants->pluck('id')->toArray();
        
        $accessibleAreas = $this->permissionHierarchyService->getAccessibleAreas($user);
        $areaIds = $accessibleAreas->pluck('id')->toArray();
        
        $accessibleSectors = $this->permissionHierarchyService->getAccessibleSectors($user);
        $sectorIds = $accessibleSectors->pluck('id')->toArray();
        
        return Permission::where(function ($query) use ($plantIds, $areaIds, $sectorIds) {
            // Plant-scoped permissions
            foreach ($plantIds as $plantId) {
                $query->orWhere('name', 'like', "%.plant.{$plantId}");
            }
            
            // Area-scoped permissions
            foreach ($areaIds as $areaId) {
                $query->orWhere('name', 'like', "%.area.{$areaId}");
            }
            
            // Sector-scoped permissions
            foreach ($sectorIds as $sectorId) {
                $query->orWhere('name', 'like', "%.sector.{$sectorId}");
            }
        })->get();
    }

    /**
     * Get assignable roles based on user's permissions
     */
    public function getAssignableRoles(User $user): Collection
    {
        if ($user->isAdministrator()) {
            return Role::all();
        }

        // Non-administrators cannot assign Administrator role
        return Role::where('name', '!=', 'Administrator')->get();
    }

    /**
     * Get entities user can assign to
     */
    public function getAssignableEntities(User $user): array
    {
        return [
            'plants' => $this->permissionHierarchyService->getAccessiblePlants($user),
            'areas' => $this->permissionHierarchyService->getAccessibleAreas($user),
            'sectors' => $this->permissionHierarchyService->getAccessibleSectors($user),
        ];
    }

    /**
     * Check if user can assign a specific role
     */
    public function canAssignRole(User $assigner, Role $role): bool
    {
        if ($assigner->isAdministrator()) {
            return true;
        }

        // Non-administrators cannot assign Administrator role
        return $role->name !== 'Administrator';
    }

    /**
     * Check if user has access to entity
     */
    public function hasEntityAccess(User $user, $entity): bool
    {
        $entityType = class_basename($entity);
        $entityId = $entity->id;
        
        if ($user->isAdministrator()) {
            return true;
        }
        
        // Check direct permissions
        $hasDirectAccess = $user->hasAnyPermission([
            strtolower($entityType) . "s.view.{$entityId}",
            strtolower($entityType) . "s.update.{$entityId}",
            "users.invite." . strtolower($entityType) . ".{$entityId}",
        ]);
        
        if ($hasDirectAccess) {
            return true;
        }
        
        // Check parent access for hierarchical entities
        if ($entityType === 'Area' && $entity->plant) {
            return $this->hasEntityAccess($user, $entity->plant);
        }
        
        if ($entityType === 'Sector' && $entity->area) {
            return $this->hasEntityAccess($user, $entity->area);
        }
        
        return false;
    }

    /**
     * Preview permissions that would be granted for a role/entity combination
     */
    public function previewRolePermissions(Role $role, $entity): array
    {
        $entityType = class_basename($entity);
        $entityId = $entity->id;
        
        $basePermissions = $this->getRolePermissionTemplate($role->name);
        $scopedPermissions = [];
        
        foreach ($basePermissions as $permission) {
            $scopedPermission = $this->generateScopedPermission($permission, $entityType, $entityId);
            if ($scopedPermission && Permission::where('name', $scopedPermission)->exists()) {
                $scopedPermissions[] = $scopedPermission;
            }
        }
        
        return $scopedPermissions;
    }
} 
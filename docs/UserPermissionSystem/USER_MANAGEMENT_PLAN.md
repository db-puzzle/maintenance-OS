# User Management and Permission Administration Plan

## Overview

This document outlines a comprehensive plan for implementing user management (CRUD) and permission administration features that allow:
1. **Administrators** - Full system-wide user management and permission control
2. **Plant Managers** - Scoped user management and permission control within their assigned plants

The implementation follows the V2 permission system where all resource permissions are scoped to specific entities (Plant, Area, Sector).

## Key Requirements

### Administrator Requirements
- Full CRUD operations on all users in the system
- Ability to assign/revoke any permission to any user
- Ability to assign/revoke any role to any user
- Ability to manage users across all plants, areas, and sectors
- Access to all audit logs and user activity

### Plant Manager Requirements
- View and manage users within their scoped plant(s)
- Add new users directly or via invitation system, with permissions limited to their plant scope
- Grant/revoke permissions only within their plant hierarchy
- Cannot grant permissions outside their scope
- Cannot assign Administrator role
- View audit logs for users and activities within their plant

## Implementation Architecture

### 1. User Management Controllers

#### UserController (New)
Handles CRUD operations for users with scope-aware filtering:

```php
// app/Http/Controllers/UserController.php
namespace App\Http\Controllers;

class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        // Different middleware for different actions
        $this->middleware('can:users.viewAny')->only(['index']);
        $this->middleware('can:users.view')->only(['show']);
        $this->middleware('can:users.update')->only(['edit', 'update']);
        $this->middleware('can:users.delete')->only(['destroy']);
    }

    /**
     * Display users list with scope filtering
     */
    public function index(Request $request)
    {
        // Administrators see all users
        // Plant Managers see only users with permissions in their plants
        // Implementation will use PermissionHierarchyService
    }

    /**
     * Show user details with permissions grouped by entity
     */
    public function show(User $user)
    {
        // Show user details with permission matrix
        // Group permissions by Plant > Area > Sector
    }

    /**
     * Update user (excluding permissions - handled separately)
     */
    public function update(Request $request, User $user)
    {
        // Update basic user information
        // Permissions handled by UserPermissionController
    }

    /**
     * Delete user with validation
     */
    public function destroy(User $user)
    {
        // Prevent deletion of last administrator
        // Clean up all permissions
    }
}
```

#### UserPermissionController (New)
Handles permission assignment/revocation with scope validation:

```php
// app/Http/Controllers/UserPermissionController.php
namespace App\Http\Controllers;

class UserPermissionController extends Controller
{
    /**
     * Display user's permission matrix
     */
    public function index(User $user)
    {
        // Show hierarchical permission view
        // Plant > Area > Sector > Asset permissions
    }

    /**
     * Grant permissions to user (scope-aware)
     */
    public function grant(Request $request, User $user)
    {
        // Validate that granter has permission to grant
        // Check scope restrictions for Plant Managers
    }

    /**
     * Revoke permissions from user (scope-aware)
     */
    public function revoke(Request $request, User $user)
    {
        // Validate that revoker has permission to revoke
        // Check scope restrictions for Plant Managers
    }

    /**
     * Bulk permission operations
     */
    public function bulkUpdate(Request $request, User $user)
    {
        // Handle bulk grant/revoke operations
        // Maintain scope restrictions
    }
}
```

### 2. Enhanced Services

#### UserManagementService (New)
Core service for user management operations:

```php
// app/Services/UserManagementService.php
namespace App\Services;

class UserManagementService
{
    protected $permissionHierarchyService;
    protected $auditLogService;
    
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
    public function getAccessibleUsers(User $viewer): Collection
    {
        if ($viewer->isAdministrator()) {
            return User::with(['roles', 'permissions'])->get();
        }

        // For Plant Managers: Get users with permissions in their plants
        return $this->getUsersInPlantScope($viewer);
    }

    /**
     * Create a new user with role-based permissions
     */
    public function createUserWithRole(array $userData, Role $role, $entity, User $createdBy): User
    {
        // Create the user
        $user = User::create([
            'name' => $userData['name'],
            'email' => $userData['email'],
            'password' => bcrypt($userData['password']),
        ]);

        // Assign the role
        $user->assignRole($role);

        // Apply role permissions scoped to entity
        $this->applyRolePermissionsToEntity($user, $role, $entity);

        // Log the creation
        $this->auditLogService->log('user.created_with_role', [
            'user_id' => $user->id,
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
            }
        }
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
            ],
            'Area Manager' => [
                'areas.view.[id]',
                'areas.update.[id]',
                'users.invite.area.[id]',
                'sectors.create.area.[id]',
                'sectors.viewAny.area.[id]',
                'assets.viewAny.area.[id]',
                'assets.create.area.[id]',
                'assets.manage.area.[id]',
                'assets.execute-routines.area.[id]',
                'assets.export.area.[id]',
            ],
            'Sector Manager' => [
                'sectors.view.[id]',
                'sectors.update.[id]',
                'users.invite.sector.[id]',
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
}
```

#### PermissionValidationService (New)
Validates permission operations:

```php
// app/Services/PermissionValidationService.php
namespace App\Services;

class PermissionValidationService
{
    /**
     * Validate permission grant request
     */
    public function validateGrant(User $granter, User $target, array $permissions): array
    {
        $errors = [];
        $valid = [];

        foreach ($permissions as $permission) {
            if ($this->canGrantPermission($granter, $permission)) {
                $valid[] = $permission;
            } else {
                $errors[] = "Cannot grant {$permission}: Outside your scope";
            }
        }

        return [
            'valid' => $valid,
            'errors' => $errors
        ];
    }

    /**
     * Check if user can grant specific permission
     */
    private function canGrantPermission(User $granter, string $permission): bool
    {
        if ($granter->isAdministrator()) {
            return true;
        }

        // Parse permission and check against granter's scope
        return $this->isPermissionWithinScope($granter, $permission);
    }
}
```

### 3. Frontend Components

#### User Management Dashboard
Main interface for user management:

```typescript
// resources/js/pages/users/index.tsx
interface UserManagementDashboard {
  // User list with filters
  UserList: {
    - Search by name/email
    - Filter by role
    - Filter by plant/area/sector (for scoped view)
    - Quick actions (edit, permissions, delete)
    - Role badges showing user's assigned roles
  }

  // Permission overview
  PermissionMatrix: {
    - Visual hierarchy (Plant > Area > Sector)
    - Quick grant/revoke toggles
    - Role-based permission suggestions
    - Bulk operations
  }

  // Quick user creation
  QuickUserCreate: {
    - Name and email input
    - Password generation or manual entry
    - Role selection
    - Entity assignment (Plant/Area/Sector)
    - Auto-apply role permissions to selected entity
  }

  // User invitation
  InviteUser: {
    - Email input
    - Role selection as template
    - Entity scope selection (which plant/area/sector)
    - Customize permissions from role template
    - Custom message
  }
}
```

#### User Permission Editor
Dedicated interface for managing user permissions:

```typescript
// resources/js/pages/users/permissions.tsx
interface UserPermissionEditor {
  // Role assignment section
  RoleAssignment: {
    - Current roles displayed
    - Quick role assignment with entity scope
    - "Apply Plant Manager to Plant X" button
    - "Apply Area Manager to Area Y" button
    - Shows what permissions will be granted
  }

  // Hierarchical permission tree
  PermissionTree: {
    - Expandable plant nodes
    - Area sub-nodes  
    - Sector sub-nodes
    - Asset-level permissions
    - Color coding: 
      * Green: Direct permission
      * Blue: Inherited from role
      * Gray: Inherited from parent entity
  }

  // Role templates
  RoleTemplates: {
    - Show available system roles
    - Preview permissions for each role
    - Apply role permissions to specific entity
    - Bulk apply to multiple entities
  }

  // Audit trail
  PermissionHistory: {
    - Recent changes with role context
    - "Assigned Plant Manager role to Plant 123"
    - "Granted additional permission X"
    - Timestamp and who made the change
  }
}
```

#### Role-Based Permission Application
When applying a role to an entity:

```typescript
interface RoleApplicationModal {
  // Selected role and entity
  Header: "Apply [Role Name] to [Entity Name]"
  
  // Permission preview
  PermissionPreview: {
    - List of permissions that will be granted
    - Scoped to the selected entity
    - Checkbox to customize before applying
  }
  
  // Conflict resolution
  ConflictWarning: {
    - Shows if user already has conflicting permissions
    - Option to merge or replace
  }
  
  // Apply button
  Actions: {
    - Cancel
    - Apply Role Permissions
  }
}
```

### 4. Database Schema Updates

The system already has the necessary database structure through Laravel's Spatie Permission package:
- `model_has_permissions` - Tracks direct permission assignments to users
- `model_has_roles` - Tracks role assignments to users  
- `role_has_permissions` - Tracks permissions assigned to roles
- `permissions` - Stores all system permissions
- `roles` - Stores all system roles

**No new tables are needed.** Instead, we'll leverage:

1. **Existing Role System**
   - Administrator (combined Super Admin + Admin)
   - Plant Manager
   - Area Manager
   - Sector Manager
   - Maintenance Supervisor
   - Technician
   - Viewer

2. **Permission Assignment Tracking**
   - Already tracked via `model_has_permissions` with timestamps
   - Audit logging via `AuditLogService` for who granted what and when

3. **Role Templates**
   - Use the existing roles as templates for permission assignment
   - When assigning a user to a plant/area/sector, apply the corresponding role's permissions scoped to that entity

### 5. Routes Structure

```php
// routes/users.php (new file)
Route::middleware(['auth', 'verified'])->group(function () {
    // User management
    Route::resource('users', UserController::class);
    
    // User permissions
    Route::prefix('users/{user}/permissions')->group(function () {
        Route::get('/', [UserPermissionController::class, 'index'])->name('users.permissions.index');
        Route::post('/grant', [UserPermissionController::class, 'grant'])->name('users.permissions.grant');
        Route::post('/revoke', [UserPermissionController::class, 'revoke'])->name('users.permissions.revoke');
        Route::post('/bulk', [UserPermissionController::class, 'bulkUpdate'])->name('users.permissions.bulk');
        Route::get('/available', [UserPermissionController::class, 'available'])->name('users.permissions.available');
        Route::get('/history', [UserPermissionController::class, 'history'])->name('users.permissions.history');
    });
    
    // Role-based permission application
    Route::prefix('users/{user}/roles')->group(function () {
        Route::post('/apply', [UserRoleController::class, 'applyRoleToEntity'])->name('users.roles.apply');
        Route::get('/preview', [UserRoleController::class, 'previewPermissions'])->name('users.roles.preview');
    });
    
    // User activity/audit logs (scoped)
    Route::get('users/{user}/activity', [UserActivityController::class, 'show'])->name('users.activity.show');
});

// Include in routes/web.php
require __DIR__.'/users.php';
```

### 6. Permission Scope Validation

#### For Plant Managers
When a Plant Manager attempts to manage users or permissions:

1. **User Visibility**
   - Can only see users who have at least one permission within their plant(s)
   - Cannot see administrators or users from other plants

2. **Permission Granting**
   - Can only grant permissions within their plant hierarchy
   - Cannot grant system-level permissions
   - Cannot grant Administrator role
   - Cannot grant permissions for other plants

3. **User Invitation**
   - Can invite new users with the `users.invite.plant.[id]` permission
   - Initial permissions limited to their plant scope
   - Invitation includes plant context

#### For Administrators
Full unrestricted access to all user management features:
- See all users system-wide
- Grant/revoke any permission
- Assign/remove any role including Administrator
- Access all audit logs
- Manage permission templates globally

### 7. UI/UX Considerations

#### Visual Hierarchy
- Clear indication of permission scope (color coding)
- Tree view for entity hierarchy
- Visual inheritance indicators
- Permission conflict warnings

#### Bulk Operations
- Select multiple users for bulk permission updates
- Permission templates for common role assignments
- Copy permissions between users
- Export/import permission configurations

#### Search and Filter
- Quick search by user name/email
- Filter by role
- Filter by entity (plant/area/sector)
- Filter by permission type
- Show only users with specific permissions

### 8. Security Measures

1. **Scope Enforcement**
   - Backend validation on every permission operation
   - Frontend restrictions based on user's scope
   - Audit logging of all permission changes

2. **Administrator Protection**
   - Prevent removal of last administrator
   - Require confirmation for administrator role assignment
   - Enhanced audit logging for administrator operations

3. **Permission Validation**
   - Validate permission exists before granting
   - Check entity exists for scoped permissions
   - Prevent circular permission dependencies

### 9. Performance Optimization

1. **Caching Strategy**
   - Cache user's effective permissions
   - Cache permission hierarchy
   - Invalidate on permission changes

2. **Query Optimization**
   - Eager load permissions and roles
   - Use database indexes on permission lookups
   - Batch permission operations

3. **Frontend Optimization**
   - Lazy load permission trees
   - Virtual scrolling for large user lists
   - Debounced search

### 10. Migration Path

1. **Phase 1: Core Implementation**
   - Create UserController and UserPermissionController
   - Implement UserManagementService
   - Basic UI for user list and permission viewing

2. **Phase 2: Enhanced Features**
   - Permission templates
   - Bulk operations
   - Advanced filtering and search

3. **Phase 3: Optimization**
   - Implement caching
   - Performance tuning
   - UI/UX improvements

## Success Metrics

1. **Administrator Efficiency**
   - Time to assign permissions reduced by 50%
   - Bulk operations save 70% time
   - Clear audit trail for compliance

2. **Plant Manager Autonomy**
   - Can manage their plant users without admin intervention
   - Clear scope boundaries prevent errors
   - Simplified permission model within scope

3. **System Security**
   - No scope violations
   - Complete audit trail
   - Protected administrator role

## Simplified Implementation Approach

This plan leverages existing system components rather than creating new infrastructure:

### 1. **Use Existing Database Structure**
- Laravel's Spatie Permission package already tracks:
  - Permission assignments (`model_has_permissions`)
  - Role assignments (`model_has_roles`)
  - Role permissions (`role_has_permissions`)
- No new tables needed - everything is already in place

### 2. **Leverage System Roles as Templates**
Instead of creating a separate template system, use the existing roles:
- **Plant Manager** → Apply all plant-scoped permissions when assigned to a plant
- **Area Manager** → Apply all area-scoped permissions when assigned to an area  
- **Sector Manager** → Apply all sector-scoped permissions when assigned to a sector
- **Maintenance Supervisor** → Apply execution permissions for selected scope
- **Technician** → Apply asset-specific permissions
- **Viewer** → Apply read-only permissions for selected scope

### 3. **Role-Based User Creation Workflow**
When creating/inviting a user:
1. Select the role (e.g., "Plant Manager")
2. Select the entity (e.g., "Springfield Plant")
3. System automatically grants all appropriate permissions for that role+entity combination
4. Optionally customize permissions after initial assignment

### 4. **Audit Trail Integration**
- Use existing `AuditLogService` to track all operations
- Log entries include role context: "Assigned Plant Manager role to Plant 123"
- Complete visibility into who granted what permissions and when

### 5. **UI Simplification**
- Show roles as the primary way to assign permissions
- Permission matrix for fine-tuning after role assignment
- Visual indicators for role-based vs custom permissions

This approach significantly reduces complexity while providing all required functionality.

## Conclusion

This plan provides a comprehensive solution for user management and permission administration that:
- Maintains security through scope enforcement
- Provides flexibility for different management levels
- Ensures scalability and performance
- Delivers excellent user experience

The implementation follows Laravel best practices and integrates seamlessly with the existing V2 permission system, providing a robust foundation for multi-tenant user management.

## Backend Updates for Flexible Technician Scope

### 1. Update UserManagementService.php

The `getRolePermissionTemplate` method should be updated to support flexible scopes for Technicians:

```php
'Technician' => [
    // Asset-level permissions (for individual assets)
    'assets.view.[id]',
    'assets.execute-routines.[id]',
    
    // Scope-based permissions (for plant/area/sector assignment)
    'assets.viewAny.[scope].[id]',
    'assets.view.[scope].[id]',
    'assets.execute-routines.[scope].[id]',
],
```

This change allows the system to generate appropriate permissions based on whether the Technician is assigned to a plant, area, or sector.

### 2. Update RoleSeeder.php

No changes needed to RoleSeeder.php because:
- The seeder only sets up default permissions that are role-agnostic
- Entity-specific permissions are assigned when users are assigned to entities
- The comment in the seeder already states: "Entity-specific permissions will be assigned when users are assigned to specific entities"

### 3. Update the generateScopedPermission method

The existing `generateScopedPermission` method in UserManagementService.php already supports the `[scope]` placeholder, so it will work correctly with the updated Technician template.

### 4. Consider adding a configuration for role flexibility

For better maintainability, consider adding a configuration that defines which roles can work at which levels:

```php
// config/roles.php
return [
    'scope_flexibility' => [
        'Administrator' => ['global'],
        'Plant Manager' => ['plant'],
        'Area Manager' => ['area'],
        'Sector Manager' => ['sector'],
        'Maintenance Supervisor' => ['plant', 'area', 'sector'],
        'Technician' => ['plant', 'area', 'sector', 'asset'],
        'Viewer' => ['plant', 'area', 'sector'],
    ],
];
```

This would make it easier to maintain consistency between the frontend and backend. 
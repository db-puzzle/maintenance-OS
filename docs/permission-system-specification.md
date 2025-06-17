# Permission System Specification

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Permission Model](#permission-model)
4. [Database Architecture](#database-architecture)
5. [Permission Evaluation](#permission-evaluation)
6. [Implementation Examples](#implementation-examples)
7. [Security Considerations](#security-considerations)
8. [API Design](#api-design)

## Overview

This document outlines a comprehensive permission system for a maintenance management system. The system provides granular access control at multiple levels:

- **Action Level**: CRUD operations (Create, Read, Update, Delete)
- **Entity Level**: Different types of resources (Assets, Plants, Work Orders, etc.)
- **Scope Level**: Contextual boundaries (specific plants, departments, ownership)

### Key Requirements
- First user to sign up becomes the Super Administrator
- Super Administrators can grant super administrator privileges to other users
- Permissions can be scoped to specific resources (e.g., create assets in Plant A but not Plant B)
- Role-based access control (RBAC) with ability to create custom roles
- Permission inheritance and hierarchical structure
- Audit trail for permission changes
- Performance-optimized for frequent permission checks

## Core Concepts

### 1. Users
- First user to sign up is automatically assigned "Super Administrator" role
- Can have multiple roles
- Can have direct permissions (override role permissions)
- Super Administrators can promote other users to Super Administrator status

### 2. Roles
- Collection of permissions
- Can be system-defined or custom
- Hierarchical (roles can inherit from other roles)
- Examples: Super Admin, Plant Manager, Technician, Viewer
- Super Administrator role has special privileges and cannot be deleted

### 3. Permissions
- Atomic units of access control
- Composed of: Resource + Action + Scope
- Can be positive (grant) or negative (deny)
- Deny permissions override grant permissions

### 4. Resources
- Entities in the system (Assets, Plants, Work Orders, etc.)
- Can be hierarchical (Plant > Department > Asset)
- Support wildcard permissions (e.g., all assets in a plant)

### 5. Scopes
- Define the context/boundary of a permission
- Types:
  - **Global**: Applies to all instances of a resource
  - **Contextual**: Limited to specific context (plant, department)
  - **Ownership**: Limited to resources created/owned by user
  - **Conditional**: Based on resource attributes

## Permission Model

### Permission Structure
```
permission = {
    resource: string,      // e.g., "asset", "work_order", "plant"
    action: string,        // e.g., "create", "read", "update", "delete", "manage"
    scope: {
        type: string,      // "global", "plant", "department", "owned", "conditional"
        context_id?: number,   // ID of the limiting context (plant_id, dept_id)
        conditions?: object    // Additional conditions for complex rules
    },
    effect: string         // "allow" or "deny"
}
```

### Permission Examples

1. **Global Asset Creation**
   ```json
   {
       "resource": "asset",
       "action": "create",
       "scope": { "type": "global" },
       "effect": "allow"
   }
   ```

2. **Plant-Specific Asset Management**
   ```json
   {
       "resource": "asset",
       "action": "*",
       "scope": { 
           "type": "plant",
           "context_id": 123
       },
       "effect": "allow"
   }
   ```

3. **Own Work Orders Only**
   ```json
   {
       "resource": "work_order",
       "action": "update",
       "scope": { "type": "owned" },
       "effect": "allow"
   }
   ```

4. **Conditional Permission**
   ```json
   {
       "resource": "asset",
       "action": "delete",
       "scope": { 
           "type": "conditional",
           "conditions": {
               "asset_status": ["decommissioned", "disposed"],
               "asset_value": { "max": 10000 }
           }
       },
       "effect": "allow"
   }
   ```

## Database Architecture

### Database Schema
```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    parent_role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    scope_type VARCHAR(50) NOT NULL,
    scope_context_id INTEGER,
    scope_conditions JSONB,
    effect VARCHAR(10) NOT NULL DEFAULT 'allow',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action, scope_type, scope_context_id)
);

-- Role permissions mapping
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- User roles mapping
CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Direct user permissions (overrides)
CREATE TABLE user_permissions (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (user_id, permission_id)
);

-- Permission groups (for easier management)
CREATE TABLE permission_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permission_group_items (
    group_id INTEGER REFERENCES permission_groups(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, permission_id)
);

-- Audit log
CREATE TABLE permission_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'role', 'permission'
    target_id INTEGER,
    changes JSONB,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by INTEGER REFERENCES users(id)
);

-- Super admin grants tracking
CREATE TABLE super_admin_grants (
    id SERIAL PRIMARY KEY,
    granted_to INTEGER REFERENCES users(id),
    granted_by INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    revoked_by INTEGER REFERENCES users(id)
);
```

## Permission Evaluation

### Evaluation Algorithm
```
1. Check if user is Super Administrator:
   a. If yes, grant all permissions
   b. If no, continue to step 2

2. Collect all permissions for user:
   a. Direct user permissions
   b. Permissions from assigned roles
   c. Inherited permissions from parent roles

3. Apply scope filtering:
   a. Check if permission scope matches request context
   b. Evaluate conditional scopes

4. Resolve conflicts:
   a. Deny effects override allow effects
   b. More specific scopes override general scopes
   c. Direct permissions override role permissions

5. Cache results for performance
```

### Permission Check Flow
```
User Request → Authentication → Check Super Admin Status → 
→ Load User Permissions → Evaluate Against Request Context → 
→ Apply Business Rules → Return Allow/Deny → Log Access Attempt
```

### Caching Strategy
- Cache user's effective permissions on login
- Invalidate cache on permission/role changes
- Use Redis for distributed caching in multi-server setup
- Cache timeout: 15 minutes (configurable)
- Super admin status cached separately with immediate invalidation on change

## Implementation Examples

### Laravel Implementation

#### 1. Permission Service
```php
namespace App\Services;

class PermissionService
{
    public function can(User $user, string $action, string $resource, ?array $context = null): bool
    {
        // Check super admin
        if ($user->is_super_admin) {
            return true;
        }

        // Get effective permissions
        $permissions = $this->getEffectivePermissions($user);
        
        // Evaluate permissions
        return $this->evaluatePermissions($permissions, $action, $resource, $context);
    }
    
    public function grantSuperAdmin(User $grantor, User $recipient): bool
    {
        // Only super admins can grant super admin status
        if (!$grantor->is_super_admin) {
            return false;
        }
        
        $recipient->is_super_admin = true;
        $recipient->save();
        
        // Log the grant
        SuperAdminGrant::create([
            'granted_to' => $recipient->id,
            'granted_by' => $grantor->id,
            'granted_at' => now()
        ]);
        
        // Clear permission cache
        $this->clearPermissionCache($recipient);
        
        return true;
    }
    
    public function revokeSuperAdmin(User $revoker, User $user): bool
    {
        // Only super admins can revoke super admin status
        if (!$revoker->is_super_admin) {
            return false;
        }
        
        // Prevent revoking own super admin status if last super admin
        if ($revoker->id === $user->id && User::where('is_super_admin', true)->count() === 1) {
            throw new \Exception('Cannot revoke super admin status from the last super admin');
        }
        
        $user->is_super_admin = false;
        $user->save();
        
        // Update grant record
        SuperAdminGrant::where('granted_to', $user->id)
            ->whereNull('revoked_at')
            ->update([
                'revoked_at' => now(),
                'revoked_by' => $revoker->id
            ]);
        
        // Clear permission cache
        $this->clearPermissionCache($user);
        
        return true;
    }
    
    public function getPermissionsForResource(User $user, string $resource, ?int $contextId = null): array
    {
        // Return array of allowed actions for the resource
    }
    
    private function getEffectivePermissions(User $user): Collection
    {
        return Cache::remember("user_permissions_{$user->id}", 900, function () use ($user) {
            // Collect from direct permissions and roles
            return $this->collectAllPermissions($user);
        });
    }
}
```

#### 2. First User Registration Handler
```php
namespace App\Services;

class UserRegistrationService
{
    public function registerUser(array $data): User
    {
        $user = User::create($data);
        
        // Check if this is the first user
        if (User::count() === 1) {
            $user->is_super_admin = true;
            $user->save();
            
            // Log the automatic super admin assignment
            PermissionAuditLog::create([
                'user_id' => $user->id,
                'action' => 'auto_assign_super_admin',
                'target_type' => 'user',
                'target_id' => $user->id,
                'changes' => ['reason' => 'first_user_registration'],
                'performed_at' => now(),
                'performed_by' => $user->id
            ]);
        }
        
        return $user;
    }
}
```

#### 3. Middleware
```php
namespace App\Http\Middleware;

class CheckPermission
{
    public function handle($request, Closure $next, $resource, $action)
    {
        $context = $this->extractContext($request);
        
        if (!app(PermissionService::class)->can($request->user(), $action, $resource, $context)) {
            abort(403, 'Unauthorized action.');
        }
        
        return $next($request);
    }
}
```

#### 4. Policy Integration
```php
namespace App\Policies;

class AssetPolicy
{
    protected $permissionService;
    
    public function create(User $user, ?Plant $plant = null): bool
    {
        $context = $plant ? ['plant_id' => $plant->id] : null;
        return $this->permissionService->can($user, 'create', 'asset', $context);
    }
    
    public function update(User $user, Asset $asset): bool
    {
        $context = [
            'plant_id' => $asset->plant_id,
            'asset_id' => $asset->id,
            'owner_id' => $asset->created_by
        ];
        return $this->permissionService->can($user, 'update', 'asset', $context);
    }
}
```

### Default Roles and Permissions

#### 1. Super Administrator
- All permissions on all resources
- Can grant/revoke super admin status to/from other users
- Cannot be modified or deleted
- First user automatically receives this status

#### 2. Administrator
- Manage users and roles (except super admin operations)
- Full access to all operational resources
- Cannot grant super admin status

#### 3. Plant Manager
- Full access to assigned plants
- Manage assets, work orders, and staff within plants
- View reports for assigned plants

#### 4. Maintenance Supervisor
- Create and manage work orders
- Assign technicians
- Update asset status
- View all assets in assigned areas

#### 5. Technician
- View assigned work orders
- Update work order status
- Create maintenance notes
- View assets they're working on

#### 6. Viewer
- Read-only access to specified resources
- Generate reports
- No modification capabilities

## Security Considerations

### 1. Super Administrator Protection
- At least one super admin must always exist
- Super admins cannot revoke their own status if they're the last one
- All super admin grants/revokes are logged

### 2. Principle of Least Privilege
- Users start with no permissions (except first user)
- Permissions must be explicitly granted
- Regular permission reviews

### 3. Audit Trail
- Log all permission changes
- Track who made changes and when
- Track super admin status changes separately
- Immutable audit logs

### 4. Session Security
- Invalidate sessions on permission changes
- Re-authenticate for sensitive operations
- Implement permission change notifications

### 5. API Security
- Validate permissions on every API call
- No client-side permission caching
- Rate limiting on permission checks

## API Design

### Super Admin Management
```
POST /api/users/{id}/grant-super-admin
Authorization: Bearer {token}

Response:
{
    "success": true,
    "message": "Super admin status granted successfully",
    "user": {
        "id": 123,
        "name": "John Doe",
        "is_super_admin": true
    }
}
```

```
POST /api/users/{id}/revoke-super-admin
Authorization: Bearer {token}

Response:
{
    "success": true,
    "message": "Super admin status revoked successfully"
}
```

### Permission Check Endpoints
```
GET /api/permissions/check
{
    "resource": "asset",
    "action": "create",
    "context": {
        "plant_id": 123
    }
}

Response:
{
    "allowed": true,
    "reason": "User has create permission for assets in plant 123"
}
```

### Bulk Permission Check
```
POST /api/permissions/check-bulk
{
    "checks": [
        {
            "resource": "asset",
            "action": "create",
            "context": {"plant_id": 123}
        },
        {
            "resource": "work_order",
            "action": "update",
            "context": {"id": 456}
        }
    ]
}

Response:
{
    "results": [
        {"allowed": true, "check_id": 0},
        {"allowed": false, "check_id": 1, "reason": "No update permission for work order 456"}
    ]
}
```

### User Effective Permissions
```
GET /api/users/{id}/permissions

Response:
{
    "permissions": [
        {
            "resource": "asset",
            "actions": ["create", "read", "update"],
            "scope": {
                "type": "plant",
                "context_id": 123
            }
        }
    ],
    "roles": ["plant_manager", "safety_officer"],
    "is_super_admin": false
}
```

### Role Management
```
POST /api/roles
{
    "name": "Regional Manager",
    "description": "Manages multiple plants in a region",
    "parent_role_id": 2,
    "permissions": [
        {
            "resource": "plant",
            "action": "*",
            "scope": {
                "type": "conditional",
                "conditions": {
                    "region_id": 5
                }
            }
        }
    ]
}
```

## Performance Optimizations

### 1. Caching Strategy
- Cache effective permissions per user
- Separate cache for super admin status
- Use cache tags for easy invalidation
- Implement write-through caching

### 2. Database Optimizations
- Index on (user_id, resource, action) for permission lookups
- Index on is_super_admin for quick super admin checks
- Materialized views for complex permission hierarchies
- Partition audit logs by date

### 3. Query Optimization
```sql
-- Optimized permission check query
WITH user_permissions AS (
    -- Direct permissions
    SELECT p.* FROM permissions p
    JOIN user_permissions up ON p.id = up.permission_id
    WHERE up.user_id = ?
    
    UNION
    
    -- Role permissions
    SELECT p.* FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ?
)
SELECT * FROM user_permissions
WHERE resource = ? AND action = ?
AND (scope_type = 'global' OR (scope_type = ? AND scope_context_id = ?))
ORDER BY effect DESC; -- Deny first
```

## Future Enhancements

### 1. Dynamic Permissions
- Time-based permissions (temporary access)
- Approval-based permissions (require approval for sensitive actions)
- Delegation system (temporarily delegate permissions)

### 2. Advanced Features
- Permission templates for common role combinations
- Bulk permission assignment tools
- Permission simulation/testing tools
- AI-based permission recommendations

### 3. Multi-tenancy Support
- When ready to implement multi-tenancy, the system can be extended to:
  - Support multiple isolated tenants
  - Tenant-specific databases
  - Cross-tenant permission isolation
  - Tenant admin vs system admin separation

## Conclusion

This permission system provides the flexibility and granularity required for a maintenance management system while maintaining security and performance. The design allows for future extensions including multi-tenancy support when needed. The first-user-as-super-admin approach ensures immediate system usability while maintaining security through the ability to grant super admin privileges to trusted users. 
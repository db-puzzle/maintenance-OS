# Permission System Specification V3

## Table of Contents
1. [Overview](#overview)
2. [Key Changes from V2](#key-changes-from-v2)
3. [Core Architecture](#core-architecture)
4. [Database Schema](#database-schema)
5. [Permission Model](#permission-model)
6. [Role System](#role-system)
7. [User Management](#user-management)
8. [Dynamic Permission System](#dynamic-permission-system)
9. [Hierarchical Permission Checking](#hierarchical-permission-checking)
10. [Invitation System](#invitation-system)
11. [Audit System](#audit-system)
12. [Security Features](#security-features)
13. [API Endpoints](#api-endpoints)
14. [Frontend Integration](#frontend-integration)
15. [Performance Optimizations](#performance-optimizations)
16. [Migration Path](#migration-path)

## Overview

Version 3 of the permission system represents the current production implementation of a comprehensive, entity-scoped permission system for the maintenance management system. This version has been fully implemented using Laravel's authorization capabilities with the Spatie Laravel-Permission package as the foundation.

### Current Implementation Status
- ✅ **Fully Implemented**: All core features are operational
- ✅ **Entity-Scoped Permissions**: All resource permissions are tied to specific entities
- ✅ **Dynamic Permission Generation**: Permissions are automatically created/deleted with entities
- ✅ **Administrator Role**: Combined Super Admin + Admin with wildcard bypass
- ✅ **User Management**: Complete CRUD with scoped access control
- ✅ **Invitation System**: Email-based with scoped permission assignment
- ✅ **Audit Logging**: Comprehensive tracking of all permission changes
- ✅ **Hierarchical Checking**: Full cascade support through entity hierarchy

### Key Principles
1. **No Global Resource Permissions**: All permissions must reference specific entity IDs (except system.*)
2. **Automatic Permission Management**: Permissions are created/deleted with their entities
3. **Hierarchical Cascade**: Parent permissions automatically grant access to children
4. **Administrator Bypass**: Administrators have implicit access to everything
5. **Audit Everything**: All permission-related actions are logged

## Key Changes from V2

### What's Been Implemented
1. **Complete Entity-Scoped System**: All permissions now reference specific IDs
2. **Dynamic Permission Generation**: Observers automatically create/delete permissions
3. **User Management System**: Full CRUD with permission-based access control
4. **Enhanced Audit System**: Detailed logging with metadata and user tracking
5. **Soft Delete Support**: Users can be soft deleted with restoration capability
6. **Permission Validation Service**: Validates all permission operations
7. **Bulk Operations**: Support for bulk permission assignment/revocation

### What's Different from V2 Spec
1. **Permission Naming**: Uses dots throughout (e.g., `assets.execute-routines` not `assets.execute.routines`)
2. **Asset Permissions**: Routines are integrated but still have some separate permissions in practice
3. **Form Permissions**: Still exist in the system (not removed as V2 suggested)
4. **Administrator Protection**: Enhanced service to prevent removal of last admin
5. **User Activity Tracking**: More comprehensive than originally specified

## Core Architecture

### Technology Stack
- **Framework**: Laravel 11.x
- **Authorization**: Spatie Laravel-Permission 6.x
- **Frontend**: React with Inertia.js
- **Database**: MySQL/PostgreSQL with migrations
- **Caching**: Redis/Database cache for permissions
- **Queue**: Laravel Queue for async operations

### Key Services

```php
// Core Services
PermissionHierarchyService     // Handles hierarchical permission checking
UserManagementService          // User CRUD and permission assignment
PermissionValidationService    // Validates permission operations
AdministratorProtectionService // Prevents last admin removal
AuditLogService               // Comprehensive audit logging
```

### Model Structure

```php
// Extended Models
User extends Authenticatable {
    - uses HasRoles trait
    - isAdministrator()
    - canInviteToEntity()
    - getAllEffectivePermissions()
}

Permission extends SpatiePermission {
    - entity_type, entity_id fields
    - parsePermission()
    - generateEntityPermissions()
    - deleteEntityPermissions()
}

Role extends SpatieRole {
    - is_administrator flag
    - parent_role_id for hierarchy
    - getAllEffectivePermissions()
}
```

## Database Schema

### Permissions Table
```sql
permissions
- id
- name (e.g., 'assets.create.plant.123')
- guard_name ('web')
- display_name
- description
- sort_order
- entity_type ('plant', 'area', 'sector', 'asset', 'system')
- entity_id (nullable)
- is_dynamic (boolean)
- metadata (JSON)
- timestamps
```

### Roles Table
```sql
roles
- id
- name
- guard_name
- display_name
- description
- parent_role_id (nullable, for hierarchy)
- is_system (boolean)
- is_administrator (boolean)
- timestamps
```

### User Invitations Table
```sql
user_invitations
- id
- email
- token (64 chars)
- invited_by (user_id)
- initial_role
- initial_permissions (JSON)
- message
- expires_at
- accepted_at
- accepted_by
- revoked_at
- revoked_by
- revocation_reason
- timestamps
```

### Permission Audit Logs Table
```sql
permission_audit_logs
- id
- event_type
- event_action
- auditable_type, auditable_id (polymorphic)
- user_id
- affected_user_id
- impersonator_id
- old_values (JSON)
- new_values (JSON)
- metadata (JSON)
- ip_address
- user_agent
- session_id
- timestamps
```

## Permission Model

### Permission Naming Convention
```
Format: resource.action[.scope.id]

Examples:
- system.create-plants              // System-level permission
- plants.view.123                   // View specific plant
- areas.create.plant.123           // Create areas in plant 123
- assets.manage.sector.789         // Manage assets in sector 789
- users.invite.area.456            // Invite users to area 456
```

### Valid Actions
- `view` - Read access
- `viewAny` - List/browse access
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `manage` - Full CRUD access
- `execute-routines` - Execute maintenance routines
- `export` - Export data
- `import` - Import data
- `invite` - Invite users

### System-Level Permissions
```yaml
# Only these permissions are truly global
- system.create-plants
- system.bulk-import-assets
- system.bulk-export-assets
- system.settings.view
- system.settings.update
- system.audit.view
```

### User Management Permissions
```yaml
# User operations (not entity-scoped)
- users.viewAny
- users.view
- users.create
- users.update
- users.update.owned
- users.delete
- users.impersonate
- users.manage-permissions
- users.manage-roles
- permissions.grant

# Invitation permissions (entity-scoped)
- users.invite.plant.[id]
- users.invite.area.[id]
- users.invite.sector.[id]
```

## Role System

### System Roles

#### Administrator
```yaml
Name: Administrator
Type: System Role (is_system: true, is_administrator: true)
Access: Full system access via wildcard bypass
Special:
  - Cannot be deleted
  - At least one must always exist
  - Only Administrators can assign this role
  - Has all permissions implicitly
```

#### Plant Manager
```yaml
Name: Plant Manager
Type: System Role
Default Permissions:
  - system.create-plants
  - system.bulk-import-assets
  - system.bulk-export-assets
  - users.viewAny
  - users.view
  - roles.viewAny
  - roles.view
Entity Permissions: Applied when assigned to a plant
```

#### Area Manager
```yaml
Name: Area Manager
Type: System Role
Default Permissions:
  - users.viewAny
  - users.view
  - users.update.owned
Entity Permissions: Applied when assigned to an area
```

#### Sector Manager
```yaml
Name: Sector Manager
Type: System Role
Default Permissions:
  - users.viewAny
  - users.view
  - users.update.owned
Entity Permissions: Applied when assigned to a sector
```

#### Maintenance Supervisor
```yaml
Name: Maintenance Supervisor
Type: System Role
Default Permissions:
  - users.update.owned
Entity Permissions: Execution permissions for assigned scope
```

#### Technician
```yaml
Name: Technician
Type: System Role
Default Permissions:
  - users.update.owned
Flexibility: Can be assigned at plant, area, sector, or asset level
```

#### Viewer
```yaml
Name: Viewer
Type: System Role
Default Permissions:
  - users.update.owned
Entity Permissions: Read-only access to assigned scope
```

## User Management

### User CRUD Operations

#### User Controller Routes
```php
// Main user management
GET    /users                 // List users (scoped by permissions)
GET    /users/create          // Show create form
POST   /users                 // Store new user
GET    /users/{user}          // Show user details
GET    /users/{user}/edit     // Show edit form
PUT    /users/{user}          // Update user
DELETE /users/{user}          // Soft delete user

// Soft delete management
GET    /users/deleted/list    // List soft-deleted users
POST   /users/{user}/restore  // Restore soft-deleted user
DELETE /users/{user}/force-delete // Permanently delete
```

#### Permission Management Routes
```php
// User permissions
GET  /users/{user}/permissions           // View user permissions
POST /users/{user}/permissions/grant     // Grant permissions
POST /users/{user}/permissions/revoke    // Revoke permissions
POST /users/{user}/permissions/bulk      // Bulk update
GET  /users/{user}/permissions/available // Get grantable permissions
GET  /users/{user}/permissions/history   // Permission history
POST /users/{user}/permissions/copy/{targetUser} // Copy permissions
```

#### Role Management Routes
```php
// Role-based operations
POST   /users/{user}/roles/apply    // Apply role to entity
GET    /users/{user}/roles/preview  // Preview role permissions
DELETE /users/{user}/roles/remove   // Remove role from user
```

### Access Control

#### For Administrators
- See all users system-wide
- Full CRUD on all users
- Grant/revoke any permission
- Assign/remove any role
- Access all audit logs

#### For Plant Managers
- See users with permissions in their plants
- Create users with permissions limited to their plants
- Grant/revoke permissions within their plant scope
- Cannot assign Administrator role
- View audit logs for their plant

## Dynamic Permission System

### Permission Generation

When an entity is created, permissions are automatically generated:

#### Plant Creation
```php
// Automatic permissions generated:
plants.view.{id}
plants.update.{id}
plants.delete.{id}
plants.manage-shifts.{id}
users.invite.plant.{id}
areas.create.plant.{id}
areas.viewAny.plant.{id}
sectors.viewAny.plant.{id}
sectors.create.plant.{id}
assets.viewAny.plant.{id}
assets.create.plant.{id}
assets.manage.plant.{id}
assets.execute-routines.plant.{id}
assets.import.plant.{id}
assets.export.plant.{id}
// ... and more
```

#### Area Creation
```php
// Automatic permissions generated:
areas.view.{id}
areas.update.{id}
areas.delete.{id}
users.invite.area.{id}
sectors.create.area.{id}
sectors.viewAny.area.{id}
assets.viewAny.area.{id}
assets.create.area.{id}
assets.manage.area.{id}
assets.execute-routines.area.{id}
assets.export.area.{id}
```

### Permission Cleanup

When an entity is deleted:
1. All permissions for that entity are removed
2. Permissions for child entities are cascaded
3. Users lose access immediately
4. Audit log records the cleanup

### Observer Implementation

```php
// PlantObserver example
public function created(Plant $plant): void {
    // Generate permissions
    $permissions = Permission::generateEntityPermissions('plant', $plant->id);
    
    // Grant to creator (if not admin)
    if (!auth()->user()->isAdministrator()) {
        // Grant management permissions
        // Grant invitation permission
    }
    
    // Log the operation
    AuditLogService::log(...);
}

public function deleting(Plant $plant): void {
    // Delete all permissions
    Permission::deleteEntityPermissions('plant', $plant->id);
    
    // Cascade to children
    // Log the operation
}
```

## Hierarchical Permission Checking

### Permission Cascade

The system implements full hierarchical checking:

```
Plant → Area → Sector → Asset

Example:
assets.manage.plant.123 grants access to:
- All assets in plant 123
- All assets in all areas of plant 123
- All assets in all sectors of all areas of plant 123
```

### Implementation

```php
// PermissionHierarchyService
public function checkHierarchicalPermission(User $user, string $basePermission, $model = null): bool
{
    // Administrator bypass
    if ($user->isAdministrator()) {
        return true;
    }
    
    // System permissions don't need models
    if (str_starts_with($basePermission, 'system.')) {
        return $user->can($basePermission);
    }
    
    // All other permissions must be entity-scoped
    if (!$model) {
        return false;
    }
    
    // Check through hierarchy
    return $this->checkModelPermissions($user, $basePermission, $model);
}
```

## Invitation System

### Invitation Flow

1. **User with invitation permission** initiates invitation
2. **System validates** permission scope
3. **Email sent** with secure token
4. **Recipient accepts** within expiration period
5. **Account created** with specified permissions
6. **Audit logged** for compliance

### Key Features

- **Scoped Invitations**: Can only grant permissions within inviter's scope
- **Time-Limited**: Default 7-day expiration
- **One-Time Use**: Token invalidated after acceptance
- **Revocable**: Can be cancelled before acceptance
- **Audited**: Full trail of who invited whom

### Implementation

```php
// UserInvitation Model
- Secure token generation (64 chars)
- Automatic expiration setting
- Permission scope validation
- Signed URL generation

// Invitation Controller
- Create with role/permission selection
- Email notification via Laravel
- Accept with user creation
- Revoke with reason tracking
```

## Audit System

### Comprehensive Logging

All permission-related actions are logged:

```php
// Event Types Tracked
- user.created
- user.updated
- user.deleted
- user.administrator.granted
- user.administrator.revoked
- permissions.generated
- permissions.deleted
- permission.granted
- permission.revoked
- role.assigned
- role.removed
- invitation.sent
- invitation.accepted
- invitation.revoked
```

### Audit Log Structure

```php
PermissionAuditLog {
    event_type: string       // Type of event
    event_action: string     // Action performed
    auditable: morph         // What was affected
    user_id: int            // Who did it
    affected_user_id: int   // Who was affected
    old_values: json        // Previous state
    new_values: json        // New state
    metadata: json          // Additional context
    ip_address: string      // Request IP
    user_agent: string      // Browser info
    session_id: string      // Session tracking
}
```

### Audit Features

- **Searchable**: Filter by user, action, date
- **Exportable**: CSV/Excel export capability
- **Retention**: Configurable cleanup policies
- **Real-time**: Immediate logging
- **Contextual**: Rich metadata for each event

## Security Features

### Administrator Protection

```php
AdministratorProtectionService {
    - isLastAdministrator()      // Check if last admin
    - canPerformOperation()      // Validate operations
    - getProtectionMessage()     // User-friendly errors
    - ensureAdministratorExists() // System integrity
    - attemptRecovery()          // Restore deleted admin
}
```

### Permission Validation

```php
PermissionValidationService {
    - validateGrant()            // Check grant permissions
    - validateRevoke()           // Check revoke permissions
    - isPermissionWithinScope()  // Scope validation
    - permissionExists()         // Existence check
    - isValidPermissionFormat()  // Format validation
}
```

### Security Measures

1. **No Global Access**: Everything is entity-scoped
2. **Scope Enforcement**: Can't grant beyond your scope
3. **Audit Everything**: Complete trail
4. **Token Security**: Cryptographically secure invitations
5. **Session Tracking**: Monitor user activity
6. **IP Logging**: Track access patterns

## API Endpoints

### Permission Checking
```php
POST /permissions/check
{
    "permission": "assets.create.plant.123",
    "resource_id": 123,
    "resource_type": "Plant"
}

Response:
{
    "allowed": true,
    "permission": "assets.create.plant.123",
    "user_id": 1,
    "is_administrator": false
}
```

### Bulk Permission Check
```php
POST /permissions/check-bulk
{
    "permissions": [
        "assets.view.plant.123",
        "assets.create.sector.456"
    ]
}

Response:
{
    "results": {
        "assets.view.plant.123": true,
        "assets.create.sector.456": false
    }
}
```

## Frontend Integration

### Inertia.js Shared Data

```php
// HandleInertiaRequests middleware
public function share(Request $request)
{
    return [
        'auth' => [
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_administrator' => $user->isAdministrator(),
            ] : null,
            'permissions' => $user ? $user->getAllEffectivePermissions()->pluck('name') : [],
            'roles' => $user ? $user->getRoleNames() : [],
        ],
    ];
}
```

### React Components

```typescript
// Permission checking in React
const { auth } = usePage().props;

// Check single permission
const canCreate = auth.permissions?.includes('assets.create.plant.123');

// Check administrator
const isAdmin = auth.user?.is_administrator;

// Permission guard component
<PermissionGuard permission="assets.create.plant.123">
    <CreateAssetButton />
</PermissionGuard>
```

## Performance Optimizations

### Current Optimizations

1. **Permission Caching**: Via Spatie package
2. **Eager Loading**: Prevent N+1 queries
3. **Indexed Lookups**: Database indexes on key fields
4. **Batch Operations**: Bulk permission assignment

### Database Indexes

```sql
-- Key indexes for performance
INDEX on permissions(name, guard_name)
INDEX on permissions(entity_type, entity_id)
INDEX on model_has_permissions(model_id, model_type)
INDEX on model_has_roles(model_id, model_type)
INDEX on permission_audit_logs(user_id, created_at)
```

## Migration Path

### From V2 to V3

The system is already at V3. For new deployments:

1. **Run Migrations**: Create all tables
2. **Run Seeders**: Create system permissions and roles
3. **Create First User**: Automatically becomes Administrator
4. **Create Entities**: Permissions generated automatically
5. **Assign Users**: Use role-based assignment

### Key Commands

```bash
# Initial setup
php artisan migrate
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=RoleSeeder

# Cache management
php artisan permission:cache-reset
php artisan cache:clear

# Maintenance
php artisan permission:show # Custom command to view permissions
```

## Best Practices

### For Developers

1. **Always use observers** for entity creation/deletion
2. **Check permissions hierarchically** via PermissionHierarchyService
3. **Log all permission changes** via AuditLogService
4. **Validate permission format** before granting
5. **Use transactions** for permission operations

### For Administrators

1. **Regular audits** of permission assignments
2. **Use roles** for common permission sets
3. **Document** custom permissions
4. **Monitor** the audit logs
5. **Backup** before bulk operations

## Conclusion

Version 3 represents a mature, production-ready permission system that provides:

- **Complete entity-based access control** with no global permissions
- **Automatic permission management** through observers
- **Comprehensive audit trail** for compliance
- **Flexible user management** with scoped access
- **Robust security** with multiple protection layers
- **Excellent performance** through caching and optimization

The system successfully balances security, flexibility, and usability while maintaining a clean, maintainable codebase that follows Laravel best practices. 
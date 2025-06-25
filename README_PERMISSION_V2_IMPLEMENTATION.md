# Permission System V2 Implementation

## Overview

The Permission System V2 has been successfully implemented with all the key features outlined in the specification documents. This is a complete overhaul from V1 with entity-scoped permissions, dynamic permission generation, and improved security.

## Key Changes Implemented

### 1. Database Structure
- **Updated Migrations**:
  - Added `entity_type`, `entity_id`, `is_dynamic`, `metadata` columns to permissions table
  - Added `is_administrator` flag to roles table
  - Removed `is_super_admin` from users table
  - Removed `super_admin_grants` table (no longer needed)

### 2. Core Models Updated

#### Permission Model (`app/Models/Permission.php`)
- Added entity-scoped permission support
- Implemented `generateEntityPermissions()` for dynamic creation
- Added `deleteEntityPermissions()` for cleanup
- Added permission validation with regex pattern
- Added scopes for dynamic/static permissions

#### Role Model (`app/Models/Role.php`)
- Added `is_administrator` flag for the combined admin role
- Implemented `isAdministrator()` check
- Added `getAdministratorRole()` helper
- Administrator role returns all permissions implicitly

#### User Model (`app/Models/User.php`)
- Removed `is_super_admin` property
- Updated to use `isAdministrator()` based on role
- Added `canInviteToEntity()` for invitation permissions
- Added `getInvitableEntities()` helper
- Administrator bypass now uses role-based check

### 3. Dynamic Permission Management

#### Entity Observers Created
- **PlantObserver** (`app/Observers/PlantObserver.php`)
- **AreaObserver** (`app/Observers/AreaObserver.php`)
- **SectorObserver** (`app/Observers/SectorObserver.php`)
- **AssetObserver** (`app/Observers/AssetObserver.php`)

Each observer:
- Generates permissions when entity is created
- Deletes permissions when entity is deleted
- Grants permissions to creating user
- Logs all permission operations

### 4. Services Updated

#### PermissionHierarchyService
- Updated for V2 entity-scoped permissions
- Removed global permission checks (except system.*)
- Added `validateSharedEntityUpdate()` for shared entities
- All methods now require specific entity permissions

#### PermissionValidationService (New)
- Validates permission name format
- Validates entity existence and type matching
- Cleanup orphaned permissions
- Check hierarchy consistency
- Find duplicate permissions

### 5. Permission Seeders Updated

#### PermissionSeeder
- Only seeds system-level permissions:
  - `system.create-plants`
  - `system.bulk-import-assets`
  - `system.bulk-export-assets`
  - User/role management permissions
  - System settings permissions
- All entity permissions are created dynamically

#### RoleSeeder
- Creates Administrator role with wildcard permissions
- Creates system roles with minimal default permissions
- Entity-specific permissions assigned when users are associated with entities

### 6. Authorization Updates

#### PermissionServiceProvider
- Administrator wildcard bypass in `Gate::before()`
- Custom gates for V2 features:
  - `invite-to-entity`
  - `update-shared-entity`
  - `bulk-import` / `bulk-export`
  - `manage-administrators`

### 7. Utility Commands

#### PermissionCleanup Command
- Validates all permissions
- Finds orphaned permissions
- Checks hierarchy consistency
- Cleans up invalid permissions

#### MigratePermissionsToV2 Command
- Migrates from V1 to V2 structure
- Converts global to entity-scoped permissions
- Removes deprecated permissions
- Updates role assignments

### 8. Audit Logging Enhanced

#### PermissionAuditLog Model
- Added V2 event types
- Entity-aware logging
- Better formatting for permission events
- Tracks dynamic permission generation

### 9. User Invitation System

#### UserInvitation Model
- Updated for permission-based invitations
- Added scope validation
- Entity access tracking
- Invitation permission checks

## Permission Structure

### System Permissions (Global)
```
system.create-plants
system.bulk-import-assets
system.bulk-export-assets
system.settings.view
system.settings.update
system.audit.view
```

### Entity-Scoped Permissions (Dynamic)
```
# Plant permissions (created when plant is created)
plants.view.[id]
plants.update.[id]
plants.delete.[id]
users.invite.plant.[id]
areas.create.plant.[id]
assets.*.plant.[id]
...

# Area permissions (created when area is created)
areas.view.[id]
areas.update.[id]
users.invite.area.[id]
sectors.create.area.[id]
assets.*.area.[id]
...

# Sector permissions (created when sector is created)
sectors.view.[id]
sectors.update.[id]
users.invite.sector.[id]
assets.*.sector.[id]
...

# Asset permissions (created when asset is created)
assets.view.[id]
assets.update.[id]
assets.manage.[id]
assets.execute-routines.[id]
```

## Usage Examples

### Creating a Plant (triggers permission generation)
```php
$plant = Plant::create(['name' => 'New Plant']);
// Automatically generates ~20 permissions for this plant
// Creator gets management permissions if not Administrator
```

### Checking Permissions
```php
// Check specific entity permission
if ($user->can('plants.view.123')) {
    // User can view plant 123
}

// Check hierarchical permission
$hierarchyService->checkHierarchicalPermission($user, 'assets.view', $asset);

// Administrator bypass (automatic)
if ($user->isAdministrator()) {
    // Has all permissions implicitly
}
```

### Inviting Users
```php
// Check if user can invite to entity
if ($user->canInviteToEntity('plant', 123)) {
    // Create invitation with scoped permissions
}
```

## Migration Guide

To migrate existing data to V2:

1. Run migrations: `php artisan migrate`
2. Run seeders: `php artisan db:seed --class=PermissionSeeder`
3. Run migration command: `php artisan permissions:migrate-v2`
4. Validate permissions: `php artisan permissions:cleanup --validate`

## Important Notes

1. **No Global Resource Permissions**: All resource access must be entity-scoped
2. **Dynamic Creation**: Permissions are created/deleted with entities
3. **Administrator Role**: Combined Super Admin + Admin with wildcard bypass
4. **Invitation Permissions**: User invitation is permission-based
5. **Audit Everything**: All permission changes are logged
6. **Shared Entity Validation**: Updates require permissions for all affected assets

## Maintenance

- Run `php artisan permissions:cleanup` regularly to validate permissions
- Monitor audit logs for unauthorized access attempts
- Review entity permissions after bulk operations
- Ensure at least one Administrator always exists
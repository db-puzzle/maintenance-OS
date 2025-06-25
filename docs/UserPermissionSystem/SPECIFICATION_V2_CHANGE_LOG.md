# Permission System Specification V2

## Overview

This document outlines Version 2 of the comprehensive permission system for a maintenance management system. The key change in V2 is that **ALL resource permissions are scoped to specific entities (Plant, Area, Sector)**, ensuring tighter security and more granular control.

### Key Changes from V1
- **All permissions entity-scoped**: ALL resource permissions must reference specific Plant, Area, or Sector IDs
- **No global permissions** (except `system.create-plants`): Removed all global permissions for resources
- **Entity-specific permissions only**: All permissions must reference specific entity IDs
- **Dynamic permission generation**: Permissions are automatically created when plants/areas/sectors are created
- **Permission cleanup**: Permissions are automatically removed when entities are deleted
- **Inheritance applies**: Permissions cascade down the hierarchy (Plant → Area → Sector → Assets)
- **Combined Admin roles**: Super Administrator and Administrator are now a single role
- **Form permissions removed**: Forms inherit permissions from their parent resources (Routines, etc.)
- **Report permissions simplified**: Reports are implicit with view permissions; only `export` action is explicit
- **Shared entity validation**: Shifts, Asset Types, and Manufacturers require validation before updates
- **User invitation as permission**: Inviting users is now a separate permission, not tied to roles
- **Routine permissions consolidated**: Routines and routine executions are now part of asset permissions

### Key Requirements (Updated for V2)
- First user to sign up becomes an Administrator
- Administrators can grant administrator privileges to other users
- Only Administrators can assign Administrator role
- **User invitations are controlled by specific permissions** (e.g., `users.invite.plant.[id]`, `users.invite.area.[id]`, `users.invite.sector.[id]`)
- **System-created Manager roles receive invitation permissions by default** for their respective entities
- **Any user with invitation permissions can invite users** within their permitted scope
- Invitations are sent via email with secure, time-limited tokens
- Invitations can specify initial permissions within the inviter's scope
- **ALL permissions MUST be scoped to specific entities (Plant, Area, or Sector)**
- **Permissions are dynamically created when entities are created**
- **Permissions are automatically cleaned up when entities are deleted**
- **Shared entities (Shifts, Asset Types, Manufacturers) require validation before updates**
- **Reports are automatically available based on view permissions**
- **Export capabilities are controlled by explicit `export` permissions**
- **Routines and their executions are managed through asset permissions**
- Role-based access control (RBAC) using Laravel's authorization features
- Permission inheritance and hierarchical structure
- Audit trail for all permission changes, especially administrator assignments
- Performance-optimized using Laravel's caching system

## Core Changes in V2

### 1. Entity-Specific Permissions Only

In V2, ALL resource permissions are scoped to entities:
- `plants.view.[id]`, `plants.update.[id]`, `plants.delete.[id]`
- `areas.view.[id]`, `areas.create.plant.[id]`, `areas.update.[id]`, `areas.delete.[id]`
- `sectors.view.[id]`, `sectors.create.area.[id]`, `sectors.update.[id]`, `sectors.delete.[id]`
- `assets.view.sector.[id]`, `assets.create.sector.[id]`, etc.
- **`assets.manage.[id]`** - Includes managing the asset's routines
- **`assets.execute-routines.[id]`** - Permission to execute routines for the asset
- **`users.invite.plant.[id]`, `users.invite.area.[id]`, `users.invite.sector.[id]`** - User invitation permissions

#### Permission Naming Convention
- **Standardized format**: All permissions follow the pattern `resource.action.scope.id`
- **Action verbs**: Use consistent verbs: `view`, `create`, `update`, `delete`, `manage`, `execute`, `export`, `import`
- **No mixed formats**: Avoid mixing kebab-case with dots (use `execute-routines` not `execute.routines`)
- **Maximum length**: Permission names must not exceed 255 characters
- **Validation regex**: `^[a-z]+\.(view|create|update|delete|manage|execute|export|import)(\.[a-z]+\.[0-9]+)?$`

### 2. System-Level Permissions

System-level permissions that are not tied to specific entities:
- `system.create-plants` - Ability to create new plants (system-wide)
- `system.bulk-import-assets` - Ability to bulk import assets across any entity
- `system.bulk-export-assets` - Ability to bulk export assets across any entity

### 3. Dynamic Permission Management

When any entity is created:
1. Automatic permissions are generated for that specific entity
2. The creating user is automatically granted management permissions for that entity
3. **User invitation permissions are created** (e.g., `users.invite.plant.[id]`)
4. Permissions can then be assigned to other users/roles as needed
5. **Entity type validation**: System validates that IDs in permission names match their declared entity type
6. **Permission templates**: Predefined permission sets can be applied based on entity type

When any entity is deleted:
1. All associated permissions are automatically removed
2. Users lose access to the deleted entity
3. Audit log records the permission removal
4. **Cascade handling**: Permissions for child entities are also cleaned up
5. **Orphan detection**: Background job identifies and cleans orphaned permissions

#### Permission Validation Rules
- **Entity existence**: Verify the entity exists before creating permissions
- **Type matching**: Ensure permission scope matches entity type (e.g., plant ID is actually a plant)
- **Hierarchy validation**: Child permissions require parent entity to exist
- **Name sanitization**: Strip invalid characters and enforce naming convention
- **Duplicate prevention**: Prevent creation of duplicate permissions

### 4. Shared Entity Validation

For Shifts, Asset Types, and Manufacturers:
1. Before update/delete, system validates all associated assets
2. User can only proceed if they have permissions for ALL affected assets
3. If validation fails, system offers to create a copy instead

### 5. Administrator Role Changes

- Super Administrator and Administrator roles are combined
- System ensures at least one Administrator always exists
- Administrator assignments are audit logged
- Only Administrators can assign Administrator role to others
- **Administrator permissions use a hybrid approach**: 
  - Administrators have wildcard permissions (`*`) that match any permission check
  - These wildcard permissions are still recorded in the database for auditability
  - Permission checks are optimized with early return for wildcard matches
  - All Administrator actions are logged with enhanced detail
- **Role ID protection**: Administrator role is identified by a system-defined ID (not name) to prevent impersonation
- **System role protection**: Administrator role is marked as a system role that cannot be modified or deleted

### 6. Implicit Report Access

- **View permissions include report access**: If you can view data, you can view reports about it
- **ViewAny permissions include aggregate reports**: If you can view all items, you can see aggregate reports
- **Export is explicit**: Separate `export` permission required for downloading data/reports
- **No separate report permissions**: Reports are a natural extension of data access

### 7. Permission-Based User Invitations

- **Invitation as permission**: User invitation capability is controlled by specific permissions
- **Entity-scoped invitation permissions**: `users.invite.plant.[id]`, `users.invite.area.[id]`, `users.invite.sector.[id]`
- **Default assignment to Manager roles**: System-created Manager roles automatically receive invitation permissions for their entities
- **Flexible permission assignment**: Any user can be granted invitation permissions independently of their role
- **Scoped invitations**: Users can only grant permissions within their invitation permission scope
- **Automatic permission boundaries**: Invited users cannot receive permissions beyond the inviter's scope
- **Audit trail**: All invitations tracked with inviter's permissions and scope

#### Example Invitation Permissions:
- A user with `users.invite.plant.1` can invite users and grant any permissions scoped to Plant 1
- A user with `users.invite.area.5` can invite users and grant any permissions scoped to Area 5
- A user with `users.invite.sector.10` can invite users and grant any permissions scoped to Sector 10
- Manager roles receive these permissions by default when assigned to an entity

### 8. Bulk Import/Export Permissions

- **System-level permissions**: Bulk operations are controlled by system-level permissions not tied to specific entities
- **Two distinct permissions**: Separate permissions for import (`system.bulk-import-assets`) and export (`system.bulk-export-assets`)
- **Initial assignment**: Plant Manager roles receive these permissions by default
- **Entity validation**: Regular users must have appropriate permissions for the target entities where assets will be imported
- **Export scope**: Bulk export respects entity permissions - regular users can only export assets they have permission to view
- **Import validation**: System validates that non-Administrator users have create permissions for the target sectors
- **Administrator exemption**: Administrators can bulk import to any entity and export from any entity without restriction
- **Audit trail**: All bulk operations are logged with user, timestamp, affected entities, and number of records
- **File size limits**: System enforces reasonable file size and record count limits for bulk operations
- **Performance considerations**: Bulk operations processed asynchronously to prevent system overload

#### Bulk Operation Constraints:
- Users with `system.bulk-export-assets` can export assets, but only those they have view permissions for
- Users with `system.bulk-import-assets` can import assets, but only to sectors where they have create permissions
- Plant Managers receive both permissions by default when assigned to a plant
- **Administrators bypass all restrictions**: Can bulk import/export to any entity without permission checks
- Bulk operations maintain full data validation and constraint checking (except for Administrators)

### 9. Consolidated Asset Permissions (Routines & Executions)

Since routines belong to assets and routine executions belong to routines, these permissions are now consolidated into asset permissions:

- **Asset view permissions include**: Viewing the asset's routines and their execution history
- **Asset management permissions include**: Full CRUD operations on the asset's routines
- **New granular permission**:
  - `assets.execute-routines.*` - Permission to start, complete, and approve routine executions
- **Export permissions include**: Exporting routine execution data and reports

#### Benefits of Consolidation:
- **Simpler permission model**: Fewer permissions to manage
- **Logical consistency**: Routines are inherently part of asset maintenance
- **Reduced database overhead**: Fewer permission records
- **Easier to understand**: Users understand that asset permissions include maintenance activities
- **Maintains granularity**: Still have separate permissions for viewing vs managing vs executing

#### Permission Mapping:
- `assets.view.*` → Includes viewing the asset's routines and their execution history
- `assets.manage.*` → Includes full CRUD on the asset's routines
- `assets.execute-routines.*` → Permission to start, complete, and approve routine executions
- `assets.export.*` → Includes exporting routine execution data

### 10. Advanced Permission Features

#### Permission Dependencies
- **Implicit permissions**: Some permissions automatically grant others
  - `update` implies `view`
  - `delete` implies `view`
  - `manage` implies `view`, `create`, `update`, `delete`
- **Configurable dependencies**: System allows defining custom permission dependencies
- **Dependency resolution**: Automatic grant of dependent permissions

#### Bulk Permission Management
- **Pattern-based assignment**: Grant permissions using patterns (e.g., `assets.*.plant.1`)
- **Bulk operations**:
  - Grant/revoke permissions for multiple entities at once
  - Copy permission sets between users/roles
  - Apply permission templates
- **Preview mode**: Dry-run capability to preview changes before applying

#### Temporary Permissions (FUTURE)
- **Time-limited access**: Permissions can have `valid_from` and `valid_until` timestamps
- **Automatic expiration**: Background job revokes expired permissions
- **Use cases**: Contractor access, temporary elevated privileges, project-based access
- **Audit trail**: Full history of temporary permission grants and expirations

#### Permission Delegation (FUTURE)
- **Delegation mechanism**: Users can temporarily delegate their permissions to others
- **Constraints**: 
  - Maximum delegation period (configurable, default 30 days)
  - Cannot delegate Administrator permissions
  - Delegated permissions are marked as such in audit logs
- **Automatic revocation**: Delegations expire automatically
- **Delegation chain**: Track who delegated what to whom

### 11. Performance Optimization Strategy

#### Scalability Measures
- **Pagination**: All permission queries support pagination

#### Multi-Level Caching (FUTURE)
- **User-level cache**: Individual user's resolved permissions
- **Role-level cache**: Permissions for each role
- **Entity-level cache**: Permissions related to specific entities
- **Pattern cache**: Pre-compiled permission patterns for fast matching
- **Cache invalidation**: Smart invalidation based on changes

#### Permission Evaluation Optimization (FUTURE)
- **Early returns**: Check wildcard and deny permissions first
- **Indexed lookups**: Use Redis sets for O(1) permission checks
- **Batch checking**: Check multiple permissions in single operation
- **Pre-compilation**: Convert permission patterns to efficient data structures

### 12. Enhanced Audit & Compliance

#### Comprehensive Audit Trail
- **Full history**: Track all permission changes with before/after states
- **Point-in-time queries**: "Who had what permission when?"
- **Change justification**: Optional reason field for permission changes
- **Bulk change tracking**: Group related permission changes

#### Compliance Features (FUTURE)
- **Pre-built reports**: 
  - SOX compliance report
  - ISO 27001 access control report
  - Custom compliance templates
- **Access reviews**: Scheduled reviews of user permissions
- **Certification workflows**: Managers certify their team's permissions quarterly
- **Anomaly detection**: Flag unusual permission patterns

## Security Considerations

### V2 Security Enhancements

1. **No Global Resource Access**: All access must be explicitly granted per entity
2. **Entity Validation**: All permissions referencing entities are validated to ensure the entity exists
3. **Cascade Deletion**: When entities are deleted, all associated permissions are automatically removed
4. **Audit Trail**: All permission creation/deletion and administrator assignments are logged
5. **Permission Verification**: Regular scheduled tasks to verify permission integrity
6. **Administrator Protection**: System ensures at least one administrator always exists
7. **Shared Entity Protection**: Updates to shared entities require permission for all affected assets
8. **Invitation Permission Validation**: System validates that inviters can only grant permissions within their scope
9. **Administrator Security**: 
   - Wildcard permissions still tracked in database
   - All Administrator actions logged with enhanced detail
   - Two-factor authentication required
   - Session monitoring with shorter timeouts
10. **Permission Validation**:
    - Name format validation
    - Entity type matching
    - Hierarchy consistency checks
    - Reserved word protection
11. **API Security**:
    - Rate limiting on permission checks
    - API versioning for backward compatibility
    - JWT token permissions for microservices

### Additional Security Measures

#### Permission Name Security
- **Input validation**: Strict validation of permission names to prevent injection
- **Reserved words**: List of reserved words that cannot be used in permission names
- **Character restrictions**: Only alphanumeric, dots, and hyphens allowed
- **Length limits**: Maximum 255 characters for permission names

#### Entity Movement Handling
- **Permission migration**: When entities move in hierarchy, permissions are updated
- **Validation before move**: Ensure user has permissions for both source and destination
- **Audit trail**: Full history of permission changes due to entity moves

#### Zero-Trust Principles
- **Always verify**: Never assume permissions, always check

## Migration from V1

### Migration Strategy

The migration from V1 to V2 requires careful planning:

1. **Combine Admin Roles**: Merge Super Administrator and Administrator roles
2. **Convert Global Permissions**: Convert all global resource permissions to entity-specific
3. **Remove Form Permissions**: Remove all form-related permissions
4. **Remove Routine Permissions**: Remove all routine and routine-execution permissions (now part of asset permissions)
5. **Simplify Report Permissions**: Convert separate report permissions to implicit access with view permissions and explicit export permissions
6. **Create Entity Permissions**: Generate permissions for all existing entities
7. **Create Invitation Permissions**: Generate `users.invite.*` permissions for all existing entities
8. **Assign Invitation Permissions**: Grant invitation permissions to existing Manager roles
9. **Create Bulk Operation Permissions**: Add `system.bulk-import-assets` and `system.bulk-export-assets` permissions
10. **Assign Bulk Permissions**: Grant bulk operation permissions to all existing Plant Manager roles
11. **Migrate Routine Permissions**: Convert existing routine permissions to asset permissions
12. **Audit Trail**: Log all migration activities
13. **Validation**: Run validation checks to ensure permission integrity
14. **Performance Testing**: Benchmark permission checks before and after migration


## Performance Targets

### Service Level Agreements (SLAs)

1. **Permission checks**: 
   - 99th percentile: < 10ms
   - 95th percentile: < 5ms
   - Average: < 2ms
2. **Permission grants/revokes**: < 100ms
3. **Bulk operations**: < 1s for 1000 permissions
4. **Cache hit rate**: > 95%
5. **API response time**: < 50ms for permission endpoints

### Scalability Targets

1. **Concurrent users**: Support 10,000+ concurrent users
2. **Permission records**: Efficient with 10M+ permission records
3. **Entities**: Handle 100K+ entities per type
4. **Permission checks/second**: 100K+ checks per second

## Developer Experience Enhancements

### Type Safety
1. **Generated TypeScript types**: Auto-generate types from permission definitions
2. **Runtime validation**: Validate permission strings at runtime
3. **IDE support**: Autocomplete for permission names
4. **Compile-time checks**: TypeScript compiler catches permission errors

### Testing Utilities
1. **Permission factories**: Generate test permissions easily
2. **Assertion helpers**: Custom assertions for permission testing
3. **Mock services**: Mock permission service for unit tests
4. **Integration test helpers**: Tools for testing permission flows

### Developer Tools (FUTURE)
1. **Permission debugger**: Browser extension to inspect permissions
2. **CLI tools**: Command-line tools for permission management
3. **Visualization**: Interactive permission hierarchy viewer
4. **Documentation generator**: Auto-generate permission documentation

## Future-Proofing

### Multi-Tenancy Preparation (FUTURE)
1. **Tenant isolation**: Permissions include tenant context
2. **Cross-tenant permissions**: Support for shared resources
3. **Tenant-specific roles**: Roles scoped to tenants
4. **Performance isolation**: Separate caches per tenant

### Microservices Architecture
1. **JWT claims**: Permissions encoded in JWT tokens
2. **Service mesh integration**: Permission checks at service boundaries
3. **Distributed caching**: Redis cluster for permission cache
4. **Event streaming**: Kafka/RabbitMQ for permission updates

## Conclusion

Version 2 of the permission system provides a more secure and maintainable approach by:
- Enforcing entity-specific permissions for all resources
- Making user invitation a permission-based capability rather than role-based
- Removing unnecessary permission complexity (forms, reports, routines as separate entities)
- Consolidating routine and execution permissions into asset permissions for logical consistency
- Simplifying the administrator structure with efficient bypass mechanism
- Adding validation for shared entity updates
- Ensuring complete audit trails for all permission changes
- Providing controlled bulk operations through system-level permissions
- Maintaining entity permission validation even during bulk operations

This ensures that access is always tied to real entities in the system, preventing over-permissioning and providing better auditability, while maintaining optimal performance for Administrator operations and enabling efficient bulk data management for authorized users.

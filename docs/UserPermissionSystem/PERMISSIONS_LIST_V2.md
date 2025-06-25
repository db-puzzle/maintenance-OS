# Comprehensive Permissions List V2

## Overview
This document defines all permissions in the maintenance OS system V2, their granularity levels, and inheritance structure. **The key change in V2 is that ALL resource permissions are scoped to specific entities (Plant, Area, Sector)**, ensuring complete control and auditability.

## V2 Key Changes
- **ALL permissions entity-scoped**: Every resource permission must reference specific Plant, Area, or Sector IDs
- **Dynamic permission generation**: Permissions are created automatically when entities are created
- **No global resource permissions**: Users cannot have blanket access (except `system.create-plants`)
- **Combined Administrator role**: Super Administrator and Administrator are now one role
- **Form permissions removed**: Forms inherit permissions from their parent resources (Routines, etc.)
- **Routine permissions consolidated**: Routines and routine executions are now part of asset permissions
- **Report permissions simplified**: Reports are implicit with view permissions; export requires explicit permission
- **Shared entity validation**: Shifts, Asset Types, and Manufacturers require validation before updates

## Permission Naming Convention
- Format: `resource.action[.scope[.id]]`
- Examples:
  - `system.create-plants` - The ONLY global permission (create new plants)
  - `plants.view.123` - Permission to view specific plant with ID 123
  - `areas.create.plant.456` - Permission to create areas in specific plant 456
  - `assets.manage.sector.789` - Permission to manage assets (including routines) in specific sector 789
  - `assets.execute-routines.sector.789` - Permission to execute routines for assets in sector 789

## Inheritance Rules
1. **Administrator** - Has all permissions implicitly (combined Super Admin + Admin)
2. **Entity-Specific Permissions** - ALL permissions must reference specific IDs
3. **Scoped Permissions** - Limited to specific context and automatically cascade to ALL child elements
   - **Plant-scoped**: Applies to all areas, sectors, and assets within that specific plant
   - **Area-scoped**: Applies to all sectors and assets within that specific area  
   - **Sector-scoped**: Applies to all assets within that sector

### Cascade Examples:
- `assets.manage.area.5` grants manage permission to:
  - All assets directly in Area 5
  - All assets in every sector that belongs to Area 5
  - All routines belonging to those assets
- `assets.execute-routines.plant.1` grants routine execution permission for:
  - All assets in Plant 1's entire hierarchy
- `areas.create.plant.1` grants create permission in:
  - Ability to create areas within Plant 1 only

## Core System Permissions

### 1. User Management
```yaml
users:
  # User management (updated for V2)
  - users.viewAny                 # View user list
  - users.view                    # View user details
  - users.update                  # Update any user
  - users.update.owned            # Update own profile only
  - users.delete                 # Delete users
  - users.impersonate            # Login as another user
  - users.manage-permissions      # Assign/revoke permissions (respects scope)
  - users.manage-roles           # Assign/revoke roles
  
  # User invitation permissions (NEW IN V2)
  # Entity-scoped invitation permissions - dynamically created when entities are created:
  - users.invite.plant.[id]      # Invite users to specific plant (can grant permissions within plant scope)
  - users.invite.area.[id]       # Invite users to specific area (can grant permissions within area scope)
  - users.invite.sector.[id]     # Invite users to specific sector (can grant permissions within sector scope)
  
  # Notes on invitation permissions:
  # - Manager roles receive these permissions by default when assigned to entities
  # - Any user can be granted invitation permissions independently of their role
  # - Inviters can only grant permissions within their invitation permission scope
  # - Administrators have implicit permission to invite users globally
  
  # Invitation management
  - invitations.viewAny          # View all invitations
  - invitations.view             # View invitation details
  - invitations.revoke           # Revoke pending invitations
  - invitations.resend           # Resend invitation emails
```

### 2. Role Management
```yaml
roles:
  # Unchanged from V1
  - roles.viewAny                # View role list
  - roles.view                   # View role details
  - roles.create                 # Create custom roles
  - roles.update                 # Update role permissions
  - roles.delete                 # Delete custom roles (not system roles)
  - roles.assign                 # Assign roles to users
```

### 3. Asset Hierarchy

#### 3.1 Plants
```yaml
plants:
  # System-level permission (THE ONLY GLOBAL PERMISSION)
  - system.create-plants         # Ability to create new plants
  
  # Entity-specific permissions only (DYNAMIC - created when plant is created)
  # When Plant ID 123 is created, these permissions are automatically generated:
  - plants.view.123              # View specific plant 123
  - plants.update.123            # Update specific plant 123
  - plants.delete.123            # Delete specific plant 123
  - plants.manage-shifts.123     # Manage shifts for specific plant 123
```

#### 3.2 Areas
```yaml
areas:
  # NO GLOBAL PERMISSIONS - ALL SCOPED TO ENTITIES
  
  # Plant-scoped permissions (DYNAMIC - created when plant is created)
  # When Plant ID 123 is created:
  - areas.create.plant.123       # Create areas in specific plant 123
  - areas.viewAny.plant.123      # View all areas in specific plant 123
  
  # Area-specific permissions (DYNAMIC - created when area is created)
  # When Area ID 456 is created:
  - areas.view.456               # View specific area 456
  - areas.update.456             # Update specific area 456
  - areas.delete.456             # Delete specific area 456
```

#### 3.3 Sectors
```yaml
sectors:
  # NO GLOBAL PERMISSIONS - ALL SCOPED TO ENTITIES
  
  # Area-scoped permissions (DYNAMIC - created when area is created)
  # When Area ID 456 is created:
  - sectors.create.area.456      # Create sectors in specific area 456
  - sectors.viewAny.area.456     # View all sectors in specific area 456
  
  # Plant-scoped permissions (DYNAMIC - created when plant is created)
  # When Plant ID 123 is created:
  - sectors.viewAny.plant.123    # View all sectors in plant 123
  - sectors.create.plant.123     # Create sectors in any area of plant 123
  
  # Sector-specific permissions (DYNAMIC - created when sector is created)
  # When Sector ID 789 is created:
  - sectors.view.789             # View specific sector 789
  - sectors.update.789           # Update specific sector 789
  - sectors.delete.789           # Delete specific sector 789
```

#### 3.4 Assets (Including Routines & Executions)
```yaml
assets:
  # NO GLOBAL PERMISSIONS - ALL SCOPED TO ENTITIES
  
  # Sector-scoped permissions (DYNAMIC - created when sector is created)
  # When Sector ID 789 is created:
  - assets.viewAny.sector.789    # View assets in specific sector 789 (includes routines & executions)
  - assets.create.sector.789     # Create assets in specific sector 789
  - assets.manage.sector.789     # Full asset management in sector 789 (includes routine CRUD)
  - assets.execute-routines.sector.789  # Execute routines for assets in sector 789
  - assets.export.sector.789     # Export asset data/reports from sector 789 (includes routine data)
  
  # Area-scoped permissions (DYNAMIC - created when area is created)
  # When Area ID 456 is created:
  - assets.viewAny.area.456      # View all assets in area 456 (includes routines & executions)
  - assets.create.area.456       # Create assets anywhere in area 456
  - assets.manage.area.456       # Full asset management in area 456 (includes routine CRUD)
  - assets.execute-routines.area.456   # Execute routines for any asset in area 456
  - assets.export.area.456       # Export asset data/reports from area 456 (includes routine data)
  
  # Plant-scoped permissions (DYNAMIC - created when plant is created)
  # When Plant ID 123 is created:
  - assets.viewAny.plant.123     # View all assets in plant 123 (includes routines & executions)
  - assets.create.plant.123      # Create assets anywhere in plant 123
  - assets.manage.plant.123      # Full asset management in plant 123 (includes routine CRUD)
  - assets.execute-routines.plant.123   # Execute routines for any asset in plant 123
  - assets.import.plant.123      # Bulk import assets in plant 123
  - assets.export.plant.123      # Export asset data/reports from plant 123 (includes routine data)
  
  # Asset-specific permissions (DYNAMIC - created when asset is created)
  # When Asset ID 999 is created:
  - assets.view.999              # View specific asset 999 (includes its routines & executions)
  - assets.manage.999            # Full management of asset 999 (includes routine CRUD)
  - assets.execute-routines.999  # Execute routines for asset 999
  - assets.manage-qr.999         # Generate/manage QR code for asset 999
  
  # Notes on consolidated permissions:
  # - assets.view.* includes viewing the asset's routines and execution history
  # - assets.manage.* includes full CRUD operations on the asset's routines
  # - assets.execute-routines.* allows starting, completing, and approving routine executions
  # - assets.export.* includes exporting routine execution data and reports
```

#### 3.5 Asset Types (Shared Entity - Requires Validation)
```yaml
asset-types:
  # Entity-scoped only
  - asset-types.viewAny.plant.[id]    # View asset types used in plant
  - asset-types.create.plant.[id]     # Create asset types for plant
  - asset-types.update.[id]           # Update specific asset type (requires validation)
  - asset-types.delete.[id]           # Delete specific asset type (requires validation)
```

#### 3.6 Manufacturers (Shared Entity - Requires Validation)
```yaml
manufacturers:
  # Entity-scoped only
  - manufacturers.viewAny.plant.[id]  # View manufacturers used in plant
  - manufacturers.create.plant.[id]   # Create manufacturers for plant
  - manufacturers.update.[id]         # Update specific manufacturer (requires validation)
  - manufacturers.delete.[id]         # Delete specific manufacturer (requires validation)
```

### 4. Maintenance Management

#### 4.1 Forms - REMOVED IN V2
```yaml
# ALL FORM PERMISSIONS REMOVED
# Forms inherit permissions from their parent resources (Routines, Quality Inspections, etc.)
# Access to forms is determined by access to the resource that uses them
```

#### 4.2 Routines - CONSOLIDATED INTO ASSETS IN V2
```yaml
# ALL ROUTINE PERMISSIONS REMOVED
# Routines are now managed through asset permissions:
# - assets.view.* - View routines for the asset
# - assets.manage.* - Create/update/delete routines for the asset
# - assets.execute-routines.* - Execute routines
# - assets.export.* - Export routine data and reports
```

#### 4.3 Routine Executions - CONSOLIDATED INTO ASSETS IN V2
```yaml
# ALL ROUTINE EXECUTION PERMISSIONS REMOVED
# Routine executions are now managed through asset permissions:
# - assets.view.* - View execution history
# - assets.execute-routines.* - Start, complete, and approve executions
# - assets.export.* - Export execution data and reports
```

### 5. Reporting & Analytics - SIMPLIFIED IN V2
```yaml
# Report access is now implicit with view permissions:
# - If you can view assets, you can view asset reports (including routine reports)
# - If you can viewAny assets, you can view aggregate reports
# - Export permissions control the ability to download/export data and reports

# Special dashboard and compliance reports that span multiple resources:
system:
  - system.dashboard.view        # View executive dashboards (cross-functional data)
  - system.compliance.view       # View compliance reports (regulatory requirements)
```

### 6. System Administration
```yaml
system:
  # Limited system permissions (most are entity-scoped now)
  - system.settings.view         # View system settings
  - system.settings.update       # Update system settings
  - system.audit.view           # View audit trails
  - system.backup.create        # Create system backups
  - system.backup.restore       # Restore from backups
  - system.maintenance-mode     # Enable/disable maintenance mode
  
  # Bulk operations (NEW IN V2)
  - system.bulk-import-assets   # Bulk import assets (respects entity permissions)
  - system.bulk-export-assets   # Bulk export assets (respects entity permissions)
```

### 7. Shift Management (Shared Entity - Requires Validation)
```yaml
shifts:
  # Entity-scoped only
  - shifts.viewAny.plant.[id]   # View shifts in specific plant
  - shifts.create.plant.[id]    # Create shifts for specific plant
  - shifts.update.[id]          # Update specific shift (requires validation)
  - shifts.delete.[id]          # Delete specific shift (requires validation)
  - shifts.manage.plant.[id]    # Manage all shifts in specific plant
```

## Dynamic Permission Examples

### When Plant "Springfield Manufacturing" (ID: 123) is created:
```yaml
Automatically generated permissions:
  # Plant-specific
  - plants.view.123
  - plants.update.123
  - plants.delete.123
  - plants.manage-shifts.123
  
  # User invitation for this plant
  - users.invite.plant.123      # Ability to invite users to this plant
  
  # Area management in this plant
  - areas.create.plant.123
  - areas.viewAny.plant.123
  
  # Sector management in this plant
  - sectors.viewAny.plant.123
  - sectors.create.plant.123
  
  # Asset management in this plant (includes routines)
  - assets.viewAny.plant.123
  - assets.create.plant.123
  - assets.manage.plant.123
  - assets.execute-routines.plant.123
  - assets.import.plant.123
  - assets.export.plant.123
  
  # Shift management in this plant
  - shifts.viewAny.plant.123
  - shifts.create.plant.123
  - shifts.manage.plant.123
  
  # Shared entities for this plant
  - asset-types.viewAny.plant.123
  - asset-types.create.plant.123
  - manufacturers.viewAny.plant.123
  - manufacturers.create.plant.123
```

### When Area "Production Floor" (ID: 456) is created in Plant 123:
```yaml
Automatically generated permissions:
  # Area-specific
  - areas.view.456
  - areas.update.456
  - areas.delete.456
  
  # User invitation for this area
  - users.invite.area.456        # Ability to invite users to this area
  
  # Sector management in this area
  - sectors.create.area.456
  - sectors.viewAny.area.456
  
  # Asset management in this area (includes routines)
  - assets.viewAny.area.456
  - assets.create.area.456
  - assets.manage.area.456
  - assets.execute-routines.area.456
  - assets.export.area.456
```

### When Sector "Assembly Line 1" (ID: 789) is created in Area 456:
```yaml
Automatically generated permissions:
  # Sector-specific
  - sectors.view.789
  - sectors.update.789
  - sectors.delete.789
  
  # User invitation for this sector
  - users.invite.sector.789      # Ability to invite users to this sector
  
  # Asset management in this sector (includes routines)
  - assets.viewAny.sector.789
  - assets.create.sector.789
  - assets.manage.sector.789
  - assets.execute-routines.sector.789
  - assets.export.sector.789
```

## Permission Inheritance Matrix (V2)

### Hierarchical Inheritance (Cascading)
1. **Plant-level permissions** automatically grant corresponding permissions for ALL child entities:
   - All areas within that plant
   - All sectors within those areas  
   - All assets within those sectors
   - All routines belonging to those assets
   - All routine executions for those assets
2. **Area-level permissions** automatically grant corresponding permissions for ALL child entities:
   - All sectors within that area
   - All assets within those sectors
   - All routines belonging to those assets
   - All routine executions for those assets
3. **Sector-level permissions** automatically grant corresponding permissions for:
   - All assets within that sector
   - All routines belonging to those assets
   - All routine executions for those assets

### NO GLOBAL ACCESS
- The ONLY global permission is `system.create-plants`
- ALL other permissions MUST reference specific entity IDs
- There is NO way to grant blanket access to all plants, areas, or sectors

## Shared Entity Validation

### Entities Requiring Validation
When updating or deleting these shared entities, the system validates that the user has permissions for ALL affected assets:

1. **Shifts** - Used across multiple plants/areas/sectors
2. **Asset Types** - Shared classification across assets
3. **Manufacturers** - Shared across assets

### Validation Process
```yaml
User attempts to update Shift ID 100:
  1. System identifies all assets using Shift 100
  2. System checks if user has update permission for ALL those assets
  3. If YES: Update proceeds
  4. If NO: System offers to create a copy for accessible assets only
```

## Role-Based Inheritance (V2)

### Default System Roles

```yaml
Administrator:
  - Description: Combined Super Admin + Admin role
  - Default: All permissions (implicit)
  - Special: System ensures at least one always exists
  - Special: Only Administrators can assign Administrator role
  - Editable: No (system protected)
  - Deletable: No (system protected)

Plant Manager:
  - Default: system.create-plants, system.bulk-import-assets, system.bulk-export-assets
  - Must be assigned specific plant permissions after plant creation
  - Example after assignment to Plant 123:
    - All *.plant.123 permissions
    - users.invite.plant.123 (invitation permission for this plant)
    - Cascade access to all areas, sectors, assets in Plant 123
    - Full routine management and execution for Plant 123
  - Can create new plants (auto-assigned permissions)
  - Invitation capability through users.invite.plant.[id] permission
  - Editable: Yes
  - Deletable: Yes

Area Manager:
  - Default: None (all permissions must be assigned)
  - Must be assigned specific area permissions after area creation
  - Example after assignment to Area 456:
    - All *.area.456 permissions
    - users.invite.area.456 (invitation permission for this area)
    - areas.create.plant.[id] for their plant
    - Cascade access to all sectors, assets in Area 456
    - Full routine management and execution for Area 456
  - Invitation capability through users.invite.area.[id] permission
  - Editable: Yes
  - Deletable: Yes

Sector Manager:
  - Default: None (all permissions must be assigned)
  - Must be assigned specific sector permissions
  - Example after assignment to Sector 789:
    - All *.sector.789 permissions
    - users.invite.sector.789 (invitation permission for this sector)
    - Cascade access to all assets in Sector 789
    - Full routine management for Sector 789
  - Invitation capability through users.invite.sector.[id] permission
  - Editable: Yes
  - Deletable: Yes

Maintenance Supervisor:
  - Default: None (all permissions must be assigned)
  - Typically assigned routine execution permissions for specific areas
  - Example for Area 456:
    - assets.viewAny.area.456
    - assets.execute-routines.area.456
  - Cannot invite users (not a manager role)
  - Editable: Yes
  - Deletable: Yes

Technician:
  - Default: None (all permissions must be assigned)
  - Typically assigned execution permissions for specific assets
  - Example for specific assets:
    - assets.view.[id]
    - assets.execute-routines.[id]
  - Editable: Yes
  - Deletable: Yes

Viewer:
  - Default: None (all permissions must be assigned)
  - Typically assigned view-only permissions for specific entities
  - Example for Plant 123:
    - plants.view.123
    - areas.viewAny.plant.123
    - assets.viewAny.plant.123 (includes viewing routines and executions)
  - Editable: Yes
  - Deletable: Yes
```

## Implementation Notes for V2

### 1. Permission Creation Workflow
```
User creates Entity → Observer triggered → Permissions auto-generated → Creator granted permissions
```

### 2. Permission Deletion Workflow
```
User deletes Entity → Observer triggered → All entity permissions removed → Users lose access
```

### 3. Shared Entity Update Workflow
```
User updates Shared Entity → Validation Service checks all affected assets → 
  If has permissions: Update proceeds
  If lacks permissions: Offer to create copy for accessible assets
```

### 4. Administrator Role Protection
```
User attempts to remove Administrator role → 
  System checks if other Administrators exist →
  If YES: Removal allowed
  If NO: Removal blocked (at least one required)
```

### 5. Permission Assignment Best Practices
- Always verify entity exists before assigning permissions
- Use batch assignment when granting multiple permissions for same entity
- Leverage role templates for common permission sets
- Regular integrity checks to ensure permissions reference valid entities
- Audit log all permission changes, especially Administrator assignments

### 6. Report Access Workflow
```
User requests report → System checks view permission for underlying data →
  If has view permission: Report is displayed (including routine reports)
  If lacks view permission: Access denied
  
User requests report export → System checks export permission →
  If has export permission: Download allowed (including routine data)
  If lacks export permission: Export denied (but can still view report if has view permission)
```

### 7. Permission-Based Invitation Workflow
```
User initiates invitation → System validates user has invitation permission (users.invite.*) →
  System determines user's invitation scope from permissions → 
  Invitation form shows only permissions within allowed scope →
  User selects permissions → System validates all permissions are within scope →
  Invitation sent with scoped permissions → New user joins with limited access

User grants permissions to existing user → System validates user's invitation permissions →
  Only permissions within invitation scope are granted → Out-of-scope permissions are rejected →
  Audit log records the grant with user's invitation permissions and scope

Examples:
- User with users.invite.plant.123 can invite users and grant any permissions for Plant 123
- User with users.invite.area.456 can invite users and grant any permissions for Area 456
- User with users.invite.sector.789 can invite users and grant any permissions for Sector 789
```

### 8. Routine Management Workflow
```
User manages routines → System checks asset management permissions →
  If has assets.manage.*: Can create/update/delete routines
  If has assets.view.*: Can only view routines
  
User executes routine → System checks execution permissions →
  If has assets.execute-routines.*: Can start, complete, and approve executions
  If lacks permission: Execution denied
```

### 9. Migration Considerations
- Merge Super Administrator users into Administrator role
- Convert all global permissions to entity-specific
- Remove all form-related permissions
- **Remove all routine and routine-execution permissions**
- **Convert existing routine permissions to asset management permissions**
- **Convert existing execution permissions to asset execution permissions**
- Convert report permissions to implicit access with view permissions
- Add export permissions where report export was previously allowed
- Generate permissions for all existing entities
- Provide bulk permission assignment tools
- Complete audit trail of migration process 

### Permission-Based Invitation Examples

#### Example 1: User with Plant Invitation Permission
```yaml
User with users.invite.plant.123 permission invites a new technician:
  Available permissions to grant (limited to Plant 123):
    - assets.view.plant.123
    - assets.viewAny.plant.123
    - assets.execute-routines.plant.123
    - Any area/sector/asset permissions within Plant 123
  
  Cannot grant:
    - Permissions for Plant 456 (outside their invitation scope)
    - System-level permissions
    - Administrator role
```

#### Example 2: User with Area Invitation Permission
```yaml
User with users.invite.area.456 permission invites a maintenance supervisor:
  Available permissions to grant (limited to Area 456):
    - areas.view.456
    - assets.viewAny.area.456
    - assets.execute-routines.area.456
    - Any sector/asset permissions within Area 456
  
  Cannot grant:
    - Permissions for Area 789 (outside their invitation scope)
    - Plant-level permissions for Plant 123
    - Permissions for other plants
```

#### Example 3: User with Sector Invitation Permission
```yaml
User with users.invite.sector.789 permission grants permissions to existing user:
  Available permissions to grant (limited to Sector 789):
    - sectors.view.789
    - assets.viewAny.sector.789
    - assets.manage.sector.789
    - assets.execute-routines.sector.789
    - Any specific asset permissions within Sector 789
  
  Cannot grant:
    - Permissions for other sectors
    - Area or plant-level permissions
    - Roles (only Administrators can assign roles)
``` 
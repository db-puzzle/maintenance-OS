# Comprehensive Permissions List

## Overview
This document defines all permissions in the maintenance OS system, their granularity levels, and inheritance structure. Permissions follow a hierarchical pattern where higher-level permissions automatically grant lower-level permissions within the same resource scope.

## Permission Naming Convention
- Format: `resource.action[.scope[.id]]`
- Examples:
  - `assets.view` - Global permission to view any asset
  - `assets.view.plant.123` - Permission to view assets in plant 123
  - `assets.view.owned` - Permission to view only owned assets

## Inheritance Rules
1. **Super Admin** - Has all permissions implicitly
2. **Global Permissions** - Grant access across all scopes
3. **Scoped Permissions** - Limited to specific context (plant, area, sector) and automatically cascade to ALL child elements
   - **Plant-scoped**: Applies to all areas, sectors, and assets within that plant
   - **Area-scoped**: Applies to all sectors and assets within that area
   - **Sector-scoped**: Applies to all assets within that sector

### Cascade Examples:
- `assets.update.area.5` grants update permission to:
  - All assets directly in Area 5
  - All assets in every sector that belongs to Area 5
- `assets.create.plant.1` grants create permission in:
  - All areas within Plant 1
  - All sectors within those areas
  - Ability to create assets anywhere in Plant 1's hierarchy

## Core System Permissions

### 1. User Management
```yaml
users:
  # Global permissions
  - users.viewAny                 # View user list
  - users.view                    # View user details
  - users.create                  # Create new users (replaced by invite)
  - users.invite                  # Send user invitations
  - users.update                  # Update any user
  - users.update.owned            # Update own profile only
  - users.delete                  # Delete users
  - users.impersonate            # Login as another user
  - users.manage-permissions      # Assign/revoke permissions
  - users.manage-roles           # Assign/revoke roles
  - users.grant-super-admin      # Grant Super Administrator privileges (only for Super Admins)
  - users.revoke-super-admin     # Revoke Super Administrator privileges (only for Super Admins)
  
  # Invitation specific
  - invitations.viewAny          # View all invitations
  - invitations.view             # View invitation details
  - invitations.create           # Send new invitations
  - invitations.revoke           # Revoke pending invitations
  - invitations.resend           # Resend invitation emails
```

### 2. Role Management
```yaml
roles:
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
  # Global permissions
  - plants.viewAny               # View all plants
  - plants.view                  # View plant details
  - plants.create                # Create new plants
  - plants.update                # Update plant information
  - plants.delete                # Delete plants
  - plants.manage-shifts         # Manage plant shifts
  
  # Scoped permissions (per plant)
  - plants.view.[id]             # View specific plant
  - plants.update.[id]           # Update specific plant
  - plants.manage-shifts.[id]    # Manage shifts for specific plant
```

#### 3.2 Areas
```yaml
areas:
  # Global permissions
  - areas.viewAny                # View all areas
  - areas.view                   # View area details
  - areas.create                 # Create areas in any plant
  - areas.update                 # Update any area
  - areas.delete                 # Delete any area
  
  # Plant-scoped permissions
  - areas.viewAny.plant.[id]     # View areas in specific plant
  - areas.view.plant.[id]        # View area details in specific plant
  - areas.create.plant.[id]      # Create areas in specific plant
  - areas.update.plant.[id]      # Update areas in specific plant
  - areas.delete.plant.[id]      # Delete areas in specific plant
  
  # Area-specific permissions
  - areas.view.[id]              # View specific area
  - areas.update.[id]            # Update specific area
  - areas.delete.[id]            # Delete specific area
```

#### 3.3 Sectors
```yaml
sectors:
  # Global permissions
  - sectors.viewAny              # View all sectors
  - sectors.view                 # View sector details
  - sectors.create               # Create sectors in any area
  - sectors.update               # Update any sector
  - sectors.delete               # Delete any sector
  
  # Area-scoped permissions
  - sectors.viewAny.area.[id]    # View sectors in specific area
  - sectors.view.area.[id]       # View sector details in specific area
  - sectors.create.area.[id]     # Create sectors in specific area
  - sectors.update.area.[id]     # Update sectors in specific area
  - sectors.delete.area.[id]     # Delete sectors in specific area
  
  # Plant-scoped permissions (inherited)
  - sectors.viewAny.plant.[id]   # View all sectors in a plant
  - sectors.create.plant.[id]    # Create sectors in any area of a plant
  - sectors.update.plant.[id]    # Update sectors in a plant
  - sectors.delete.plant.[id]    # Delete sectors in a plant
  
  # Sector-specific permissions
  - sectors.view.[id]            # View specific sector
  - sectors.update.[id]          # Update specific sector
  - sectors.delete.[id]          # Delete specific sector
```

#### 3.4 Assets
```yaml
assets:
  # Global permissions
  - assets.viewAny               # View all assets
  - assets.view                  # View asset details
  - assets.create                # Create assets anywhere
  - assets.update                # Update any asset
  - assets.delete                # Delete any asset
  - assets.import                # Bulk import assets
  - assets.export                # Export asset data
  - assets.manage-qr             # Generate/manage QR codes
  
  # Sector-scoped permissions
  - assets.viewAny.sector.[id]   # View assets in specific sector
  - assets.view.sector.[id]      # View asset details in specific sector
  - assets.create.sector.[id]    # Create assets in specific sector
  - assets.update.sector.[id]    # Update assets in specific sector
  - assets.delete.sector.[id]    # Delete assets in specific sector
  
  # Area-scoped permissions (inherited)
  - assets.viewAny.area.[id]     # View all assets in an area
  - assets.create.area.[id]      # Create assets in any sector of an area
  - assets.update.area.[id]      # Update assets in an area
  - assets.delete.area.[id]      # Delete assets in an area
  
  # Plant-scoped permissions (inherited)
  - assets.viewAny.plant.[id]    # View all assets in a plant
  - assets.create.plant.[id]     # Create assets anywhere in a plant
  - assets.update.plant.[id]     # Update assets in a plant
  - assets.delete.plant.[id]     # Delete assets in a plant
  
  # Asset-specific permissions
  - assets.view.[id]             # View specific asset
  - assets.update.[id]           # Update specific asset
  - assets.delete.[id]           # Delete specific asset
  
  # Ownership-based permissions
  - assets.view.owned            # View only assets created by user
  - assets.update.owned          # Update only owned assets
  - assets.delete.owned          # Delete only owned assets
```

#### 3.5 Asset Types
```yaml
asset-types:
  - asset-types.viewAny          # View all asset types
  - asset-types.view             # View asset type details
  - asset-types.create           # Create new asset types
  - asset-types.update           # Update asset types
  - asset-types.delete           # Delete asset types
```

#### 3.6 Manufacturers
```yaml
manufacturers:
  - manufacturers.viewAny        # View all manufacturers
  - manufacturers.view           # View manufacturer details
  - manufacturers.create         # Create new manufacturers
  - manufacturers.update         # Update manufacturers
  - manufacturers.delete         # Delete manufacturers
```

### 4. Maintenance Management

#### 4.1 Forms
```yaml
forms:
  # Global permissions
  - forms.viewAny                # View all forms
  - forms.view                   # View form details
  - forms.create                 # Create new forms
  - forms.update                 # Update forms
  - forms.delete                 # Delete forms
  - forms.publish                # Publish form versions
  - forms.archive                # Archive forms
  
  # Version management
  - forms.versions.create        # Create new versions
  - forms.versions.view          # View version history
  - forms.versions.restore       # Restore old versions
  
  # Ownership permissions
  - forms.view.owned             # View only owned forms
  - forms.update.owned           # Update only owned forms
  - forms.delete.owned           # Delete only owned forms
```

#### 4.2 Routines
```yaml
routines:
  # Global permissions
  - routines.viewAny             # View all routines
  - routines.view                # View routine details
  - routines.create              # Create routines
  - routines.update              # Update routines
  - routines.delete              # Delete routines
  - routines.assign              # Assign routines to assets
  - routines.schedule            # Set routine schedules
  
  # Plant-scoped permissions
  - routines.viewAny.plant.[id]  # View routines in plant
  - routines.create.plant.[id]   # Create routines for plant
  - routines.update.plant.[id]   # Update routines in plant
  - routines.delete.plant.[id]   # Delete routines in plant
  - routines.assign.plant.[id]   # Assign routines in plant
  
  # Ownership permissions
  - routines.view.owned          # View only owned routines
  - routines.update.owned        # Update only owned routines
  - routines.delete.owned        # Delete only owned routines
```

#### 4.3 Routine Executions
```yaml
routine-executions:
  # Global permissions
  - routine-executions.viewAny           # View all routine executions
  - routine-executions.view              # View routine execution details
  - routine-executions.create            # Start new routine executions
  - routine-executions.update            # Update routine execution data
  - routine-executions.complete          # Mark routine executions as complete
  - routine-executions.approve           # Approve completed routine executions
  - routine-executions.reject            # Reject routine executions
  - routine-executions.export            # Export routine execution data
  
  # Plant-scoped permissions
  - routine-executions.viewAny.plant.[id]    # View routine executions in plant
  - routine-executions.view.plant.[id]       # View routine execution details in plant
  - routine-executions.create.plant.[id]     # Start routine executions in plant
  - routine-executions.complete.plant.[id]   # Complete routine executions in plant
  - routine-executions.approve.plant.[id]    # Approve routine executions in plant
  
  # Area-scoped permissions
  - routine-executions.viewAny.area.[id]     # View routine executions in area
  - routine-executions.create.area.[id]      # Start routine executions in area
  - routine-executions.complete.area.[id]    # Complete routine executions in area
  
  # Asset-specific permissions
  - routine-executions.view.asset.[id]       # View routine executions for specific asset
  - routine-executions.create.asset.[id]     # Start routine execution for specific asset
  
  # Ownership permissions
  - routine-executions.view.assigned         # View only assigned routine executions
  - routine-executions.complete.assigned     # Complete only assigned routine executions
```

### 5. Reporting & Analytics
```yaml
reports:
  # Global permissions
  - reports.view                 # View all reports
  - reports.create               # Create custom reports
  - reports.export               # Export report data
  - reports.schedule             # Schedule automatic reports
  
  # Plant-scoped permissions
  - reports.view.plant.[id]      # View reports for specific plant
  - reports.create.plant.[id]    # Create reports for specific plant
  
  # Report types
  - reports.maintenance.view     # View maintenance reports
  - reports.assets.view          # View asset reports
  - reports.compliance.view      # View compliance reports
  - reports.performance.view     # View performance reports
```

### 6. System Administration
```yaml
system:
  - system.settings.view         # View system settings
  - system.settings.update       # Update system settings
  - system.logs.view            # View system logs
  - system.logs.export          # Export system logs
  - system.audit.view           # View audit trails
  - system.backup.create        # Create system backups
  - system.backup.restore       # Restore from backups
  - system.maintenance-mode     # Enable/disable maintenance mode
```

### 7. Shift Management
```yaml
shifts:
  # Global permissions
  - shifts.viewAny              # View all shifts
  - shifts.view                 # View shift details
  - shifts.create               # Create shifts
  - shifts.update               # Update shifts
  - shifts.delete               # Delete shifts
  
  # Plant-scoped permissions
  - shifts.viewAny.plant.[id]   # View shifts in plant
  - shifts.manage.plant.[id]    # Manage shifts in plant
```

## Permission Inheritance Matrix

### Hierarchical Inheritance (Cascading)
1. **Plant-level permissions** automatically grant corresponding permissions for ALL child entities:
   - All areas within that plant
   - All sectors within those areas  
   - All assets within those sectors
2. **Area-level permissions** automatically grant corresponding permissions for ALL child entities:
   - All sectors within that area
   - All assets within those sectors
3. **Sector-level permissions** automatically grant corresponding permissions for:
   - All assets within that sector

### Detailed Cascade Examples

#### Example 1: Plant-Level Permission
`assets.update.plant.1` grants the ability to update:
- Any asset in Plant 1, regardless of its area or sector
- Assets in Area A (which belongs to Plant 1)
- Assets in Area B (which belongs to Plant 1)
- Assets in Sector X (which belongs to Area A in Plant 1)
- Assets in Sector Y (which belongs to Area B in Plant 1)

#### Example 2: Area-Level Permission
`assets.update.area.5` grants the ability to update:
- Any asset directly associated with Area 5
- Any asset in Sector 10 (if Sector 10 belongs to Area 5)
- Any asset in Sector 11 (if Sector 11 belongs to Area 5)
- Does NOT grant access to assets in Area 6, even if Area 6 is in the same plant

#### Example 3: Mixed Permissions
A user with these permissions:
- `assets.view.plant.1`
- `assets.update.area.5` (where Area 5 is in Plant 1)
- `assets.delete.sector.20` (where Sector 20 is in Area 5)

Can perform:
- View any asset in Plant 1
- Update any asset in Area 5 or its sectors
- Delete only assets in Sector 20
- Cannot update assets in other areas of Plant 1
- Cannot delete assets in other sectors of Area 5

### Role-Based Inheritance

#### Default System Roles
These roles are created during system initialization but can be modified or deleted by users with `roles.update` and `roles.delete` permissions. Users can also create entirely custom roles using `roles.create` permission.

```yaml
Super Administrator:
  - All permissions (implicit)
  - Cannot be deleted or modified (system protected)

Administrator:
  - Default: All permissions except system.*
  - Editable: Yes
  - Deletable: Yes

Plant Manager:
  - Default: All plant-scoped permissions for assigned plants
  - Default: reports.*, routine-executions.approve.plant.[assigned]
  - Editable: Yes
  - Deletable: Yes

Area Supervisor:
  - Default: All area-scoped permissions for assigned areas
  - Default: routine-executions.approve.area.[assigned]
  - Editable: Yes
  - Deletable: Yes

Technician:
  - Default: routine-executions.view.assigned, routine-executions.complete.assigned
  - Default: assets.view, routines.view
  - Default Optional: assets.update for maintenance tasks
  - Editable: Yes
  - Deletable: Yes

Viewer:
  - Default: *.viewAny, *.view (read-only access)
  - Default Excludes: All create, update, delete, manage permissions
  - Editable: Yes
  - Deletable: Yes
```

#### Custom Roles
Users with `roles.create` permission can create unlimited custom roles with any combination of permissions from the system. Custom roles can:
- Have any name (must be unique)
- Include any combination of available permissions
- Be assigned to any number of users
- Be modified by users with `roles.update` permission
- Be deleted by users with `roles.delete` permission

Example custom roles that organizations might create:
- Quality Inspector
- Maintenance Planner
- Shift Supervisor
- External Contractor
- Auditor

## Permission Groups (For UI Organization)

These groupings are suggested for organizing permissions in the user interface when creating or editing roles. They help users understand related permissions but do not restrict how permissions can be combined in custom roles.

### 1. Asset Management
- All plant, area, sector, asset, asset-type, and manufacturer permissions
- Useful for: Maintenance planners, asset managers, reliability engineers

### 2. Maintenance Operations
- All form, routine, and routine-execution permissions
- Useful for: Technicians, supervisors, maintenance coordinators

### 3. User & Access Control
- All user, role, and invitation permissions
- Useful for: System administrators, HR managers

### 4. Reporting & Analytics
- All report permissions
- Useful for: Managers, analysts, auditors

### 5. System Administration
- All system permissions
- Useful for: IT administrators, system operators

### 6. Operational Management
- All shift permissions
- Useful for: Shift supervisors, operations managers

**Note**: When creating custom roles, permissions can be mixed and matched from any group to create roles that fit your organization's specific needs.

## Role Management Flexibility

### System-Protected Elements
- **Super Administrator Role**: Cannot be deleted or modified to ensure system integrity
- **Core Permissions**: The permission definitions themselves cannot be deleted (only roles can be customized)
- **First User**: Always has Super Administrator privileges that cannot be revoked by others (but can grant these privileges to additional users)
- **Super Admin Transfer**: Only existing Super Administrators can grant Super Administrator privileges to other users using `users.grant-super-admin` permission

### Customization Capabilities
1. **Edit Default Roles**
   - Add or remove permissions from any default role (except Super Administrator)
   - Rename default roles to match your organization's terminology
   - Adjust role descriptions and metadata

2. **Create Custom Roles**
   - Build roles from scratch with any combination of permissions
   - Create role hierarchies (roles can inherit from other roles)
   - Define role-specific constraints or conditions

3. **Delete Roles**
   - Remove any non-system role (all except Super Administrator)
   - Users assigned to deleted roles will lose those permissions
   - System prompts to reassign users before deletion

4. **Permission Assignment**
   - Assign multiple roles to a single user
   - Grant individual permissions directly to users (outside of roles)
   - Set temporary permissions with expiration dates

### Best Practices for Custom Roles
- Start with a default role and modify it rather than building from scratch
- Use descriptive names that reflect the job function
- Document the purpose of custom roles for future administrators
- Regularly audit custom roles to ensure they match current needs
- Consider creating template roles for common contractor or temporary positions

## Implementation Notes

1. **Performance Optimization**
   - Cache permission checks per request
   - Use database indexes on scope fields
   - Implement eager loading for permission relationships

2. **Security Considerations**
   - Validate scope IDs to prevent unauthorized access
   - Log all permission changes
   - Implement permission change notifications

3. **Future Extensibility**
   - Permission structure supports multi-tenancy
   - Can add custom scopes without breaking existing permissions
   - Supports dynamic permission creation for custom modules

4. **Super Administrator Management**
   - The first user to sign up automatically becomes a Super Administrator
   - Super Administrators can grant the same privileges to other users via `users.grant-super-admin`
   - Super Administrators can revoke Super Admin privileges from other users via `users.revoke-super-admin`
   - All Super Admin privilege grants and revocations are tracked in an audit table
   - Multiple Super Administrators can exist simultaneously
   - System enforces at least one Super Administrator at all times:
     - Revocation attempts that would leave zero Super Admins are rejected with an error
     - The system counts active Super Admins before allowing revocation
     - This protection applies to all Super Admins (including the first user) 
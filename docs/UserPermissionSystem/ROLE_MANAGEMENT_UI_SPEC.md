# Role Management UI Specification

## Table of Contents
1. [Overview](#overview)
2. [Access and Navigation](#access-and-navigation)
3. [Page Layout](#page-layout)
4. [Role List View](#role-list-view)
5. [Role Details View](#role-details-view)
6. [Create/Edit Role View](#createedit-role-view)
7. [Permission Assignment Interface](#permission-assignment-interface)
8. [User Assignment Interface](#user-assignment-interface)
9. [Audit Trail View](#audit-trail-view)
10. [Security Features](#security-features)
11. [Error Handling](#error-handling)
12. [Performance Considerations](#performance-considerations)
13. [Technical Implementation](#technical-implementation)

## Overview

The Role Management page provides a comprehensive interface for managing roles and their associated permissions within the maintenance OS system. This specification defines the UI/UX requirements for administrators and authorized users to create, modify, and manage roles effectively.

### Key Features
- View and manage all system and custom roles
- Assign/remove permissions to/from roles
- Assign roles to users with entity-specific scope
- Manage multiple entity assignments per user-role combination
- View role usage statistics and entity coverage
- Track role changes through audit logs
- Support for entity-scoped permissions
- Real-time permission validation

### Important Concepts
1. **Roles vs Role Assignments**: 
   - A **Role** defines a set of permissions (e.g., "Plant Manager")
   - A **Role Assignment** assigns that role to a user at a specific entity (e.g., "John is Plant Manager at Springfield")
   - Users can have the same role assigned to multiple entities

2. **Permission Types**:
   - **Global Permissions**: Apply regardless of entity (e.g., `system.create-plants`)
   - **Entity-Scoped Permissions**: Require entity assignment (e.g., `plants.view.[id]`)
   - Entity-scoped permissions use `[id]` placeholder in role definition

3. **Entity Hierarchy**:
   - Plant → Area → Sector → Asset
   - Permissions cascade down the hierarchy
   - Assignment at higher level grants access to all children

### User Permissions Required
- `roles.viewAny` - View role list
- `roles.view` - View role details
- `roles.create` - Create new roles
- `roles.update` - Update existing roles
- `roles.delete` - Delete custom roles
- `roles.assign` - Assign roles to users

## Access and Navigation

### Primary Access Points
1. **Main Navigation**: Settings → Users → Roles
2. **Quick Access**: User Management page → "Manage Roles" button
3. **Breadcrumb**: Home → Settings → Users → Roles

### URL Structure
- List View: `/settings/roles`
- Details View: `/settings/roles/{id}`
- Create View: `/settings/roles/create`
- Edit View: `/settings/roles/{id}/edit`

## Page Layout

### Header Section
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Roles                                                       │
│                                                                 │
│ Manage system and custom roles with their permissions          │
│                                                                 │
│ [Search roles...] [Filter: All ▼] [+ Create Role]             │
└─────────────────────────────────────────────────────────────────┘
```

### Main Content Area
- Left Panel: Role list with filters
- Right Panel: Role details/editing interface
- Bottom: Pagination controls

## Role List View

### List Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ System Roles                                                    │
├─────────────────────────────────────────────────────────────────┤
│ ⚡ Administrator                              [View Details →]  │
│    Full system access • 2 users • System Role                  │
│    ✓ Global role - no entity assignment required               │
├─────────────────────────────────────────────────────────────────┤
│ 🏭 Plant Manager                             [View Details →]  │
│    Plant-level management • 5 users • 8 assignments            │
│    📍 Entity-based (Plant) • 3/4 plants covered               │
│    System Role • Last assigned: 2 days ago                    │
├─────────────────────────────────────────────────────────────────┤
│ 🏢 Area Manager                              [View Details →]  │
│    Area-level management • 12 users • 18 assignments           │
│    📍 Entity-based (Area) • 15/22 areas covered              │
│    System Role • Last assigned: 1 week ago                    │
├─────────────────────────────────────────────────────────────────┤
│ 🏗️ Sector Manager                           [View Details →]  │
│    Sector-level management • 8 users • 15 assignments          │
│    📍 Entity-based (Sector) • 15/45 sectors covered          │
│    System Role • Last assigned: 3 days ago                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Custom Roles                                                    │
├─────────────────────────────────────────────────────────────────┤
│ 🔧 Equipment Specialist                      [⋮]               │
│    Custom maintenance role • 8 users • 12 assignments          │
│    📍 Entity-based (Asset) • Created by John Doe              │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Report Viewer                            [⋮]               │
│    Read-only access • 15 users • No assignments required      │
│    ✓ Global role • Created by Jane Smith                      │
└─────────────────────────────────────────────────────────────────┘
```

### Role Card Components
Each role displays:
- **Icon**: Visual indicator of role type
- **Name**: Role display name
- **Description**: Brief role description
- **Entity Requirements**: Shows if role requires entity assignment
- **Metadata**:
  - User count (unique users, not assignments)
  - Assignment count (total entity assignments)
  - Role type (System/Custom)
  - Creator (for custom roles)
  - Last modified date
- **Quick Stats** (for entity-based roles):
  - Entity coverage (e.g., "3 of 4 plants covered")
  - Most recent assignment
- **Actions**:
  - View Details
  - Edit (if allowed)
  - Duplicate
  - Delete (custom roles only)

### Filters and Search
```
Filters:
├── Role Type
│   ├── [ ] All Roles
│   ├── [ ] System Roles
│   └── [ ] Custom Roles
├── Status
│   ├── [ ] Active
│   └── [ ] Inactive
└── Permission Count
    ├── [ ] 0-10 permissions
    ├── [ ] 11-50 permissions
    └── [ ] 50+ permissions
```

## Role Details View

### Layout Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Back to Roles           [Edit Role] [Duplicate] [Delete]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏭 Plant Manager                                              │
│  ━━━━━━━━━━━━━━━                                              │
│                                                                 │
│  Description: Manages all operations within assigned plants     │
│  Type: System Role                                             │
│  Created: Jan 15, 2024                                         │
│  Last Modified: Sep 25, 2024 by Admin User                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Tabs: [Overview] [Permissions (47)] [Users (5)] [History]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Tab Content Area]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Overview Tab
Displays:
- Role type (System/Custom)
- Entity assignment requirements
- Default permissions (non-entity specific)
- Total users with this role
- Total entity assignments

```
┌─────────────────────────────────────────────────────────────────┐
│ Role Overview                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Role Type: System Role                                         │
│ Entity-Based: Yes (Plant level)                                │
│                                                                 │
│ Default Permissions (7)                                        │
│ These permissions are granted regardless of entity assignment: │
│ • system.create-plants                                         │
│ • system.bulk-import-assets                                    │
│ • system.bulk-export-assets                                    │
│ • users.viewAny                                                │
│ • users.view                                                   │
│ • roles.viewAny                                                │
│ • roles.view                                                   │
│                                                                 │
│ Entity-Scoped Permissions (40)                                 │
│ These permissions are granted when assigned to a plant:        │
│ • plants.view.[id]                                             │
│ • plants.update.[id]                                           │
│ • areas.create.plant.[id]                                      │
│ • ... and 37 more                                              │
│                                                                 │
│ Usage Statistics                                               │
│ ────────────────                                              │
│ Total Users: 5                                                 │
│ Total Assignments: 8                                           │
│ Plants Covered: 3 of 4                                         │
│                                                                 │
│ Assignment Distribution:                                       │
│ • Springfield Manufacturing: 2 users                           │
│ • Chicago Production: 3 users                                  │
│ • Detroit Assembly: 1 user                                     │
│ • Boston Facility: No assignments                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Permissions Tab
```
┌─────────────────────────────────────────────────────────────────┐
│ Permissions (47)                        [+ Add Permissions]     │
├─────────────────────────────────────────────────────────────────┤
│ Search permissions...                   [Group by: Resource ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ▼ System Permissions (3)                                       │
│   ☑ system.create-plants              Create new plants        │
│   ☑ system.bulk-import-assets         Bulk import assets       │
│   ☑ system.bulk-export-assets         Bulk export assets       │
│                                                                 │
│ ▼ User Management (5)                                          │
│   ☑ users.viewAny                     View user list          │
│   ☑ users.view                        View user details       │
│   ☑ users.create                      Create new users        │
│   ☑ users.update                      Update users            │
│   ☑ users.manage-permissions          Manage permissions      │
│                                                                 │
│ ▼ Entity-Scoped Permissions (39)                              │
│   ℹ️ These permissions are granted when role is assigned       │
│      to specific entities                                      │
│                                                                 │
│   📍 Plant Level                                               │
│   • plants.view.[id]                                           │
│   • plants.update.[id]                                         │
│   • plants.manage-shifts.[id]                                  │
│   • areas.create.plant.[id]                                    │
│   • users.invite.plant.[id]                                    │
│   [Show all 15 plant permissions...]                           │
│                                                                 │
│   📍 Area Level                                                │
│   • areas.view.[id]                                            │
│   • areas.update.[id]                                          │
│   [Show all 12 area permissions...]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Users Tab
```
┌─────────────────────────────────────────────────────────────────┐
│ Users with this Role (5)                    [+ Assign Users]   │
├─────────────────────────────────────────────────────────────────┤
│ Search users...                    [Filter: All Assignments ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 👤 John Smith                                                  │
│    john.smith@company.com                                      │
│    Role Assignments:                                           │
│    ├─ 🏭 Plant Manager → Springfield Manufacturing            │
│    │   Assigned: Jan 20, 2024 • Active permissions: 47        │
│    │   [Manage Permissions] [Remove Assignment]                │
│    └─ 🏭 Plant Manager → Chicago Production                   │
│        Assigned: Mar 15, 2024 • Active permissions: 47        │
│        [Manage Permissions] [Remove Assignment]                │
│                                                                 │
│ 👤 Sarah Johnson                                               │
│    sarah.j@company.com                                         │
│    Role Assignments:                                           │
│    └─ 🏭 Plant Manager → Detroit Assembly                     │
│        Assigned: Feb 15, 2024 • Active permissions: 47        │
│        [Manage Permissions] [Remove Assignment]                │
│                                                                 │
│ ℹ️ Entity-Based Role                                           │
│ This role requires entity assignment. Users can have multiple  │
│ assignments to different entities with the same role.         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### History Tab
Displays audit log filtered for this role (see Audit Trail View section).

## Create/Edit Role View

### Form Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Cancel                                     [Save] [Save & Close] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Create New Role                                               │
│  ━━━━━━━━━━━━━━                                               │
│                                                                 │
│  Basic Information                                             │
│  ─────────────────                                            │
│  Role Name *                                                   │
│  [Equipment Specialist                                    ]    │
│                                                                 │
│  Display Name                                                  │
│  [Equipment Maintenance Specialist                        ]    │
│                                                                 │
│  Description                                                   │
│  [Specialized role for equipment maintenance personnel    ]    │
│  [with advanced diagnostic permissions                    ]    │
│                                                                 │
│  Parent Role (Optional)                                        │
│  [Select parent role...                                  ▼]    │
│                                                                 │
│  Role Icon                                                     │
│  [🔧] [Choose icon...]                                         │
│                                                                 │
│  Initial Permissions                                           │
│  ─────────────────────                                        │
│  ☐ Copy permissions from existing role                        │
│     [Select role to copy from...                        ▼]    │
│                                                                 │
│  OR                                                            │
│                                                                 │
│  [+ Select Permissions]                                        │
│                                                                 │
│  Selected Permissions (12)                                     │
│  ├── ✓ assets.view (Global permission)                        │
│  ├── ✓ assets.execute-routines (Entity-scoped)               │
│  └── ✓ work-orders.create (Entity-scoped)                    │
│      [View all...]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Validation Rules
- Role name: Required, unique, alphanumeric with underscores
- Display name: Optional, user-friendly name
- Description: Optional, max 500 characters
- At least one permission required (warning if none selected)

## Permission Assignment Interface

### Permission Selector Modal
```
┌─────────────────────────────────────────────────────────────────┐
│ Select Permissions                                    [Cancel] [Add Selected] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Search permissions...            [Filter: All ▼] [Reset]       │
│                                                                 │
│ ☐ Select All | Selected: 5 permissions                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ▼ System Permissions                                           │
│   ☐ system.settings.view          View system settings        │
│   ☐ system.settings.update        Update system settings      │
│   ☐ system.audit.view            View audit trails           │
│                                                                 │
│ ▼ User Management                                              │
│   ☑ users.viewAny                View user list              │
│   ☑ users.view                   View user details           │
│   ☐ users.create                 Create new users            │
│   ☐ users.update                 Update users                │
│   ☐ users.delete                 Delete users                │
│                                                                 │
│ ▼ Asset Management                                             │
│   ⚠️ Entity-scoped permissions                                │
│   ☑ assets.view.*                View assets                 │
│   ☑ assets.manage.*              Manage assets               │
│   ☑ assets.execute-routines.*    Execute routines            │
│                                                                 │
│ ▼ Work Orders                                                  │
│   ⚠️ Entity-scoped permissions                                │
│   ☐ work-orders.view.*           View work orders            │
│   ☐ work-orders.create.*         Create work orders          │
│   ☐ work-orders.update.*         Update work orders          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Details Panel
When hovering over a permission:
```
┌─────────────────────────────────┐
│ assets.execute-routines.*       │
│ ─────────────────────────────   │
│ Execute maintenance routines    │
│                                 │
│ Scope: Entity-specific         │
│ Requires: Entity assignment    │
│                                 │
│ When assigned at:              │
│ • Plant: All plant assets      │
│ • Area: All area assets        │
│ • Sector: Sector assets only   │
└─────────────────────────────────┘
```

## User Assignment Interface

### Assign Role to Users Modal
```
┌─────────────────────────────────────────────────────────────────┐
│ Assign Plant Manager Role                        [Cancel] [Next →] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Step 1 of 2: Select Users                                      │
│                                                                 │
│ Search users...                  [Filter: Without this role ▼] │
│                                                                 │
│ ☐ Select All | Selected: 2 users                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Available Users                                                │
│                                                                 │
│ ☑ 👤 Michael Brown                                            │
│     michael.b@company.com                                      │
│     Current Assignments:                                       │
│     • Technician → Area 5 (Production Floor)                  │
│     ✓ Can have Plant Manager role                            │
│                                                                 │
│ ☑ 👤 Lisa Davis                                               │
│     lisa.d@company.com                                         │
│     Current Assignments:                                       │
│     • Maintenance Supervisor → Sector 12                      │
│     ✓ Can have Plant Manager role                            │
│                                                                 │
│ ☐ 👤 Robert Wilson                                            │
│     robert.w@company.com                                       │
│     Current Assignments:                                       │
│     • Area Manager → Area 3                                   │
│     • Plant Manager → Detroit Assembly                        │
│     ⚠️ Already has Plant Manager role at another location    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

After clicking [Next →]:

┌─────────────────────────────────────────────────────────────────┐
│ Assign Plant Manager Role                  [← Back] [Assign All] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Step 2 of 2: Select Entity Assignment                          │
│                                                                 │
│ Selected Users: Michael Brown, Lisa Davis                      │
│                                                                 │
│ ⚠️ Entity Assignment Required                                  │
│ Plant Manager role requires assignment to a specific plant.    │
│ The selected users will receive all plant-scoped permissions   │
│ for the chosen entity.                                        │
│                                                                 │
│ Select Target Plant:                                           │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ ○ Springfield Manufacturing                             │   │
│ │   Location: Springfield, IL                             │   │
│ │   Areas: 5 • Sectors: 23 • Assets: 450                 │   │
│ │                                                         │   │
│ │ ● Chicago Production                                   │   │
│ │   Location: Chicago, IL                                │   │
│ │   Areas: 3 • Sectors: 15 • Assets: 280                │   │
│ │   ✓ You have access to this plant                     │   │
│ │                                                         │   │
│ │ ○ Detroit Assembly                                     │   │
│ │   Location: Detroit, MI                                │   │
│ │   Areas: 4 • Sectors: 18 • Assets: 320                │   │
│ │   ⚠️ Robert Wilson is already Plant Manager here      │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Permissions Preview:                                           │
│ The following permissions will be granted for Chicago Prod.:   │
│ • plants.view.456                                              │
│ • plants.update.456                                            │
│ • areas.create.plant.456                                       │
│ • users.invite.plant.456                                       │
│ [Show all 47 permissions...]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Manage Role Entity Assignments
For users who already have the role, a different interface for managing their entity assignments:

```
┌─────────────────────────────────────────────────────────────────┐
│ Manage John Smith's Plant Manager Assignments    [Close] [Save] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Current Assignments                                            │
│ ─────────────────                                             │
│                                                                 │
│ 🏭 Springfield Manufacturing                                  │
│    Assigned: Jan 20, 2024                                     │
│    Active Permissions: 47                                      │
│    [View Permissions] [Remove Assignment]                      │
│                                                                 │
│ 🏭 Chicago Production                                         │
│    Assigned: Mar 15, 2024                                     │
│    Active Permissions: 47                                      │
│    [View Permissions] [Remove Assignment]                      │
│                                                                 │
│ Add New Assignment                                             │
│ ─────────────────                                             │
│                                                                 │
│ [+ Add Plant Assignment]                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Audit Trail View

### Audit Log Display
```
┌─────────────────────────────────────────────────────────────────┐
│ Role History                     [Export] [Date Range ▼]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Today                                                          │
│ ─────                                                          │
│ 🔄 Permission Added              10:30 AM                      │
│    Admin User added 'assets.manage.*' permission              │
│    Reason: Expanded role responsibilities                      │
│                                                                 │
│ 👤 User Assigned                 09:15 AM                      │
│    John Smith assigned to role at Plant Springfield           │
│    Assigned by: Admin User                                     │
│                                                                 │
│ Yesterday                                                      │
│ ─────────                                                      │
│ 🔄 Role Updated                  04:22 PM                      │
│    Description changed from "..." to "..."                     │
│    Changed by: System Admin                                    │
│                                                                 │
│ ❌ Permission Removed            02:10 PM                      │
│    Admin User removed 'users.delete' permission               │
│    Reason: Policy change - deletion restricted to admins      │
│                                                                 │
│ September 20, 2024                                             │
│ ─────────────────                                             │
│ ✨ Role Created                  11:45 AM                      │
│    Custom role created by Jane Doe                            │
│    Initial permissions: 15 permissions assigned                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Security Features

### Permission Validation
1. **Real-time validation** of permission combinations
2. **Conflict detection** for mutually exclusive permissions
3. **Dependency checking** for related permissions
4. **Scope validation** for entity-specific permissions

### Role Protection
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Protected Role                                              │
│                                                                 │
│ This is the Administrator role. The following restrictions     │
│ apply:                                                         │
│                                                                 │
│ • Cannot be deleted                                            │
│ • Cannot remove critical permissions                           │
│ • At least one user must have this role                      │
│                                                                 │
│ [Understood]                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Confirmation Dialogs
```
┌─────────────────────────────────────────────────────────────────┐
│ Confirm Role Deletion                                          │
│                                                                 │
│ Are you sure you want to delete "Equipment Specialist"?       │
│                                                                 │
│ This will affect:                                              │
│ • 8 users currently assigned to this role                     │
│ • 23 entity assignments                                        │
│                                                                 │
│ Users will lose all permissions granted by this role.         │
│                                                                 │
│ Type role name to confirm: [_________________]                │
│                                                                 │
│ [Cancel] [Delete Role]                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling

### Validation Errors
```
┌─────────────────────────────────────────────────────────────────┐
│ ❌ Unable to Save Role                                         │
│                                                                 │
│ Please fix the following errors:                              │
│                                                                 │
│ • Role name is required                                        │
│ • Role name "admin" is reserved                               │
│ • At least one permission must be selected                    │
│                                                                 │
│ [Review Errors]                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Conflicts
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Permission Conflict Detected                                │
│                                                                 │
│ The following permissions conflict:                            │
│                                                                 │
│ • "users.view" requires "users.viewAny"                       │
│ • "assets.manage.*" includes "assets.view.*"                  │
│                                                                 │
│ Would you like to:                                            │
│ ○ Add required permissions automatically                       │
│ ○ Remove conflicting permissions                              │
│ ○ Review and adjust manually                                  │
│                                                                 │
│ [Cancel] [Continue]                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Loading States
```
┌─────────────────────────────────────────────────────────────────┐
│ Loading Roles...                                               │
│                                                                 │
│ [████████████░░░░░░░] 65%                                     │
│                                                                 │
│ Loading role data and permissions...                           │
└─────────────────────────────────────────────────────────────────┘
```

### Pagination
- Default: 20 roles per page
- Options: 10, 20, 50, 100
- Load more on scroll for permission lists

### Search Optimization
- Debounced search (300ms)
- Client-side filtering for loaded data
- Server-side search for large datasets

## Technical Implementation

### Component Structure
```
/resources/js/pages/settings/roles/
├── index.tsx           // Main role list page
├── show.tsx           // Role details page
├── create.tsx         // Create role page
├── edit.tsx           // Edit role page
└── components/
    ├── RoleList.tsx
    ├── RoleCard.tsx
    ├── RoleDetails.tsx
    ├── RoleForm.tsx
    ├── PermissionSelector.tsx
    ├── UserAssignment.tsx
    ├── RoleAuditLog.tsx
    └── RoleFilters.tsx
```

### Key Components to Reuse
- `EntityDataTable` - For user lists
- `EntityActionDropdown` - For role actions
- `EntityPagination` - For pagination
- `EntityDeleteDialog` - For deletion confirmation
- `ScrollArea` - For scrollable content
- `Card`, `Badge`, `Button` - From UI library
- `TextInput` - For form inputs

### Inertia Routes
```
GET    /settings/roles                    // List roles page
GET    /settings/roles/{id}              // Show role details page
GET    /settings/roles/create            // Create role page
POST   /settings/roles                    // Store new role
GET    /settings/roles/{id}/edit         // Edit role page
PUT    /settings/roles/{id}              // Update role
DELETE /settings/roles/{id}              // Delete role
PUT    /settings/roles/{id}/permissions   // Update role permissions
POST   /settings/roles/{id}/users        // Assign users to role
DELETE /settings/roles/{id}/users/{userId} // Remove user from role
POST   /settings/roles/{id}/duplicate    // Duplicate role
```

### State Management
```typescript
interface RoleManagementState {
  roles: Role[];
  selectedRole: Role | null;
  filters: RoleFilters;
  loading: boolean;
  errors: ValidationError[];
  permissions: {
    available: Permission[];
    selected: string[];
    grouped: Record<string, Permission[]>;
  };
  users: {
    available: User[];
    assigned: User[];
  };
  auditLog: AuditEntry[];
}
```

### Performance Optimizations
1. **Virtual scrolling** for large permission lists
2. **Lazy loading** for audit logs
3. **Debounced search** inputs
4. **Optimistic UI updates** for better UX
5. **Permission caching** to reduce API calls
6. **Batch operations** for bulk updates

### Accessibility Features
1. **Keyboard navigation** throughout the interface
2. **ARIA labels** for all interactive elements
3. **Focus management** for modals and dialogs
4. **Screen reader** announcements for actions
5. **High contrast** mode support
6. **Reduced motion** option

## Conclusion

This Role Management UI specification provides a comprehensive interface for managing roles within the maintenance OS system. The design prioritizes usability, security, and performance while maintaining consistency with the existing UI patterns. The implementation should follow the established component library and coding standards while ensuring all security requirements are met.

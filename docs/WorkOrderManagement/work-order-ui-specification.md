# Work Order Management System - UI Frontend Specification

## Table of Contents
1. [Overview](#overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Main Screens](#main-screens)
4. [User Actions & System Validations](#user-actions--system-validations)
5. [UI Components](#ui-components)
6. [Information Architecture](#information-architecture)
7. [Mobile Considerations](#mobile-considerations)
8. [Notifications & Alerts](#notifications--alerts)

## Overview

The Work Order Management System UI provides a comprehensive interface for the unified execution model that handles all maintenance activities in the CMMS. The system follows Inertia.js with React patterns and maintains consistency with the existing maintenance OS design system.

The UI is designed to support multiple disciplines (Maintenance, Quality, etc.) with the current implementation focusing on the Maintenance discipline.

### Key Design Principles
- **Unified Interface**: Single system for all work types across disciplines
- **Discipline Awareness**: UI adapts to selected discipline context
- **Clarity**: Clear visual hierarchy and intuitive navigation
- **Efficiency**: Minimize clicks and streamline workflows
- **Responsiveness**: Full mobile support for field technicians
- **Real-time Updates**: Live status updates and notifications
- **Accessibility**: WCAG 2.1 AA compliance

## User Roles & Permissions

### Role-Based Access
1. **Administrator**
   - Full access to all work orders across all plants
   - Can configure work order types and failure classifications
   - Access to system-wide analytics
   - Manage user roles and permissions

2. **Plant Manager**
   - Full access to work orders within their plant(s)
   - Can approve/reject work orders
   - Access to plant-level analytics
   - Oversee maintenance operations

3. **Maintenance Supervisor**
   - Create and manage work orders
   - Assign technicians and resources
   - Monitor execution progress
   - Approve planned maintenance schedules
   - Review and approve resource allocations
   - Access to supervisor-level analytics
   - Coordinate maintenance teams

4. **Planner**
   - Create and schedule work orders
   - Plan resource allocation and parts requirements
   - Manage maintenance schedules and backlogs
   - Generate and analyze maintenance forecasts
   - Create and modify form templates
   - Access to planning-specific analytics and reports
   - View resource availability and capacity

5. **Technician**
   - View assigned work orders
   - Execute work orders
   - Update task completion status
   - Report parts usage and time spent
   - Document work performed
   - Submit work for validation
   - Follow safety procedures
   - Report issues encountered

6. **Validator**
   - Review completed work orders
   - Verify task completion quality
   - Approve or reject completed work
   - Request rework if necessary
   - Document validation findings
   - Generate validation reports
   - Track recurring quality issues
   - Access to quality metrics and trends

7. **Viewer**
   - Read-only access to work order information
   - Can view reports and analytics

## Main Screens

### 1. Work Order Dashboard (`/maintenance/work-orders`)

**Purpose**: Central hub for work order management with key metrics and quick actions

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Work Order Management                    [+ New WO]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐│
│ │ Preventive  │ │ Corrective  │ │ Inspection  │ │ Project ││
│ │    142      │ │     28      │ │     15      │ │    8   ││
│ │ ↑ 12%       │ │ ↓ 5%        │ │ ↑ 25%       │ │ → 0%    ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘│
├─────────────────────────────────────────────────────────────┤
│ Quick Filters: [All] [My WOs] [Critical] [Today] [This Week]│
├─────────────────────────────────────────────────────────────┤
│ Work Order List Table                                        │
│ ┌──┬────────┬──────────┬────────┬────────┬────────┬───────┐│
│ │□ │WO#     │Title     │Asset   │Priority│Due Date│Status ││
│ ├──┼────────┼──────────┼────────┼────────┼────────┼───────┤│
│ │□ │WO-2024 │Bomba P1  │PUMP-001│Critical│Today   │Open   ││
│ │□ │WO-2025 │Inspeção  │COMP-002│High    │Tomorrow│In Prog││
│ └──┴────────┴──────────┴────────┴────────┴────────┴───────┘│
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Key performance indicators by category (preventive, corrective, inspection, project)
- Work order list with essential details
- Quick action buttons
- Filter and search capabilities

**User Actions**:
- Create new work order
- Filter by category, status, priority, date, asset, technician
- Search by WO number, title, or asset
- Bulk actions (assign, update status)
- Export to Excel/PDF
- Sort by any column

**Validations**:
- Permission check for create action
- Date range validation for filters
- Bulk action permission validation

### 2. Create Work Order (`/maintenance/work-orders/create`)

**Purpose**: Initial work order creation with source tracking

**Creation Sources**:
1. **Manual Creation** - User-initiated from dashboard
2. **Routine - Automatic** - System-generated from automatic execution mode routines
3. **Routine - Manual** - User-created from manual execution mode routines
4. **Sensor Alert** - Created from sensor threshold violations
5. **Inspection Finding** - Created during inspection work orders

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Create Work Order                               [Save Draft] │
├─────────────────────────────────────────────────────────────┤
│ Source: [Manual Request ▼]                                   │
│ Related To: [None]                                          │
├─────────────────────────────────────────────────────────────┤
│ Step 1: Basic Information                                    │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Work Order Type*    [Select type ▼]                     ││
│ │ Category*           (●) Corrective ( ) Preventive       ││
│ │                     ( ) Inspection ( ) Project          ││
│ │ Title*              [_________________________________] ││
│ │ Description         [_________________________________] ││
│ │                     [_________________________________] ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Step 2: Asset Selection                                      │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Plant*              [Plant 1 ▼]                         ││
│ │ Area*               [Area A ▼]                          ││
│ │ Sector              [Sector 1 ▼]                       ││
│ │ Asset*              [🔍 Search or select asset...]      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Step 3: Priority & Due Date                                  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Priority*           ( ) Emergency ( ) Urgent            ││
│ │                     (●) High ( ) Normal ( ) Low         ││
│ │ Priority Score      [70] (0-100)                        ││
│ │ Requested Due Date* [📅 Select date and time]          ││
│ │ Downtime Required   [ ] Yes                             ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Step 4: Initial Assignment (Optional)                        │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Form Template       [Select form ▼]                     ││
│ │ Custom Tasks        [+ Add custom task]                 ││
│ │ External Reference  [PO#, Ticket#, etc.]                ││
│ │ Warranty Claim      [ ] Yes                             ││
│ │ Tags                [maintenance] [pump] [+ Add tag]    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ [Cancel]                              [Save Draft] [Submit →] │
└─────────────────────────────────────────────────────────────┘
```

**Special UI for Routine Source**:
When source is "Routine - Manual":
```
┌─────────────────────────────────────────────────────────────┐
│ ℹ️ Creating from Manual Routine                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Routine: Pump Maintenance - 500h                        ││
│ │ Trigger Type: Runtime Hours ⏱️                          ││
│ │ Last Execution: 2024-01-15 (485h ago)                   ││
│ │ Due: Now (500h interval reached)                        ││
│ │ Form Version: v2.1 (current)                            ││
│ │ Auto-Approval: Yes ✓                                    ││
│ │ Advance Window: 24 hours                                ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

When source is "Routine - Manual" (Calendar-based):
```
┌─────────────────────────────────────────────────────────────┐
│ ℹ️ Creating from Manual Routine                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Routine: Monthly Inspection                             ││
│ │ Trigger Type: Calendar Days 📅                          ││
│ │ Last Execution: 2024-01-01 (30 days ago)               ││
│ │ Due: Today (30 day interval reached)                    ││
│ │ Form Version: v1.2 (current)                            ││
│ │ Auto-Approval: No ✗                                     ││
│ │ Advance Window: 48 hours                                ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

When source is "Routine - Automatic" (shown in work order details):
```
┌─────────────────────────────────────────────────────────────┐
│ ℹ️ Generated from Automatic Routine                          │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Routine: Pump Maintenance - 500h                        ││
│ │ Trigger: Runtime Hours (500h)                           ││
│ │ Generated: 24 hours before due date                     ││
│ │ Auto-Approved: Yes (by routine configuration)           ││
│ │ Form Version: v2.1                                      ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

When an open work order exists from the routine:
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Cannot Create Work Order                                  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ An open work order already exists for this routine:     ││
│ │                                                         ││
│ │ Work Order: WO-2024-0125                               ││
│ │ Status: In Progress                                     ││
│ │ Created: 2024-01-18 09:30                              ││
│ │ Assigned to: João Silva                                ││
│ │                                                         ││
│ │ [View Work Order →]                                     ││
│ │                                                         ││
│ │ Note: A new work order can only be created after the   ││
│ │ existing one is verified or closed.                    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ [← Back to Routines]                                        │
└─────────────────────────────────────────────────────────────┘
```

**Status After Creation**: `requested` - Awaits approval

**Information Required**:
- **Mandatory Fields**:
  - Work order type and category
  - Title
  - Plant, Area, Asset
  - Priority and priority score
  - Requested due date
- **Optional Fields**:
  - Description
  - Sector
  - Source type and ID
  - Related work order
  - Form template or custom tasks
  - External reference
  - Warranty claim flag
  - Tags

**Validations**:
- User has permission to create work orders
- Asset belongs to selected hierarchy
- Due date is in the future
- Priority score between 0-100
- If from manual routine, check no active WO exists

### 3. Work Order Approval (`/maintenance/work-orders/{id}/approve`)

**Purpose**: Review and approve/reject requested work orders

**Access**: Plant Managers, Maintenance Supervisors (based on thresholds)

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Work Order Approval: WO-2024-001                            │
│ Status: Requested → Pending Approval                         │
├─────────────────────────────────────────────────────────────┤
│ Request Details:                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Type: Manutenção Corretiva                              ││
│ │ Priority: High (Score: 75)                              ││
│ │ Asset: PUMP-001 - Bomba Centrífuga P1                   ││
│ │ Requested by: Carlos Oliveira                           ││
│ │ Requested: 2024-01-19 14:45                             ││
│ │ Due Date: 2024-01-25 17:00                              ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Description:                                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Vazamento identificado no selo mecânico durante         ││
│ │ inspeção de rotina. Necessária substituição urgente     ││
│ │ para evitar parada não programada.                      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Initial Assessment:                                          │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Downtime Required: Yes                                  ││
│ │ Estimated Impact: 4 hours production loss               ││
│ │ Safety Risk: Medium                                     ││
│ │ Environmental Risk: Low                                 ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Approval Decision:                                           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ( ) Approve - Proceed to planning                       ││
│ │ ( ) Reject - Not justified                              ││
│ │ ( ) Request More Info                                   ││
│ │                                                         ││
│ │ Comments:                                               ││
│ │ [_____________________________________________________] ││
│ │ [_____________________________________________________] ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ [Cancel]                              [Submit Decision →]    │
└─────────────────────────────────────────────────────────────┘
```

**Approval Thresholds**:
- Maintenance Supervisor: Up to R$ 5,000 or Normal priority
- Plant Manager: Up to R$ 50,000 or High priority
- Administrator: No limits

**Decision Options**:
- **Approve**: Transitions to `approved` status
- **Reject**: Transitions to `rejected` status (terminal)
- **Request More Info**: Returns to requester with comments

### 4. Work Order Management (Unified Interface) (`/maintenance/work-orders/{id}`)

**Purpose**: Central hub for all work order operations through a tabbed interface, eliminating the need for separate pages for planning, execution, and validation.

**Architecture Pattern**: Similar to Asset management where shifts/routines are managed through tabs, all work order state transitions and operations are handled within this single interface.

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ WO-2024-001 - Manutenção Preventiva Bomba P1               │
│ Status: Approved | Priority: Critical | Created: 15/01/2024 │
├─────────────────────────────────────────────────────────────┤
│ [Details] [Planning] [Execution] [History] [Parts] [Analysis]│
├─────────────────────────────────────────────────────────────┤
│ Tab Content Area                                             │
│ (Content changes based on selected tab and WO status)       │
└─────────────────────────────────────────────────────────────┘
```

**Tab Visibility Rules**:
- **Details**: Always visible
- **Planning**: Visible when status is `approved`, `planned`, or `scheduled`
- **Execution**: Visible when status is `scheduled`, `in_progress`, `completed`
- **History**: Always visible
- **Parts**: Always visible
- **Analysis**: Visible for corrective work orders or when failure occurred
- **Validation**: Visible when status is `completed`

**Key Features**:
1. **Context-Aware Actions**: Action buttons change based on current status and user permissions
2. **Tab State Preservation**: Each tab maintains its state while navigating
3. **Real-time Updates**: Status changes reflect immediately across all tabs
4. **Permission-Based UI**: Tabs and actions are shown/hidden based on user roles

#### 4.1 Details Tab

**Purpose**: Overview of work order information with status-appropriate actions

**Content**:
- Work order header information
- Asset/hierarchy details
- Schedule and assignment
- Description and requirements
- Source information (if from routine)
- Planning summary (if planned)
- Action buttons based on status

**Actions by Status**:
- `requested`: [Approve/Reject] (if has permission)
- `approved`: [Start Planning]
- `planned`: [Edit Planning] [Schedule]
- `scheduled`: [Start Execution]
- `in_progress`: [View Execution]
- `completed`: [Validate] (if has permission)

#### 4.2 Planning Tab

**Purpose**: Resource planning and scheduling integrated within the main interface

**Access**: Enabled when work order status is `approved`, `planned`, or `scheduled`

**Content Structure**:
```tsx
// Three main sections in the planning tab:
1. Resource Planning
   - Estimated hours and labor costs
   - Safety requirements
   - Required skills and certifications
   - Downtime planning

2. Parts Planning
   - Parts list with quantities
   - Cost calculations
   - Inventory availability
   - Part reservation

3. Schedule Planning
   - Start/end date selection
   - Team/technician assignment
   - Shift coordination
   - Calendar integration
```

**Planning Mode States**:
- **View Mode**: Default state showing current planning data
- **Edit Mode**: Activated by "Edit Planning" button
- **Draft State**: Auto-saves progress, allows partial completion

**Action Flow**:
1. Click "Start Planning" or "Edit Planning" button
2. Tab enters edit mode with form fields enabled
3. User fills/modifies planning information
4. "Save Draft" preserves current state
5. "Complete Planning" validates and transitions status

**Key Differences from Standalone Planning Page**:
- No navigation away from work order context
- Maintains visibility of other work order information
- Seamless transition between viewing and editing
- Can reference details tab information while planning

#### 4.3 Execution Tab

**Purpose**: Guide technicians through work execution without leaving the work order context

**Access**: Enabled when status is `scheduled`, `in_progress`, or `completed`

**Execution States**:
- **Ready**: Scheduled but not started
- **Active**: Execution in progress
- **Paused**: Temporarily halted
- **Completed**: All tasks done, awaiting validation

**Content Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Execution Progress                                           │
│ Started: 08:15 | Elapsed: 02:45 | Progress: 75%            │
├─────────────────────────────────────────────────────────────┤
│ [Start] / [Resume] / [Pause] / [Complete]                  │
├─────────────────────────────────────────────────────────────┤
│ Task Checklist                                               │
│ (Direct task responses, no FormExecution)                   │
├─────────────────────────────────────────────────────────────┤
│ Parts Used                                                   │
│ (Track actual vs planned)                                    │
├─────────────────────────────────────────────────────────────┤
│ Execution Notes                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features**:
- Timer with pause/resume capability
- Direct task response collection
- Real-time progress updates
- Photo/document attachment per task
- Parts usage tracking with variance

#### 4.4 History Tab

**Purpose**: Complete audit trail of all work order activities

**Content**:
- Status transitions timeline
- User actions log
- Planning changes history
- Execution timeline
- Comments and notes thread

#### 4.5 Parts Tab

**Purpose**: Comprehensive parts management view

**Sections**:
1. **Planned Parts**: From planning phase
2. **Used Parts**: Actual consumption
3. **Variance Analysis**: Planned vs actual
4. **Cost Summary**: Financial impact

#### 4.6 Analysis Tab

**Purpose**: Failure analysis and root cause documentation

**Visibility**: 
- Always visible for corrective work orders
- Visible for other types if failure occurred during execution

#### 4.7 Validation Tab

**Purpose**: Quality validation integrated within work order interface

**Access**: Visible when status is `completed` and user has validation permission

**Content**:
- Execution summary review
- Task completion verification
- Measurement validation
- Parts usage review
- Validation decision interface

### 5. Work Order List with Filters (`/maintenance/work-orders`)

**Purpose**: Browse, search, and manage multiple work orders

**Advanced Filter Panel**:
```
┌─────────────────────────────────────────────────────────────┐
│ Filters                                          [Clear All] │
├─────────────────────────────────────────────────────────────┤
│ Status:     [✓] Open [✓] In Progress [ ] Completed         │
│ Priority:   [✓] Critical [✓] High [ ] Medium [ ] Low       │
│ Date Range: [Last 7 days ▼] From: [___] To: [___]         │
│ Plant:      [All Plants ▼]                                 │
│ Area:       [All Areas ▼]                                  │
│ Asset Type: [All Types ▼]                                  │
│ Assigned:   [All Technicians ▼]                            │
│ WO Type:    [All Types ▼]                                  │
│                                              [Apply Filters] │
└─────────────────────────────────────────────────────────────┘
```

**List Features**:
- Pagination (25/50/100 items per page)
- Column sorting
- Multi-select for bulk actions
- Quick view on hover
- Status color coding
- Priority indicators
- Overdue highlighting

### 6. Failure Analysis (`/maintenance/work-orders/{id}/analysis`)

**Purpose**: Capture and analyze failure information for corrective work orders

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Failure Analysis - WO-2024-001                              │
├─────────────────────────────────────────────────────────────┤
│ Failure Classification:                                      │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Failure Mode*:      [Vazamento ▼]                      ││
│ │ Root Cause*:        [Desgaste Normal ▼]                ││
│ │ Immediate Cause*:   [Selo Mecânico Danificado ▼]      ││
│ │                                                         ││
│ │ Failure Date/Time*: [📅 2024-01-19 14:30]             ││
│ │ Detection Method:   [Inspeção Visual ▼]                ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Impact Assessment:                                           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Production Loss:    [4] hours                          ││
│ │ Safety Impact:      ( ) High (●) Medium ( ) Low       ││
│ │ Environmental:      ( ) Yes (●) No                    ││
│ │ Downtime Cost:      R$ [15,000.00]                    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Corrective Actions:                                          │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Immediate Action:                                      ││
│ │ [Substituição do selo mecânico e ajuste do           ]││
│ │ [alinhamento do eixo                                  ]││
│ │                                                         ││
│ │ Preventive Action:                                     ││
│ │ [Incluir verificação de selo na manutenção           ]││
│ │ [preventiva mensal                                    ]││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ [Save Analysis]                              [Generate Report]│
└─────────────────────────────────────────────────────────────┘
```

### 7. Work Order Validation (`/maintenance/work-orders/{id}/validate`)

**Purpose**: Quality validation of completed work orders

**Access**: Only for users with Validator role and work orders in `completed` status

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Validate Work Order: WO-2024-001                            │
│ Status: Completed → Awaiting Validation                      │
├─────────────────────────────────────────────────────────────┤
│ Work Summary:                                                │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Asset: PUMP-001 - Bomba Centrífuga P1                   ││
│ │ Type: Manutenção Preventiva                             ││
│ │ Executed by: João Silva                                 ││
│ │ Duration: 3.5 hours (Estimated: 4.0 hours)              ││
│ │ Completed: 2024-01-20 11:45                             ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Task Completion Review:                                      │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ✓ All 8 tasks completed                                 ││
│ │ ✓ Measurements within acceptable ranges                 ││
│ │ ✓ Photos attached: 4 files                              ││
│ │ ⚠ Vibration reading slightly elevated (2.8 mm/s)       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Parts Usage:                                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Part               Planned  Used   Variance             ││
│ │ Mechanical Seal    1        1      0                    ││
│ │ O-Ring Set         2        3      +1 (justified)       ││
│ │ Bearing            2        2      0                    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Validation Checklist:                                        │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [✓] Work completed as specified                         ││
│ │ [✓] Quality standards met                               ││
│ │ [✓] Safety procedures followed                          ││
│ │ [✓] Documentation complete                              ││
│ │ [ ] Follow-up work required                             ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Validation Notes:                                            │
│ [Work completed satisfactorily. Vibration levels should    ]│
│ [be monitored in next inspection.                          ]│
│                                                              │
│ [Request Rework]              [Reject] [Approve & Verify →] │
└─────────────────────────────────────────────────────────────┘
```

**Validation Actions**:
1. Review completed tasks
2. Verify measurements and readings
3. Check attached evidence
4. Review parts usage variance
5. Complete validation checklist
6. Add validation notes
7. Approve, reject, or request rework

**Validation Options**:
- **Approve & Verify**: Transitions to `verified` status
- **Request Rework**: Returns to `in_progress` with notes
- **Reject**: Requires detailed reason, may create new WO

**Validations**:
- User has validator role
- Work order is in completed status
- All checklist items reviewed
- Notes provided for any issues

### 8. Routine Configuration (`/maintenance/routines/{id}/edit`)

**Purpose**: Configure routine settings including work order generation parameters

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Edit Routine: Pump Maintenance                              │
├─────────────────────────────────────────────────────────────┤
│ Basic Information:                                           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Name*               [Pump Maintenance]                  ││
│ │ Description         [Routine maintenance for pumps]     ││
│ │ Asset*              [PUMP-001 - Bomba P1]              ││
│ │ Form Template*      [Pump Maintenance Checklist v2.1]  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Trigger Configuration:                                       │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Trigger Type*       (●) Runtime Hours ⏱️                ││
│ │                     ( ) Calendar Days 📅                ││
│ │                                                         ││
│ │ [If Runtime Hours selected:]                           ││
│ │ Runtime Interval*   [500] hours                         ││
│ │                     ℹ️ Based on asset operating hours   ││
│ │                                                         ││
│ │ [If Calendar Days selected:]                           ││
│ │ Calendar Interval*  [30] days                           ││
│ │                     ℹ️ Based on calendar days          ││
│ │                                                         ││
│ │ Execution Mode*     (●) Automatic ( ) Manual            ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Work Order Generation Settings:                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Advance Generation* [24] hours before due               ││
│ │                     ℹ️ When to create the work order    ││
│ │                                                         ││
│ │ [If user has 'work-orders.approve' permission:]        ││
│ │ Auto-Approve        [✓] Automatically approve          ││
│ │ Work Orders             generated work orders          ││
│ │                     ⚠️ Work orders will skip approval   ││
│ │                                                         ││
│ │ [If user lacks 'work-orders.approve' permission:]      ││
│ │ Auto-Approve        [□] Automatically approve          ││
│ │ Work Orders             generated work orders          ││
│ │                     🔒 Requires approval permission     ││
│ │                                                         ││
│ │ Priority            [Normal ▼]                          ││
│ │ Priority Score      [50] (0-100)                        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Execution History:                                           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Last Execution:     2024-01-15 14:30                   ││
│ │ [If Runtime Hours:]                                    ││
│ │ Runtime at Last:    4,850 hours                        ││
│ │ Current Runtime:    5,335 hours (485h elapsed)         ││
│ │ Progress:           [████████████░░] 97%               ││
│ │                                                         ││
│ │ [If Calendar Days:]                                    ││
│ │ Days Since Last:    28 days                            ││
│ │ Next Due Date:      2024-02-14                         ││
│ │ Progress:           [███████████░░░] 93%               ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ [Cancel]                    [Save Changes] [Save & Activate] │
└─────────────────────────────────────────────────────────────┘
```

**Field Descriptions**:
- **Trigger Type**: Choose between runtime hours (based on asset operation) or calendar days (based on dates)
- **Runtime Interval**: Number of operating hours between executions (only for runtime trigger)
- **Calendar Interval**: Number of days between executions (only for calendar trigger)
- **Advance Generation Hours**: Number of hours before the routine is due to generate the work order (1-168 hours, default: 24)
- **Auto-Approve Work Orders**: When checked, work orders created from this routine will automatically be approved and skip the approval workflow. **Only available to users with 'work-orders.approve' permission**

**Validations**:
- Trigger type must be selected
- Interval must be positive number
- Runtime interval: 1-10,000 hours
- Calendar interval: 1-365 days
- Advance generation hours must be between 1 and 168 (1 week)
- Auto-approval requires 'work-orders.approve' permission
- Warning shown when auto-approval is enabled
- Permission message shown when user lacks approval rights

### 8.1. Routine List View (`/maintenance/routines`)

**Purpose**: Display all routines with progress indicators based on trigger type

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Maintenance Routines                             [+ New]     │
├─────────────────────────────────────────────────────────────┤
│ Filters: [All] [Runtime-based] [Calendar-based] [Due Soon]  │
├─────────────────────────────────────────────────────────────┤
│ ┌──┬────────────┬──────┬────────┬────────┬────────┬──────┐│
│ │□ │Name        │Asset │Trigger │Progress│Next Due│Status││
│ ├──┼────────────┼──────┼────────┼────────┼────────┼──────┤│
│ │□ │Pump Maint. │PUMP-1│500h ⏱️ │97% ████│~2 days │Active││
│ │  │            │      │        │        │        │WO-125││
│ │□ │Monthly Ins.│COMP-2│30d 📅  │93% ████│Feb 14  │Active││
│ │□ │Oil Change  │ENG-1 │250h ⏱️ │45% ██░░│~28 days│Active││
│ │□ │Annual Cert.│BOIL-1│365d 📅 │75% ███░│Apr 15  │Active││
│ │  │            │      │        │        │        │WO-089││
│ └──┴────────────┴──────┴────────┴────────┴────────┴──────┘│
│                                                              │
│ Legend: WO-XXX = Open work order exists                     │
└─────────────────────────────────────────────────────────────┘
```

**Status Column Details**:
- Shows "Active" or "Inactive" for routine status
- If open work order exists, shows work order number below
- Click on work order number to view details

**Progress Calculation**:
- **Runtime Hours**: (Hours since last execution / Trigger hours) × 100
- **Calendar Days**: (Days since last execution / Trigger days) × 100
- Color coding: Green (0-70%), Yellow (71-90%), Red (91-100%)

### 8.2. Routine Details View (`/maintenance/routines/{id}`)

**Purpose**: Show detailed routine information with work order status

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Routine: Pump Maintenance - 500h                    [Edit]  │
├─────────────────────────────────────────────────────────────┤
│ Current Status:                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ⚠️ Open Work Order Exists                               ││
│ │                                                         ││
│ │ Work Order: WO-2024-0125                               ││
│ │ Status: Scheduled                                       ││
│ │ Created: 2024-01-18 09:30                              ││
│ │ Scheduled for: 2024-01-25 08:00                       ││
│ │ Assigned to: João Silva                                ││
│ │                                                         ││
│ │ [View Work Order →] [Go to Execution →]                ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Routine Information:                                         │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Asset: PUMP-001 - Bomba P1                             ││
│ │ Trigger: Runtime Hours (500h)                          ││
│ │ Execution Mode: Automatic                              ││
│ │ Auto-Approve: Yes                                      ││
│ │ Advance Generation: 24 hours                           ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Progress:                                                    │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Last Execution: 2024-01-15 14:30                       ││
│ │ Runtime at Last: 4,850 hours                           ││
│ │ Current Runtime: 5,335 hours (485h elapsed)            ││
│ │ Progress: [████████████░░] 97%                         ││
│ │                                                         ││
│ │ ℹ️ Work order generation blocked by open WO             ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Recent Work Orders:                                          │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ WO-2024-0125  Scheduled    Created: 18/01/2024        ││
│ │ WO-2024-0089  Closed       Completed: 15/01/2024      ││
│ │ WO-2023-1205  Closed       Completed: 15/10/2023      ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 9. Reports & Analytics (`/maintenance/work-orders/analytics`)

**Purpose**: Visualize work order metrics and generate reports

**Dashboard Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Work Order Analytics            Period: [Last 30 days ▼]    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┬─────────────────────────────────┐  │
│ │ WO by Status        │ WO by Type                      │  │
│ │ [Pie Chart]         │ [Bar Chart]                     │  │
│ │                     │                                 │  │
│ └─────────────────────┴─────────────────────────────────┘  │
│ ┌─────────────────────┬─────────────────────────────────┐  │
│ │ Completion Rate     │ MTTR by Asset Type              │  │
│ │ [Line Chart]        │ [Bar Chart]                     │  │
│ │                     │                                 │  │
│ └─────────────────────┴─────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Top 10 Problem Assets                                   ││
│ │ [Table with failure counts and downtime]               ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ [Export Dashboard] [Schedule Report] [Customize View]        │
└─────────────────────────────────────────────────────────────┘
```

## User Actions & System Validations

### Create Work Order
**Actions**:
1. Select work order type
2. Fill basic information
3. Select asset (hierarchical)
4. Set priority and dates
5. Assign resources
6. Attach form template
7. Save or submit

**Validations**:
- User has permission for selected plant/asset
- Required fields are filled
- Dates are logical (start < due)
- Asset exists and is active
- Form template matches WO type
- Technician is available

### Execute Work Order
**Actions**:
1. Start execution
2. Complete tasks in sequence
3. Record measurements
4. Add parts used
5. Upload evidence (photos/docs)
6. Pause/resume as needed
7. Complete execution

**Validations**:
- WO is in executable status
- User is assigned technician
- All required tasks completed
- Measurements within range
- Parts are available
- Evidence uploaded where required

### Manage Work Order Status
**Complete Status Flow**:
```
Requested → Approved → Planned → Ready to Schedule → Scheduled → In Progress → Completed → Verified → Closed
    ↓          ↓         ↓              ↓                ↓            ↓            ↓           ↓
Rejected   Cancelled  On Hold       On Hold          On Hold      On Hold      Reopened   Completed
```

**Status Descriptions**:
- **Requested**: Initial state, awaiting approval
- **Approved**: Authorized for planning and execution
- **Rejected**: Denied by approver (terminal state)
- **Planned**: Resources and parts defined
- **Ready to Schedule**: Fully planned, awaiting scheduling
- **Scheduled**: Assigned to technician with dates
- **In Progress**: Currently being executed
- **On Hold**: Temporarily paused for various reasons
- **Completed**: Work finished, awaiting validation
- **Verified**: Quality validated by authorized personnel
- **Closed**: Final state, all documentation complete
- **Cancelled**: Terminated before completion (terminal state)

**Validations**:
- Only valid transitions allowed per system rules
- Approval required based on priority/cost thresholds
- Cannot cancel completed/closed work orders
- Reason required for rejection/cancellation
- On Hold can return to previous status
- Verification required before closing

## UI Components

### Component Libraries

#### 1. **shadcn/ui Components**
The system uses shadcn/ui as the primary component library:
- `Button` - Primary action buttons with variants: default, destructive, outline, secondary, ghost
- `Card` - Container components for content grouping
- `Dialog` - Modal dialogs for forms and confirmations
- `Select` - Dropdown selectors with search capability
- `Input` - Text input fields with error states
- `Label` - Form field labels
- `Tabs` - Tab navigation for work order details
- `Badge` - Status and priority indicators
- `Alert` - System notifications and warnings
- `ScrollArea` - Scrollable content areas
- `Checkbox` - Task completion checkboxes
- `RadioGroup` - Priority and category selection
- `DatePicker` - Date/time selection
- `Textarea` - Multi-line text inputs
- `Table` - Data display tables
- `DropdownMenu` - Action menus

#### 2. **Lucide Icons**
Icons used throughout the system:
- `Wrench` - Maintenance/Work orders
- `AlertCircle` - Warnings and alerts
- `CheckCircle` - Completed status
- `Clock` - Scheduled/Time tracking
- `Pause` - Paused status
- `Play` - Start execution
- `X` - Cancel/Close
- `Plus` - Add new
- `Edit` - Edit action
- `Trash` - Delete action
- `Search` - Search functionality
- `Filter` - Filter options
- `Download` - Export actions
- `Upload` - Import/Upload
- `Calendar` - Date selection
- `User` - Technician assignment
- `Package` - Parts/Inventory
- `FileText` - Documents/Forms
- `Camera` - Photo attachment
- `Paperclip` - File attachment

### Custom Shared Components

#### 1. **ItemSelect Component**
```tsx
import ItemSelect from '@/components/ItemSelect';

// Usage for Work Order Type selection
<ItemSelect
  label="Tipo de Ordem"
  items={workOrderTypes}
  value={formData.work_order_type_id}
  onValueChange={(value) => setFormData({ ...formData, work_order_type_id: value })}
  placeholder="Selecione o tipo"
  required={true}
  searchable={true}
  canCreate={false}
  error={errors.work_order_type_id}
/>

// Usage for Technician assignment
<ItemSelect
  label="Técnico Responsável"
  items={technicians}
  value={formData.assigned_technician_id}
  onValueChange={(value) => setFormData({ ...formData, assigned_technician_id: value })}
  placeholder="Selecione um técnico"
  searchable={true}
  canClear={true}
  disabled={isLoading}
/>
```

#### 2. **EntityDataTable Component**
```tsx
import { EntityDataTable } from '@/components/shared/EntityDataTable';

// Work Order List Table
<EntityDataTable
  data={workOrders}
  columns={[
    {
      key: 'work_order_number',
      label: 'Número',
      sortable: true,
      width: 'w-[120px]',
    },
    {
      key: 'title',
      label: 'Título',
      sortable: true,
    },
    {
      key: 'asset',
      label: 'Ativo',
      render: (_, row) => row.asset?.tag || '-',
    },
    {
      key: 'priority',
      label: 'Prioridade',
      render: (value) => <PriorityBadge priority={value} />,
      width: 'w-[100px]',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
      width: 'w-[120px]',
    },
    {
      key: 'scheduled_start_date',
      label: 'Data Programada',
      render: (value) => formatDate(value),
      sortable: true,
      width: 'w-[150px]',
    },
  ]}
  actions={(row) => (
    <EntityActionDropdown
      onEdit={() => router.visit(route('work-orders.edit', row.id))}
      onDelete={() => handleDelete(row.id)}
      additionalActions={[
        {
          label: 'Executar',
          icon: <Play className="h-4 w-4" />,
          onClick: () => router.visit(route('work-orders.execute', row.id)),
        },
        {
          label: 'Planejar',
          icon: <Calendar className="h-4 w-4" />,
          onClick: () => router.visit(route('work-orders.planning', row.id)),
        },
      ]}
    />
  )}
  loading={isLoading}
  onRowClick={(row) => router.visit(route('work-orders.show', row.id))}
  onSort={handleSort}
  emptyMessage="Nenhuma ordem de serviço encontrada."
/>
```

#### 3. **EntityActionDropdown Component**
```tsx
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';

// Work Order Actions
<EntityActionDropdown
  onEdit={canEdit ? handleEdit : undefined}
  onDelete={canDelete ? handleDelete : undefined}
  additionalActions={[
    ...(canApprove ? [{
      label: 'Aprovar',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: handleApprove,
    }] : []),
    ...(canExecute ? [{
      label: 'Executar',
      icon: <Play className="h-4 w-4" />,
      onClick: handleExecute,
    }] : []),
    ...(canValidate ? [{
      label: 'Validar',
      icon: <ClipboardCheck className="h-4 w-4" />,
      onClick: handleValidate,
    }] : []),
  ]}
/>
```

#### 4. **EntityPagination Component**
```tsx
import { EntityPagination } from '@/components/shared/EntityPagination';

// Work Order List Pagination
<EntityPagination
  pagination={workOrders.meta}
  onPageChange={(page) => router.visit(route('work-orders.index', { page }))}
  onPerPageChange={(perPage) => router.visit(route('work-orders.index', { per_page: perPage }))}
  perPageOptions={[10, 25, 50, 100]}
/>
```

#### 5. **EntityDeleteDialog Component**
```tsx
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';

// Work Order Delete Confirmation
<EntityDeleteDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  entityLabel={`a ordem de serviço ${selectedWorkOrder?.work_order_number}`}
  onConfirm={async () => {
    await router.delete(route('work-orders.destroy', selectedWorkOrder.id));
  }}
/>
```

#### 6. **EntityDependenciesDialog Component**
```tsx
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';

// Show dependencies when work order cannot be deleted
<EntityDependenciesDialog
  open={dependenciesDialogOpen}
  onOpenChange={setDependenciesDialogOpen}
  entityName="ordem de serviço"
  dependencies={{
    dependencies: {
      executions: {
        count: 3,
        label: 'Execuções',
        items: workOrder.executions,
      },
      parts: {
        count: workOrder.parts_count,
        label: 'Peças Utilizadas',
        items: workOrder.parts,
      },
    },
  }}
/>
```

### Work Order Specific Components

#### 1. **WorkOrderStatusBadge**
```tsx
// Custom status badge with work order specific colors
const WorkOrderStatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    requested: { label: 'Solicitado', variant: 'secondary' },
    approved: { label: 'Aprovado', variant: 'default' },
    planned: { label: 'Planejado', variant: 'default' },
    ready_to_schedule: { label: 'Pronto para Agendar', variant: 'info' },
    scheduled: { label: 'Agendado', variant: 'default' },
    in_progress: { label: 'Em Execução', variant: 'warning' },
    completed: { label: 'Concluído', variant: 'success' },
    verified: { label: 'Verificado', variant: 'success' },
    closed: { label: 'Fechado', variant: 'secondary' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
    on_hold: { label: 'Em Espera', variant: 'warning' },
    rejected: { label: 'Rejeitado', variant: 'destructive' },
  };
  
  const config = statusConfig[status] || { label: status, variant: 'default' };
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
```

#### 2. **WorkOrderCategoryBadge**
```tsx
// Category indicator with icons
const WorkOrderCategoryBadge = ({ category, discipline = 'maintenance' }: { category: string; discipline?: string }) => {
  const categoryConfig = {
    // Maintenance categories
    preventive: { icon: Shield, label: 'Preventiva', color: 'text-blue-600' },
    corrective: { icon: Wrench, label: 'Corretiva', color: 'text-red-600' },
    inspection: { icon: Search, label: 'Inspeção', color: 'text-green-600' },
    project: { icon: Briefcase, label: 'Projeto', color: 'text-purple-600' },
    // Quality categories (future)
    calibration: { icon: Gauge, label: 'Calibração', color: 'text-indigo-600' },
    quality_control: { icon: CheckSquare, label: 'Controle Qualidade', color: 'text-teal-600' },
    quality_audit: { icon: ClipboardList, label: 'Auditoria', color: 'text-amber-600' },
    non_conformance: { icon: AlertTriangle, label: 'Não Conformidade', color: 'text-orange-600' },
  };
  
  const config = categoryConfig[category] || categoryConfig.corrective;
  const Icon = config.icon;
  
  return (
    <div className={`flex items-center gap-1 ${config.color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
};
```

#### 3. **WorkOrderSourceIndicator**
```tsx
// Source tracking component
const WorkOrderSourceIndicator = ({ source, sourceId, sourceData }: WorkOrderSourceProps) => {
  const sourceConfig = {
    manual: { icon: Hand, label: 'Manual' },
    routine: { icon: Clock, label: 'Rotina' },
    sensor: { icon: Activity, label: 'Sensor' },
    inspection: { icon: ClipboardCheck, label: 'Inspeção' },
  };
  
  const config = sourceConfig[source] || sourceConfig.manual;
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
      {sourceData?.name && (
        <span className="font-medium">{sourceData.name}</span>
      )}
    </div>
  );
};
```

#### 4. **RoutineIntegrationAlert**
```tsx
// Alert component for routine-sourced work orders
const RoutineIntegrationAlert = ({ workOrder }: { workOrder: WorkOrder }) => {
  if (workOrder.source_type !== 'routine') return null;
  
  const routine = workOrder.source_routine;
  const triggerIcon = routine?.trigger_type === 'runtime_hours' ? '⏱️' : '📅';
  const triggerText = routine?.trigger_type === 'runtime_hours' 
    ? `${routine.trigger_runtime_hours}h runtime` 
    : `${routine.trigger_calendar_cays} days`;
  
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Ordem de Rotina</AlertTitle>
      <AlertDescription>
        <div className="space-y-1">
          <div>Rotina: <strong>{routine?.name}</strong></div>
          <div>
            Intervalo: {triggerText} {triggerIcon}
          </div>
          {routine?.last_execution_completed_at && (
            <div>
              Última execução: {format(
                routine.last_execution_completed_at,
                'dd/MM/yyyy HH:mm'
              )}
            </div>
          )}
          {routine?.trigger_type === 'runtime_hours' && routine?.last_execution_runtime_hours && (
            <div className="text-sm text-muted-foreground">
              Horas na última execução: {routine.last_execution_runtime_hours}h
            </div>
          )}
          {routine?.auto_approve_work_orders && (
            <div className="text-green-600 font-medium">
              ✓ Auto-aprovado pela configuração da rotina
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Geração antecipada: {routine?.advance_generation_hours || 24} horas
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
```

#### 5. **WorkOrderTaskList**
```tsx
// Task execution checklist component
const WorkOrderTaskList = ({ tasks, responses, onTaskUpdate }: WorkOrderTaskListProps) => {
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const response = responses.find(r => r.task_id === task.id);
        return (
          <Card key={task.id} className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={response?.completed || false}
                onCheckedChange={(checked) => onTaskUpdate(task.id, { completed: checked })}
              />
              <div className="flex-1 space-y-2">
                <Label>{task.title}</Label>
                {task.type === 'measurement' && (
                  <Input
                    type="number"
                    value={response?.value || ''}
                    onChange={(e) => onTaskUpdate(task.id, { value: e.target.value })}
                    placeholder={task.unit}
                  />
                )}
                {task.requires_photo && (
                  <Button variant="outline" size="sm">
                    <Camera className="mr-2 h-4 w-4" />
                    Adicionar Foto
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
```

#### 6. **RoutineProgressIndicator**
```tsx
// New component for showing routine progress
const RoutineProgressIndicator = ({ routine }: { routine: Routine }) => {
  const progress = routine.progress_percentage || 0;
  const isOverdue = progress >= 100;
  
  const progressColor = progress < 70 ? 'bg-green-500' : 
                       progress < 90 ? 'bg-yellow-500' : 'bg-red-500';
  
  const nextDue = routine.trigger_type === 'runtime_hours'
    ? `~${routine.estimated_hours_until_due}h`
    : format(new Date(routine.next_due_date), 'dd/MM/yyyy');
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{progress}%</span>
        <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
          {isOverdue ? 'Vencido' : nextDue}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${progressColor}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
};
```

#### 7. **RoutineWorkOrderStatus**
```tsx
// New component for showing work order status in routine views
const RoutineWorkOrderStatus = ({ routine }: { routine: Routine }) => {
  if (!routine.open_work_order) return null;
  
  const statusColors = {
    requested: 'text-blue-600',
    approved: 'text-green-600',
    planned: 'text-purple-600',
    scheduled: 'text-indigo-600',
    in_progress: 'text-yellow-600',
    completed: 'text-teal-600',
    on_hold: 'text-orange-600',
    rejected: 'text-red-600',
    cancelled: 'text-gray-600',
  };
  
  return (
    <Alert className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Open Work Order Exists</AlertTitle>
      <AlertDescription>
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span>Work Order: <strong>{routine.open_work_order.work_order_number}</strong></span>
            <Badge className={statusColors[routine.open_work_order.status]}>
              {routine.open_work_order.status_label}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Created: {format(new Date(routine.open_work_order.created_at), 'dd/MM/yyyy HH:mm')}
          </div>
          {routine.open_work_order.assigned_technician && (
            <div className="text-sm text-muted-foreground">
              Assigned to: {routine.open_work_order.assigned_technician.name}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.visit(route('work-orders.show', routine.open_work_order.id))}
            >
              View Work Order →
            </Button>
            {routine.open_work_order.status === 'scheduled' && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => router.visit(route('work-orders.execute', routine.open_work_order.id))}
              >
                Go to Execution →
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
```

## Information Architecture

### Navigation Structure

**Maintenance Discipline** (Current Implementation):
```
/maintenance/work-orders
├── / (Dashboard/List)
├── /create
├── /{id} (Details)
├── /{id}/edit
├── /{id}/planning
├── /{id}/execute
├── /{id}/history
├── /{id}/parts
├── /{id}/analysis
├── /{id}/validate
├── /analytics
├── /reports
└── /calendar
```

**Quality Discipline** (Future Implementation):
```
/quality/work-orders
├── / (Dashboard/List)
├── /create
├── /{id} (Details)
├── /{id}/edit
├── /{id}/planning
├── /{id}/execute
├── /{id}/history
├── /{id}/certificate
├── /{id}/validate
├── /analytics
├── /reports
└── /calendar
```

### Data Display Hierarchy
1. **Summary Level**: KPIs by category, counts, status
2. **List Level**: Essential fields, status, priority, category
3. **Detail Level**: Complete information including source
4. **Execution Level**: Task-focused view with direct responses

### Search & Filter Strategy
- **Quick Search**: WO number, title, asset
- **Category Filter**: Preventive, Corrective, Inspection, Project
- **Source Filter**: Manual, Routine, Sensor, Inspection
- **Advanced Filters**: Multiple criteria
- **Saved Filters**: User preferences
- **Smart Suggestions**: Based on history

## Mobile Considerations

### Responsive Design
- **Desktop**: Full feature set, multi-column layouts
- **Tablet**: Adjusted layouts, touch-optimized
- **Mobile**: Single column, essential features

### Mobile-First Features
1. **Quick Actions**: Swipe gestures
2. **Offline Mode**: Cache critical data
3. **Camera Integration**: Direct photo upload
4. **GPS**: Location verification
5. **Voice Notes**: Audio recordings
6. **Barcode Scanning**: Asset identification

### Mobile Execution View
```
┌─────────────────┐
│ WO-2024-001     │
│ Pump Maint.     │
├─────────────────┤
│ Task 1 of 8     │
│ ┌─────────────┐ │
│ │ □ Check     │ │
│ │   pressure  │ │
│ │ [____] psi  │ │
│ │ [📷] [🎤]   │ │
│ └─────────────┘ │
│ [←] [Complete]  │
└─────────────────┘
```

## API Endpoints with Discipline Context

### Route Structure

All work order endpoints include discipline context:

**Maintenance Discipline**:
```
GET    /api/maintenance/work-orders
POST   /api/maintenance/work-orders
GET    /api/maintenance/work-orders/{id}
PUT    /api/maintenance/work-orders/{id}
DELETE /api/maintenance/work-orders/{id}
GET    /api/maintenance/work-orders/{id}/execute
POST   /api/maintenance/work-orders/{id}/execute
POST   /api/maintenance/work-orders/{id}/approve
POST   /api/maintenance/work-orders/{id}/plan
POST   /api/maintenance/work-orders/{id}/validate
```

**Quality Discipline** (Future):
```
GET    /api/quality/work-orders
POST   /api/quality/work-orders
GET    /api/quality/work-orders/{id}
PUT    /api/quality/work-orders/{id}
DELETE /api/quality/work-orders/{id}
GET    /api/quality/work-orders/{id}/execute
POST   /api/quality/work-orders/{id}/execute
POST   /api/quality/work-orders/{id}/certificate
POST   /api/quality/work-orders/{id}/validate
```

### Request/Response Examples

**Create Work Order Request**:
```json
{
  "source_type": "manual",
  "work_order_category": "preventive",
  "title": "Manutenção Preventiva Bomba P1",
  "description": "Manutenção conforme rotina",
  "asset_id": 123,  // Required for maintenance
  "priority": "normal",
  "priority_score": 50,
  "requested_due_date": "2024-02-01T14:00:00Z",
  "form_id": 45
}
```

**Work Order Response**:
```json
{
  "id": 1001,
  "work_order_number": "WO-2024-1001",
  "discipline": "maintenance",
  "work_order_category": "preventive",
  "title": "Manutenção Preventiva Bomba P1",
  "status": "requested",
  "asset": {
    "id": 123,
    "tag": "PUMP-001",
    "name": "Bomba Centrífuga P1"
  },
  "created_at": "2024-01-20T10:00:00Z",
  "links": {
    "self": "/api/maintenance/work-orders/1001",
    "execute": "/api/maintenance/work-orders/1001/execute",
    "approve": "/api/maintenance/work-orders/1001/approve"
  }
}
```

## Notifications & Alerts

### Real-time Notifications
1. **New Assignment**: "You've been assigned WO-2024-001"
2. **Status Change**: "WO-2024-001 approved"
3. **Overdue Alert**: "WO-2024-001 is overdue"
4. **Completion**: "WO-2024-001 completed by João"

### Alert Types
- **In-app**: Bell icon with count
- **Email**: Configurable preferences
- **SMS**: Critical alerts only
- **Push**: Mobile app notifications

### Notification Settings
```
┌─────────────────────────────────────────────┐
│ Notification Preferences                     │
├─────────────────────────────────────────────┤
│ New Assignments:    [✓] App [✓] Email [ ]SMS│
│ Status Changes:     [✓] App [ ] Email [ ]SMS│
│ Overdue Alerts:     [✓] App [✓] Email [✓]SMS│
│ Daily Summary:      [ ] App [✓] Email [ ]SMS│
└─────────────────────────────────────────────┘
```

## Performance Considerations

### Loading States
- Skeleton screens for initial load
- Progressive data loading
- Optimistic UI updates
- Background sync

### Caching Strategy
- Cache work order lists
- Prefetch common filters
- Store form templates locally
- Queue offline actions

### Search Optimization
- Debounced search input
- Indexed searchable fields
- Faceted search results
- Search history

## Accessibility Features

### WCAG 2.1 AA Compliance
- Proper heading hierarchy
- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

### Keyboard Shortcuts
- `Ctrl+N`: New work order
- `Ctrl+S`: Save
- `Ctrl+Enter`: Submit
- `Esc`: Cancel/Close
- `Tab`: Navigate fields
- `Space`: Toggle checkbox

## Error Handling

### Validation Errors
- Inline field validation
- Clear error messages in Portuguese
- Highlight problem fields
- Suggest corrections

### System Errors
- User-friendly error pages
- Retry mechanisms
- Error reporting option
- Fallback to cached data

### Connection Issues
- Offline indicator
- Queue actions for sync
- Auto-retry failed requests
- Manual sync option

## Implementation Strategy

### Overview
This section provides a step-by-step implementation guide for the unified Work Order Management System UI. Each phase builds upon the previous one, ensuring a systematic and testable approach.

### Phase 1: Foundation Setup (Days 1-2)

#### Step 1.1: Create Base Types and Interfaces
```typescript
// types/permissions.ts
export type UserPermissions = string[];

// types/page-props.ts
export interface PageProps {
  auth: {
    user: User;
    permissions: string[];
  };
  // ... other props
}

// types/work-order.ts
export interface WorkOrder {
  id: number;
  work_order_number: string;
  discipline: 'maintenance' | 'quality';
  title: string;
  description?: string;
  work_order_type_id: number;
  work_order_category: 'corrective' | 'preventive' | 'inspection' | 'project' |
                      'calibration' | 'quality_control' | 'quality_audit' | 'non_conformance';
  priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
  priority_score: number;
  status: string;
  
  // Asset relationship (maintenance discipline)
  asset_id?: number;
  asset?: Asset;
  
  // Instrument relationship (quality discipline - future)
  instrument_id?: number;
  instrument?: Instrument;
  
  // Form integration
  form_id?: number;
  form_version_id?: number;
  custom_tasks?: CustomTask[];
  
  // Source tracking
  source_type: 'manual' | 'routine' | 'sensor' | 'inspection' | 
               'calibration_schedule' | 'quality_alert' | 'audit' | 'complaint';
  source_id?: number;
  source_routine?: {
    id: number;
    name: string;
    trigger_type: 'runtime_hours' | 'calendar_days';
    trigger_runtime_hours?: number;
    trigger_calendar_cays?: number;
    execution_mode: 'automatic' | 'manual';
    last_execution_completed_at?: string;
    last_execution_runtime_hours?: number;
    advance_generation_hours: number;
    auto_approve_work_orders: boolean;
  };
  
  // Quality-specific fields (sparse)
  calibration_due_date?: string;
  certificate_number?: string;
  compliance_standard?: string;
  tolerance_specs?: any;
  
  // ... other fields from specification
}

// Discipline configuration types
export interface DisciplineConfig {
  discipline: 'maintenance' | 'quality';
  allowedCategories: string[];
  allowedSources: string[];
  requiresComplianceFields: boolean;
  requiresCalibrationTracking: boolean;
}

// Constants for discipline-specific values
export const MAINTENANCE_CATEGORIES = [
  { value: 'preventive', label: 'Preventiva' },
  { value: 'corrective', label: 'Corretiva' },
  { value: 'inspection', label: 'Inspeção' },
  { value: 'project', label: 'Projeto' }
];

export const QUALITY_CATEGORIES = [
  { value: 'calibration', label: 'Calibração' },
  { value: 'quality_control', label: 'Controle de Qualidade' },
  { value: 'quality_audit', label: 'Auditoria' },
  { value: 'non_conformance', label: 'Não Conformidade' }
];

export const MAINTENANCE_SOURCES = [
  { value: 'manual', label: 'Manual' },
  { value: 'routine', label: 'Rotina' },
  { value: 'sensor', label: 'Sensor' },
  { value: 'inspection', label: 'Inspeção' }
];

export const QUALITY_SOURCES = [
  { value: 'manual', label: 'Manual' },
  { value: 'calibration_schedule', label: 'Cronograma de Calibração' },
  { value: 'quality_alert', label: 'Alerta de Qualidade' },
  { value: 'audit', label: 'Auditoria' },
  { value: 'complaint', label: 'Reclamação' }
];

export interface WorkOrderExecution {
  id: number;
  work_order_id: number;
  executed_by: number;
  status: 'assigned' | 'in_progress' | 'paused' | 'completed';
  started_at?: string;
  completed_at?: string;
  work_performed?: string;
  follow_up_required: boolean;
  // ... other fields
}

export interface TaskResponse {
  id: number;
  work_order_execution_id: number;
  form_task_id: number;
  response_type: string;
  response_value?: any;
  completed: boolean;
  // Direct link to work order execution, no FormExecution
}

// types/routine.ts
export interface Routine {
  id: number;
  name: string;
  description?: string;
  asset_id: number;
  asset?: Asset;
  form_id: number;
  form_version_id: number;
  trigger_type: 'runtime_hours' | 'calendar_days';
  trigger_runtime_hours?: number;
  trigger_calendar_cays?: number;
  execution_mode: 'automatic' | 'manual';
  advance_generation_hours: number;
  auto_approve_work_orders: boolean;
  priority: string;
  priority_score: number;
  last_execution_runtime_hours?: number;
  last_execution_completed_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed fields from API
  progress_percentage?: number;
  estimated_hours_until_due?: number;
  next_due_date?: string;
  has_active_work_order?: boolean;
  
  // Related open work order if exists
  open_work_order?: {
    id: number;
    work_order_number: string;
    status: string;
    status_label: string;
    created_at: string;
    scheduled_start_date?: string;
    assigned_technician?: {
      id: number;
      name: string;
    };
  };
}

// Constants for trigger types
export const TRIGGER_TYPES = [
  { 
    value: 'runtime_hours', 
    label: 'Horas de Operação',
    icon: '⏱️',
    description: 'Baseado nas horas de funcionamento do ativo'
  },
  { 
    value: 'calendar_days', 
    label: 'Dias Calendário',
    icon: '📅',
    description: 'Baseado em dias corridos'
  }
];
```

#### Step 1.2: Create API Service Layer
```typescript
// services/work-order.service.ts
export const workOrderService = {
  list: (params: ListParams) => axios.get('/api/work-orders', { params }),
  get: (id: number) => axios.get(`/api/work-orders/${id}`),
  create: (data: CreateWorkOrderData) => axios.post('/api/work-orders', data),
  update: (id: number, data: UpdateWorkOrderData) => axios.put(`/api/work-orders/${id}`, data),
  delete: (id: number) => axios.delete(`/api/work-orders/${id}`),
  // ... other methods
};
```

#### Step 1.3: Setup Route Structure
1. Create route files in `resources/js/pages/work-orders/`
2. Register routes in `routes/work-orders.php`
3. Add navigation items to sidebar

### Phase 2: List and Dashboard Views (Days 3-4)

#### Step 2.1: Implement Work Order List Page
```tsx
// pages/work-orders/index.tsx
import { usePage } from '@inertiajs/react';

export default function WorkOrderIndex() {
  const { workOrders, discipline } = usePage().props;
  
  // Get discipline-specific configurations
  const categories = discipline === 'maintenance' 
    ? MAINTENANCE_CATEGORIES 
    : QUALITY_CATEGORIES;
    
  const columns = [
    {
      key: 'work_order_number',
      label: 'Número',
      sortable: true,
    },
    {
      key: 'title',
      label: 'Título',
      sortable: true,
    },
    // Conditional column based on discipline
    ...(discipline === 'maintenance' ? [{
      key: 'asset',
      label: 'Ativo',
      render: (_, row) => row.asset?.tag || '-',
    }] : [{
      key: 'instrument',
      label: 'Instrumento',
      render: (_, row) => row.instrument?.tag || '-',
    }]),
    {
      key: 'category',
      label: 'Categoria',
      render: (value) => <WorkOrderCategoryBadge category={value} discipline={discipline} />,
    },
    // ... other columns
  ];
  
  return (
    <div>
      <DisciplineHeader discipline={discipline} />
      <WorkOrderKPIs discipline={discipline} categories={categories} />
      <EntityDataTable columns={columns} data={workOrders} />
    </div>
  );
}
```

#### Step 2.2: Create Dashboard KPIs
```tsx
// components/work-orders/DashboardKPIs.tsx
1. Create KPI cards for open, in progress, overdue, completed
2. Implement trend indicators
3. Add click handlers to filter list
```

#### Step 2.3: Implement Search and Filters
```tsx
// components/work-orders/WorkOrderFilters.tsx
1. Create filter panel with status, priority, date range
2. Use ItemSelect for dropdowns
3. Implement date range picker
4. Add clear filters functionality
```

### Phase 3: Create Work Order Flow (Days 5-6)

#### Step 3.1: Build Create Work Order Form
```tsx
// pages/work-orders/create.tsx
import { usePage } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';

export default function WorkOrderCreate() {
  const { discipline } = usePage().props;
  
  const form = useForm({
    discipline: discipline,
    source_type: 'manual',
    work_order_category: '',
    title: '',
    description: '',
    asset_id: null,
    instrument_id: null,
    priority: 'normal',
    priority_score: 50,
    // ... other fields
  });
  
  // Get allowed values based on discipline
  const categories = discipline === 'maintenance' 
    ? MAINTENANCE_CATEGORIES 
    : QUALITY_CATEGORIES;
    
  const sources = discipline === 'maintenance'
    ? MAINTENANCE_SOURCES
    : QUALITY_SOURCES;
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      form.post(route(`${discipline}.work-orders.store`));
    }}>
      {/* Source Selection */}
      <ItemSelect
        label="Fonte"
        items={sources}
        value={form.data.source_type}
        onValueChange={(value) => form.setData('source_type', value)}
      />
      
      {/* Category Selection */}
      <RadioGroup
        value={form.data.work_order_category}
        onValueChange={(value) => form.setData('work_order_category', value)}
      >
        {categories.map(cat => (
          <RadioGroupItem key={cat.value} value={cat.value}>
            {cat.label}
          </RadioGroupItem>
        ))}
      </RadioGroup>
      
      {/* Conditional Fields */}
      {discipline === 'maintenance' ? (
        <AssetSelector
          value={form.data.asset_id}
          onChange={(id) => form.setData('asset_id', id)}
          required
          error={form.errors.asset_id}
        />
      ) : (
        form.data.work_order_category === 'calibration' && (
          <InstrumentSelector
            value={form.data.instrument_id}
            onChange={(id) => form.setData('instrument_id', id)}
            required
            error={form.errors.instrument_id}
          />
        )
      )}
      
      {/* Common fields */}
      {/* ... */}
    </form>
  );
}
```

#### Step 3.2: Implement Form Validation
```typescript
// requests/StoreWorkOrderRequest.ts
1. Create Yup/Zod schema for validation
2. Implement custom validation rules
3. Add Portuguese error messages
4. Handle server-side validation errors
```

#### Step 3.3: Create Success Flow
```tsx
1. Handle successful creation
2. Show success toast/notification
3. Redirect to details or list
4. Update list cache if using SWR/React Query
```

### Phase 4: Work Order Details View (Days 7-8)

#### Step 4.1: Create Details Layout
```tsx
// pages/work-orders/show.tsx
1. Implement tabbed interface
2. Create details tab with all fields
3. Add status badge and priority indicator
4. Implement action buttons based on status
```

#### Step 4.2: Add History Tab
```tsx
// components/work-orders/HistoryTab.tsx
1. Create timeline component
2. Show status transitions
3. Display user actions with timestamps
4. Add audit log entries
```

#### Step 4.3: Implement Parts Tab
```tsx
// components/work-orders/PartsTab.tsx
1. Show planned vs used parts
2. Add part status indicators
3. Implement cost calculations
4. Show variance analysis
```

### Phase 5: Approval and Planning Screens (Days 9-10)

#### Step 5.1: Build Approval Screen
```tsx
// pages/work-orders/approve.tsx
1. Create approval form layout
2. Show request details
3. Add decision radio buttons
4. Implement comments field
5. Handle approval/rejection flow
```

#### Step 5.2: Implement Planning Screen
```tsx
// pages/work-orders/planning.tsx
1. Create resource planning section
2. Build parts planning table
3. Add schedule assignment
4. Implement cost calculations
5. Handle status transitions
```

### Phase 6: Execution Flow (Days 11-12)

#### Step 6.1: Create Execution Screen
```tsx
// pages/work-orders/execute.tsx
1. Build task checklist component with direct response collection
2. Add timer functionality
3. Implement pause/resume
4. Create parts usage tracking
5. Add photo upload capability
6. No FormExecution - direct task responses
```

#### Step 6.2: Implement Task Responses
```tsx
// components/work-orders/TaskResponse.tsx
1. Handle different task types
2. Create measurement inputs
3. Add file upload for evidence
4. Implement validation per task type
5. Direct save to work_order_execution_id
```

#### Step 6.3: Handle Routine Completion
```tsx
// When work order from routine is completed:
1. Update routine's last_execution_runtime_hours
2. Update routine's last_execution_completed_at
3. Record form version used
4. Trigger next cycle calculation
```

### Phase 7: Validation and Completion (Days 13-14)

#### Step 7.1: Build Validation Screen
```tsx
// pages/work-orders/validate.tsx
1. Create validation checklist
2. Show execution summary
3. Display parts variance
4. Add validation decision buttons
5. Handle rework requests
```

#### Step 7.2: Implement Failure Analysis
```tsx
// pages/work-orders/analysis.tsx
1. Create failure classification form
2. Add impact assessment
3. Implement corrective actions
4. Generate analysis reports
```

### Phase 8: Routine Configuration UI (Days 15-16)

#### Step 8.1: Create Routine Form Component
```tsx
// components/routines/RoutineForm.tsx
import { useForm } from '@inertiajs/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, Calendar, Lock } from 'lucide-react';

export function RoutineForm({ routine, permissions }: { routine?: Routine; permissions: UserPermissions }) {
  const form = useForm({
    name: routine?.name || '',
    description: routine?.description || '',
    asset_id: routine?.asset_id || null,
    form_id: routine?.form_id || null,
    trigger_type: routine?.trigger_type || 'runtime_hours',
    trigger_runtime_hours: routine?.trigger_runtime_hours || null,
    trigger_calendar_cays: routine?.trigger_calendar_cays || null,
    execution_mode: routine?.execution_mode || 'manual',
    advance_generation_hours: routine?.advance_generation_hours || 24,
    auto_approve_work_orders: routine?.auto_approve_work_orders || false,
    priority: routine?.priority || 'normal',
    priority_score: routine?.priority_score || 50,
  });
  
  const canApproveWorkOrders = permissions.includes('work-orders.approve');
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (routine) {
        form.put(route('routines.update', routine.id));
      } else {
        form.post(route('routines.store'));
      }
    }}>
      {/* Basic fields... */}
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Trigger Configuration</h3>
        
        <div>
          <Label>Trigger Type*</Label>
          <RadioGroup
            value={form.data.trigger_type}
            onValueChange={(value) => form.setData('trigger_type', value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="runtime_hours" id="runtime_hours" />
              <Label htmlFor="runtime_hours" className="flex items-center cursor-pointer">
                <Clock className="h-4 w-4 mr-2" />
                Runtime Hours - Based on asset operating hours
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="calendar_days" id="calendar_days" />
              <Label htmlFor="calendar_days" className="flex items-center cursor-pointer">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar Days - Based on calendar days
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {form.data.trigger_type === 'runtime_hours' && (
          <div>
            <Label htmlFor="trigger_runtime_hours">Runtime Interval (hours)*</Label>
            <Input
              id="trigger_runtime_hours"
              type="number"
              min={1}
              max={10000}
              value={form.data.trigger_runtime_hours || ''}
              onChange={(e) => form.setData('trigger_runtime_hours', parseInt(e.target.value))}
              placeholder="e.g., 500"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Maintenance will be due after this many operating hours
            </p>
          </div>
        )}
        
        {form.data.trigger_type === 'calendar_days' && (
          <div>
            <Label htmlFor="trigger_calendar_cays">Calendar Interval (days)*</Label>
            <Input
              id="trigger_calendar_cays"
              type="number"
              min={1}
              max={365}
              value={form.data.trigger_calendar_cays || ''}
              onChange={(e) => form.setData('trigger_calendar_cays', parseInt(e.target.value))}
              placeholder="e.g., 30"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Maintenance will be due after this many calendar days
            </p>
          </div>
        )}
        
        <h3 className="text-lg font-medium">Work Order Generation Settings</h3>
        
        {form.data.execution_mode === 'automatic' && (
          <div>
            <Label htmlFor="advance_generation_hours">
              Advance Generation Hours*
            </Label>
            <Input
              id="advance_generation_hours"
              type="number"
              min={1}
              max={168}
              value={form.data.advance_generation_hours}
              onChange={(e) => form.setData('advance_generation_hours', parseInt(e.target.value))}
              className={form.errors.advance_generation_hours ? 'border-red-500' : ''}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Generate work order this many hours before it's due (1-168 hours)
            </p>
            {form.errors.advance_generation_hours && (
              <p className="text-sm text-red-500 mt-1">{form.errors.advance_generation_hours}</p>
            )}
          </div>
        )}
        
        <div className="flex items-start space-x-3">
          <Checkbox
            id="auto_approve_work_orders"
            checked={form.data.auto_approve_work_orders}
            onCheckedChange={(checked) => {
              if (canApproveWorkOrders) {
                form.setData('auto_approve_work_orders', checked);
              }
            }}
            disabled={!canApproveWorkOrders}
            className={!canApproveWorkOrders ? 'opacity-50 cursor-not-allowed' : ''}
          />
          <div className="space-y-1">
            <Label 
              htmlFor="auto_approve_work_orders" 
              className={`cursor-pointer ${!canApproveWorkOrders ? 'opacity-50' : ''}`}
            >
              Automatically approve generated work orders
            </Label>
            <p className="text-sm text-muted-foreground">
              {canApproveWorkOrders 
                ? 'Work orders created from this routine will skip the approval process'
                : 'Requires work order approval permission'}
            </p>
            {!canApproveWorkOrders && (
              <div className="flex items-center gap-1 text-sm text-amber-600">
                <Lock className="h-3 w-3" />
                <span>You need 'work-orders.approve' permission to enable this option</span>
              </div>
            )}
          </div>
        </div>
        
        {form.data.auto_approve_work_orders && canApproveWorkOrders && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Work orders will be automatically approved and ready for planning. 
              Ensure this routine has been properly reviewed before enabling this option.
            </AlertDescription>
          </Alert>
        )}
        
        {form.errors.auto_approve_work_orders && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.errors.auto_approve_work_orders}
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* Execution History Display */}
      {routine && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Execution History</h4>
          {routine.last_execution_completed_at ? (
            <div className="space-y-1 text-sm">
              <div>Last Execution: {format(new Date(routine.last_execution_completed_at), 'dd/MM/yyyy HH:mm')}</div>
              {routine.trigger_type === 'runtime_hours' && routine.last_execution_runtime_hours && (
                <>
                  <div>Runtime at Last: {routine.last_execution_runtime_hours}h</div>
                  <div>Current Runtime: {routine.asset?.current_runtime_hours}h</div>
                </>
              )}
              {routine.trigger_type === 'calendar_days' && (
                <div>Days Since Last: {Math.floor((Date.now() - new Date(routine.last_execution_completed_at).getTime()) / (1000 * 60 * 60 * 24))} days</div>
              )}
              <RoutineProgressIndicator routine={routine} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No execution history</p>
          )}
        </div>
      )}
      
      <div className="flex justify-end space-x-4 mt-6">
        <Button type="button" variant="outline" onClick={() => router.visit(route('routines.index'))}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.processing}>
          {form.processing ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
```

#### Step 8.2: Create Routine List Component
```tsx
// pages/routines/index.tsx
export default function RoutineIndex({ routines }: { routines: PaginatedData<Routine> }) {
  const columns = [
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
    },
    {
      key: 'asset',
      label: 'Ativo',
      render: (_, row) => row.asset?.tag || '-',
    },
    {
      key: 'trigger',
      label: 'Trigger',
      render: (_, row) => {
        const icon = row.trigger_type === 'runtime_hours' ? '⏱️' : '📅';
        const value = row.trigger_type === 'runtime_hours' 
          ? `${row.trigger_runtime_hours}h` 
          : `${row.trigger_calendar_cays}d`;
        return <span>{value} {icon}</span>;
      },
    },
    {
      key: 'progress',
      label: 'Progresso',
      render: (_, row) => <RoutineProgressIndicator routine={row} />,
      width: 'w-[200px]',
    },
    {
      key: 'next_due',
      label: 'Próximo Vencimento',
      render: (_, row) => {
        if (!row.next_due_date && !row.estimated_hours_until_due) {
          return <span className="text-muted-foreground">-</span>;
        }
        
        if (row.trigger_type === 'runtime_hours') {
          return <span>~{row.estimated_hours_until_due}h</span>;
        } else {
          return <span>{format(new Date(row.next_due_date), 'dd/MM/yyyy')}</span>;
        }
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => (
        <Badge variant={row.is_active ? 'default' : 'secondary'}>
          {row.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rotinas de Manutenção</h1>
        <Button onClick={() => router.visit(route('routines.create'))}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Rotina
        </Button>
      </div>
      
      <div className="mb-4 space-x-2">
        <Button variant="outline" size="sm">Todas</Button>
        <Button variant="outline" size="sm">
          <Clock className="h-4 w-4 mr-1" />
          Baseadas em Horas
        </Button>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-1" />
          Baseadas em Calendário
        </Button>
        <Button variant="outline" size="sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          Vencendo em Breve
        </Button>
      </div>
      
      <EntityDataTable
        data={routines}
        columns={columns}
        onRowClick={(row) => router.visit(route('routines.show', row.id))}
      />
    </div>
  );
}
```

### Phase 9: Reports and Analytics (Days 17-18)

#### Step 8.1: Create Analytics Dashboard
```tsx
// pages/work-orders/analytics.tsx
1. Implement chart components
2. Add date range selector
3. Create KPI calculations
4. Add export functionality
```

#### Step 8.2: Build Report Generation
```tsx
// components/work-orders/ReportGenerator.tsx
1. Create report templates
2. Implement PDF generation
3. Add scheduling capability
4. Create email delivery
```

### Phase 9: Mobile Optimization (Days 17-18)

#### Step 9.1: Responsive Layouts
```tsx
1. Adjust all screens for mobile
2. Create mobile-specific navigation
3. Optimize forms for touch
4. Test on various devices
```

#### Step 9.2: Mobile-Specific Features
```tsx
1. Implement camera integration
2. Add offline capability
3. Create simplified execution view
4. Add GPS location tracking
```

### Phase 10: Integration and Testing (Days 19-20)

#### Step 10.1: Integration Testing
```typescript
// tests/work-orders/integration.test.ts
1. Test complete work order lifecycle
2. Verify status transitions
3. Test permission-based access
4. Validate data persistence
```

#### Step 10.2: User Acceptance Testing
```typescript
1. Create test scenarios
2. Document test cases
3. Perform end-to-end testing
4. Fix identified issues
```

### Implementation Checklist

#### Backend Prerequisites
- [ ] All migrations executed including unified work order tables
- [ ] Models and relationships created (WorkOrder, WorkOrderExecution)
- [ ] Controllers with proper authorization
- [ ] API routes configured
- [ ] Form requests with validation
- [ ] Seeders for test data
- [ ] Routine integration services

#### Frontend Components
- [ ] Type definitions created for unified model
- [ ] Shared components integrated
- [ ] Work order specific components built
- [ ] Category and source indicators
- [ ] Form validation implemented
- [ ] Error handling added
- [ ] Loading states implemented
- [ ] Routine integration UI

#### Features
- [ ] CRUD operations working
- [ ] Status transitions functional
- [ ] Direct task response collection
- [ ] Routine source handling
- [ ] File uploads configured
- [ ] Notifications integrated
- [ ] Search and filters working
- [ ] Pagination implemented

#### Quality Assurance
- [ ] Unit tests written
- [ ] Integration tests passing
- [ ] Accessibility verified
- [ ] Performance optimized
- [ ] Security reviewed
- [ ] Documentation complete

### Component Refactoring Guide

#### Existing Components to Update

1. **app-sidebar.tsx**
   ```tsx
   // Add discipline context to navigation
   const currentDiscipline = route().current()?.includes('quality') ? 'quality' : 'maintenance';
   
   // Show discipline-specific menu items
   {currentDiscipline === 'maintenance' && (
     <>
       <SidebarMenuItem href="/maintenance/work-orders">
         <Wrench className="h-4 w-4" />
         <span>Ordens de Manutenção</span>
       </SidebarMenuItem>
       <SidebarMenuItem href="/maintenance/routines">
         <Clock className="h-4 w-4" />
         <span>Rotinas</span>
       </SidebarMenuItem>
     </>
   )}
   ```

2. **WorkOrderStatusBadge.tsx**
   - No changes needed (works for both disciplines)

3. **WorkOrderPriorityIndicator.tsx**
   - No changes needed (works for both disciplines)

4. **EntityDataTable.tsx**
   - No changes needed (already flexible)

5. **ItemSelect.tsx**
   - No changes needed (already flexible)

#### New Components to Create

1. **DisciplineHeader.tsx**
   ```tsx
   interface DisciplineHeaderProps {
     discipline: 'maintenance' | 'quality';
   }
   
   export function DisciplineHeader({ discipline }: DisciplineHeaderProps) {
     const config = {
       maintenance: {
         title: 'Ordens de Manutenção',
         icon: Wrench,
         color: 'text-blue-600'
       },
       quality: {
         title: 'Ordens de Qualidade',
         icon: CheckSquare,
         color: 'text-green-600'
       }
     };
     
     const { title, icon: Icon, color } = config[discipline];
     
     return (
       <div className={`flex items-center gap-2 ${color}`}>
         <Icon className="h-6 w-6" />
         <h1 className="text-2xl font-bold">{title}</h1>
       </div>
     );
   }
   ```

2. **WorkOrderKPIs.tsx**
   ```tsx
   interface WorkOrderKPIsProps {
     discipline: 'maintenance' | 'quality';
     categories: Array<{value: string; label: string}>;
   }
   
   export function WorkOrderKPIs({ discipline, categories }: WorkOrderKPIsProps) {
     // Fetch KPI data based on discipline
     // Display category-specific counts
   }
   ```

3. **CategorySelector.tsx**
   ```tsx
   interface CategorySelectorProps {
     discipline: 'maintenance' | 'quality';
     value: string;
     onChange: (value: string) => void;
   }
   
   export function CategorySelector({ discipline, value, onChange }: CategorySelectorProps) {
     const categories = discipline === 'maintenance' 
       ? MAINTENANCE_CATEGORIES 
       : QUALITY_CATEGORIES;
       
     return (
       <RadioGroup value={value} onValueChange={onChange}>
         {categories.map(category => (
           <RadioGroupItem key={category.value} value={category.value}>
             <WorkOrderCategoryBadge 
               category={category.value} 
               discipline={discipline} 
             />
             <span className="ml-2">{category.label}</span>
           </RadioGroupItem>
         ))}
       </RadioGroup>
     );
   }
   ```

### Common Pitfalls to Avoid

1. **Status Management**
   - Always check allowed transitions
   - Handle concurrent updates
   - Maintain status history

2. **Permission Handling**
   - Check permissions on frontend and backend
   - Hide unavailable actions
   - Show appropriate error messages

3. **Data Consistency**
   - Use transactions for multi-table updates
   - Implement optimistic locking
   - Handle race conditions

4. **Performance**
   - Lazy load heavy components
   - Implement proper pagination
   - Cache frequently accessed data
   - Optimize queries with proper indexes

5. **User Experience**
   - Provide clear feedback
   - Show loading states
   - Handle errors gracefully
   - Maintain form state on errors

6. **Discipline Separation**
   - Don't mix discipline logic in components
   - Use configuration objects for discipline-specific values
   - Keep discipline context consistent through navigation
   - Validate discipline-specific requirements

7. **Work Order Generation Rules**
   - Always check for open work orders before generation
   - Consider all statuses except 'verified' and 'closed' as open
   - Show clear messages when generation is blocked
   - Provide links to existing work orders
   - Don't create duplicate work orders from same routine

### Development Tools and Utilities

#### Recommended VS Code Extensions
- Laravel Idea
- Inertia.js
- Tailwind CSS IntelliSense
- ESLint
- Prettier

#### Useful Commands
```bash
# Generate TypeScript types from Laravel models
php artisan typescript:generate

# Create new Inertia page
php artisan make:page WorkOrders/Create

# Run tests
php artisan test --filter=WorkOrder
npm run test:workorders

# Build for production
npm run build
php artisan optimize
```

### Next Steps After Implementation

1. **Performance Monitoring**
   - Set up application monitoring
   - Track page load times
   - Monitor API response times

2. **User Training**
   - Create user guides
   - Record training videos
   - Set up help documentation

3. **Continuous Improvement**
   - Gather user feedback
   - Analyze usage patterns
   - Plan feature enhancements 
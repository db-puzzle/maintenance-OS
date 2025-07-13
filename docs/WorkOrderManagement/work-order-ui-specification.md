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

The Work Order Management System UI provides a comprehensive interface for creating, managing, executing, and analyzing maintenance work orders. The system follows Inertia.js with React patterns and maintains consistency with the existing maintenance OS design system.

### Key Design Principles
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
│ │ Open WOs    │ │ In Progress │ │ Overdue     │ │Completed││
│ │    142      │ │     28      │ │     15      │ │   892   ││
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
- Key performance indicators (KPIs)
- Work order list with essential details
- Quick action buttons
- Filter and search capabilities

**User Actions**:
- Create new work order
- Filter by status, priority, date, asset, technician
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
2. **Routine Generation** - Automatically created from maintenance routines
3. **Sensor Alert** - Created from sensor threshold violations
4. **Inspection Finding** - Created during inspection work orders

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

### 4. Work Order Planning (`/maintenance/work-orders/{id}/planning`)

**Purpose**: Detailed planning phase after approval, before scheduling

**Access**: Only for work orders in `approved` or `planned` status

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Planning: WO-2024-001 - Manutenção Bomba P1                │
│ Status: Approved → Planning                                  │
├─────────────────────────────────────────────────────────────┤
│ Resource Planning:                                           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Estimated Hours*    [4.0] hours                         ││
│ │ Labor Cost/Hour     R$ [150.00]                         ││
│ │ Estimated Labor     R$ 600.00 (calculated)             ││
│ │                                                         ││
│ │ Downtime Required   [✓] Yes                            ││
│ │ Safety Requirements [+ Add requirement]                 ││
│ │ • LOTO required                                         ││
│ │ • Confined space permit                                ││
│ │                                                         ││
│ │ Required Skills     [+ Add skill]                       ││
│ │ • Pump maintenance certified                           ││
│ │ • Hydraulic systems                                    ││
│ │                                                         ││
│ │ Required Certs      [+ Add certification]              ││
│ │ • NR-10 Electrical safety                              ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Parts Planning:                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [+ Add Part]                                            ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ Part Name          Part #      Qty    Unit Cost  Total ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ Mechanical Seal    MS-2340     1      R$ 450.00  450.00││
│ │ O-Ring Set         OR-125      2      R$ 25.00   50.00 ││
│ │ Bearing            6205-2RS    2      R$ 180.00  360.00││
│ ├─────────────────────────────────────────────────────────┤│
│ │ Estimated Parts Cost:                      R$ 860.00    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Schedule Planning:                                           │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Scheduled Start     [📅 2024-01-25 08:00]              ││
│ │ Scheduled End       [📅 2024-01-25 12:00]              ││
│ │ Assigned Team       [Mechanical Team ▼]                ││
│ │ Lead Technician     [João Silva ▼]                     ││
│ │ Support Tech        [Maria Santos ▼]                   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Total Estimated Cost: R$ 1,460.00                           │
│                                                              │
│ [Cancel]                    [Save Draft] [Complete Planning] │
└─────────────────────────────────────────────────────────────┘
```

**Planning Actions**:
1. Define resource requirements
2. Estimate time and costs
3. Plan parts and materials
4. Set safety requirements
5. Define skill requirements
6. Schedule work window
7. Assign team/technicians

**Parts Management**:
- Add parts with quantities and costs
- Check inventory availability
- Reserve parts (optional)
- Calculate total parts cost
- Track part status: `planned`, `reserved`, `issued`, `used`, `returned`

**Validations**:
- All required fields filled
- Scheduled end after scheduled start
- Assigned technician has required skills
- Parts availability warnings
- Total cost calculation accuracy

**Status Transitions**:
- `approved` → `planned` (after saving)
- `planned` → `ready_to_schedule` (when fully planned with dates)

### 4. Work Order Details (`/maintenance/work-orders/{id}`)

**Purpose**: Comprehensive view of work order with all related information and actions

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ WO-2024-001 - Manutenção Preventiva Bomba P1               │
│ Status: In Progress | Priority: Critical | 75% Complete     │
├─────────────────────────────────────────────────────────────┤
│ [Tabs: Details | Execution | History | Parts | Analysis]    │
├─────────────────────────────────────────────────────────────┤
│ Details Tab:                                                 │
│ ┌─────────────────────┬─────────────────────────────────┐  │
│ │ Asset Information   │ Schedule & Assignment           │  │
│ ├─────────────────────┼─────────────────────────────────┤  │
│ │ Plant: Plant 1      │ Created: 2024-01-15 08:00      │  │
│ │ Area: Area A        │ Planned: 2024-01-20 08:00      │  │
│ │ Asset: PUMP-001     │ Started: 2024-01-20 08:15      │  │
│ │ Type: Bomba         │ Due: 2024-01-20 12:00          │  │
│ │                     │ Assigned: João Silva            │  │
│ └─────────────────────┴─────────────────────────────────┘  │
│                                                              │
│ Description:                                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Realizar manutenção preventiva conforme checklist       ││
│ │ padrão. Verificar vibração, temperatura e vazamentos.    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Action Buttons:                                              │
│ [Edit] [Execute] [Assign] [Print] [Export] [Cancel]         │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Complete work order details
- Current status and progress
- Asset hierarchy information
- Schedule and assignment details
- Related documents and forms
- Execution history
- Parts used
- Failure analysis (if applicable)

**User Actions**:
- Edit work order (if permitted)
- Start/resume execution
- Reassign technician
- Update status
- Add comments/notes
- Attach documents/photos
- Print work order
- Export to PDF
- Cancel work order (with reason)

**Validations**:
- Status-based action availability
- Permission checks for each action
- Cannot edit if in execution
- Cannot cancel if completed

### 4. Work Order Execution (`/maintenance/work-orders/{id}/execute`)

**Purpose**: Guide technicians through work order execution with task tracking

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Executing: WO-2024-001                    [Pause] [Cancel]  │
│ Started: 08:15 | Elapsed: 02:45 | Progress: 75%            │
├─────────────────────────────────────────────────────────────┤
│ Task Checklist (6/8 completed):                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ✓ 1. Desligar equipamento e aplicar LOTO               ││
│ │ ✓ 2. Verificar pressão de sucção: [125 psi]            ││
│ │ ✓ 3. Medir vibração no mancal: [2.5 mm/s]              ││
│ │ ✓ 4. Verificar temperatura: [45°C]                     ││
│ │ ✓ 5. Inspecionar acoplamento: [OK ▼]                   ││
│ │ ✓ 6. Verificar vazamentos: [Nenhum ▼]                  ││
│ │ ○ 7. Trocar óleo lubrificante                          ││
│ │   └─ [📷] [📎] [Add note...]                           ││
│ │ ○ 8. Religar e testar operação                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Parts Used:                                                  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [+ Add Part]                                            ││
│ │ • Óleo ISO VG 46 - 2L                                  ││
│ │ • Filtro de óleo - 1 un                                ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Notes:                                                       │
│ [_________________________________________________________] │
│                                                              │
│ [Save Progress]                    [Complete Work Order →]   │
└─────────────────────────────────────────────────────────────┘
```

**Information Displayed**:
- Execution timer and progress
- Task checklist from form template
- Input fields for measurements
- Parts consumption tracking
- Photo/document attachment options
- Notes section

**User Actions**:
- Check off completed tasks
- Enter measurement values
- Upload photos/documents
- Add parts used
- Add execution notes
- Pause execution
- Save progress
- Complete work order

**Validations**:
- Required measurements must be filled
- Values within acceptable ranges (warnings)
- All mandatory tasks must be completed
- Parts availability validation
- Cannot complete with open tasks

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

### 8. Reports & Analytics (`/maintenance/work-orders/analytics`)

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
Requested → Approved → Planned → Ready → Scheduled → In Progress → Completed → Verified → Closed
    ↓          ↓         ↓        ↓         ↓            ↓            ↓           ↓
Rejected   Cancelled  On Hold  On Hold   On Hold     On Hold    In Progress  Completed
```

**Status Descriptions**:
- **Requested**: Initial state, awaiting approval
- **Approved**: Approved for planning
- **Rejected**: Denied by approver (terminal state)
- **Planned**: Resources and parts planned
- **Ready to Schedule**: Fully planned, ready for scheduling
- **Scheduled**: Assigned to technician with dates
- **In Progress**: Currently being executed
- **On Hold**: Temporarily paused
- **Completed**: Work finished, awaiting validation
- **Verified**: Quality validated by validator
- **Closed**: Final state, all documentation complete
- **Cancelled**: Cancelled at any point (terminal state)

**Validations**:
- Only valid transitions allowed per STATUS_TRANSITIONS
- Approval required based on priority/cost thresholds
- Cannot cancel completed/closed work orders
- Reason required for rejection/cancellation
- On hold can return to previous status
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
    scheduled: { label: 'Agendado', variant: 'default' },
    in_progress: { label: 'Em Execução', variant: 'warning' },
    completed: { label: 'Concluído', variant: 'success' },
    verified: { label: 'Verificado', variant: 'success' },
    closed: { label: 'Fechado', variant: 'secondary' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
    on_hold: { label: 'Em Espera', variant: 'warning' },
  };
  
  const config = statusConfig[status] || { label: status, variant: 'default' };
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
```

#### 2. **WorkOrderPriorityIndicator**
```tsx
// Priority indicator with color coding
const WorkOrderPriorityIndicator = ({ priority, showLabel = true }: { priority: string; showLabel?: boolean }) => {
  const priorityConfig = {
    emergency: { color: 'text-red-600', icon: AlertCircle, label: 'Emergência' },
    urgent: { color: 'text-orange-600', icon: AlertTriangle, label: 'Urgente' },
    high: { color: 'text-yellow-600', icon: ChevronUp, label: 'Alta' },
    normal: { color: 'text-blue-600', icon: Minus, label: 'Normal' },
    low: { color: 'text-gray-600', icon: ChevronDown, label: 'Baixa' },
  };
  
  const config = priorityConfig[priority] || priorityConfig.normal;
  const Icon = config.icon;
  
  return (
    <div className={`flex items-center gap-1 ${config.color}`}>
      <Icon className="h-4 w-4" />
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </div>
  );
};
```

#### 3. **WorkOrderTaskList**
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

## Information Architecture

### Navigation Structure
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

### Data Display Hierarchy
1. **Summary Level**: KPIs, counts, status
2. **List Level**: Essential fields, status, priority
3. **Detail Level**: Complete information
4. **Execution Level**: Task-focused view

### Search & Filter Strategy
- **Quick Search**: WO number, title, asset
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
This section provides a step-by-step implementation guide for developers or AI agents building the Work Order Management System UI. Each phase builds upon the previous one, ensuring a systematic and testable approach.

### Phase 1: Foundation Setup (Days 1-2)

#### Step 1.1: Create Base Types and Interfaces
```typescript
// types/work-order.ts
export interface WorkOrder {
  id: number;
  work_order_number: string;
  title: string;
  description?: string;
  work_order_type_id: number;
  work_order_category: 'corrective' | 'preventive' | 'inspection' | 'project';
  priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
  priority_score: number;
  status: string;
  asset_id: number;
  // ... other fields from migration
}

export interface WorkOrderType {
  id: number;
  name: string;
  category: string;
  sla_hours: number;
}
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
1. Create page component with Inertia props
2. Implement EntityDataTable with columns configuration
3. Add filters using ItemSelect components
4. Integrate EntityPagination
5. Add quick action buttons
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
1. Implement multi-step form layout
2. Add source type selection
3. Create asset hierarchy selector
4. Implement priority selector with score
5. Add form template selection
6. Handle draft saving
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
1. Build task checklist component
2. Add timer functionality
3. Implement pause/resume
4. Create parts usage tracking
5. Add photo upload capability
```

#### Step 6.2: Implement Task Responses
```tsx
// components/work-orders/TaskResponse.tsx
1. Handle different task types
2. Create measurement inputs
3. Add file upload for evidence
4. Implement validation per task type
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

### Phase 8: Reports and Analytics (Days 15-16)

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
- [ ] All migrations executed
- [ ] Models and relationships created
- [ ] Controllers with proper authorization
- [ ] API routes configured
- [ ] Form requests with validation
- [ ] Seeders for test data

#### Frontend Components
- [ ] Type definitions created
- [ ] Shared components integrated
- [ ] Work order specific components built
- [ ] Form validation implemented
- [ ] Error handling added
- [ ] Loading states implemented

#### Features
- [ ] CRUD operations working
- [ ] Status transitions functional
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
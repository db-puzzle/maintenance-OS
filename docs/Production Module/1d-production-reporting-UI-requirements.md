# Production Reporting Screen Requirements

## 1. Overview

The Production Reporting screen is a unified interface for shop floor operators and supervisors to view and manage Manufacturing Orders (MOs) through their lifecycle. This screen must support both MOs with routing steps (multi-step workflows) and simple MOs without routing (direct production).

### Key Personas
- **Shop Floor Operators**: Need to see work assigned to their work cell and execute production tasks
- **Supervisors**: Need overview of all MOs and ability to manage exceptions
- **Production Planners**: Need visibility into production status and bottlenecks

## 2. Functional Requirements

### 2.1 Manufacturing Order Display

#### FR-001: MO List View
- Display all manufacturing orders available for production in a filterable, sortable list
- Show key information for each MO:
  - Order Number
  - Item (SKU, Description, Primary Image thumbnail)
  - Quantity (Ordered, Completed, Remaining)
  - Status (Draft, Planned, Released, In Progress, Completed, Cancelled)
  - Priority indicator
  - Due Date/Requested Date
  - Current Step (for routed MOs)
  - Work Cell assignment (for current step if routed)
  - Progress percentage bar

#### FR-002: Dual-Mode Support
- Seamlessly handle both routed and non-routed MOs in the same interface
- For non-routed MOs: Show simplified actions (Start, Report Production, Complete)
- For routed MOs: Show current step information and step-specific actions

#### FR-003: Visual Status Indicators
- Use color-coded badges for MO status
- Use icons to differentiate between routed and non-routed MOs
- Show alert indicators for:
  - Overdue orders
  - Quality issues
  - On-hold status
  - Rework required

### 2.2 Filtering and Search

#### FR-004: Work Cell Filtering
- Primary filter by work cell for operators
- Operators see MOs with current steps assigned to their work cell
- Supervisors can view all work cells or filter by specific ones
- Multi-select work cell filter for cross-functional operators

#### FR-005: Advanced Filtering
- Filter by:
  - Status (multi-select)
  - Priority (High, Medium, Low)
  - Date range (Due date, Start date)
  - Item category
  - Customer (if applicable)
  - Has routing (Yes/No)
  - Current step type (Standard, Quality Check, Rework)

#### FR-006: Smart Search
- Search by:
  - MO number
  - Item SKU or description
  - Customer reference
  - Source reference (Sales Order, etc.)

#### FR-007: Saved Filter Sets
- Allow users to save commonly used filter combinations
- Quick filter presets:
  - "My Work Cell - Ready to Start"
  - "Overdue Orders"
  - "Quality Checks Pending"
  - "Today's Schedule"

#### FR-008: View Mode Preferences
- Remember user's preferred view mode (table/card) per device type
- Allow quick toggle between views with keyboard shortcut (Ctrl+G)
- Automatic view switching based on screen size with manual override option
- Persist column visibility and order preferences for table view
- Save card layout density preference (compact/standard/expanded)

### 2.3 Production Actions

#### FR-009: Start Production
- For non-routed MOs:
  - Single "Start Production" button
  - Capture actual start time
  - Transition MO to "In Progress"
- For routed MOs:
  - "Start Step" button for current step
  - Enforce step dependencies
  - Validate operator work cell assignment
  - Create step execution record

#### FR-010: Report Production
- Universal production reporting dialog:
  - Quantity produced (with running total)
  - Quantity scrapped
  - Scrap reason (dropdown + notes)
  - Time spent (auto-calculated or manual entry)
  - Operator notes
- For routed MOs: Associated with current step execution
- For non-routed MOs: Direct update to MO quantities

#### FR-011: Complete Production
- For non-routed MOs:
  - Final quantity confirmation
  - Capture actual end time
  - Transition to "Completed"
- For routed MOs:
  - Complete current step
  - Auto-queue next step
  - Show next step preview
  - Complete MO when all steps done

#### FR-012: Report Scrap
- Dedicated scrap reporting with:
  - Scrap quantity
  - Scrap reason categorization
  - Defect codes
  - Optional photo attachment
  - Cost impact calculation (if available)

#### FR-013: Trigger Rework
- For quality failures:
  - Create rework step/order
  - Link to original MO
  - Assign to rework work cell
  - Track rework reason
- Rework visibility in main list

#### FR-014: Hold/Resume
- Put MO or step on hold:
  - Hold reason (Machine breakdown, Material shortage, Quality issue, Other)
  - Expected resolution time
  - Notes
- Resume with elapsed time tracking
- Visual indicator for held items

### 2.4 Step Management (Routed MOs)

#### FR-015: Step Progression View
- Inline expandable step list showing:
  - Step number and name
  - Status (Pending, Queued, In Progress, On Hold, Completed, Skipped)
  - Assigned work cell
  - Setup/Cycle time estimates
  - Actual vs planned time
  - Quality check requirements

#### FR-016: Step Actions
- Available actions based on step status:
  - Start (when queued and dependencies met)
  - Pause/Resume
  - Report Progress
  - Complete
  - Skip (with authorization)
  - View Instructions (if available)

#### FR-017: Quality Check Integration
- For QC steps:
  - Inspection mode indicators (Every Part, Sampling, Entire Lot)
  - Sample size display
  - Pass/Fail recording
  - Defect categorization
  - Automatic rework creation on failure

### 2.5 Mobile Optimization

#### FR-018: Responsive Design
- Touch-optimized interface for tablets/phones
- Large, accessible action buttons
- Swipe gestures for common actions
- Condensed view with expandable details

#### FR-019: Offline Capability
- Queue production reports when offline
- Sync when connection restored
- Visual indicator for offline mode
- Conflict resolution for concurrent updates

### 2.6 Real-time Updates

#### FR-020: Auto-refresh
- Configurable refresh interval (30s, 1min, 5min)
- WebSocket support for instant updates
- Visual indicator for new/updated items
- Maintain scroll position and filters on refresh

#### FR-021: Notifications
- Desktop/mobile notifications for:
  - New work assigned to operator's cell
  - Upstream step completed
  - Quality issues on operator's production
  - High-priority orders

## 3. User Interface Design

### 3.1 Layout Structure

#### UI-001: Master-Detail View
- Left panel: Filtered MO list (table or card view)
- Right panel: Selected MO details and actions
- Collapsible panels for mobile
- Persistent action bar
- View toggle button for switching between table and card layouts

#### UI-002: Table View (Desktop-Optimized)
- Columnar layout with sortable headers:
  - Selection checkbox
  - MO Number
  - Item (SKU + Description)
  - Status (badge)
  - Current Step/Work Cell
  - Progress (bar chart)
  - Quantity (Ordered/Completed/Remaining)
  - Priority
  - Due Date
  - Actions (icon buttons)
- Sticky header row on scroll
- Row hover highlighting
- Click row to open details panel
- Inline expandable rows for step details
- Configurable column visibility
- Dense/comfortable/spacious density options

#### UI-003: Card View (Mobile-Optimized)
- Stack of cards with key information:
  - Header: MO Number + Status badge
  - Item image thumbnail + SKU/Description
  - Progress bar with percentage
  - Current step and work cell (if routed)
  - Quantity summary (X of Y completed)
  - Due date with urgency indicator
  - Primary action buttons at card bottom
- Swipe gestures:
  - Swipe right: Start/Resume
  - Swipe left: More actions menu
- Tap card for full details
- Pull-to-refresh support
- Lazy loading on scroll

#### UI-004: Information Hierarchy
- Primary info: MO number, Item, Quantity, Status
- Secondary info: Dates, Work cell, Customer
- Tertiary info: Notes, History, Metrics
- Adaptive display based on view mode

#### UI-005: Action Placement
- Table View:
  - Action column with icon buttons
  - Hover tooltips for action names
  - Overflow menu for secondary actions
- Card View:
  - 2-3 primary action buttons visible
  - "More" button for additional actions
- Action colors consistent across views:
  - Start (Green)
  - Report (Blue)
  - Complete (Green)
  - Hold (Orange)
  - Scrap/Rework (Red)

### 3.2 Visual Design

#### UI-006: Status Colors
- Draft: Gray
- Planned: Light Blue
- Released: Blue
- In Progress: Green
- On Hold: Orange
- Completed: Dark Green
- Cancelled: Red

#### UI-007: Progress Visualization
- Progress bars with percentage
- Step completion indicators
- Time remaining estimates
- Burndown charts for shift/day

#### UI-008: Data Density Options
- Compact view: More rows, less detail
- Standard view: Balanced information
- Detailed view: All information visible
- User preference persistence

### 3.3 Interactions

#### UI-009: Quick Actions
- Single-click primary actions
- Long-press for context menu
- Batch operations via selection
- Keyboard shortcuts for power users

#### UI-010: Drill-down Navigation
- Click MO → Details view
- Click Step → Step execution screen
- Click Item → Item master data
- Click Work Cell → Cell dashboard

## 4. Integration Requirements

### 4.1 Data Sources

#### INT-001: Real-time MO Data
- Query active MOs (status not in completed/cancelled)
- Include related data (items, routes, steps, work cells)
- Efficient pagination and filtering
- Optimize for work cell queries

#### INT-002: Work Cell Assignment
- Operator-to-work cell mapping
- Multiple work cell support
- Shift-based visibility
- Skill-based filtering (future)

#### INT-003: Inventory Integration
- Material availability indicators
- Component shortage warnings
- Real-time inventory updates on production

### 4.2 Downstream Systems

#### INT-004: Production Events
- Audit trail for all actions
- Event streaming for analytics
- Integration with MES/ERP
- Quality system updates

#### INT-005: Reporting Integration
- OEE calculation inputs
- Efficiency metrics
- Scrap and rework tracking
- Labor time capture

## 5. Performance Requirements

### PERF-001: Load Time
- Initial page load < 2 seconds
- Filter application < 500ms
- Action response < 1 second

### PERF-002: Scalability
- Support 1000+ active MOs
- 50+ concurrent operators
- Real-time updates without degradation

### PERF-003: Mobile Performance
- Optimized assets for mobile
- Progressive loading
- Minimal data transfer

## 6. Security Requirements

### SEC-001: Access Control
- Role-based permissions:
  - Operators: View and execute assigned work
  - Supervisors: View all, override actions
  - Planners: View all, cannot execute
- Work cell-based restrictions

### SEC-002: Action Authorization
- Verify permissions on each action
- Log all production reports
- Prevent unauthorized status changes

## 7. User Stories

### Story 1: Paint Booth Operator
**As** a paint booth operator  
**I want** to see all MOs that need painting at my work cell  
**So that** I can prioritize and execute my work efficiently  

**Acceptance Criteria:**
- Filter automatically shows paint booth work cell
- Only MOs with current step at paint booth appear
- Can see quantity to paint and special instructions
- Can start, report progress, and complete painting step

### Story 2: Supervisor Overview
**As** a production supervisor  
**I want** to see all active MOs across all work cells  
**So that** I can identify bottlenecks and reassign work  

**Acceptance Criteria:**
- View all work cells' MOs on one screen
- Identify held or delayed orders
- See operator assignments
- Can intervene and reassign work

### Story 3: Quality Inspector
**As** a quality inspector  
**I want** to see all MOs requiring quality checks  
**So that** I can plan my inspection route  

**Acceptance Criteria:**
- Filter for QC steps across all work cells
- See inspection type and sample size
- Priority ordering by due date
- Can record results and trigger rework

### Story 4: Machine Operator - Non-routed
**As** a CNC operator working on simple parts  
**I want** to quickly report production on non-routed MOs  
**So that** I can focus on running my machine  

**Acceptance Criteria:**
- Simple list of MOs for my machine
- One-click start production
- Quick quantity entry
- Minimal screens to complete

## 8. Mockup Guidelines

### Desktop View (Table Layout)
- Two-panel layout with resizable divider
- Table view as primary display mode
- Filters in collapsible left sidebar
- View toggle button in toolbar (Table/Card icons)
- Action toolbar at top of detail panel
- Status summary cards above table
- Column customization dropdown
- Bulk selection checkbox in header

### Desktop View (Card Layout)
- Responsive grid of cards (3-4 columns)
- Same filter sidebar as table view
- Cards maintain consistent height
- Hover effects for interactive elements
- Modal or slide-out panel for details

### Mobile View  
- Card view as default (single column)
- Option to switch to condensed table view
- Collapsible filter panel (slide from top)
- Bottom action bar for primary actions
- Swipe gestures enabled
- Pull-to-refresh
- Sticky filter summary bar

### Tablet View (Hybrid)
- Optimized for landscape orientation
- Can use either table or card view effectively
- Two-column card layout in landscape
- Simplified table with horizontal scroll
- Touch-optimized action buttons

### Key UI Components
- View Toggle: Icon buttons (grid/table) with active state
- MO Card: 
  - Compact summary with expand arrow
  - Item image thumbnail
  - Progress indicator
  - 2-3 action buttons
- Table Row:
  - Hover highlight
  - Click for selection
  - Double-click for details
  - Action icons with tooltips
- Step Timeline: Visual step progression
- Action Dialog: Consistent form layout
- Status Badge: Color + icon + text
- Responsive Breakpoints:
  - Mobile: < 768px (forced card view)
  - Tablet: 768px - 1024px (either view)
  - Desktop: > 1024px (either view, table preferred)

## 9. Future Enhancements

- Predictive analytics for completion times
- AI-powered work assignment
- Voice-activated production reporting  
- AR instructions overlay
- Integration with IoT sensors
- Automated scrap detection
- Dynamic rescheduling

## 10. Success Metrics

- Reduction in MO lookup time
- Increase in production reporting accuracy
- Decrease in WIP inventory
- Improved on-time delivery
- Reduced operator training time
- Higher step execution compliance

## 11. Technical Considerations

### Frontend
- Use existing Inertia.js + React stack
- Leverage shadcn/ui components
- Implement with mobile-first approach
- Use react-query for data management

### Backend
- Optimize queries with eager loading
- Implement caching for work cell assignments
- Use database views for complex filters
- Consider read replicas for reporting

### Real-time
- WebSocket server for live updates
- Event-driven architecture
- Efficient change detection
- Graceful degradation

This requirements document provides a comprehensive foundation for implementing the Production Reporting screen while maintaining flexibility for different manufacturing scenarios and user needs.

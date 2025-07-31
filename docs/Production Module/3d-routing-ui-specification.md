# Production Routing UI Specification

## Overview

This specification defines the user interface and workflows for managing production routes, manufacturing steps, quality checks, and rework processes. The design prioritizes shop floor usability, clear visual feedback, and efficient task completion.

## Core Concepts

### Information Hierarchy
1. **Manufacturing Order** → owns → **Route** → contains → **Steps** → may have → **Executions**
2. **Steps** can depend on other steps, creating a directed workflow
3. **Quality Check Steps** are special steps that gate progress and can trigger rework
4. **Forms** are attached to steps for data collection and work instructions

## User Workflows

### 1. Route Creation Workflow

#### 1.1 Entry Points
- From Manufacturing Order detail page → "Create Route" button
- Users with `production.routing.create` permission see this option

#### 1.2 Route Creation Page (`/production/orders/{orderId}/routes/create`)

**Page Header**
- Breadcrumb: Production > Orders > [Order Number] > Create Route
- Context bar showing: Order number, Item name, Quantity, Due date

**Creation Options**
- **Option 1: From Template** (Recommended path)
  - Large card with template icon
  - Shows count of compatible templates
  - One-click to open template selector
  
- **Option 2: Custom Route** 
  - Secondary card option
  - Opens blank route builder

**Template Selection Modal** (if Option 1 selected)
- Search/filter templates by:
  - Name
  - Category (matching item category)
  - Last used date
  - Usage count
- Template preview shows:
  - Step count and total time estimate
  - Work cells required
  - Visual step flow preview
- "Use Template" button applies and redirects to route builder

### 2. Route Builder Interface (`/production/routing/{routeId}/builder`)

#### 2.1 Layout Structure

**Header Bar**
- Route name (editable inline)
- Order context (Order #, Item, Qty)
- Status badge (Draft/Active)
- Action buttons: Save, Cancel, Preview

**Main Canvas** (Visual Step Editor)
- Grid background for alignment
- Steps displayed as connected cards
- Zoom controls (+/-/fit)
- Mini-map for large routes

**Right Sidebar** (Collapsible)
- Step library (draggable items)
- Step properties panel (when step selected)

#### 2.2 Step Management

**Adding Steps**
- Drag from library OR
- Click "+" button between existing steps
- Auto-assigns step numbers
- New steps default to "depends on previous"

**Step Cards Display**
- Step number badge
- Step name
- Type indicator (color/icon)
- Status indicator
- Time estimate
- Work cell assignment
- Dependency lines to other steps

**Step Selection**
- Click to select (highlight border)
- Properties panel updates
- Multi-select with Ctrl/Cmd+Click

**Step Properties Panel**
- **Basic Info**
  - Name (required)
  - Description
  - Step type dropdown
  - Work cell selector
  
- **Time Settings**
  - Setup time (minutes)
  - Cycle time per unit (minutes)
  - Auto-calculates total time
  
- **Dependencies**
  - Dropdown: "Depends on step..."
  - Radio: Start when dependency is [Completed/In Progress]
  - Visual preview of dependency impact
  
- **Quality Check Settings** (if type = quality_check)
  - Mode selector: Every Part / Entire Lot / Sampling
  - If Sampling: Sample size input with ISO 2859 calculator link
  - Failure action: Scrap / Rework
  
- **Form Association**
  - Search/select form
  - "Preview Form" link
  - Shows task count

**Step Reordering**
- Drag and drop to reorder
- Auto-updates step numbers
- Validates dependencies (prevents circular)
- Shows warning if reorder breaks logic

### 3. Route Execution Workflow

#### 3.1 Route Overview (`/production/routing/{routeId}`)

**Status Section**
- Overall route progress bar
- Time tracking: Estimated vs Actual
- Step completion: X of Y completed

**Steps Table/List View**
- Columns: Step #, Name, Type, Work Cell, Status, Assigned To, Actions
- Row states:
  - Disabled (gray) - dependencies not met
  - Ready (blue) - can be started  
  - In Progress (animated) - being executed
  - On Hold (yellow) - paused
  - Completed (green) - finished
  - Failed (red) - quality check failed

**Step Actions** (based on state and permissions)
- **Pending**: No actions (grayed out)
- **Queued**: "Start" button
- **In Progress**: "Pause", "Complete"
- **On Hold**: "Resume", "Cancel"
- **Completed**: "View Details"

#### 3.2 Step Execution Interface (`/production/steps/{stepId}/execute`)

**Mobile-Optimized Layout**
- Large header with step name and number
- Progress indicator (Step X of Y)
- Context bar: Order, Item, Quantity

**Execution States**

**State: Starting**
- Operator assignment (auto-fills current user)
- Work cell confirmation
- Part tracking:
  - Single part: Auto-filled "1 of X"
  - Batch: Input field for quantity starting
- Large "Begin" button

**State: In Progress**
- Live timer display (counts up)
- Pause/Hold button (captures reason)
- Form display (if attached):
  - Tasks shown sequentially
  - Required tasks marked
  - Progress through form tasks
  - Save draft capability

**State: Quality Check** (special flow)
- Mode-specific interface:
  - **Every Part**: Navigation (Part 1 of X) with Next/Previous
  - **Entire Lot**: Single check interface
  - **Sampling**: Shows "Checking X of Y samples"
- Large Pass/Fail buttons
- Failure requires:
  - Reason selection/input
  - Photo attachment option
  - Scrap/Rework decision

**State: Completing**
- Actual time summary
- Notes/comments field
- Part completion:
  - Quantity completed
  - Quantity scrapped (if any)
- "Complete Step" confirmation

#### 3.3 Hold/Resume Flow

**Placing on Hold**
- Modal: "Reason for Hold"
- Predefined reasons: Material shortage, Equipment issue, Quality concern, Other
- Optional notes field
- Timer pauses

**Resuming**
- Shows hold duration
- Optional resume notes
- Timer continues from pause

### 4. Quality Check Workflows

#### 4.1 Quality Check Execution

**Pass Flow**
- Green confirmation screen
- Auto-advance to next part (if multiple)
- Updates step status when all parts checked

**Fail Flow**  
- Red alert screen
- Failure form:
  - Failure type selector
  - Description required
  - Photo attachment
  - Scrap/Rework decision
- If Rework selected:
  - Creates rework step automatically
  - Notifies planning team
  - Shows rework step preview

#### 4.2 Rework Management

**Rework Step Creation** (Automatic)
- Inherits work cell from failed step
- Links to original failure
- Adds to route after current step
- Status: "Pending" until failure analysis complete

**Rework Execution**
- Shows original failure details
- Rework-specific form/checklist
- Requires re-inspection step

### 5. Dependency Visualization

#### 5.1 Route Flow View
- Interactive flowchart display
- Step boxes connected by arrows
- Color coding:
  - Gray: Cannot start (blocked)
  - Blue: Ready to start
  - Yellow: In progress
  - Green: Completed
- Click step to see details
- Hover to highlight dependencies

#### 5.2 Gantt View (Optional)
- Timeline visualization
- Shows parallel execution possibilities
- Critical path highlighting
- Drag to adjust scheduling

### 6. Forms Integration

#### 6.1 Form Selection (in Route Builder)
- Search forms by name/tag
- Filter by category
- Preview shows:
  - Task list
  - Estimated completion time
  - Required equipment/tools

#### 6.2 Form Execution (during Step)
- Clean, focused interface
- One task at a time
- Progress bar at top
- Task types rendered appropriately:
  - Text: Large input field
  - Multiple choice: Radio buttons
  - Checklist: Checkboxes
  - Photo: Camera integration
  - Measurement: Numeric input with units
- Required tasks marked with asterisk
- Cannot complete step without form completion

### 7. Mobile Considerations

#### 7.1 Responsive Behaviors
- Route builder: View-only on mobile, edit on desktop
- Step execution: Mobile-first design
- Quality checks: Optimized for touch
- Forms: Single column, large touch targets

#### 7.2 Offline Capability
- Steps can be started offline
- Form responses cached locally
- Sync when connection restored
- Visual indicator of sync status

### 8. Permission-Based UI Variations

#### 8.1 Operator View
- Simplified interface
- Only sees assigned work cell steps
- Cannot edit routes
- Execution-focused

#### 8.2 Supervisor View  
- Full route visibility
- Can reassign steps
- Override capabilities
- Performance metrics

#### 8.3 Planner View
- Route creation/editing
- Template management
- Dependency configuration
- Time optimization tools

## Visual Design Principles

### Status Communication
- Colors consistent with system standards
- Icons reinforce status
- Animation for active states
- Clear next-action indicators

### Information Density
- Progressive disclosure
- Essential info visible
- Details on demand
- Avoid overwhelming operators

### Error Prevention
- Disable invalid actions
- Clear warning messages
- Confirmation for destructive actions
- Undo capabilities where possible

### Performance Feedback
- Real-time status updates
- Progress visualization
- Time comparisons (estimated vs actual)
- Completion celebrations

## Success Metrics

1. **Efficiency**: Time from route creation to first step execution
2. **Accuracy**: Reduction in routing errors
3. **Adoption**: Percentage of orders with routes
4. **Performance**: Actual vs estimated times convergence
5. **Quality**: First-pass quality rate improvement 
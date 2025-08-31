# Bryntum Gantt Chart + Scheduler Pro Requirements Specification

## Overview
This document outlines the comprehensive functional requirements for a Gantt Chart and Resource Scheduler Pro application based on the Bryntum demo available at [https://bryntum.com/products/gantt/examples/frameworks/react-vite/gantt-schedulerpro/dist/](https://bryntum.com/products/gantt/examples/frameworks/react-vite/gantt-schedulerpro/dist/).

The application consists of two main views:
1. **Gantt Chart View** - For project planning and task management
2. **Scheduler Pro View** - For resource allocation and scheduling

## 1. General Application Requirements

### 1.1 User Interface
- **Split View Layout**: The application shall display two synchronized views - Gantt chart on top and Resource Scheduler at the bottom
- **Responsive Design**: The interface shall adapt to different screen sizes while maintaining functionality
- **Theme Support**: The application shall support multiple themes that can be switched dynamically
- **Modern UI**: Clean, professional interface using React + Vite framework

### 1.2 Header Toolbar
- **Application Title**: Display "Gantt chart + Scheduler Pro demo (React + Vite)"
- **Theme Selector**: Dropdown combo box to switch between different visual themes
- **Fullscreen Button**: Blue button to toggle fullscreen mode

### 1.3 Navigation Controls
- **Zoom Controls**: 
  - Zoom In button (magnifying glass with plus)
  - Zoom Out button (magnifying glass with minus)
  - Controls shall adjust the time scale granularity

## 2. Gantt Chart View Requirements

### 2.1 Grid Structure
The Gantt chart shall consist of two main sections:
- **Left Panel**: Task information grid
- **Right Panel**: Timeline visualization

**Scrolling Behavior**: The left and right panels of the Gantt chart scroll together as a synchronized unit, maintaining alignment between task rows and their corresponding timeline bars. This entire Gantt view scrolls independently from the Scheduler Pro view below.


### 2.2 Task Grid Columns
The left panel shall display the following columns:

#### 2.2.1 Sequence Number Column
- **Width**: 50px fixed
- **Alignment**: Right-aligned
- **Content**: Sequential numbering of tasks
- **Read-only**: Cannot be edited by users

#### 2.2.2 Name Column
- **Width**: 280px (resizable)
- **Features**:
  - Tree structure support with expand/collapse icons
  - Indentation to show task hierarchy
  - Double-click to edit task name
  - Sortable
  - Icons for leaf tasks

#### 2.2.3 Percent Complete Column
- **Width**: 120px (resizable)
- **Display**: Progress bar visualization
- **Features**:
  - Visual progress bar showing completion percentage
  - Percentage value displayed on the bar
  - Editable via double-click
  - Sortable

#### 2.2.4 Assigned Resources Column
- **Width**: 160px (resizable)
- **Display**: Resource avatars/images
- **Features**:
  - Show assigned resource names
  - Display resource avatars when available
  - Support multiple resource assignments
  - Sortable

### 2.3 Timeline Panel
#### 2.3.1 Time Headers
- **Two-level header structure**:
  - Top level: Week dates (e.g., "Sun 06 Jan 2019")
  - Bottom level: Day abbreviations (S, M, T, W, T, F, S)
- **Sticky headers**: Headers remain visible when scrolling vertically

#### 2.3.2 Task Bars
- **Visual Elements**:
  - Colored horizontal bars representing task duration
  - Progress indication within bars showing completion percentage
  - Task name labels on or near bars
  - Different colors for different task types/states

#### 2.3.3 Dependencies
- **Dependency Lines**: Visual connections between related tasks
- **Types**: Support for finish-to-start, start-to-start, finish-to-finish, start-to-finish
- **Interactive**: Click to select/highlight dependencies

#### 2.3.4 Non-Working Time
- **Weekend Highlighting**: Saturdays and Sundays shown with different background
- **Visual Indication**: Subtle shading or pattern to indicate non-working periods

#### 2.3.5 Project Milestones
- **Project Start Line**: Vertical line with label "Project start"
- **Project End Line**: Vertical line with label "Project end"
- **Positioning**: Automatically positioned based on project dates

### 2.4 Task Management Features

#### 2.4.1 Task Hierarchy
- **Parent Tasks**: Can contain child tasks
- **Automatic Rollup**: Parent task dates and progress calculated from children
- **Expand/Collapse**: Click tree icons to show/hide subtasks
- **Indentation Levels**: Visual hierarchy through indentation

#### 2.4.2 Expand/Collapse Behavior
- **Tree Controls**: 
  - Expand icon (►) shows when parent task is collapsed
  - Collapse icon (▼) shows when parent task is expanded
  - Located to the left of the task name in the grid
- **Grid Behavior**:
  - Collapsing hides all child tasks from the grid view
  - Row count adjusts dynamically based on expanded/collapsed state
  - Parent task remains visible when collapsed
- **Timeline Visualization**:
  - Parent tasks always display as summary bars on the timeline
  - Summary bars show the span from the earliest child start to latest child end
  - Progress percentage is calculated as weighted average of child tasks
  - When collapsed, only the parent summary bar is visible
  - When expanded, both parent summary bar and child task bars are visible
- **Visual Distinction**:
  - Parent task bars maintain the same visual style whether expanded or collapsed
  - Summary bars use the same styling as regular task bars (blue background with progress indicator)
  - Parent tasks are identified by the `b-gantt-task-parent` CSS class
  - Wrapper elements gain `b-expanded` class when expanded, lose it when collapsed

#### 2.4.3 Task Editing
- **Double-click Edit**: Open task editor dialog on double-click
- **Inline Editing**: Edit task properties directly in grid cells
- **Task Editor Dialog**: Comprehensive form for all task properties

#### 2.4.4 Drag and Drop (Production Constraints)
- **Task Rescheduling**: Drag task bars horizontally to change dates
  - Only changes timing, not sequence
  - Respects work cell availability
  - Maintains minimum gaps between steps
  - Cannot violate predecessor constraints
- **No Task Reordering**: Sequence is fixed by BOM/routing
- **No Dependency Creation**: Dependencies are read-only from routing
- **Duration Resize**: Drag task bar edges to change duration
  - Updates estimated completion time
  - Recalculates resource utilization
  - Affects downstream step scheduling

#### 2.4.5 Context Menus (Production Context)
- **Right-click Menus**: Context-sensitive options based on clicked element
- **Step Operations**: 
  - View step details
  - Edit duration/dates (not sequence)
  - Mark as complete/in-progress
  - View resource requirements
  - View predecessor/successor steps
- **No Structural Changes**: Cannot add/delete steps or modify dependencies

## 3. Scheduler Pro View Requirements

### 3.1 Resource Grid
The scheduler shall display resources in a grid format:

#### 3.1.1 Resource Information Columns
- **Resource Name**: Display resource names (e.g., Celia, Lee, Macy)
- **Assigned Tasks**: Number of tasks assigned to each resource
- **Assigned Work Days**: Total working days allocated

### 3.2 Resource Timeline
#### 3.2.1 Time Scale
- **Synchronized with Gantt**: Same time scale as the Gantt chart above
- **Day-level Granularity**: Show individual days
- **Week Headers**: Group days by week

#### 3.2.2 Resource Allocations
- **Task Blocks**: Visual blocks showing when resources are assigned to tasks
- **Task Labels**: Display task names on allocation blocks
- **Color Coding**: Match colors with corresponding Gantt tasks
- **Overlap Handling**: Show overlapping assignments clearly

### 3.3 Work Cell Management Features

#### 3.3.1 Drag and Drop (Work Cell Scheduling)
- **Step Assignment**: Drag routing steps between work cells
  - Only to compatible work cells (matching type/capabilities)
  - Respects capacity constraints
  - Shows availability conflicts
- **Schedule Adjustment**: Drag allocations to reschedule
  - Maintains step sequence integrity
  - Updates downstream steps automatically
- **Duration Changes**: Resize allocations based on work cell efficiency

#### 3.3.2 Work Cell Utilization
- **Visual Indicators**: 
  - Color coding for utilization levels (green/yellow/red)
  - Capacity bars showing available vs allocated time
  - Infinite capacity cells show different visualization
- **Capacity Planning**: 
  - Display shift-based availability
  - Show maintenance windows
  - Highlight bottlenecks
- **Conflict Detection**: 
  - Overlapping assignments on finite capacity cells
  - Skill/capability mismatches
  - Shift availability conflicts

## 4. Data Synchronization

### 4.1 View Synchronization
- **Bidirectional Updates**: Changes in either view immediately reflect in the other
- **Consistent State**: Both views always show the same project state
- **Real-time Updates**: No manual refresh required

### 4.2 Data Consistency
- **Validation**: Ensure data integrity across views
- **Constraint Checking**: Validate dependencies and resource constraints
- **Error Handling**: Clear error messages for invalid operations

## 5. Scrolling Behavior and Quadrant Synchronization

### 5.1 Application Layout - Four Quadrants

The application interface is divided into four distinct quadrants:

1. **Top-Left Quadrant**: Gantt Task Grid
   - Contains: Task names, sequence numbers, percent complete, assigned resources
   - Purpose: Display and edit task information in a tabular format
   - Scrollable: Vertical scrolling only (horizontal is locked)

2. **Top-Right Quadrant**: Gantt Timeline
   - Contains: Task bars, dependencies, milestones, time axis
   - Purpose: Visual representation of task scheduling and dependencies
   - Scrollable: Horizontal scrolling only (vertical is synchronized with top-left)

3. **Bottom-Left Quadrant**: Resource Grid
   - Contains: Resource names, assigned tasks count, assigned work days
   - Purpose: Display resource information in a tabular format
   - Scrollable: Vertical scrolling only (horizontal is locked)

4. **Bottom-Right Quadrant**: Resource Timeline
   - Contains: Resource allocations, task assignments over time
   - Purpose: Visual representation of resource utilization
   - Scrollable: Horizontal scrolling only (vertical is synchronized with bottom-left)

### 5.2 Vertical Scrolling Synchronization

**Gantt View (Top Quadrants)**:
- The top-left (task grid) and top-right (timeline) quadrants share vertical scrolling
- Scrolling either quadrant vertically moves both in tandem
- This ensures task rows always align with their corresponding timeline bars
- Vertical scrolling is independent from the Scheduler Pro view below

**Scheduler Pro View (Bottom Quadrants)**:
- The bottom-left (resource grid) and bottom-right (resource timeline) quadrants share vertical scrolling
- Scrolling either quadrant vertically moves both in tandem
- This ensures resource rows always align with their allocation timelines
- Vertical scrolling is independent from the Gantt view above

### 5.3 Horizontal Scrolling Synchronization

**Timeline Synchronization**:
- The top-right (Gantt timeline) and bottom-right (Resource timeline) quadrants share horizontal scrolling
- Scrolling either timeline horizontally moves both in perfect synchronization
- This ensures the time axis remains aligned between both views
- The left quadrants (grids) remain fixed during horizontal scrolling

**Implementation Details**:
- Uses virtual scrollers (`.b-virtual-scroller`) to synchronize horizontal scrolling
- Each view has its own virtual scroller, but they are programmatically linked
- Scrolling events on one virtual scroller are propagated to the other

### 5.4 Scrolling Interaction Methods

**Mouse Wheel**:
- Vertical scrolling: Mouse wheel on any quadrant scrolls its paired quadrant vertically
- Horizontal scrolling: Shift + Mouse wheel on timeline quadrants scrolls both timelines horizontally

**Scrollbars**:
- Vertical scrollbars appear on the right edge of each view (Gantt and Scheduler)
- Horizontal scrollbar appears at the bottom of the timeline area
- Scrollbars are synchronized as per the rules above

**Touch/Trackpad**:
- Natural scrolling gestures supported
- Two-finger swipe for both vertical and horizontal scrolling
- Follows the same synchronization rules as other input methods

### 5.5 Scroll Position Persistence

- Scroll positions are maintained during data updates
- Zoom operations attempt to maintain the center point of the visible area
- Window resize events preserve relative scroll positions

## 6. Interactive Features

### 6.1 Selection and Navigation
- **Click Selection**: Single-click to select tasks/resources
- **Multi-selection**: Ctrl/Cmd-click for multiple selections
- **Keyboard Navigation**: Arrow keys to navigate grid
- **Tab Navigation**: Tab through editable fields

### 6.2 Zoom Functionality
- **Zoom Levels**: Multiple predefined zoom levels
- **Zoom Animation**: Smooth transition between zoom levels
- **Center on Selection**: Maintain focus on selected items when zooming
- **Zoom Limits**: Reasonable min/max zoom constraints

## 7. Visual Design Requirements - Project Integration

### 7.1 Component Framework Integration

#### Base Components (from shadcn/ui)
- **Grid/Table**: Extend existing `data-table.tsx` component with timeline capabilities
- **Headers**: Use existing table header components with timeline adaptations
- **Buttons**: Utilize current Button component variants
- **Dropdowns**: Use DropdownMenu components for context menus
- **Dialogs**: BaseEntitySheet pattern for task/resource editing
- **Forms**: Integrate with existing form system using `createFormAdapter`
- **Icons**: Use lucide-react icons throughout (matching current icon system)

#### Custom Components to Build
- **GanttTimeline**: Custom canvas/SVG component for timeline visualization
- **TaskBar**: Custom component styled to match Bryntum appearance
- **DependencyLines**: SVG-based dependency visualization
- **ResourceScheduler**: Grid with timeline for resource allocation
- **TimeAxis**: Custom time scale header component

### 7.2 Color System Integration

#### Light Mode (using Tailwind CSS classes and CSS variables)
```css
/* Backgrounds */
--gantt-bg: theme('colors.gray.50');           /* Main background */
--gantt-grid-bg: theme('colors.gray.100');     /* Grid cells */
--gantt-header-bg: theme('colors.white');      /* Headers */

/* Text */
--gantt-text: theme('colors.gray.700');        /* Primary text */
--gantt-text-secondary: theme('colors.gray.500'); /* Secondary text */
--gantt-header-text: theme('colors.gray.600'); /* Header text */

/* Task Bars */
--gantt-task-bg: theme('colors.blue.400');     /* Task background */
--gantt-task-progress: rgba(0, 0, 0, 0.15);    /* Progress overlay */
--gantt-task-text: theme('colors.white');      /* Task text */

/* Borders & Lines */
--gantt-border: theme('colors.gray.200');      /* Grid borders */
--gantt-dependency: theme('colors.gray.400');  /* Dependency lines */

/* Special */
--gantt-nonworking: rgba(239, 68, 68, 0.1);   /* Weekend/holiday bg */
--gantt-hover: rgba(0, 0, 0, 0.05);           /* Row hover */
```

#### Dark Mode (automatic with existing appearance system)
```css
.dark {
  --gantt-bg: theme('colors.gray.900');
  --gantt-grid-bg: theme('colors.gray.800');
  --gantt-header-bg: theme('colors.gray.900');
  
  --gantt-text: theme('colors.gray.100');
  --gantt-text-secondary: theme('colors.gray.400');
  --gantt-header-text: theme('colors.gray.300');
  
  --gantt-task-bg: theme('colors.blue.600');
  --gantt-task-progress: rgba(0, 0, 0, 0.25);
  --gantt-task-text: theme('colors.white');
  
  --gantt-border: theme('colors.gray.700');
  --gantt-dependency: theme('colors.gray.500');
  
  --gantt-nonworking: rgba(220, 38, 38, 0.15);
  --gantt-hover: rgba(255, 255, 255, 0.05);
}
```

### 7.3 Form Integration

#### Task Edit Forms
```typescript
// Using existing form adapter pattern
const TaskEditForm = ({ task, onSave }) => {
  const { data, setData, errors, clearErrors, post, patch } = useForm({
    name: task?.name || '',
    startDate: task?.startDate || '',
    duration: task?.duration || 1,
    percentDone: task?.percentDone || 0,
    assignedResources: task?.assignments || []
  });

  const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

  return (
    <BaseEntitySheet title={task ? 'Edit Task' : 'New Task'}>
      {({ formAdapter }) => (
        <>
          <TextInput
            form={formAdapter}
            name="name"
            label="Task Name"
            required
          />
          <DatePicker
            form={formAdapter}
            name="startDate"
            label="Start Date"
          />
          {/* Additional fields */}
        </>
      )}
    </BaseEntitySheet>
  );
};
```

### 7.4 Typography (using existing font stack)
- **Font Family**: System font stack from Tailwind config
- **Sizes**: Use existing text size classes (text-sm, text-base, etc.)
- **Weights**: font-normal, font-medium, font-semibold as needed

### 7.5 Spacing and Layout
- **Consistent with current app**: Use existing spacing scale (space-2, space-4, etc.)
- **Row Heights**: Configurable via CSS variables or props
- **Responsive**: Mobile-first approach using Tailwind breakpoints

### 7.6 Icons (from lucide-react)
- **Expand/Collapse**: ChevronRight, ChevronDown
- **Task Types**: FileText, Package, Settings icons
- **Zoom**: ZoomIn, ZoomOut
- **Calendar**: Calendar icon
- **Dependencies**: Link2 icon
- **Resources**: Users icon

### 7.7 Theme Implementation

#### Using Existing Appearance System
```typescript
// Component will automatically respond to theme changes
const GanttChart = () => {
  // No need to manage themes - handled by existing system
  return (
    <div className="gantt-container bg-background text-foreground">
      {/* Component uses CSS variables that update with theme */}
    </div>
  );
};
```

#### Integration with useAppearance Hook
- Components automatically adapt to light/dark/system preference
- No separate theme dropdown needed in Gantt toolbar
- Consistent appearance with rest of application

## 8. Performance Requirements

### 8.1 Responsiveness
- **Instant Feedback**: Immediate visual response to user actions
- **Smooth Animations**: Fluid transitions and movements
- **Large Dataset Support**: Handle projects with hundreds of tasks

### 8.2 Loading and Rendering
- **Progressive Loading**: Load visible content first
- **Virtual Scrolling**: Efficient rendering of large datasets
- **Optimized Redraws**: Minimal repainting for better performance

## 9. Browser Compatibility

### 9.1 Supported Browsers
- **Chrome**: Full functionality in latest versions
- **Firefox**: Full functionality in latest versions
- **Safari**: Full functionality in latest versions
- **Edge**: Full functionality in latest versions

### 9.2 Responsive Behavior
- **Desktop**: Full functionality at 1024px and above
- **Tablet**: Adapted layout for touch interaction
- **Mobile**: Basic view/read functionality

## 10. Accessibility Requirements

### 10.1 ARIA Support
- **Role Attributes**: Proper ARIA roles for all interactive elements
- **Labels**: Descriptive labels for screen readers
- **Live Regions**: Announce dynamic changes

### 10.2 Keyboard Support
- **Full Keyboard Navigation**: All features accessible via keyboard
- **Focus Indicators**: Clear visual focus indicators
- **Shortcuts**: Keyboard shortcuts for common actions

## 11. Export and Integration Features

### 11.1 Export Options
- **PDF Export**: Export Gantt chart as PDF
- **Image Export**: Export as PNG/JPG
- **Data Export**: Export project data in various formats

### 11.2 Integration Capabilities
- **React Integration**: Seamless integration with React applications
- **API Access**: Programmatic access to all features
- **Event System**: Comprehensive event handling for customization

## 12. Data Models and API Requirements - Production Context

### 12.1 Manufacturing Context
In this production system:
- **Tasks** = Manufacturing Routing Steps (from ManufacturingRoute)
- **Resources** = Work Cells (finite or infinite capacity)
- **Hierarchy** = Fixed by BOM structure (cannot be changed by dragging)
- **Dependencies** = Step sequences defined in routing (read-only)
- **No Dependency Creation**: Users cannot create or modify dependencies by dragging

### 12.2 Routing Step Data Model (Task)
```typescript
interface RoutingStep {
  id: number;
  manufacturing_route_id: number;
  sequence_number: number;
  name: string;
  description?: string;
  work_cell_id: number;
  work_cell?: WorkCell;
  
  // Scheduling fields
  planned_start_date: Date | string;
  planned_end_date: Date | string;
  actual_start_date?: Date | string;
  actual_end_date?: Date | string;
  duration_hours: number;
  setup_time_hours?: number;
  
  // Progress tracking
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'on_hold';
  percent_complete: number;
  quantity_completed: number;
  quantity_remaining: number;
  
  // Hierarchy (from BOM)
  parent_step_id?: number;
  is_milestone: boolean;
  level: number; // Nesting level in hierarchy
  expanded?: boolean; // For UI state
  
  // Manufacturing specifics
  operation_type: 'setup' | 'production' | 'quality_check' | 'move' | 'wait';
  required_resources: ResourceRequirement[];
  
  // Read-only relationships
  predecessors: number[]; // Step IDs that must complete before this
  successors: number[]; // Step IDs that depend on this
  
  // UI helpers
  can_start: boolean; // All predecessors complete
  is_critical_path: boolean;
  slack_hours: number;
}
```

### 12.3 Work Cell Data Model (Resource)
```typescript
interface WorkCell {
  id: number;
  name: string;
  cell_type: 'internal' | 'external';
  plant_id?: number;
  area_id?: number;
  sector_id?: number;
  shift_id?: number;
  
  // Capacity
  has_finite_capacity: boolean;
  default_production_rate_per_hour?: number;
  current_utilization: number; // Percentage
  
  // Scheduling
  available_hours: AvailableHours[];
  scheduled_steps: ScheduledStep[];
  
  // Visual
  color?: string; // For timeline display
  icon?: string;
}

interface ScheduledStep {
  step_id: number;
  start_time: Date;
  end_time: Date;
  manufacturing_order_id: number;
  status: 'scheduled' | 'in_progress' | 'completed';
}
```

### 12.4 Step Sequencing (Replaces Dependencies)
```typescript
interface StepSequence {
  id: number;
  from_step_id: number;
  to_step_id: number;
  sequence_type: 'finish_to_start' | 'parallel'; // Simplified from FS, SS, FF, SF
  minimum_gap_hours?: number; // Time between steps
  is_mandatory: boolean; // Cannot be violated
  
  // Read-only - defined by routing
  created_by_bom: boolean;
  sequence_number: number;
}
```

### 12.5 Resource Requirements
```typescript
interface ResourceRequirement {
  step_id: number;
  work_cell_id?: number; // Specific work cell
  work_cell_type?: string; // Any work cell of this type
  required_hours: number;
  skill_requirements?: string[];
}
```

### 12.5 Calendar Data Model
```typescript
interface Calendar {
  id: string | number;
  name: string;
  intervals: CalendarInterval[];
  parent?: string | number; // Parent calendar ID
}

interface CalendarInterval {
  recurrentStartDate?: string; // e.g., "on Saturday at 00:00"
  recurrentEndDate?: string; // e.g., "on Sunday at 00:00"
  isWorking?: boolean;
}
```

### 12.6 API Endpoints
```
// Tasks
GET    /api/tasks           - List all tasks
POST   /api/tasks           - Create new task
PUT    /api/tasks/:id       - Update task
DELETE /api/tasks/:id       - Delete task
POST   /api/tasks/:id/move  - Move task (reorder/reparent)

// Resources
GET    /api/resources       - List all resources
POST   /api/resources       - Create new resource
PUT    /api/resources/:id   - Update resource
DELETE /api/resources/:id   - Delete resource

// Assignments
GET    /api/assignments     - List all assignments
POST   /api/assignments     - Create new assignment
PUT    /api/assignments/:id - Update assignment
DELETE /api/assignments/:id - Delete assignment

// Dependencies
GET    /api/dependencies    - List all dependencies
POST   /api/dependencies    - Create new dependency
DELETE /api/dependencies/:id - Delete dependency

// Calendars
GET    /api/calendars       - List all calendars
```

### 12.7 WebSocket Events for Real-time Updates
```typescript
// Events from server
'task:created' | 'task:updated' | 'task:deleted' | 'task:moved'
'resource:created' | 'resource:updated' | 'resource:deleted'
'assignment:created' | 'assignment:updated' | 'assignment:deleted'
'dependency:created' | 'dependency:deleted'

// Events from client
'task:drag' | 'task:resize' | 'task:edit'
'assignment:drag' | 'assignment:edit'
```

## 13. Event Handlers and User Interactions (Production Context)

### 13.1 Routing Step Events
- **beforeStepEdit**: Validate scheduling changes
- **stepEdit**: Step timing/duration changed
- **stepClick**: Single click on step
- **stepDblClick**: Double click opens step details
- **stepContextMenu**: Right-click context menu
- **stepDragStart**: Begin dragging step (time only)
- **stepDrop**: Complete step reschedule
- **stepResizeStart**: Begin resizing step duration
- **stepResizeEnd**: Complete duration change
- **stepStatusChange**: Step marked as started/completed

### 13.2 Work Cell Events
- **workCellClick**: Click on work cell row
- **workCellDblClick**: View work cell details
- **stepAssignmentStart**: Begin dragging step to work cell
- **stepAssignmentDrop**: Complete work cell assignment
- **capacityExceeded**: Warning when overallocating
- **utilizationChange**: Work cell utilization updated

### 13.3 Sequence Events (Read-only)
- **sequenceClick**: Click on sequence line
- **sequenceHover**: Hover shows sequence details
- **sequenceViolation**: Warning when scheduling violates sequence
- **criticalPathHighlight**: Highlight critical path steps

### 13.4 View Events
- **beforeZoomIn/Out**: Validate zoom operation
- **zoomIn/Out**: Zoom level changed
- **timeAxisChange**: Timeline scale changed
- **scroll**: View scrolled
- **columnResize**: Column width changed
- **cellEdit**: Inline cell editing
- **selectionChange**: Selected items changed

## 14. Implementation Architecture for Laravel/React Project

### 14.1 Modular Component Architecture

#### Folder Structure
```
resources/js/components/production/scheduler/
├── index.tsx                           // Main export
├── ProductionScheduler.tsx             // Main container component
├── contexts/
│   └── ScrollSyncContext.tsx          // Scroll synchronization context
├── hooks/
│   ├── useScrollSync.ts               // Scroll synchronization logic
│   ├── useSchedulerState.ts           // State management
│   └── useVirtualization.ts           // Virtual scrolling helpers
├── components/
│   ├── Toolbar/
│   │   ├── Toolbar.tsx                // Main toolbar
│   │   ├── ZoomControls.tsx           // Zoom in/out
│   │   └── ViewControls.tsx           // View options
│   ├── GanttView/
│   │   ├── GanttView.tsx              // Gantt container
│   │   ├── GanttGrid/
│   │   │   ├── GanttGrid.tsx          // Left panel grid
│   │   │   ├── GanttHeader.tsx        // Column headers
│   │   │   ├── GanttRow.tsx           // Row component
│   │   │   └── TreeCell.tsx           // Tree hierarchy cell
│   │   └── GanttTimeline/
│   │       ├── GanttTimeline.tsx      // Right panel timeline
│   │       ├── TimeAxis.tsx           // Time scale header
│   │       ├── StepBar.tsx            // Task/step visualization
│   │       ├── Dependencies.tsx       // Dependency lines
│   │       └── NonWorkingTime.tsx     // Weekend/holiday overlay
│   ├── SchedulerView/
│   │   ├── SchedulerView.tsx          // Scheduler container
│   │   ├── SchedulerGrid/
│   │   │   ├── SchedulerGrid.tsx      // Resource grid
│   │   │   ├── SchedulerHeader.tsx    // Column headers
│   │   │   └── WorkCellRow.tsx        // Resource row
│   │   └── SchedulerTimeline/
│   │       ├── SchedulerTimeline.tsx  // Resource timeline
│   │       ├── AllocationBar.tsx      // Resource allocation
│   │       └── CapacityIndicator.tsx  // Utilization display
│   └── shared/
│       ├── VirtualList.tsx            // Virtualized list wrapper
│       ├── ScrollContainer.tsx        // Scroll container with sync
│       ├── ResizableSplitter.tsx      // Between views
│       └── Tooltip.tsx                // Hover tooltips
├── utils/
│   ├── dateCalculations.ts            // Date/time helpers
│   ├── positioning.ts                 // Layout calculations
│   └── canvasRenderer.ts              // Canvas rendering utilities
└── types/
    └── scheduler.ts                   // TypeScript interfaces
```

#### Main Container Component
```typescript
// ProductionScheduler.tsx
import { ScrollSyncProvider } from './contexts/ScrollSyncContext';
import { Toolbar } from './components/Toolbar/Toolbar';
import { GanttView } from './components/GanttView/GanttView';
import { SchedulerView } from './components/SchedulerView/SchedulerView';
import { ResizableSplitter } from './components/shared/ResizableSplitter';
import { useSchedulerState } from './hooks/useSchedulerState';

export const ProductionScheduler: React.FC<Props> = ({ steps, workCells, onUpdate }) => {
  const schedulerState = useSchedulerState({ steps, workCells });
  
  return (
    <ScrollSyncProvider>
      <div className="production-scheduler flex flex-col h-full">
        <Toolbar {...schedulerState.toolbar} />
        
        <div className="flex-1 flex flex-col min-h-0">
          <GanttView 
            steps={schedulerState.visibleSteps}
            onStepUpdate={schedulerState.updateStep}
          />
          
          <ResizableSplitter 
            orientation="horizontal"
            defaultSize={0.5}
            minSize={200}
          />
          
          <SchedulerView 
            workCells={schedulerState.workCells}
            allocations={schedulerState.allocations}
            onAllocationUpdate={schedulerState.updateAllocation}
          />
        </div>
      </div>
    </ScrollSyncProvider>
  );
};
```

#### Scroll Synchronization Context
```typescript
// contexts/ScrollSyncContext.tsx
import { createContext, useContext, useRef, useCallback } from 'react';

interface ScrollSyncContextValue {
  registerScrollContainer: (id: string, ref: HTMLElement) => void;
  unregisterScrollContainer: (id: string) => void;
  syncScroll: (source: string, axis: 'x' | 'y', value: number) => void;
  getScrollPosition: () => { x: number; y: { gantt: number; scheduler: number } };
}

const ScrollSyncContext = createContext<ScrollSyncContextValue | null>(null);

export const ScrollSyncProvider: React.FC = ({ children }) => {
  const scrollContainers = useRef<Map<string, HTMLElement>>(new Map());
  const scrollState = useRef({ x: 0, y: { gantt: 0, scheduler: 0 } });
  
  const syncScroll = useCallback((source: string, axis: 'x' | 'y', value: number) => {
    // Synchronization logic here
  }, []);
  
  return (
    <ScrollSyncContext.Provider value={{ registerScrollContainer, unregisterScrollContainer, syncScroll, getScrollPosition }}>
      {children}
    </ScrollSyncContext.Provider>
  );
};
```

#### Component Benefits

1. **Modular Structure**:
   - Each component has a single responsibility
   - Easy to test individual components
   - Better code organization
   - Reusable components

2. **Maintainability**:
   - Clear separation of concerns
   - Easy to locate and modify features
   - Better team collaboration
   - Type safety with dedicated interfaces

3. **Performance**:
   - Code splitting opportunities
   - Lazy loading of components
   - Better tree shaking
   - Isolated re-renders

4. **Scroll Synchronization**:
   - Centralized in context
   - Components register/unregister
   - Clean API for sync operations
   - No prop drilling

### 14.2 Detailed Scrolling Synchronization

#### Quadrant Layout and Scrolling Rules
```
┌─────────────────┬─────────────────────────┐
│  Gantt Grid     │  Gantt Timeline         │
│  (Quadrant 1)   │  (Quadrant 2)           │
│                 │                         │
│  Scrolls: Y     │  Scrolls: X, Y         │
├─────────────────┼─────────────────────────┤
│  Scheduler Grid │  Scheduler Timeline     │
│  (Quadrant 3)   │  (Quadrant 4)           │
│                 │                         │
│  Scrolls: Y     │  Scrolls: X, Y         │
└─────────────────┴─────────────────────────┘

Synchronization Rules:
- Q1 ↔ Q2: Vertical scroll synced (same Y position)
- Q3 ↔ Q4: Vertical scroll synced (same Y position)
- Q2 ↔ Q4: Horizontal scroll synced (same X position)
- Q1 ↔ Q3: No sync (independent vertical scrolling)
```

#### Implementation Details
```typescript
// Scroll event handling with debouncing
const handleScroll = useMemo(() => 
  debounce((source: string, scrollLeft: number, scrollTop: number) => {
    switch(source) {
      case 'gantt-timeline':
        // Update X for both timelines, Y for gantt only
        setScrollX(scrollLeft);
        setScrollY('gantt', scrollTop);
        break;
      case 'scheduler-timeline':
        // Update X for both timelines, Y for scheduler only
        setScrollX(scrollLeft);
        setScrollY('scheduler', scrollTop);
        break;
      case 'gantt-grid':
        // Update Y for gantt only
        setScrollY('gantt', scrollTop);
        break;
      case 'scheduler-grid':
        // Update Y for scheduler only
        setScrollY('scheduler', scrollTop);
        break;
    }
  }, 10), // 10ms debounce for smooth scrolling
  []
);

// Passive scroll listeners for performance
useEffect(() => {
  const options = { passive: true };
  
  ganttTimelineRef.current?.addEventListener('scroll', handleScroll, options);
  // ... add other listeners
  
  return () => {
    // ... remove listeners
  };
}, []);
```

#### Virtual Scrolling with react-window
```typescript
// Custom virtual list with scroll sync
const VirtualGanttGrid = () => {
  const { scrollY } = useContext(ScrollSyncContext);
  const listRef = useRef<VariableSizeList>(null);
  
  // Sync virtual list scroll position
  useEffect(() => {
    listRef.current?.scrollTo(scrollY.gantt);
  }, [scrollY.gantt]);
  
  return (
    <VariableSizeList
      ref={listRef}
      height={containerHeight}
      itemCount={steps.length}
      itemSize={getItemSize}
      onScroll={({ scrollOffset }) => setScrollY('gantt', scrollOffset)}
      style={{ overflow: 'hidden' }} // Hide scrollbar, use overlay
    >
      {Row}
    </VariableSizeList>
  );
};
```

#### Performance Optimizations
1. **RAF Throttling**: Use requestAnimationFrame for smooth updates
2. **Passive Listeners**: Mark scroll handlers as passive
3. **Will-Change**: CSS hints for GPU acceleration
4. **Transform3d**: Use transform3d for hardware acceleration
5. **Debouncing**: Debounce scroll events to prevent jank

### 14.3 Component Communication for Scroll Sync

#### ScrollContainer Component
```typescript
// components/shared/ScrollContainer.tsx
export const ScrollContainer: React.FC<{
  id: string;
  axis: 'x' | 'y' | 'xy';
  children: React.ReactNode;
}> = ({ id, axis, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { registerScrollContainer, unregisterScrollContainer, syncScroll } = useScrollSync();
  
  useEffect(() => {
    if (ref.current) {
      registerScrollContainer(id, ref.current);
    }
    return () => unregisterScrollContainer(id);
  }, [id]);
  
  const handleScroll = useCallback((e: React.UIEvent) => {
    const element = e.currentTarget;
    if (axis.includes('x')) syncScroll(id, 'x', element.scrollLeft);
    if (axis.includes('y')) syncScroll(id, 'y', element.scrollTop);
  }, [id, axis]);
  
  return (
    <div ref={ref} onScroll={handleScroll} className="scroll-container">
      {children}
    </div>
  );
};
```

#### Usage in Components
```typescript
// GanttGrid.tsx
export const GanttGrid = () => (
  <ScrollContainer id="gantt-grid" axis="y">
    <VirtualList items={steps} />
  </ScrollContainer>
);

// GanttTimeline.tsx  
export const GanttTimeline = () => (
  <ScrollContainer id="gantt-timeline" axis="xy">
    <Canvas />
  </ScrollContainer>
);

// SchedulerGrid.tsx
export const SchedulerGrid = () => (
  <ScrollContainer id="scheduler-grid" axis="y">
    <VirtualList items={workCells} />
  </ScrollContainer>
);

// SchedulerTimeline.tsx
export const SchedulerTimeline = () => (
  <ScrollContainer id="scheduler-timeline" axis="xy">
    <Canvas />
  </ScrollContainer>
);
```

### 14.4 State Management with Zustand
```typescript
// stores/ganttStore.ts
interface GanttStore {
  tasks: Task[];
  resources: Resource[];
  assignments: Assignment[];
  dependencies: Dependency[];
  viewConfig: {
    startDate: Date;
    endDate: Date;
    zoomLevel: ZoomLevel;
    scrollPosition: { x: number; y: number };
  };
  
  // Actions
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  moveTask: (taskId: string, newStart: Date) => void;
  resizeTask: (taskId: string, newDuration: number) => void;
  createDependency: (from: string, to: string, type: DependencyType) => void;
  assignResource: (taskId: string, resourceId: string, units: number) => void;
}
```

### 14.5 Integration Points

#### With Existing TextInput Component
```typescript
<TextInput
  form={formAdapter}
  name="percentDone"
  label="% Complete"
  type="number"
  min={0}
  max={100}
  suffix="%"
/>
```

#### With BaseEntitySheet
```typescript
<BaseEntitySheet
  title="Edit Task"
  description="Update task details and assignments"
  isOpen={isOpen}
  onClose={onClose}
  onSave={handleSave}
>
  {({ formAdapter }) => (
    <TaskEditForm task={selectedTask} formAdapter={formAdapter} />
  )}
</BaseEntitySheet>
```

#### With Existing Data Table
```typescript
// Extend data-table.tsx for the grid portion
<DataTable
  columns={ganttColumns}
  data={tasks}
  customRowRenderer={GanttRow}
  onRowClick={handleTaskSelect}
/>
```

### 14.6 Canvas/SVG Rendering Strategy
```typescript
// Canvas-first approach for performance with thousands of tasks
const GanttTimeline = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  
  // Always use Canvas for timeline with 1000s of tasks
  // Render only visible tasks + buffer
  const visibleTasks = useMemo(() => 
    tasks.slice(visibleRange.start, visibleRange.end + 20), // 20 task buffer
    [tasks, visibleRange]
  );
  
  // Use OffscreenCanvas for better performance if available
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Render only visible task bars
    renderVisibleTasks(ctx, visibleTasks);
  }, [visibleTasks]);
  
  return (
    <div className="gantt-timeline-container">
      <canvas ref={canvasRef} className="gantt-canvas" />
      {/* Invisible SVG overlay for interactions */}
      <svg className="gantt-interaction-layer">
        {/* Only render interaction areas for visible tasks */}
      </svg>
    </div>
  );
};
```

### 14.7 API Integration Pattern
```typescript
// Using Inertia.js patterns
const GanttPage = ({ tasks, resources, assignments }) => {
  const { data, setData, post, processing } = useForm({
    tasks,
    resources,
    assignments
  });
  
  const handleTaskUpdate = (task) => {
    post(route('tasks.update', task.id), {
      preserveScroll: true,
      onSuccess: () => toast.success('Task updated')
    });
  };
  
  return <GanttChart {...data} onTaskUpdate={handleTaskUpdate} />;
};
```

### 14.8 Performance Optimizations for Large Datasets

#### Virtual Scrolling Implementation
```typescript
import { VariableSizeList } from 'react-window';

const GanttGrid = ({ tasks, rowHeight = 45 }) => {
  // Calculate row heights (may vary with expanded/collapsed state)
  const getItemSize = useCallback((index) => {
    const task = flattenedTasks[index];
    return task.isExpanded ? rowHeight : 0; // Hide collapsed children
  }, [flattenedTasks, rowHeight]);
  
  return (
    <VariableSizeList
      height={600} // Container height
      itemCount={flattenedTasks.length}
      itemSize={getItemSize}
      width="100%"
      overscanCount={10} // Render 10 extra rows for smoother scrolling
    >
      {({ index, style }) => (
        <GanttRow task={flattenedTasks[index]} style={style} />
      )}
    </VariableSizeList>
  );
};
```

#### Performance Strategies
- **Virtual Scrolling**: react-window for both grid and timeline
  - Variable row heights for tree structure
  - Synchronized scroll between panels
  - Overscan for smooth scrolling
- **Data Structure Optimization**:
  - Flattened task array for quick access
  - Index maps for parent-child relationships
  - Pre-calculated positions and dates
- **Rendering Optimizations**:
  - React.memo with custom comparison
  - useMemo for expensive calculations
  - useCallback for event handlers
  - RequestIdleCallback for non-critical updates
- **Canvas Optimizations**:
  - Dirty rectangle rendering
  - Bitmap caching for static elements
  - OffscreenCanvas for background rendering
- **State Management**:
  - Normalized state structure
  - Selective subscriptions with Zustand
  - Computed values with memoization
- **API Optimizations**:
  - Pagination with cursor-based loading
  - GraphQL-style field selection
  - Debounced updates (500ms)
  - Optimistic UI updates
  - Background sync queue

## 15. Specific Project Requirements

### 15.1 Real-time Updates
- **Not Required**: No WebSockets, Pusher, or real-time synchronization needed
- **Manual Refresh**: Users can refresh data manually if needed
- **Optimistic Updates**: Show immediate UI feedback, then sync with server

### 15.2 Permissions and Security
- **Not Required Initially**: No permission checks needed for MVP
- **Future Integration**: Can add PermissionGuard wrapper later if needed
- **Basic Authentication**: Assume users are already authenticated via Laravel

### 15.3 Scale Expectations
Production requirements (much larger than demo):
- **Tasks**: 1000s of tasks with multiple hierarchy levels
  - Multiple projects/orders
  - Deep nesting (5+ levels possible)
  - Complex parent-child relationships
- **Resources**: 100s of resources (users/work cells)
- **Timeline**: Variable (days to years)
- **Dependencies**: 100s of cross-task dependencies
- **Performance Target**: Smooth interaction with 10,000+ tasks

### 15.4 Mobile Responsiveness
- **Not Required**: Desktop-only implementation
- **Minimum Width**: 1024px viewport
- **Fixed Layouts**: No need for responsive breakpoints
- **Desktop Optimized**: Focus on mouse/keyboard interactions

### 15.5 Browser Support
- **Modern Browsers Only**: Chrome, Firefox, Safari, Edge (latest versions)
- **No IE Support**: No Internet Explorer compatibility needed
- **ES6+ Features**: Can use modern JavaScript features

## 16. Additional Features and Considerations

### 16.1 Features Not Present in Demo (Not Required)
- **Search/Filter**: No search or filter functionality needed
- **Undo/Redo**: No undo/redo capability required
- **Print**: No print functionality needed
- **Export**: No export features required
- **Critical Path**: Not required
- **Baseline**: No baseline comparison needed
- **Resource Leveling**: No automatic leveling needed

### 16.2 Performance-Optimized Implementation
- **State Management**: Use Zustand with performance optimizations
- **Virtual Scrolling Required**: Essential for 1000s of tasks
  - Use react-window or react-virtualized
  - Only render visible rows + buffer
  - Dynamic row height calculations
  - Smooth scroll performance
- **Progressive Loading**: Load data in chunks
  - Initial load: visible tasks only
  - Background loading of full dataset
  - Lazy load child tasks on expand
- **Optimized Rendering**:
  - React.memo for row components
  - useMemo for expensive calculations
  - RequestAnimationFrame for smooth animations
- **Validation**: Debounced client-side validation
- **Error Handling**: Graceful degradation for large datasets

### 16.3 Drag Behavior Specifications

#### 16.3.1 Allowed Drag Operations
1. **Horizontal Task Dragging (Rescheduling)**
   - Drag task bars left/right to change start date
   - Maintains task duration
   - Respects predecessor constraints
   - Shows real-time feedback during drag
   - Snaps to grid (daily/hourly based on zoom)

2. **Task Duration Resize**
   - Drag right edge of task bar to change duration
   - Left edge remains fixed (start date unchanged)
   - Updates work cell utilization in real-time
   - Shows tooltip with new duration

3. **Work Cell Assignment (Scheduler View)**
   - Drag steps between compatible work cells
   - Shows drop zones on valid work cells
   - Highlights capacity conflicts during drag
   - Updates both views simultaneously

#### 16.3.2 Prohibited Drag Operations
1. **No Vertical Task Reordering**
   - Task sequence is fixed by BOM/routing
   - Rows cannot be reordered by dragging

2. **No Dependency Creation**
   - Cannot drag from task to task to create dependencies
   - No connection terminals on task bars
   - Dependencies are read-only from routing

3. **No Structural Changes**
   - Cannot drag to create new tasks
   - Cannot drag tasks between parent groups
   - Cannot change task hierarchy

### 16.4 MVP Focus Areas
1. **Core Gantt Functionality**
   - Display routing steps in hierarchical grid
   - Show step bars on timeline with fixed dependencies
   - Drag to reschedule (time only, not sequence)
   - Expand/collapse BOM hierarchy

2. **Work Cell Scheduler**
   - Display work cells with capacity indicators
   - Show step allocations on timeline
   - Drag steps between compatible work cells
   - Visual capacity utilization

3. **Essential Interactions**
   - Click to select steps
   - Drag horizontally to reschedule
   - Drag to resize duration
   - Double-click for step details
   - Zoom in/out controls

### 16.4 Deferred Features (Post-MVP)
- Real-time collaboration
- Advanced permissions
- Mobile support
- Offline capability
- Advanced filtering
- Custom reports
- API integration for external systems

## Summary

This comprehensive requirements specification outlines a sophisticated project management application combining Gantt chart capabilities with resource scheduling functionality. The application provides an intuitive, feature-rich interface for project planning, task management, and resource allocation, with real-time synchronization between views and extensive interactive capabilities.

Key aspects for implementation:
1. **Visual Design**: Detailed color palette, typography, and spacing specifications
2. **Data Models**: Complete TypeScript interfaces for all entities
3. **API Design**: RESTful endpoints with WebSocket support for real-time updates
4. **Event System**: Comprehensive event handlers for all user interactions
5. **Missing Features**: Several advanced features not present in the demo that could be added

The implementation should focus on performance, usability, and flexibility to handle various project management scenarios while maintaining a clean, professional user interface.

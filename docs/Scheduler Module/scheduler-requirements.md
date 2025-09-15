# Production Scheduler Module Requirements

## 1. Executive Summary

The Production Scheduler Module provides a visual Gantt chart interface for scheduling manufacturing orders (MOs) and their routing steps across work cells. The system supports hierarchical MO structures, enforces dependencies, manages finite capacity constraints, and enables both manual and automated scheduling. The scheduler integrates with the existing production module while maintaining real-time synchronization with production execution.

## 2. Core Concepts

### 2.1 Scheduling Entities

#### Manufacturing Orders (MOs)
- **No inherent duration** - MOs are containers/aggregators only
- Duration is derived from contained routing steps (first step start → last step end)
- Support hierarchical parent/child relationships
- Visual representation spans their steps' timeline but doesn't participate in scheduling

#### Manufacturing Steps
- **Primary scheduling unit** with defined duration
- Assigned to work cells
- Support various dependency types (completion, quantity-based, percentage-based)
- Can be manually locked to specific time slots
- Subject to capacity constraints

#### Work Cells
- Resources with finite capacity (no parallel execution support)
- Availability determined by shift schedules
- Track unavailable periods (maintenance, holidays, non-working hours)

### 2.2 Visual Hierarchy

Two distinct hierarchy types:
1. **MO Hierarchy**: Parent/child MO relationships (unlimited depth)
2. **MO-Step Hierarchy**: Steps grouped under their parent MO

Visual indicators:
- Tree expand/collapse controls for MO hierarchy
- Indentation/grouping for steps under MOs
- MO header bars spanning all contained steps

## 3. Data Model Requirements

### 3.1 New Models

#### ProductionSchedule
```
- id
- manufacturing_step_id (foreign key)
- scheduled_start (timestamp)
- scheduled_end (timestamp)
- work_cell_id (foreign key)
- is_locked (boolean, default: false)
- locked_by (user_id, nullable)
- locked_at (timestamp, nullable)
- schedule_version_id (foreign key)
- created_at
- updated_at
```

#### ScheduleVersion
```
- id
- version_number
- status (draft, published)
- published_by (user_id, nullable)
- published_at (timestamp, nullable)
- created_by (user_id)
- created_at
- updated_at
```

#### ScheduleAlert
```
- id
- schedule_version_id (foreign key)
- alert_type (capacity_overrun, dependency_violation, late_delivery)
- severity (warning, error)
- manufacturing_order_id (foreign key, nullable)
- manufacturing_step_id (foreign key, nullable)
- work_cell_id (foreign key, nullable)
- message (text)
- resolved (boolean, default: false)
- created_at
```

#### ScheduleSnapshot
```
- id
- schedule_version_id (foreign key)
- snapshot_data (json - complete schedule state)
- created_by (user_id)
- reason (text, nullable)
- created_at
```

### 3.2 Model Updates

#### ManufacturingStep
Add fields:
- `scheduled_start` (timestamp, nullable)
- `scheduled_end` (timestamp, nullable)

#### ManufacturingOrder
- Maintain existing `requested_date` (customer requirement)
- Update `planned_start_date` and `planned_end_date` based on step schedules

#### WorkCellCapacityBooking
- Create/update records when scheduling
- Link to ProductionSchedule entries
- Clean up when regenerating schedules

## 4. User Interface Specification

### 4.1 Layout Structure

```
┌─────────────────────────────────────────────────────┐
│                    Toolbar                          │
├─────────────────────────────────────────────────────┤
│          │                                          │
│   Grid   │            Timeline                      │
│  (Left)  │            (Right)                       │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│                   Splitter                          │
├─────────────────────────────────────────────────────┤
│          │                                          │
│ Resource │       Resource Timeline                  │
│   Grid   │                                          │
│          │                                          │
└─────────────────────────────────────────────────────┘
```

#### Toolbar Components:
- Create New Schedule button
- Run Scheduler button (with algorithm selection dropdown)
- Publish Schedule button (enabled for Planner role only)
- Zoom controls (zoom in/out, fit to screen)
- Time range selector
- Search box for MO filtering
- View Alerts button

### 4.2 Grid Panel (Left Side)

Displays hierarchical structure:
- MO hierarchy with expand/collapse
- Steps indented under their MOs
- Columns: Order Number, Name, Progress, Status, Work Cell

### 4.3 Timeline Panel (Right Side)

#### Gantt Chart Features:
- MO header bars (spanning contained steps)
- Individual step bars
- Progress visualization
- Dependency lines
- Locked step indicators (lock icon)

#### Visual Indicators:
- **Progressive Flow**: Overlapping bars with special connectors
- **Status Colors**: Different colors for each status
- **Unavailable Periods**: Gray blocks with hover tooltips
- **Conflicts**: Red highlighting

### 4.4 Resource Panel (Bottom)

Work cell allocation view:
- Work cells listed vertically
- Time-based capacity visualization
- Allocated steps shown as blocks
- Unavailable periods marked

### 4.5 Interaction Features

#### Drag & Drop:
- Move individual steps (creates locked position)
- Highlight valid drop zones
- Prevent work cell double-booking
- Steps can only be moved individually (MOs have no duration)
- NO impact preview (what other tasks will move)
- Constraint violations shown only after running scheduler (not real-time)

#### Zoom Controls:
- Smooth transitions: Minutes → Hour → Day → Week → Month
- Step aggregation when too small to display
- Maintain context during zoom

#### Highlighting System:
- Click any element to highlight:
  - All steps in same MO
  - Parent/child MOs (entire tree)
  - Cross-MO dependencies
- Dim unrelated items for clarity

#### Search and Filter:
- Search for specific MOs (VERY important feature)
- Filter by plants/areas/work cells
- Toggle between different time ranges

## 5. Scheduling Engine

### 5.1 Laravel-Based Algorithms

Initial implementation in PHP:
- **ASAP Scheduling**: Schedule at earliest available slot (default)
- **JIT Scheduling**: Schedule as late as possible
- **Critical Path**: Focus on bottleneck operations
- **Priority-Based**: Higher priority MOs scheduled first
- **Forward Scheduling**: From start date forward
- **Backward Scheduling**: From due date backward
- **Capacity Checking**: Prevent overbooking
- **Dependency Validation**: Ensure prerequisites met

Algorithm selection available via dropdown in toolbar when running scheduler.

### 5.2 Scheduling Process

1. **Load Current State**: Get all active MOs and steps
2. **Apply Locked Positions**: Respect manually positioned steps
3. **Sort by Priority**: Order MOs for scheduling
4. **Schedule Steps**: 
   - Find available capacity
   - Check dependencies
   - Assign time slots
5. **Validate Results**: Check for conflicts
6. **Generate Alerts**: Document any issues

### 5.3 Laravel Queue Implementation

Use Laravel's queue system to prevent UI blocking:
- Process scheduling calculations in background
- Update UI via websockets or polling
- Maintain system responsiveness

### 5.4 Future Integration

Prepare data model for future Python/OR-Tools integration:
- Structured data format for optimization algorithms
- Clean API for external scheduling engines
- Support for advanced constraint programming

## 6. Permissions & Access Control

### 6.1 Required Permissions

Create if not existing:
- `production.schedule.view` - View schedules
- `production.schedule.create` - Create draft schedules
- `production.schedule.edit` - Edit draft schedules
- `production.schedule.publish` - Publish schedules (Planner role)
- `production.schedule.delete` - Delete draft schedules

### 6.2 Role Assignments

**Planner Role**:
- All schedule permissions
- Can publish schedules
- Can override constraints

**Production Manager**:
- View and create drafts
- Cannot publish

**Operator**:
- View only

## 7. Business Rules

### 7.1 Schedule Versions

- Multiple draft versions can exist simultaneously
- Only one published version active at a time
- Published schedules are immutable
- New schedules don't affect in-progress MOs
- Always start with fresh state when opening scheduler
- Cache schedule during session for performance

### 7.2 Constraints

#### Enforced Automatically:
- Work cell capacity limits
- Step dependency sequences
- Child order dependencies
- Shift availability (no overtime scheduling)

#### Manual Override Allowed:
- Dependency timing (with warning)
- Step positions via drag-and-drop (creates locked position)

### 7.3 Locked Steps

- Users can lock step positions manually
- Locked steps are visually distinct (lock icon)
- Users can unlock previously locked steps
- Auto-scheduler respects locked positions
- Error thrown if scheduler cannot find solution due to locks

### 7.4 Time Restrictions

- Default view: 30 days
- Maximum display: 1000 MOs
- Scheduling granularity: minutes
- Respect shift schedules strictly (no soft unavailable periods)

## 8. Alert Management

### 8.1 Alert Types

1. **Capacity Overruns**: Work cell double-booked
2. **Dependency Violations**: Prerequisites not met
3. **Late Deliveries**: Scheduled completion after requested date

### 8.2 Alert Display

- Side panel showing current conflicts
- Separate screen for detailed analysis  
- Error modal when scheduler fails
- Clear explanations with affected entities

## 9. Status Management

### 9.1 Excluded Statuses

Scheduler does not display:
- Draft MOs
- Completed MOs
- Cancelled MOs

### 9.2 Status Visualization

- Show current status on UI elements
- Display progress on hover
- Color coding for different statuses
- Special indicators for:
  - On-hold status
  - Steps awaiting quality checks
  - Blocked steps (dependencies not met)

## 10. Progressive Flow Support

### 10.1 Visualization

- Overlapping task bars for concurrent execution
- Special connectors showing continuous flow
- Progress indicators showing partial completion

### 10.2 Rules

- Respect routing gates and dependency conditions
- Allow manual override of dependencies
- Support parallel step execution on same MO

## 11. Performance Requirements

### 11.1 Initial Implementation

- Load all data at once (up to limits)
- Basic performance acceptable for MVP
- Focus on functionality over optimization

### 11.2 Limits

- Maximum 1000 MOs displayed
- 30-day default time horizon
- No initial aggregation or virtualization

### 11.3 Future Optimization

- Consider canvas rendering
- Implement view windowing
- Add step aggregation at zoom levels

## 12. Implementation Priorities

### Phase 1: Core Infrastructure
1. Create data models
2. Build basic UI layout
3. Implement grid and timeline views
4. Enable basic drag-and-drop

### Phase 2: Scheduling Engine
1. Implement ASAP algorithm
2. Add dependency validation
3. Create capacity checking
4. Build alert system

### Phase 3: Advanced Features
1. Add version management
2. Implement publish workflow
3. Create locked step functionality
4. Add search and filtering

### Phase 4: Polish and Performance
1. Enhance visualizations
2. Optimize performance
3. Add progressive flow indicators
4. Implement zoom controls

## 13. Success Criteria

The scheduler module will be considered successful when it can:

1. Display 1000+ MOs with their steps in a hierarchical view
2. Allow manual scheduling via drag-and-drop
3. Automatically schedule based on ASAP algorithm
4. Enforce capacity and dependency constraints
5. Generate meaningful alerts for conflicts
6. Support draft and published schedule versions
7. Integrate seamlessly with existing production module
8. Maintain system responsiveness during calculations
9. Provide clear visual feedback for all states and conflicts
10. Enable efficient production planning workflows

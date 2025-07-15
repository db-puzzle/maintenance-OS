# Work Order Management System Specification

## Overview

This document specifies the unified Work Order Management System that serves as the single execution model for all maintenance activities in the CMMS. Work Orders represent the fundamental unit of work, whether originating from preventive maintenance routines, corrective repairs, inspections, or projects. This system provides complete lifecycle management from creation through execution to closure.

The system is designed to support multiple disciplines (Maintenance, Quality, etc.) through a unified architecture, with the current implementation focusing on the Maintenance discipline.

## Work Order Disciplines

### Maintenance Discipline (Current Implementation)

The Maintenance discipline handles all equipment and asset-related work orders, focusing on reliability, availability, and performance of production assets.

### Quality Discipline (Future Implementation)

The Quality discipline will handle calibration, quality control, audits, and non-conformance work orders, focusing on measurement accuracy, compliance, and quality standards.

## Work Order Categories

### Maintenance Categories

#### Preventive Maintenance

Work Orders created to prevent equipment failure through scheduled maintenance activities.

**Key Characteristics:**
- Generated automatically from Routines in automatic execution mode
- Created manually from Routines in manual execution mode
- Follow predefined maintenance procedures via Forms
- Predictable scheduling based on runtime or calendar intervals
- Often auto-approved when generated from Routines

**Process Flow:**
1. Routine triggers Work Order creation (automatic or manual)
2. Work Order inherits Form template and configuration from Routine
3. System schedules based on asset availability and resource constraints
4. Technician executes using predefined task checklist
5. Completion updates Routine tracking for next cycle calculation

#### Corrective Maintenance

Work Orders created to repair equipment failures or address identified issues.

**Key Characteristics:**
- Created manually when problems are discovered
- May originate from inspection findings or sensor alerts
- Often have higher priority due to operational impact
- Require failure analysis for root cause identification
- May generate follow-up preventive actions

**Process Flow:**
1. Issue identified through inspection, monitoring, or failure
2. Work Order created with problem description
3. Planning phase determines required resources and parts
4. Execution includes repair work and failure documentation
5. Failure analysis captures root cause for prevention

#### Inspection

Work Orders for systematic examination of equipment condition.

**Key Characteristics:**
- Use inspection-specific Forms with condition assessments
- May generate corrective Work Orders based on findings
- Often scheduled at regular intervals
- Focus on data collection rather than maintenance tasks
- Results feed into predictive maintenance programs

**Process Flow:**
1. Inspection Work Order created (scheduled or ad-hoc)
2. Inspector uses Form to guide examination
3. Findings documented with photos and measurements
4. System generates corrective Work Orders if issues found
5. Data analyzed for trends and predictions

#### Project

Work Orders for larger maintenance initiatives or improvements.

**Key Characteristics:**
- Multi-task activities with extended duration
- May involve multiple assets or systems
- Require detailed planning and resource coordination
- Often have dependencies on other Work Orders
- Track progress through project phases

**Process Flow:**
1. Project Work Order created with scope definition
2. Detailed planning breaks down into tasks and phases
3. Resources allocated across project timeline
4. Execution tracked with milestone completion
5. Project closed when all objectives achieved

### Quality Categories (Future Implementation)

- **Calibration**: Periodic calibration of measurement instruments
- **Quality Control**: Product quality verification and testing
- **Quality Audit**: Systematic quality system audits
- **Non-Conformance**: Handling of quality deviations and defects

## Data Model

### Work Order Model

The `work_orders` table serves as the central entity:

```sql
CREATE TABLE work_orders (
    id BIGINT UNSIGNED PRIMARY KEY,
    work_order_number VARCHAR(255) UNIQUE NOT NULL,
    discipline ENUM('maintenance', 'quality') NOT NULL DEFAULT 'maintenance',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    work_order_type_id BIGINT UNSIGNED NOT NULL,
    work_order_category ENUM('corrective', 'preventive', 'inspection', 'project', 
                            'calibration', 'quality_control', 'quality_audit', 'non_conformance') NOT NULL,
    priority ENUM('emergency', 'urgent', 'high', 'normal', 'low') DEFAULT 'normal',
    priority_score INTEGER DEFAULT 50,
    status VARCHAR(50) DEFAULT 'requested',
    
    -- Asset relationship (for maintenance discipline)
    asset_id BIGINT UNSIGNED NULL,
    
    -- Instrument relationship (for quality discipline - future)
    instrument_id BIGINT UNSIGNED NULL,
    
    -- Form/Task configuration
    form_id BIGINT UNSIGNED NULL,
    form_version_id BIGINT UNSIGNED NULL,
    custom_tasks JSON NULL,
    
    -- Planning fields
    estimated_hours DECIMAL(5,2) NULL,
    estimated_parts_cost DECIMAL(10,2) NULL,
    estimated_labor_cost DECIMAL(10,2) NULL,
    estimated_total_cost DECIMAL(10,2) NULL,
    downtime_required BOOLEAN DEFAULT FALSE,
    safety_requirements JSON NULL,
    
    -- Scheduling
    requested_due_date TIMESTAMP NULL,
    scheduled_start_date TIMESTAMP NULL,
    scheduled_end_date TIMESTAMP NULL,
    
    -- Assignment
    assigned_team_id BIGINT UNSIGNED NULL,
    assigned_technician_id BIGINT UNSIGNED NULL,
    required_skills JSON NULL,
    required_certifications JSON NULL,
    
    -- Execution tracking
    actual_start_date TIMESTAMP NULL,
    actual_end_date TIMESTAMP NULL,
    actual_hours DECIMAL(5,2) NULL,
    actual_parts_cost DECIMAL(10,2) NULL,
    actual_labor_cost DECIMAL(10,2) NULL,
    actual_total_cost DECIMAL(10,2) NULL,
    
    -- Source tracking
    source_type VARCHAR(50) NOT NULL,
    source_id BIGINT UNSIGNED NULL,
    
    -- Relationships
    related_work_order_id BIGINT UNSIGNED NULL,
    relationship_type VARCHAR(50) NULL,
    
    -- People tracking
    requested_by BIGINT UNSIGNED NOT NULL,
    approved_by BIGINT UNSIGNED NULL,
    planned_by BIGINT UNSIGNED NULL,
    verified_by BIGINT UNSIGNED NULL,
    closed_by BIGINT UNSIGNED NULL,
    
    -- Timestamps
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    planned_at TIMESTAMP NULL,
    verified_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    
    -- Metadata
    external_reference VARCHAR(255) NULL,
    warranty_claim BOOLEAN DEFAULT FALSE,
    attachments JSON NULL,
    tags JSON NULL,
    
    -- Quality-specific fields (sparse, used only for quality discipline)
    calibration_due_date DATE NULL,
    certificate_number VARCHAR(100) NULL,
    compliance_standard VARCHAR(100) NULL,
    tolerance_specs JSON NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_discipline (discipline),
    INDEX idx_discipline_category (discipline, work_order_category),
    INDEX idx_discipline_status (discipline, status),
    INDEX idx_asset_id (asset_id),
    INDEX idx_instrument_id (instrument_id)
);

-- Routine table (referenced for work order generation)
CREATE TABLE routines (
    id BIGINT UNSIGNED PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    asset_id BIGINT UNSIGNED NOT NULL,
    form_id BIGINT UNSIGNED NOT NULL,
    form_version_id BIGINT UNSIGNED NOT NULL,
    trigger_type ENUM('runtime_hours', 'calendar_days') NOT NULL,
    trigger_runtime_hours INTEGER NULL,
    trigger_calendar_cays INTEGER NULL,
    execution_mode ENUM('automatic', 'manual') NOT NULL,
    advance_generation_hours INTEGER DEFAULT 24,
    auto_approve_work_orders BOOLEAN DEFAULT FALSE,
    priority VARCHAR(50) DEFAULT 'normal',
    priority_score INTEGER DEFAULT 50,
    last_execution_runtime_hours DECIMAL(10,2) NULL,
    last_execution_completed_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_asset_id (asset_id),
    INDEX idx_execution_mode (execution_mode),
    INDEX idx_is_active (is_active)
);
```

### Work Order Execution Model

The `work_order_executions` table tracks the actual work performed:

```sql
CREATE TABLE work_order_executions (
    id BIGINT UNSIGNED PRIMARY KEY,
    work_order_id BIGINT UNSIGNED UNIQUE NOT NULL,
    executed_by BIGINT UNSIGNED NOT NULL,
    status ENUM('assigned', 'in_progress', 'paused', 'completed') DEFAULT 'assigned',
    
    -- Time tracking
    started_at TIMESTAMP NULL,
    paused_at TIMESTAMP NULL,
    resumed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    total_pause_duration INTEGER DEFAULT 0,
    
    -- Work details
    work_performed TEXT NULL,
    observations TEXT NULL,
    recommendations TEXT NULL,
    follow_up_required BOOLEAN DEFAULT FALSE,
    
    -- Completion checklist
    safety_checks_completed BOOLEAN DEFAULT FALSE,
    quality_checks_completed BOOLEAN DEFAULT FALSE,
    area_cleaned BOOLEAN DEFAULT FALSE,
    tools_returned BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Supporting Models

Additional tables support the Work Order system:

1. **work_order_types**: Defines specific types within each category
2. **work_order_parts**: Tracks parts planned and used
3. **work_order_status_history**: Audit trail of status changes
4. **work_order_failure_analysis**: Captures failure data for corrective work
5. **task_responses**: Direct link to Work Order execution (no FormExecution intermediary)

## Work Order Sources

### Maintenance Sources

#### Manual Creation

Users directly create Work Orders through the UI for:
- Identified problems requiring correction
- Ad-hoc maintenance needs
- Special projects or improvements
- One-time inspections

#### Routine Generation

Work Orders automatically created from Routines based on execution mode:

**Automatic Execution Mode:**
- System monitors asset runtime continuously for runtime-based routines
- System monitors calendar dates for calendar-based routines
- Generates Work Order when due within advance window (configurable per routine)
- **Only generates if no open work order exists from this routine** (open = any status except 'verified' or 'closed')
- No user intervention required
- Follows Routine's auto-approval settings (configurable per routine)

**Manual Execution Mode:**
- System calculates when maintenance is due (runtime or calendar)
- User manually creates Work Order when appropriate
- **System prevents creation if open work order exists from this routine**
- Provides flexibility for scheduling
- Maintains same tracking as automatic mode
- Can inherit auto-approval setting from routine

**Routine Configuration Fields:**
- `trigger_type`: 'runtime_hours' or 'calendar_days'
- `trigger_runtime_hours`: Number of runtime hours between executions (when trigger_type = 'runtime_hours')
- `trigger_calendar_cays`: Number of calendar days between executions (when trigger_type = 'calendar_days')
- `advance_generation_hours`: Number of hours before due date to generate work order (default: 24)
- `auto_approve_work_orders`: Boolean to automatically approve generated work orders (default: false) - **Requires 'work-orders.approve' permission to set**
- `last_execution_runtime_hours`: Last recorded runtime hours (for runtime-based)
- `last_execution_completed_at`: Last execution completion timestamp (for both types)

**Due Date Calculation:**
- **Runtime Hours**: Based on asset runtime accumulation since last execution
- **Calendar Days**: Based on calendar days elapsed since last execution

#### Sensor Alerts

Integration with monitoring systems to create Work Orders when:
- Temperature exceeds thresholds
- Vibration indicates potential failure
- Pressure drops below acceptable levels
- Other sensor-defined conditions occur

#### Inspection Findings

Work Orders generated from completed inspections when:
- Defects are identified requiring correction
- Measurements indicate degradation
- Visual inspection reveals issues
- Preventive action is recommended

### Quality Sources (Future Implementation)

- **Calibration Schedule**: Calendar-based triggers for instrument calibration
- **Quality Alerts**: Non-conformance or out-of-spec conditions
- **Audit Findings**: Issues identified during quality audits
- **Customer Complaints**: External quality issues requiring investigation

## Work Order Lifecycle

### Status Flow

Work Orders follow a defined status progression:

```
Requested → Approved → Planned → Ready to Schedule → Scheduled → In Progress → Completed → Verified → Closed
    ↓          ↓         ↓              ↓                ↓            ↓            ↓           ↓
Rejected   Cancelled  On Hold       On Hold          On Hold      On Hold      Reopened   Completed
```

### Status Definitions

1. **Requested**: Initial state awaiting approval
2. **Approved**: Authorized for planning and execution
3. **Rejected**: Denied by approver (terminal state)
4. **Planned**: Resources and requirements defined
5. **Ready to Schedule**: Fully planned, awaiting scheduling
6. **Scheduled**: Assigned to technician with dates
7. **In Progress**: Currently being executed
8. **On Hold**: Temporarily paused for various reasons
9. **Completed**: Work finished, awaiting verification
10. **Verified**: Quality validated by authorized personnel
11. **Closed**: Final state with all documentation complete
12. **Cancelled**: Terminated before completion (terminal state)

### Status Transition Rules

Each status has defined allowed transitions:
- Only valid transitions permitted by system
- Approval required based on thresholds
- Reason required for rejection/cancellation
- On Hold can return to previous status
- Verification required before closing

## Work Order-Form Integration

### Form as Task Template

Forms serve as reusable task templates for Work Orders:

1. **Template Selection**
   - Work Order references Form and specific version
   - Version locked at creation for consistency
   - Custom tasks can supplement or replace Form tasks

2. **Task Execution**
   - Task responses link directly to Work Order execution
   - No intermediate FormExecution entity
   - Maintains complete audit trail

3. **Version Control**
   - Work Order preserves Form version used
   - Enables comparison across executions
   - Supports compliance requirements

### Task Response Collection

During execution, technicians complete tasks:

1. **Response Types**
   - Text responses for questions
   - Numeric values for measurements
   - Boolean for checklist items
   - File uploads for photos/documents
   - Selections for multiple choice

2. **Validation**
   - Required tasks must be completed
   - Measurements validated against ranges
   - Photo evidence required where specified

3. **Real-time Saving**
   - Responses saved as entered
   - Work preserved if interrupted
   - Offline capability with sync

## Planning and Resource Management

### Planning Phase

After approval, Work Orders enter planning:

1. **Time Estimation**
   - Estimated hours for completion
   - Downtime requirements
   - Schedule constraints

2. **Resource Requirements**
   - Required skills and certifications
   - Team assignments
   - Special tools or equipment

3. **Parts Planning**
   - Identify required parts
   - Check inventory availability
   - Reserve parts if needed
   - Calculate parts cost

4. **Safety Planning**
   - LOTO requirements
   - Required permits
   - PPE specifications
   - Hazard assessments

### Cost Tracking

Work Orders track both estimated and actual costs:

1. **Labor Costs**
   - Estimated hours × labor rate
   - Actual hours from execution
   - Overtime considerations

2. **Parts Costs**
   - Planned parts with quantities
   - Actual usage during execution
   - Variance analysis

3. **Total Cost**
   - Combined labor and parts
   - Additional costs (contractors, etc.)
   - Budget vs actual comparison

## Execution Process

### Starting Execution

When technician begins work:

1. **Pre-execution Checks**
   - Verify safety requirements met
   - Confirm parts availability
   - Review work instructions
   - Check asset accessibility

2. **Status Updates**
   - Work Order moves to "In Progress"
   - Execution timer starts
   - Notifications sent to stakeholders

### During Execution

Technicians interact with the system to:

1. **Complete Tasks**
   - Check off completed items
   - Enter measurements and observations
   - Upload required photos
   - Add notes for anomalies

2. **Track Time**
   - Automatic time tracking
   - Pause/resume capability
   - Break time exclusion

3. **Use Parts**
   - Record actual parts used
   - Note any substitutions
   - Track quantities consumed

### Completing Work

Upon work completion:

1. **Final Documentation**
   - Work performed summary
   - Observations and recommendations
   - Follow-up requirements
   - Safety checklist confirmation

2. **Status Transition**
   - Move to "Completed" status
   - Trigger verification workflow
   - Update related records

## Failure Analysis

### For Corrective Work Orders

Systematic capture of failure information:

1. **Failure Classification**
   - Failure mode selection
   - Root cause identification
   - Immediate cause documentation

2. **Impact Assessment**
   - Production loss quantification
   - Safety incident recording
   - Environmental impact
   - Downtime calculation

3. **Corrective Actions**
   - Immediate actions taken
   - Preventive recommendations
   - Process improvements
   - Training needs

### Analysis Integration

Failure data feeds into:
- Reliability calculations (MTBF, MTTR)
- Preventive maintenance optimization
- Spare parts planning
- Training programs

## System Behavior

### Routine Work Order Generation Rules

The system enforces strict rules for work order generation from routines:

1. **Automatic Generation Prevention**:
   - System checks for any existing work order from the routine
   - Only statuses 'verified' and 'closed' are considered complete
   - All other statuses ('requested', 'approved', 'planned', 'scheduled', 'in_progress', 'completed', 'on_hold', 'rejected', 'cancelled') prevent new generation
   - This prevents duplicate work orders and ensures proper completion

2. **Manual Creation Prevention**:
   - When user attempts to create work order from manual routine
   - System checks for open work orders
   - Shows warning/error if open work order exists
   - Provides link to existing work order

3. **Status Consideration**:
   - 'verified': Work has been validated and approved
   - 'closed': All documentation complete, work order archived
   - Any other status indicates work is still pending or in process

4. **Auto-Approval Permission Requirements**:
   - Only users with 'work-orders.approve' permission can enable auto-approval
   - System validates permission when saving routine configuration
   - Auto-approval during generation verifies approver still has permission
   - Failed auto-approvals are logged for audit purposes

### Routine Execution Tracking

The system tracks routine execution differently based on trigger type:

**Runtime Hours Tracking:**
- Records `last_execution_runtime_hours` when work order completes
- Compares current asset runtime to last execution runtime
- Calculates remaining hours based on runtime accumulation
- Estimates due dates based on average asset usage

**Calendar Days Tracking:**
- Records `last_execution_completed_at` when work order completes
- Calculates next due date by adding trigger days to last completion
- Provides exact due dates (not estimates)
- Unaffected by asset usage patterns

### Work Order Generation Command

```php
// app/Console/Commands/GenerateWorkOrdersFromRoutines.php
class GenerateWorkOrdersFromRoutines extends Command
{
    protected $signature = 'workorders:generate-from-routines';
    protected $description = 'Generate work orders from routines based on their triggers';
    
    public function handle()
    {
        $this->info('Checking routines for work order generation...');
        
        // Process runtime-based routines
        $runtimeRoutines = Routine::where('execution_mode', 'automatic')
            ->where('trigger_type', 'runtime_hours')
            ->where('is_active', true)
            ->with(['asset.latestRuntimeMeasurement'])
            ->get();
            
        $this->info("Found {$runtimeRoutines->count()} active runtime-based routines");
        
        // Process calendar-based routines
        $calendarRoutines = Routine::where('execution_mode', 'automatic')
            ->where('trigger_type', 'calendar_days')
            ->where('is_active', true)
            ->get();
            
        $this->info("Found {$calendarRoutines->count()} active calendar-based routines");
        
        $service = new WorkOrderGenerationService();
        $generated = $service->generateDueWorkOrders();
        
        $this->info("Generated {$generated->count()} work orders");
        
        // Log details
        foreach ($generated as $workOrder) {
            $routine = Routine::find($workOrder->source_id);
            $triggerInfo = $routine->trigger_type === 'runtime_hours'
                ? "{$routine->trigger_runtime_hours}h runtime"
                : "{$routine->trigger_calendar_cays} days";
                
            $this->line("- WO #{$workOrder->work_order_number} for {$routine->name} ({$triggerInfo})");
        }
        
        // Log routines that were due but had open work orders
        $skippedCount = 0;
        foreach ($runtimeRoutines->merge($calendarRoutines) as $routine) {
            $hoursUntilDue = $routine->calculateHoursUntilDue();
            if ($hoursUntilDue !== null && $hoursUntilDue <= ($routine->advance_generation_hours ?? 24) && $hoursUntilDue > 0) {
                if ($routine->hasOpenWorkOrder()) {
                    $openWO = $routine->getOpenWorkOrder();
                    $this->warn("- Skipped {$routine->name}: Open WO #{$openWO->work_order_number} (Status: {$openWO->status})");
                    $skippedCount++;
                }
            }
        }
        
        if ($skippedCount > 0) {
            $this->info("Skipped {$skippedCount} routines with open work orders");
        }
    }
}
```

### Controller with Discipline Context

Controllers handle discipline through route context:

```php
class WorkOrderController
{
    protected MaintenanceWorkOrderService $maintenanceService;
    protected ?QualityWorkOrderService $qualityService;
    
    public function index(Request $request)
    {
        $discipline = $request->route()->defaults['discipline'] ?? 'maintenance';
        
        $workOrders = WorkOrder::where('discipline', $discipline)
            ->with(['asset', 'workOrderType', 'assignedTechnician'])
            ->paginate();
            
        return Inertia::render('WorkOrders/Index', [
            'workOrders' => $workOrders,
            'discipline' => $discipline,
        ]);
    }
    
    public function store(StoreWorkOrderRequest $request)
    {
        $discipline = $request->route()->defaults['discipline'] ?? 'maintenance';
        
        $service = match($discipline) {
            'maintenance' => $this->maintenanceService,
            'quality' => $this->qualityService,
            default => throw new InvalidArgumentException('Invalid discipline')
        };
        
        $workOrder = $service->create($request->validated());
        
        return redirect()->route("{$discipline}.work-orders.show", $workOrder);
    }
}
```

### Execution Completion Updates

When Work Order execution completes:

```php
class WorkOrderExecutionObserver
{
    public function completed(WorkOrderExecution $execution)
    {
        $workOrder = $execution->workOrder;
        
        // Update Work Order with actual values
        $workOrder->update([
            'actual_end_date' => now(),
            'actual_hours' => $execution->actual_duration,
            'status' => 'completed'
        ]);
        
        // Update source tracking (e.g., Routine)
        if ($workOrder->source_type === 'routine') {
            $this->updateRoutineTracking($workOrder);
        }
        
        // Check for follow-up requirements
        if ($execution->follow_up_required) {
            $this->createFollowUpWorkOrder($execution);
        }
    }
    
    private function updateRoutineTracking(WorkOrder $workOrder)
    {
        $routine = Routine::find($workOrder->source_id);
        if ($routine) {
            $updateData = [
                'last_execution_completed_at' => now(),
            ];
            
            // Only update runtime hours for runtime-based routines
            if ($routine->trigger_type === 'runtime_hours') {
                $updateData['last_execution_runtime_hours'] = $workOrder->asset->current_runtime_hours;
            }
            
            $routine->update($updateData);
        }
    }
}
```

## User Interface

### Discipline-Based Navigation

The UI provides separate navigation paths for different disciplines:

```
/maintenance/work-orders    # Maintenance discipline work orders
/quality/work-orders       # Quality discipline work orders (future)
```

### Work Order Dashboard

Central hub displaying discipline-specific information:

1. **KPI Cards**
   - Maintenance: Open WOs by category (Preventive, Corrective, Inspection, Project)
   - Quality: Open WOs by category (Calibration, QC, Audit, Non-Conformance)
   - Discipline-specific metrics

2. **Quick Filters**
   - Discipline filter (when multiple disciplines are active)
   - Category filters based on selected discipline
   - Standard filters (status, priority, dates)

### Work Order Creation

Multi-step form interface:

1. **Source Selection**
   - Manual request
   - From routine (if manual mode)
   - From inspection finding

2. **Basic Information**
   - Work order type and category
   - Title and description
   - Priority setting

3. **Asset Selection**
   - Hierarchical navigation
   - Asset search
   - Recent assets

4. **Initial Planning**
   - Due date request
   - Preliminary resource needs
   - Form template selection

### Work Order Execution

Mobile-optimized interface for field work:

1. **Execution Header**
   - Work Order details
   - Timer display
   - Pause/resume controls

2. **Task Checklist**
   - Sequential task completion
   - Input fields for measurements
   - Photo capture buttons
   - Progress indicator

3. **Parts Tracking**
   - Planned vs used
   - Quick add for unplanned parts
   - Quantity adjustments

4. **Completion Summary**
   - Work performed notes
   - Follow-up requirements
   - Final checklists

### Planning Interface

Comprehensive planning tools:

1. **Resource Planning**
   - Time estimation
   - Skill requirements
   - Team assignment

2. **Parts Management**
   - Part selection with inventory
   - Quantity planning
   - Cost calculation

3. **Schedule Coordination**
   - Calendar view
   - Resource availability
   - Conflict detection

### Validation Screen

Quality assurance interface:

1. **Work Review**
   - Completed tasks summary
   - Measurement verification
   - Photo evidence review

2. **Validation Checklist**
   - Quality standards met
   - Safety compliance
   - Documentation complete

3. **Decision Actions**
   - Approve and verify
   - Request rework
   - Add validation notes

## Integration with Routines

### Seamless Routine-Work Order Flow

1. **Automatic Execution Mode**
   - System generates Work Orders without user intervention
   - Maintains runtime-based scheduling
   - Updates Routine tracking on completion

2. **Manual Execution Mode**
   - User creates Work Order when due
   - Same tracking and integration
   - Flexibility in timing

3. **Execution Tracking**
   - Work Order completion updates Routine's last execution
   - Runtime hours recorded for next cycle
   - Form version preserved for audit

### Data Flow

```
Routine → Work Order → Execution → Task Responses
   ↑                                      ↓
   └──────── Completion Updates ──────────┘
```

## Reporting and Analytics

### Standard Reports

1. **Work Order Summary**
   - By category, status, priority
   - Completion rates
   - Average cycle times

2. **Asset Performance**
   - Work Orders per asset
   - Downtime analysis
   - Cost by asset

3. **Resource Utilization**
   - Technician workload
   - Team efficiency
   - Skill gap analysis

4. **Cost Analysis**
   - Budget vs actual
   - Parts usage trends
   - Labor cost breakdown

### Key Performance Indicators

1. **Efficiency Metrics**
   - On-time completion rate
   - First-time fix rate
   - Planned vs reactive ratio

2. **Reliability Metrics**
   - MTBF by asset type
   - MTTR trends
   - Failure rate analysis

3. **Cost Metrics**
   - Cost per Work Order
   - Maintenance cost ratio
   - Parts inventory turnover

## Implementation Plan

### Phase 1: Foundation with Discipline Support (Week 1)

1. **Database Setup**
   - Create Work Order tables with discipline field
   - Add discipline indexes
   - Create discipline configuration table
   - Create seed data for maintenance discipline

2. **Model Creation**
   - WorkOrder model with discipline scopes
   - Discipline-aware validations
   - Supporting models

3. **Route Structure**
   ```php
   // routes/work-orders.php
   Route::prefix('maintenance/work-orders')
       ->defaults('discipline', 'maintenance')
       ->name('maintenance.work-orders.')
       ->group(function () {
           Route::get('/', [WorkOrderController::class, 'index'])->name('index');
           Route::get('/create', [WorkOrderController::class, 'create'])->name('create');
           Route::post('/', [WorkOrderController::class, 'store'])->name('store');
           Route::get('/{workOrder}', [WorkOrderController::class, 'show'])->name('show');
           Route::get('/{workOrder}/edit', [WorkOrderController::class, 'edit'])->name('edit');
           Route::put('/{workOrder}', [WorkOrderController::class, 'update'])->name('update');
           Route::get('/{workOrder}/execute', [WorkOrderExecutionController::class, 'show'])->name('execute');
           Route::post('/{workOrder}/execute', [WorkOrderExecutionController::class, 'store'])->name('execute.store');
   });
   
   // Future: routes/quality-work-orders.php
   // Route::prefix('quality/work-orders')
   //     ->defaults('discipline', 'quality')
   //     ->name('quality.work-orders.')
   //     ->group(function () { ... });
   ```

4. **Service Layer Setup**
   - Create BaseWorkOrderService abstract class
   - Implement MaintenanceWorkOrderService
   - Prepare interface for QualityWorkOrderService

### Phase 2: Core Functionality (Week 2-3)

1. **Basic CRUD Operations**
   - Create Work Order controller
   - Implement status transitions
   - Build approval workflow

2. **Routine Integration**
   - Update Routine model for Work Order generation
   - Implement automatic generation service
   - Add manual creation for manual mode

### Phase 3: Execution Flow (Week 4)

1. **Execution Interface**
   - Build execution controller
   - Create task response system
   - Implement time tracking

2. **Mobile Optimization**
   - Responsive execution views
   - Offline capability
   - Touch-optimized controls

### Phase 4: Planning Tools (Week 5)

1. **Planning Interface**
   - Resource planning
   - Parts management
   - Schedule coordination

2. **Cost Tracking**
   - Estimation tools
   - Actual cost capture
   - Variance reporting

### Phase 5: Quality & Validation (Week 6)

1. **Validation Workflow**
   - Validation interface
   - Quality checklists
   - Rework handling

2. **Failure Analysis**
   - Classification system
   - Impact assessment
   - Reporting tools

### Phase 6: Testing & Deployment (Week 7-8)

1. **Comprehensive Testing**
   - Unit tests for all models
   - Integration testing
   - User acceptance testing

2. **Deployment**
   - Production migration
   - User training
   - Documentation completion

## Benefits

### Unified Execution Model
- Single system for all work types across disciplines
- Consistent processes with discipline-specific adaptations
- Simplified training and support
- Better resource utilization

### Multi-Discipline Support
- Extensible to new disciplines (Safety, Environmental)
- Shared components reduce development time
- Consistent user experience across disciplines
- Centralized reporting and analytics

### Improved Efficiency
- Automated work generation
- Streamlined workflows
- Mobile field execution
- Reduced paperwork

### Better Decision Making
- Data-driven maintenance strategies
- Cost visibility and control
- Performance metrics
- Failure trend analysis

## Component Refactoring Requirements

### Existing Components to Modify

1. **WorkOrderController**
   - Add discipline context from route defaults
   - Inject discipline-specific services
   - Filter queries by discipline
   - Pass discipline to Inertia views

2. **WorkOrder Model**
   - Add discipline field to fillable array
   - Add discipline scopes (scopeMaintenance, scopeQuality)
   - Add getAllowedCategories() method
   - Add getAllowedSourceTypes() method
   - Add validateForDiscipline() method
   - Update relationships to be discipline-aware

3. **StoreWorkOrderRequest**
   - Add discipline field validation
   - Conditional validation based on discipline
   - Validate category against allowed discipline categories
   - Require asset_id for maintenance, instrument_id for quality calibrations

4. **WorkOrderResource**
   - Include discipline in response
   - Include discipline-specific fields conditionally
   - Format quality-specific dates and fields when present

5. **Database Seeders**
   - Update WorkOrderTypeSeeder to include discipline context
   - Add discipline configuration seeder
   - Update existing seeds to set discipline = 'maintenance'

### New Components to Create

1. **BaseWorkOrderService** (Abstract)
   - Common work order operations
   - Abstract methods for discipline-specific logic
   - Shared validation logic

2. **MaintenanceWorkOrderService**
   - Extends BaseWorkOrderService
   - Maintenance-specific validations
   - Asset relationship handling
   - Routine integration logic

3. **WorkOrderDisciplineConfig Model**
   - Stores discipline-specific configurations
   - Allowed categories and sources per discipline
   - Custom field definitions

4. **DisciplineServiceProvider**
   - Register discipline-specific services
   - Bind services based on route context

### Frontend Component Updates

1. **WorkOrderForm Component**
   - Accept discipline prop
   - Conditionally render category options
   - Show asset selector for maintenance
   - Show instrument selector for quality (future)
   - Adapt source type options by discipline

2. **WorkOrderList Component**
   - Filter by current discipline
   - Show discipline-appropriate columns
   - Update action buttons based on discipline

3. **WorkOrderStatusBadge Component**
   - No changes needed (discipline-agnostic)

4. **WorkOrderCategoryBadge Component**
   - Already updated to handle all categories
   - Add discipline context for better icons (optional)

5. **Navigation Components**
   - Update sidebar to show current discipline context
   - Separate menu sections for maintenance vs quality

## Best Practices

### Work Order Creation
- Use appropriate discipline and category
- Ensure discipline-specific required fields are filled
- Validate against discipline rules
- Use discipline-appropriate source types

### Discipline Management
- Keep discipline-specific logic isolated
- Use service classes for discipline-specific behavior
- Maintain clear separation in UI components
- Document discipline-specific requirements

### Execution Quality
- Follow safety procedures
- Complete all required tasks
- Document thoroughly
- Report anomalies immediately

### Continuous Improvement
- Regular review of work order data
- Update procedures based on findings
- Train on new capabilities
- Monitor system performance 
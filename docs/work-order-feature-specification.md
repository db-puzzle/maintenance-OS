# Work Order Feature Implementation Specification

## Executive Summary

This specification outlines the implementation of a comprehensive Work Order Management System that will become the **unified execution model** for all maintenance activities. By eliminating the separate `FormExecution` system and consolidating everything under work orders, we create a simpler, more powerful CMMS that better reflects the reality that all maintenance activities are fundamentally "work" to be managed.

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Database Schema](#database-schema)
3. [Data Model Integration](#data-model-integration)
4. [Work Order Lifecycle Management](#work-order-lifecycle-management)
5. [API Design](#api-design)
6. [Frontend Implementation](#frontend-implementation)
7. [Integration Points](#integration-points)
8. [Migration Strategy](#migration-strategy)
9. [Security & Permissions](#security-permissions)
10. [Reporting & Analytics](#reporting-analytics)

## System Architecture Overview

### Core Concept

Work Orders will serve as the **single execution system** for all maintenance activities:
- **Preventive Maintenance**: Routines automatically generate work orders
- **Corrective Maintenance**: Manual work orders for repairs
- **Inspections**: Work orders using inspection forms
- **Projects**: Multi-task work orders for larger efforts

### Key Design Decisions

1. **Unified Execution Model**: Eliminate `FormExecution` and `RoutineExecution` - everything flows through work orders
2. **Forms as Templates**: Forms become templates for work order tasks, not standalone executable entities
3. **Direct Task Response Linking**: Task responses link directly to work order executions
4. **Flat Relationship Structure**: Remove parent-child nesting; use simple references for related work
5. **Asset-Centric Design**: All work orders linked to assets

### Architecture Benefits

- **Simplicity**: One execution model to understand and maintain
- **Consistency**: All work follows the same lifecycle and reporting
- **Power**: Work order features (scheduling, costing, etc.) apply to all maintenance
- **Clarity**: Clear mental model - everything is a work order

## Database Schema

### New Tables

#### `work_orders`
```sql
CREATE TABLE work_orders (
    id BIGINT UNSIGNED PRIMARY KEY,
    work_order_number VARCHAR(255) UNIQUE NOT NULL, -- Auto-generated: WO-YYYY-MM-XXXXX
    title VARCHAR(255) NOT NULL,
    description TEXT,
    work_order_type_id BIGINT UNSIGNED NOT NULL,
    work_order_category ENUM('corrective', 'preventive', 'inspection', 'project') NOT NULL,
    priority ENUM('emergency', 'urgent', 'high', 'normal', 'low') DEFAULT 'normal',
    priority_score INTEGER DEFAULT 50, -- 0-100 for fine-grained sorting
    status VARCHAR(50) DEFAULT 'requested',
    
    -- Asset relationship
    asset_id BIGINT UNSIGNED NOT NULL,
    
    -- Form/Task relationship
    form_id BIGINT UNSIGNED NULL, -- Optional: use existing form as template
    form_version_id BIGINT UNSIGNED NULL, -- Locked version for consistency
    custom_tasks JSON NULL, -- For ad-hoc task lists not using forms
    
    -- Planning fields
    estimated_hours DECIMAL(5,2) NULL,
    estimated_parts_cost DECIMAL(10,2) NULL,
    estimated_labor_cost DECIMAL(10,2) NULL,
    estimated_total_cost DECIMAL(10,2) NULL,
    downtime_required BOOLEAN DEFAULT FALSE,
    safety_requirements JSON NULL, -- LOTO, permits, PPE, etc.
    
    -- Scheduling fields
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
    source_type VARCHAR(50) NOT NULL, -- 'manual', 'routine', 'sensor', 'inspection_finding'
    source_id BIGINT UNSIGNED NULL, -- Reference to routine_id, sensor_alert_id, etc.
    
    -- Reference tracking (flat structure, no nesting)
    related_work_order_id BIGINT UNSIGNED NULL, -- For follow-ups or prerequisites
    relationship_type VARCHAR(50) NULL, -- 'follow_up', 'prerequisite', 'related'
    
    -- People tracking
    requested_by BIGINT UNSIGNED NOT NULL,
    approved_by BIGINT UNSIGNED NULL,
    planned_by BIGINT UNSIGNED NULL,
    verified_by BIGINT UNSIGNED NULL,
    closed_by BIGINT UNSIGNED NULL,
    
    -- Dates
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    planned_at TIMESTAMP NULL,
    verified_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    
    -- Additional metadata
    external_reference VARCHAR(255) NULL, -- PO number, ticket ID, etc.
    warranty_claim BOOLEAN DEFAULT FALSE,
    attachments JSON NULL,
    tags JSON NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_type_id) REFERENCES work_order_types(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id),
    FOREIGN KEY (form_id) REFERENCES forms(id),
    FOREIGN KEY (form_version_id) REFERENCES form_versions(id),
    FOREIGN KEY (assigned_team_id) REFERENCES teams(id),
    FOREIGN KEY (assigned_technician_id) REFERENCES users(id),
    FOREIGN KEY (related_work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (planned_by) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id),
    FOREIGN KEY (closed_by) REFERENCES users(id),
    
    INDEX idx_work_order_number (work_order_number),
    INDEX idx_status_priority (status, priority_score),
    INDEX idx_asset_status (asset_id, status),
    INDEX idx_scheduled_dates (scheduled_start_date, scheduled_end_date),
    INDEX idx_source (source_type, source_id),
    INDEX idx_category_status (work_order_category, status)
);
```

#### `work_order_types`
```sql
CREATE TABLE work_order_types (
    id BIGINT UNSIGNED PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- Links to work_order_category enum
    description TEXT,
    color VARCHAR(7) NULL, -- Hex color for UI
    icon VARCHAR(50) NULL, -- Icon identifier
    default_priority VARCHAR(20) DEFAULT 'normal',
    requires_approval BOOLEAN DEFAULT TRUE,
    auto_approve_routine BOOLEAN DEFAULT FALSE, -- Auto-approve if from routine
    sla_hours INTEGER NULL, -- Service level agreement
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_active_types (is_active, category, name)
);
```

#### `work_order_executions`
```sql
CREATE TABLE work_order_executions (
    id BIGINT UNSIGNED PRIMARY KEY,
    work_order_id BIGINT UNSIGNED NOT NULL,
    executed_by BIGINT UNSIGNED NOT NULL,
    status VARCHAR(50) DEFAULT 'assigned',
    
    -- Time tracking
    started_at TIMESTAMP NULL,
    paused_at TIMESTAMP NULL,
    resumed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    total_pause_duration INTEGER DEFAULT 0, -- In minutes
    
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (executed_by) REFERENCES users(id),
    
    INDEX idx_work_order_status (work_order_id, status),
    INDEX idx_executed_by_status (executed_by, status),
    UNIQUE INDEX idx_unique_execution (work_order_id) -- One execution per work order
);
```

#### `work_order_parts`
```sql
CREATE TABLE work_order_parts (
    id BIGINT UNSIGNED PRIMARY KEY,
    work_order_id BIGINT UNSIGNED NOT NULL,
    part_id BIGINT UNSIGNED NULL, -- From inventory system
    part_number VARCHAR(100) NULL,
    part_name VARCHAR(255) NOT NULL,
    
    -- Quantities
    estimated_quantity DECIMAL(10,2) NULL,
    reserved_quantity DECIMAL(10,2) NULL,
    used_quantity DECIMAL(10,2) NULL,
    
    -- Costs
    unit_cost DECIMAL(10,2) NULL,
    total_cost DECIMAL(10,2) NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned', -- planned, reserved, issued, used, returned
    
    -- Tracking
    reserved_at TIMESTAMP NULL,
    reserved_by BIGINT UNSIGNED NULL,
    issued_at TIMESTAMP NULL,
    issued_by BIGINT UNSIGNED NULL,
    used_at TIMESTAMP NULL,
    used_by BIGINT UNSIGNED NULL,
    
    notes TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (part_id) REFERENCES inventory_parts(id),
    FOREIGN KEY (reserved_by) REFERENCES users(id),
    FOREIGN KEY (issued_by) REFERENCES users(id),
    FOREIGN KEY (used_by) REFERENCES users(id),
    
    INDEX idx_work_order_parts (work_order_id, status)
);
```

#### `work_order_failure_analysis`
```sql
CREATE TABLE work_order_failure_analysis (
    id BIGINT UNSIGNED PRIMARY KEY,
    work_order_id BIGINT UNSIGNED NOT NULL,
    
    -- Failure classification
    failure_mode_id BIGINT UNSIGNED NULL,
    failure_mode_other VARCHAR(255) NULL,
    
    root_cause_id BIGINT UNSIGNED NULL,
    root_cause_other VARCHAR(255) NULL,
    
    immediate_cause_id BIGINT UNSIGNED NULL,
    immediate_cause_other VARCHAR(255) NULL,
    
    -- Impact
    failure_effect ENUM('none', 'minor', 'moderate', 'major', 'critical') DEFAULT 'moderate',
    downtime_minutes INTEGER NULL,
    production_loss_units INTEGER NULL,
    safety_incident BOOLEAN DEFAULT FALSE,
    environmental_incident BOOLEAN DEFAULT FALSE,
    
    -- Analysis
    failure_description TEXT NULL,
    corrective_actions TEXT NULL,
    preventive_recommendations TEXT NULL,
    
    analyzed_by BIGINT UNSIGNED NOT NULL,
    analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (failure_mode_id) REFERENCES failure_modes(id),
    FOREIGN KEY (root_cause_id) REFERENCES root_causes(id),
    FOREIGN KEY (immediate_cause_id) REFERENCES immediate_causes(id),
    FOREIGN KEY (analyzed_by) REFERENCES users(id),
    
    UNIQUE INDEX idx_work_order_failure (work_order_id)
);
```

#### `work_order_status_history`
```sql
CREATE TABLE work_order_status_history (
    id BIGINT UNSIGNED PRIMARY KEY,
    work_order_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(50) NULL,
    to_status VARCHAR(50) NOT NULL,
    changed_by BIGINT UNSIGNED NOT NULL,
    reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (changed_by) REFERENCES users(id),
    
    INDEX idx_work_order_history (work_order_id, created_at)
);
```

### Modified Tables

#### Update `task_responses` table
```sql
ALTER TABLE task_responses 
ADD COLUMN work_order_execution_id BIGINT UNSIGNED NULL AFTER form_execution_id,
ADD FOREIGN KEY (work_order_execution_id) REFERENCES work_order_executions(id),
ADD INDEX idx_work_order_execution (work_order_execution_id);

-- Migration will populate this field and eventually drop form_execution_id
```

#### Remove `routine_executions` table
```sql
-- This table will be dropped after migration
-- All data will be migrated to work_orders
```

#### Remove `form_executions` table
```sql
-- This table will be dropped after migration
-- All data will be migrated to work_order_executions
```

## Data Model Integration

### Model Relationships

#### WorkOrder Model
```php
class WorkOrder extends Model
{
    // Relationships
    public function asset() { return $this->belongsTo(Asset::class); }
    public function type() { return $this->belongsTo(WorkOrderType::class); }
    public function form() { return $this->belongsTo(Form::class); }
    public function formVersion() { return $this->belongsTo(FormVersion::class); }
    public function execution() { return $this->hasOne(WorkOrderExecution::class); }
    public function parts() { return $this->hasMany(WorkOrderPart::class); }
    public function failureAnalysis() { return $this->hasOne(WorkOrderFailureAnalysis::class); }
    public function statusHistory() { return $this->hasMany(WorkOrderStatusHistory::class); }
    
    // Flat relationship structure
    public function relatedWorkOrders() { 
        return $this->hasMany(WorkOrder::class, 'related_work_order_id'); 
    }
    public function relatedTo() { 
        return $this->belongsTo(WorkOrder::class, 'related_work_order_id'); 
    }
    
    // Source relationships
    public function routine() {
        return $this->belongsTo(Routine::class, 'source_id')
            ->where('source_type', 'routine');
    }
    
    // User relationships
    public function requestedBy() { return $this->belongsTo(User::class, 'requested_by'); }
    public function approvedBy() { return $this->belongsTo(User::class, 'approved_by'); }
    public function assignedTechnician() { return $this->belongsTo(User::class, 'assigned_technician_id'); }
    
    // Type helpers
    public function isPreventive() { return $this->work_order_category === 'preventive'; }
    public function isCorrective() { return $this->work_order_category === 'corrective'; }
    public function isFromRoutine() { return $this->source_type === 'routine'; }
    
    // Scopes
    public function scopeOpen($query) { return $query->whereNotIn('status', ['closed', 'cancelled']); }
    public function scopeOverdue($query) { return $query->where('requested_due_date', '<', now())->open(); }
    public function scopeForAsset($query, $assetId) { return $query->where('asset_id', $assetId); }
    public function scopePreventive($query) { return $query->where('work_order_category', 'preventive'); }
    public function scopeCorrective($query) { return $query->where('work_order_category', 'corrective'); }
}
```

#### WorkOrderExecution Model
```php
class WorkOrderExecution extends Model
{
    // Direct relationship to task responses
    public function taskResponses() {
        return $this->hasMany(TaskResponse::class);
    }
    
    public function workOrder() {
        return $this->belongsTo(WorkOrder::class);
    }
    
    public function executedBy() {
        return $this->belongsTo(User::class, 'executed_by');
    }
    
    // Calculate actual duration
    public function getActualDurationAttribute() {
        if (!$this->started_at || !$this->completed_at) {
            return null;
        }
        
        $minutes = $this->started_at->diffInMinutes($this->completed_at);
        return $minutes - $this->total_pause_duration;
    }
}
```

### Integration with Existing Models

#### Asset Model Updates
```php
// Add to Asset model
public function workOrders() { return $this->hasMany(WorkOrder::class); }
public function openWorkOrders() { return $this->workOrders()->open(); }
public function preventiveWorkOrders() { return $this->workOrders()->preventive(); }
public function correctiveWorkOrders() { return $this->workOrders()->corrective(); }

// Calculate next maintenance due
public function getNextMaintenanceDue() {
    // Check active routines and their last completed work orders
    $nextDue = $this->routines()
        ->active()
        ->get()
        ->map(function ($routine) {
            $lastCompleted = $routine->workOrders()
                ->whereIn('status', ['completed', 'verified', 'closed'])
                ->latest('completed_at')
                ->first();
                
            if (!$lastCompleted) {
                return [
                    'routine' => $routine,
                    'due_at' => now(),
                    'hours_until_due' => 0
                ];
            }
            
            $hoursSince = $lastCompleted->completed_at->diffInHours(now());
            $hoursUntilDue = $routine->trigger_hours - $hoursSince;
            
            return [
                'routine' => $routine,
                'due_at' => now()->addHours($hoursUntilDue),
                'hours_until_due' => $hoursUntilDue
            ];
        })
        ->sortBy('hours_until_due')
        ->first();
        
    return $nextDue;
}
```

#### Routine Model Updates
```php
// Update Routine model
public function workOrders() {
    return $this->hasMany(WorkOrder::class, 'source_id')
        ->where('source_type', 'routine');
}

public function generateWorkOrder($dueDate = null) {
    $workOrderType = WorkOrderType::where('code', 'preventive_routine')->first();
    
    return WorkOrder::create([
        'work_order_number' => WorkOrder::generateNumber(),
        'title' => $this->name,
        'description' => $this->description,
        'work_order_type_id' => $workOrderType->id,
        'work_order_category' => 'preventive',
        'asset_id' => $this->asset_id,
        'form_id' => $this->form_id,
        'form_version_id' => $this->active_form_version_id ?? $this->form->current_version_id,
        'source_type' => 'routine',
        'source_id' => $this->id,
        'requested_due_date' => $dueDate ?? now()->addHours($this->trigger_hours),
        'requested_by' => 1, // System user
        'status' => $workOrderType->auto_approve_routine ? 'approved' : 'requested',
        'approved_by' => $workOrderType->auto_approve_routine ? 1 : null,
        'approved_at' => $workOrderType->auto_approve_routine ? now() : null,
    ]);
}

// Remove routineExecutions relationship - no longer needed
```

#### Form Model Updates
```php
// Forms are now just templates for work orders
public function workOrders() {
    return $this->hasMany(WorkOrder::class);
}

// Remove execution-related methods
// Remove formExecutions relationship
```

## Work Order Lifecycle Management

### Status Flow

```
[Requested] → [Approved] → [Planned] → [Ready to Schedule] → [Scheduled] → [In Progress] → [Completed] → [Verified] → [Closed]
                ↓              ↓              ↓                    ↓              ↓               ↓
            [Rejected]    [On Hold]      [On Hold]           [On Hold]      [On Hold]      [Reopened]
```

### Status Transition Rules

1. **Requested → Approved**: Requires approval permission (auto for routine-generated)
2. **Approved → Planned**: Requires planner permission
3. **Planned → Ready to Schedule**: Automatic when all prerequisites met
4. **Ready to Schedule → Scheduled**: Requires scheduler permission
5. **Scheduled → In Progress**: Technician starts work
6. **In Progress → Completed**: Technician completes all tasks
7. **Completed → Verified**: Supervisor verifies work quality
8. **Verified → Closed**: System closes with all documentation

### Automated Work Order Generation

```php
// App/Services/WorkOrderScheduler.php
class WorkOrderScheduler
{
    public function generateUpcomingWorkOrders($daysAhead = 7)
    {
        $routines = Routine::where('status', 'Active')
            ->with(['asset.latestRuntimeMeasurement'])
            ->get();
            
        foreach ($routines as $routine) {
            $nextDue = $this->calculateNextDueDate($routine);
            
            if ($nextDue->lessThanOrEqualTo(now()->addDays($daysAhead))) {
                // Check if work order already exists
                $exists = $routine->workOrders()
                    ->whereIn('status', ['requested', 'approved', 'planned', 'scheduled'])
                    ->exists();
                    
                if (!$exists) {
                    $routine->generateWorkOrder($nextDue);
                }
            }
        }
    }
    
    private function calculateNextDueDate($routine)
    {
        // Get last completed work order for this routine
        $lastCompleted = $routine->workOrders()
            ->whereIn('status', ['completed', 'verified', 'closed'])
            ->latest('actual_end_date')
            ->first();
            
        if (!$lastCompleted) {
            // First time - use current runtime
            $currentHours = $routine->asset->current_runtime_hours ?? 0;
            $hoursUntilDue = max(0, $routine->trigger_hours - $currentHours);
            return now()->addHours($hoursUntilDue);
        }
        
        // Calculate based on last completion
        return $lastCompleted->actual_end_date->addHours($routine->trigger_hours);
    }
}
```

## API Design

### RESTful Endpoints

#### Work Order Management
```
GET    /api/work-orders                 # List with filters
POST   /api/work-orders                 # Create new
GET    /api/work-orders/{id}            # Get details
PUT    /api/work-orders/{id}            # Update
DELETE /api/work-orders/{id}            # Cancel

POST   /api/work-orders/{id}/approve    # Approve request
POST   /api/work-orders/{id}/plan       # Add planning details
POST   /api/work-orders/{id}/schedule   # Schedule work
POST   /api/work-orders/{id}/assign     # Assign technician
POST   /api/work-orders/{id}/start      # Start execution
POST   /api/work-orders/{id}/complete   # Mark complete
POST   /api/work-orders/{id}/verify     # Verify completion
POST   /api/work-orders/{id}/close      # Close work order
POST   /api/work-orders/{id}/hold       # Put on hold
POST   /api/work-orders/{id}/resume     # Resume from hold

GET    /api/work-orders/{id}/history    # Status history
GET    /api/work-orders/{id}/tasks      # Get task list (from form or custom)
POST   /api/work-orders/{id}/parts      # Add/update parts
POST   /api/work-orders/{id}/failure    # Add failure analysis
POST   /api/work-orders/{id}/follow-up  # Create follow-up work order
```

#### Task Execution API
```
GET    /api/work-orders/{id}/execution           # Get execution details
POST   /api/work-orders/{id}/execution/start     # Start execution
POST   /api/work-orders/{id}/execution/pause     # Pause execution
POST   /api/work-orders/{id}/execution/resume    # Resume execution
POST   /api/work-orders/{id}/execution/complete  # Complete execution

GET    /api/work-orders/{id}/execution/tasks     # Get task list with responses
POST   /api/work-orders/{id}/execution/tasks/{taskId}/response  # Submit task response
PUT    /api/work-orders/{id}/execution/tasks/{taskId}/response  # Update task response
```

### Request/Response Examples

#### Create Preventive Work Order (from Routine)
```json
// POST /api/routines/{id}/generate-work-order
{
  "due_date": "2024-01-20T16:00:00Z", // Optional, defaults to calculated
  "notes": "Early generation due to planned shutdown"
}

// Response
{
  "id": 1234,
  "work_order_number": "WO-2024-01-00123",
  "title": "PM - Pump P-101 Inspection",
  "work_order_category": "preventive",
  "source_type": "routine",
  "source_id": 45,
  "status": "approved", // Auto-approved
  "form_id": 12,
  "form_version_id": 23,
  "asset": {
    "id": 123,
    "tag": "P-101",
    "description": "Feed Water Pump"
  }
}
```

#### Create Corrective Work Order
```json
// POST /api/work-orders
{
  "title": "Replace worn bearing on Pump P-101",
  "description": "Abnormal vibration detected during routine inspection",
  "work_order_type_id": 2, // Corrective - Mechanical
  "work_order_category": "corrective",
  "priority": "high",
  "asset_id": 123,
  "requested_due_date": "2024-01-20T16:00:00Z",
  "related_work_order_id": 1233, // The inspection that found this issue
  "relationship_type": "follow_up",
  "estimated_hours": 4.5,
  "downtime_required": true,
  "safety_requirements": {
    "loto_required": true,
    "permits": ["hot_work"],
    "ppe": ["hard_hat", "safety_glasses", "steel_toe_boots"]
  },
  "custom_tasks": [
    {
      "position": 1,
      "type": "checklist",
      "description": "Verify bearing specifications match replacement"
    },
    {
      "position": 2,
      "type": "measurement",
      "description": "Record vibration levels before repair",
      "configuration": {
        "unit": "mm/s",
        "min_value": 0,
        "max_value": 50
      }
    }
  ]
}
```

## Frontend Implementation

### Key Views

1. **Unified Work Order Dashboard**
   - Summary by category (preventive, corrective, inspection)
   - Overdue work orders
   - Today's schedule
   - Asset health indicators
   - Workload by technician

2. **Work Order List/Grid**
   - Filter by category, status, priority, asset, date range
   - Quick category toggle (All/Preventive/Corrective/Inspection)
   - Bulk operations
   - Export functionality
   - Custom saved views

3. **Work Order Execution View**
   - Header with work order info and timer
   - Task list from form or custom tasks
   - Direct task response submission
   - Photo/file attachments
   - Real-time save
   - Pause/resume functionality

4. **Routine Management View**
   - List of routines with next due dates
   - Generate work order button
   - View generated work order history
   - Runtime-based scheduling visualization

### Vue.js Component Structure

```
components/
  work-orders/
    WorkOrderDashboard.vue
    WorkOrderList.vue
    WorkOrderDetail.vue
    WorkOrderForm.vue
    WorkOrderScheduler.vue
    
    execution/
      WorkOrderExecution.vue
      TaskResponseForm.vue
      ExecutionTimer.vue
      ExecutionSummary.vue
    
    components/
      WorkOrderStatusBadge.vue
      WorkOrderCategoryBadge.vue
      WorkOrderPriorityIndicator.vue
      WorkOrderTimeline.vue
      WorkOrderRelated.vue
      
  routines/
    RoutineList.vue
    RoutineDetail.vue
    RoutineWorkOrderHistory.vue
    GenerateWorkOrderButton.vue
```

## Migration Strategy

### Phase 1: Database Setup (Week 1)
1. Create all new work order tables
2. Add work_order_execution_id to task_responses
3. Create work order types seed data
4. Create system user for automated actions

### Phase 2: Data Migration (Week 2)
```php
// Migration to convert all existing executions to work orders
class MigrateToUnifiedWorkOrders extends Migration
{
    public function up()
    {
        // Step 1: Migrate routine executions to work orders
        $this->migrateRoutineExecutions();
        
        // Step 2: Migrate standalone form executions
        $this->migrateStandaloneFormExecutions();
        
        // Step 3: Update task responses
        $this->updateTaskResponses();
        
        // Step 4: Drop old tables
        Schema::dropIfExists('routine_executions');
        Schema::dropIfExists('form_executions');
    }
    
    private function migrateRoutineExecutions()
    {
        DB::table('routine_executions as re')
            ->join('routines as r', 're.routine_id', '=', 'r.id')
            ->join('form_executions as fe', 're.form_execution_id', '=', 'fe.id')
            ->orderBy('re.created_at')
            ->chunk(100, function ($executions) {
                foreach ($executions as $execution) {
                    // Create work order
                    $workOrderId = DB::table('work_orders')->insertGetId([
                        'work_order_number' => $this->generateNumber(),
                        'title' => $execution->routine_name,
                        'work_order_type_id' => $this->getPreventiveTypeId(),
                        'work_order_category' => 'preventive',
                        'status' => $this->mapStatus($execution->status),
                        'asset_id' => $execution->asset_id,
                        'form_id' => $execution->form_id,
                        'form_version_id' => $execution->form_version_id,
                        'source_type' => 'routine',
                        'source_id' => $execution->routine_id,
                        'requested_by' => $execution->executed_by,
                        'requested_at' => $execution->created_at,
                        'actual_start_date' => $execution->started_at,
                        'actual_end_date' => $execution->completed_at,
                        'created_at' => $execution->created_at,
                        'updated_at' => $execution->updated_at,
                    ]);
                    
                    // Create work order execution
                    $woExecutionId = DB::table('work_order_executions')->insertGetId([
                        'work_order_id' => $workOrderId,
                        'executed_by' => $execution->executed_by,
                        'status' => $execution->fe_status === 'completed' ? 'completed' : 'in_progress',
                        'started_at' => $execution->fe_started_at,
                        'completed_at' => $execution->fe_completed_at,
                        'notes' => $execution->notes,
                        'created_at' => $execution->fe_created_at,
                        'updated_at' => $execution->fe_updated_at,
                    ]);
                    
                    // Map form_execution_id to work_order_execution_id for later
                    $this->executionMap[$execution->form_execution_id] = $woExecutionId;
                }
            });
    }
}
```

### Phase 3: Code Updates (Week 3-4)
1. Update Routine model to generate work orders
2. Update controllers to use work order execution
3. Remove FormExecution controllers and services
4. Update API endpoints
5. Implement work order scheduler service

### Phase 4: Frontend Updates (Week 5-6)
1. Create unified work order views
2. Update routine views to show work order generation
3. Migrate execution views to work order execution
4. Update dashboards and reports

### Phase 5: Testing & Deployment (Week 7-8)
1. Comprehensive testing of migration
2. Performance optimization
3. User training on new unified model
4. Phased rollout with monitoring

## Security & Permissions

### Work Order Permissions
```php
// Unified permissions for all work types
'work-orders.view'          // View work order list and details
'work-orders.create'        // Create new work orders
'work-orders.edit'          // Edit work order details
'work-orders.delete'        // Delete/cancel work orders
'work-orders.approve'       // Approve work requests
'work-orders.plan'          // Add planning details
'work-orders.schedule'      // Schedule work orders
'work-orders.assign'        // Assign technicians
'work-orders.execute'       // Start/complete work
'work-orders.verify'        // Verify completed work
'work-orders.close'         // Close work orders
'work-orders.view-costs'    // View cost information
'work-orders.export'        // Export work order data

// Routine-specific permissions
'routines.manage'           // Create/edit/delete routines
'routines.generate-wo'      // Generate work orders from routines
```

## Reporting & Analytics

### Unified Metrics

With everything flowing through work orders, reporting becomes much simpler:

1. **Overall Maintenance KPIs**
   - Total work orders by category
   - PM vs CM ratio (preventive vs corrective)
   - Completion rates by category
   - Average time to complete by type
   - Cost analysis across all work

2. **Asset Performance**
   - Work order frequency by asset
   - MTBF/MTTR calculations
   - Cost per asset
   - Reliability trends

3. **Resource Utilization**
   - Technician workload (all work types)
   - Time spent by category
   - Productivity metrics

4. **Compliance & Schedule**
   - PM compliance rate
   - Overdue preventive work
   - Schedule adherence

### Example Dashboard Query
```php
// Simple query for all maintenance metrics
$metrics = WorkOrder::query()
    ->select(
        'work_order_category',
        DB::raw('COUNT(*) as total'),
        DB::raw('AVG(actual_hours) as avg_hours'),
        DB::raw('SUM(actual_total_cost) as total_cost'),
        DB::raw('COUNT(CASE WHEN status = "completed" THEN 1 END) as completed')
    )
    ->whereBetween('created_at', [$startDate, $endDate])
    ->groupBy('work_order_category')
    ->get();
```

## Conclusion

This unified work order architecture provides:

1. **Simplicity**: One execution model for all maintenance work
2. **Power**: Full work order features for all activities  
3. **Clarity**: Clear data model and user experience
4. **Efficiency**: Reduced code complexity and maintenance
5. **Scalability**: Easy to add new work types and features

By eliminating the FormExecution layer and consolidating around work orders, we create a more intuitive and powerful CMMS that better serves maintenance teams.
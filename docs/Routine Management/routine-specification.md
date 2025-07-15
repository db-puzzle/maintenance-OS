# Routine Execution Mode Specification

## Overview

This document specifies the behavior for Routines in the maintenance management system, including execution modes (**Automatic** and **Manual**) and trigger types (**Runtime Hours** and **Calendar Days**). This specification has been updated to align with the Work Order Management System specifications.

## Key Updates from Work Order Specifications

### 1. Field Name Changes
- `trigger_hours` → `trigger_runtime_hours` (for runtime-based triggers)
- Added `trigger_calendar_days` (for calendar-based triggers)
- Added `trigger_type` enum field ('runtime_hours' or 'calendar_days')

### 2. Permission Requirements
- `auto_approve_work_orders` now requires 'work-orders.approve' permission to enable
- System validates permission when saving routine configuration
- Auto-approval during generation verifies approver still has permission

### 3. Work Order Generation Rules
- Only generates if no open work order exists (any status except 'verified' or 'closed')
- Prevents duplicate work orders from the same routine
- Clear separation between runtime and calendar trigger calculations

### 4. Integration Enhancements
- Direct integration with Work Order model
- Support for discipline-aware work order creation
- Proper source tracking for routine-generated work orders

## Routine Execution Modes

### Automatic Execution Mode

In Automatic execution mode, the system continuously monitors asset runtime and automatically generates Work Orders when maintenance is due.

**Key Characteristics:**
- Work Orders are generated automatically based on runtime triggers
- Generation occurs when the asset reaches the specified runtime hours minus the advance generation hours
- No user intervention required for Work Order creation
- Follows a predictable, system-driven maintenance schedule

**Process Flow:**
1. System monitors asset runtime continuously
2. System tracks the runtime hours at the time of last routine execution completion
3. When `(current_runtime - last_execution_runtime) >= (trigger_hours - advance_generation_days)`, the system checks if a Work Order should be generated
4. If no active Work Order exists for the routine, a new one is created automatically
5. Work Order status depends on the `auto_approve_work_orders` setting:
   - If true: Work Order is created with "Approved" status
   - If false: Work Order is created with "Requested" status, requiring manual approval

### Manual Execution Mode

In Manual execution mode, users have full control over when Work Orders are created from Routines.

**Key Characteristics:**
- Work Orders are only created through explicit user action
- System provides visibility into upcoming maintenance needs but doesn't act automatically
- Allows for flexible scheduling based on operational constraints
- Suitable for non-critical equipment or maintenance that can be deferred

**Process Flow:**
1. System calculates and displays when maintenance is due
2. Users review upcoming maintenance requirements
3. Users manually create Work Orders from Routines when appropriate
4. Created Work Orders follow the same approval process as automatic mode

## Data Model Changes

### Routine Model Updates

The `routines` table will be modified to support both runtime hours and calendar days triggers:

```sql
-- Replace 'status' column with 'execution_mode'
ALTER TABLE routines 
DROP COLUMN status,
ADD COLUMN execution_mode ENUM('automatic', 'manual') DEFAULT 'automatic' AFTER trigger_type;

-- Add trigger type support
ALTER TABLE routines
ADD COLUMN trigger_type ENUM('runtime_hours', 'calendar_days') NOT NULL DEFAULT 'runtime_hours' AFTER name,
MODIFY COLUMN trigger_hours INT NULL COMMENT 'Renamed to trigger_runtime_hours',
ADD COLUMN trigger_runtime_hours INT NULL AFTER trigger_type,
ADD COLUMN trigger_calendar_days INT NULL AFTER trigger_runtime_hours;

-- Migrate existing trigger_hours to trigger_runtime_hours
UPDATE routines SET trigger_runtime_hours = trigger_hours WHERE trigger_hours IS NOT NULL;
ALTER TABLE routines DROP COLUMN trigger_hours;

-- Add tracking for last execution
ALTER TABLE routines
ADD COLUMN last_execution_runtime_hours DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN last_execution_completed_at TIMESTAMP NULL DEFAULT NULL;

-- Add advance generation and auto-approval settings
ALTER TABLE routines
ADD COLUMN advance_generation_days INT DEFAULT 24 COMMENT 'Hours before due to generate WO',
ADD COLUMN auto_approve_work_orders BOOLEAN DEFAULT FALSE COMMENT 'Auto-approve generated WOs';

-- Add indexes for efficient queries
CREATE INDEX idx_routines_execution_mode ON routines(execution_mode);
CREATE INDEX idx_routines_trigger_type ON routines(trigger_type);
CREATE INDEX idx_routines_last_execution ON routines(last_execution_completed_at);
```

### Model Attributes

```php
class Routine extends Model
{
    protected $fillable = [
        'asset_id',
        'name',
        'trigger_type',                  // 'runtime_hours' or 'calendar_days'
        'trigger_runtime_hours',         // Hours between executions (runtime-based)
        'trigger_calendar_days',         // Days between executions (calendar-based)
        'execution_mode',                // 'automatic' or 'manual'
        'description',
        'form_id',
        'active_form_version_id',
        'advance_generation_days',      // Generate WO this many hours before due
        'auto_approve_work_orders',      // Auto-approve generated WOs (requires permission)
        'last_execution_runtime_hours',  // Runtime at last completion
        'last_execution_completed_at',   // Timestamp of last completion
        'priority_score'                 // Priority score (0-100)
    ];
    
    protected $casts = [
        'trigger_runtime_hours' => 'integer',
        'trigger_calendar_days' => 'integer',
        'advance_generation_days' => 'integer',
        'auto_approve_work_orders' => 'boolean',
        'last_execution_runtime_hours' => 'decimal:2',
        'last_execution_completed_at' => 'datetime',
        'priority_score' => 'integer',
    ];
}
```

## Routine-Work Order Relationship

### Work Order Generation

Work Orders created from Routines maintain a strong relationship through:

1. **Source Tracking**
   - `source_type`: Set to 'routine'
   - `source_id`: References the Routine ID
   - Enables traceability and reporting

2. **Form Inheritance**
   - Work Order inherits the Routine's form configuration
   - Uses the Routine's `active_form_version_id` if set
   - Falls back to the Form's current version if not specified

3. **Configuration Inheritance**
   - Priority: Determined by Routine's `priority_score` (0-100)
   - Title: Uses Routine name
   - Description: Uses Routine description
   - Asset: Links to the same asset as the Routine

### Work Order Lifecycle

1. **Creation**
   - Automatic mode: System-generated based on runtime
   - Manual mode: User-initiated action
   - Both modes create identical Work Orders

2. **Approval**
   - Follows Work Order Type approval requirements
   - Can be auto-approved if configured in both Routine and Work Order Type

3. **Execution**
   - Work Order execution creates task responses linked to form tasks
   - Completion updates asset runtime measurements
   - Updates routine's last execution tracking:
     - `last_execution_runtime_hours` = asset's current runtime at completion
     - `last_execution_completed_at` = work order completion timestamp
     - `last_execution_form_version_id` = form version used in execution
   - Triggers next cycle calculation based on new baseline
   - Preserves historical context of what procedure was followed

## Routine-Form Integration

### Form Lifecycle with Routines

1. **Form Creation**
   - Each Routine automatically creates an associated Form
   - Form name: `{Routine Name} - Form`
   - Forms are routine-specific and not shared

2. **Version Management**
   - Routines can pin a specific form version (`active_form_version_id`)
   - If not pinned, uses the Form's current published version
   - Ensures consistency in maintenance procedures

3. **Task Execution**
   - Work Orders reference both form and version
   - Execution captures responses for each form task
   - Maintains complete audit trail
   - Form version is locked at work order creation to ensure consistency

4. **Historical Form Version Tracking**
   - Each routine tracks the form version used in its last execution
   - Enables comparison between different execution cycles
   - Provides audit trail for procedure changes
   - Supports compliance and quality assurance requirements

### Form Task Types in Routines

Routines support all standard form task types:
- **Question**: Text-based responses
- **Multiple Choice**: Single selection from options
- **Multiple Select**: Multiple selections allowed
- **Measurement**: Numeric values with units
- **Photo**: Image capture requirements
- **Code Reader**: Barcode/QR code scanning
- **File Upload**: Document attachments

## Trigger Calculation Logic

### Key Principles

Routines support two trigger types:
1. **Runtime Hours**: Based on equipment operating hours since last execution
2. **Calendar Days**: Based on calendar days elapsed since last execution

### Calculation Formulas

#### Runtime Hours Trigger
```
Next Due = Last Execution Runtime + Trigger Runtime Hours
Should Generate = (Current Runtime - Last Execution Runtime) >= (Trigger Runtime Hours - Advance Generation Hours)
```

#### Calendar Days Trigger
```
Next Due = Last Execution Date + Trigger Calendar Days
Should Generate = Days Until Due <= (Advance Generation Hours / 24)
```

### Examples

#### Runtime Hours Examples

1. **First Execution**
   - Routine created with trigger_runtime_hours = 500
   - Asset current runtime = 450 hours
   - No last execution recorded
   - Next due at: 500 hours (absolute)

2. **Subsequent Executions**
   - Last execution completed at runtime = 520 hours
   - Trigger runtime hours = 500
   - Current runtime = 1,010 hours
   - Runtime since last = 1,010 - 520 = 490 hours
   - Next due when runtime reaches: 520 + 500 = 1,020 hours

3. **With Advance Generation**
   - Last execution runtime = 1,000 hours
   - Trigger runtime hours = 500
   - Advance generation = 50 hours
   - Work order generates when: (current - 1,000) >= (500 - 50) = 450 hours
   - So at runtime 1,450 hours, system creates work order due at 1,500 hours

#### Calendar Days Examples

1. **Monthly Inspection**
   - Last execution: January 1, 2024
   - Trigger calendar days = 30
   - Advance generation = 48 hours (2 days)
   - Next due: January 31, 2024
   - Work order generates on: January 29, 2024

2. **Annual Certification**
   - Last execution: March 15, 2023
   - Trigger calendar days = 365
   - Advance generation = 168 hours (7 days)
   - Next due: March 15, 2024
   - Work order generates on: March 8, 2024

## System Behavior

### Automatic Execution Mode Behavior

```php
// Scheduled job runs periodically
class GenerateWorkOrdersFromRoutines
{
    public function handle()
    {
        $routines = Routine::where('execution_mode', 'automatic')
            ->where('is_active', true)
            ->with(['asset.latestRuntimeMeasurement'])
            ->get();
            
        foreach ($routines as $routine) {
            if ($routine->shouldGenerateWorkOrder()) {
                $workOrder = $routine->generateWorkOrder();
                
                // Apply auto-approval if configured and user has permission
                if ($routine->auto_approve_work_orders) {
                    $approver = User::find($routine->created_by);
                    
                    if ($approver && $approver->can('work-orders.approve')) {
                        $workOrder->status = 'approved';
                        $workOrder->approved_at = now();
                        $workOrder->approved_by = $approver->id;
                        $workOrder->save();
                        
                        $workOrder->recordStatusChange('requested', 'approved', $approver->id, 'Auto-approved by routine configuration');
                    } else {
                        Log::warning("Auto-approval failed for routine {$routine->id}: Approver lacks permission");
                    }
                }
            }
        }
    }
}

// In Routine model
class Routine extends Model
{
    public function shouldGenerateWorkOrder(): bool
    {
        // Check if no open work order exists (any status except verified/closed)
        if ($this->hasOpenWorkOrder()) {
            return false;
        }
        
        $hoursUntilDue = $this->calculateHoursUntilDue();
        
        return $hoursUntilDue !== null 
            && $hoursUntilDue <= ($this->advance_generation_days ?? 24) 
            && $hoursUntilDue > 0;
    }
    
    public function hasOpenWorkOrder(): bool
    {
        return WorkOrder::where('source_type', 'routine')
            ->where('source_id', $this->id)
            ->whereNotIn('status', ['verified', 'closed'])
            ->exists();
    }
    
    public function calculateHoursUntilDue(): ?float
    {
        if ($this->trigger_type === 'runtime_hours') {
            return $this->calculateRuntimeHoursUntilDue();
        } else {
            return $this->calculateCalendarHoursUntilDue();
        }
    }
    
    private function calculateRuntimeHoursUntilDue(): ?float
    {
        if (!$this->last_execution_runtime_hours || !$this->trigger_runtime_hours) {
            return 0; // Due immediately if never executed
        }
        
        $currentRuntime = $this->asset->current_runtime_hours ?? 0;
        $runtimeSinceLastExecution = $currentRuntime - $this->last_execution_runtime_hours;
        $hoursRemaining = $this->trigger_runtime_hours - $runtimeSinceLastExecution;
        
        // Estimate hours until due based on average runtime per day
        $avgRuntimePerDay = $this->asset->average_runtime_per_day ?? 8;
        return max(0, ($hoursRemaining / $avgRuntimePerDay) * 24);
    }
    
    private function calculateCalendarHoursUntilDue(): ?float
    {
        if (!$this->last_execution_completed_at || !$this->trigger_calendar_days) {
            return 0; // Due immediately if never executed
        }
        
        $nextDueDate = $this->last_execution_completed_at->addDays($this->trigger_calendar_days);
        $hoursUntilDue = now()->diffInHours($nextDueDate, false);
        
        return max(0, $hoursUntilDue);
    }
}

// Work Order completion updates routine tracking
class WorkOrderExecutionObserver
{
    public function completed(WorkOrderExecution $execution)
    {
        $workOrder = $execution->workOrder;
        
        // If this work order came from a routine
        if ($workOrder->source_type === 'routine' && $workOrder->source_id) {
            $routine = Routine::find($workOrder->source_id);
            
            if ($routine) {
                // Record the asset runtime at completion time
                $routine->update([
                    'last_execution_runtime_hours' => $workOrder->asset->current_runtime_hours,
                    'last_execution_completed_at' => now()
                ]);
            }
        }
    }
}
```

### Manual Execution Mode Behavior

```php
// User-initiated action
class RoutineController
{
    public function createWorkOrder(Routine $routine)
    {
        // Validate routine is in manual execution mode
        if ($routine->execution_mode !== 'manual') {
            throw new Exception('Work orders are generated automatically for this routine');
        }
        
        // Check for existing active work order
        if ($routine->hasActiveWorkOrder()) {
            throw new Exception('An active work order already exists for this routine');
        }
        
        // Create work order
        $workOrder = $routine->generateWorkOrder();
        
        return response()->json([
            'work_order' => $workOrder,
            'message' => 'Work order created successfully'
        ]);
    }
}
```

## User Interface Changes

### Routine List View (AssetRoutinesTab)

The routine list will be enhanced to clearly display and manage the mode:

1. **Execution Mode Indicator Column**
   ```tsx
   {
       key: 'execution_mode',
       label: 'Modo de Execução',
       sortable: true,
       width: 'w-[150px]',
       render: (value) => {
           const executionMode = value as 'automatic' | 'manual';
           return (
               <div className="flex items-center gap-2">
                   {executionMode === 'automatic' ? (
                       <>
                           <Clock className="h-4 w-4 text-primary" />
                           <span className="text-sm font-medium">Automático</span>
                       </>
                   ) : (
                       <>
                           <Hand className="h-4 w-4 text-muted-foreground" />
                           <span className="text-sm font-medium">Manual</span>
                       </>
                   )}
               </div>
           );
       },
   }
   ```

2. **Next Due Information**
   - Add runtime remaining until next maintenance
   - Show visual indicator when approaching due date
   - For manual mode, highlight when action is needed

3. **Last Execution Information**
   ```tsx
   {
       key: 'last_execution',
       label: 'Última Execução',
       sortable: true,
       width: 'w-[200px]',
       render: (value, row) => {
           const routine = row as Routine;
           if (!routine.last_execution_completed_at) {
               return <span className="text-muted-foreground text-sm">Nunca executada</span>;
           }
           
           return (
               <div className="space-y-1">
                   <div className="text-sm">
                       {format(routine.last_execution_completed_at, 'dd/MM/yyyy HH:mm')}
                   </div>
                   {routine.last_execution_form_version_id && (
                       <div className="text-xs text-muted-foreground">
                           Versão: {routine.lastExecutionFormVersion?.version_number || 'N/A'}
                       </div>
                   )}
               </div>
           );
       },
   }
   ```

4. **Action Buttons Enhancement**
   - For manual execution mode routines that are due:
     ```tsx
     <Button
         size="sm"
         variant="default"
         onClick={() => handleCreateWorkOrder(routine.id)}
     >
         <Plus className="mr-1 h-4 w-4" />
         Criar Ordem de Serviço
     </Button>
     ```
   - Show "View Work Orders" for both execution modes to see history

### Routine Actions Dropdown

Update the EntityActionDropdown to include execution mode-specific actions:

```tsx
additionalActions={[
    // Existing actions...
    ...(routine.execution_mode === 'manual' && routine.isDue ? [{
        label: 'Criar Ordem de Serviço',
        icon: <Plus className="h-4 w-4" />,
        onClick: () => handleCreateWorkOrder(routine.id),
    }] : []),
    {
        label: 'Visualizar Ordens de Serviço',
        icon: <Eye className="h-4 w-4" />,
        onClick: () => handleViewExecutions(routine.id),
    },
    // Other actions...
]}
```

### Routine Edit Form (EditRoutineSheet)

Replace the status field with execution mode selection:

```tsx
<div className="space-y-2">
    <Label htmlFor="execution_mode">Modo de Execução*</Label>
    <RadioGroup
        value={data.execution_mode}
        onValueChange={(value) => setData('execution_mode', value as 'automatic' | 'manual')}
    >
        <div className="flex items-center space-x-2">
            <RadioGroupItem value="automatic" id="automatic" />
            <Label htmlFor="automatic" className="flex items-center gap-2 cursor-pointer">
                <Clock className="h-4 w-4" />
                <div>
                    <div className="font-medium">Automático</div>
                    <div className="text-sm text-muted-foreground">
                        Sistema gera ordens automaticamente baseado no runtime
                    </div>
                </div>
            </Label>
        </div>
        <div className="flex items-center space-x-2 mt-4">
            <RadioGroupItem value="manual" id="manual" />
            <Label htmlFor="manual" className="flex items-center gap-2 cursor-pointer">
                <Hand className="h-4 w-4" />
                <div>
                    <div className="font-medium">Manual</div>
                    <div className="text-sm text-muted-foreground">
                        Usuário cria ordens quando necessário
                    </div>
                </div>
            </Label>
        </div>
    </RadioGroup>
</div>
```

### Work Order Creation Integration

When creating work orders from manual routines:

1. **Pre-populate Work Order Form**
   - Source type: 'routine'
   - Source ID: routine.id
   - Title: routine.name
   - Description: routine.description
   - Form: routine.form_id
   - Priority: Calculated from routine.priority_score

2. **Add Routine Context**
   ```tsx
   {sourceType === 'routine' && sourceRoutine && (
       <Alert>
           <Info className="h-4 w-4" />
           <AlertTitle>Ordem de Rotina</AlertTitle>
           <AlertDescription>
               <div className="space-y-2">
                   <div>Esta ordem está sendo criada a partir da rotina: <strong>{sourceRoutine.name}</strong></div>
                   {sourceRoutine.last_execution_completed_at ? (
                       <div className="text-sm">
                           <div>Última execução: {format(sourceRoutine.last_execution_completed_at, 'dd/MM/yyyy HH:mm')}</div>
                           {sourceRoutine.last_execution_form_version_id && (
                               <div>Versão do formulário anterior: v{sourceRoutine.lastExecutionFormVersion?.version_number}</div>
                           )}
                       </div>
                   ) : (
                       <div className="text-sm">Esta será a primeira execução desta rotina</div>
                   )}
               </div>
           </AlertDescription>
       </Alert>
   )}
   ```

### Dashboard Enhancements

1. **Routine Status Widget**
   ```tsx
   <Card>
       <CardHeader>
           <CardTitle>Status das Rotinas</CardTitle>
       </CardHeader>
       <CardContent>
           <div className="space-y-4">
               <div className="flex justify-between">
                   <span>Rotinas Automáticas</span>
                   <Badge>{automaticCount}</Badge>
               </div>
               <div className="flex justify-between">
                   <span>Rotinas Manuais</span>
                   <Badge variant="outline">{manualCount}</Badge>
               </div>
               <Separator />
               <div className="flex justify-between text-sm text-muted-foreground">
                   <span>Manuais Vencidas</span>
                   <Badge variant="destructive">{overdueManualCount}</Badge>
               </div>
           </div>
       </CardContent>
   </Card>
   ```

2. **Manual Routines Due Alert**
   ```tsx
   {overdueManualRoutines.length > 0 && (
       <Alert variant="warning">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Rotinas Manuais Vencidas</AlertTitle>
           <AlertDescription>
               Existem {overdueManualRoutines.length} rotinas manuais que 
               precisam de atenção. 
               <Button 
                   variant="link" 
                   className="p-0 h-auto" 
                   onClick={() => router.visit('/maintenance/routines?execution_mode=manual&status=overdue')}
               >
                   Ver rotinas
               </Button>
           </AlertDescription>
       </Alert>
   )}
   ```

## Migration Strategy

### Phase 1: Database Schema Changes

**Note**: The routines table structure has been updated in the Implementation Plan section above. The original migration shown here is for reference only. Please refer to the Implementation Plan for the updated schema that includes trigger_type, trigger_runtime_hours, trigger_calendar_days, and other new fields.

### Phase 2: Model Updates

**Update Existing Model**: `app/Models/Maintenance/Routine.php`

```php
protected $fillable = [
    'asset_id', 'name', 'trigger_hours', 'execution_mode', 'description',
    'form_id', 'active_form_version_id', 'advance_generation_days',
    'auto_approve_work_orders', 'priority_score',
    'last_execution_runtime_hours', 'last_execution_completed_at',
    'last_execution_form_version_id'
];

protected $casts = [
    'trigger_hours' => 'integer',
    'advance_generation_days' => 'integer',
    'auto_approve_work_orders' => 'boolean',
    'last_execution_runtime_hours' => 'decimal:2',
    'last_execution_completed_at' => 'datetime',
];

// Add new methods
public function isDue(): bool
{
    $hoursUntilDue = $this->calculateHoursUntilDue();
    return $hoursUntilDue !== null && $hoursUntilDue <= 0;
}

public function getHoursUntilDue(): float
{
    return $this->calculateHoursUntilDue() ?? 0;
}

public function generateWorkOrder(): WorkOrder
{
    $dueDate = $this->calculateDueDate();
    
    return WorkOrder::create([
        'discipline' => 'maintenance',
        'work_order_category' => 'preventive',
        'title' => $this->generateWorkOrderTitle(),
        'description' => $this->generateWorkOrderDescription(),
        'asset_id' => $this->asset_id,
        'priority' => $this->getPriorityFromScore(),
        'priority_score' => $this->priority_score ?? 50,
        'source_type' => 'routine',
        'source_id' => $this->id,
        'form_id' => $this->form_id,
        'form_version_id' => $this->active_form_version_id ?? $this->form->current_version_id,
        'requested_by' => $this->created_by ?? auth()->id(),
        'requested_at' => now(),
        'requested_due_date' => $dueDate,
        'status' => 'requested',
    ]);
}

private function generateWorkOrderTitle(): string
{
    $interval = $this->trigger_type === 'runtime_hours' 
        ? "{$this->trigger_runtime_hours}h" 
        : "{$this->trigger_calendar_days} dias";
        
    return "Manutenção Preventiva - {$this->name} ({$interval})";
}

private function generateWorkOrderDescription(): string
{
    $triggerInfo = $this->trigger_type === 'runtime_hours'
        ? "Baseada em horas de operação: {$this->trigger_runtime_hours} horas"
        : "Baseada em calendário: a cada {$this->trigger_calendar_days} dias";
        
    return "{$this->description}\n\n{$triggerInfo}";
}

public function calculateDueDate(): Carbon
{
    if ($this->trigger_type === 'runtime_hours') {
        $hoursUntilDue = $this->calculateRuntimeHoursUntilDue() ?? 0;
        return now()->addHours($hoursUntilDue);
    } else {
        if (!$this->last_execution_completed_at) {
            return now();
        }
        return $this->last_execution_completed_at->addDays($this->trigger_calendar_days);
    }
}

// Permission validation for auto-approval
public function setAutoApproveWorkOrdersAttribute($value)
{
    if ($value && !auth()->user()->can('work-orders.approve')) {
        throw new UnauthorizedException('You do not have permission to enable automatic work order approval');
    }
    
    $this->attributes['auto_approve_work_orders'] = $value;
}

// Update existing scope
public function scopeAutomatic($query)
{
    return $query->where('execution_mode', 'automatic');
}

public function scopeManual($query)
{
    return $query->where('execution_mode', 'manual');
}

// Relationships for execution tracking
public function lastExecutionFormVersion(): BelongsTo
{
    return $this->belongsTo(FormVersion::class, 'last_execution_form_version_id');
}
```

**Create New Observer**: `app/Observers/WorkOrderExecutionObserver.php`

```php
<?php

namespace App\Observers;

use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrderExecution;

class WorkOrderExecutionObserver
{
    public function completed(WorkOrderExecution $execution)
    {
        $workOrder = $execution->workOrder;
        
        // Update routine tracking when work order from routine is completed
        if ($workOrder->source_type === 'routine' && $workOrder->source_id) {
            $routine = Routine::find($workOrder->source_id);
            
            if ($routine) {
                $routine->update([
                    'last_execution_runtime_hours' => $workOrder->asset->current_runtime_hours,
                    'last_execution_completed_at' => now(),
                    'last_execution_form_version_id' => $workOrder->form_version_id
                ]);
            }
        }
    }
}
```

**Register Observer in**: `app/Providers/AppServiceProvider.php`

```php
use App\Models\WorkOrders\WorkOrderExecution;
use App\Observers\WorkOrderExecutionObserver;

public function boot()
{
    WorkOrderExecution::observe(WorkOrderExecutionObserver::class);
}
```

### Phase 3: Service Layer Updates

1. **WorkOrderGenerationService**
   - Add execution mode filtering to automatic generation
   - Update shouldGenerateWorkOrder logic
   - Add manual work order creation method

2. **New RoutineWorkOrderService**
   ```php
   class RoutineWorkOrderService
   {
               public function createManualWorkOrder(Routine $routine): WorkOrder
        {
            if ($routine->execution_mode !== 'manual') {
                throw new \Exception('Cannot manually create work order for automatic routine');
            }
           
           if ($routine->hasActiveWorkOrder()) {
               throw new \Exception('Active work order already exists');
           }
           
           return $routine->generateWorkOrder();
       }
       
               public function getManualRoutinesDue(): Collection
        {
            return Routine::where('execution_mode', 'manual')
                ->with(['asset.latestRuntimeMeasurement'])
                ->get()
                ->filter(fn($routine) => $routine->isDue());
        }
   }
   ```

### Phase 4: Controller Updates

1. **RoutineController**
   ```php
   public function createWorkOrder(Request $request, Asset $asset, Routine $routine)
   {
       $this->authorize('create', [WorkOrder::class, $asset]);
       
               if ($routine->execution_mode !== 'manual') {
            return response()->json([
                'error' => 'Work orders are generated automatically for this routine'
            ], 422);
        }
       
       try {
           $workOrder = app(RoutineWorkOrderService::class)
               ->createManualWorkOrder($routine);
           
           return response()->json([
               'success' => true,
               'work_order_id' => $workOrder->id,
               'redirect' => route('work-orders.show', $workOrder)
           ]);
       } catch (\Exception $e) {
           return response()->json(['error' => $e->getMessage()], 422);
       }
   }
   ```

2. **Add Route**
   ```php
   Route::post('/assets/{asset}/routines/{routine}/create-work-order', 
       [RoutineController::class, 'createWorkOrder'])
       ->name('maintenance.assets.routines.create-work-order');
   ```

### Phase 5: Frontend Updates

1. **Update TypeScript Types**
   ```typescript
       interface Routine {
        id: number;
        name: string;
        execution_mode: 'automatic' | 'manual';
        trigger_hours: number;
        last_execution_runtime_hours?: number;
        last_execution_completed_at?: string;
        last_execution_form_version_id?: number;
        lastExecutionFormVersion?: {
            id: number;
            version_number: number;
            published_at: string;
        };
        // ... other fields
    }
   ```

2. **Add New Components**
   - RoutineModeIndicator component
   - ManualRoutineActions component
   - OverdueRoutinesAlert component

3. **Update Existing Components**
   - AssetRoutinesTab: Add execution mode column and actions
   - EditRoutineSheet: Replace status with execution mode field
   - RoutineList: Update to show execution mode-specific UI

### Phase 6: Testing & Validation

1. **Create Test Suite**: `tests/Feature/RoutineExecutionModeTest.php`
   ```php
   <?php
   
   namespace Tests\Feature;
   
   use Tests\TestCase;
   use App\Models\Maintenance\Routine;
   use App\Models\AssetHierarchy\Asset;
   use App\Models\WorkOrders\WorkOrder;
   use Illuminate\Foundation\Testing\RefreshDatabase;
   
   class RoutineExecutionModeTest extends TestCase
   {
       use RefreshDatabase;
       
       public function test_automatic_routines_generate_work_orders()
       {
           $routine = Routine::factory()->create([
               'execution_mode' => 'automatic',
               'trigger_hours' => 500
           ]);
           
           // Test automatic generation logic
           $this->assertTrue($routine->shouldGenerateWorkOrder());
       }
       
       public function test_manual_routines_require_user_action()
       {
           $routine = Routine::factory()->create([
               'execution_mode' => 'manual'
           ]);
           
           // Test manual creation
           $this->assertFalse($routine->shouldGenerateWorkOrder());
       }
       
       public function test_last_execution_tracking()
       {
           $routine = Routine::factory()->create();
           $formVersion = FormVersion::factory()->create();
           
           $workOrder = WorkOrder::factory()->create([
               'source_type' => 'routine',
               'source_id' => $routine->id,
               'form_version_id' => $formVersion->id
           ]);
           
           $execution = WorkOrderExecution::factory()->create([
               'work_order_id' => $workOrder->id
           ]);
           
           // Simulate completion
           $execution->update(['status' => 'completed']);
           
           // Test tracking updates
           $routine->refresh();
           $this->assertNotNull($routine->last_execution_completed_at);
           $this->assertEquals($formVersion->id, $routine->last_execution_form_version_id);
       }
   }
   ```

2. **Validation Checklist**
   - [ ] New routines default to automatic execution mode
   - [ ] Automatic routines generate work orders based on runtime
   - [ ] Manual routines require explicit user action
   - [ ] Last execution tracking works correctly
   - [ ] UI shows correct execution mode indicators
   - [ ] Permissions work correctly for manual creation
   - [ ] All existing functionality remains intact

### Phase 7: Documentation & Training

1. **Update User Documentation**
   - Explain automatic vs manual execution modes
   - Document how to change routine execution modes
   - Provide decision guide for execution mode selection
   - Update screenshots and UI guides

2. **Development Team Guide**
   - Code review checklist for execution mode implementation
   - Testing procedures for new functionality
   - Performance monitoring guidelines
   - Rollback procedures if issues arise

## Benefits

### Automatic Execution Mode Benefits
- Ensures maintenance is never missed
- Reduces administrative overhead
- Provides predictable maintenance scheduling
- Ideal for critical equipment

### Manual Execution Mode Benefits
- Flexibility in scheduling maintenance
- Ability to defer non-critical work
- Better resource allocation control
- Accommodates operational constraints

### Form Version Tracking Benefits
- **Historical Accuracy**: Know exactly what procedure was followed in each execution
- **Audit Compliance**: Meet regulatory requirements for maintenance documentation
- **Procedure Evolution**: Track how maintenance procedures improve over time
- **Quality Assurance**: Compare results across different form versions
- **Training Support**: Understand which version technicians used for training purposes
- **Troubleshooting**: Correlate equipment issues with specific procedure versions

## Best Practices

1. **Execution Mode Selection Guidelines**
   - Use Automatic for critical equipment with strict maintenance requirements
   - Use Manual for auxiliary equipment or flexible maintenance schedules
   - Consider operational patterns when choosing execution mode

2. **Trigger Type Selection**
   - Use Runtime Hours for equipment with variable usage patterns
   - Use Calendar Days for time-based degradation or regulatory requirements
   - Consider environmental factors when choosing trigger type

3. **Configuration Recommendations**
   - Set appropriate `advance_generation_days` for automatic routines
   - Configure `auto_approve_work_orders` only for well-established routines
   - Only users with 'work-orders.approve' permission can enable auto-approval
   - Regular review of manual routines to prevent overdue maintenance

4. **Monitoring**
   - Dashboard alerts for overdue manual routines
   - Reports on execution mode distribution and effectiveness
   - Track manual vs automatic work order completion rates
   - Monitor calendar vs runtime trigger effectiveness

## Implementation Plan for Development Team

### Phase 1: Database Schema Updates (Priority: High)

#### 1.1 Update Routines Table Migration

**File**: `database/migrations/2024_04_12_000002_create_routines_table.php`

```php
// Update the migration to include new fields
Schema::create('routines', function (Blueprint $table) {
    $table->id();
    $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    
    // Trigger configuration
    $table->enum('trigger_type', ['runtime_hours', 'calendar_days'])->default('runtime_hours');
    $table->integer('trigger_runtime_hours')->nullable()->comment('Hours between executions (runtime-based)');
    $table->integer('trigger_calendar_days')->nullable()->comment('Days between executions (calendar-based)');
    
    // Execution configuration
    $table->enum('execution_mode', ['automatic', 'manual'])->default('automatic');
    $table->text('description')->nullable();
    $table->foreignId('form_id')->constrained();
    $table->foreignId('active_form_version_id')->nullable()->constrained('form_versions')->nullOnDelete();
    
    // Work order generation settings
    $table->integer('advance_generation_days')->default(24)->comment('Generate WO this many hours in advance');
    $table->boolean('auto_approve_work_orders')->default(false)->comment('Requires work-orders.approve permission');
    $table->integer('priority_score')->default(50)->comment('Priority score 0-100');
    
    // Execution tracking
    $table->decimal('last_execution_runtime_hours', 10, 2)->nullable();
    $table->timestamp('last_execution_completed_at')->nullable();
    $table->foreignId('last_execution_form_version_id')->nullable()->constrained('form_versions')->nullOnDelete();
    
    // Status
    $table->boolean('is_active')->default(true);
    
    $table->timestamps();

    // Indexes
    $table->index(['execution_mode', 'trigger_type']);
    $table->index(['trigger_type', 'is_active']);
    $table->index('last_execution_completed_at');
});
```

#### 1.2 Create Data Migration for Existing Routines

**New File**: `database/migrations/2024_XX_XX_migrate_routine_trigger_fields.php`

```php
// Migrate existing trigger_hours to trigger_runtime_hours
DB::statement('UPDATE routines SET trigger_runtime_hours = trigger_hours WHERE trigger_hours IS NOT NULL');
DB::statement('UPDATE routines SET trigger_type = "runtime_hours"');
```

### Phase 2: Model Updates (Priority: High)

#### 2.1 Update Routine Model

**File**: `app/Models/Maintenance/Routine.php`

Key changes:
- Update fillable array with new field names
- Add methods for calendar/runtime calculations
- Add permission validation for auto_approve_work_orders
- Implement hasOpenWorkOrder() method
- Add generateWorkOrder() method

#### 2.2 Create/Update Observers

**File**: `app/Observers/WorkOrderExecutionObserver.php`

Update to handle both trigger types when recording completion.

### Phase 3: Service Layer Updates (Priority: High)

#### 3.1 Update WorkOrderGenerationService

**File**: `app/Services/WorkOrders/WorkOrderGenerationService.php`

Key changes:
- Add logic for both runtime and calendar triggers
- Implement permission check for auto-approval
- Add logging for skipped routines

#### 3.2 Update RoutineService

**File**: `app/Services/RoutineService.php`

Key changes:
- Add validation for trigger type fields
- Implement permission check in create/update methods
- Add methods for calculating next due dates

### Phase 4: Controller Updates (Priority: Medium)

#### 4.1 Update RoutineController

**File**: `app/Http/Controllers/Maintenance/RoutineController.php`

Key changes:
- Add permission validation for auto_approve_work_orders
- Update validation rules for trigger fields
- Add trigger type to response data

#### 4.2 Update Form Requests

**Files**: 
- `app/Http/Requests/StoreRoutineRequest.php`
- `app/Http/Requests/UpdateRoutineRequest.php`

Add validation rules:
```php
'trigger_type' => 'required|in:runtime_hours,calendar_days',
'trigger_runtime_hours' => 'required_if:trigger_type,runtime_hours|nullable|integer|min:1|max:10000',
'trigger_calendar_days' => 'required_if:trigger_type,calendar_days|nullable|integer|min:1|max:365',
'auto_approve_work_orders' => [
    'boolean',
    function ($attribute, $value, $fail) {
        if ($value && !$this->user()->can('work-orders.approve')) {
            $fail('You do not have permission to enable automatic work order approval.');
        }
    },
],
```

### Phase 5: Frontend Updates (Priority: Medium)

#### 5.1 Update TypeScript Types

**File**: `resources/js/types/routine.ts`

```typescript
export interface Routine {
    id: number;
    name: string;
    trigger_type: 'runtime_hours' | 'calendar_days';
    trigger_runtime_hours?: number;
    trigger_calendar_days?: number;
    execution_mode: 'automatic' | 'manual';
    advance_generation_days: number;
    auto_approve_work_orders: boolean;
    // ... other fields
}
```

#### 5.2 Update Routine Form Component

**File**: `resources/js/components/routines/RoutineForm.tsx`

Key changes:
- Add trigger type radio selection
- Show conditional fields based on trigger type
- Add permission check for auto-approve checkbox
- Update field names throughout

#### 5.3 Update Routine List Component

**File**: `resources/js/components/routines/RoutineList.tsx`

Key changes:
- Show trigger type with appropriate icon
- Display progress differently for calendar vs runtime
- Update column definitions

### Phase 6: Command Updates (Priority: Low)

#### 6.1 Update Work Order Generation Command

**File**: `app/Console/Commands/GenerateWorkOrdersFromRoutines.php`

Key changes:
- Add separate handling for runtime vs calendar routines
- Add detailed logging for skipped routines
- Show trigger type in output

### Phase 7: Testing (Priority: High)

#### 7.1 Update Existing Tests

**Files to update**:
- `tests/Feature/RoutineExecutionModeTest.php`
- `tests/Unit/Models/RoutineTest.php`

#### 7.2 Create New Tests

**New test cases**:
- Calendar trigger calculation tests
- Permission validation for auto-approval
- Open work order prevention tests
- Trigger type validation tests

### Phase 8: Data Validation & Cleanup

#### 8.1 Pre-deployment Checklist

- [ ] All existing routines have trigger_type set
- [ ] trigger_runtime_hours populated from old trigger_hours
- [ ] No routines have both trigger fields populated
- [ ] All auto_approve_work_orders users have permission

#### 8.2 Post-deployment Validation

- [ ] Monitor work order generation for both trigger types
- [ ] Verify permission checks are working
- [ ] Check that calendar calculations are accurate
- [ ] Ensure no duplicate work orders are created

### Development Timeline

**Week 1**:
- Database migrations
- Model updates
- Service layer changes

**Week 2**:
- Controller updates
- Frontend components
- Initial testing

**Week 3**:
- Integration testing
- Bug fixes
- Documentation updates

**Week 4**:
- User acceptance testing
- Performance optimization
- Deployment preparation 
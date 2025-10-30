# Manufacturing Order Observer Augmentation Specification

## Overview

This specification details the comprehensive augmentation of Laravel Observers to ensure that Manufacturing Steps are automatically transitioned from "pending" to "queued" whenever their dependencies are met throughout the entire Manufacturing Order lifecycle.

## Current State Analysis

### Existing Observer Coverage

1. **ManufacturingOrderObserver**
   - Tracks: `quantity`, `quantity_completed`, `status` changes
   - Handles: Smart progress updates, parent/child order relationships
   - **Gap**: Only checks child order dependencies, not comprehensive step queuing

2. **ManufacturingStepObserver**
   - Tracks: `cumulative_quantity_completed`, `cumulative_quantity_scrapped`, `status`
   - Handles: Smart progress updates
   - **Gap**: No step dependency checking or queuing logic

### Current Step Queuing Triggers
- Order release via `ManufacturingOrderService::releaseOrder()`
- Production start via `ManufacturingOrderService::startProduction()`
- Step completion via `ManufacturingStep::complete()`
- Child order quantity updates (partial implementation)

## Comprehensive Lifecycle Events Requiring Monitoring

### 1. Manufacturing Order Events

#### Status Changes
- **Draft → Planned**: Pre-validate route readiness
- **Planned → Released**: Queue first eligible steps
- **Released → In Progress**: Re-check all pending steps
- **Any → On Hold**: Pause active steps
- **On Hold → Previous Status**: Resume and re-evaluate steps
- **Any → Cancelled**: Cancel all non-completed steps

#### Quantity Changes
- `quantity`: May affect percentage-based dependencies
- `quantity_completed`: Affects parent order step dependencies
- `quantity_scrapped`: May impact completion thresholds

#### Structural Changes
- `parent_id`: Changes hierarchy dependencies
- `item_id`: May affect BOM-based dependencies
- Work cell assignments

### 2. Manufacturing Route Events

#### Route Creation/Modification
- New route assigned to order
- Route structure changes (step additions/removals)
- Dependency chain modifications

### 3. Manufacturing Step Events

#### Status Transitions
- **Pending → Any**: Track for dependency chain
- **In Progress → Completed**: Queue dependent steps
- **In Progress → Awaiting Quality**: Hold dependent steps
- **Awaiting Quality → Completed**: Resume dependency chain
- **Any → Skipped**: Treat as completed for dependencies

#### Quantity Updates (Gate Conditions)
- `cumulative_quantity_completed`: Check quantity-based gates
- `cumulative_quantity_scrapped`: May affect total quantities
- Percentage calculations for percentage-based gates

#### Dependency Changes
- `depends_on_step_id`: Restructure dependency chain
- `dependency_start_condition`: Change gate requirements
- `dependency_minimum_quantity`: Adjust gate thresholds
- `dependency_minimum_percentage`: Adjust gate percentages

### 4. Manufacturing Step Execution Events

#### Progress Reporting
- `quantity_completed` increments: Check gate conditions
- `quantity_scrapped` increments: Adjust available quantities
- Execution completion: Trigger step completion checks

### 5. Child Order Events

#### Creation/Deletion
- New child order created under parent
- Child order deleted/cancelled

#### Status Changes
- Child order released/completed
- Affects parent step dependencies of type `child_order_dependency_type`

#### Quantity Progress
- Child order `quantity_completed` updates
- Minimum quantity thresholds for parent steps

### 6. Work Cell Events
- Work cell availability changes
- Work cell assignment/unassignment
- May affect step readiness

## Proposed Observer Implementation

### 1. Enhanced ManufacturingOrderObserver

```php
class ManufacturingOrderObserver
{
    public function updated(ManufacturingOrder $order): void
    {
        // Existing logic...
        
        // Enhanced step queuing checks
        if ($order->isDirty(['status', 'quantity', 'parent_id'])) {
            $this->checkAndQueueEligibleSteps($order);
        }
        
        // Handle status-specific transitions
        if ($order->isDirty('status')) {
            $this->handleStatusTransition($order);
        }
    }
    
    protected function checkAndQueueEligibleSteps(ManufacturingOrder $order): void
    {
        // Only process for active orders
        if (!in_array($order->status, ['released', 'in_progress'])) {
            return;
        }
        
        // Check all pending steps
        $order->manufacturingRoute?->steps()
            ->where('status', 'pending')
            ->with(['dependency', 'manufacturingRoute.manufacturingOrder'])
            ->each(function ($step) {
                if ($step->canStart()) {
                    $step->moveToQueued();
                }
            });
    }
    
    protected function handleStatusTransition(ManufacturingOrder $order): void
    {
        $previousStatus = $order->getOriginal('status');
        $newStatus = $order->status;
        
        // Handle specific transitions
        switch ($newStatus) {
            case 'released':
                $this->handleOrderReleased($order);
                break;
            case 'on_hold':
                $this->handleOrderOnHold($order);
                break;
            case 'cancelled':
                $this->handleOrderCancelled($order);
                break;
        }
        
        // Handle resume from hold
        if ($previousStatus === 'on_hold' && $newStatus !== 'on_hold') {
            $this->handleOrderResumed($order);
        }
    }
}
```

### 2. Enhanced ManufacturingStepObserver

```php
class ManufacturingStepObserver
{
    public function updated(ManufacturingStep $step): void
    {
        // Existing logic...
        
        // Check if this update affects dependent steps
        if ($this->affectsDependencies($step)) {
            $this->checkDependentSteps($step);
        }
        
        // Check if gate conditions changed
        if ($this->gateConditionsChanged($step)) {
            $this->recheckGateConditions($step);
        }
    }
    
    protected function affectsDependencies(ManufacturingStep $step): bool
    {
        return $step->isDirty([
            'status',
            'cumulative_quantity_completed',
            'cumulative_quantity_scrapped',
            'depends_on_step_id',
            'dependency_start_condition',
            'dependency_minimum_quantity',
            'dependency_minimum_percentage'
        ]);
    }
    
    protected function checkDependentSteps(ManufacturingStep $step): void
    {
        // Check steps that depend on this one
        $step->dependentSteps()
            ->where('status', 'pending')
            ->with(['manufacturingRoute.manufacturingOrder'])
            ->each(function ($dependentStep) {
                // Only queue if parent order is active
                $order = $dependentStep->manufacturingRoute->manufacturingOrder;
                if (in_array($order->status, ['released', 'in_progress'])) {
                    if ($dependentStep->canStart()) {
                        $dependentStep->moveToQueued();
                    }
                }
            });
    }
}
```

### 3. New ManufacturingStepExecutionObserver

```php
class ManufacturingStepExecutionObserver
{
    public function created(ManufacturingStepExecution $execution): void
    {
        // When execution starts, check gate conditions
        $this->checkGateConditionsForProgress($execution);
    }
    
    public function updated(ManufacturingStepExecution $execution): void
    {
        // Check gate conditions on quantity updates
        if ($execution->isDirty(['quantity_completed', 'quantity_scrapped'])) {
            $this->checkGateConditionsForProgress($execution);
        }
        
        // Handle execution completion
        if ($execution->isDirty('status') && $execution->status === 'completed') {
            $this->handleExecutionCompleted($execution);
        }
    }
    
    protected function checkGateConditionsForProgress(ManufacturingStepExecution $execution): void
    {
        $step = $execution->manufacturingStep;
        
        // Check if any steps depend on this one with progressive flow conditions
        $step->dependentSteps()
            ->where('status', 'pending')
            ->whereIn('dependency_start_condition', ['quantity_based', 'percentage_based', 'immediate'])
            ->each(function ($dependentStep) use ($step) {
                if ($this->meetsGateRequirements($step, $dependentStep)) {
                    $dependentStep->moveToQueued();
                }
            });
    }
    
    protected function meetsGateRequirements(ManufacturingStep $currentStep, ManufacturingStep $dependentStep): bool
    {
        switch ($dependentStep->dependency_start_condition) {
            case 'immediate':
                return $currentStep->status === 'in_progress';
                
            case 'quantity_based':
                return $currentStep->cumulative_quantity_completed >= 
                       $dependentStep->dependency_minimum_quantity;
                
            case 'percentage_based':
                $order = $currentStep->manufacturingRoute->manufacturingOrder;
                $percentage = ($currentStep->cumulative_quantity_completed / $order->quantity) * 100;
                return $percentage >= $dependentStep->dependency_minimum_percentage;
                
            case 'completed':
            default:
                return $currentStep->status === 'completed';
        }
    }
}
```

### 4. New ManufacturingRouteObserver

```php
class ManufacturingRouteObserver
{
    public function created(ManufacturingRoute $route): void
    {
        // When route is created, check if order is already released
        if ($route->manufacturingOrder->status === 'released') {
            $this->queueFirstSteps($route);
        }
    }
    
    public function updated(ManufacturingRoute $route): void
    {
        // Re-evaluate steps if route structure changes
        if ($route->manufacturingOrder->status === 'released') {
            $this->checkAllPendingSteps($route);
        }
    }
}
```

## Gate-Specific Conditions

### Progressive Flow Gate Types

1. **Immediate Gate**
   - Trigger: As soon as preceding step starts
   - Check: When step status changes to `in_progress`

2. **Quantity-Based Gate**
   - Trigger: When cumulative quantity reaches threshold
   - Check: On every quantity update in executions
   - Formula: `cumulative_quantity_completed >= dependency_minimum_quantity`

3. **Percentage-Based Gate**
   - Trigger: When percentage of order quantity completed
   - Check: On quantity updates and order quantity changes
   - Formula: `(cumulative_quantity_completed / order.quantity) * 100 >= dependency_minimum_percentage`

4. **Completion Gate (Traditional)**
   - Trigger: When step fully completes
   - Check: When step status changes to `completed`

### Gate Evaluation Logic

```php
public function evaluateGateCondition(ManufacturingStep $step): bool
{
    // Check basic requirements first
    if (!$this->basicRequirementsMet($step)) {
        return false;
    }
    
    // Check step dependencies
    if ($step->depends_on_step_id && !$this->stepDependencyMet($step)) {
        return false;
    }
    
    // Check child order dependencies
    if (!$this->childOrderDependenciesMet($step)) {
        return false;
    }
    
    return true;
}
```

## Safety Net: Scheduled Job

```php
class CheckPendingStepsJob implements ShouldQueue
{
    public function handle()
    {
        // Find all pending steps on active orders
        ManufacturingStep::query()
            ->where('status', 'pending')
            ->whereHas('manufacturingRoute.manufacturingOrder', function ($query) {
                $query->whereIn('status', ['released', 'in_progress']);
            })
            ->with(['dependency', 'manufacturingRoute.manufacturingOrder'])
            ->chunk(100, function ($steps) {
                foreach ($steps as $step) {
                    if ($step->canStart()) {
                        $step->moveToQueued();
                        
                        Log::warning('Safety net queued step', [
                            'step_id' => $step->id,
                            'order_id' => $step->manufacturingRoute->manufacturing_order_id,
                            'step_name' => $step->name
                        ]);
                    }
                }
            });
    }
}
```

Schedule in `app/Console/Kernel.php`:
```php
$schedule->job(new CheckPendingStepsJob)->everyFiveMinutes();
```

## Implementation Considerations

### 1. Performance Optimization
- Use eager loading to minimize queries
- Implement query result caching for frequently checked conditions
- Consider database indexing on dependency fields
- Batch updates when multiple steps need queuing

### 2. Transaction Safety
- Wrap observer logic in database transactions
- Prevent race conditions with proper locking
- Handle circular dependencies gracefully

### 3. Logging and Monitoring
- Log all automatic step transitions
- Track observer execution time
- Monitor for steps that repeatedly fail to queue
- Alert on safety net activations (indicates missed events)

### 4. Testing Strategy
- Unit tests for each observer method
- Integration tests for complete workflows
- Test all gate condition types
- Verify no steps are orphaned

## Migration Path

1. **Phase 1**: Implement enhanced observers with extensive logging
2. **Phase 2**: Deploy safety net job to catch any gaps
3. **Phase 3**: Monitor logs and refine observer logic
4. **Phase 4**: Optimize performance based on production data

## Success Metrics

- Zero pending steps with met dependencies on active orders
- Safety net job finds no steps to queue (after stabilization)
- Reduced user complaints about steps not appearing in queues
- Improved production flow visibility

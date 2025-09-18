# Scheduler Algorithms Specification

## 1. Executive Summary

This document specifies the scheduling algorithms for the Production Scheduler Module. The implementation follows a phased approach, starting with three simple but effective algorithms that provide immediate value. Each algorithm optimizes for a different objective, giving users flexibility to choose based on their production needs.

## 2. Algorithm Overview

### 2.1 Phase 1 Algorithms (Initial Implementation)

1. **ASAP (As Soon As Possible)** - Minimizes total completion time
2. **Due Date Backward Pass** - Maximizes on-time delivery
3. **Balanced Loading** - Maximizes work cell utilization

### 2.2 Core Principles

- **Non-blocking execution**: All algorithms run as Laravel queued jobs
- **Conflict tolerance**: Continue scheduling despite conflicts, generate alerts
- **Locked step respect**: Work around manually positioned steps
- **Progress reporting**: Real-time updates during execution
- **Performance target**: Schedule 1000 MOs in < 10 seconds

## 3. Common Components

### 3.1 Data Structures

```php
// Input Structure
class SchedulingRequest {
    public array $manufacturingOrderIds;    // Selected MOs to schedule
    public string $algorithmType;           // 'asap', 'due_date', 'balanced'
    public int $scheduleVersionId;          // Version being created
    public ?DateTime $scheduleStartDate;    // Earliest start time
    public ?DateTime $scheduleEndDate;      // Latest end time
}

// Step Scheduling Data
class StepScheduleData {
    public int $stepId;
    public int $workCellId;
    public DateTime $scheduledStart;
    public DateTime $scheduledEnd;
    public bool $isLocked;
    public array $conflicts = [];           // Array of conflict messages
}

// Algorithm Result
class SchedulingResult {
    public bool $success;
    public array $scheduledSteps = [];      // Array of StepScheduleData
    public array $alerts = [];              // Array of ScheduleAlert
    public array $metrics = [];             // Performance metrics
    public float $executionTime;           // Seconds to complete
}
```

### 3.2 Shared Services

#### CapacityChecker
```php
class CapacityChecker {
    /**
     * Check if work cell is available during time period
     */
    public function isAvailable(
        WorkCell $workCell, 
        DateTime $start, 
        DateTime $end
    ): bool;
    
    /**
     * Find next available slot of given duration
     */
    public function findNextAvailableSlot(
        WorkCell $workCell,
        int $durationMinutes,
        DateTime $afterTime
    ): ?DateTime;
    
    /**
     * Get work cell utilization for date range
     */
    public function getUtilization(
        WorkCell $workCell,
        DateTime $start,
        DateTime $end
    ): float;
}
```

#### DependencyValidator
```php
class DependencyValidator {
    /**
     * Check if all dependencies are met for a step
     */
    public function canStart(
        ManufacturingStep $step,
        DateTime $proposedStart,
        array $scheduledSteps
    ): bool;
    
    /**
     * Get earliest possible start time based on dependencies
     */
    public function getEarliestStartTime(
        ManufacturingStep $step,
        array $scheduledSteps
    ): DateTime;
}
```

#### ConflictDetector
```php
class ConflictDetector {
    /**
     * Detect scheduling conflicts
     */
    public function detectConflicts(
        StepScheduleData $stepData,
        array $existingSchedule
    ): array;
    
    /**
     * Check for capacity overrun
     */
    public function checkCapacityConflict(
        WorkCell $workCell,
        DateTime $start,
        DateTime $end
    ): ?string;
    
    /**
     * Check for late delivery
     */
    public function checkDeliveryConflict(
        ManufacturingOrder $order,
        DateTime $completionDate
    ): ?string;
}
```

### 3.3 Progress Reporting

```php
trait ProgressReporting {
    protected function reportProgress(
        int $current, 
        int $total, 
        string $message = ''
    ): void {
        $percentage = round(($current / $total) * 100, 2);
        
        broadcast(new SchedulingProgress(
            scheduleVersionId: $this->scheduleVersionId,
            percentage: $percentage,
            message: $message,
            currentStep: $current,
            totalSteps: $total
        ));
    }
}
```

## 4. Algorithm Specifications

### 4.1 ASAP (As Soon As Possible) Algorithm

**Objective**: Schedule all operations at the earliest possible time

**Use Case**: When production wants to complete orders as quickly as possible

#### Algorithm Steps:

```
1. SORT manufacturing orders by priority (descending) then by order number
2. FOR each manufacturing order:
   3. GET all steps for the order
   4. SORT steps by dependency order
   5. FOR each step:
      6. IF step is locked:
         7. USE existing schedule data
      8. ELSE:
         9. FIND earliest start time considering:
            - Step dependencies
            - Work cell availability
            - Shift schedules
         10. CALCULATE end time based on duration
         11. IF conflict detected:
             12. SCHEDULE anyway
             13. CREATE alert for conflict
         14. BOOK work cell capacity
   15. UPDATE progress (every 10 steps)
16. CALCULATE metrics (makespan, utilization)
17. RETURN results
```

#### Implementation:

```php
class ASAPScheduler extends BaseScheduler {
    use ProgressReporting;
    
    public function schedule(SchedulingRequest $request): SchedulingResult {
        $result = new SchedulingResult();
        $scheduledSteps = [];
        
        // Load MOs sorted by priority
        $orders = ManufacturingOrder::whereIn('id', $request->manufacturingOrderIds)
            ->orderByDesc('priority')
            ->orderBy('order_number')
            ->with(['manufacturingRoute.steps'])
            ->get();
        
        $totalSteps = $this->countTotalSteps($orders);
        $processedSteps = 0;
        
        foreach ($orders as $order) {
            foreach ($order->manufacturingRoute->steps as $step) {
                // Skip if locked
                if ($this->isStepLocked($step)) {
                    $scheduledSteps[$step->id] = $this->getLockedSchedule($step);
                    continue;
                }
                
                // Find earliest possible start
                $earliestStart = $this->dependencyValidator->getEarliestStartTime(
                    $step, 
                    $scheduledSteps
                );
                
                // Find available slot on work cell
                $scheduledStart = $this->capacityChecker->findNextAvailableSlot(
                    $step->workCell,
                    $step->total_duration_minutes,
                    $earliestStart
                );
                
                // Calculate end time
                $scheduledEnd = $scheduledStart->copy()->addMinutes($step->total_duration_minutes);
                
                // Create schedule data
                $stepData = new StepScheduleData();
                $stepData->stepId = $step->id;
                $stepData->workCellId = $step->work_cell_id;
                $stepData->scheduledStart = $scheduledStart;
                $stepData->scheduledEnd = $scheduledEnd;
                
                // Check for conflicts
                $conflicts = $this->conflictDetector->detectConflicts($stepData, $scheduledSteps);
                if (!empty($conflicts)) {
                    $stepData->conflicts = $conflicts;
                    $result->alerts = array_merge($result->alerts, $this->createAlerts($conflicts, $step));
                }
                
                $scheduledSteps[$step->id] = $stepData;
                
                // Report progress
                $processedSteps++;
                if ($processedSteps % 10 === 0) {
                    $this->reportProgress($processedSteps, $totalSteps, "Scheduling {$order->order_number}");
                }
            }
        }
        
        $result->success = true;
        $result->scheduledSteps = $scheduledSteps;
        $result->metrics = $this->calculateMetrics($scheduledSteps);
        
        return $result;
    }
}
```

### 4.2 Due Date Backward Pass Algorithm

**Objective**: Schedule operations as late as possible while meeting due dates

**Use Case**: Minimize WIP and ensure on-time delivery (MOST IMPORTANT)

#### Algorithm Steps:

```
1. SORT manufacturing orders by requested_date (ascending)
2. FOR each manufacturing order:
   3. SET target_end_date = order.requested_date
   4. GET all steps in reverse dependency order
   5. FOR each step (working backwards):
      6. IF step is locked:
         7. USE existing schedule data
         8. ADJUST target_end_date if needed
      9. ELSE:
         10. CALCULATE latest_end_time = target_end_date
         11. CALCULATE latest_start_time = latest_end_time - duration
         12. FIND available slot working backwards from latest_end_time
         13. IF no slot available before target:
             14. FIND earliest available slot (forward)
             15. CREATE late delivery alert
         16. BOOK work cell capacity
         17. UPDATE target_end_date for previous step
   18. UPDATE progress
19. RETURN results
```

#### Implementation:

```php
class DueDateBackwardScheduler extends BaseScheduler {
    use ProgressReporting;
    
    public function schedule(SchedulingRequest $request): SchedulingResult {
        $result = new SchedulingResult();
        $scheduledSteps = [];
        
        // Load MOs sorted by requested date
        $orders = ManufacturingOrder::whereIn('id', $request->manufacturingOrderIds)
            ->orderBy('requested_date')
            ->with(['manufacturingRoute.steps'])
            ->get();
        
        $totalSteps = $this->countTotalSteps($orders);
        $processedSteps = 0;
        
        foreach ($orders as $order) {
            $targetEndDate = $order->requested_date->copy()->endOfDay();
            
            // Get steps in reverse order
            $steps = $order->manufacturingRoute->steps()
                ->orderByDesc('display_order')
                ->get();
            
            foreach ($steps as $step) {
                if ($this->isStepLocked($step)) {
                    $scheduledSteps[$step->id] = $this->getLockedSchedule($step);
                    // Adjust target for previous steps
                    $targetEndDate = $scheduledSteps[$step->id]->scheduledStart;
                    continue;
                }
                
                // Calculate latest possible times
                $latestEnd = $targetEndDate;
                $latestStart = $latestEnd->copy()->subMinutes($step->total_duration_minutes);
                
                // Find available slot working backwards
                $slot = $this->findBackwardSlot(
                    $step->workCell,
                    $step->total_duration_minutes,
                    $latestEnd
                );
                
                if (!$slot || $slot['start'] < now()) {
                    // Can't meet deadline, schedule forward instead
                    $slot = $this->scheduleForwardFromNow($step);
                    $result->alerts[] = $this->createLateDeliveryAlert($order, $step, $slot['end']);
                }
                
                // Create schedule data
                $stepData = new StepScheduleData();
                $stepData->stepId = $step->id;
                $stepData->workCellId = $step->work_cell_id;
                $stepData->scheduledStart = $slot['start'];
                $stepData->scheduledEnd = $slot['end'];
                
                $scheduledSteps[$step->id] = $stepData;
                
                // Update target for previous step
                $targetEndDate = $slot['start'];
                
                // Report progress
                $processedSteps++;
                if ($processedSteps % 10 === 0) {
                    $this->reportProgress($processedSteps, $totalSteps, "Backward scheduling {$order->order_number}");
                }
            }
        }
        
        $result->success = true;
        $result->scheduledSteps = $scheduledSteps;
        $result->metrics = $this->calculateMetrics($scheduledSteps);
        
        return $result;
    }
    
    private function findBackwardSlot($workCell, $duration, $latestEnd): ?array {
        // Implementation to find slot working backwards
        // Returns ['start' => DateTime, 'end' => DateTime] or null
    }
}
```

### 4.3 Balanced Loading Algorithm

**Objective**: Distribute work evenly across work cells to maximize utilization

**Use Case**: Smooth production flow, minimize idle time

#### Algorithm Steps:

```
1. COLLECT all steps from all MOs
2. SORT steps by priority then by total processing time (descending)
3. FOR each step:
   4. IF step is locked:
      5. USE existing schedule
   6. ELSE:
      7. FIND work cell with lowest current utilization
      8. RESPECT step dependencies
      9. FIND earliest available slot on selected work cell
      10. BOOK capacity
      11. UPDATE work cell utilization metrics
   12. UPDATE progress
13. REORDER schedule to maintain MO coherence
14. RETURN results
```

#### Implementation:

```php
class BalancedLoadingScheduler extends BaseScheduler {
    use ProgressReporting;
    
    private array $workCellUtilization = [];
    
    public function schedule(SchedulingRequest $request): SchedulingResult {
        $result = new SchedulingResult();
        $scheduledSteps = [];
        
        // Initialize utilization tracking
        $this->initializeUtilizationTracking();
        
        // Collect all steps
        $allSteps = $this->collectAllSteps($request->manufacturingOrderIds);
        
        // Sort by priority and duration
        $allSteps = $allSteps->sortByDesc(function ($step) {
            return $step->manufacturingRoute->manufacturingOrder->priority * 1000 
                   + $step->total_duration_minutes;
        });
        
        $totalSteps = $allSteps->count();
        $processedSteps = 0;
        
        foreach ($allSteps as $step) {
            if ($this->isStepLocked($step)) {
                $scheduledSteps[$step->id] = $this->getLockedSchedule($step);
                $this->updateUtilization($step->work_cell_id, $step->total_duration_minutes);
                continue;
            }
            
            // Find least utilized work cell that can do this operation
            $selectedWorkCell = $this->selectLeastUtilizedWorkCell(
                $step->workCell->id  // Preferred work cell
            );
            
            // Get dependency constraints
            $earliestStart = $this->dependencyValidator->getEarliestStartTime(
                $step,
                $scheduledSteps
            );
            
            // Find slot on selected work cell
            $scheduledStart = $this->capacityChecker->findNextAvailableSlot(
                $selectedWorkCell,
                $step->total_duration_minutes,
                $earliestStart
            );
            
            $scheduledEnd = $scheduledStart->copy()->addMinutes($step->total_duration_minutes);
            
            // Create schedule data
            $stepData = new StepScheduleData();
            $stepData->stepId = $step->id;
            $stepData->workCellId = $selectedWorkCell->id;
            $stepData->scheduledStart = $scheduledStart;
            $stepData->scheduledEnd = $scheduledEnd;
            
            $scheduledSteps[$step->id] = $stepData;
            
            // Update utilization
            $this->updateUtilization($selectedWorkCell->id, $step->total_duration_minutes);
            
            // Report progress
            $processedSteps++;
            if ($processedSteps % 10 === 0) {
                $this->reportProgress($processedSteps, $totalSteps, "Balancing load across work cells");
            }
        }
        
        $result->success = true;
        $result->scheduledSteps = $scheduledSteps;
        $result->metrics = $this->calculateMetrics($scheduledSteps);
        $result->metrics['utilization_variance'] = $this->calculateUtilizationVariance();
        
        return $result;
    }
    
    private function selectLeastUtilizedWorkCell(int $preferredId): WorkCell {
        // Logic to select work cell with lowest utilization
        // Considers if work cell can perform the operation
    }
    
    private function updateUtilization(int $workCellId, int $durationMinutes): void {
        $this->workCellUtilization[$workCellId] += $durationMinutes;
    }
}
```

## 5. Conflict Management

### 5.1 Conflict Types

1. **Capacity Overrun**: Multiple steps scheduled on same work cell at same time
2. **Dependency Violation**: Step scheduled before its dependencies complete
3. **Late Delivery**: Order completion after requested date
4. **Locked Step Conflict**: Algorithm cannot honor locked position

### 5.2 Conflict Resolution Strategy

```php
class ConflictManager {
    public function handleConflict(
        string $type, 
        StepScheduleData $step, 
        array $context
    ): ScheduleAlert {
        switch ($type) {
            case 'capacity_overrun':
                // Schedule anyway, create alert
                return new ScheduleAlert([
                    'alert_type' => 'capacity_overrun',
                    'severity' => 'error',
                    'message' => "Work cell {$context['work_cell_name']} double-booked",
                    'manufacturing_step_id' => $step->stepId,
                    'work_cell_id' => $step->workCellId
                ]);
                
            case 'late_delivery':
                // Schedule at earliest possible, alert user
                return new ScheduleAlert([
                    'alert_type' => 'late_delivery',
                    'severity' => 'warning',
                    'message' => "Order will be {$context['days_late']} days late",
                    'manufacturing_order_id' => $context['order_id']
                ]);
                
            case 'dependency_violation':
                // Force schedule, alert for manual resolution
                return new ScheduleAlert([
                    'alert_type' => 'dependency_violation',
                    'severity' => 'error',
                    'message' => "Step scheduled before dependency completes",
                    'manufacturing_step_id' => $step->stepId
                ]);
        }
    }
}
```

## 6. Performance Optimization

### 6.1 Optimization Strategies

1. **Batch Database Queries**
   ```php
   // Load all data upfront
   $orders = ManufacturingOrder::with([
       'manufacturingRoute.steps.workCell',
       'manufacturingRoute.steps.dependency',
       'children'
   ])->whereIn('id', $orderIds)->get();
   ```

2. **Cache Calculations**
   ```php
   // Cache work cell availability for date ranges
   $this->availabilityCache[$workCellId][$dateKey] = $availability;
   ```

3. **Efficient Data Structures**
   ```php
   // Use arrays with ID keys for O(1) lookup
   $scheduledSteps[$stepId] = $stepData;
   ```

### 6.2 Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| 100 MOs | < 1 second | Time full algorithm execution |
| 500 MOs | < 5 seconds | Include all dependency checks |
| 1000 MOs | < 10 seconds | With conflict detection |
| Memory usage | < 256MB | Peak memory during execution |

## 7. Queue Implementation

### 7.1 Job Structure

```php
class ScheduleProductionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public function __construct(
        private SchedulingRequest $request
    ) {}
    
    public function handle(SchedulerFactory $factory): void {
        // Select algorithm
        $scheduler = $factory->create($this->request->algorithmType);
        
        // Execute scheduling
        $result = $scheduler->schedule($this->request);
        
        // Save results
        $this->saveSchedule($result);
        
        // Notify completion
        broadcast(new SchedulingComplete(
            scheduleVersionId: $this->request->scheduleVersionId,
            success: $result->success,
            alertCount: count($result->alerts)
        ));
    }
    
    public function failed(Exception $exception): void {
        broadcast(new SchedulingFailed(
            scheduleVersionId: $this->request->scheduleVersionId,
            error: $exception->getMessage()
        ));
    }
}
```

### 7.2 Progress Broadcasting

```javascript
// Frontend listener
Echo.channel(`scheduling.${scheduleVersionId}`)
    .listen('SchedulingProgress', (e) => {
        updateProgressBar(e.percentage);
        updateStatusMessage(e.message);
    })
    .listen('SchedulingComplete', (e) => {
        if (e.success) {
            showSuccessMessage(`Scheduling complete with ${e.alertCount} alerts`);
            refreshScheduleView();
        }
    });
```

## 8. User Notification System

### 8.1 Progress Modal Component

The scheduler uses a modal overlay to display real-time progress during algorithm execution.

#### Modal Structure
```typescript
interface SchedulingProgressModal {
    isOpen: boolean;
    jobId: string;
    algorithm: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress: {
        percentage: number;
        currentStep: number;
        totalSteps: number;
        currentOperation: string;
        estimatedTimeRemaining?: number;
    };
    startedAt: Date;
    completedAt?: Date;
    error?: string;
    alerts?: {
        errors: number;
        warnings: number;
    };
}
```

#### Visual Design
```
┌─────────────────────────────────────────────────┐
│     🔄 Scheduling in Progress                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Algorithm: ASAP (As Soon As Possible)          │
│  Started: 2:45 PM (2 minutes ago)              │
│                                                 │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 65%                   │
│                                                 │
│  Processing: MO-2025-047                        │
│  Step 325 of 500                               │
│  Estimated time remaining: 45 seconds           │
│                                                 │
│  [Run in Background]    [Cancel]                │
└─────────────────────────────────────────────────┘
```

### 8.2 Progress States

#### 8.2.1 Queued State
```typescript
// When job is queued
{
    status: 'queued',
    message: 'Scheduling job queued. Waiting for processing...',
    showSpinner: true,
    canCancel: true,
    canBackground: false
}
```

#### 8.2.2 Running State
```typescript
// During execution
{
    status: 'running',
    message: `Processing ${currentOperation}`,
    percentage: 65.5,
    showProgressBar: true,
    showEstimatedTime: true,
    canCancel: true,
    canBackground: true
}
```

#### 8.2.3 Completed State
```typescript
// On successful completion
{
    status: 'completed',
    message: 'Scheduling completed successfully!',
    duration: '2 minutes 15 seconds',
    results: {
        totalScheduled: 500,
        alerts: { errors: 3, warnings: 12 }
    },
    actions: [
        { label: 'View Schedule', action: 'refresh' },
        { label: 'View Alerts', action: 'showAlerts' },
        { label: 'Close', action: 'close' }
    ]
}
```

#### 8.2.4 Failed State
```typescript
// On failure
{
    status: 'failed',
    message: 'Scheduling failed',
    error: 'Unable to find valid schedule due to locked step conflicts',
    duration: '1 minute 30 seconds',
    actions: [
        { label: 'View Error Details', action: 'showError' },
        { label: 'Try Different Algorithm', action: 'retry' },
        { label: 'Close', action: 'close' }
    ]
}
```

### 8.3 Background Mode

Users can minimize the progress modal to continue working while scheduling runs.

#### Background Indicator
```typescript
// Minimal progress indicator in toolbar
interface BackgroundIndicator {
    visible: boolean;
    percentage: number;
    pulseAnimation: boolean;
    onClick: () => void; // Restore full modal
}
```

Visual representation in toolbar:
```
[🔄 Scheduling... 65%] [Alerts: 2] [Create] [Publish]
```

### 8.4 Broadcasting Events

#### 8.4.1 Event Types
```php
// SchedulingStarted Event
class SchedulingStarted implements ShouldBroadcast
{
    public function __construct(
        public string $jobId,
        public int $scheduleVersionId,
        public string $algorithm,
        public int $totalSteps,
        public array $options
    ) {}
    
    public function broadcastOn(): Channel
    {
        return new Channel("scheduling.{$this->scheduleVersionId}");
    }
}

// SchedulingProgress Event
class SchedulingProgress implements ShouldBroadcast
{
    public function __construct(
        public string $jobId,
        public int $scheduleVersionId,
        public float $percentage,
        public int $currentStep,
        public int $totalSteps,
        public string $currentOperation,
        public ?int $estimatedSecondsRemaining
    ) {}
}

// SchedulingComplete Event
class SchedulingComplete implements ShouldBroadcast
{
    public function __construct(
        public string $jobId,
        public int $scheduleVersionId,
        public bool $success,
        public array $summary,
        public int $alertCount,
        public array $alertBreakdown
    ) {}
}

// SchedulingFailed Event
class SchedulingFailed implements ShouldBroadcast
{
    public function __construct(
        public string $jobId,
        public int $scheduleVersionId,
        public string $error,
        public array $context
    ) {}
}
```

#### 8.4.2 Frontend Integration
```typescript
// React Hook for Progress Tracking
function useSchedulingProgress(scheduleVersionId: number) {
    const [progress, setProgress] = useState<SchedulingProgressModal | null>(null);
    
    useEffect(() => {
        const channel = Echo.channel(`scheduling.${scheduleVersionId}`);
        
        channel.listen('SchedulingStarted', (e: any) => {
            setProgress({
                isOpen: true,
                jobId: e.jobId,
                algorithm: e.algorithm,
                status: 'running',
                progress: {
                    percentage: 0,
                    currentStep: 0,
                    totalSteps: e.totalSteps,
                    currentOperation: 'Initializing...'
                },
                startedAt: new Date()
            });
        });
        
        channel.listen('SchedulingProgress', (e: any) => {
            setProgress(prev => prev ? {
                ...prev,
                progress: {
                    percentage: e.percentage,
                    currentStep: e.currentStep,
                    totalSteps: e.totalSteps,
                    currentOperation: e.currentOperation,
                    estimatedTimeRemaining: e.estimatedSecondsRemaining
                }
            } : null);
        });
        
        channel.listen('SchedulingComplete', (e: any) => {
            setProgress(prev => prev ? {
                ...prev,
                status: 'completed',
                completedAt: new Date(),
                alerts: e.alertBreakdown
            } : null);
            
            // Auto-refresh schedule data
            router.reload({ only: ['schedules', 'alerts', 'alertStats'] });
        });
        
        channel.listen('SchedulingFailed', (e: any) => {
            setProgress(prev => prev ? {
                ...prev,
                status: 'failed',
                error: e.error,
                completedAt: new Date()
            } : null);
        });
        
        return () => {
            Echo.leave(`scheduling.${scheduleVersionId}`);
        };
    }, [scheduleVersionId]);
    
    return progress;
}
```

### 8.5 Time Estimation

#### 8.5.1 Algorithm-Specific Estimates
```php
class TimeEstimator
{
    private const BASE_TIME_PER_STEP = [
        'asap' => 0.01,        // 10ms per step
        'due_date' => 0.015,   // 15ms per step (backward pass is slower)
        'balanced' => 0.02,    // 20ms per step (utilization calculations)
    ];
    
    public function estimateRemainingTime(
        string $algorithm,
        int $currentStep,
        int $totalSteps,
        float $elapsedSeconds
    ): ?int {
        if ($currentStep === 0) {
            return null;
        }
        
        // Calculate actual rate
        $actualSecondsPerStep = $elapsedSeconds / $currentStep;
        
        // Weighted average with expected rate
        $expectedRate = self::BASE_TIME_PER_STEP[$algorithm] ?? 0.01;
        $estimatedRate = ($actualSecondsPerStep * 0.7) + ($expectedRate * 0.3);
        
        $remainingSteps = $totalSteps - $currentStep;
        return (int) ceil($remainingSteps * $estimatedRate);
    }
}
```

### 8.6 Error Handling and Recovery

#### 8.6.1 Graceful Degradation
```php
// In the scheduling job
public function handle(SchedulerFactory $factory): void
{
    try {
        // Set job timeout warning
        if ($this->attempts() > 1) {
            broadcast(new SchedulingWarning(
                jobId: $this->job->getJobId(),
                scheduleVersionId: $this->request->scheduleVersionId,
                message: 'Scheduling is taking longer than expected. Retrying...'
            ));
        }
        
        $scheduler = $factory->create($this->request->algorithmType);
        $result = $scheduler->schedule($this->request);
        
        $this->saveSchedule($result);
        
        broadcast(new SchedulingComplete(
            jobId: $this->job->getJobId(),
            scheduleVersionId: $this->request->scheduleVersionId,
            success: $result->success,
            summary: [
                'totalScheduled' => count($result->scheduledSteps),
                'executionTime' => $result->executionTime,
                'algorithm' => $this->request->algorithmType
            ],
            alertCount: count($result->alerts),
            alertBreakdown: [
                'errors' => collect($result->alerts)->where('severity', 'error')->count(),
                'warnings' => collect($result->alerts)->where('severity', 'warning')->count()
            ]
        ));
        
    } catch (Exception $e) {
        $this->handleFailure($e);
    }
}

private function handleFailure(Exception $e): void
{
    // Log detailed error
    Log::error('Scheduling failed', [
        'job_id' => $this->job->getJobId(),
        'version_id' => $this->request->scheduleVersionId,
        'algorithm' => $this->request->algorithmType,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    // Broadcast user-friendly error
    broadcast(new SchedulingFailed(
        jobId: $this->job->getJobId(),
        scheduleVersionId: $this->request->scheduleVersionId,
        error: $this->getUserFriendlyError($e),
        context: [
            'algorithm' => $this->request->algorithmType,
            'canRetry' => $this->attempts() < $this->maxTries()
        ]
    ));
}
```

### 8.7 Notification Preferences

Allow users to configure how they want to be notified:

```php
class SchedulerNotificationPreferences
{
    public bool $showModal = true;           // Show progress modal
    public bool $playSound = true;           // Play sound on completion
    public bool $browserNotification = false; // Browser push notification
    public bool $emailOnFailure = true;      // Email if scheduling fails
    public bool $autoCloseOnSuccess = false; // Auto-close modal after success
    public int $autoCloseDelay = 5;          // Seconds before auto-close
}
```

## 9. Testing Strategy

### 9.1 Unit Tests

```php
class ASAPSchedulerTest extends TestCase
{
    public function test_schedules_simple_sequence()
    {
        // Create test data
        $order = ManufacturingOrder::factory()
            ->has(ManufacturingRoute::factory()
                ->has(ManufacturingStep::factory()->count(3)))
            ->create();
        
        // Run scheduler
        $scheduler = new ASAPScheduler();
        $result = $scheduler->schedule(new SchedulingRequest([
            'manufacturingOrderIds' => [$order->id],
            'algorithmType' => 'asap'
        ]));
        
        // Assert sequential scheduling
        $this->assertTrue($result->success);
        $this->assertCount(3, $result->scheduledSteps);
    }
    
    public function test_respects_locked_steps()
    {
        // Test that locked steps are not moved
    }
    
    public function test_handles_capacity_conflicts()
    {
        // Test that conflicts are detected and reported
    }
}
```

### 9.2 Performance Tests

```php
class SchedulerPerformanceTest extends TestCase
{
    public function test_meets_performance_targets()
    {
        // Create 1000 MOs with steps
        $orders = ManufacturingOrder::factory()
            ->count(1000)
            ->has(ManufacturingRoute::factory()
                ->has(ManufacturingStep::factory()->count(5)))
            ->create();
        
        $start = microtime(true);
        
        $scheduler = new ASAPScheduler();
        $result = $scheduler->schedule(new SchedulingRequest([
            'manufacturingOrderIds' => $orders->pluck('id')->toArray(),
            'algorithmType' => 'asap'
        ]));
        
        $duration = microtime(true) - $start;
        
        $this->assertLessThan(10, $duration, 'Scheduling 1000 MOs took longer than 10 seconds');
    }
}
```

## 10. Future Enhancements

### 10.1 Phase 2 Algorithms
- Critical Path Method (CPM)
- Resource Leveling
- Setup Time Minimization

### 10.2 Phase 3 Integration
- Python/OR-Tools microservice
- Multi-objective optimization
- Machine learning predictions

### 10.3 Advanced Features
- What-if scenario analysis
- Incremental rescheduling
- Real-time schedule updates

## 11. API Documentation

### 11.1 Schedule Endpoint

```
POST /api/scheduler/run
{
    "algorithm": "asap|due_date|balanced",
    "manufacturing_order_ids": [1, 2, 3],
    "schedule_version_id": 123,
    "options": {
        "respect_locked_steps": true,
        "generate_alerts": true,
        "start_date": "2025-01-20",
        "end_date": "2025-02-20"
    }
}

Response:
{
    "job_id": "uuid",
    "message": "Scheduling job queued",
    "channel": "scheduling.123"
}
```

### 11.2 Progress Endpoint

```
GET /api/scheduler/progress/{scheduleVersionId}

Response:
{
    "status": "running|completed|failed",
    "percentage": 45.5,
    "message": "Scheduling MO-2025-001",
    "current_step": 455,
    "total_steps": 1000
}
```

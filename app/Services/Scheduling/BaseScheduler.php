<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ProductionSchedule;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

abstract class BaseScheduler
{
    protected CapacityChecker $capacityChecker;
    protected DependencyValidator $dependencyValidator;
    protected ConflictDetector $conflictDetector;

    public function __construct(
        CapacityChecker $capacityChecker,
        DependencyValidator $dependencyValidator,
        ConflictDetector $conflictDetector
    ) {
        $this->capacityChecker = $capacityChecker;
        $this->dependencyValidator = $dependencyValidator;
        $this->conflictDetector = $conflictDetector;
    }

    /**
     * Schedule manufacturing orders.
     */
    abstract public function schedule(SchedulingRequest $request): SchedulingResult;

    /**
     * Count total steps in orders.
     */
    protected function countTotalSteps(Collection $orders): int
    {
        $count = 0;
        foreach ($orders as $order) {
            $count += $order->manufacturingRoute?->steps->count() ?? 0;
        }
        return $count;
    }

    /**
     * Check if a step is locked.
     */
    protected function isStepLocked(ManufacturingStep $step): bool
    {
        // Check if there's an existing locked schedule for this step
        $existingSchedule = ProductionSchedule::where('manufacturing_step_id', $step->id)
            ->where('is_locked', true)
            ->first();
        
        return $existingSchedule !== null;
    }

    /**
     * Get locked schedule data for a step.
     */
    protected function getLockedSchedule(ManufacturingStep $step): ?StepScheduleData
    {
        $existingSchedule = ProductionSchedule::where('manufacturing_step_id', $step->id)
            ->where('is_locked', true)
            ->first();
        
        if (!$existingSchedule) {
            return null;
        }

        $data = new StepScheduleData();
        $data->stepId = $step->id;
        $data->workCellId = $existingSchedule->work_cell_id;
        $data->scheduledStart = $existingSchedule->scheduled_start;
        $data->scheduledEnd = $existingSchedule->scheduled_end;
        $data->isLocked = true;
        
        return $data;
    }

    /**
     * Create alerts from conflicts.
     */
    protected function createAlerts(array $conflicts, ManufacturingStep $step): array
    {
        $alerts = [];
        
        foreach ($conflicts as $conflict) {
            $alerts[] = $this->conflictDetector->createAlert($conflict, $step);
        }
        
        return $alerts;
    }

    /**
     * Calculate metrics for the schedule.
     */
    protected function calculateMetrics(array $scheduledSteps): array
    {
        $metrics = [
            'total_steps' => count($scheduledSteps),
            'makespan_minutes' => 0,
            'conflicts' => 0,
            'utilization_by_workcell' => [],
        ];

        if (empty($scheduledSteps)) {
            return $metrics;
        }

        // Find earliest start and latest end
        $earliestStart = null;
        $latestEnd = null;
        
        foreach ($scheduledSteps as $schedule) {
            if (!$earliestStart || $schedule->scheduledStart < $earliestStart) {
                $earliestStart = $schedule->scheduledStart;
            }
            if (!$latestEnd || $schedule->scheduledEnd > $latestEnd) {
                $latestEnd = $schedule->scheduledEnd;
            }
            
            // Count conflicts
            if (!empty($schedule->conflicts)) {
                $metrics['conflicts'] += count($schedule->conflicts);
            }
            
            // Track utilization by work cell
            if (!isset($metrics['utilization_by_workcell'][$schedule->workCellId])) {
                $metrics['utilization_by_workcell'][$schedule->workCellId] = 0;
            }
            
            $step = ManufacturingStep::find($schedule->stepId);
            if ($step) {
                $metrics['utilization_by_workcell'][$schedule->workCellId] += 
                    $step->total_duration_minutes;
            }
        }

        // Calculate makespan
        if ($earliestStart && $latestEnd) {
            $metrics['makespan_minutes'] = 
                $earliestStart->diff($latestEnd)->days * 24 * 60 +
                $earliestStart->diff($latestEnd)->h * 60 +
                $earliestStart->diff($latestEnd)->i;
        }

        return $metrics;
    }

    /**
     * Report progress during scheduling.
     */
    protected function reportProgress(
        int $current,
        int $total,
        string $message = ''
    ): void {
        $percentage = $total > 0 ? round(($current / $total) * 100, 2) : 0;
        
        Log::info("Scheduling progress: {$percentage}% - {$message}");
        
        // TODO: Broadcast progress event
        // This will be implemented when we create the broadcasting events
    }

    /**
     * Log scheduling performance.
     */
    protected function logPerformance(
        string $algorithm,
        int $orderCount,
        int $stepCount,
        float $executionTime
    ): void {
        Log::info("Scheduling completed", [
            'algorithm' => $algorithm,
            'orders' => $orderCount,
            'steps' => $stepCount,
            'execution_time' => $executionTime,
            'steps_per_second' => $executionTime > 0 ? $stepCount / $executionTime : 0,
        ]);
    }
}

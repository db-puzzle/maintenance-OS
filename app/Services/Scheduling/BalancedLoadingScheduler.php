<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\WorkCell;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * @deprecated This scheduler is deprecated in favor of the HDG approach.
 * Use ASAPScheduler or DueDateBackwardScheduler instead.
 */
class BalancedLoadingScheduler extends BaseScheduler
{
    private array $workCellUtilization = [];

    /**
     * Distribute work evenly across work cells to maximize utilization.
     *
     * @deprecated This scheduler is deprecated. Use ASAPScheduler or DueDateBackwardScheduler instead.
     */
    public function schedule(SchedulingRequest $request): SchedulingResult
    {
        trigger_error(
            'BalancedLoadingScheduler is deprecated. Use ASAPScheduler or DueDateBackwardScheduler instead.',
            E_USER_DEPRECATED
        );

        $startTime = microtime(true);
        $result = new SchedulingResult;
        $scheduledSteps = [];

        // Initialize utilization tracking
        $this->initializeUtilizationTracking();

        // Collect all steps from all orders
        $allSteps = $this->collectAllSteps($request->manufacturingOrderIds);

        // Sort by priority and duration
        $allSteps = $allSteps->sortByDesc(function ($step) {
            $durationSeconds = ($step->setup_time_seconds ?? 0) + ($step->cycle_time_seconds ?? 0);
            if ($durationSeconds === 0) {
                $durationSeconds = 1800; // Default to 30 minutes (1800 seconds)
            }

            return $step->manufacturingRoute->manufacturingOrder->priority * 1000
                   + $durationSeconds;
        });

        $totalSteps = $allSteps->count();
        $processedSteps = 0;

        foreach ($allSteps as $step) {
            // Calculate step duration (convert seconds to minutes for compatibility)
            $durationSeconds = ($step->setup_time_seconds ?? 0) + ($step->cycle_time_seconds ?? 0);
            if ($durationSeconds === 0) {
                $durationSeconds = 1800; // Default to 30 minutes (1800 seconds) if no duration specified
            }
            $durationMinutes = (int) ceil($durationSeconds / 60);

            if ($this->isStepLocked($step)) {
                $lockedSchedule = $this->getLockedSchedule($step);
                if ($lockedSchedule) {
                    $scheduledSteps[$step->id] = $lockedSchedule;
                    $this->updateUtilization($step->work_cell_id, $durationMinutes);
                }
                $processedSteps++;
                continue;
            }

            // Find least utilized work cell that can do this operation
            $selectedWorkCell = $this->selectLeastUtilizedWorkCell(
                $step->workCell
            );

            // Get dependency constraints
            $earliestStart = $this->dependencyValidator->getEarliestStartTime(
                $step,
                $scheduledSteps
            );

            // Apply schedule start date constraint if provided
            if ($request->scheduleStartDate && $earliestStart < $request->scheduleStartDate) {
                $earliestStart = $request->scheduleStartDate;
            }

            // Find slot on selected work cell
            $scheduledStart = $this->capacityChecker->findNextAvailableSlot(
                $selectedWorkCell,
                $durationMinutes,
                $earliestStart
            );

            if (! $scheduledStart) {
                // Could not find a slot
                $result->alerts[] = $this->conflictDetector->createAlert(
                    "Could not find available slot on work cell {$selectedWorkCell->name}",
                    $step,
                    'error'
                );
                continue;
            }

            $scheduledEnd = Carbon::instance($scheduledStart)
                ->addMinutes($durationMinutes)
                ->toDateTime();

            // Create schedule data
            $stepData = new StepScheduleData;
            $stepData->stepId = $step->id;
            $stepData->workCellId = $selectedWorkCell->id;
            $stepData->scheduledStart = $scheduledStart;
            $stepData->scheduledEnd = $scheduledEnd;

            // Check for conflicts
            $conflicts = $this->conflictDetector->detectConflicts($stepData, $scheduledSteps);
            if (! empty($conflicts)) {
                $stepData->conflicts = $conflicts;
                $result->alerts = array_merge(
                    $result->alerts,
                    $this->createAlerts($conflicts, $step)
                );
            }

            // Check if order will be late
            $order = $step->manufacturingRoute->manufacturingOrder;
            if ($order->requested_date &&
                $step->display_order === $step->manufacturingRoute->steps->count()) {
                // This is the last step
                $deliveryConflict = $this->conflictDetector->checkDeliveryConflict(
                    $order,
                    $scheduledEnd
                );
                if ($deliveryConflict) {
                    $result->alerts[] = $this->conflictDetector->createAlert(
                        $deliveryConflict,
                        $step,
                        'warning'
                    );
                }
            }

            $scheduledSteps[$step->id] = $stepData;

            // Update utilization
            $this->updateUtilization($selectedWorkCell->id, $step->total_duration_minutes);

            // Report progress
            $processedSteps++;
            if ($processedSteps % 10 === 0 || $processedSteps === $totalSteps) {
                $this->reportProgress(
                    $processedSteps,
                    $totalSteps,
                    'Balancing load across work cells'
                );
            }
        }

        $result->success = true;
        $result->scheduledSteps = array_values($scheduledSteps);
        $result->metrics = $this->calculateMetrics($scheduledSteps);
        $result->metrics['utilization_variance'] = $this->calculateUtilizationVariance();
        $result->executionTime = microtime(true) - $startTime;

        $this->logPerformance(
            'Balanced Loading',
            count($request->manufacturingOrderIds),
            count($scheduledSteps),
            $result->executionTime
        );

        return $result;
    }

    /**
     * Initialize utilization tracking for all work cells.
     */
    private function initializeUtilizationTracking(): void
    {
        $this->workCellUtilization = [];

        $workCells = WorkCell::all();
        foreach ($workCells as $workCell) {
            $this->workCellUtilization[$workCell->id] = 0;
        }
    }

    /**
     * Collect all steps from specified orders.
     */
    private function collectAllSteps(array $orderIds): Collection
    {
        $orders = ManufacturingOrder::whereIn('id', $orderIds)
            ->with(['manufacturingRoute.steps.workCell', 'manufacturingRoute.steps.dependency'])
            ->get();

        $allSteps = collect();

        foreach ($orders as $order) {
            if ($order->manufacturingRoute) {
                foreach ($order->manufacturingRoute->steps as $step) {
                    $allSteps->push($step);
                }
            }
        }

        return $allSteps;
    }

    /**
     * Select the least utilized work cell that can perform the operation.
     */
    private function selectLeastUtilizedWorkCell(WorkCell $preferredWorkCell): WorkCell
    {
        // For now, we'll use the preferred work cell
        // In a more advanced implementation, we could check if other work cells
        // can perform the same operation and select the least utilized one

        $minUtilization = PHP_INT_MAX;
        $selectedWorkCell = $preferredWorkCell;

        // Check if there are alternative work cells for this operation type
        // This would require additional data about work cell capabilities
        // For now, we'll just use the assigned work cell

        return $selectedWorkCell;
    }

    /**
     * Update utilization tracking for a work cell.
     */
    private function updateUtilization(int $workCellId, int $durationMinutes): void
    {
        if (! isset($this->workCellUtilization[$workCellId])) {
            $this->workCellUtilization[$workCellId] = 0;
        }

        $this->workCellUtilization[$workCellId] += $durationMinutes;
    }

    /**
     * Calculate utilization variance across work cells.
     */
    private function calculateUtilizationVariance(): float
    {
        if (empty($this->workCellUtilization)) {
            return 0.0;
        }

        $values = array_values($this->workCellUtilization);
        $count = count($values);

        if ($count <= 1) {
            return 0.0;
        }

        $mean = array_sum($values) / $count;

        $variance = 0.0;
        foreach ($values as $value) {
            $variance += pow($value - $mean, 2);
        }

        return sqrt($variance / $count);
    }
}

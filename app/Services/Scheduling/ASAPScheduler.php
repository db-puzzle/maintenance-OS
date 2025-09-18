<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingOrder;
use Carbon\Carbon;

class ASAPScheduler extends BaseScheduler
{
    /**
     * Schedule all operations at the earliest possible time.
     */
    public function schedule(SchedulingRequest $request): SchedulingResult
    {
        $startTime = microtime(true);
        $result = new SchedulingResult;
        $scheduledSteps = [];

        // Load MOs sorted by priority
        $orders = ManufacturingOrder::whereIn('id', $request->manufacturingOrderIds)
            ->orderByDesc('priority')
            ->orderBy('order_number')
            ->with(['manufacturingRoute.steps.workCell', 'manufacturingRoute.steps.dependency'])
            ->get();

        $totalSteps = $this->countTotalSteps($orders);
        $processedSteps = 0;

        foreach ($orders as $order) {
            if (! $order->manufacturingRoute) {
                continue;
            }

            // Sort steps by dependency order
            $steps = $this->dependencyValidator->sortByDependencies(
                $order->manufacturingRoute->steps->all()
            );

            foreach ($steps as $step) {
                // Skip if locked
                if ($this->isStepLocked($step)) {
                    $lockedSchedule = $this->getLockedSchedule($step);
                    if ($lockedSchedule) {
                        $scheduledSteps[$step->id] = $lockedSchedule;
                    }
                    $processedSteps++;
                    continue;
                }

                // Find earliest possible start considering dependencies
                $earliestStart = $this->dependencyValidator->getEarliestStartTime(
                    $step,
                    $scheduledSteps
                );

                // Apply schedule start date constraint if provided
                if ($request->scheduleStartDate && $earliestStart < $request->scheduleStartDate) {
                    $earliestStart = $request->scheduleStartDate;
                }

                // Calculate step duration
                $durationMinutes = ($step->setup_time_minutes ?? 0) + ($step->cycle_time_minutes ?? 0);
                if ($durationMinutes === 0) {
                    $durationMinutes = 30; // Default to 30 minutes if no duration specified
                }

                // Find available slot on work cell
                $scheduledStart = $this->capacityChecker->findNextAvailableSlot(
                    $step->workCell,
                    $durationMinutes,
                    $earliestStart
                );

                if (! $scheduledStart) {
                    // Could not find a slot within reasonable time
                    $result->alerts[] = $this->conflictDetector->createAlert(
                        'Could not find available slot for step',
                        $step,
                        'error'
                    );
                    continue;
                }

                // Calculate end time
                $scheduledEnd = Carbon::instance($scheduledStart)
                    ->addMinutes($durationMinutes)
                    ->toDateTime();

                // Create schedule data
                $stepData = new StepScheduleData;
                $stepData->stepId = $step->id;
                $stepData->workCellId = $step->work_cell_id;
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
                if ($step->display_order === $order->manufacturingRoute->steps->count()) {
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

                // Report progress
                $processedSteps++;
                if ($processedSteps % 10 === 0 || $processedSteps === $totalSteps) {
                    $this->reportProgress(
                        $processedSteps,
                        $totalSteps,
                        "Scheduling {$order->order_number}"
                    );
                }
            }
        }

        $result->success = true;
        $result->scheduledSteps = array_values($scheduledSteps);
        $result->metrics = $this->calculateMetrics($scheduledSteps);
        $result->executionTime = microtime(true) - $startTime;

        $this->logPerformance(
            'ASAP',
            $orders->count(),
            count($scheduledSteps),
            $result->executionTime
        );

        return $result;
    }
}

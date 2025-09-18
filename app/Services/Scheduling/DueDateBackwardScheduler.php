<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingOrder;
use Carbon\Carbon;

class DueDateBackwardScheduler extends BaseScheduler
{
    /**
     * Schedule operations as late as possible while meeting due dates.
     */
    public function schedule(SchedulingRequest $request): SchedulingResult
    {
        $startTime = microtime(true);
        $result = new SchedulingResult;
        $scheduledSteps = [];

        // Load MOs sorted by requested date
        $orders = ManufacturingOrder::whereIn('id', $request->manufacturingOrderIds)
            ->orderBy('requested_date')
            ->with(['manufacturingRoute.steps.workCell', 'manufacturingRoute.steps.dependency'])
            ->get();

        $totalSteps = $this->countTotalSteps($orders);
        $processedSteps = 0;

        foreach ($orders as $order) {
            if (! $order->manufacturingRoute || ! $order->requested_date) {
                continue;
            }

            $targetEndDate = Carbon::parse($order->requested_date)->endOfDay();

            // Apply schedule end date constraint if provided
            if ($request->scheduleEndDate && $targetEndDate > Carbon::instance($request->scheduleEndDate)) {
                $targetEndDate = Carbon::instance($request->scheduleEndDate);
            }

            // Get steps in reverse order
            $steps = $order->manufacturingRoute->steps()
                ->orderByDesc('display_order')
                ->get();

            // First pass: schedule backwards
            $tempSchedule = [];

            foreach ($steps as $step) {
                // Calculate step duration
                $durationMinutes = ($step->setup_time_minutes ?? 0) + ($step->cycle_time_minutes ?? 0);
                if ($durationMinutes === 0) {
                    $durationMinutes = 30; // Default to 30 minutes if no duration specified
                }

                if ($this->isStepLocked($step)) {
                    $lockedSchedule = $this->getLockedSchedule($step);
                    if ($lockedSchedule) {
                        $tempSchedule[$step->id] = $lockedSchedule;
                        // Adjust target for previous steps
                        $targetEndDate = Carbon::instance($lockedSchedule->scheduledStart);
                    }
                    continue;
                }

                // Calculate latest possible times
                $latestEnd = $targetEndDate;
                $latestStart = $latestEnd->copy()->subMinutes($durationMinutes);

                // Find available slot working backwards
                $slot = $this->capacityChecker->findBackwardSlot(
                    $step->workCell,
                    $durationMinutes,
                    $latestEnd->toDateTime()
                );

                if (! $slot || Carbon::instance($slot['start'])->lt(Carbon::now())) {
                    // Can't meet deadline, schedule forward instead
                    $slot = $this->scheduleForwardFromNow($step, $scheduledSteps);

                    $alert = $this->conflictDetector->createAlert(
                        "Order {$order->order_number} will be late - cannot meet requested date",
                        $step,
                        'warning'
                    );
                    $result->alerts[] = $alert;
                }

                // Create schedule data
                $stepData = new StepScheduleData;
                $stepData->stepId = $step->id;
                $stepData->workCellId = $step->work_cell_id;
                $stepData->scheduledStart = $slot['start'];
                $stepData->scheduledEnd = $slot['end'];

                $tempSchedule[$step->id] = $stepData;

                // Update target for previous step
                $targetEndDate = Carbon::instance($slot['start']);
            }

            // Second pass: validate dependencies and adjust if needed
            $steps = $this->dependencyValidator->sortByDependencies(
                $order->manufacturingRoute->steps->all()
            );

            foreach ($steps as $step) {
                if (! isset($tempSchedule[$step->id])) {
                    continue;
                }

                $stepData = $tempSchedule[$step->id];

                // Check dependencies
                if ($step->dependency_id && isset($scheduledSteps[$step->dependency_id])) {
                    $dependencyEnd = $scheduledSteps[$step->dependency_id]->scheduledEnd;

                    if (Carbon::instance($stepData->scheduledStart)->lt(Carbon::instance($dependencyEnd))) {
                        // Need to adjust forward
                        $newSlot = $this->capacityChecker->findNextAvailableSlot(
                            $step->workCell,
                            $durationMinutes,
                            $dependencyEnd
                        );

                        if ($newSlot) {
                            $stepData->scheduledStart = $newSlot;
                            $stepData->scheduledEnd = Carbon::instance($newSlot)
                                ->addMinutes($step->total_duration_minutes)
                                ->toDateTime();
                        }
                    }
                }

                // Check for conflicts
                $conflicts = $this->conflictDetector->detectConflicts($stepData, $scheduledSteps);
                if (! empty($conflicts)) {
                    $stepData->conflicts = $conflicts;
                    $result->alerts = array_merge(
                        $result->alerts,
                        $this->createAlerts($conflicts, $step)
                    );
                }

                $scheduledSteps[$step->id] = $stepData;

                // Report progress
                $processedSteps++;
                if ($processedSteps % 10 === 0 || $processedSteps === $totalSteps) {
                    $this->reportProgress(
                        $processedSteps,
                        $totalSteps,
                        "Backward scheduling {$order->order_number}"
                    );
                }
            }
        }

        $result->success = true;
        $result->scheduledSteps = array_values($scheduledSteps);
        $result->metrics = $this->calculateMetrics($scheduledSteps);
        $result->executionTime = microtime(true) - $startTime;

        $this->logPerformance(
            'Due Date Backward',
            $orders->count(),
            count($scheduledSteps),
            $result->executionTime
        );

        return $result;
    }

    /**
     * Schedule forward from current time when backward scheduling fails.
     */
    private function scheduleForwardFromNow($step, array $existingSchedules): array
    {
        // Calculate step duration
        $durationMinutes = ($step->setup_time_minutes ?? 0) + ($step->cycle_time_minutes ?? 0);
        if ($durationMinutes === 0) {
            $durationMinutes = 30; // Default to 30 minutes if no duration specified
        }

        $earliestStart = $this->dependencyValidator->getEarliestStartTime(
            $step,
            $existingSchedules
        );

        if ($earliestStart < Carbon::now()->toDateTime()) {
            $earliestStart = Carbon::now()->toDateTime();
        }

        $scheduledStart = $this->capacityChecker->findNextAvailableSlot(
            $step->workCell,
            $durationMinutes,
            $earliestStart
        );

        if (! $scheduledStart) {
            $scheduledStart = $earliestStart;
        }

        return [
            'start' => $scheduledStart,
            'end' => Carbon::instance($scheduledStart)
                ->addMinutes($durationMinutes)
                ->toDateTime(),
        ];
    }
}

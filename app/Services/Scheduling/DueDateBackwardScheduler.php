<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingOrder;
use App\Services\Scheduling\Exceptions\SchedulingValidationException;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class DueDateBackwardScheduler extends BaseScheduler
{
    /**
     * Schedule operations as late as possible while meeting due dates using HDG approach.
     */
    public function schedule(SchedulingRequest $request): SchedulingResult
    {
        $startTime = microtime(true);

        // Load MOs with full relationships needed for family scheduling
        $orders = ManufacturingOrder::whereIn('id', $request->manufacturingOrderIds)
            ->with([
                'manufacturingRoute.steps.workCell',
                'manufacturingRoute.steps.dependency',
                'children',
                'parent',
            ])
            ->get();

        // For backward scheduling, we need to modify the family scheduling approach
        // to consider due dates and schedule from the end
        $result = $this->scheduleByFamiliesBackward($orders, $request);

        $result->executionTime = microtime(true) - $startTime;

        $this->logPerformance(
            'DueDate-HDG',
            $orders->count(),
            count($result->scheduledSteps),
            $result->executionTime
        );

        return $result;
    }

    /**
     * Schedule families backward from their due dates.
     */
    protected function scheduleByFamiliesBackward(
        Collection $orders,
        SchedulingRequest $request
    ): SchedulingResult {
        $result = new SchedulingResult;
        $scheduledSteps = [];
        $totalSteps = 0;
        $processedSteps = 0;

        try {
            // Group orders by families
            $families = $this->familyService->groupOrdersByFamily($orders);

            // Sort families by earliest due date (urgent first)
            $families = $families->sortBy(function ($family) {
                $earliestDue = null;
                foreach ($family['members'] as $member) {
                    if ($member->requested_date) {
                        if (! $earliestDue || $member->requested_date < $earliestDue) {
                            $earliestDue = $member->requested_date;
                        }
                    }
                }

                return $earliestDue;
            })->values();

            // Count total steps
            foreach ($families as $family) {
                $totalSteps += $family['total_steps'];
            }

            // Schedule each family
            foreach ($families as $familyIndex => $family) {
                $familyStartTime = microtime(true);

                $familyNumber = $familyIndex + 1;
                $this->reportProgress(
                    $processedSteps,
                    $totalSteps,
                    "Backward scheduling family {$family['top_parent']->order_number} ({$familyNumber} of {$families->count()})"
                );

                try {
                    // Find the family's target end date
                    $familyDueDate = $this->getFamilyDueDate($family['members'], $request);

                    if (! $familyDueDate) {
                        // No due date - schedule forward from current time
                        $familySchedule = $this->familyCapacityService->reserveFamilyCapacity(
                            $family['members'],
                            $request->scheduleStartDate ?? now(),
                            $scheduledSteps
                        );
                    } else {
                        // Schedule backward from due date
                        $familySchedule = $this->scheduleFamilyBackward(
                            $family['members'],
                            $familyDueDate,
                            $scheduledSteps
                        );
                    }

                    if ($familySchedule === null) {
                        // Could not schedule this family
                        $result->alerts[] = [
                            'type' => 'family_scheduling_failed',
                            'severity' => 'error',
                            'message' => "Could not find capacity to schedule family {$family['top_parent']->order_number} by due date",
                            'family' => $family['top_parent']->order_number,
                            'due_date' => $familyDueDate ? $familyDueDate->format('Y-m-d') : 'None',
                            'orders' => $family['members']->pluck('order_number')->toArray(),
                        ];

                        // Try forward scheduling as fallback
                        $familySchedule = $this->familyCapacityService->reserveFamilyCapacity(
                            $family['members'],
                            $request->scheduleStartDate ?? now(),
                            $scheduledSteps
                        );

                        if ($familySchedule !== null) {
                            $result->alerts[] = [
                                'type' => 'family_rescheduled_forward',
                                'severity' => 'warning',
                                'message' => "Family {$family['top_parent']->order_number} scheduled forward - will miss due date",
                                'family' => $family['top_parent']->order_number,
                            ];
                        }
                    }

                    if ($familySchedule !== null) {
                        // Merge family schedule into overall schedule
                        $scheduledSteps = array_merge($scheduledSteps, $familySchedule);
                    }

                    $processedSteps += $family['total_steps'];
                } catch (SchedulingValidationException $e) {
                    // Production time validation failed
                    $result->alerts[] = [
                        'type' => 'validation_error',
                        'severity' => 'error',
                        'message' => $e->getMessage(),
                        'family' => $family['top_parent']->order_number,
                        'validation_errors' => $e->getValidationErrors(),
                    ];
                    $result->success = false;

                    return $result;
                } catch (\Exception $e) {
                    $result->alerts[] = [
                        'type' => 'family_error',
                        'severity' => 'error',
                        'message' => 'Error scheduling family: ' . $e->getMessage(),
                        'family' => $family['top_parent']->order_number,
                    ];

                    // Continue with next family
                    $processedSteps += $family['total_steps'];
                    continue;
                }

                $familyExecutionTime = microtime(true) - $familyStartTime;
                Log::info('Family backward scheduled', [
                    'family' => $family['top_parent']->order_number,
                    'orders' => $family['total_orders'],
                    'steps' => $family['total_steps'],
                    'execution_time' => $familyExecutionTime,
                ]);
            }

            $result->success = ! empty($scheduledSteps);
            $result->scheduledSteps = array_values($scheduledSteps);
            $result->metrics = $this->calculateMetrics($scheduledSteps);
            $result->metrics['families_processed'] = $families->count();
        } catch (\Exception $e) {
            $result->success = false;
            $result->alerts[] = [
                'type' => 'scheduler_error',
                'severity' => 'error',
                'message' => 'Scheduler error: ' . $e->getMessage(),
            ];
        }

        return $result;
    }

    /**
     * Get the due date for a family (earliest due date among members).
     */
    protected function getFamilyDueDate(Collection $familyMembers, SchedulingRequest $request): ?Carbon
    {
        $dueDate = null;

        foreach ($familyMembers as $member) {
            if ($member->requested_date) {
                $memberDue = Carbon::parse($member->requested_date)->endOfDay();
                if (! $dueDate || $memberDue < $dueDate) {
                    $dueDate = $memberDue;
                }
            }
        }

        // Apply schedule end date constraint if provided
        if ($request->scheduleEndDate && $dueDate && $dueDate > Carbon::instance($request->scheduleEndDate)) {
            $dueDate = Carbon::instance($request->scheduleEndDate);
        }

        return $dueDate;
    }

    /**
     * Schedule a family backward from a target end date.
     */
    protected function scheduleFamilyBackward(
        Collection $familyMembers,
        Carbon $targetEndDate,
        array $existingSchedules
    ): ?array {
        // Calculate total duration needed for the family
        $totalDuration = $this->calculateFamilyTotalDuration($familyMembers);

        // Calculate when we need to start to meet the due date
        $requiredStartDate = $targetEndDate->copy()->subMinutes($totalDuration);

        // If required start is in the past, we can't meet the due date
        if ($requiredStartDate < now()) {
            // Try starting from now instead
            return $this->familyCapacityService->reserveFamilyCapacity(
                $familyMembers,
                now(),
                $existingSchedules
            );
        }

        // Try to schedule starting from the required date
        return $this->familyCapacityService->reserveFamilyCapacity(
            $familyMembers,
            $requiredStartDate->toDateTime(),
            $existingSchedules
        );
    }

    /**
     * Calculate approximate total duration for a family.
     */
    protected function calculateFamilyTotalDuration(Collection $familyMembers): int
    {
        $maxPathDuration = 0;

        // For each top-level order, calculate the critical path duration
        foreach ($familyMembers->where('parent_id', null) as $topOrder) {
            $pathDuration = $this->calculateOrderPathDuration($topOrder, $familyMembers);
            if ($pathDuration > $maxPathDuration) {
                $maxPathDuration = $pathDuration;
            }
        }

        // Add some buffer for capacity constraints (20%)
        return (int) ($maxPathDuration * 1.2);
    }

    /**
     * Calculate the critical path duration for an order and its children.
     */
    protected function calculateOrderPathDuration(ManufacturingOrder $order, Collection $allFamilyMembers): int
    {
        $duration = 0;

        // Add duration of this order's steps
        if ($order->manufacturingRoute) {
            foreach ($order->manufacturingRoute->steps as $step) {
                $stepDurationSeconds = ($step->setup_time_seconds ?? 0) + ($step->cycle_time_seconds ?? 0);
                $stepDuration = (int) ceil($stepDurationSeconds / 60); // Convert to minutes
                if ($stepDuration === 0) {
                    $stepDuration = 30; // Default
                }
                $duration += $stepDuration;
            }
        }

        // Add duration of child orders (if any)
        $children = $allFamilyMembers->where('parent_id', $order->id);
        if ($children->isNotEmpty()) {
            $maxChildDuration = 0;
            foreach ($children as $child) {
                $childDuration = $this->calculateOrderPathDuration($child, $allFamilyMembers);
                if ($childDuration > $maxChildDuration) {
                    $maxChildDuration = $childDuration;
                }
            }
            // Some overlap is possible with gates, so reduce child duration by 20%
            $duration += (int) ($maxChildDuration * 0.8);
        }

        return $duration;
    }
}

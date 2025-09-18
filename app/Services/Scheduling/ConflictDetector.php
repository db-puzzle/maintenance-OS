<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use Carbon\Carbon;
use DateTime;

class ConflictDetector
{
    /**
     * Detect scheduling conflicts.
     */
    public function detectConflicts(
        StepScheduleData $stepData,
        array $existingSchedule
    ): array {
        $conflicts = [];

        // Check for capacity conflicts
        $capacityConflict = $this->checkCapacityConflict(
            $stepData->workCellId,
            $stepData->scheduledStart,
            $stepData->scheduledEnd,
            $existingSchedule
        );
        if ($capacityConflict) {
            $conflicts[] = $capacityConflict;
        }

        // Check for dependency violations
        $step = ManufacturingStep::find($stepData->stepId);
        if ($step && $step->dependency_id) {
            $dependencyConflict = $this->checkDependencyConflict(
                $step,
                $stepData->scheduledStart,
                $existingSchedule
            );
            if ($dependencyConflict) {
                $conflicts[] = $dependencyConflict;
            }
        }

        return $conflicts;
    }

    /**
     * Check for capacity overrun.
     */
    public function checkCapacityConflict(
        int $workCellId,
        DateTime $start,
        DateTime $end,
        array $existingSchedule
    ): ?string {
        $workCell = WorkCell::find($workCellId);
        if (! $workCell) {
            return null;
        }

        foreach ($existingSchedule as $schedule) {
            if ($schedule->workCellId !== $workCellId) {
                continue;
            }

            // Check for time overlap
            if ($this->timePeriodsOverlap(
                $start,
                $end,
                $schedule->scheduledStart,
                $schedule->scheduledEnd
            )) {
                return "Work cell {$workCell->name} is double-booked from " .
                       Carbon::instance($start)->format('Y-m-d H:i') . ' to ' .
                       Carbon::instance($end)->format('Y-m-d H:i');
            }
        }

        return null;
    }

    /**
     * Check for late delivery.
     */
    public function checkDeliveryConflict(
        ManufacturingOrder $order,
        DateTime $completionDate
    ): ?string {
        if (! $order->requested_date) {
            return null;
        }

        $completion = Carbon::instance($completionDate);
        $requested = Carbon::instance($order->requested_date);

        if ($completion->isAfter($requested)) {
            $daysLate = $requested->diffInDays($completion);

            return "Order {$order->order_number} will be {$daysLate} days late";
        }

        return null;
    }

    /**
     * Check for dependency violation.
     */
    public function checkDependencyConflict(
        ManufacturingStep $step,
        DateTime $scheduledStart,
        array $existingSchedule
    ): ?string {
        if (! $step->dependency_id) {
            return null;
        }

        // Find dependency schedule
        $dependencySchedule = null;
        foreach ($existingSchedule as $schedule) {
            if ($schedule->stepId === $step->dependency_id) {
                $dependencySchedule = $schedule;
                break;
            }
        }

        if (! $dependencySchedule) {
            return "Dependency step {$step->dependency_id} is not scheduled";
        }

        $start = Carbon::instance($scheduledStart);
        $dependencyEnd = Carbon::instance($dependencySchedule->scheduledEnd);

        if ($start->isBefore($dependencyEnd)) {
            return 'Step scheduled before dependency completes. ' .
                   'Dependency ends at ' . $dependencyEnd->format('Y-m-d H:i');
        }

        return null;
    }

    /**
     * Create alert for a conflict.
     */
    public function createAlert(
        string $conflictMessage,
        ManufacturingStep $step,
        string $severity = 'error',
        array $context = []
    ): array {
        // Determine alert type based on message content
        $alertType = 'scheduling_conflict';
        if (str_contains($conflictMessage, 'double-booked') || str_contains($conflictMessage, 'capacity')) {
            $alertType = 'capacity_overrun';
        } elseif (str_contains($conflictMessage, 'late') || str_contains($conflictMessage, 'delivery')) {
            $alertType = 'late_delivery';
        } elseif (str_contains($conflictMessage, 'dependency')) {
            $alertType = 'dependency_violation';
        }

        // Get manufacturing order ID safely
        $manufacturingOrderId = null;
        if ($step->relationLoaded('manufacturingRoute') && $step->manufacturingRoute) {
            $manufacturingOrderId = $step->manufacturingRoute->manufacturing_order_id;
        } elseif ($step->manufacturing_route_id) {
            // If we have the route ID, we can get the order ID from the route
            $route = \App\Models\Production\ManufacturingRoute::find($step->manufacturing_route_id);
            if ($route) {
                $manufacturingOrderId = $route->manufacturing_order_id;
            }
        }

        // Build details safely
        $details = [
            'step_name' => $step->name,
        ];

        if ($step->relationLoaded('workCell') && $step->workCell) {
            $details['work_cell'] = $step->workCell->name;
        } else {
            $details['work_cell'] = 'Work Cell ID: ' . $step->work_cell_id;
        }

        if ($step->relationLoaded('manufacturingRoute') &&
            $step->manufacturingRoute &&
            $step->manufacturingRoute->relationLoaded('manufacturingOrder') &&
            $step->manufacturingRoute->manufacturingOrder) {
            $details['order_number'] = $step->manufacturingRoute->manufacturingOrder->order_number;
        } else {
            $details['order_number'] = 'Unknown';
        }

        // Return raw data array for creating ScheduleAlert model
        return [
            'alert_type' => $alertType,
            'severity' => $severity,
            'manufacturing_step_id' => $step->id,
            'work_cell_id' => $step->work_cell_id,
            'manufacturing_order_id' => $manufacturingOrderId,
            'message' => $conflictMessage,
            'details' => array_merge($details, $context),
            'is_resolved' => false,
        ];
    }

    /**
     * Check if two time periods overlap.
     */
    private function timePeriodsOverlap(
        DateTime $start1,
        DateTime $end1,
        DateTime $start2,
        DateTime $end2
    ): bool {
        $s1 = Carbon::instance($start1);
        $e1 = Carbon::instance($end1);
        $s2 = Carbon::instance($start2);
        $e2 = Carbon::instance($end2);

        return $s1->lt($e2) && $e1->gt($s2);
    }

    /**
     * Analyze schedule quality and generate warnings.
     */
    public function analyzeScheduleQuality(
        array $scheduledSteps,
        array $orders
    ): array {
        $warnings = [];

        // Check for excessive gaps between dependent steps
        foreach ($scheduledSteps as $schedule) {
            $step = ManufacturingStep::find($schedule->stepId);
            if (! $step || ! $step->dependency_id) {
                continue;
            }

            $dependencySchedule = $scheduledSteps[$step->dependency_id] ?? null;
            if ($dependencySchedule) {
                $gap = Carbon::instance($dependencySchedule->scheduledEnd)
                    ->diffInMinutes(Carbon::instance($schedule->scheduledStart));

                if ($gap > 60) { // More than 1 hour gap
                    $warnings[] = "Large gap ({$gap} minutes) between dependent steps";
                }
            }
        }

        // Check for uneven work cell loading
        $workCellLoads = [];
        foreach ($scheduledSteps as $schedule) {
            if (! isset($workCellLoads[$schedule->workCellId])) {
                $workCellLoads[$schedule->workCellId] = 0;
            }
            $step = ManufacturingStep::find($schedule->stepId);
            if ($step) {
                $workCellLoads[$schedule->workCellId] += $step->total_duration_minutes;
            }
        }

        if (count($workCellLoads) > 1) {
            $avgLoad = array_sum($workCellLoads) / count($workCellLoads);
            foreach ($workCellLoads as $workCellId => $load) {
                $variance = abs($load - $avgLoad) / $avgLoad * 100;
                if ($variance > 50) { // More than 50% variance
                    $workCell = WorkCell::find($workCellId);
                    $warnings[] = "Work cell {$workCell->name} has " .
                                ($load > $avgLoad ? 'high' : 'low') .
                                ' load compared to average';
                }
            }
        }

        return $warnings;
    }
}

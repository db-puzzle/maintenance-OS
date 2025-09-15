<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\ScheduleAlert;
use App\Models\Production\ScheduleVersion;
use App\Models\Production\WorkCell;
use App\Models\Production\WorkCellCapacityBooking;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SchedulingService
{
    /**
     * Copy schedules from one version to another.
     */
    public function copySchedules(ScheduleVersion $sourceVersion, ScheduleVersion $targetVersion): void
    {
        $sourceSchedules = $sourceVersion->productionSchedules()
            ->with('capacityBooking')
            ->get();

        foreach ($sourceSchedules as $sourceSchedule) {
            $newSchedule = $targetVersion->productionSchedules()->create([
                'manufacturing_step_id' => $sourceSchedule->manufacturing_step_id,
                'scheduled_start' => $sourceSchedule->scheduled_start,
                'scheduled_end' => $sourceSchedule->scheduled_end,
                'work_cell_id' => $sourceSchedule->work_cell_id,
                'is_locked' => $sourceSchedule->is_locked,
                'locked_by' => $sourceSchedule->locked_by,
                'locked_at' => $sourceSchedule->locked_at,
            ]);

            // Create capacity booking
            WorkCellCapacityBooking::createFromSchedule($newSchedule);
        }
    }

    /**
     * Get schedule data for display.
     */
    public function getScheduleData(ScheduleVersion $version, $startDate, $endDate, array $workCellIds = []): array
    {
        $query = ManufacturingOrder::schedulable()
            ->with([
                'item',
                'parent',
                'children',
                'manufacturingRoute.steps' => function ($query) use ($version) {
                    $query->with(['workCell', 'dependency', 'productionSchedules' => function ($q) use ($version) {
                        $q->where('schedule_version_id', $version->id)
                            ->with(['workCell', 'lockedBy']);
                    }]);
                },
            ]);

        if (!empty($workCellIds)) {
            $query->whereHas('manufacturingRoute.steps.workCell', function ($q) use ($workCellIds) {
                $q->whereIn('id', $workCellIds);
            });
        }

        $orders = $query->get();

        // Build hierarchical structure
        $rootOrders = $orders->whereNull('parent_id');
        $result = [];

        foreach ($rootOrders as $order) {
            $result[] = $this->buildOrderHierarchy($order, $orders);
        }

        return [
            'orders' => $result,
            'workCells' => $this->getWorkCellsData($workCellIds),
            'alerts' => $version->alerts()->unresolved()->get(),
        ];
    }

    /**
     * Build hierarchical order structure.
     */
    private function buildOrderHierarchy(ManufacturingOrder $order, Collection $allOrders): array
    {
        $children = $allOrders->where('parent_id', $order->id)->values();
        
        $steps = [];
        if ($order->manufacturingRoute) {
            $steps = $order->manufacturingRoute->steps->map(function ($step) {
                $schedule = $step->productionSchedules->first();
                
                return [
                    'id' => $step->id,
                    'name' => $step->name,
                    'step_number' => $step->step_number,
                    'step_type' => $step->step_type,
                    'status' => $step->status,
                    'work_cell_id' => $step->work_cell_id,
                    'work_cell' => $step->workCell,
                    'setup_time_minutes' => $step->setup_time_minutes,
                    'cycle_time_minutes' => $step->cycle_time_minutes,
                    'depends_on_step_id' => $step->depends_on_step_id,
                    'can_start_when_dependency' => $step->can_start_when_dependency,
                    'schedule' => $schedule ? [
                        'id' => $schedule->id,
                        'scheduled_start' => $schedule->scheduled_start,
                        'scheduled_end' => $schedule->scheduled_end,
                        'is_locked' => $schedule->is_locked,
                        'locked_by' => $schedule->lockedBy,
                    ] : null,
                ];
            })->toArray();
        }

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'item' => $order->item,
            'quantity' => $order->quantity,
            'quantity_completed' => $order->quantity_completed,
            'status' => $order->status,
            'priority' => $order->priority,
            'requested_date' => $order->requested_date,
            'planned_start_date' => $order->planned_start_date,
            'planned_end_date' => $order->planned_end_date,
            'progress_percentage' => $order->progress_percentage,
            'steps' => $steps,
            'children' => $children->map(function ($child) use ($allOrders) {
                return $this->buildOrderHierarchy($child, $allOrders);
            })->toArray(),
        ];
    }

    /**
     * Get work cells data with availability.
     */
    private function getWorkCellsData(array $workCellIds = []): Collection
    {
        $query = WorkCell::with(['shift', 'plant', 'area', 'sector'])
            ->where('is_active', true);

        if (!empty($workCellIds)) {
            $query->whereIn('id', $workCellIds);
        }

        return $query->get();
    }

    /**
     * Get work cell availability for a date range.
     */
    public function getWorkCellAvailability(WorkCell $workCell, $startDate, $endDate): array
    {
        $bookings = WorkCellCapacityBooking::forWorkCell($workCell->id)
            ->withinDateRange($startDate, $endDate)
            ->orderBy('start_time')
            ->get();

        $unavailablePeriods = [];
        
        // Add shift-based unavailable periods
        $currentDate = Carbon::parse($startDate)->startOfDay();
        $endDateCarbon = Carbon::parse($endDate)->endOfDay();
        
        while ($currentDate <= $endDateCarbon) {
            // Check if it's a working day based on shift
            if (!$this->isWorkingDay($workCell, $currentDate)) {
                $unavailablePeriods[] = [
                    'start' => $currentDate->copy()->startOfDay(),
                    'end' => $currentDate->copy()->endOfDay(),
                    'type' => 'non_working_day',
                    'reason' => 'Non-working day',
                ];
            } else {
                // Add non-working hours
                $workingHours = $this->getWorkingHours($workCell, $currentDate);
                
                // Before work hours
                if ($workingHours['start']->greaterThan($currentDate->copy()->startOfDay())) {
                    $unavailablePeriods[] = [
                        'start' => $currentDate->copy()->startOfDay(),
                        'end' => $workingHours['start'],
                        'type' => 'non_working_hours',
                        'reason' => 'Outside working hours',
                    ];
                }
                
                // After work hours
                if ($workingHours['end']->lessThan($currentDate->copy()->endOfDay())) {
                    $unavailablePeriods[] = [
                        'start' => $workingHours['end'],
                        'end' => $currentDate->copy()->endOfDay(),
                        'type' => 'non_working_hours',
                        'reason' => 'Outside working hours',
                    ];
                }
            }
            
            $currentDate->addDay();
        }

        // Add maintenance and other bookings
        foreach ($bookings as $booking) {
            if ($booking->booking_type !== 'scheduled') {
                $unavailablePeriods[] = [
                    'start' => $booking->start_time,
                    'end' => $booking->end_time,
                    'type' => $booking->booking_type,
                    'reason' => $booking->reason,
                ];
            }
        }

        return [
            'work_cell_id' => $workCell->id,
            'bookings' => $bookings,
            'unavailable_periods' => $unavailablePeriods,
        ];
    }

    /**
     * Check if a date is a working day for a work cell.
     */
    private function isWorkingDay(WorkCell $workCell, Carbon $date): bool
    {
        // For now, assume Monday-Friday are working days
        // This should be enhanced to check shift schedules
        return $date->isWeekday();
    }

    /**
     * Get working hours for a work cell on a specific date.
     */
    private function getWorkingHours(WorkCell $workCell, Carbon $date): array
    {
        // Default 8 AM to 5 PM
        // This should be enhanced to use actual shift data
        return [
            'start' => $date->copy()->setTime(8, 0),
            'end' => $date->copy()->setTime(17, 0),
        ];
    }

    /**
     * Run scheduling algorithm.
     */
    public function runScheduler(ScheduleVersion $version, string $algorithm, array $options = []): void
    {
        DB::transaction(function () use ($version, $algorithm, $options) {
            // Clear existing schedules if not preserving locked
            if (!($options['preserve_locked'] ?? true)) {
                $version->productionSchedules()->delete();
            } else {
                // Delete only unlocked schedules
                $version->productionSchedules()->unlocked()->delete();
            }

            // Clear existing alerts
            $version->alerts()->delete();

            // Get orders to schedule
            $orderIds = $options['manufacturing_order_ids'] ?? [];
            $orders = $this->getOrdersToSchedule($orderIds);

            // Run the selected algorithm
            switch ($algorithm) {
                case 'asap':
                    $this->scheduleASAP($version, $orders, $options);
                    break;
                case 'jit':
                    $this->scheduleJIT($version, $orders, $options);
                    break;
                case 'critical_path':
                    $this->scheduleCriticalPath($version, $orders, $options);
                    break;
                case 'priority':
                    $this->schedulePriority($version, $orders, $options);
                    break;
                case 'forward':
                    $this->scheduleForward($version, $orders, $options);
                    break;
                case 'backward':
                    $this->scheduleBackward($version, $orders, $options);
                    break;
                default:
                    throw new \InvalidArgumentException("Unknown scheduling algorithm: {$algorithm}");
            }

            // Validate the schedule
            $this->validateSchedule($version);
        });
    }

    /**
     * Get orders to schedule.
     */
    private function getOrdersToSchedule(array $orderIds = []): Collection
    {
        $query = ManufacturingOrder::schedulable()
            ->with(['manufacturingRoute.steps.workCell', 'item']);

        if (!empty($orderIds)) {
            $query->whereIn('id', $orderIds);
        }

        return $query->get();
    }

    /**
     * ASAP (As Soon As Possible) scheduling algorithm.
     */
    private function scheduleASAP(ScheduleVersion $version, Collection $orders, array $options): void
    {
        $startDate = isset($options['start_date']) ? Carbon::parse($options['start_date']) : now();
        
        // Sort orders by priority and requested date
        $sortedOrders = $orders->sortByDesc('priority')->sortBy('requested_date');

        foreach ($sortedOrders as $order) {
            if (!$order->manufacturingRoute) {
                continue;
            }

            $steps = $order->manufacturingRoute->steps()->orderBy('step_number')->get();
            $previousStepEnd = null;

            foreach ($steps as $step) {
                // Check if step is already locked
                $existingSchedule = $step->getScheduleForVersion($version->id);
                if ($existingSchedule && $existingSchedule->is_locked) {
                    $previousStepEnd = $existingSchedule->scheduled_end;
                    continue;
                }

                // Calculate duration
                $duration = $step->setup_time_minutes + ($step->cycle_time_minutes * $order->quantity);
                
                // Find earliest available slot
                $scheduledStart = $this->findEarliestAvailableSlot(
                    $step->workCell,
                    $duration,
                    $previousStepEnd ?? $startDate,
                    $version
                );

                $scheduledEnd = $scheduledStart->copy()->addMinutes($duration);

                // Create schedule
                $schedule = ProductionSchedule::create([
                    'manufacturing_step_id' => $step->id,
                    'scheduled_start' => $scheduledStart,
                    'scheduled_end' => $scheduledEnd,
                    'work_cell_id' => $step->work_cell_id,
                    'schedule_version_id' => $version->id,
                ]);

                // Create capacity booking
                WorkCellCapacityBooking::createFromSchedule($schedule);

                $previousStepEnd = $scheduledEnd;
            }

            // Update order planned dates
            $order->updatePlannedDatesFromSchedule($version->id);
        }
    }

    /**
     * Find earliest available slot for a work cell.
     */
    private function findEarliestAvailableSlot(
        WorkCell $workCell,
        int $durationMinutes,
        Carbon $earliestStart,
        ScheduleVersion $version
    ): Carbon {
        $currentTime = $earliestStart->copy();
        
        // Get all bookings for this work cell
        $bookings = WorkCellCapacityBooking::forWorkCell($workCell->id)
            ->where('start_time', '>=', $earliestStart)
            ->orderBy('start_time')
            ->get();

        while (true) {
            // Adjust to working hours
            $currentTime = $this->adjustToWorkingHours($workCell, $currentTime);
            
            $proposedEnd = $currentTime->copy()->addMinutes($durationMinutes);
            
            // Check if this slot conflicts with any booking
            $hasConflict = false;
            foreach ($bookings as $booking) {
                if ($booking->overlapsWithTimeRange($currentTime, $proposedEnd)) {
                    $hasConflict = true;
                    $currentTime = $booking->end_time->copy();
                    break;
                }
            }
            
            if (!$hasConflict) {
                // Check if the entire duration fits within working hours
                if ($this->fitsWithinWorkingHours($workCell, $currentTime, $proposedEnd)) {
                    return $currentTime;
                } else {
                    // Move to next working day
                    $currentTime = $this->getNextWorkingDayStart($workCell, $currentTime);
                }
            }
        }
    }

    /**
     * Adjust time to working hours.
     */
    private function adjustToWorkingHours(WorkCell $workCell, Carbon $time): Carbon
    {
        if (!$this->isWorkingDay($workCell, $time)) {
            return $this->getNextWorkingDayStart($workCell, $time);
        }

        $workingHours = $this->getWorkingHours($workCell, $time);
        
        if ($time->lessThan($workingHours['start'])) {
            return $workingHours['start']->copy();
        }
        
        if ($time->greaterThanOrEqualTo($workingHours['end'])) {
            return $this->getNextWorkingDayStart($workCell, $time);
        }
        
        return $time;
    }

    /**
     * Check if duration fits within working hours.
     */
    private function fitsWithinWorkingHours(WorkCell $workCell, Carbon $start, Carbon $end): bool
    {
        // For simplicity, assume it fits if both start and end are on the same working day
        // This should be enhanced to handle multi-day scheduling
        if (!$start->isSameDay($end)) {
            return false;
        }
        
        $workingHours = $this->getWorkingHours($workCell, $start);
        
        return $start->greaterThanOrEqualTo($workingHours['start']) && 
               $end->lessThanOrEqualTo($workingHours['end']);
    }

    /**
     * Get next working day start time.
     */
    private function getNextWorkingDayStart(WorkCell $workCell, Carbon $currentTime): Carbon
    {
        $nextDay = $currentTime->copy()->addDay()->startOfDay();
        
        while (!$this->isWorkingDay($workCell, $nextDay)) {
            $nextDay->addDay();
        }
        
        $workingHours = $this->getWorkingHours($workCell, $nextDay);
        return $workingHours['start'];
    }

    /**
     * JIT (Just In Time) scheduling algorithm.
     */
    private function scheduleJIT(ScheduleVersion $version, Collection $orders, array $options): void
    {
        // Sort orders by requested date (latest first for backward scheduling)
        $sortedOrders = $orders->sortByDesc('requested_date');

        foreach ($sortedOrders as $order) {
            if (!$order->manufacturingRoute || !$order->requested_date) {
                continue;
            }

            $steps = $order->manufacturingRoute->steps()->orderByDesc('step_number')->get();
            $nextStepStart = Carbon::parse($order->requested_date)->endOfDay();

            foreach ($steps as $step) {
                // Check if step is already locked
                $existingSchedule = $step->getScheduleForVersion($version->id);
                if ($existingSchedule && $existingSchedule->is_locked) {
                    $nextStepStart = $existingSchedule->scheduled_start;
                    continue;
                }

                // Calculate duration
                $duration = $step->setup_time_minutes + ($step->cycle_time_minutes * $order->quantity);
                
                // Find latest available slot before next step
                $scheduledEnd = $nextStepStart;
                $scheduledStart = $scheduledEnd->copy()->subMinutes($duration);

                // Adjust to working hours
                $scheduledStart = $this->adjustToWorkingHours($step->workCell, $scheduledStart);
                $scheduledEnd = $scheduledStart->copy()->addMinutes($duration);

                // Create schedule
                $schedule = ProductionSchedule::create([
                    'manufacturing_step_id' => $step->id,
                    'scheduled_start' => $scheduledStart,
                    'scheduled_end' => $scheduledEnd,
                    'work_cell_id' => $step->work_cell_id,
                    'schedule_version_id' => $version->id,
                ]);

                // Create capacity booking
                WorkCellCapacityBooking::createFromSchedule($schedule);

                $nextStepStart = $scheduledStart;
            }

            // Update order planned dates
            $order->updatePlannedDatesFromSchedule($version->id);
        }
    }

    /**
     * Priority-based scheduling algorithm.
     */
    private function schedulePriority(ScheduleVersion $version, Collection $orders, array $options): void
    {
        // This is similar to ASAP but with strict priority ordering
        $this->scheduleASAP($version, $orders, $options);
    }

    /**
     * Critical path scheduling algorithm.
     */
    private function scheduleCriticalPath(ScheduleVersion $version, Collection $orders, array $options): void
    {
        // For now, use ASAP as a placeholder
        // A full critical path implementation would identify the longest path through the network
        $this->scheduleASAP($version, $orders, $options);
    }

    /**
     * Forward scheduling algorithm.
     */
    private function scheduleForward(ScheduleVersion $version, Collection $orders, array $options): void
    {
        // Forward scheduling is essentially ASAP from a specific start date
        $this->scheduleASAP($version, $orders, $options);
    }

    /**
     * Backward scheduling algorithm.
     */
    private function scheduleBackward(ScheduleVersion $version, Collection $orders, array $options): void
    {
        // Backward scheduling is essentially JIT
        $this->scheduleJIT($version, $orders, $options);
    }

    /**
     * Validate schedule and generate alerts.
     */
    public function validateSchedule(ScheduleVersion $version): void
    {
        // Clear existing alerts
        $version->alerts()->delete();

        // Check for capacity overruns
        $this->checkCapacityOverruns($version);

        // Check for dependency violations
        $this->checkDependencyViolations($version);

        // Check for late deliveries
        $this->checkLateDeliveries($version);
    }

    /**
     * Check for capacity overruns.
     */
    private function checkCapacityOverruns(ScheduleVersion $version): void
    {
        $schedules = $version->productionSchedules()
            ->with('workCell')
            ->get()
            ->groupBy('work_cell_id');

        foreach ($schedules as $workCellId => $workCellSchedules) {
            // Sort by start time
            $sorted = $workCellSchedules->sortBy('scheduled_start');
            
            // Check for overlaps
            for ($i = 0; $i < $sorted->count() - 1; $i++) {
                $current = $sorted->values()[$i];
                $next = $sorted->values()[$i + 1];
                
                if ($current->scheduled_end > $next->scheduled_start) {
                    ScheduleAlert::create([
                        'schedule_version_id' => $version->id,
                        'alert_type' => 'capacity_overrun',
                        'severity' => 'error',
                        'work_cell_id' => $workCellId,
                        'message' => "Work cell {$current->workCell->name} is double-booked between {$current->scheduled_end} and {$next->scheduled_start}",
                    ]);
                }
            }
        }
    }

    /**
     * Check for dependency violations.
     */
    private function checkDependencyViolations(ScheduleVersion $version): void
    {
        $schedules = $version->productionSchedules()
            ->with(['manufacturingStep.dependency'])
            ->get();

        foreach ($schedules as $schedule) {
            $step = $schedule->manufacturingStep;
            
            if (!$step->depends_on_step_id) {
                continue;
            }

            $dependencySchedule = $step->dependency->getScheduleForVersion($version->id);
            
            if (!$dependencySchedule) {
                ScheduleAlert::create([
                    'schedule_version_id' => $version->id,
                    'alert_type' => 'dependency_violation',
                    'severity' => 'error',
                    'manufacturing_step_id' => $step->id,
                    'message' => "Step '{$step->name}' depends on '{$step->dependency->name}' which is not scheduled",
                ]);
                continue;
            }

            // Check timing based on dependency type
            if ($step->can_start_when_dependency === 'completed') {
                if ($schedule->scheduled_start < $dependencySchedule->scheduled_end) {
                    ScheduleAlert::create([
                        'schedule_version_id' => $version->id,
                        'alert_type' => 'dependency_violation',
                        'severity' => 'error',
                        'manufacturing_step_id' => $step->id,
                        'message' => "Step '{$step->name}' is scheduled to start before dependency '{$step->dependency->name}' completes",
                    ]);
                }
            }
        }
    }

    /**
     * Check for late deliveries.
     */
    private function checkLateDeliveries(ScheduleVersion $version): void
    {
        $orders = ManufacturingOrder::whereHas('manufacturingRoute.steps.productionSchedules', function ($query) use ($version) {
                $query->where('schedule_version_id', $version->id);
            })
            ->with(['manufacturingRoute.steps.productionSchedules' => function ($query) use ($version) {
                $query->where('schedule_version_id', $version->id);
            }])
            ->whereNotNull('requested_date')
            ->get();

        foreach ($orders as $order) {
            $lastStep = $order->manufacturingRoute->steps()
                ->orderByDesc('step_number')
                ->first();

            if (!$lastStep) {
                continue;
            }

            $lastSchedule = $lastStep->getScheduleForVersion($version->id);
            
            if ($lastSchedule && $lastSchedule->scheduled_end > $order->requested_date) {
                ScheduleAlert::create([
                    'schedule_version_id' => $version->id,
                    'alert_type' => 'late_delivery',
                    'severity' => 'warning',
                    'manufacturing_order_id' => $order->id,
                    'message' => "Order {$order->order_number} will be delivered late. Scheduled: {$lastSchedule->scheduled_end->format('Y-m-d')}, Requested: {$order->requested_date->format('Y-m-d')}",
                ]);
            }
        }
    }
}
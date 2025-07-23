<?php

namespace App\Services\Production;

use App\Models\Production\ProductionOrder;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\BomItem;
use App\Models\Production\WorkCell;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProductionSchedulingService
{
    protected RoutingInheritanceService $routingService;

    public function __construct(RoutingInheritanceService $routingService)
    {
        $this->routingService = $routingService;
    }

    /**
     * Schedule production for an order.
     */
    public function scheduleProduction(ProductionOrder $order): void
    {
        DB::transaction(function () use ($order) {
            // Get BOM and routing information
            $bom = $order->billOfMaterial;
            if (!$bom) {
                throw new \Exception('Production order must have a BOM assigned.');
            }

            $currentVersion = $bom->currentVersion;
            if (!$currentVersion) {
                throw new \Exception('BOM must have a current version.');
            }

            // Get all items that need routing
            $itemsWithRouting = $this->getItemsRequiringRouting($currentVersion);

            // Schedule items in dependency order
            $this->scheduleItemsInOrder($order, $itemsWithRouting);

            // Update order status
            $order->update(['status' => 'planned']);
        });
    }

    /**
     * Optimize schedule for a date range.
     */
    public function optimizeSchedule(Carbon $startDate, Carbon $endDate): array
    {
        $schedules = ProductionSchedule::inDateRange($startDate, $endDate)
            ->with(['productionOrder', 'routingStep', 'workCell'])
            ->get()
            ->groupBy('work_cell_id');

        $optimizations = [];

        foreach ($schedules as $workCellId => $cellSchedules) {
            $optimized = $this->optimizeWorkCellSchedule($cellSchedules);
            $optimizations[$workCellId] = $optimized;
        }

        return $optimizations;
    }

    /**
     * Check capacity constraints for schedules.
     */
    public function checkCapacityConstraints(array $schedules): array
    {
        $constraints = [];

        // Group schedules by work cell and date
        $groupedSchedules = collect($schedules)->groupBy(function ($schedule) {
            return $schedule['work_cell_id'] . '-' . Carbon::parse($schedule['scheduled_start'])->format('Y-m-d');
        });

        foreach ($groupedSchedules as $key => $daySchedules) {
            [$workCellId, $date] = explode('-', $key, 2);
            
            $workCell = WorkCell::find($workCellId);
            if (!$workCell) {
                continue;
            }

            $totalMinutes = $daySchedules->sum(function ($schedule) {
                return Carbon::parse($schedule['scheduled_end'])
                    ->diffInMinutes(Carbon::parse($schedule['scheduled_start']));
            });

            $availableMinutes = $workCell->available_hours_per_day * 60;

            if ($totalMinutes > $availableMinutes) {
                $constraints[] = [
                    'work_cell_id' => $workCellId,
                    'work_cell_name' => $workCell->name,
                    'date' => $date,
                    'scheduled_minutes' => $totalMinutes,
                    'available_minutes' => $availableMinutes,
                    'over_capacity_minutes' => $totalMinutes - $availableMinutes,
                ];
            }
        }

        return $constraints;
    }

    /**
     * Reschedule a production schedule.
     */
    public function reschedule(ProductionSchedule $schedule, Carbon $newStartTime): void
    {
        // Calculate duration
        $duration = $schedule->scheduled_start->diffInMinutes($schedule->scheduled_end);
        
        // Check work cell availability
        $newEndTime = $newStartTime->copy()->addMinutes($duration);
        
        if (!$schedule->workCell->isAvailable($newStartTime, $newEndTime)) {
            throw new \Exception('Work cell is not available for the requested time slot.');
        }

        // Update schedule
        $schedule->update([
            'scheduled_start' => $newStartTime,
            'scheduled_end' => $newEndTime,
        ]);

        // Check if this affects dependent schedules
        $this->cascadeReschedule($schedule);
    }

    /**
     * Calculate lead time for a production order.
     */
    public function calculateLeadTime(ProductionOrder $order): array
    {
        $bom = $order->billOfMaterial;
        if (!$bom) {
            return [
                'total_days' => 0,
                'total_hours' => 0,
                'critical_path' => [],
            ];
        }

        $currentVersion = $bom->currentVersion;
        $itemsWithRouting = $this->getItemsRequiringRouting($currentVersion);

        $totalMinutes = 0;
        $criticalPath = [];

        foreach ($itemsWithRouting as $item) {
            $routing = $this->routingService->resolveRouting($item);
            if (!$routing) {
                continue;
            }

            $itemTime = $routing->total_time * $order->quantity;
            $totalMinutes += $itemTime;

            $criticalPath[] = [
                'item_number' => $item->item_number,
                'item_name' => $item->name,
                'routing_time' => $routing->total_time,
                'total_time' => $itemTime,
            ];
        }

        // Convert to working days (assuming 8 hours per day)
        $totalHours = $totalMinutes / 60;
        $totalDays = ceil($totalHours / 8);

        return [
            'total_days' => $totalDays,
            'total_hours' => $totalHours,
            'total_minutes' => $totalMinutes,
            'critical_path' => $criticalPath,
        ];
    }

    /**
     * Get items requiring routing in dependency order.
     */
    protected function getItemsRequiringRouting($bomVersion): Collection
    {
        $items = $bomVersion->items()
            ->orderBy('level', 'desc')
            ->orderBy('sequence_number')
            ->get();

        return $items->filter(function ($item) {
            return $this->routingService->resolveRouting($item) !== null;
        });
    }

    /**
     * Schedule items in dependency order.
     */
    protected function scheduleItemsInOrder(ProductionOrder $order, Collection $items): void
    {
        $scheduledItems = [];
        $currentDate = $order->planned_start_date ?? now();

        // Group items by level (bottom-up)
        $itemsByLevel = $items->groupBy('level')->sortKeysDesc();

        foreach ($itemsByLevel as $level => $levelItems) {
            foreach ($levelItems as $item) {
                // Check dependencies
                $canSchedule = $this->checkDependencies($item, $scheduledItems);
                
                if (!$canSchedule) {
                    continue;
                }

                // Get routing
                $routing = $this->routingService->resolveRouting($item);
                if (!$routing) {
                    continue;
                }

                // Schedule each routing step
                $stepStartDate = $this->getEarliestStartDate($item, $scheduledItems, $currentDate);
                
                foreach ($routing->getEffectiveSteps() as $step) {
                    $schedule = $this->createScheduleForStep(
                        $order,
                        $step,
                        $stepStartDate,
                        $order->quantity
                    );

                    $stepStartDate = $schedule->scheduled_end;
                    $scheduledItems[$item->id][] = $schedule;
                }
            }
        }
    }

    /**
     * Create schedule for a routing step.
     */
    protected function createScheduleForStep($order, $step, $startDate, $quantity)
    {
        // Calculate time required
        $totalMinutes = $step->setup_time_minutes + 
                       ($step->cycle_time_minutes * $quantity) + 
                       $step->tear_down_time_minutes;

        // Find available slot
        $workCell = $step->workCell;
        $scheduledStart = $this->findAvailableSlot($workCell, $startDate, $totalMinutes);
        $scheduledEnd = $scheduledStart->copy()->addMinutes($totalMinutes);

        // Create schedule
        return ProductionSchedule::create([
            'production_order_id' => $order->id,
            'routing_step_id' => $step->id,
            'work_cell_id' => $workCell->id,
            'scheduled_start' => $scheduledStart,
            'scheduled_end' => $scheduledEnd,
            'buffer_time_minutes' => 15, // Default buffer
            'status' => 'scheduled',
        ]);
    }

    /**
     * Find available slot in work cell.
     */
    protected function findAvailableSlot(WorkCell $workCell, Carbon $desiredStart, int $durationMinutes): Carbon
    {
        $searchStart = $desiredStart->copy();
        $maxSearchDays = 30;
        $daysSearched = 0;

        while ($daysSearched < $maxSearchDays) {
            // Skip weekends
            if ($searchStart->isWeekend()) {
                $searchStart->next(Carbon::MONDAY);
                continue;
            }

            // Check working hours
            $dayStart = $searchStart->copy()->setTime(8, 0);
            $dayEnd = $searchStart->copy()->setTime(17, 0);

            // If desired start is before working hours, adjust
            if ($searchStart < $dayStart) {
                $searchStart = $dayStart;
            }

            // Check if duration fits in the day
            $proposedEnd = $searchStart->copy()->addMinutes($durationMinutes);
            
            if ($proposedEnd <= $dayEnd) {
                // Check availability
                if ($workCell->isAvailable($searchStart, $proposedEnd)) {
                    return $searchStart;
                }
            }

            // Move to next slot or day
            $nextSlot = $this->getNextAvailableSlot($workCell, $searchStart);
            if ($nextSlot && $nextSlot->isSameDay($searchStart)) {
                $searchStart = $nextSlot;
            } else {
                $searchStart = $searchStart->copy()->addDay()->setTime(8, 0);
                $daysSearched++;
            }
        }

        // If no slot found, return the desired start (will create conflict)
        return $desiredStart;
    }

    /**
     * Get next available slot after a given time.
     */
    protected function getNextAvailableSlot(WorkCell $workCell, Carbon $afterTime): ?Carbon
    {
        $dayEnd = $afterTime->copy()->setTime(17, 0);
        
        $nextSchedule = ProductionSchedule::where('work_cell_id', $workCell->id)
            ->where('scheduled_start', '>=', $afterTime)
            ->where('scheduled_start', '<', $dayEnd)
            ->orderBy('scheduled_start')
            ->first();

        if ($nextSchedule) {
            return $nextSchedule->scheduled_end->copy()->addMinutes(5); // 5 min buffer
        }

        return null;
    }

    /**
     * Check if item dependencies are met.
     */
    protected function checkDependencies(BomItem $item, array $scheduledItems): bool
    {
        foreach ($item->children as $child) {
            if ($this->routingService->resolveRouting($child) && !isset($scheduledItems[$child->id])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get earliest start date considering dependencies.
     */
    protected function getEarliestStartDate(BomItem $item, array $scheduledItems, Carbon $orderStartDate): Carbon
    {
        $earliestDate = $orderStartDate->copy();

        foreach ($item->children as $child) {
            if (isset($scheduledItems[$child->id])) {
                $childSchedules = $scheduledItems[$child->id];
                $lastSchedule = end($childSchedules);
                
                if ($lastSchedule && $lastSchedule->scheduled_end > $earliestDate) {
                    $earliestDate = $lastSchedule->scheduled_end->copy();
                }
            }
        }

        return $earliestDate;
    }

    /**
     * Optimize work cell schedule.
     */
    protected function optimizeWorkCellSchedule(Collection $schedules): array
    {
        // Sort by priority and start time
        $sorted = $schedules->sortBy([
            ['productionOrder.priority', 'desc'],
            ['scheduled_start', 'asc'],
        ]);

        $optimized = [];
        $currentTime = null;

        foreach ($sorted as $schedule) {
            if ($currentTime === null) {
                $currentTime = $schedule->scheduled_start;
            }

            // Check for gaps
            if ($schedule->scheduled_start > $currentTime) {
                // There's a gap, move schedule earlier if possible
                $duration = $schedule->scheduled_start->diffInMinutes($schedule->scheduled_end);
                $newStart = $currentTime;
                $newEnd = $currentTime->copy()->addMinutes($duration);

                $optimized[] = [
                    'original' => $schedule,
                    'new_start' => $newStart,
                    'new_end' => $newEnd,
                    'time_saved' => $schedule->scheduled_start->diffInMinutes($newStart),
                ];

                $currentTime = $newEnd;
            } else {
                $currentTime = $schedule->scheduled_end;
            }
        }

        return $optimized;
    }

    /**
     * Cascade reschedule to dependent schedules.
     */
    protected function cascadeReschedule(ProductionSchedule $schedule): void
    {
        // Find schedules that depend on this one
        $order = $schedule->productionOrder;
        $affectedSchedules = ProductionSchedule::where('production_order_id', $order->id)
            ->where('scheduled_start', '>=', $schedule->scheduled_end)
            ->orderBy('scheduled_start')
            ->get();

        foreach ($affectedSchedules as $affected) {
            // Check if rescheduling is needed
            if ($affected->scheduled_start < $schedule->scheduled_end) {
                $newStart = $schedule->scheduled_end->copy()->addMinutes(5); // Buffer
                $duration = $affected->scheduled_start->diffInMinutes($affected->scheduled_end);
                
                $affected->update([
                    'scheduled_start' => $newStart,
                    'scheduled_end' => $newStart->copy()->addMinutes($duration),
                ]);
            }
        }
    }
}
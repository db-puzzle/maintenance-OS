<?php

namespace App\Services\Scheduling;

use App\Models\Production\ProductionSchedule;
use App\Models\Production\WorkCell;
use Carbon\Carbon;
use DateTime;
use Illuminate\Support\Collection;

class CapacityChecker
{
    private array $capacityCache = [];

    /**
     * Check if work cell is available during time period.
     */
    public function isAvailable(
        WorkCell $workCell,
        DateTime $start,
        DateTime $end,
        ?int $excludeScheduleId = null
    ): bool {
        $conflicts = $this->getConflictingSchedules(
            $workCell,
            $start,
            $end,
            $excludeScheduleId
        );

        return $conflicts->isEmpty();
    }

    /**
     * Find next available slot of given duration.
     */
    public function findNextAvailableSlot(
        WorkCell $workCell,
        int $durationMinutes,
        DateTime $afterTime
    ): ?DateTime {
        $start = Carbon::instance($afterTime);
        $maxSearchDays = 30; // Search up to 30 days ahead
        $endSearch = $start->copy()->addDays($maxSearchDays);

        \Log::debug('CapacityChecker::findNextAvailableSlot - Start search', [
            'work_cell' => $workCell->name,
            'duration_minutes' => $durationMinutes,
            'after_time' => $afterTime->format('Y-m-d H:i:s'),
            'search_until' => $endSearch->format('Y-m-d H:i:s'),
        ]);

        $iterationCount = 0;
        $maxIterations = 1000; // Prevent infinite loops

        while ($start < $endSearch && $iterationCount < $maxIterations) {
            $iterationCount++;
            $end = $start->copy()->addMinutes($durationMinutes);

            \Log::debug('CapacityChecker::findNextAvailableSlot - Checking slot', [
                'iteration' => $iterationCount,
                'start' => $start->format('Y-m-d H:i:s'),
                'end' => $end->format('Y-m-d H:i:s'),
                'work_cell' => $workCell->name,
            ]);

            // Check if this slot is available
            if ($this->isAvailable($workCell, $start->toDateTime(), $end->toDateTime())) {
                // Also check shift constraints if applicable
                if ($this->isWithinShiftHours($workCell, $start, $end)) {
                    \Log::info('CapacityChecker::findNextAvailableSlot - Found available slot', [
                        'work_cell' => $workCell->name,
                        'slot_start' => $start->format('Y-m-d H:i:s'),
                        'slot_end' => $end->format('Y-m-d H:i:s'),
                        'duration_minutes' => $durationMinutes,
                    ]);

                    return $start->toDateTime();
                } else {
                    \Log::debug('CapacityChecker::findNextAvailableSlot - Slot not within shift hours', [
                        'start' => $start->format('Y-m-d H:i:s'),
                        'end' => $end->format('Y-m-d H:i:s'),
                    ]);
                }
            }

            // Move to next potential slot
            $conflicts = $this->getConflictingSchedules(
                $workCell,
                $start->toDateTime(),
                $end->toDateTime()
            );

            if ($conflicts->isNotEmpty()) {
                // Jump past the conflict
                $start = Carbon::parse($conflicts->first()->scheduled_end)->addMinute();
            } else {
                // No conflict but not within shift, try next shift
                $start = $this->getNextShiftStart($workCell, $start);
            }
        }

        return null;
    }

    /**
     * Find an available slot working backwards from a target end time.
     */
    public function findBackwardSlot(
        WorkCell $workCell,
        int $durationMinutes,
        DateTime $latestEnd
    ): ?array {
        $end = Carbon::instance($latestEnd);
        $minSearchDate = Carbon::now()->startOfDay();

        while ($end > $minSearchDate) {
            $start = $end->copy()->subMinutes($durationMinutes);

            // Don't schedule in the past
            if ($start < Carbon::now()) {
                return null;
            }

            // Check if this slot is available
            if ($this->isAvailable($workCell, $start->toDateTime(), $end->toDateTime())) {
                // Also check shift constraints
                if ($this->isWithinShiftHours($workCell, $start, $end)) {
                    return [
                        'start' => $start->toDateTime(),
                        'end' => $end->toDateTime(),
                    ];
                }
            }

            // Move to previous potential slot
            $conflicts = $this->getConflictingSchedules(
                $workCell,
                $start->toDateTime(),
                $end->toDateTime()
            );

            if ($conflicts->isNotEmpty()) {
                // Jump before the conflict
                $end = Carbon::parse($conflicts->last()->scheduled_start)->subMinute();
            } else {
                // No conflict but not within shift, try previous shift
                $end = $this->getPreviousShiftEnd($workCell, $end);
            }
        }

        return null;
    }

    /**
     * Get work cell utilization for date range.
     */
    public function getUtilization(
        WorkCell $workCell,
        DateTime $start,
        DateTime $end
    ): float {
        $totalMinutes = Carbon::instance($start)->diffInMinutes(Carbon::instance($end));

        if ($totalMinutes <= 0) {
            return 0.0;
        }

        $schedules = ProductionSchedule::where('work_cell_id', $workCell->id)
            ->where('scheduled_start', '>=', $start)
            ->where('scheduled_end', '<=', $end)
            ->get();

        $busyMinutes = 0;
        foreach ($schedules as $schedule) {
            $busyMinutes += Carbon::parse($schedule->scheduled_start)
                ->diffInMinutes(Carbon::parse($schedule->scheduled_end));
        }

        return min(100, ($busyMinutes / $totalMinutes) * 100);
    }

    /**
     * Get conflicting schedules for a work cell and time period.
     */
    private function getConflictingSchedules(
        WorkCell $workCell,
        DateTime $start,
        DateTime $end,
        ?int $excludeScheduleId = null
    ): Collection {
        $query = ProductionSchedule::where('work_cell_id', $workCell->id)
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('scheduled_start', [$start, $end])
                    ->orWhereBetween('scheduled_end', [$start, $end])
                    ->orWhere(function ($q2) use ($start, $end) {
                        $q2->where('scheduled_start', '<=', $start)
                            ->where('scheduled_end', '>=', $end);
                    });
            });

        if ($excludeScheduleId !== null) {
            $query->where('id', '!=', $excludeScheduleId);
        }

        return $query->orderBy('scheduled_start')->get();
    }

    /**
     * Check if time period is within shift hours.
     * For now, assume 24/7 operation. Can be enhanced later.
     */
    private function isWithinShiftHours(
        WorkCell $workCell,
        Carbon $start,
        Carbon $end
    ): bool {
        // TODO: Implement shift checking based on work cell configuration
        // For now, allow scheduling 24/7
        return true;
    }

    /**
     * Get next shift start time.
     */
    private function getNextShiftStart(WorkCell $workCell, Carbon $after): Carbon
    {
        // TODO: Implement based on shift configuration
        // For now, just return the next hour
        return $after->copy()->addHour()->startOfHour();
    }

    /**
     * Get previous shift end time.
     */
    private function getPreviousShiftEnd(WorkCell $workCell, Carbon $before): Carbon
    {
        // TODO: Implement based on shift configuration
        // For now, just return the previous hour
        return $before->copy()->subHour()->endOfHour();
    }

    /**
     * Clear the capacity cache.
     */
    public function clearCache(): void
    {
        $this->capacityCache = [];
    }
}

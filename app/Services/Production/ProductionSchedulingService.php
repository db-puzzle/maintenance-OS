<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
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
    public function scheduleProduction(ManufacturingOrder $order): void
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
    public function optimizeSchedule($startDate, $endDate, array $workCellIds = []): array
    {
        $steps = ManufacturingStep::query()
            ->whereIn('status', ['pending', 'queued'])
            ->when(!empty($workCellIds), function ($query) use ($workCellIds) {
                $query->whereIn('work_cell_id', $workCellIds);
            })
            ->whereHas('manufacturingRoute.manufacturingOrder', function ($query) use ($startDate, $endDate) {
                $query->whereBetween('planned_start_date', [$startDate, $endDate]);
            })
            ->with(['manufacturingRoute.manufacturingOrder', 'workCell'])
            ->get();

        $improvements = [];
        $totalTimeSaved = 0;

        // Group by work cell
        $stepsByWorkCell = $steps->groupBy('work_cell_id');

        foreach ($stepsByWorkCell as $workCellId => $workCellSteps) {
            $optimized = $this->optimizeWorkCellSchedule($workCellSteps);
            if ($optimized['time_saved'] > 0) {
                $improvements[] = $optimized;
                $totalTimeSaved += $optimized['time_saved'];
            }
        }

        return [
            'improvements' => $improvements,
            'total_time_saved_hours' => round($totalTimeSaved / 60, 2),
            'steps_optimized' => collect($improvements)->sum('steps_affected'),
        ];
    }

    /**
     * Get workload analysis for work cells.
     */
    public function getWorkloadAnalysis($startDate, $endDate, array $workCellIds = []): array
    {
        $workCells = WorkCell::query()
            ->when(!empty($workCellIds), function ($query) use ($workCellIds) {
                $query->whereIn('id', $workCellIds);
            })
            ->get();

        $analysis = [];

        foreach ($workCells as $workCell) {
            $steps = ManufacturingStep::query()
                ->where('work_cell_id', $workCell->id)
                ->whereIn('status', ['queued', 'in_progress'])
                ->whereHas('manufacturingRoute.manufacturingOrder', function ($query) use ($startDate, $endDate) {
                    $query->where(function ($q) use ($startDate, $endDate) {
                        $q->whereBetween('planned_start_date', [$startDate, $endDate])
                          ->orWhereBetween('planned_end_date', [$startDate, $endDate]);
                    });
                })
                ->with('manufacturingRoute.manufacturingOrder')
                ->get();

            $totalMinutes = 0;
            $utilizationByDay = [];

            foreach ($steps as $step) {
                $stepMinutes = $step->setup_time_minutes + 
                             ($step->cycle_time_minutes * $step->manufacturingRoute->manufacturingOrder->quantity);
                $totalMinutes += $stepMinutes;
            }

            // Calculate daily capacity (8 hours * efficiency factor)
            $dailyCapacityMinutes = 480 * ($workCell->efficiency_percentage / 100);
            $workingDays = Carbon::parse($startDate)->diffInWeekdays(Carbon::parse($endDate));
            $totalCapacity = $dailyCapacityMinutes * $workingDays;

            $analysis[] = [
                'work_cell' => $workCell,
                'total_load_hours' => round($totalMinutes / 60, 2),
                'total_capacity_hours' => round($totalCapacity / 60, 2),
                'utilization_percentage' => $totalCapacity > 0 ? round(($totalMinutes / $totalCapacity) * 100, 2) : 0,
                'step_count' => $steps->count(),
                'is_overloaded' => $totalMinutes > $totalCapacity,
            ];
        }

        return $analysis;
    }

    /**
     * Calculate lead time for manufacturing order.
     */
    public function calculateLeadTime(ManufacturingOrder $order): array
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
    protected function scheduleItemsInOrder(ManufacturingOrder $order, Collection $items): void
    {
        // Create manufacturing route for the order if it doesn't exist
        if (!$order->manufacturingRoute) {
            $order->manufacturingRoute()->create([
                'item_id' => $order->item_id,
                'name' => "Route for {$order->order_number}",
                'created_by' => auth()->id(),
            ]);
        }

        $route = $order->manufacturingRoute;
        $stepNumber = 1;

        // Group items by level (bottom-up)
        $itemsByLevel = $items->groupBy('level')->sortKeysDesc();

        foreach ($itemsByLevel as $level => $levelItems) {
            foreach ($levelItems as $item) {
                // Get routing template
                $routingTemplate = $this->routingService->resolveRouting($item);
                if (!$routingTemplate) {
                    continue;
                }

                // Create manufacturing steps from template
                foreach ($routingTemplate->steps as $templateStep) {
                    $route->steps()->create([
                        'step_number' => $stepNumber++,
                        'step_type' => $templateStep->step_type ?? 'standard',
                        'name' => $templateStep->name,
                        'description' => $templateStep->description,
                        'work_cell_id' => $templateStep->work_cell_id,
                        'form_id' => $templateStep->form_id,
                        'setup_time_minutes' => $templateStep->setup_time_minutes,
                        'cycle_time_minutes' => $templateStep->cycle_time_minutes,
                        'status' => 'pending',
                        'quality_check_mode' => $templateStep->quality_check_mode ?? null,
                        'sampling_size' => $templateStep->sampling_size ?? null,
                    ]);
                }
            }
        }
    }

    /**
     * Optimize work cell schedule.
     */
    protected function optimizeWorkCellSchedule(Collection $steps): array
    {
        // Sort by priority and setup similarity
        $optimized = $steps->sortBy(function ($step) {
            return [
                $step->manufacturingRoute->manufacturingOrder->priority,
                $step->setup_time_minutes,
            ];
        });

        $originalTime = $this->calculateTotalTime($steps);
        $optimizedTime = $this->calculateTotalTime($optimized);
        $timeSaved = $originalTime - $optimizedTime;

        return [
            'work_cell_id' => $steps->first()->work_cell_id,
            'work_cell_name' => $steps->first()->workCell->name,
            'steps_affected' => $steps->count(),
            'original_time_hours' => round($originalTime / 60, 2),
            'optimized_time_hours' => round($optimizedTime / 60, 2),
            'time_saved' => $timeSaved,
        ];
    }

    /**
     * Calculate total time for a set of steps.
     */
    protected function calculateTotalTime(Collection $steps): int
    {
        $totalMinutes = 0;
        $previousStep = null;

        foreach ($steps as $step) {
            // Add setup time if switching between different types
            if ($previousStep && $previousStep->work_cell_id !== $step->work_cell_id) {
                $totalMinutes += 30; // Changeover time
            }

            $totalMinutes += $step->setup_time_minutes;
            $totalMinutes += $step->cycle_time_minutes * $step->manufacturingRoute->manufacturingOrder->quantity;

            $previousStep = $step;
        }

        return $totalMinutes;
    }

    /**
     * Check if dependencies are met.
     */
    protected function checkDependencies($item, array $scheduledItems): bool
    {
        // For now, assume all dependencies are met
        // This would check if required sub-assemblies are scheduled
        return true;
    }

    /**
     * Get earliest start date based on dependencies.
     */
    protected function getEarliestStartDate($item, array $scheduledItems, Carbon $defaultDate): Carbon
    {
        // For now, return the default date
        // This would calculate based on dependency completion dates
        return $defaultDate;
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
                $searchStart->addDay();
                continue;
            }

            // Check if slot is available
            $searchEnd = $searchStart->copy()->addMinutes($durationMinutes);
            
            $conflictingSteps = ManufacturingStep::query()
                ->where('work_cell_id', $workCell->id)
                ->whereIn('status', ['queued', 'in_progress'])
                ->whereHas('executions', function ($query) use ($searchStart, $searchEnd) {
                    $query->where(function ($q) use ($searchStart, $searchEnd) {
                        $q->whereBetween('started_at', [$searchStart, $searchEnd])
                          ->orWhereBetween('completed_at', [$searchStart, $searchEnd])
                          ->orWhere(function ($q2) use ($searchStart, $searchEnd) {
                              $q2->where('started_at', '<=', $searchStart)
                                 ->where('completed_at', '>=', $searchEnd);
                          });
                    });
                })
                ->exists();

            if (!$conflictingSteps) {
                return $searchStart;
            }

            // Try next hour
            $searchStart->addHour();
            $daysSearched = $searchStart->diffInDays($desiredStart);
        }

        // If no slot found, return the desired start date anyway
        return $desiredStart;
    }
}
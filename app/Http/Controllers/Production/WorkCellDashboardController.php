<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\WorkCell;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class WorkCellDashboardController extends Controller
{
    public function show(Request $request, WorkCell $workCell)
    {
        $this->authorize('viewDashboard', $workCell);
        
        // Get current user's permissions
        $canExecute = auth()->user()->can('production.steps.execute');
        
        // Date range for historical data (default: last 7 days)
        $startDate = $request->input('start_date', Carbon::now()->subDays(7)->startOfDay());
        $endDate = $request->input('end_date', Carbon::now()->endOfDay());
        
        // Current Work Queue
        $currentWork = $this->getCurrentWork($workCell);
        
        // Completed Work (Backward View)
        $completedWork = $this->getCompletedWork($workCell, $startDate, $endDate);
        
        // Incoming Work (Forward View)
        $incomingWork = $this->getIncomingWork($workCell);
        
        // Work Cell Statistics
        $statistics = $this->getWorkCellStatistics($workCell, $startDate, $endDate);
        
        // Current operators
        $activeOperators = $this->getActiveOperators($workCell);
        
        return Inertia::render('production/work-cells/dashboard', [
            'workCell' => $workCell,
            'currentWork' => $currentWork,
            'completedWork' => $completedWork,
            'incomingWork' => $incomingWork,
            'statistics' => $statistics,
            'activeOperators' => $activeOperators,
            'canExecute' => $canExecute,
            'dateRange' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }
    
    private function getCurrentWork(WorkCell $workCell)
    {
        return ManufacturingStep::where('work_cell_id', $workCell->id)
            ->whereIn('status', ['queued', 'in_progress', 'on_hold'])
            ->with([
                'manufacturingRoute.manufacturingOrder' => function ($query) {
                    $query->with('item');
                },
                'currentExecution' => function ($query) {
                    $query->with('executedBy');
                },
                'form.currentVersion',
            ])
            ->orderByRaw("CASE 
                WHEN status = 'in_progress' THEN 1
                WHEN status = 'on_hold' THEN 2
                WHEN status = 'queued' THEN 3
                ELSE 4 END")
            ->orderBy('created_at')
            ->get()
            ->map(function ($step) {
                // Add computed properties
                $step->can_start = $step->canStart();
                $step->estimated_duration = $step->getEstimatedDuration();
                $step->priority_score = $this->calculatePriority($step);
                return $step;
            })
            ->sortByDesc('priority_score')
            ->groupBy('status');
    }

    private function getCompletedWork(WorkCell $workCell, $startDate, $endDate)
    {
        $completedSteps = ManufacturingStep::where('work_cell_id', $workCell->id)
            ->where('status', 'completed')
            ->whereBetween('actual_end_time', [$startDate, $endDate])
            ->with([
                'manufacturingRoute.manufacturingOrder.item',
                'executions' => function ($query) {
                    $query->where('status', 'completed')
                        ->with('executedBy');
                },
            ])
            ->orderBy('actual_end_time', 'desc')
            ->limit(50)
            ->get();
        
        // Group by manufacturing order for summary view
        $completedByOrder = $completedSteps->groupBy(function ($step) {
            return $step->manufacturingRoute->manufacturingOrder->id;
        })->map(function ($steps, $orderId) {
            $order = $steps->first()->manufacturingRoute->manufacturingOrder;
            return [
                'order' => $order,
                'steps' => $steps,
                'total_duration' => $steps->sum('actual_duration_minutes'),
                'quality_pass_rate' => $this->calculateQualityPassRate($steps),
                'completed_at' => $steps->max('actual_end_time'),
            ];
        });
        
        return [
            'steps' => $completedSteps,
            'byOrder' => $completedByOrder,
            'totalCompleted' => $completedSteps->count(),
            'averageDuration' => $completedSteps->avg('actual_duration_minutes'),
        ];
    }

    private function getIncomingWork(WorkCell $workCell)
    {
        // Find all steps that have this work cell as their next destination
        $incomingSteps = ManufacturingStep::whereHas('dependentSteps', function ($query) use ($workCell) {
                $query->where('work_cell_id', $workCell->id)
                    ->whereIn('status', ['pending', 'queued']);
            })
            ->whereIn('status', ['queued', 'in_progress'])
            ->with([
                'manufacturingRoute.manufacturingOrder.item',
                'workCell',
                'currentExecution',
                'dependentSteps' => function ($query) use ($workCell) {
                    $query->where('work_cell_id', $workCell->id);
                },
            ])
            ->get()
            ->map(function ($step) {
                // Calculate estimated arrival time
                $step->estimated_arrival = $this->estimateArrivalTime($step);
                $step->next_step = $step->dependentSteps->first();
                return $step;
            })
            ->sortBy('estimated_arrival');
        
        // Group by estimated arrival timeframe
        $grouped = [
            'next_hour' => $incomingSteps->filter(function ($step) {
                return $step->estimated_arrival && $step->estimated_arrival->diffInHours(now()) <= 1;
            }),
            'today' => $incomingSteps->filter(function ($step) {
                return $step->estimated_arrival && 
                    $step->estimated_arrival->isToday() && 
                    $step->estimated_arrival->diffInHours(now()) > 1;
            }),
            'tomorrow' => $incomingSteps->filter(function ($step) {
                return $step->estimated_arrival && $step->estimated_arrival->isTomorrow();
            }),
            'later' => $incomingSteps->filter(function ($step) {
                return !$step->estimated_arrival || 
                    $step->estimated_arrival->diffInDays(now()) > 1;
            }),
        ];
        
        return $grouped;
    }

    private function getWorkCellStatistics(WorkCell $workCell, $startDate, $endDate)
    {
        // Performance metrics
        $completedExecutions = ManufacturingStepExecution::whereHas('manufacturingStep', function ($query) use ($workCell) {
                $query->where('work_cell_id', $workCell->id);
            })
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$startDate, $endDate])
            ->get();
        
        // Calculate OEE (Overall Equipment Effectiveness)
        $totalAvailableTime = $this->calculateAvailableTime($workCell, $startDate, $endDate);
        $totalProductiveTime = $completedExecutions->sum('actual_duration_minutes');
        $totalHoldTime = $completedExecutions->sum('total_hold_duration');
        
        $availability = $totalAvailableTime > 0 
            ? (($totalProductiveTime + $totalHoldTime) / $totalAvailableTime) * 100 
            : 0;
            
        $performance = $completedExecutions->count() > 0
            ? ($completedExecutions->sum(function ($exec) {
                return $exec->manufacturingStep->cycle_time_minutes ?? 0;
            }) / $totalProductiveTime) * 100
            : 0;
            
        $quality = $completedExecutions->count() > 0
            ? ($completedExecutions->where('quality_result', 'passed')->count() / 
               $completedExecutions->count()) * 100
            : 100;
        
        $oee = ($availability * $performance * $quality) / 10000;
        
        return [
            'oee' => round($oee, 2),
            'availability' => round($availability, 2),
            'performance' => round($performance, 2),
            'quality' => round($quality, 2),
            'totalCompleted' => $completedExecutions->count(),
            'averageCycleTime' => round($completedExecutions->avg('actual_duration_minutes'), 2),
            'totalHoldTime' => $totalHoldTime,
            'utilizationRate' => $this->calculateUtilization($workCell),
        ];
    }

    private function getActiveOperators(WorkCell $workCell)
    {
        return ManufacturingStepExecution::whereHas('manufacturingStep', function ($query) use ($workCell) {
                $query->where('work_cell_id', $workCell->id);
            })
            ->where('status', 'in_progress')
            ->with('executedBy')
            ->get()
            ->pluck('executedBy')
            ->unique('id');
    }

    private function calculatePriority(ManufacturingStep $step)
    {
        $order = $step->manufacturingRoute->manufacturingOrder;
        $score = 0;
        
        // Order priority (0-100)
        $score += $order->priority;
        
        // Due date urgency (0-50)
        if ($order->requested_date) {
            $daysUntilDue = Carbon::parse($order->requested_date)->diffInDays(now(), false);
            if ($daysUntilDue <= 0) {
                $score += 50; // Overdue
            } elseif ($daysUntilDue <= 3) {
                $score += 40; // Very urgent
            } elseif ($daysUntilDue <= 7) {
                $score += 30; // Urgent
            } else {
                $score += 20; // Normal
            }
        }
        
        // Step age (0-20)
        $hoursQueued = $step->created_at->diffInHours(now());
        $score += min($hoursQueued * 2, 20);
        
        return $score;
    }

    private function estimateArrivalTime(ManufacturingStep $currentStep)
    {
        if ($currentStep->status === 'in_progress' && $currentStep->currentExecution) {
            $remainingTime = $currentStep->getEstimatedRemainingTime();
            return now()->addMinutes($remainingTime);
        } elseif ($currentStep->status === 'queued') {
            // Estimate based on queue position and average cycle times
            $queuePosition = $this->getQueuePosition($currentStep);
            $averageCycleTime = $this->getAverageCycleTime($currentStep->work_cell_id);
            return now()->addMinutes($queuePosition * $averageCycleTime);
        }
        
        return null;
    }

    private function calculateQualityPassRate($steps)
    {
        $qualitySteps = $steps->filter(function ($step) {
            return $step->step_type === 'quality_check';
        });
        
        if ($qualitySteps->isEmpty()) {
            return null;
        }
        
        $passed = $qualitySteps->filter(function ($step) {
            return $step->executions->first()->quality_result === 'passed';
        })->count();
        
        return round(($passed / $qualitySteps->count()) * 100, 2);
    }

    private function calculateAvailableTime(WorkCell $workCell, $startDate, $endDate)
    {
        // Calculate available time based on work cell schedule
        // This is a simplified version - in production, consider shifts, holidays, etc.
        $days = Carbon::parse($startDate)->diffInDays($endDate);
        $hoursPerDay = 8; // Standard shift
        $minutesPerDay = $hoursPerDay * 60;
        
        return $days * $minutesPerDay * ($workCell->capacity_percentage / 100);
    }

    private function calculateUtilization(WorkCell $workCell)
    {
        // Calculate current utilization based on active work
        $activeSteps = $workCell->manufacturingSteps()
            ->where('status', 'in_progress')
            ->count();
        
        $maxCapacity = $workCell->max_concurrent_operations ?? 1;
        
        return round(($activeSteps / $maxCapacity) * 100, 2);
    }

    private function getQueuePosition(ManufacturingStep $step)
    {
        return ManufacturingStep::where('work_cell_id', $step->work_cell_id)
            ->where('status', 'queued')
            ->where('created_at', '<', $step->created_at)
            ->count();
    }

    private function getAverageCycleTime($workCellId)
    {
        $recentExecutions = ManufacturingStepExecution::whereHas('manufacturingStep', function ($query) use ($workCellId) {
                $query->where('work_cell_id', $workCellId);
            })
            ->where('status', 'completed')
            ->where('completed_at', '>', now()->subDays(7))
            ->limit(20)
            ->get();
        
        return $recentExecutions->avg('actual_duration_minutes') ?? 30;
    }
}

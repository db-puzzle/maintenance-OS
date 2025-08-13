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
        
        return $days * $minutesPerDay;
    }

    private function calculateUtilization(WorkCell $workCell)
    {
        // Calculate current utilization based on active work
        $activeSteps = $workCell->manufacturingSteps()
            ->where('status', 'in_progress')
            ->count();
        
        // For now, assume single operation capacity
        // This can be enhanced in the future with proper capacity planning
        return $activeSteps > 0 ? 100 : 0;
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

    /**
     * Show analytics page for the work cell.
     */
    public function analytics(Request $request, WorkCell $workCell)
    {
        $this->authorize('viewDashboard', $workCell);
        
        // Date range for analytics (default: last 30 days)
        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->startOfDay());
        $endDate = $request->input('end_date', Carbon::now()->endOfDay());
        
        // Get detailed analytics data
        $analytics = [
            'oee_trend' => $this->getOEETrend($workCell, $startDate, $endDate),
            'production_volume' => $this->getProductionVolume($workCell, $startDate, $endDate),
            'quality_metrics' => $this->getQualityMetrics($workCell, $startDate, $endDate),
            'downtime_analysis' => $this->getDowntimeAnalysis($workCell, $startDate, $endDate),
            'operator_performance' => $this->getOperatorPerformance($workCell, $startDate, $endDate),
        ];
        
        return Inertia::render('production/work-cells/analytics', [
            'workCell' => $workCell,
            'analytics' => $analytics,
            'dateRange' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * Export work cell data.
     */
    public function export(Request $request, WorkCell $workCell)
    {
        $this->authorize('export', $workCell);
        
        $format = $request->input('format', 'xlsx');
        $startDate = $request->input('start_date', Carbon::now()->subDays(7)->startOfDay());
        $endDate = $request->input('end_date', Carbon::now()->endOfDay());
        
        $data = [
            'workCell' => $workCell,
            'statistics' => $this->getWorkCellStatistics($workCell, $startDate, $endDate),
            'completedWork' => $this->getCompletedWork($workCell, $startDate, $endDate),
        ];
        
        // For now, return JSON. In production, implement Excel/PDF export
        return response()->json($data);
    }

    /**
     * Get OEE trend data for analytics.
     */
    private function getOEETrend(WorkCell $workCell, $startDate, $endDate)
    {
        // Group by day and calculate daily OEE
        $days = Carbon::parse($startDate)->diffInDays($endDate);
        $trend = [];
        
        for ($i = 0; $i <= $days; $i++) {
            $dayStart = Carbon::parse($startDate)->addDays($i)->startOfDay();
            $dayEnd = Carbon::parse($startDate)->addDays($i)->endOfDay();
            
            $stats = $this->getWorkCellStatistics($workCell, $dayStart, $dayEnd);
            $trend[] = [
                'date' => $dayStart->format('Y-m-d'),
                'oee' => $stats['oee'],
                'availability' => $stats['availability'],
                'performance' => $stats['performance'],
                'quality' => $stats['quality'],
            ];
        }
        
        return $trend;
    }

    /**
     * Get production volume data for analytics.
     */
    private function getProductionVolume(WorkCell $workCell, $startDate, $endDate)
    {
        return ManufacturingStep::where('work_cell_id', $workCell->id)
            ->where('status', 'completed')
            ->whereBetween('actual_end_time', [$startDate, $endDate])
            ->with('manufacturingRoute.manufacturingOrder.item')
            ->get()
            ->groupBy(function ($step) {
                return $step->manufacturingRoute->manufacturingOrder->item->name ?? 'Unknown';
            })
            ->map(function ($steps, $itemName) {
                return [
                    'item' => $itemName,
                    'count' => $steps->count(),
                    'total_time' => $steps->sum('actual_duration_minutes'),
                ];
            });
    }

    /**
     * Get quality metrics for analytics.
     */
    private function getQualityMetrics(WorkCell $workCell, $startDate, $endDate)
    {
        $qualitySteps = ManufacturingStep::where('work_cell_id', $workCell->id)
            ->where('step_type', 'quality_check')
            ->where('status', 'completed')
            ->whereBetween('actual_end_time', [$startDate, $endDate])
            ->with('executions')
            ->get();
        
        $totalChecks = $qualitySteps->count();
        $passed = $qualitySteps->filter(function ($step) {
            return $step->quality_result === 'passed';
        })->count();
        
        return [
            'total_checks' => $totalChecks,
            'passed' => $passed,
            'failed' => $totalChecks - $passed,
            'pass_rate' => $totalChecks > 0 ? round(($passed / $totalChecks) * 100, 2) : 0,
        ];
    }

    /**
     * Get downtime analysis for analytics.
     */
    private function getDowntimeAnalysis(WorkCell $workCell, $startDate, $endDate)
    {
        $holdDurations = ManufacturingStepExecution::whereHas('manufacturingStep', function ($query) use ($workCell) {
                $query->where('work_cell_id', $workCell->id);
            })
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$startDate, $endDate])
            ->where('total_hold_duration', '>', 0)
            ->get();
        
        return [
            'total_hold_time' => $holdDurations->sum('total_hold_duration'),
            'average_hold_time' => round($holdDurations->avg('total_hold_duration'), 2),
            'hold_incidents' => $holdDurations->count(),
        ];
    }

    /**
     * Get operator performance data for analytics.
     */
    private function getOperatorPerformance(WorkCell $workCell, $startDate, $endDate)
    {
        return ManufacturingStepExecution::whereHas('manufacturingStep', function ($query) use ($workCell) {
                $query->where('work_cell_id', $workCell->id);
            })
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$startDate, $endDate])
            ->with('executedBy')
            ->get()
            ->groupBy('executed_by')
            ->map(function ($executions, $userId) {
                $user = $executions->first()->executedBy;
                return [
                    'operator' => $user ? $user->name : 'Unknown',
                    'executions' => $executions->count(),
                    'average_time' => round($executions->avg('actual_duration_minutes'), 2),
                    'total_time' => $executions->sum('actual_duration_minutes'),
                ];
            })
            ->values();
    }
}

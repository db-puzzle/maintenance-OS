# Work Cell Dashboard - Implementation Details

This document contains the detailed implementation code for the Work Cell Dashboard feature.

## Controller Implementation (Continued)

### WorkCellDashboardController Methods

```php
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
```

## Frontend Implementation

### Work Cell Dashboard Component

```tsx
// resources/js/pages/production/work-cells/dashboard.tsx
import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Activity,
    AlertCircle,
    CheckCircle,
    Clock,
    Package,
    Play,
    TrendingUp,
    Users,
    Pause,
    ArrowRight,
    Calendar,
    Filter,
    Download,
    RefreshCw
} from 'lucide-react';
import { WorkCell, ManufacturingStep, ManufacturingOrder } from '@/types/production';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
    workCell: WorkCell;
    currentWork: {
        queued?: ManufacturingStep[];
        in_progress?: ManufacturingStep[];
        on_hold?: ManufacturingStep[];
    };
    completedWork: {
        steps: ManufacturingStep[];
        byOrder: Record<string, {
            order: ManufacturingOrder;
            steps: ManufacturingStep[];
            total_duration: number;
            quality_pass_rate: number | null;
            completed_at: string;
        }>;
        totalCompleted: number;
        averageDuration: number;
    };
    incomingWork: {
        next_hour: ManufacturingStep[];
        today: ManufacturingStep[];
        tomorrow: ManufacturingStep[];
        later: ManufacturingStep[];
    };
    statistics: {
        oee: number;
        availability: number;
        performance: number;
        quality: number;
        totalCompleted: number;
        averageCycleTime: number;
        totalHoldTime: number;
        utilizationRate: number;
    };
    activeOperators: any[];
    canExecute: boolean;
    dateRange: {
        start: string;
        end: string;
    };
}

export default function WorkCellDashboard({
    workCell,
    currentWork,
    completedWork,
    incomingWork,
    statistics,
    activeOperators,
    canExecute,
    dateRange
}: Props) {
    const [activeTab, setActiveTab] = useState('current');
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // Auto-refresh every 30 seconds
    React.useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(() => {
            router.reload({ only: ['currentWork', 'statistics', 'activeOperators'] });
        }, 30000);
        
        return () => clearInterval(interval);
    }, [autoRefresh]);
    
    const breadcrumbs = [
        { title: 'Production', href: '/production' },
        { title: 'Work Cells', href: '/production/work-cells' },
        { title: workCell.name, href: `/production/work-cells/${workCell.id}` },
        { title: 'Dashboard', href: '' }
    ];
    
    const handleExecuteStep = (step: ManufacturingStep) => {
        router.visit(route('production.steps.execute', step.id));
    };
    
    const MetricCard = ({ title, value, icon: Icon, trend, color = 'blue' }: any) => (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-2xl font-bold">{value}</p>
                        {trend && (
                            <p className={cn(
                                "text-xs flex items-center mt-1",
                                trend > 0 ? "text-green-600" : "text-red-600"
                            )}>
                                <TrendingUp className={cn(
                                    "h-3 w-3 mr-1",
                                    trend < 0 && "rotate-180"
                                )} />
                                {Math.abs(trend)}%
                            </p>
                        )}
                    </div>
                    <div className={cn(
                        "p-3 rounded-full",
                        `bg-${color}-100 text-${color}-600`,
                        `dark:bg-${color}-900/20 dark:text-${color}-400`
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
    
    // Component continues in the file...
}
```

## Additional Routes and Permissions

### Routes
```php
// routes/production.php
Route::prefix('work-cells')->group(function () {
    Route::get('/', [WorkCellController::class, 'index'])->name('production.work-cells.index');
    Route::get('/{workCell}/dashboard', [WorkCellDashboardController::class, 'show'])
        ->name('production.work-cells.dashboard');
    Route::get('/{workCell}/analytics', [WorkCellDashboardController::class, 'analytics'])
        ->name('production.work-cells.analytics');
    Route::post('/{workCell}/export', [WorkCellDashboardController::class, 'export'])
        ->name('production.work-cells.export');
});
```

### Additional Permissions
```php
// Add to PermissionSeeder.php
[
    'name' => 'production.work-cells.viewDashboard',
    'display_name' => 'View Work Cell Dashboard',
    'description' => 'Access comprehensive work cell dashboard with analytics',
    'sort_order' => 95
],
[
    'name' => 'production.work-cells.exportData',
    'display_name' => 'Export Work Cell Data',
    'description' => 'Export work cell performance and production data',
    'sort_order' => 96
]
```

## Key Features

### 1. Real-time Updates
- Auto-refresh every 30 seconds for current work
- Manual refresh option available
- WebSocket integration ready for future enhancement

### 2. Comprehensive Views
- **Current Work**: Immediate actionable items with one-click execution
- **Completed Work**: Historical performance by order with quality metrics
- **Incoming Work**: Pipeline visibility with estimated arrival times
- **Analytics**: OEE breakdown and performance trends

### 3. Smart Prioritization
- Priority scoring based on order urgency, due dates, and queue time
- Visual indicators for high-priority items
- Automatic sorting by priority

### 4. Performance Metrics
- Overall Equipment Effectiveness (OEE) calculation
- Availability, Performance, and Quality metrics
- Cycle time analysis and trends
- Hold time tracking

### 5. Mobile Optimization
- Responsive design for tablets on the shop floor
- Large touch targets for step execution
- Simplified view mode for operators

## Step Card Component

```tsx
const StepCard = ({ step, showActions = true }: { step: ManufacturingStep; showActions?: boolean }) => (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                        {step.manufacturing_route.manufacturing_order.order_number}
                    </span>
                    <Badge variant="outline" className="text-xs">
                        Step {step.step_number}
                    </Badge>
                    {step.priority_score > 100 && (
                        <Badge variant="destructive" className="text-xs">
                            High Priority
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                    {step.name}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{step.manufacturing_route.manufacturing_order.item?.name}</span>
                    <span>•</span>
                    <span>{step.estimated_duration} min</span>
                    {step.form && (
                        <>
                            <span>•</span>
                            <span>Has form</span>
                        </>
                    )}
                </div>
                {step.current_execution && (
                    <div className="mt-2 text-xs">
                        <span className="text-muted-foreground">Operator: </span>
                        <span>{step.current_execution.executed_by?.name}</span>
                    </div>
                )}
            </div>
            {showActions && canExecute && step.can_start && (
                <Button
                    size="sm"
                    onClick={() => handleExecuteStep(step)}
                    className="ml-4"
                >
                    <Play className="h-4 w-4 mr-1" />
                    {step.status === 'queued' ? 'Start' : 'Continue'}
                </Button>
            )}
        </div>
    </div>
);
```

## Tab Content Implementation

### Current Work Tab
Shows all active work in the cell with real-time status updates and one-click execution.

### Completed Work Tab
Displays completed manufacturing orders with performance metrics, grouped by order for easy analysis.

### Incoming Work Tab
Provides visibility into the production pipeline with estimated arrival times based on current progress in previous work cells.

### Analytics Tab
Comprehensive performance metrics including OEE breakdown, trend analysis, and quality statistics.

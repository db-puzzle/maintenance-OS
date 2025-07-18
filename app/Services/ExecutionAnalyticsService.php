<?php

namespace App\Services;

use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderExecution;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ExecutionAnalyticsService
{
    public function getExecutionSummary(array $filters = []): array
    {
        // Filter work orders that come from routines
        $query = WorkOrder::where('source_type', 'routine')
            ->whereHas('workOrderCategory', function($q) {
                $q->where('code', 'preventive');
            });

        if (!empty($filters['plant_id'])) {
            $query->whereHas('asset', function ($q) use ($filters) {
                $q->where('plant_id', $filters['plant_id']);
            });
        }

        if (!empty($filters['date_from'])) {
            $query->where('requested_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->where('requested_at', '<=', $filters['date_to']);
        }

        $total = $query->count();
        $completed = $query->where('status', WorkOrder::STATUS_COMPLETED)->count();
        $inProgress = $query->where('status', WorkOrder::STATUS_IN_PROGRESS)->count();
        $cancelled = $query->where('status', WorkOrder::STATUS_CANCELLED)->count();

        return [
            'total' => $total,
            'completed' => $completed,
            'in_progress' => $inProgress,
            'cancelled' => $cancelled,
            'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
        ];
    }

    public function getRecentExecutions(int $limit = 10): Collection
    {
        return WorkOrder::with(['asset', 'requestedBy', 'execution'])
            ->where('source_type', 'routine')
            ->whereHas('workOrderCategory', function($q) {
                $q->where('code', 'preventive');
            })
            ->orderBy('requested_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($workOrder) {
                return [
                    'id' => $workOrder->id,
                    'work_order_number' => $workOrder->work_order_number,
                    'routine_name' => $workOrder->title,
                    'asset_tag' => $workOrder->asset->tag ?? 'N/A',
                    'executor_name' => $workOrder->execution->executedBy->name ?? 'N/A',
                    'started_at' => $workOrder->actual_start_date,
                    'completed_at' => $workOrder->actual_end_date,
                    'status' => $workOrder->status,
                    'duration_minutes' => $workOrder->execution ? 
                        $workOrder->execution->started_at->diffInMinutes($workOrder->execution->completed_at) : 0,
                ];
            });
    }

    public function getExecutionTrends(int $days = 30): array
    {
        $endDate = now()->endOfDay();
        $startDate = now()->subDays($days)->startOfDay();

        $workOrders = WorkOrder::where('source_type', 'routine')
            ->whereHas('workOrderCategory', function($q) {
                $q->where('code', 'preventive');
            })
            ->whereBetween('requested_at', [$startDate, $endDate])
            ->get();

        $trends = [];
        $currentDate = $startDate->copy();

        while ($currentDate <= $endDate) {
            $dayWorkOrders = $workOrders->filter(function ($wo) use ($currentDate) {
                return Carbon::parse($wo->requested_at)->isSameDay($currentDate);
            });

            $completed = $dayWorkOrders->where('status', WorkOrder::STATUS_COMPLETED)->count();
            $cancelled = $dayWorkOrders->where('status', WorkOrder::STATUS_CANCELLED)->count();

            $trends[] = [
                'date' => $currentDate->format('Y-m-d'),
                'completed' => $completed,
                'cancelled' => $cancelled,
                'total' => $dayWorkOrders->count(),
            ];

            $currentDate->addDay();
        }

        return $trends;
    }

    public function getAverageExecutionTime(): array
    {
        $avgByCategory = DB::table('work_orders')
            ->join('work_order_executions', 'work_orders.id', '=', 'work_order_executions.work_order_id')
            ->join('work_order_categories', 'work_orders.work_order_category_id', '=', 'work_order_categories.id')
            ->where('work_orders.source_type', 'routine')
            ->where('work_order_categories.code', 'preventive')
            ->whereNotNull('work_order_executions.completed_at')
            ->select(
                'work_order_categories.code as work_order_category',
                DB::raw('AVG(TIMESTAMPDIFF(MINUTE, work_order_executions.started_at, work_order_executions.completed_at)) as avg_minutes')
            )
            ->groupBy('work_order_categories.code')
            ->get();

        $result = [];
        foreach ($avgByCategory as $category) {
            $result[$category->work_order_category] = [
                'minutes' => round($category->avg_minutes),
                'formatted' => $this->formatMinutes(round($category->avg_minutes)),
            ];
        }

        return $result;
    }

    public function getCompletionRateByAsset(): array
    {
        $completedWorkOrders = WorkOrder::where('source_type', 'routine')
            ->whereHas('workOrderCategory', function($q) {
                $q->where('code', 'preventive');
            })
            ->where('status', WorkOrder::STATUS_COMPLETED)
            ->whereBetween('requested_at', [now()->subDays(30), now()])
            ->select('asset_id', DB::raw('count(*) as completed_count'))
            ->groupBy('asset_id')
            ->pluck('completed_count', 'asset_id');

        $totalWorkOrders = WorkOrder::where('source_type', 'routine')
            ->whereHas('workOrderCategory', function($q) {
                $q->where('code', 'preventive');
            })
            ->whereBetween('requested_at', [now()->subDays(30), now()])
            ->select('asset_id', DB::raw('count(*) as total_count'))
            ->groupBy('asset_id')
            ->pluck('total_count', 'asset_id');

        $assetIds = $totalWorkOrders->keys();
        $assets = \App\Models\AssetHierarchy\Asset::whereIn('id', $assetIds)
            ->with(['area', 'plant'])
            ->get();

        $result = [];
        foreach ($assets as $asset) {
            $completed = $completedWorkOrders->get($asset->id, 0);
            $total = $totalWorkOrders->get($asset->id, 0);

            $result[] = [
                'asset_id' => $asset->id,
                'asset_tag' => $asset->tag,
                'asset_name' => $asset->name,
                'area' => $asset->area->name ?? 'N/A',
                'plant' => $asset->plant->name ?? 'N/A',
                'completed' => $completed,
                'total' => $total,
                'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
            ];
        }

        // Sort by completion rate descending
        usort($result, function ($a, $b) {
            return $b['completion_rate'] <=> $a['completion_rate'];
        });

        return $result;
    }

    public function getExecutionComparison(string $period = 'month'): array
    {
        $currentStart = $this->getPeriodStart($period);
        $currentEnd = now();
        $previousStart = $this->getPreviousPeriodStart($period);
        $previousEnd = $this->getPeriodStart($period)->subSecond();

        $currentQuery = WorkOrder::where('source_type', 'routine')
            ->whereHas('workOrderCategory', function($q) {
                $q->where('code', 'preventive');
            });
        $currentCount = (clone $currentQuery)
            ->whereBetween('requested_at', [$currentStart, $currentEnd])
            ->count();
        $currentCompleted = (clone $currentQuery)
            ->whereBetween('requested_at', [$currentStart, $currentEnd])
            ->where('status', WorkOrder::STATUS_COMPLETED)
            ->count();

        $previousCount = WorkOrder::where('source_type', 'routine')
            ->whereHas('workOrderCategory', function($q) {
                $q->where('code', 'preventive');
            })
            ->whereBetween('requested_at', [$previousStart, $previousEnd])
            ->count();
        $previousCompleted = WorkOrder::where('source_type', 'routine')
            ->whereHas('workOrderCategory', function($q) {
                $q->where('code', 'preventive');
            })
            ->whereBetween('requested_at', [$previousStart, $previousEnd])
            ->where('status', WorkOrder::STATUS_COMPLETED)
            ->count();

        $currentRate = $currentCount > 0 ? round(($currentCompleted / $currentCount) * 100, 2) : 0;
        $previousRate = $previousCount > 0 ? round(($previousCompleted / $previousCount) * 100, 2) : 0;

        return [
            'current' => [
                'total' => $currentCount,
                'completed' => $currentCompleted,
                'completion_rate' => $currentRate,
            ],
            'previous' => [
                'total' => $previousCount,
                'completed' => $previousCompleted,
                'completion_rate' => $previousRate,
            ],
            'change' => [
                'total' => $this->calculatePercentageChange($previousCount, $currentCount),
                'completed' => $this->calculatePercentageChange($previousCompleted, $currentCompleted),
                'completion_rate' => round($currentRate - $previousRate, 2),
            ],
        ];
    }

    private function getPeriodStart(string $period): Carbon
    {
        return match ($period) {
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'quarter' => now()->startOfQuarter(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };
    }

    private function getPreviousPeriodStart(string $period): Carbon
    {
        return match ($period) {
            'week' => now()->subWeek()->startOfWeek(),
            'month' => now()->subMonth()->startOfMonth(),
            'quarter' => now()->subQuarter()->startOfQuarter(),
            'year' => now()->subYear()->startOfYear(),
            default => now()->subMonth()->startOfMonth(),
        };
    }

    private function calculatePercentageChange($previous, $current): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return round((($current - $previous) / $previous) * 100, 2);
    }

    private function formatMinutes(int $minutes): string
    {
        $hours = floor($minutes / 60);
        $mins = $minutes % 60;

        if ($hours > 0) {
            return sprintf('%dh %dm', $hours, $mins);
        }

        return sprintf('%dm', $mins);
    }
}

<?php

namespace App\Services;

use App\Models\Maintenance\RoutineExecution;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ExecutionAnalyticsService
{
    /**
     * Get dashboard statistics
     */
    public function getDashboardStats(array $filters = []): array
    {
        $query = RoutineExecution::query();

        // Apply filters if provided
        $this->applyFilters($query, $filters);

        $total = $query->count();
        $completed = $query->where('status', RoutineExecution::STATUS_COMPLETED)->count();
        $inProgress = $query->where('status', RoutineExecution::STATUS_IN_PROGRESS)->count();
        $failed = $query->where('status', RoutineExecution::STATUS_CANCELLED)->count();

        $completionRate = $total > 0 ? round(($completed / $total) * 100, 1) : 0;

        // Calculate trend (compare with previous period)
        $trend = $this->calculateTrend($filters);

        return [
            'total' => $total,
            'completed' => $completed,
            'in_progress' => $inProgress,
            'failed' => $failed,
            'completion_rate' => $completionRate,
            'trend' => $trend,
        ];
    }

    /**
     * Get recent executions
     */
    public function getRecentExecutions(int $limit = 5): Collection
    {
        return RoutineExecution::with(['routine', 'executor', 'routine.assets'])
            ->orderBy('started_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($execution) {
                return [
                    'id' => $execution->id,
                    'routine_name' => $execution->routine->name,
                    'asset_tag' => $execution->primary_asset_tag,
                    'executor_name' => $execution->executor->name,
                    'status' => $execution->status,
                    'started_at' => $execution->started_at,
                    'duration_minutes' => $execution->duration_minutes,
                    'progress' => $execution->progress_percentage,
                ];
            });
    }

    /**
     * Get daily trend data for charts
     */
    public function getDailyTrend(int $days = 30): Collection
    {
        $startDate = Carbon::now()->subDays($days)->startOfDay();

        $executions = RoutineExecution::where('started_at', '>=', $startDate)
            ->get()
            ->groupBy(function ($execution) {
                return Carbon::parse($execution->started_at)->format('Y-m-d');
            })
            ->map(function ($dayExecutions, $date) {
                $completed = $dayExecutions->where('status', RoutineExecution::STATUS_COMPLETED)->count();
                $cancelled = $dayExecutions->where('status', RoutineExecution::STATUS_CANCELLED)->count();

                return [
                    'date' => $date,
                    'count' => $dayExecutions->count(),
                    'completed' => $completed,
                    'failed' => $cancelled,
                ];
            })
            ->sortBy('date')
            ->values();

        return $executions;
    }

    /**
     * Get execution performance metrics
     */
    public function getPerformanceMetrics(): array
    {
        $completedExecutions = RoutineExecution::where('status', RoutineExecution::STATUS_COMPLETED)
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->get();

        if ($completedExecutions->isEmpty()) {
            return [
                'average_duration_minutes' => 0,
                'median_duration_minutes' => 0,
                'fastest_execution_minutes' => 0,
                'slowest_execution_minutes' => 0,
                'total_execution_time_hours' => 0,
            ];
        }

        $durations = $completedExecutions
            ->map(fn ($ex) => $ex->duration_minutes)
            ->filter()
            ->sort()
            ->values();

        return [
            'average_duration_minutes' => round($durations->avg(), 1),
            'median_duration_minutes' => $this->getMedian($durations),
            'fastest_execution_minutes' => $durations->min(),
            'slowest_execution_minutes' => $durations->max(),
            'total_execution_time_hours' => round($durations->sum() / 60, 1),
        ];
    }

    /**
     * Get asset execution summary
     */
    public function getAssetExecutionSummary(): Collection
    {
        // Get all assets that have routines with executions
        $assets = \App\Models\AssetHierarchy\Asset::whereHas('routines.routineExecutions')
            ->with(['routines.routineExecutions' => function ($query) {
                $query->select('id', 'routine_id', 'status', 'started_at', 'completed_at');
            }])
            ->get();

        return $assets->map(function ($asset) {
            $allExecutions = $asset->routines->flatMap->routineExecutions;
            $totalExecutions = $allExecutions->count();
            $completedExecutions = $allExecutions->where('status', RoutineExecution::STATUS_COMPLETED);
            $completedCount = $completedExecutions->count();

            // Calculate average duration for completed executions
            $avgDuration = null;
            if ($completedCount > 0) {
                $totalDuration = $completedExecutions->sum(function ($execution) {
                    if ($execution->started_at && $execution->completed_at) {
                        return Carbon::parse($execution->completed_at)
                            ->diffInMinutes(Carbon::parse($execution->started_at));
                    }

                    return 0;
                });
                $avgDuration = round($totalDuration / $completedCount, 1);
            }

            return [
                'asset_id' => $asset->id,
                'asset_tag' => $asset->tag,
                'asset_description' => $asset->description,
                'total_executions' => $totalExecutions,
                'completed_executions' => $completedCount,
                'completion_rate' => $totalExecutions > 0
                    ? round(($completedCount / $totalExecutions) * 100, 1)
                    : 0,
                'avg_duration_minutes' => $avgDuration,
            ];
        })->filter(function ($summary) {
            return $summary['total_executions'] > 0;
        })->sortByDesc('total_executions')->values();
    }

    /**
     * Calculate trend percentage compared to previous period
     */
    private function calculateTrend(array $filters): array
    {
        // Get current period count
        $currentQuery = RoutineExecution::query();
        $this->applyFilters($currentQuery, $filters);
        $currentCount = $currentQuery->count();

        // Calculate previous period based on date range
        $dateRange = $this->getDateRangeFromFilters($filters);
        if (! $dateRange) {
            return ['direction' => 'stable', 'percentage' => 0];
        }

        $periodLength = $dateRange['end']->diffInDays($dateRange['start']);
        $previousStart = $dateRange['start']->copy()->subDays($periodLength);
        $previousEnd = $dateRange['start']->copy()->subDay();

        $previousCount = RoutineExecution::whereBetween('started_at', [$previousStart, $previousEnd])
            ->count();

        if ($previousCount === 0) {
            return ['direction' => $currentCount > 0 ? 'up' : 'stable', 'percentage' => 0];
        }

        $changePercentage = round((($currentCount - $previousCount) / $previousCount) * 100, 1);

        return [
            'direction' => $changePercentage > 0 ? 'up' : ($changePercentage < 0 ? 'down' : 'stable'),
            'percentage' => abs($changePercentage),
        ];
    }

    /**
     * Apply common filters to query
     */
    private function applyFilters($query, array $filters): void
    {
        if (isset($filters['date_from'], $filters['date_to'])) {
            $query->filterByDateRange($filters['date_from'], $filters['date_to']);
        }

        if (isset($filters['asset_ids']) && ! empty($filters['asset_ids'])) {
            $query->filterByAssets($filters['asset_ids']);
        }

        if (isset($filters['routine_ids']) && ! empty($filters['routine_ids'])) {
            $query->filterByRoutines($filters['routine_ids']);
        }

        if (isset($filters['executor_ids']) && ! empty($filters['executor_ids'])) {
            $query->filterByExecutors($filters['executor_ids']);
        }

        if (isset($filters['status']) && ! empty($filters['status'])) {
            $query->filterByStatus($filters['status']);
        }

        if (isset($filters['search']) && ! empty($filters['search'])) {
            $query->search($filters['search']);
        }
    }

    /**
     * Get date range from filters
     */
    private function getDateRangeFromFilters(array $filters): ?array
    {
        if (! isset($filters['date_from'], $filters['date_to'])) {
            return null;
        }

        return [
            'start' => Carbon::parse($filters['date_from']),
            'end' => Carbon::parse($filters['date_to']),
        ];
    }

    /**
     * Get median value from collection
     */
    private function getMedian(Collection $collection): float
    {
        $count = $collection->count();

        if ($count === 0) {
            return 0;
        }

        if ($count % 2 === 0) {
            $mid1 = $collection->get($count / 2 - 1);
            $mid2 = $collection->get($count / 2);

            return ($mid1 + $mid2) / 2;
        }

        return $collection->get(intval($count / 2));
    }
}

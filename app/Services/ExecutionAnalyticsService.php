<?php

namespace App\Services;

use App\Models\Maintenance\RoutineExecution;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

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
        
        return RoutineExecution::select([
                DB::raw('DATE(started_at) as date'),
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed'),
                DB::raw('SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as failed'),
            ])
            ->where('started_at', '>=', $startDate)
            ->groupBy(DB::raw('DATE(started_at)'))
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'count' => (int) $item->count,
                    'completed' => (int) $item->completed,
                    'failed' => (int) $item->failed,
                ];
            });
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
            ->map(fn($ex) => $ex->duration_minutes)
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
        return DB::table('routine_executions')
            ->join('routines', 'routine_executions.routine_id', '=', 'routines.id')
            ->join('asset_routine', 'routines.id', '=', 'asset_routine.routine_id')
            ->join('assets', 'asset_routine.asset_id', '=', 'assets.id')
            ->select([
                'assets.id',
                'assets.tag',
                'assets.description',
                DB::raw('COUNT(routine_executions.id) as total_executions'),
                DB::raw('SUM(CASE WHEN routine_executions.status = "completed" THEN 1 ELSE 0 END) as completed_executions'),
                DB::raw('AVG(CASE WHEN routine_executions.status = "completed" AND routine_executions.started_at IS NOT NULL AND routine_executions.completed_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, routine_executions.started_at, routine_executions.completed_at) END) as avg_duration_minutes'),
            ])
            ->groupBy('assets.id', 'assets.tag', 'assets.description')
            ->orderBy('total_executions', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'asset_id' => $item->id,
                    'asset_tag' => $item->tag,
                    'asset_description' => $item->description,
                    'total_executions' => (int) $item->total_executions,
                    'completed_executions' => (int) $item->completed_executions,
                    'completion_rate' => $item->total_executions > 0 
                        ? round(($item->completed_executions / $item->total_executions) * 100, 1) 
                        : 0,
                    'avg_duration_minutes' => $item->avg_duration_minutes 
                        ? round((float) $item->avg_duration_minutes, 1) 
                        : null,
                ];
            });
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
        if (!$dateRange) {
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

        if (isset($filters['asset_ids']) && !empty($filters['asset_ids'])) {
            $query->filterByAssets($filters['asset_ids']);
        }

        if (isset($filters['routine_ids']) && !empty($filters['routine_ids'])) {
            $query->filterByRoutines($filters['routine_ids']);
        }

        if (isset($filters['executor_ids']) && !empty($filters['executor_ids'])) {
            $query->filterByExecutors($filters['executor_ids']);
        }

        if (isset($filters['status']) && !empty($filters['status'])) {
            $query->filterByStatus($filters['status']);
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $query->search($filters['search']);
        }
    }

    /**
     * Get date range from filters
     */
    private function getDateRangeFromFilters(array $filters): ?array
    {
        if (!isset($filters['date_from'], $filters['date_to'])) {
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
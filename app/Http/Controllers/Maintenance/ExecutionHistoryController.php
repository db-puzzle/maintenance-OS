<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Asset;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
use App\Models\User;
use App\Services\ExecutionAnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExecutionHistoryController extends Controller
{
    public function __construct(
        private ExecutionAnalyticsService $analyticsService
    ) {}

    /**
     * Show the execution history dashboard
     */
    public function dashboard(Request $request): Response
    {
        // $this->authorize('viewAny', RoutineExecution::class);

        $filters = $this->getFiltersFromRequest($request);

        // Get dashboard data
        $stats = $this->analyticsService->getDashboardStats($filters);
        $recentExecutions = $this->analyticsService->getRecentExecutions();
        $dailyTrend = $this->analyticsService->getDailyTrend();
        $performanceMetrics = $this->analyticsService->getPerformanceMetrics();

        return Inertia::render('maintenance/executions/History', [
            'stats' => $stats,
            'recentExecutions' => $recentExecutions,
            'dailyTrend' => $dailyTrend,
            'performanceMetrics' => $performanceMetrics,
            'filters' => $filters,
            'filterOptions' => $this->getFilterOptions(),
        ]);
    }

    /**
     * Get dashboard statistics via API
     */
    public function dashboardApi(Request $request)
    {
        // $this->authorize('viewAny', RoutineExecution::class);

        $filters = $this->getFiltersFromRequest($request);

        return response()->json([
            'stats' => $this->analyticsService->getDashboardStats($filters),
            'recent_executions' => $this->analyticsService->getRecentExecutions(),
            'daily_trend' => $this->analyticsService->getDailyTrend(),
        ]);
    }

    /**
     * Get performance metrics
     */
    public function performanceMetrics(Request $request)
    {
        // $this->authorize('viewAny', RoutineExecution::class);

        return response()->json([
            'performance_metrics' => $this->analyticsService->getPerformanceMetrics(),
            'asset_summary' => $this->analyticsService->getAssetExecutionSummary(),
        ]);
    }

    /**
     * Get available filter options
     */
    public function filterOptions(Request $request)
    {
        // $this->authorize('viewAny', RoutineExecution::class);

        return response()->json($this->getFilterOptions());
    }

    /**
     * Get filter options for the UI
     */
    private function getFilterOptions(): array
    {
        return [
            'assets' => Asset::select('id', 'tag', 'description')
                ->whereHas('routines.routineExecutions')
                ->orderBy('tag')
                ->get()
                ->map(fn ($asset) => [
                    'value' => $asset->id,
                    'label' => "{$asset->tag} - {$asset->description}",
                ]),

            'routines' => Routine::select('id', 'name', 'description')
                ->whereHas('routineExecutions')
                ->orderBy('name')
                ->get()
                ->map(fn ($routine) => [
                    'value' => $routine->id,
                    'label' => $routine->name,
                ]),

            'executors' => User::select('id', 'name')
                ->whereHas('executedRoutines')
                ->orderBy('name')
                ->get()
                ->map(fn ($user) => [
                    'value' => $user->id,
                    'label' => $user->name,
                ]),

            'statuses' => [
                ['value' => RoutineExecution::STATUS_PENDING, 'label' => 'Pending'],
                ['value' => RoutineExecution::STATUS_IN_PROGRESS, 'label' => 'In Progress'],
                ['value' => RoutineExecution::STATUS_COMPLETED, 'label' => 'Completed'],
                ['value' => RoutineExecution::STATUS_CANCELLED, 'label' => 'Cancelled'],
            ],

            'datePresets' => [
                ['value' => 'today', 'label' => 'Today'],
                ['value' => 'yesterday', 'label' => 'Yesterday'],
                ['value' => 'this_week', 'label' => 'This Week'],
                ['value' => 'last_week', 'label' => 'Last Week'],
                ['value' => 'this_month', 'label' => 'This Month'],
                ['value' => 'last_month', 'label' => 'Last Month'],
                ['value' => 'last_30_days', 'label' => 'Last 30 Days'],
                ['value' => 'last_90_days', 'label' => 'Last 90 Days'],
                ['value' => 'custom', 'label' => 'Custom Range'],
            ],
        ];
    }

    /**
     * Extract filters from request
     */
    private function getFiltersFromRequest(Request $request): array
    {
        $filters = $request->only([
            'search',
            'asset_ids',
            'routine_ids',
            'executor_ids',
            'status',
            'date_preset',
            'date_from',
            'date_to',
        ]);

        // Handle date presets
        if (! empty($filters['date_preset']) && $filters['date_preset'] !== 'custom') {
            $dateRange = $this->getDateRangeFromPreset($filters['date_preset']);
            $filters['date_from'] = $dateRange['from'];
            $filters['date_to'] = $dateRange['to'];
        }

        // Clean up empty arrays
        foreach (['asset_ids', 'routine_ids', 'executor_ids', 'status'] as $key) {
            if (isset($filters[$key]) && empty($filters[$key])) {
                unset($filters[$key]);
            }
        }

        return array_filter($filters);
    }

    /**
     * Get date range from preset
     */
    private function getDateRangeFromPreset(string $preset): array
    {
        $now = now();

        return match ($preset) {
            'today' => [
                'from' => $now->copy()->startOfDay(),
                'to' => $now->copy()->endOfDay(),
            ],
            'yesterday' => [
                'from' => $now->copy()->subDay()->startOfDay(),
                'to' => $now->copy()->subDay()->endOfDay(),
            ],
            'this_week' => [
                'from' => $now->copy()->startOfWeek(),
                'to' => $now->copy()->endOfWeek(),
            ],
            'last_week' => [
                'from' => $now->copy()->subWeek()->startOfWeek(),
                'to' => $now->copy()->subWeek()->endOfWeek(),
            ],
            'this_month' => [
                'from' => $now->copy()->startOfMonth(),
                'to' => $now->copy()->endOfMonth(),
            ],
            'last_month' => [
                'from' => $now->copy()->subMonth()->startOfMonth(),
                'to' => $now->copy()->subMonth()->endOfMonth(),
            ],
            'last_30_days' => [
                'from' => $now->copy()->subDays(30)->startOfDay(),
                'to' => $now->copy()->endOfDay(),
            ],
            'last_90_days' => [
                'from' => $now->copy()->subDays(90)->startOfDay(),
                'to' => $now->copy()->endOfDay(),
            ],
            default => [
                'from' => null,
                'to' => null,
            ],
        };
    }
}

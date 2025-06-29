<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\Maintenance\RoutineExecution;
use App\Services\ExecutionAnalyticsService;
use App\Services\ResponseFormatterService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExecutionResponseController extends Controller
{
    public function __construct(
        private ResponseFormatterService $responseFormatterService,
        private ExecutionAnalyticsService $analyticsService
    ) {}

    /**
     * Show paginated list of executions
     */
    public function index(Request $request): Response
    {
        // $this->authorize('viewAny', RoutineExecution::class);

        $query = RoutineExecution::with([
            'routine.assets',
            'executor',
            'formExecution',
        ]);

        // Apply filters
        $this->applyFilters($query, $request);

        // Apply sorting
        $this->applySorting($query, $request);

        // Paginate
        $perPage = (int) $request->get('per_page', 25);
        $perPage = in_array($perPage, [25, 50, 100]) ? $perPage : 25;

        $executions = $query->paginate($perPage)->withQueryString();

        // Transform data for frontend
        $executions->getCollection()->transform(function ($execution) {
            return [
                'id' => $execution->id,
                'routine' => [
                    'id' => $execution->routine->id,
                    'name' => $execution->routine->name,
                ],
                'assets' => $execution->routine->assets->map(fn ($asset) => [
                    'id' => $asset->id,
                    'tag' => $asset->tag,
                    'description' => $asset->description,
                ]),
                'executor' => [
                    'id' => $execution->executor->id,
                    'name' => $execution->executor->name,
                ],
                'status' => $execution->status,
                'progress' => $execution->progress_percentage,
                'started_at' => $execution->started_at,
                'completed_at' => $execution->completed_at,
                'duration_minutes' => $execution->duration_minutes,
                'task_summary' => $execution->task_summary,
                'primary_asset_tag' => $execution->primary_asset_tag,
            ];
        });

        return Inertia::render('maintenance/routines/index', [
            'executions' => $executions,
            'filters' => $this->getActiveFilters($request),
            'filterOptions' => $this->getFilterOptions(),
            'sortOptions' => $this->getSortOptions(),
            'currentSort' => [
                'column' => $request->get('sort_by', 'started_at'),
                'direction' => $request->get('sort_direction', 'desc'),
            ],
        ]);
    }

    /**
     * Show detailed execution view
     */
    public function show(Request $request, RoutineExecution $execution): Response
    {
        // $this->authorize('view', $execution);

        // Load all necessary relationships
        $execution->loadMissing([
            'routine.assets',
            'routine.form.currentVersion',
            'formExecution.taskResponses.formTask.instructions',
            'formExecution.taskResponses.attachments',
            'formExecution.formVersion',
            'executor',
        ]);

        // Format task responses
        $formattedResponses = [];
        if ($execution->formExecution && $execution->formExecution->taskResponses) {
            foreach ($execution->formExecution->taskResponses as $response) {
                $formattedResponses[] = [
                    'id' => $response->id,
                    'task' => [
                        'id' => $response->formTask->id,
                        'type' => $response->formTask->type,
                        'description' => $response->formTask->description,
                        'is_required' => $response->formTask->is_required,
                        'configuration' => $response->formTask->configuration,
                        'instructions' => $response->formTask->instructions->map(fn ($inst) => [
                            'id' => $inst->id,
                            'type' => $inst->type,
                            'content' => $inst->content,
                            'position' => $inst->position,
                        ])->toArray(),
                    ],
                    'response' => $this->responseFormatterService->formatResponse($response),
                    'is_completed' => $response->is_completed,
                    'responded_at' => $response->responded_at,
                ];
            }
        }

        // Get timeline
        $timeline = $execution->timeline;

        return Inertia::render('maintenance/routines/show', [
            'execution' => [
                'id' => $execution->id,
                'routine' => [
                    'id' => $execution->routine->id,
                    'name' => $execution->routine->name,
                    'description' => $execution->routine->description,
                ],
                'assets' => $execution->routine->assets->map(fn ($asset) => [
                    'id' => $asset->id,
                    'tag' => $asset->tag,
                    'description' => $asset->description,
                ]),
                'executor' => [
                    'id' => $execution->executor->id,
                    'name' => $execution->executor->name,
                ],
                'form_execution' => $execution->formExecution ? [
                    'id' => $execution->formExecution->id,
                    'form_version' => [
                        'id' => $execution->formExecution->formVersion->id,
                        'version_number' => $execution->formExecution->formVersion->version_number,
                        'published_at' => $execution->formExecution->formVersion->published_at,
                    ],
                ] : null,
                'status' => $execution->status,
                'progress' => $execution->progress_percentage,
                'started_at' => $execution->started_at,
                'completed_at' => $execution->completed_at,
                'duration_minutes' => $execution->duration_minutes,
                'notes' => $execution->notes,
                'task_summary' => $execution->task_summary,
                'timeline' => $timeline,
            ],
            'taskResponses' => $formattedResponses,
            'canExport' => true, // $request->user()->can('export', $execution),
        ]);
    }

    /**
     * Get execution data via API
     */
    public function api(Request $request)
    {
        // $this->authorize('viewAny', RoutineExecution::class);

        $query = RoutineExecution::with([
            'routine.assets',
            'executor',
            'formExecution',
        ]);

        $this->applyFilters($query, $request);
        $this->applySorting($query, $request);

        $perPage = (int) $request->get('per_page', 25);
        $perPage = in_array($perPage, [25, 50, 100]) ? $perPage : 25;

        $executions = $query->paginate($perPage);

        return response()->json($executions);
    }

    /**
     * Apply filters to query
     */
    private function applyFilters(Builder $query, Request $request): void
    {
        // Search filter
        if ($search = $request->get('search')) {
            $query->search($search);
        }

        // Date range filter
        if ($dateFrom = $request->get('date_from')) {
            $dateTo = $request->get('date_to', now());
            $query->filterByDateRange($dateFrom, $dateTo);
        }

        // Asset filter
        if ($assetIds = $request->get('asset_ids')) {
            $assetIds = is_array($assetIds) ? $assetIds : [$assetIds];
            $query->filterByAssets($assetIds);
        }

        // Routine filter
        if ($routineIds = $request->get('routine_ids')) {
            $routineIds = is_array($routineIds) ? $routineIds : [$routineIds];
            $query->filterByRoutines($routineIds);
        }

        // Executor filter
        if ($executorIds = $request->get('executor_ids')) {
            $executorIds = is_array($executorIds) ? $executorIds : [$executorIds];
            $query->filterByExecutors($executorIds);
        }

        // Status filter
        if ($statuses = $request->get('status')) {
            $statuses = is_array($statuses) ? $statuses : [$statuses];
            $query->filterByStatus($statuses);
        }
    }

    /**
     * Apply sorting to query
     */
    private function applySorting(Builder $query, Request $request): void
    {
        $sortBy = $request->get('sort_by', 'started_at');
        $sortDirection = $request->get('sort_direction', 'desc');

        // Validate sort direction
        $sortDirection = in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc';

        // Apply sorting based on column
        switch ($sortBy) {
            case 'routine_name':
                // Use relationship for sorting
                $query->whereHas('routine')
                    ->with('routine')
                    ->orderBy(
                        \App\Models\Maintenance\Routine::select('name')
                            ->whereColumn('routines.id', 'routine_executions.routine_id'),
                        $sortDirection
                    );
                break;

            case 'executor_name':
                // Use relationship for sorting
                $query->whereHas('executor')
                    ->with('executor')
                    ->orderBy(
                        \App\Models\User::select('name')
                            ->whereColumn('users.id', 'routine_executions.executed_by'),
                        $sortDirection
                    );
                break;

            case 'duration':
                // Sort by the duration_minutes accessor which is already calculated
                $query->orderBy('completed_at', $sortDirection)
                    ->orderBy('started_at', $sortDirection === 'desc' ? 'asc' : 'desc');
                break;

            default:
                // Default to standard columns
                if (in_array($sortBy, ['id', 'started_at', 'completed_at', 'status'])) {
                    $query->orderBy($sortBy, $sortDirection);
                } else {
                    $query->orderBy('started_at', 'desc');
                }
                break;
        }
    }

    /**
     * Get active filters from request
     */
    private function getActiveFilters(Request $request): array
    {
        return array_filter($request->only([
            'search',
            'date_from',
            'date_to',
            'asset_ids',
            'routine_ids',
            'executor_ids',
            'status',
        ]));
    }

    /**
     * Get filter options
     */
    private function getFilterOptions(): array
    {
        // Apply filters and sorting logic
        return [
            'assets' => \App\Models\AssetHierarchy\Asset::select('id', 'tag', 'description')
                ->whereHas('routines.routineExecutions')
                ->orderBy('tag')
                ->get()
                ->map(fn ($asset) => [
                    'value' => $asset->id,
                    'label' => "{$asset->tag} - {$asset->description}",
                ]),

            'routines' => \App\Models\Maintenance\Routine::select('id', 'name', 'description')
                ->whereHas('routineExecutions')
                ->orderBy('name')
                ->get()
                ->map(fn ($routine) => [
                    'value' => $routine->id,
                    'label' => $routine->name,
                ]),

            'executors' => \App\Models\User::select('id', 'name')
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
        ];
    }

    /**
     * Get sort options
     */
    private function getSortOptions(): array
    {
        return [
            ['value' => 'started_at', 'label' => 'Start Date'],
            ['value' => 'completed_at', 'label' => 'Completion Date'],
            ['value' => 'routine_name', 'label' => 'Routine Name'],
            ['value' => 'executor_name', 'label' => 'Executor'],
            ['value' => 'status', 'label' => 'Status'],
            ['value' => 'duration', 'label' => 'Duration'],
        ];
    }
}

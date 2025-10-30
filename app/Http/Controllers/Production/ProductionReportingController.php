<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\BaseSearchController;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Services\Production\ManufacturingOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductionReportingController extends BaseSearchController
{
    protected ManufacturingOrderService $orderService;

    public function __construct(ManufacturingOrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Display the production reporting interface for steps.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingStep::class);

        $user = auth()->user();

        // Build query for executable steps
        $query = ManufacturingStep::query()
            ->whereIn('manufacturing_steps.status', ['queued', 'in_progress', 'on_hold', 'awaiting_quality'])
            ->with([
                'workCell',
                'manufacturingRoute' => function ($query) {
                    $query->with([
                        'manufacturingOrder' => function ($orderQuery) {
                            $orderQuery->with(['item.media']);
                        },
                        'steps' => function ($stepsQuery) {
                            $stepsQuery->with(['workCell', 'executions']);
                        },
                    ]);
                },
                'executions' => function ($query) {
                    $query->where('manufacturing_step_executions.status', 'in_progress')
                        ->with(['executedBy']);
                },
            ]);

        // Apply search filter
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('manufacturing_steps.name', 'like', "%{$request->search}%")
                    ->orWhereHas('manufacturingRoute.manufacturingOrder', function ($orderQuery) use ($request) {
                        $orderQuery->where('order_number', 'like', "%{$request->search}%");
                    })
                    ->orWhereHas('manufacturingRoute.manufacturingOrder.item', function ($itemQuery) use ($request) {
                        $itemQuery->where('items.name', 'like', "%{$request->search}%")
                            ->orWhere('items.item_number', 'like', "%{$request->search}%");
                    });
            });
        }

        // Apply step status filter
        $stepStatuses = $request->statuses ?? 'queued,in_progress,on_hold,awaiting_quality';
        if ($stepStatuses) {
            $statuses = is_array($stepStatuses)
                ? $stepStatuses
                : explode(',', $stepStatuses);
            $query->whereIn('manufacturing_steps.status', $statuses);
        }

        // Apply step type filter
        if ($request->step_type) {
            $query->where('manufacturing_steps.step_type', $request->step_type);
        }

        // Apply work cell filter
        if ($request->work_cell_id) {
            $query->where('manufacturing_steps.work_cell_id', $request->work_cell_id);
        }

        // Filter only steps with active manufacturing orders
        $query->whereHas('manufacturingRoute.manufacturingOrder', function ($q) {
            $q->whereIn('manufacturing_orders.status', ['released', 'in_progress']);
        });

        // Sort by priority and due date
        $query->orderByRaw("CASE manufacturing_steps.status 
            WHEN 'in_progress' THEN 1 
            WHEN 'awaiting_quality' THEN 2 
            WHEN 'on_hold' THEN 3 
            WHEN 'queued' THEN 4 
            ELSE 5 
            END");

        // Secondary sort by MO priority and due date
        $query->join('manufacturing_routes', 'manufacturing_routes.id', '=', 'manufacturing_steps.manufacturing_route_id')
            ->join('manufacturing_orders', 'manufacturing_orders.id', '=', 'manufacturing_routes.manufacturing_order_id')
            ->orderBy('manufacturing_orders.priority', 'desc')
            ->orderBy('manufacturing_orders.requested_date', 'asc')
            ->select('manufacturing_steps.*');

        // Paginate results
        $steps = $query->paginate($request->per_page ?? 20);

        // Transform steps to include additional computed properties
        $steps->through(function ($step) {
            $order = $step->manufacturingRoute->manufacturingOrder;

            // Add execution info
            $currentExecution = $step->executions->first();

            // Check if step can be executed
            $canExecute = false;
            $cannotExecuteReason = null;

            switch ($step->status) {
                case 'queued':
                    $canExecute = $step->canStart();
                    if (! $canExecute) {
                        $cannotExecuteReason = 'Dependencies not met';
                    }
                    break;
                case 'in_progress':
                case 'on_hold':
                case 'awaiting_quality':
                    $canExecute = true;
                    break;
                default:
                    $cannotExecuteReason = 'Invalid step state';
            }

            return [
                'step' => [
                    'id' => $step->id,
                    'name' => $step->name,
                    'status' => $step->status,
                    'step_type' => $step->step_type,
                    'display_position' => $step->display_position,
                    'work_cell' => $step->workCell,
                    'setup_time_minutes' => $step->setup_time_minutes,
                    'cycle_time_minutes' => $step->cycle_time_minutes,
                    'quality_check_mode' => $step->quality_check_mode,
                ],
                'order' => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'item' => $order->item,
                    'item_id' => $order->item_id,
                    'quantity' => $order->quantity,
                    'quantity_completed' => $order->quantity_completed,
                    'quantity_scrapped' => $order->quantity_scrapped,
                    'unit_of_measure' => $order->unit_of_measure,
                    'unit_of_measure_code' => $order->unit_of_measure_code,
                    'priority' => $order->priority,
                    'requested_date' => $order->requested_date,
                    'status' => $order->status,
                    'child_orders_count' => $order->child_orders_count ?? 0,
                    'completed_child_orders_count' => $order->completed_child_orders_count ?? 0,
                    'auto_complete_on_children' => $order->auto_complete_on_children ?? false,
                    'manufacturing_route' => [
                        'id' => $step->manufacturingRoute->id,
                        'name' => $step->manufacturingRoute->name,
                        'steps' => $step->manufacturingRoute->steps->map(function ($routeStep) {
                            return [
                                'id' => $routeStep->id,
                                'name' => $routeStep->name,
                                'display_position' => $routeStep->display_position,
                                'status' => $routeStep->status,
                                'step_type' => $routeStep->step_type,
                                'work_cell' => $routeStep->workCell,
                                'executions' => $routeStep->executions,
                                'cumulative_quantity_completed' => $routeStep->cumulative_quantity_completed,
                                'cumulative_quantity_scrapped' => $routeStep->cumulative_quantity_scrapped,
                                'next_step' => $routeStep->next_step,
                                'can_start' => $routeStep->canStart(),
                                'cannot_start_reason' => $routeStep->cannot_start_reason,
                            ];
                        }),
                    ],
                ],
                'execution' => $currentExecution ? [
                    'id' => $currentExecution->id,
                    'manufacturing_step_id' => $currentExecution->manufacturing_step_id,
                    'manufacturing_order_id' => $currentExecution->manufacturing_order_id,
                    'status' => $currentExecution->status,
                    'started_at' => $currentExecution->started_at,
                    'completed_at' => $currentExecution->completed_at,
                    'progress_percentage' => $order->quantity > 0
                        ? round(($currentExecution->quantity_completed / $order->quantity) * 100, 2)
                        : 0,
                    'quantity_completed' => $currentExecution->quantity_completed,
                    'quantity_scrapped' => $currentExecution->quantity_scrapped,
                    'executed_by' => $currentExecution->executedBy,
                    'total_hold_duration' => $currentExecution->total_hold_duration ?? 0,
                    'hold_reason' => $currentExecution->hold_reason,
                    'hold_duration' => $currentExecution->total_hold_duration,
                    'previous_state' => $currentExecution->previous_state,
                    'held_by' => $currentExecution->executedBy, // Using executedBy as held_by doesn't exist
                    'held_at' => $currentExecution->on_hold_at,
                    'media' => $currentExecution ? $currentExecution->getStepPhotos() : [],
                ] : null,
                'can_execute' => $canExecute,
                'cannot_execute_reason' => $cannotExecuteReason,
            ];
        });

        // Get status counts for steps
        $statusCounts = ManufacturingStep::query()
            ->whereIn('manufacturing_steps.status', ['queued', 'in_progress', 'on_hold', 'awaiting_quality'])
            ->whereHas('manufacturingRoute.manufacturingOrder', function ($q) {
                $q->whereIn('manufacturing_orders.status', ['released', 'in_progress']);
            })
            ->when($request->work_cell_id, function ($q) use ($request) {
                $q->where('manufacturing_steps.work_cell_id', $request->work_cell_id);
            })
            ->selectRaw('manufacturing_steps.status, COUNT(*) as count')
            ->groupBy('manufacturing_steps.status')
            ->pluck('count', 'status')
            ->toArray();

        // Ensure all statuses are present
        $allStatuses = ['queued', 'in_progress', 'on_hold', 'awaiting_quality'];
        foreach ($allStatuses as $status) {
            if (! isset($statusCounts[$status])) {
                $statusCounts[$status] = 0;
            }
        }

        // Get work cells for filtering
        $workCells = WorkCell::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('production/reporting/index', [
            'steps' => $steps,
            'stepStatusCounts' => $statusCounts,
            'workCells' => $workCells,
            'filters' => [
                'search' => $request->search,
                'statuses' => $request->statuses ?? 'queued,in_progress,on_hold,awaiting_quality',
                'work_cell_id' => $request->work_cell_id,
                'step_type' => $request->step_type,
                'per_page' => $request->per_page ?? 20,
                'page' => $request->page ?? 1,
            ],
            'canExecute' => $user->can('execute', ManufacturingStep::class),
        ]);
    }
}

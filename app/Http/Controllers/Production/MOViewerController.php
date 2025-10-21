<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\WorkCell;
use App\Models\Production\ManufacturingStep;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class MOViewerController extends Controller
{
    /**
     * Display the MO Viewer page with hierarchical production view.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        // Get filter parameters
        $filters = $request->only([
            'search',
            'statuses',
            'show_completed',
        ]);

        // Default to showing only active statuses if not specified
        if (!isset($filters['statuses']) || empty($filters['statuses'])) {
            $filters['statuses'] = 'released,in_progress,on_hold';
        }

        // Convert comma-separated statuses to array
        $statusFilter = is_string($filters['statuses']) 
            ? explode(',', $filters['statuses']) 
            : $filters['statuses'];

        // Build the query for manufacturing orders with active production
        $query = ManufacturingOrder::query()
            ->with([
                'item.media',
                'parent:id,order_number',
                'children' => function ($query) use ($statusFilter, $filters) {
                    $query->whereIn('status', $statusFilter)
                        ->with([
                            'item.media',
                            'children' => function ($query) use ($statusFilter) {
                                $query->whereIn('status', $statusFilter)
                                    ->with([
                                        'item.media',
                                        'children' => function ($query) use ($statusFilter) {
                                            $query->whereIn('status', $statusFilter)
                                                ->with([
                                                    'item.media',
                                                    'children' => function ($query) use ($statusFilter) {
                                                        $query->whereIn('status', $statusFilter)
                                                            ->with(['item.media']);
                                                    }
                                                ]);
                                        }
                                    ]);
                            }
                        ]);
                },
                'manufacturingRoute.steps' => function ($query) {
                    $query->with([
                        'workCell:id,name',
                        'currentExecution' => function ($query) {
                            $query->with('executedBy:id,name');
                        }
                    ])
                    ->orderBy('step_number');
                }
            ])
            ->whereIn('status', $statusFilter)
            ->whereNull('parent_id'); // Only get top-level orders

        // Apply search filter
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('item', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('item_number', 'like', "%{$search}%");
                    });
            });
        }

        // Order by priority and requested date
        $query->orderBy('priority', 'desc')
            ->orderBy('requested_date', 'asc');

        // Get the orders
        $orders = $query->get();

        // Transform orders into hierarchical structure with production metrics
        $transformedOrders = $this->transformOrdersHierarchy($orders);

        // Get status counts for active orders
        $statusCounts = ManufacturingOrder::query()
            ->whereIn('status', ['released', 'in_progress', 'on_hold'])
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Get all active work cells for filtering
        $workCells = WorkCell::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('production/tracking/mo-viewer', [
            'orders' => $transformedOrders,
            'statusCounts' => $statusCounts,
            'workCells' => $workCells,
            'filters' => $filters,
            'canUpdate' => auth()->user()->can('update', ManufacturingOrder::class),
        ]);
    }

    /**
     * Transform orders into hierarchical structure with production metrics
     */
    private function transformOrdersHierarchy($orders)
    {
        return $orders->map(function ($order) {
            return $this->transformOrder($order);
        });
    }

    /**
     * Transform a single order with its hierarchy
     */
    private function transformOrder($order, $level = 0)
    {
        // Calculate route steps metrics
        $routeSteps = [];
        $totalSteps = 0;
        $completedSteps = 0;
        $inProgressSteps = 0;
        $hasQualityIssues = false;
        $hasDelays = false;

        if ($order->manufacturingRoute) {
            foreach ($order->manufacturingRoute->steps as $step) {
                $totalSteps++;
                
                if ($step->status === 'completed') {
                    $completedSteps++;
                } elseif ($step->status === 'in_progress') {
                    $inProgressSteps++;
                }

                // Check for quality issues (rejection rate > 5%)
                $rejectionRate = $step->quantity_completed > 0 
                    ? ($step->quantity_scrapped / ($step->quantity_completed + $step->quantity_scrapped)) * 100 
                    : 0;
                
                if ($rejectionRate > 5) {
                    $hasQualityIssues = true;
                }

                // Check for delays (actual time > planned time by 20%)
                $timeVariance = 0;
                if ($step->actual_cycle_time_seconds && $step->planned_cycle_time_seconds) {
                    $timeVariance = (($step->actual_cycle_time_seconds - $step->planned_cycle_time_seconds) / $step->planned_cycle_time_seconds) * 100;
                    if ($timeVariance > 20) {
                        $hasDelays = true;
                    }
                }

                // Calculate total expected time for the step
                $setupTime = $step->setup_time_seconds ?? 0;
                $cycleTime = $step->cycle_time_seconds ?? 0;
                $totalTime = $setupTime + ($cycleTime * $step->quantity);

                $routeSteps[] = [
                    'id' => $step->id,
                    'name' => $step->name ?? "Step {$step->step_number}",
                    'step_number' => $step->step_number,
                    'status' => $step->status,
                    'work_cell' => $step->workCell ? [
                        'id' => $step->workCell->id,
                        'name' => $step->workCell->name,
                    ] : null,
                    'quantity_completed' => $step->quantity_completed,
                    'quantity_scrapped' => $step->quantity_scrapped,
                    'quantity_total' => $step->quantity,
                    'rejection_rate' => round($rejectionRate, 1),
                    'current_operator' => $step->currentExecution?->executedBy ? [
                        'id' => $step->currentExecution->executedBy->id,
                        'name' => $step->currentExecution->executedBy->name,
                    ] : null,
                    'has_quality_issue' => $rejectionRate > 5,
                    'has_delay' => $timeVariance > 20,
                    'setup_time_seconds' => $setupTime,
                    'cycle_time_seconds' => $cycleTime,
                    'total_time_seconds' => $totalTime,
                ];
            }
        }

        // Calculate overall progress
        $overallProgress = $totalSteps > 0 ? round(($completedSteps / $totalSteps) * 100) : 0;

        // Calculate production progress based on quantities
        $productionProgress = $order->quantity > 0 
            ? round(($order->quantity_completed / $order->quantity) * 100) 
            : 0;

        // Check if order is overdue
        $isOverdue = $order->requested_date 
            && $order->requested_date < now() 
            && !in_array($order->status, ['completed', 'cancelled']);

        // Build the transformed order object
        $transformed = [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'priority' => $order->priority,
            'level' => $level,
            'item' => $order->item ? [
                'id' => $order->item->id,
                'item_number' => $order->item->item_number,
                'name' => $order->item->name,
                'thumbnail_url' => null, // This attribute doesn't exist in the Item model
                'primary_image_thumbnail_url' => $order->item->primary_image_thumbnail_url,
                'primary_image_url' => $order->item->primary_image_url,
                'media' => $order->item->media ? $order->item->media->map(function ($media) {
                    return [
                        'id' => $media->id,
                        'url' => $media->getUrl(),
                        'thumbnail' => $media->getUrl('thumbnail'),
                    ];
                })->toArray() : [],
            ] : null,
            'quantity' => $order->quantity,
            'quantity_completed' => $order->quantity_completed,
            'quantity_scrapped' => $order->quantity_scrapped,
            'unit_of_measure' => $order->unit_of_measure,
            'requested_date' => $order->requested_date,
            'release_date' => $order->release_date,
            'overall_progress' => $overallProgress,
            'production_progress' => $productionProgress,
            'route_steps' => $routeSteps,
            'total_steps' => $totalSteps,
            'completed_steps' => $completedSteps,
            'in_progress_steps' => $inProgressSteps,
            'has_quality_issues' => $hasQualityIssues,
            'has_delays' => $hasDelays,
            'is_overdue' => $isOverdue,
            'has_route' => $order->has_route,
            'children' => [],
        ];

        // Recursively transform child orders
        if ($order->children && $order->children->count() > 0) {
            $transformed['children'] = $order->children->map(function ($childOrder) use ($level) {
                return $this->transformOrder($childOrder, $level + 1);
            })->toArray();
        }

        return $transformed;
    }

    /**
     * Refresh data for a specific order family
     */
    public function refresh(Request $request, $orderId)
    {
        $this->authorize('view', ManufacturingOrder::class);

        $order = ManufacturingOrder::with([
            'item.media',
            'children' => function ($query) {
                $query->with([
                    'item.media',
                    'children' => function ($query) {
                        $query->with([
                            'item.media',
                            'children' => function ($query) {
                                $query->with([
                                    'item.media',
                                    'children.item.media'
                                ]);
                            }
                        ]);
                    },
                    'manufacturingRoute.steps.workCell',
                    'manufacturingRoute.steps.currentExecution.executedBy',
                ]);
            },
            'manufacturingRoute.steps.workCell',
            'manufacturingRoute.steps.currentExecution.executedBy',
        ])->findOrFail($orderId);

        return response()->json([
            'order' => $this->transformOrder($order),
        ]);
    }
}

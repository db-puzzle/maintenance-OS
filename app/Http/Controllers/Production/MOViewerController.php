<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

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
            'selected_order_id',
            'sort',
        ]);

        // Default to showing only active statuses if not specified
        if (! isset($filters['statuses']) || empty($filters['statuses'])) {
            $filters['statuses'] = 'released,in_progress,on_hold';
        }

        // Default sort option
        if (! isset($filters['sort']) || empty($filters['sort'])) {
            $filters['sort'] = 'priority_date'; // Default sorting
        }

        // Convert comma-separated statuses to array
        $statusFilter = is_string($filters['statuses'])
            ? explode(',', $filters['statuses'])
            : $filters['statuses'];

        // Build comprehensive eager loading to prevent N+1 queries
        $stepEagerLoads = [
            'workCell:id,name',
            'currentExecution' => function ($query) {
                $query->with('executedBy:id,name');
            },
            // Load dependency chain for canStart() checks
            'dependency.manufacturingRoute.manufacturingOrder',
        ];

        // Build the query for manufacturing orders with active production
        $query = ManufacturingOrder::query()
            ->with([
                'item.media',
                'parent:id,order_number',
                'parent.manufacturingRoute.steps:id,manufacturing_route_id,child_order_dependency_type,child_order_minimum_quantity,depends_on_step_id',
                'children' => function ($query) use ($statusFilter, $stepEagerLoads) {
                    $query->whereIn('status', $statusFilter)
                        ->withCount(['children'])
                        ->withCount(['children as completed_child_orders_count' => function ($q) {
                            $q->where('status', 'completed');
                        }])
                        ->with([
                            'item.media',
                            'children' => function ($query) use ($statusFilter, $stepEagerLoads) {
                                $query->whereIn('status', $statusFilter)
                                    ->withCount(['children'])
                                    ->withCount(['children as completed_child_orders_count' => function ($q) {
                                        $q->where('status', 'completed');
                                    }])
                                    ->with([
                                        'item.media',
                                        'children' => function ($query) use ($statusFilter, $stepEagerLoads) {
                                            $query->whereIn('status', $statusFilter)
                                                ->withCount(['children'])
                                                ->withCount(['children as completed_child_orders_count' => function ($q) {
                                                    $q->where('status', 'completed');
                                                }])
                                                ->with([
                                                    'item.media',
                                                    'children' => function ($query) use ($statusFilter) {
                                                        $query->whereIn('status', $statusFilter)
                                                            ->withCount(['children'])
                                                            ->withCount(['children as completed_child_orders_count' => function ($q) {
                                                                $q->where('status', 'completed');
                                                            }])
                                                            ->with(['item.media']);
                                                    },
                                                    'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                                        $query->with($stepEagerLoads);
                                                    },
                                                ]);
                                        },
                                        'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                            $query->with($stepEagerLoads);
                                        },
                                    ]);
                            },
                            'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                $query->with($stepEagerLoads);
                            },
                        ]);
                },
                'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                    $query->with($stepEagerLoads);
                },
            ])
            ->withCount(['children'])
            ->withCount(['children as completed_child_orders_count' => function ($q) {
                $q->where('status', 'completed');
            }])
            ->whereIn('status', $statusFilter)
            ->whereNull('parent_id'); // Only get top-level orders

        // Apply search filter
        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('item', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('item_number', 'like', "%{$search}%");
                    });
            });
        }

        // Apply sorting based on sort parameter
        $this->applySorting($query, $filters['sort']);

        // Check if a specific order is selected - if so, skip loading the general list
        $selectedOrderHierarchy = null;
        $transformedOrders = [];

        if (! empty($filters['selected_order_id'])) {
            $selectedOrder = ManufacturingOrder::find($filters['selected_order_id']);
            if ($selectedOrder) {
                // Get root order if this is a child
                $rootOrder = $selectedOrder;
                while ($rootOrder->parent_id) {
                    $rootOrder = ManufacturingOrder::find($rootOrder->parent_id);
                    if (! $rootOrder) {
                        break;
                    }
                }

                if ($rootOrder) {
                    // Load complete hierarchy with optimized eager loading
                    $rootOrder->load([
                        'item.media',
                        'children' => function ($query) use ($stepEagerLoads) {
                            $query->withCount(['children'])
                                ->withCount(['children as completed_child_orders_count' => function ($q) {
                                    $q->where('status', 'completed');
                                }])
                                ->with([
                                    'item.media',
                                    'children' => function ($query) use ($stepEagerLoads) {
                                        $query->withCount(['children'])
                                            ->withCount(['children as completed_child_orders_count' => function ($q) {
                                                $q->where('status', 'completed');
                                            }])
                                            ->with([
                                                'item.media',
                                                'children' => function ($query) use ($stepEagerLoads) {
                                                    $query->withCount(['children'])
                                                        ->withCount(['children as completed_child_orders_count' => function ($q) {
                                                            $q->where('status', 'completed');
                                                        }])
                                                        ->with([
                                                            'item.media',
                                                            'children' => function ($query) {
                                                                $query->withCount(['children'])
                                                                    ->withCount(['children as completed_child_orders_count' => function ($q) {
                                                                        $q->where('status', 'completed');
                                                                    }])
                                                                    ->with(['item.media']);
                                                            },
                                                            'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                                                $query->with($stepEagerLoads);
                                                            },
                                                        ]);
                                                },
                                                'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                                    $query->with($stepEagerLoads);
                                                },
                                            ]);
                                    },
                                    'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                        $query->with($stepEagerLoads);
                                    },
                                ]);
                        },
                        'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                            $query->with($stepEagerLoads);
                        },
                    ])
                        ->loadCount(['children'])
                        ->loadCount(['children as completed_child_orders_count' => function ($q) {
                            $q->where('status', 'completed');
                        }]);

                    $selectedOrderHierarchy = $this->transformOrder($rootOrder, 0, $filters['sort']);
                }
            }
        } else {
            // No specific order selected - load the general list
            $orders = $query->get();
            $transformedOrders = $this->transformOrdersHierarchy($orders, $filters['sort']);
        }

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
            'selectedOrderHierarchy' => $selectedOrderHierarchy,
            'statusCounts' => $statusCounts,
            'workCells' => $workCells,
            'filters' => $filters,
            'canUpdate' => auth()->user()->can('update', ManufacturingOrder::class),
        ]);
    }

    /**
     * Transform orders into hierarchical structure with production metrics.
     */
    private function transformOrdersHierarchy($orders, $sortBy = 'priority_date')
    {
        return $orders->map(function ($order) use ($sortBy) {
            return $this->transformOrder($order, 0, $sortBy);
        });
    }

    /**
     * Transform a single order with its hierarchy.
     */
    private function transformOrder($order, $level = 0, $sortBy = 'priority_date')
    {
        // Calculate route steps metrics
        $routeSteps = [];
        $totalSteps = 0;
        $completedSteps = 0;
        $inProgressSteps = 0;
        $hasQualityIssues = false;
        $hasDelays = false;

        if ($order->relationLoaded('manufacturingRoute') && $order->manufacturingRoute && $order->manufacturingRoute->relationLoaded('steps')) {
            // Use already-loaded steps and order them in memory to avoid N+1 queries
            $steps = $order->manufacturingRoute->steps;

            if ($steps->isNotEmpty()) {
                // Order steps by dependency chain in memory
                $orderedSteps = collect();
                $stepsById = $steps->keyBy('id');

                // Find root step (no dependency)
                $current = $steps->firstWhere('depends_on_step_id', null);

                // Build dependency chain
                while ($current) {
                    $orderedSteps->push($current);
                    $current = $steps->firstWhere('depends_on_step_id', $current->id);
                }
            } else {
                $orderedSteps = collect();
            }

            // Process each step in the correct operational sequence
            foreach ($orderedSteps as $index => $step) {
                $totalSteps++;

                // Ensure display_position is set based on actual sequence
                $displayPosition = $index + 1;

                if ($step->status === 'completed') {
                    $completedSteps++;
                } elseif ($step->status === 'in_progress') {
                    $inProgressSteps++;
                }

                // Check for quality issues (rejection rate > 5%)
                $rejectionRate = $step->cumulative_quantity_completed > 0
                    ? ($step->cumulative_quantity_scrapped / ($step->cumulative_quantity_completed + $step->cumulative_quantity_scrapped)) * 100
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

                // Map step status to viewer status format
                $viewerStatus = $this->mapStepStatusToViewerStatus($step->status);

                // Check if step can start and determine reason if not (optimized version)
                $canStart = $this->canStepStartOptimized($step, $order);
                $cannotStartReason = null;

                if (! $canStart) {
                    // Determine the reason why the step cannot start
                    if (! $this->checkStepDependenciesOptimized($step)) {
                        $cannotStartReason = 'Step dependencies not met';
                    } elseif (! $this->checkChildOrderDependenciesOptimized($step, $order)) {
                        $cannotStartReason = 'Child order dependencies not met';
                    } else {
                        $cannotStartReason = 'Unknown reason';
                    }
                }

                $routeSteps[] = [
                    'id' => $step->id,
                    'name' => $step->name ?? "Step {$displayPosition}",
                    'display_position' => $displayPosition, // Use actual sequence position
                    'status' => $step->status,
                    'viewer_status' => $viewerStatus,
                    'work_cell' => $step->workCell ? [
                        'id' => $step->workCell->id,
                        'name' => $step->workCell->name,
                    ] : null,
                    'workcell_name' => $step->workCell?->name,
                    'quantity_completed' => $step->cumulative_quantity_completed,
                    'quantity_scrapped' => $step->cumulative_quantity_scrapped,
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
                    'depends_on_step_id' => $step->depends_on_step_id,
                    'can_start' => $canStart,
                    'cannot_start_reason' => $cannotStartReason,
                    // Child order dependency configuration for gates
                    'child_order_dependency_type' => $step->child_order_dependency_type ?? 'none',
                    'child_order_minimum_quantity' => $step->child_order_minimum_quantity ?? 0,
                    'cumulative_quantity_completed' => $step->cumulative_quantity_completed ?? 0,
                    // Include current execution data for in_progress steps
                    'current_execution' => $step->currentExecution ? [
                        'id' => $step->currentExecution->id,
                        'status' => $step->currentExecution->status,
                        'started_at' => $step->currentExecution->started_at,
                        'quantity_completed' => $step->currentExecution->quantity_completed ?? 0,
                        'quantity_scrapped' => $step->currentExecution->quantity_scrapped ?? 0,
                    ] : null,
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
            && ! in_array($order->status, ['completed', 'cancelled']);

        // Get parent dependency gate information if order has a parent
        $parentDependencyGate = null;
        if ($order->relationLoaded('parent') && $order->parent) {
            // Get the parent's manufacturing route and first step
            $parentFirstStep = $order->parent->relationLoaded('manufacturingRoute')
                && $order->parent->manufacturingRoute
                && $order->parent->manufacturingRoute->relationLoaded('steps')
                ? $order->parent->manufacturingRoute->steps->first()
                : null;

            $parentDependencyGate = [
                'has_parent' => true,
                'dependency_type' => $parentFirstStep?->child_order_dependency_type ?? 'none',
                'minimum_quantity' => $parentFirstStep?->child_order_minimum_quantity ?? 0,
                'parent_order_number' => $order->parent->order_number,
            ];
        } else {
            $parentDependencyGate = [
                'has_parent' => false,
                'dependency_type' => 'none',
                'minimum_quantity' => 0,
                'parent_order_number' => null,
            ];
        }

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
            'has_route' => $order->relationLoaded('manufacturingRoute') ? ($order->manufacturingRoute !== null) : false,
            'parent_dependency_gate' => $parentDependencyGate,
            'children' => [],
        ];

        // Recursively transform child orders with sorting
        if ($order->relationLoaded('children') && $order->children && $order->children->count() > 0) {
            // Sort children based on sortBy parameter
            $sortedChildren = $this->sortCollection($order->children, $sortBy);

            $transformed['children'] = $sortedChildren->map(function ($childOrder) use ($level, $sortBy) {
                return $this->transformOrder($childOrder, $level + 1, $sortBy);
            })->toArray();
        }

        return $transformed;
    }

    /**
     * Refresh data for a specific order family.
     */
    public function refresh(Request $request, $orderId)
    {
        $this->authorize('view', ManufacturingOrder::class);

        // Define step eager loads
        $stepEagerLoads = [
            'workCell:id,name',
            'currentExecution' => function ($query) {
                $query->with('executedBy:id,name');
            },
            // Load dependency chain for canStart() checks
            'dependency.manufacturingRoute.manufacturingOrder',
        ];

        $order = ManufacturingOrder::with([
            'item.media',
            'children' => function ($query) use ($stepEagerLoads) {
                $query->withCount(['children'])
                    ->withCount(['children as completed_child_orders_count' => function ($q) {
                        $q->where('status', 'completed');
                    }])
                    ->with([
                        'item.media',
                        'children' => function ($query) use ($stepEagerLoads) {
                            $query->withCount(['children'])
                                ->withCount(['children as completed_child_orders_count' => function ($q) {
                                    $q->where('status', 'completed');
                                }])
                                ->with([
                                    'item.media',
                                    'children' => function ($query) {
                                        $query->withCount(['children'])
                                            ->withCount(['children as completed_child_orders_count' => function ($q) {
                                                $q->where('status', 'completed');
                                            }])
                                            ->with([
                                                'item.media',
                                                'children.item.media',
                                            ]);
                                    },
                                    'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                        $query->with($stepEagerLoads);
                                    },
                                ]);
                        },
                        'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                            $query->with($stepEagerLoads);
                        },
                    ]);
            },
            'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                $query->with($stepEagerLoads);
            },
        ])
            ->withCount(['children'])
            ->withCount(['children as completed_child_orders_count' => function ($q) {
                $q->where('status', 'completed');
            }])
            ->findOrFail($orderId);

        return response()->json([
            'order' => $this->transformOrder($order),
        ]);
    }

    /**
     * Get complete hierarchy for a specific order (including parent if child)
     * This method supports ALL order states (draft, planned, released, etc.).
     */
    public function hierarchy(Request $request, $orderId)
    {
        try {
            $this->authorize('view', ManufacturingOrder::class);

            $order = ManufacturingOrder::find($orderId);

            if (! $order) {
                return response()->json(['error' => 'Order not found'], 404);
            }

            // If this is a child order, get the root parent
            $rootOrder = $order;
            $parentChain = [];

            while ($rootOrder->parent_id) {
                $parentChain[] = $rootOrder->parent_id;
                $rootOrder = ManufacturingOrder::find($rootOrder->parent_id);

                if (! $rootOrder) {
                    return response()->json(['error' => 'Parent order not found'], 404);
                }
            }

            // Define step eager loads for hierarchy method
            $stepEagerLoads = [
                'workCell:id,name',
                'currentExecution' => function ($query) {
                    $query->with('executedBy:id,name');
                },
                // Load dependency chain for canStart() checks
                'dependency.manufacturingRoute.manufacturingOrder',
            ];

            // Now load the complete hierarchy from the root
            // NO STATUS FILTERING - we want to see all orders regardless of state
            $rootOrder->load([
                'item.media',
                'children' => function ($query) use ($stepEagerLoads) {
                    // NO status filtering here - load ALL children
                    $query->withCount(['children'])
                        ->withCount(['children as completed_child_orders_count' => function ($q) {
                            $q->where('status', 'completed');
                        }])
                        ->with([
                            'item.media',
                            'children' => function ($query) use ($stepEagerLoads) {
                                // NO status filtering here either
                                $query->withCount(['children'])
                                    ->withCount(['children as completed_child_orders_count' => function ($q) {
                                        $q->where('status', 'completed');
                                    }])
                                    ->with([
                                        'item.media',
                                        'children' => function ($query) use ($stepEagerLoads) {
                                            $query->withCount(['children'])
                                                ->withCount(['children as completed_child_orders_count' => function ($q) {
                                                    $q->where('status', 'completed');
                                                }])
                                                ->with([
                                                    'item.media',
                                                    'children' => function ($query) {
                                                        $query->withCount(['children'])
                                                            ->withCount(['children as completed_child_orders_count' => function ($q) {
                                                                $q->where('status', 'completed');
                                                            }])
                                                            ->with(['item.media']);
                                                    },
                                                    'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                                        $query->with($stepEagerLoads);
                                                    },
                                                ]);
                                        },
                                        'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                            $query->with($stepEagerLoads);
                                        },
                                    ]);
                            },
                            'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                                $query->with($stepEagerLoads);
                            },
                        ]);
                },
                'manufacturingRoute.steps' => function ($query) use ($stepEagerLoads) {
                    $query->with($stepEagerLoads);
                },
            ])
                ->loadCount(['children'])
                ->loadCount(['children as completed_child_orders_count' => function ($q) {
                    $q->where('status', 'completed');
                }]);

            // Count total orders in hierarchy for logging
            $totalOrders = 1; // root
            $countChildren = function ($order) use (&$countChildren, &$totalOrders) {
                if ($order->children) {
                    foreach ($order->children as $child) {
                        $totalOrders++;
                        $countChildren($child);
                    }
                }
            };
            $countChildren($rootOrder);

            $transformedOrder = $this->transformOrder($rootOrder);

            return response()->json([
                'order' => $transformedOrder,
            ]);
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return response()->json(['error' => 'Unauthorized'], 403);
        } catch (\Exception $e) {
            // Only log unexpected errors, not normal operation
            \Log::error('MOViewer hierarchy - Unexpected error', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Map manufacturing step status to viewer status format.
     */
    private function mapStepStatusToViewerStatus(string $stepStatus): string
    {
        // Map from ManufacturingStep statuses to MOViewer statuses
        $statusMap = [
            'pending' => 'not_ready',
            'queued' => 'ready',
            'in_progress' => 'in_progress',
            'on_hold' => 'on_hold',
            'awaiting_quality' => 'in_progress',
            'completed' => 'completed',
            'skipped' => 'cancelled',
            'cancelled' => 'cancelled',
        ];

        return $statusMap[$stepStatus] ?? 'not_ready';
    }

    /**
     * Optimized version of canStart() that uses eager-loaded relationships.
     * Prevents N+1 queries by using already-loaded data.
     */
    private function canStepStartOptimized($step, $order): bool
    {
        // Check step dependencies first
        if (! $this->checkStepDependenciesOptimized($step)) {
            return false;
        }

        // Then check child order dependencies
        if (! $this->checkChildOrderDependenciesOptimized($step, $order)) {
            return false;
        }

        return true;
    }

    /**
     * Optimized version of checkStepDependencies() that uses eager-loaded relationships.
     */
    private function checkStepDependenciesOptimized($step): bool
    {
        // If no step dependency, can start
        if (! $step->depends_on_step_id) {
            return true;
        }

        // Use eager-loaded dependency relationship
        if (! $step->relationLoaded('dependency') || ! $step->dependency) {
            // Fallback: if dependency not loaded, assume can't start
            return false;
        }

        $dependency = $step->dependency;

        switch ($step->dependency_start_condition) {
            case 'completed':
                return $dependency->status === 'completed';

            case 'quantity_based':
                return $dependency->cumulative_quantity_completed >= $step->dependency_minimum_quantity;

            case 'percentage_based':
                // Use eager-loaded manufacturingRoute.manufacturingOrder
                if ($dependency->relationLoaded('manufacturingRoute') &&
                    $dependency->manufacturingRoute &&
                    $dependency->manufacturingRoute->relationLoaded('manufacturingOrder') &&
                    $dependency->manufacturingRoute->manufacturingOrder) {
                    $targetQuantity = $dependency->manufacturingRoute->manufacturingOrder->quantity;
                    if ($targetQuantity == 0) {
                        return true;
                    }
                    $completedPercentage = ($dependency->cumulative_quantity_completed / $targetQuantity) * 100;

                    return $completedPercentage >= $step->dependency_minimum_percentage;
                }

                // Fallback if not loaded
                return false;

            case 'immediate':
                return in_array($dependency->status, ['in_progress', 'completed']);

            default:
                // Fallback to completed for backward compatibility
                return $dependency->status === 'completed';
        }
    }

    /**
     * Optimized version of checkChildOrderDependencies() that uses eager-loaded relationships.
     */
    private function checkChildOrderDependenciesOptimized($step, $order): bool
    {
        // If no child order dependency, can start
        if ($step->child_order_dependency_type === 'none') {
            return true;
        }

        // Use the order we already have (it's passed from transformOrder)
        $manufacturingOrder = $order;

        // Check if MO has child orders using eager-loaded count
        if (isset($manufacturingOrder->children_count) && $manufacturingOrder->children_count === 0) {
            return true; // No children to wait for
        }

        switch ($step->child_order_dependency_type) {
            case 'all_children_completed':
                // Use eager-loaded counts
                if (isset($manufacturingOrder->children_count) &&
                    isset($manufacturingOrder->completed_child_orders_count)) {
                    return $manufacturingOrder->completed_child_orders_count ===
                           $manufacturingOrder->children_count;
                }
                // Fallback: if counts not loaded, check using collection
                if ($manufacturingOrder->relationLoaded('children')) {
                    $totalChildren = $manufacturingOrder->children->count();
                    $completedChildren = $manufacturingOrder->children
                        ->where('status', 'completed')
                        ->count();

                    return $completedChildren === $totalChildren;
                }

                return true; // Default to allowing start if we can't determine

            case 'children_quantity':
                // Use eager-loaded children collection
                if ($manufacturingOrder->relationLoaded('children')) {
                    $childOrders = $manufacturingOrder->children
                        ->where('status', '!=', 'cancelled');

                    if ($childOrders->isEmpty()) {
                        return true;
                    }

                    // Find the minimum quantity completed among all child orders
                    $minQuantityCompleted = $childOrders->min('quantity_completed');

                    return $minQuantityCompleted >= $step->child_order_minimum_quantity;
                }

                return true; // Default to allowing start if we can't determine

            default:
                return true;
        }
    }

    /**
     * Apply sorting to a query based on the sort parameter.
     * Uses natural sorting for order_number to handle numeric sequences correctly.
     */
    private function applySorting($query, string $sortBy): void
    {
        switch ($sortBy) {
            case 'order_number':
                // Use LENGTH first to group by number of characters, then alphanumeric
                // This provides pseudo-natural sorting at the database level
                $query->orderByRaw('LENGTH(order_number) ASC, order_number ASC');
                break;

            case 'order_number_desc':
                $query->orderByRaw('LENGTH(order_number) DESC, order_number DESC');
                break;

            case 'priority':
                $query->orderBy('priority', 'desc')
                    ->orderByRaw('LENGTH(order_number) ASC, order_number ASC');
                break;

            case 'requested_date':
                $query->orderBy('requested_date', 'asc')
                    ->orderByRaw('LENGTH(order_number) ASC, order_number ASC');
                break;

            case 'requested_date_desc':
                $query->orderBy('requested_date', 'desc')
                    ->orderByRaw('LENGTH(order_number) ASC, order_number ASC');
                break;

            case 'status':
                $query->orderBy('status', 'asc')
                    ->orderByRaw('LENGTH(order_number) ASC, order_number ASC');
                break;

            case 'priority_date':
            default:
                // Default: Priority (high to low), then requested date (old to new)
                $query->orderBy('priority', 'desc')
                    ->orderBy('requested_date', 'asc');
                break;
        }
    }

    /**
     * Sort a collection of orders based on the sort parameter.
     * Uses natural sorting (strnatcmp) for order_number to handle numeric sequences correctly.
     */
    private function sortCollection($collection, string $sortBy)
    {
        switch ($sortBy) {
            case 'order_number':
                // Use sort with custom comparator for natural sorting
                return $collection->sort(function ($a, $b) {
                    return strnatcmp($a->order_number, $b->order_number);
                })->values();

            case 'order_number_desc':
                return $collection->sort(function ($a, $b) {
                    return strnatcmp($b->order_number, $a->order_number);
                })->values();

            case 'priority':
                // Sort by priority first, then by natural order number
                return $collection->sort(function ($a, $b) {
                    $priorityCompare = $b->priority <=> $a->priority; // Descending
                    if ($priorityCompare !== 0) {
                        return $priorityCompare;
                    }

                    return strnatcmp($a->order_number, $b->order_number);
                })->values();

            case 'requested_date':
                // Sort by date first, then by natural order number
                return $collection->sort(function ($a, $b) {
                    $dateCompare = ($a->requested_date ?? '') <=> ($b->requested_date ?? '');
                    if ($dateCompare !== 0) {
                        return $dateCompare;
                    }

                    return strnatcmp($a->order_number, $b->order_number);
                })->values();

            case 'requested_date_desc':
                return $collection->sort(function ($a, $b) {
                    $dateCompare = ($b->requested_date ?? '') <=> ($a->requested_date ?? '');
                    if ($dateCompare !== 0) {
                        return $dateCompare;
                    }

                    return strnatcmp($a->order_number, $b->order_number);
                })->values();

            case 'status':
                return $collection->sort(function ($a, $b) {
                    $statusCompare = strcmp($a->status, $b->status);
                    if ($statusCompare !== 0) {
                        return $statusCompare;
                    }

                    return strnatcmp($a->order_number, $b->order_number);
                })->values();

            case 'priority_date':
            default:
                // Default: Priority (high to low), then requested date (old to new)
                return $collection->sort(function ($a, $b) {
                    $priorityCompare = $b->priority <=> $a->priority;
                    if ($priorityCompare !== 0) {
                        return $priorityCompare;
                    }

                    return ($a->requested_date ?? '') <=> ($b->requested_date ?? '');
                })->values();
        }
    }
}

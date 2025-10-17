<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\BaseSearchController;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Models\User;
use App\Services\Production\ManufacturingOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProductionReportingController extends BaseSearchController
{
    protected ManufacturingOrderService $orderService;

    public function __construct(ManufacturingOrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Display the production reporting interface.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        $user = auth()->user();

        // Build base query for MOs - Only show Released, In Progress, and On Hold orders
        $baseQuery = ManufacturingOrder::query()
            ->whereIn('status', ['released', 'in_progress', 'on_hold'])
            ->with([
                'item:id,item_number,name,description,unit_of_measure',
                'item.media',
                'manufacturingRoute.steps.workCell',
                'createdBy:id,name',
            ])
            ->withCount(['children', 'children as completed_children_count' => function ($query) {
                $query->where('status', 'completed');
            }]);

        // Apply search filter
        if ($request->search) {
            $searchConfig = [
                'order_number',
                [
                    'relation' => 'item',
                    'columns' => ['name', 'item_number', 'description'],
                ],
            ];
            $baseQuery = $this->applySearchFilter($baseQuery, $request->search, $searchConfig);
        }

        // Apply work cell filter for operators
        if ($request->work_cell_id) {
            $baseQuery->whereHas('manufacturingRoute.steps', function ($query) use ($request) {
                $query->where('work_cell_id', $request->work_cell_id)
                    ->whereNotIn('status', ['completed', 'skipped']);
            });
        }

        // Apply status filter (within allowed statuses only)
        $allowedStatuses = ['released', 'in_progress', 'on_hold'];

        if ($request->statuses) {
            // Handle multi-select status filter
            if ($request->statuses === 'none') {
                // Special case: no statuses selected - show no orders
                $baseQuery->whereRaw('1 = 0');
            } else {
                $statuses = is_array($request->statuses)
                    ? $request->statuses
                    : explode(',', $request->statuses);

                // Filter to only allowed statuses
                $statuses = array_intersect($statuses, $allowedStatuses);

                if (! empty($statuses)) {
                    $baseQuery->whereIn('status', $statuses);
                }
            }
        } elseif ($request->status && $request->status !== 'all' && in_array($request->status, $allowedStatuses)) {
            // Fallback to single status filter for backward compatibility
            $baseQuery->where('status', $request->status);
        } elseif (! $request->has('statuses') && ! $request->has('status')) {
            // Default behavior: if no status filter is provided, show all allowed statuses
            $baseQuery->whereIn('status', $allowedStatuses);
        }

        // Apply priority filter
        if ($request->priority !== null && $request->priority !== '') {
            $baseQuery->where('priority', $request->priority);
        }

        // Apply date range filter
        if ($request->date_from) {
            $baseQuery->whereDate('requested_date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $baseQuery->whereDate('requested_date', '<=', $request->date_to);
        }

        // Apply routing filter
        if ($request->has_routing !== null && $request->has_routing !== '') {
            if ($request->has_routing === 'yes') {
                $baseQuery->whereHas('manufacturingRoute');
            } else {
                $baseQuery->doesntHave('manufacturingRoute');
            }
        }

        // Apply overdue filter
        if ($request->overdue === 'true') {
            $baseQuery->whereNotNull('requested_date')
                ->whereDate('requested_date', '<', now())
                ->whereNotIn('status', ['completed', 'cancelled']);
        }

        // Get status counts (without status filter but with base allowed statuses)
        $statusCountsQuery = clone $baseQuery;
        if ($request->statuses || ($request->status && $request->status !== 'all')) {
            // Remove status filter for counts but keep the base allowed statuses
            $statusCountsQuery = ManufacturingOrder::query()
                ->whereIn('status', ['released', 'in_progress', 'on_hold']);
            if ($request->search) {
                $searchConfig = [
                    'order_number',
                    [
                        'relation' => 'item',
                        'columns' => ['name', 'item_number', 'description'],
                    ],
                ];
                $statusCountsQuery = $this->applySearchFilter($statusCountsQuery, $request->search, $searchConfig);
            }
        }

        $statusCounts = $statusCountsQuery
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Default status counts to 0
        foreach (ManufacturingOrder::STATUSES as $key => $label) {
            if (! isset($statusCounts[$key])) {
                $statusCounts[$key] = 0;
            }
        }

        // Apply sorting
        $sortField = $request->sort_by ?? 'priority';
        $sortDirection = $request->sort_direction ?? 'desc';

        switch ($sortField) {
            case 'item_name':
                $baseQuery->leftJoin('items', 'manufacturing_orders.item_id', '=', 'items.id')
                    ->orderBy('items.name', $sortDirection)
                    ->select('manufacturing_orders.*');
                break;
            case 'current_step':
                // Complex sorting for current step would require a subquery
                // For now, we'll sort by order number
                $baseQuery->orderBy('order_number', $sortDirection);
                break;
            case 'priority':
                // Priority sort - higher numbers first when desc
                $baseQuery->orderBy('priority', $sortDirection)
                    ->orderBy('requested_date', 'asc'); // Secondary sort by due date
                break;
            case 'due_date':
                $baseQuery->orderBy('requested_date', $sortDirection)
                    ->orderBy('priority', 'desc'); // Secondary sort by priority
                break;
            case 'release_date':
                $baseQuery->orderBy('released_at', $sortDirection)
                    ->orderBy('priority', 'desc'); // Secondary sort by priority
                break;
            case 'available_date':
                // Available date is complex:
                // - For MOs without routing: released_at
                // - For MOs with routing: current step's available_date or completed_at of previous step
                $baseQuery->leftJoin('manufacturing_steps as current_steps', function ($join) {
                    $join->on('current_steps.manufacturing_order_id', '=', 'manufacturing_orders.id')
                        ->whereIn('current_steps.status', ['released', 'in_progress'])
                        ->whereRaw('current_steps.id = (
                            SELECT id FROM manufacturing_steps 
                            WHERE manufacturing_order_id = manufacturing_orders.id 
                            AND status IN ("released", "in_progress") 
                            ORDER BY sequence_number ASC 
                            LIMIT 1
                        )');
                })
                    ->orderByRaw("COALESCE(current_steps.available_at, manufacturing_orders.released_at) $sortDirection")
                    ->orderBy('priority', 'desc') // Secondary sort by priority
                    ->select('manufacturing_orders.*');
                break;
            default:
                $baseQuery->orderBy($sortField, $sortDirection);
        }

        // Paginate results
        $orders = $baseQuery->paginate($request->per_page ?? 20);

        // Add computed attributes to each order
        $orders->through(function ($order) {
            $order->append(['progress_percentage', 'has_route']);

            // Add current step info
            $currentStep = $order->getCurrentStep();
            if ($currentStep) {
                $currentStep->load('workCell');
                $order->setAttribute('current_step', $currentStep);
            } else {
                $order->setAttribute('current_step', null);
            }

            // Calculate quantity remaining
            $order->quantity_remaining = $order->quantity - $order->quantity_completed - $order->quantity_scrapped;

            return $order;
        });

        // Get work cells for filtering
        $workCells = WorkCell::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        // Get my work queue (MOs with current step at user's work cells)
        // For now, we'll show MOs that are in progress
        $myWork = [];
        if ($user->can('execute', ManufacturingStep::class)) {
            $myWork = ManufacturingOrder::query()
                ->with([
                    'item:id,item_number,name,description,unit_of_measure',
                    'manufacturingRoute.steps' => function ($query) {
                        $query->whereIn('status', ['in_progress', 'on_hold'])
                            ->with('workCell');
                    },
                ])
                ->whereHas('manufacturingRoute.steps', function ($query) {
                    $query->whereIn('status', ['in_progress', 'on_hold']);
                })
                ->where('status', 'in_progress')
                ->limit(10)
                ->get()
                ->map(function ($order) {
                    $order->append(['progress_percentage']);

                    // Add current step info
                    $currentStep = $order->getCurrentStep();
                    if ($currentStep) {
                        $currentStep->load('workCell');
                        $order->setAttribute('current_step', $currentStep);
                    } else {
                        $order->setAttribute('current_step', null);
                    }

                    return $order;
                });
        }

        return Inertia::render('production/reporting/index', [
            'orders' => $orders,
            'statusCounts' => $statusCounts,
            'workCells' => $workCells,
            'myWork' => $myWork,
            'filters' => [
                'search' => $request->search,
                'status' => $request->status ?? 'all',
                'statuses' => $request->statuses ?? 'released,in_progress,on_hold',
                'work_cell_id' => $request->work_cell_id,
                'priority' => $request->priority,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'has_routing' => $request->has_routing,
                'overdue' => $request->overdue,
                'sort_by' => $sortField,
                'sort_direction' => $sortDirection,
                'per_page' => $request->per_page ?? 20,
            ],
            'canExecute' => $user->can('execute', ManufacturingStep::class),
            'canCreate' => $user->can('create', ManufacturingOrder::class),
            'canUpdate' => $user->can('update', ManufacturingOrder::class),
        ]);
    }

    /**
     * Start production on a manufacturing order.
     */
    public function startProduction(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        if (! $order->has_route) {
            // Non-routed MO - simple start
            if ($order->status !== 'released') {
                return back()->with('error', 'Order must be released before starting production.');
            }

            $order->update([
                'status' => 'in_progress',
                'actual_start_date' => now(),
            ]);

            activity()
                ->performedOn($order)
                ->causedBy(auth()->user())
                ->log('Production started');

            return back()->with('success', 'Production started successfully.');
        } else {
            // Routed MO - redirect to step execution
            $currentStep = $order->getCurrentStep();
            if (! $currentStep) {
                return back()->with('error', 'No available steps to start.');
            }

            return redirect()->route('production.steps.execute', $currentStep);
        }
    }

    /**
     * Report production progress.
     */
    public function reportProduction(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        $validated = $request->validate([
            'quantity_completed' => 'required|numeric|min:0',
            'quantity_scrapped' => 'nullable|numeric|min:0',
            'scrap_reason' => 'nullable|required_if:quantity_scrapped,>,0|string|max:255',
            'time_spent' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'mark_complete' => 'nullable|boolean',
        ]);

        if (! $order->canReportProduction()) {
            return back()->with('error', 'Cannot report production on this order.');
        }

        // Check if total quantity would exceed ordered quantity
        $totalCompleted = $order->quantity_completed + $validated['quantity_completed'];
        $totalScrapped = $order->quantity_scrapped + ($validated['quantity_scrapped'] ?? 0);

        if (($totalCompleted + $totalScrapped) > $order->quantity) {
            return back()->with('error', 'Total quantity (completed + scrapped) cannot exceed ordered quantity.');
        }

        DB::transaction(function () use ($order, $validated) {
            // Update quantities
            if ($validated['quantity_completed'] > 0) {
                $order->increment('quantity_completed', $validated['quantity_completed']);
            }

            if (($validated['quantity_scrapped'] ?? 0) > 0) {
                $order->increment('quantity_scrapped', $validated['quantity_scrapped']);
            }

            // Update status
            if ($order->status === 'released') {
                $order->update([
                    'status' => 'in_progress',
                    'actual_start_date' => $order->actual_start_date ?? now(),
                ]);
            }

            // Check if order should be completed
            if ($validated['mark_complete'] ?? false) {
                $order->update([
                    'status' => 'completed',
                    'actual_end_date' => now(),
                ]);

                // Check parent auto-completion
                if ($order->parent) {
                    $order->parent->checkAutoCompletion();
                }
            }

            // Create audit log
            activity()
                ->performedOn($order)
                ->causedBy(auth()->user())
                ->withProperties([
                    'quantity_completed' => $validated['quantity_completed'],
                    'quantity_scrapped' => $validated['quantity_scrapped'] ?? 0,
                    'scrap_reason' => $validated['scrap_reason'] ?? null,
                    'time_spent' => $validated['time_spent'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                ])
                ->log('Production reported');
        });

        return back()->with('success', 'Production reported successfully.');
    }

    /**
     * Complete a manufacturing order.
     */
    public function completeProduction(ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        if (! in_array($order->status, ['in_progress', 'released'])) {
            return back()->with('error', 'Order must be in progress to complete.');
        }

        // For routed orders, check if all steps are completed
        if ($order->has_route) {
            $incompleteSteps = $order->manufacturingRoute->steps()
                ->whereNotIn('status', ['completed', 'skipped'])
                ->count();

            if ($incompleteSteps > 0) {
                return back()->with('error', 'All steps must be completed before completing the order.');
            }
        }

        $order->update([
            'status' => 'completed',
            'actual_end_date' => now(),
            'quantity_completed' => $order->quantity_completed ?: $order->quantity,
        ]);

        // Check parent auto-completion
        if ($order->parent) {
            $order->parent->checkAutoCompletion();
        }

        activity()
            ->performedOn($order)
            ->causedBy(auth()->user())
            ->log('Production completed');

        return back()->with('success', 'Production completed successfully.');
    }

    /**
     * Put a manufacturing order on hold.
     */
    public function holdProduction(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        $validated = $request->validate([
            'hold_reason' => 'required|string|in:machine_breakdown,material_shortage,quality_issue,other',
            'expected_resolution' => 'nullable|date|after:now',
            'notes' => 'nullable|string|max:500',
        ]);

        if (! in_array($order->status, ['released', 'in_progress'])) {
            return back()->with('error', 'Only released or in-progress orders can be put on hold.');
        }

        // Update the order status to on_hold
        $order->update([
            'status' => 'on_hold',
        ]);

        // Put all active steps on hold if routed
        if ($order->has_route) {
            $order->manufacturingRoute->steps()
                ->where('status', 'in_progress')
                ->update(['status' => 'on_hold']);
        }

        activity()
            ->performedOn($order)
            ->causedBy(auth()->user())
            ->withProperties($validated)
            ->log('Production put on hold: ' . $validated['hold_reason']);

        return back()->with('success', 'Production put on hold.');
    }

    /**
     * Resume a manufacturing order from hold.
     */
    public function resumeProduction(ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        if ($order->status !== 'on_hold') {
            return back()->with('error', 'Only orders on hold can be resumed.');
        }

        // Update the order status back to in_progress
        $order->update([
            'status' => 'in_progress',
        ]);

        // Resume any on-hold steps if routed
        if ($order->has_route) {
            $order->manufacturingRoute->steps()
                ->where('status', 'on_hold')
                ->update(['status' => 'in_progress']);
        }

        activity()
            ->performedOn($order)
            ->causedBy(auth()->user())
            ->log('Production resumed');

        return back()->with('success', 'Production resumed successfully.');
    }

    /**
     * Report scrap for a manufacturing order.
     */
    public function reportScrap(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        $validated = $request->validate([
            'quantity_scrapped' => 'required|numeric|min:0.01',
            'scrap_reason' => 'required|string|max:255',
            'defect_code' => 'nullable|string|max:50',
            'photo' => 'nullable|image|max:5120', // 5MB max
            'notes' => 'nullable|string|max:1000',
        ]);

        if (! $order->canReportProduction()) {
            return back()->with('error', 'Cannot report scrap on this order.');
        }

        // Check if scrap quantity would exceed available quantity
        $totalQuantity = $order->quantity_completed + $order->quantity_scrapped + $validated['quantity_scrapped'];
        if ($totalQuantity > $order->quantity) {
            return back()->with('error', 'Total quantity cannot exceed ordered quantity.');
        }

        DB::transaction(function () use ($order, $validated) {
            $order->increment('quantity_scrapped', $validated['quantity_scrapped']);

            // Handle photo upload if provided
            $photoPath = null;
            if (isset($validated['photo'])) {
                $photoPath = $validated['photo']->store('scrap-photos', 'local');
            }

            activity()
                ->performedOn($order)
                ->causedBy(auth()->user())
                ->withProperties([
                    'quantity_scrapped' => $validated['quantity_scrapped'],
                    'scrap_reason' => $validated['scrap_reason'],
                    'defect_code' => $validated['defect_code'] ?? null,
                    'photo_path' => $photoPath,
                    'notes' => $validated['notes'] ?? null,
                ])
                ->log('Scrap reported');
        });

        return back()->with('success', 'Scrap reported successfully.');
    }
}

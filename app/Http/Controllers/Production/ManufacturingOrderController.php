<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\BaseSearchController;
use App\Models\Forms\Form;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Services\Production\ManufacturingOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ManufacturingOrderController extends BaseSearchController
{
    protected ManufacturingOrderService $orderService;

    public function __construct(ManufacturingOrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Display a listing of manufacturing orders.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        // Build the base query for filtering (search and parent_id only, no status filter)
        $baseQuery = ManufacturingOrder::query()
            ->when($request->search, function ($query, $search) {
                $searchConfig = [
                    'order_number',
                    [
                        'relation' => 'item',
                        'columns' => ['name', 'item_number'],
                    ],
                ];

                return $this->applySearchFilter($query, $search, $searchConfig);
            })
            ->when($request->parent_id !== null, function ($query) use ($request) {
                if ($request->parent_id === 'root') {
                    $query->rootOrders();
                } else {
                    $query->where('parent_id', $request->parent_id);
                }
            });

        // Get status counts based only on search filter (ignoring status filter)
        // This query will give us the counts for the summary cards
        $statusCounts = (clone $baseQuery)
            ->select('status', \DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Calculate total count based only on search filter
        $summaryTotal = array_sum($statusCounts);

        // Now apply status filter for the actual data display
        $orders = (clone $baseQuery)
            ->with([
                'item',
                'billOfMaterial',
                'parent',
                'children.manufacturingRoute.steps',
                'manufacturingRoute.steps',
                'createdBy',
            ])
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $ordersArray = $orders->toArray();

        // Get data for create dialog
        $routeTemplates = \App\Models\Production\ManufacturingRoute::templates()
            ->active()
            ->with('steps')
            ->get();

        $items = \App\Models\Production\Item::where('can_be_manufactured', true)
            ->where('is_active', true)
            ->with(['primaryBom', 'category'])
            ->orderBy('item_number')
            ->get();

        $billsOfMaterial = \App\Models\Production\BillOfMaterial::with([
            'currentVersion.items.item',
        ])
            ->where('is_active', true)
            ->orderBy('bom_number')
            ->get();

        return Inertia::render('production/manufacturing-orders/index', [
            'orders' => [
                'data' => $ordersArray['data'],
                'current_page' => $ordersArray['current_page'],
                'last_page' => $ordersArray['last_page'],
                'per_page' => $ordersArray['per_page'],
                'total' => $ordersArray['total'],
                'from' => $ordersArray['from'],
                'to' => $ordersArray['to'],
            ],
            'statuses' => ManufacturingOrder::STATUSES,
            'filters' => $request->only(['status', 'search', 'parent_id']),
            'routeTemplates' => $routeTemplates,
            'sourceTypes' => ManufacturingOrder::SOURCE_TYPES,
            'items' => $items,
            'billsOfMaterial' => $billsOfMaterial,
            // Add status counts and total count for summary cards
            'statusCounts' => $statusCounts,
            'summaryTotal' => $summaryTotal,
        ]);
    }

    /**
     * Show the form for creating a new manufacturing order.
     */
    public function create(Request $request)
    {
        $this->authorize('create', ManufacturingOrder::class);

        $item = null;
        $itemId = $request->get('item_id');

        if ($itemId) {
            $item = \App\Models\Production\Item::with('category')->findOrFail($itemId);
        }

        // Get available templates
        $templates = collect();
        $recommendedTemplate = null;

        if ($item && $item->item_category_id) {
            $templates = \App\Models\Production\ManufacturingRoute::templates()
                ->where('item_category_id', $item->item_category_id)
                ->where('is_active', true)
                ->orderBy('updated_at', 'desc')
                ->get();

            $recommendedTemplate = $templates->first();
        }

        // Get all templates for manual selection
        $allTemplates = \App\Models\Production\ManufacturingRoute::templates()
            ->where('is_active', true)
            ->with('itemCategory')
            ->orderBy('name')
            ->get();

        $items = \App\Models\Production\Item::where('can_be_manufactured', true)
            ->where('is_active', true)
            ->with(['primaryBom', 'category'])
            ->orderBy('item_number')
            ->get();

        $billsOfMaterial = \App\Models\Production\BillOfMaterial::with([
            'currentVersion.items.item',
        ])
            ->where('is_active', true)
            ->orderBy('bom_number')
            ->get();

        $categories = \App\Models\Production\ItemCategory::active()
            ->orderBy('name')
            ->get();

        return Inertia::render('production/manufacturing-orders/create', [
            'item' => $item,
            'templates' => $templates,
            'recommendedTemplate' => $recommendedTemplate,
            'allTemplates' => $allTemplates,
            'hasMultipleTemplates' => $templates->count() > 1,
            'sourceTypes' => ManufacturingOrder::SOURCE_TYPES,
            'items' => $items,
            'billsOfMaterial' => $billsOfMaterial,
            'categories' => $categories,
            'selectedBomId' => $request->get('bom_id'),
        ]);
    }

    /**
     * Store a newly created manufacturing order.
     */
    public function store(Request $request)
    {
        $this->authorize('create', ManufacturingOrder::class);

        $validated = $request->validate([
            'order_type' => 'required|in:item,bom',
            'item_id' => 'nullable|required_if:order_type,item|exists:items,id',
            'bill_of_material_id' => 'nullable|required_if:order_type,bom|exists:bill_of_materials,id',
            'quantity' => 'required|integer|min:1',
            'unit_of_measure' => 'required|string|max:20',
            'priority' => 'required|integer|between:0,100',
            'requested_date' => 'nullable|date',
            'source_type' => 'nullable|in:manual,sales_order,forecast',
            'source_reference' => 'nullable|required_if:source_type,sales_order,forecast|string|max:100',
            'template_source_id' => 'nullable|exists:manufacturing_routes,id',
            'auto_select_template' => 'nullable|boolean',
            'create_empty_route' => 'nullable|boolean',
            'route_creation_mode' => 'nullable|in:manual,template,auto',
        ]);

        // Extract non-database fields before creating order
        $orderType = $validated['order_type'];
        $routeCreationMode = $validated['route_creation_mode'] ?? 'manual';

        // Remove fields that aren't in the database
        unset($validated['order_type']);
        unset($validated['route_creation_mode']);

        $validated['created_by'] = auth()->id();
        $validated['status'] = 'draft';

        // Use appropriate method based on order type
        if ($orderType === 'bom' && isset($validated['bill_of_material_id'])) {
            $order = $this->orderService->createOrderFromBom($validated);
        } else {
            $order = $this->orderService->createOrder($validated);
        }

        return redirect()->route('production.orders.show', $order)
            ->with('success', 'Manufacturing order created successfully.');
    }

    /**
     * Display the specified manufacturing order.
     */
    public function show(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('view', $order);

        $order->load([
            'item.category',
            'billOfMaterial.currentVersion',
            'parent.item',
            'children' => function ($query) {
                $query->with(['item', 'manufacturingRoute'])
                    ->withCount('children as child_count');
            },
            'manufacturingRoute.steps' => function ($query) {
                $query->with(['workCell', 'dependentSteps']);
            },
            'createdBy',
            'childDependencies.childOrder.item',
        ]);

        // Load children recursively for tree view
        if ($order->children->isNotEmpty()) {
            $this->loadChildrenRecursively($order);
        }

        // Can create/edit routes if user has permission and order is in draft, planned, or scheduled status
        $canCreateRoute = auth()->user()->can('production.routes.create') && in_array($order->status, ['draft', 'planned', 'scheduled']);

        // Load route templates if user can create routes (for any child orders that might need them)
        $templates = [];
        if (auth()->user()->can('production.routes.create')) {
            $templates = ManufacturingRoute::templates()
                ->where('is_active', true)
                ->withCount('steps')
                ->get()
                ->map(function ($template) {
                    // Calculate total estimated time
                    $template->estimated_time = $template->steps()
                        ->sum(\DB::raw('(COALESCE(setup_time_seconds, 0) + COALESCE(cycle_time_seconds, 0)) / 60'));

                    // Set usage_count to 0 since we're no longer tracking template usage
                    $template->usage_count = 0;

                    return $template;
                });
        }

        return Inertia::render('production/manufacturing-orders/show', [
            'order' => array_merge($order->toArray(), [
                // Progressive flow data
                'work_in_progress_quantity' => $order->work_in_progress_quantity,
                'detailed_wip' => $order->detailed_work_in_progress,
                'hierarchical_wip' => $order->hierarchical_wip,
                'production_flow' => [
                    'entered_production' => $order->first_step_completed_quantity,
                    'in_process' => $order->work_in_progress_quantity,
                    'completed' => $order->last_step_completed_quantity,
                ],
                'can_execute' => true, // Manufacturing orders can always execute - dependencies are at step level
                'can_release' => $order->canBeReleased(),
                // Smart progress data
                'smart_progress' => $order->smart_progress_percentage,
                'work_units_breakdown' => $order->getWorkUnitsBreakdown(),
                // Transform children with completion percentage and smart progress
                'children' => $order->children->map(function ($child) {
                    return array_merge($child->toArray(), [
                        'completion_percentage' => $child->quantity > 0
                            ? round(($child->quantity_completed / $child->quantity) * 100, 2)
                            : 0,
                        'smart_progress' => $child->smart_progress_percentage,
                    ]);
                }),
                // Transform dependencies with current percentage
                'dependencies' => $order->childDependencies->map(function ($dep) {
                    return [
                        'id' => $dep->id,
                        'child_order_id' => $dep->child_order_id,
                        'child_order_number' => $dep->childOrder->order_number,
                        'child_order_item' => $dep->childOrder->item,
                        'dependency_type' => $dep->dependency_type,
                        'minimum_quantity' => $dep->minimum_quantity,
                        'minimum_percentage' => $dep->minimum_percentage,
                        'quantity_completed' => $dep->quantity_completed,
                        'current_percentage' => $dep->childOrder->quantity > 0
                            ? round(($dep->quantity_completed / $dep->childOrder->quantity) * 100, 2)
                            : 0,
                        'is_satisfied' => $dep->is_satisfied,
                        'satisfied_at' => $dep->satisfied_at?->format('Y-m-d H:i:s'),
                    ];
                }),
            ]),
            'canPlan' => $order->canBePlanned() && auth()->user()->can('update', $order),
            'canSchedule' => $order->canBeScheduled() && auth()->user()->can('update', $order),
            'canRelease' => $order->canBeReleased() && auth()->user()->can('production.orders.release'),
            'canStart' => $order->canStartProduction() && auth()->user()->can('production.orders.release'),
            'canHold' => $order->canBePutOnHold() && auth()->user()->can('update', $order),
            'canResume' => $order->canBeResumed() && auth()->user()->can('update', $order),
            'canCancel' => $order->canBeCancelled() && auth()->user()->can('production.orders.cancel'),
            'canCreateRoute' => $canCreateRoute,
            'canManageRoutes' => auth()->user()->can('production.routes.create'), // For child orders
            'canReportProduction' => auth()->user()->can('reportProduction', $order),
            'canConfigureDependencies' => auth()->user()->can('production.orders.configure_dependencies'),
            'templates' => $templates,
            'workCells' => WorkCell::where('is_active', true)->get(),
            'stepTypes' => ManufacturingStep::STEP_TYPES,
            'stepStartConditions' => ManufacturingStep::STEP_START_CONDITIONS,
            'forms' => Form::where('is_active', true)->get(['id', 'name']),
            'plants' => \App\Models\AssetHierarchy\Plant::all(['id', 'name']),
            'shifts' => \App\Models\AssetHierarchy\Shift::all(['id', 'name']),
            'manufacturers' => \App\Models\AssetHierarchy\Manufacturer::all(['id', 'name']),
            'openRouteBuilder' => $request->get('openRouteBuilder'),
        ]);
    }

    /**
     * Recursively load children with their relationships.
     */
    private function loadChildrenRecursively(ManufacturingOrder $order)
    {
        $order->load(['children' => function ($query) {
            $query->with(['item', 'manufacturingRoute.steps']);
        }]);

        foreach ($order->children as $child) {
            $this->loadChildrenRecursively($child);
        }
    }

    /**
     * Show the form for editing the manufacturing order.
     */
    public function edit(ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        if (! in_array($order->status, ['draft', 'planned', 'scheduled'])) {
            return redirect()->route('production.orders.show', $order)
                ->with('error', 'Only draft, planned, or scheduled orders can be edited.');
        }

        // Method temporarily disabled - page not implemented yet
        return Inertia::render('error/not-implemented', [
            'status' => 501,
            'message' => 'This feature is not yet implemented',
        ]);
    }

    /**
     * Update the specified manufacturing order.
     */
    public function update(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        if (! in_array($order->status, ['draft', 'planned', 'scheduled'])) {
            return back()->with('error', 'Only draft, planned, or scheduled orders can be updated.');
        }

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'unit_of_measure' => 'required|string|max:20',
            'priority' => 'required|integer|between:0,100',
            'requested_date' => 'nullable|date',
            'source_type' => 'nullable|in:manual,sales_order,forecast',
            'source_reference' => 'nullable|required_if:source_type,sales_order,forecast|string|max:100',
        ]);

        $order->update($validated);

        // Handle Inertia requests differently to avoid redirects
        if ($request->header('X-Inertia')) {
            return back()->with('success', 'Manufacturing order updated successfully.');
        }

        return redirect()->route('production.orders.show', $order)
            ->with('success', 'Manufacturing order updated successfully.');
    }

    /**
     * Release the manufacturing order for production.
     */
    public function release(ManufacturingOrder $order)
    {
        $this->authorize('release', $order);

        try {
            $this->orderService->releaseOrder($order);

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Manufacturing order released for production.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Plan the manufacturing order.
     */
    public function plan(ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        try {
            $this->orderService->planOrder($order);

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Manufacturing order moved to planned status.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Schedule the manufacturing order.
     */
    public function schedule(ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        try {
            $this->orderService->scheduleOrder($order);

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Manufacturing order scheduled successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Start production on the manufacturing order.
     */
    public function start(ManufacturingOrder $order)
    {
        $this->authorize('release', $order);

        try {
            $this->orderService->startProduction($order);

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Production started successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Put the manufacturing order on hold.
     */
    public function hold(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $this->orderService->holdOrder($order, $validated['reason'] ?? null);

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Manufacturing order put on hold.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Resume the manufacturing order from hold.
     */
    public function resume(ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        try {
            $this->orderService->resumeOrder($order);

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Manufacturing order resumed successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Cancel the manufacturing order.
     */
    public function cancel(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('cancel', $order);

        // Explicitly check that draft orders cannot be cancelled
        if ($order->status === 'draft') {
            return back()->with('error', 'Draft orders cannot be cancelled. They should be deleted instead.');
        }

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $this->orderService->cancelOrder($order);

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Manufacturing order cancelled.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Remove the specified manufacturing order.
     */
    public function destroy(ManufacturingOrder $order)
    {
        $this->authorize('delete', $order);

        if ($order->status !== 'draft') {
            return back()->with('error', 'Only draft orders can be deleted.');
        }

        $order->delete();

        return redirect()->route('production.orders.index')
            ->with('success', 'Manufacturing order deleted successfully.');
    }

    /**
     * Display child orders for a parent order.
     */
    public function children(ManufacturingOrder $order)
    {
        $this->authorize('view', $order);

        $children = $order->children()
            ->with(['item', 'manufacturingRoute.steps'])
            ->paginate(20);

        // Method temporarily disabled - page not implemented yet
        return Inertia::render('error/not-implemented', [
            'status' => 501,
            'message' => 'This feature is not yet implemented',
        ]);
    }

    /**
     * Apply a route template to a manufacturing order.
     */
    public function applyTemplate(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        $validated = $request->validate([
            'template_id' => 'required|exists:manufacturing_routes,id',
        ]);

        try {
            $this->orderService->applyTemplate($order, $validated['template_id']);

            // Force reload the order data to ensure route is loaded
            $order->load('manufacturingRoute.steps');

            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'Template de rota aplicado com sucesso.',
                ]);
            }

            // Use back() to stay on the current page (planning page)
            return back()
                ->with('success', 'Template de rota aplicado com sucesso.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'Falha ao aplicar template: ' . $e->getMessage(),
                ], 422);
            }

            return back()->with('error', 'Falha ao aplicar template: ' . $e->getMessage());
        }
    }

    /**
     * Bulk apply a route template to multiple manufacturing orders.
     */
    public function bulkApplyTemplate(Request $request)
    {
        $validated = $request->validate([
            'order_ids' => 'required|array',
            'order_ids.*' => 'exists:manufacturing_orders,id',
            'template_id' => 'required|exists:manufacturing_routes,id',
        ]);

        // Check authorization for all orders first
        $unauthorizedOrders = [];
        foreach ($validated['order_ids'] as $orderId) {
            $order = ManufacturingOrder::find($orderId);
            if (! $order || ! auth()->user()->can('update', $order)) {
                $unauthorizedOrders[] = $orderId;
            }
        }

        if (! empty($unauthorizedOrders)) {
            return back()->with('error', 'Você não tem autorização para atualizar algumas das ordens selecionadas.');
        }

        try {
            $results = $this->orderService->bulkApplyTemplate(
                $validated['order_ids'],
                $validated['template_id']
            );

            $message = $results['success'] === 1
                ? 'Template aplicado a 1 ordem de manufatura com sucesso.'
                : "Template aplicado a {$results['success']} ordens de manufatura com sucesso.";

            if ($results['skipped'] > 0) {
                $message .= " {$results['skipped']} " . ($results['skipped'] === 1 ? 'ordem foi pulada' : 'ordens foram puladas') . '.';
            }

            // For Inertia requests, always use flash messages with back() response
            return back()->with('success', $message);
        } catch (\Exception $e) {
            return back()->with('error', 'Falha ao aplicar template: ' . $e->getMessage());
        }
    }

    /**
     * Show the form for creating a route for an order.
     */
    public function createRoute(ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        if (! in_array($order->status, ['draft', 'planned', 'scheduled'])) {
            return redirect()->route('production.orders.show', $order)
                ->with('error', 'Routes can only be created for draft, planned, or scheduled orders.');
        }

        if ($order->manufacturingRoute()->exists()) {
            return redirect()->route('production.routing.show', $order->manufacturingRoute->id)
                ->with('info', 'This order already has a route.');
        }

        $templates = ManufacturingRoute::templates()
            ->where('is_active', true)
            ->forCategory($order->item?->item_category_id)
            ->withCount('steps')
            ->get()
            ->map(function ($template) {
                $template->total_time = $template->steps()
                    ->sum(\DB::raw('(setup_time_seconds + cycle_time_seconds) / 60'));

                // Set usage_count to 0 since we're no longer tracking template usage
                $template->usage_count = 0;

                return $template;
            });

        return Inertia::render('production/orders/routes/create', [
            'order' => $order->load('item'),
            'templates' => $templates,
        ]);
    }

    /**
     * Store a newly created route for an order.
     */
    public function storeRoute(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        if (! in_array($order->status, ['draft', 'planned', 'scheduled'])) {
            return redirect()->route('production.orders.show', $order)
                ->with('error', 'Routes can only be created for draft, planned, or scheduled orders.');
        }

        if ($order->manufacturingRoute()->exists()) {
            return redirect()->route('production.orders.show', $order)
                ->with('info', 'This order already has a route.');
        }

        $validated = $request->validate([
            'template_id' => 'nullable|exists:manufacturing_routes,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        try {
            if ($validated['template_id']) {
                $this->orderService->createRouteFromTemplate($order, $validated['template_id']);
            } else {
                $route = $order->manufacturingRoute()->create([
                    'item_id' => $order->item_id,
                    'name' => $validated['name'],
                    'description' => $validated['description'],
                    'is_active' => true,
                    'is_template' => false,
                    'created_by' => auth()->id(),
                ]);
            }

            // Use back() to stay on the current page if it's the planning page
            return back()
                ->with('success', 'Route created successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Report production on a manufacturing order.
     */
    public function reportProduction(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('reportProduction', $order);

        // Validate order can receive manual reports
        if ($order->status === 'completed' || $order->status === 'cancelled') {
            return back()->with('error', 'Cannot report production on completed or cancelled orders.');
        }

        // Validate no active route or allow manual reporting alongside route
        $hasActiveRoute = $order->manufacturingRoute && $order->manufacturingRoute->steps()->count() > 0;
        if ($hasActiveRoute && ! config('production.allow_manual_with_route')) {
            return back()->with('error', 'This order has a route. Use step execution to report production.');
        }

        $validated = $request->validate([
            'quantity_completed' => 'required|integer|min:0',
            'quantity_scrapped' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:500',
            'mark_complete' => 'boolean',
        ]);

        // Additional validation
        $maxCompletable = $order->quantity - $order->quantity_completed;
        if ($validated['quantity_completed'] > $maxCompletable) {
            return back()->withErrors(['quantity_completed' => 'Cannot complete more than remaining quantity.']);
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

            if ($validated['mark_complete'] ?? false) {
                $order->update([
                    'status' => 'completed',
                    'actual_end_date' => now(),
                ]);
            }

            // Create audit log
            activity()
                ->performedOn($order)
                ->causedBy(auth()->user())
                ->withProperties([
                    'quantity_completed' => $validated['quantity_completed'],
                    'quantity_scrapped' => $validated['quantity_scrapped'] ?? 0,
                    'notes' => $validated['notes'] ?? null,
                ])
                ->log('Manual production reported');
        });

        return back()->with('success', 'Production reported successfully.');
    }

    /**
     * Report progress on a specific step.
     */
    public function reportStepProgress(Request $request, ManufacturingStep $step)
    {
        $this->authorize('reportProduction', $step->manufacturingRoute->manufacturingOrder);

        $validated = $request->validate([
            'quantity_completed' => 'required|integer|min:1',
            'quantity_scrapped' => 'nullable|integer|min:0',
        ]);

        $this->orderService->reportStepProgress($step, $validated);

        return response()->json([
            'success' => true,
            'message' => 'Progress reported successfully',
            'step' => $step->fresh(['manufacturingRoute.manufacturingOrder']),
        ]);
    }
}

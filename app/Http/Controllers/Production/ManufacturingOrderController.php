<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\RouteTemplate;
use App\Models\Production\WorkCell;
use App\Models\Forms\Form;
use App\Services\Production\ManufacturingOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ManufacturingOrderController extends Controller
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

        $orders = ManufacturingOrder::with([
            'item', 
            'billOfMaterial', 
            'parent', 
            'children.manufacturingRoute.steps',
            'manufacturingRoute.steps',
            'createdBy'
        ])
        ->when($request->status, function ($query, $status) {
            $query->where('status', $status);
        })
        ->when($request->search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhereHas('item', function ($q2) use ($search) {
                      $q2->where('name', 'like', "%{$search}%")
                         ->orWhere('item_number', 'like', "%{$search}%");
                  });
            });
        })
        ->when($request->parent_id !== null, function ($query) use ($request) {
            if ($request->parent_id === 'root') {
                $query->rootOrders();
            } else {
                $query->where('parent_id', $request->parent_id);
            }
        })
        ->orderBy('created_at', 'desc')
        ->paginate(20);
        
        $ordersArray = $orders->toArray();

        // Get data for create dialog
        $routeTemplates = RouteTemplate::active()
            ->with('steps')
            ->get();
            
        $items = \App\Models\Production\Item::where('can_be_manufactured', true)
            ->where('is_active', true)
            ->orderBy('item_number')
            ->get();
            
        $billsOfMaterial = \App\Models\Production\BillOfMaterial::with([
            'currentVersion.items.item'
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
        ]);
    }

    /**
     * Show the form for creating a new manufacturing order.
     */
    public function create(Request $request)
    {
        $this->authorize('create', ManufacturingOrder::class);

        $routeTemplates = RouteTemplate::active()
            ->with('steps')
            ->get();
            
        $items = \App\Models\Production\Item::where('can_be_manufactured', true)
            ->where('is_active', true)
            ->orderBy('item_number')
            ->get();
            
        $billsOfMaterial = \App\Models\Production\BillOfMaterial::with([
            'currentVersion.items.item'
        ])
            ->where('is_active', true)
            ->orderBy('bom_number')
            ->get();

        return Inertia::render('production/manufacturing-orders/create', [
            'routeTemplates' => $routeTemplates,
            'sourceTypes' => ManufacturingOrder::SOURCE_TYPES,
            'items' => $items,
            'billsOfMaterial' => $billsOfMaterial,
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
            'quantity' => 'required|numeric|min:0.01',
            'unit_of_measure' => 'required|string|max:20',
            'priority' => 'required|integer|between:0,100',
            'requested_date' => 'nullable|date',
            'source_type' => 'nullable|in:manual,sales_order,forecast',
            'source_reference' => 'nullable|required_if:source_type,sales_order,forecast|string|max:100',
            'route_template_id' => 'nullable|exists:route_templates,id',
            'auto_complete_on_children' => 'nullable|boolean',
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
    public function show(ManufacturingOrder $order)
    {
        $this->authorize('view', $order);

        $order->load([
            'item.category',
            'billOfMaterial',
            'parent',
            'children',
            'manufacturingRoute.steps.workCell',
            'createdBy'
        ]);

        // Load children recursively for tree view
        if ($order->children->isNotEmpty()) {
            $this->loadChildrenRecursively($order);
        }

        // Can create/edit routes if user has permission and order is in draft or planned status
        $canCreateRoute = auth()->user()->can('production.routes.create') && in_array($order->status, ['draft', 'planned']);
        
        // Load route templates if user can create routes (for any child orders that might need them)
        $templates = [];
        if (auth()->user()->can('production.routes.create')) {
            $templates = RouteTemplate::where('is_active', true)
                ->withCount('steps')
                ->get()
                ->map(function ($template) {
                    // Calculate total estimated time
                    $template->estimated_time = $template->steps()
                        ->sum(\DB::raw('COALESCE(setup_time_minutes, 0) + COALESCE(cycle_time_minutes, 0)'));
                    
                    // Get usage count
                    $template->usage_count = \DB::table('manufacturing_routes')
                        ->where('route_template_id', $template->id)
                        ->count();
                        
                    return $template;
                });
        }

        return Inertia::render('production/manufacturing-orders/show', [
            'order' => $order,
            'canRelease' => $order->canBeReleased() && auth()->user()->can('production.orders.release'),
            'canCancel' => $order->canBeCancelled() && auth()->user()->can('production.orders.cancel'),
            'canCreateRoute' => $canCreateRoute,
            'canManageRoutes' => auth()->user()->can('production.routes.create'), // For child orders
            'templates' => $templates,
            'workCells' => WorkCell::where('is_active', true)->get(),
            'stepTypes' => ManufacturingStep::STEP_TYPES,
            'forms' => Form::where('is_active', true)->get(['id', 'name']),
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

        if (!in_array($order->status, ['draft', 'planned'])) {
            return redirect()->route('production.orders.show', $order)
                ->with('error', 'Only draft or planned orders can be edited.');
        }

        return Inertia::render('production/manufacturing-orders/edit', [
            'order' => $order->load(['item', 'billOfMaterial']),
            'sourceTypes' => ManufacturingOrder::SOURCE_TYPES,
        ]);
    }

    /**
     * Update the specified manufacturing order.
     */
    public function update(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        if (!in_array($order->status, ['draft', 'planned'])) {
            return back()->with('error', 'Only draft or planned orders can be updated.');
        }

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
            'unit_of_measure' => 'required|string|max:20',
            'priority' => 'required|integer|between:0,100',
            'requested_date' => 'nullable|date',
            'source_type' => 'nullable|in:manual,sales_order,forecast',
            'source_reference' => 'nullable|required_if:source_type,sales_order,forecast|string|max:100',
        ]);

        $order->update($validated);

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
     * Cancel the manufacturing order.
     */
    public function cancel(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('cancel', $order);

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

        return Inertia::render('production/manufacturing-orders/children', [
            'parent' => $order,
            'children' => $children,
        ]);
    }

    /**
     * Apply a route template to a manufacturing order.
     */
    public function applyTemplate(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        if ($order->manufacturingRoute) {
            return back()->with('error', 'This order already has a route. Please remove it first.');
        }

        if (!in_array($order->status, ['draft', 'planned'])) {
            return back()->with('error', 'Route templates can only be applied to draft or planned orders.');
        }

        $validated = $request->validate([
            'template_id' => 'required|exists:route_templates,id',
        ]);

        $template = RouteTemplate::findOrFail($validated['template_id']);

        // Create route from template
        $route = $order->manufacturingRoute()->create([
            'item_id' => $order->item_id,
            'route_template_id' => $template->id,
            'name' => $template->name,
            'description' => $template->description,
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);

        // Create steps from template
        $route->createFromTemplate($template);

        return back()->with('success', 'Route template applied successfully.');
    }

    /**
     * Show the form for creating a route for an order.
     */
    public function createRoute(ManufacturingOrder $order)
    {
        $this->authorize('update', $order);
        
        if (!in_array($order->status, ['draft', 'planned'])) {
            return redirect()->route('production.orders.show', $order)
                ->with('error', 'Routes can only be created for draft or planned orders.');
        }
        
        if ($order->manufacturingRoute()->exists()) {
            return redirect()->route('production.routing.show', $order->manufacturingRoute->id)
                ->with('info', 'This order already has a route.');
        }
        
        $templates = RouteTemplate::where('is_active', true)
            ->when($order->item?->item_category_id, function ($query, $categoryId) {
                $query->where('item_category_id', $categoryId);
            })
            ->withCount('steps')
            ->get()
            ->map(function ($template) {
                $template->total_time = $template->steps()
                    ->sum(\DB::raw('setup_time_minutes + cycle_time_minutes'));
                $template->usage_count = \DB::table('manufacturing_routes')
                    ->where('route_template_id', $template->id)
                    ->count();
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
        
        if (!in_array($order->status, ['draft', 'planned'])) {
            return redirect()->route('production.orders.show', $order)
                ->with('error', 'Routes can only be created for draft or planned orders.');
        }
        
        if ($order->manufacturingRoute()->exists()) {
            return redirect()->route('production.orders.show', $order)
                ->with('info', 'This order already has a route.');
        }
        
        $validated = $request->validate([
            'template_id' => 'nullable|exists:route_templates,id',
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
                    'created_by' => auth()->id(),
                ]);
            }
            
            return redirect()->route('production.orders.show', ['order' => $order->id, 'openRouteBuilder' => 1])
                ->with('success', 'Route created successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

} 
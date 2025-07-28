<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\RouteTemplate;
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
            'children',
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

        $order = $this->orderService->createOrder($validated);

        return redirect()->route('production.orders.show', $order)
            ->with('success', 'Manufacturing order created successfully.');
    }

        /**
     * Display the specified manufacturing order.
     */
    public function show(ManufacturingOrder $order)
    {
        $this->authorize('view', $order);

        $order->loadCount('children');
        $order->load([
            'item',
            'billOfMaterial.currentVersion.items.item',
            'parent',
            'manufacturingRoute.steps.workCell.area.plant',
            'manufacturingRoute.steps.executions.executedBy',
            'createdBy',
        ]);

        // Load children recursively
        $this->loadChildrenRecursively($order);

        // Ensure child counts are up to date
        if (!isset($order->child_orders_count) || $order->child_orders_count === null) {
            $order->child_orders_count = $order->children->count();
        }
        if (!isset($order->completed_child_orders_count) || $order->completed_child_orders_count === null) {
            $order->completed_child_orders_count = $order->children->where('status', 'completed')->count();
        }

        return Inertia::render('production/manufacturing-orders/show', [
            'order' => $order,
            'canRelease' => $order->canBeReleased() && auth()->user()->can('production.orders.release'),
            'canCancel' => $order->canBeCancelled() && auth()->user()->can('production.orders.cancel'),
            'canCreateRoute' => !$order->manufacturingRoute && auth()->user()->can('production.routes.create'),
        ]);
    }

    /**
     * Recursively load children with their relationships.
     */
    private function loadChildrenRecursively(ManufacturingOrder $order)
    {
        $order->load(['children' => function ($query) {
            $query->with(['item']);
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


} 
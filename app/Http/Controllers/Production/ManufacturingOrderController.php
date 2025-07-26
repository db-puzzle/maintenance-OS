<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ProductionOrder;
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
        $this->authorize('viewAny', ProductionOrder::class);

        $orders = ProductionOrder::with([
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
        ->paginate(20)
        ->withQueryString();

        return Inertia::render('Production/Orders/Index', [
            'orders' => $orders,
            'statuses' => ProductionOrder::STATUSES,
            'filters' => $request->only(['status', 'search', 'parent_id']),
        ]);
    }

    /**
     * Show the form for creating a new manufacturing order.
     */
    public function create()
    {
        $this->authorize('create', ProductionOrder::class);

        $routeTemplates = RouteTemplate::active()
            ->with('steps')
            ->get();

        return Inertia::render('Production/Orders/Create', [
            'routeTemplates' => $routeTemplates,
            'sourceTypes' => ProductionOrder::SOURCE_TYPES,
        ]);
    }

    /**
     * Store a newly created manufacturing order.
     */
    public function store(Request $request)
    {
        $this->authorize('create', ProductionOrder::class);

        $validated = $request->validate([
            'item_id' => 'required|exists:items,id',
            'bill_of_material_id' => 'nullable|exists:bill_of_materials,id',
            'quantity' => 'required|numeric|min:0.01',
            'unit_of_measure' => 'required|string|max:20',
            'priority' => 'required|integer|between:0,100',
            'requested_date' => 'nullable|date',
            'source_type' => 'nullable|in:manual,sales_order,forecast',
            'source_reference' => 'nullable|required_with:source_type|string|max:100',
            'route_template_id' => 'nullable|exists:route_templates,id',
        ]);

        $validated['created_by'] = auth()->id();
        $validated['status'] = 'draft';

        $order = $this->orderService->createOrder($validated);

        return redirect()->route('production.orders.show', $order)
            ->with('success', 'Manufacturing order created successfully.');
    }

    /**
     * Display the specified manufacturing order.
     */
    public function show(ProductionOrder $order)
    {
        $this->authorize('view', $order);

        $order->load([
            'item.sector.area.plant',
            'billOfMaterial.currentVersion.items.item',
            'parent',
            'children.item',
            'manufacturingRoute.steps.workCell',
            'manufacturingRoute.steps.executions.executedBy',
            'createdBy',
        ]);

        return Inertia::render('Production/Orders/Show', [
            'order' => $order,
            'canRelease' => $order->canBeReleased() && auth()->user()->can('production.orders.release'),
            'canCancel' => $order->canBeCancelled() && auth()->user()->can('production.orders.cancel'),
            'canCreateRoute' => !$order->manufacturingRoute && auth()->user()->can('production.routes.create'),
        ]);
    }

    /**
     * Show the form for editing the manufacturing order.
     */
    public function edit(ProductionOrder $order)
    {
        $this->authorize('update', $order);

        if (!in_array($order->status, ['draft', 'planned'])) {
            return redirect()->route('production.orders.show', $order)
                ->with('error', 'Only draft or planned orders can be edited.');
        }

        return Inertia::render('Production/Orders/Edit', [
            'order' => $order->load(['item', 'billOfMaterial']),
            'sourceTypes' => ProductionOrder::SOURCE_TYPES,
        ]);
    }

    /**
     * Update the specified manufacturing order.
     */
    public function update(Request $request, ProductionOrder $order)
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
            'source_reference' => 'nullable|required_with:source_type|string|max:100',
        ]);

        $order->update($validated);

        return redirect()->route('production.orders.show', $order)
            ->with('success', 'Manufacturing order updated successfully.');
    }

    /**
     * Release the manufacturing order for production.
     */
    public function release(ProductionOrder $order)
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
    public function cancel(Request $request, ProductionOrder $order)
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
    public function destroy(ProductionOrder $order)
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
    public function children(ProductionOrder $order)
    {
        $this->authorize('view', $order);

        $children = $order->children()
            ->with(['item', 'manufacturingRoute.steps'])
            ->paginate(20);

        return Inertia::render('Production/Orders/Children', [
            'parent' => $order,
            'children' => $children,
        ]);
    }
} 
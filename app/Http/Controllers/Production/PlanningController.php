<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\WorkCell;
use App\Services\Production\ManufacturingOrderService;
use App\Services\Production\RouteBuilderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PlanningController extends Controller
{
    protected ManufacturingOrderService $manufacturingOrderService;
    protected RouteBuilderService $routeBuilderService;

    public function __construct(
        ManufacturingOrderService $manufacturingOrderService,
        RouteBuilderService $routeBuilderService
    ) {
        $this->manufacturingOrderService = $manufacturingOrderService;
        $this->routeBuilderService = $routeBuilderService;
    }

    /**
     * Display the core planning interface.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        // Get manufacturing orders with hierarchy
        $query = ManufacturingOrder::with([
            'item',
            'item.category',
            'parent',
            'parent.item',
            'manufacturingRoute',
            'manufacturingRoute.item',
            'manufacturingRoute.item.category',
            'manufacturingRoute.steps',
            'manufacturingRoute.steps.workCell',
        ]);

        // Check if a specific MO is selected
        if ($request->has('selectedMO')) {
            $selectedMO = $request->input('selectedMO');
            // Get the selected MO and ALL its descendants recursively
            $descendantIds = $this->getAllDescendantIds($selectedMO);
            $allIds = array_merge([$selectedMO], $descendantIds);
            $query->whereIn('id', $allIds);
        } else {
            // Default behavior - show all top-level draft/planned orders
            $query->whereNull('parent_id')
                ->whereIn('status', ['draft', 'planned']);
        }

        // Apply filters
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('source_reference', 'like', "%{$search}%")
                    ->orWhereHas('item', function ($q) use ($search) {
                        $q->where('item_number', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%");
                    });
            });
        }

        $orders = $query->orderBy('order_number')->get();

        // Load all nested children recursively
        $orders->each(function ($order) {
            $this->loadAllChildren($order);
        });

        // Build hierarchical structure
        if ($request->has('selectedMO')) {
            // When a specific MO is selected, build hierarchy starting from that MO
            $selectedMOId = $request->input('selectedMO');
            $hierarchicalOrders = [];

            // Find the main MO and build its hierarchy
            $mainOrder = $orders->firstWhere('id', $selectedMOId);
            if ($mainOrder) {
                $children = $this->buildHierarchy($orders, $mainOrder->id);
                $orderArray = $mainOrder->toArray();

                // Ensure manufacturingRoute includes nested item and category relationships
                if ($mainOrder->manufacturingRoute) {
                    $orderArray['manufacturing_route'] = $mainOrder->manufacturingRoute->toArray();
                    if ($mainOrder->manufacturingRoute->item) {
                        $orderArray['manufacturing_route']['item'] = $mainOrder->manufacturingRoute->item->toArray();
                        if ($mainOrder->manufacturingRoute->item->category) {
                            $orderArray['manufacturing_route']['item']['category'] = $mainOrder->manufacturingRoute->item->category->toArray();
                        }
                    }
                }

                if ($children) {
                    $orderArray['children'] = $children;
                }
                $hierarchicalOrders[] = $orderArray;
            }
        } else {
            // Default behavior - build from top-level orders
            $hierarchicalOrders = $this->buildHierarchy($orders);
        }

        // Get route templates (routes where is_template = true)
        $routeTemplates = ManufacturingRoute::with(['steps', 'createdBy', 'itemCategory'])
            ->where('is_template', true)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($template) {
                return [
                    'id' => $template->id,
                    'name' => $template->name,
                    'description' => $template->description,
                    'category' => 'Custom',
                    'item_category' => $template->itemCategory ? $template->itemCategory->name : null,
                    'steps' => $template->steps,
                    'usage_count' => 0, // TODO: Track usage
                    'last_used_at' => null,
                    'rating' => 4.0,
                    'tags' => [],
                    'created_by' => [
                        'id' => $template->created_by ?? 1,
                        'name' => $template->createdBy->name ?? 'System',
                    ],
                    'created_at' => $template->created_at->toIso8601String(),
                    'is_default' => false,
                    'item_types' => [],
                ];
            });

        // Get work cells
        $workCells = WorkCell::active()
            ->select('id', 'name', 'description', 'cell_type', 'default_production_rate_per_hour', 'is_active')
            ->orderBy('name')
            ->get()
            ->map(function ($workCell) {
                return [
                    'id' => $workCell->id,
                    'name' => $workCell->name,
                    'code' => null, // No code field in work_cells table
                    'description' => $workCell->description,
                    'type' => $workCell->cell_type,
                    'capacity' => $workCell->default_production_rate_per_hour ?? 0,
                    'is_active' => $workCell->is_active,
                    'utilization' => rand(40, 95), // TODO: Calculate real utilization
                ];
            });

        // Get user permissions
        $user = $request->user();
        $permissions = [
            'canCreateRoute' => $user->can('create', ManufacturingRoute::class),
            'canEditRoute' => $user->can('update', ManufacturingRoute::class),
            'canDeleteRoute' => $user->can('delete', ManufacturingRoute::class),
            'canPlanOrder' => $user->can('plan', ManufacturingOrder::class),
            'canCreateWorkCell' => $user->can('create', WorkCell::class),
            'canViewWorkCells' => $user->can('viewAny', WorkCell::class),
            'canApplyTemplates' => $user->can('createFromTemplate', ManufacturingRoute::class),
        ];

        return Inertia::render('production/planning/index', [
            'manufacturingOrders' => $hierarchicalOrders,
            'routeTemplates' => $routeTemplates,
            'workCells' => $workCells,
            'permissions' => $permissions,
            'selectedMO' => $request->input('selectedMO'),
        ]);
    }

    /**
     * Save route configuration for a manufacturing order.
     */
    public function saveRoute(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('update', $order);

        $validated = $request->validate([
            'steps' => 'present|array',
            'steps.*.sequence' => 'required|integer|min:1',
            'steps.*.name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.work_cell_id' => 'nullable|exists:work_cells,id',
            'steps.*.setup_time_minutes' => 'nullable|integer|min:0',
            'steps.*.cycle_time_minutes' => 'nullable|integer|min:0',
            'steps.*.step_type' => 'required|in:standard,quality_check,rework',
            'steps.*.is_required' => 'boolean',
            'steps.*.child_order_dependency_type' => 'nullable|in:none,all_children_completed,children_quantity',
            'steps.*.child_order_minimum_quantity' => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($order, $validated) {
            // Create or update route
            $route = $order->manufacturingRoute ?? new ManufacturingRoute;
            $route->manufacturing_order_id = $order->id;
            $route->name = "Route for {$order->order_number}";
            $route->save();

            // Delete existing steps
            $route->steps()->delete();

            // Create new steps
            foreach ($validated['steps'] as $stepData) {
                // Ensure child order dependency fields are included
                $stepData['child_order_dependency_type'] = $stepData['child_order_dependency_type'] ?? 'all_children_completed';
                $stepData['child_order_minimum_quantity'] = $stepData['child_order_minimum_quantity'] ?? 0;

                $route->steps()->create($stepData);
            }

            // Note: Status transition from 'draft' to 'planned' should only happen
            // via explicit user action using the "Marcar Planejada" button,
            // not automatically when saving route steps
        });

        // Check if this is an auto-save request (no flash message)
        if ($request->boolean('is_autosave', false)) {
            return back();
        }

        return back()->with('success', 'Route configuration saved successfully.');
    }

    /**
     * Save route as template.
     */
    public function saveAsTemplate(Request $request)
    {
        $this->authorize('create', ManufacturingRoute::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'steps' => 'required|array',
            'item_id' => 'nullable|exists:items,id',
        ]);

        $template = DB::transaction(function () use ($validated, $request) {
            // Create a template route (is_template = true)
            $template = ManufacturingRoute::create([
                'name' => $validated['name'],
                'description' => $validated['description'],
                'is_template' => true,
                'item_id' => $validated['item_id'] ?? null,
                'created_by' => $request->user()->id,
                'is_active' => true,
            ]);

            // Create template steps
            foreach ($validated['steps'] as $index => $stepData) {
                $template->steps()->create([
                    'step_number' => $stepData['sequence'] ?? ($index + 1),
                    'display_order' => $stepData['sequence'] ?? ($index + 1),
                    'name' => $stepData['name'],
                    'description' => $stepData['description'] ?? null,
                    'work_cell_id' => $stepData['work_cell_id'] ?? null,
                    'setup_time_minutes' => $stepData['setup_time_minutes'] ?? null,
                    'cycle_time_minutes' => $stepData['cycle_time_minutes'] ?? null,
                    'step_type' => $stepData['step_type'] ?? 'standard',
                    'status' => 'pending',
                ]);
            }

            return $template;
        });

        return back()->with('success', 'Route template saved successfully.');
    }

    /**
     * Bulk transition manufacturing orders.
     */
    public function bulkTransition(Request $request)
    {
        $validated = $request->validate([
            'orderIds' => 'required|array',
            'orderIds.*' => 'exists:manufacturing_orders,id',
            'targetState' => 'required|in:planned,draft',
        ]);

        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        foreach ($validated['orderIds'] as $orderId) {
            try {
                $order = ManufacturingOrder::findOrFail($orderId);

                if ($validated['targetState'] === 'planned') {
                    $this->authorize('plan', $order);

                    // Validate order can be planned
                    if (! $order->manufacturingRoute || $order->manufacturingRoute->steps->count() === 0) {
                        throw new \Exception('Order must have a configured route to be marked as planned.');
                    }

                    $order->status = 'planned';
                } else {
                    $this->authorize('update', $order);
                    $order->status = 'draft';
                }

                $order->save();
                $results['success']++;
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = [
                    'moId' => $orderId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return back()->with('bulkOperationResult', $results);
    }

    /**
     * Bulk copy route from source order.
     */
    public function bulkCopyRoute(Request $request)
    {
        $validated = $request->validate([
            'orderIds' => 'required|array',
            'orderIds.*' => 'exists:manufacturing_orders,id',
            'sourceOrderId' => 'required|exists:manufacturing_orders,id',
        ]);

        $sourceOrder = ManufacturingOrder::with('manufacturingRoute.steps')->findOrFail($validated['sourceOrderId']);

        if (! $sourceOrder->manufacturingRoute) {
            return back()->withErrors(['sourceOrderId' => 'Source order does not have a route configured.']);
        }

        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        foreach ($validated['orderIds'] as $orderId) {
            if ($orderId == $validated['sourceOrderId']) {
                continue; // Skip source order
            }

            try {
                $order = ManufacturingOrder::findOrFail($orderId);
                $this->authorize('update', $order);

                // Copy route
                $this->routeBuilderService->copyRoute($sourceOrder, $order);

                $results['success']++;
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = [
                    'moId' => $orderId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return back()->with('bulkOperationResult', $results);
    }

    /**
     * Bulk clear routes.
     */
    public function bulkClearRoutes(Request $request)
    {
        $validated = $request->validate([
            'orderIds' => 'required|array',
            'orderIds.*' => 'exists:manufacturing_orders,id',
        ]);

        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        foreach ($validated['orderIds'] as $orderId) {
            try {
                $order = ManufacturingOrder::findOrFail($orderId);
                $this->authorize('update', $order);

                // Delete route if exists
                if ($order->manufacturingRoute) {
                    $order->manufacturingRoute->delete();
                }

                // Revert to draft if needed
                if ($order->status === 'planned') {
                    $order->status = 'draft';
                    $order->save();
                }

                $results['success']++;
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = [
                    'moId' => $orderId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return back()->with('bulkOperationResult', $results);
    }

    /**
     * Load all children recursively for a manufacturing order.
     */
    private function loadAllChildren($order)
    {
        $order->load([
            'children.item',
            'children.item.category',
            'children.parent',
            'children.parent.item',
            'children.manufacturingRoute',
            'children.manufacturingRoute.item',
            'children.manufacturingRoute.item.category',
            'children.manufacturingRoute.steps',
            'children.manufacturingRoute.steps.workCell',
        ]);

        if ($order->children->isNotEmpty()) {
            $order->children->each(function ($child) {
                $this->loadAllChildren($child);
            });
        }
    }

    /**
     * Get all descendant IDs of a manufacturing order recursively.
     */
    private function getAllDescendantIds($parentId)
    {
        $descendantIds = [];

        // Get direct children
        $directChildren = ManufacturingOrder::where('parent_id', $parentId)->pluck('id')->toArray();

        foreach ($directChildren as $childId) {
            $descendantIds[] = $childId;
            // Recursively get descendants of this child
            $descendantIds = array_merge($descendantIds, $this->getAllDescendantIds($childId));
        }

        return $descendantIds;
    }

    /**
     * Build hierarchical structure for manufacturing orders.
     */
    private function buildHierarchy($orders, $parentId = null)
    {
        $branch = [];

        foreach ($orders as $order) {
            if ($order->parent_id === $parentId) {
                $children = $this->buildHierarchy($orders, $order->id);

                $orderArray = $order->toArray();

                // Ensure manufacturingRoute includes nested item and category relationships
                if ($order->manufacturingRoute) {
                    $orderArray['manufacturing_route'] = $order->manufacturingRoute->toArray();
                    if ($order->manufacturingRoute->item) {
                        $orderArray['manufacturing_route']['item'] = $order->manufacturingRoute->item->toArray();
                        if ($order->manufacturingRoute->item->category) {
                            $orderArray['manufacturing_route']['item']['category'] = $order->manufacturingRoute->item->category->toArray();
                        }
                    }
                }

                if ($children) {
                    $orderArray['children'] = $children;
                }

                $branch[] = $orderArray;
            }
        }

        return $branch;
    }
}

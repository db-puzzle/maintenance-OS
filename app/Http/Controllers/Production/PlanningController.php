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

        // Optimized single-pass hierarchical loading
        $hierarchicalOrders = $this->loadManufacturingOrdersOptimized($request);

        // Load route templates with optimized eager loading
        $routeTemplates = $this->loadRouteTemplates();

        // Load work cells once
        $workCells = $this->loadWorkCells();

        // Get user permissions - check if permissions exist before checking them
        $user = $request->user();
        $permissions = [
            'canCreateRoute' => false,
            'canEditRoute' => false,
            'canDeleteRoute' => false,
            'canPlanOrder' => false,
            'canCreateWorkCell' => false,
            'canViewWorkCells' => false,
            'canApplyTemplates' => false,
        ];

        // Try to check permissions if they exist
        try {
            $permissions['canCreateRoute'] = $user->can('create', ManufacturingRoute::class);
            $permissions['canViewWorkCells'] = $user->can('viewAny', WorkCell::class);
            $permissions['canCreateWorkCell'] = $user->can('create', WorkCell::class);
        } catch (\Exception $e) {
            // If permissions don't exist, leave them as false
        }

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
     * Load manufacturing orders with optimized eager loading to prevent N+1 queries.
     * This method implements single-pass hierarchical loading strategy.
     */
    private function loadManufacturingOrdersOptimized(Request $request)
    {
        $search = $request->input('search');
        $selectedMO = $request->input('selectedMO');

        if ($selectedMO) {
            // Load specific MO and its hierarchy using optimized scope
            $parentOrder = ManufacturingOrder::findOrFail($selectedMO);

            // Use the withHierarchy scope for efficient loading
            $query = ManufacturingOrder::withHierarchy($parentOrder->order_number);
        } else {
            // Get root orders first using scopes
            $rootOrderIds = ManufacturingOrder::rootOrders()
                ->planningStatus()
                ->when($search, function ($q) use ($search) {
                    $q->searchByText($search);
                })
                ->pluck('id');

            if ($rootOrderIds->isEmpty()) {
                return [];
            }

            // Get all descendant IDs using order number patterns
            $allOrderNumbers = ManufacturingOrder::whereIn('id', $rootOrderIds)
                ->pluck('order_number');

            // Build query for all orders (roots and descendants)
            $query = ManufacturingOrder::query()
                ->where(function ($q) use ($rootOrderIds, $allOrderNumbers) {
                    $q->whereIn('id', $rootOrderIds);
                    foreach ($allOrderNumbers as $orderNumber) {
                        $q->orWhere('order_number', 'like', $orderNumber . '.%');
                    }
                });
        }

        // Apply search filter if not already applied
        if ($search && $selectedMO) {
            $query->searchByText($search);
        }

        // Use the optimized scope for planning view
        $orders = $query
            ->forPlanningView()
            ->orderBy('order_number')
            ->get();

        // Add has_route attribute efficiently
        $orders->each(function ($order) {
            $order->has_route = $order->relationLoaded('manufacturingRoute') &&
                               $order->manufacturingRoute !== null;
        });

        // Build hierarchy in memory
        return $this->buildOptimizedHierarchy($orders, $selectedMO);
    }

    /**
     * Build hierarchical structure from a flat collection of orders.
     * Optimized to process hierarchy in memory with O(n) complexity.
     */
    private function buildOptimizedHierarchy($orders, $rootId = null)
    {
        // Group orders by parent_id for efficient lookup
        $grouped = $orders->groupBy('parent_id');

        if ($rootId) {
            // Find the specific root order
            $root = $orders->firstWhere('id', $rootId);
            if (! $root) {
                return [];
            }

            // Attach children recursively
            $this->attachChildrenToOrder($root, $grouped);

            return [$root->toArray()];
        }

        // Get all root orders (parent_id = null)
        $roots = $grouped->get('', collect());

        // Attach children to each root
        $roots->each(function ($order) use ($grouped) {
            $this->attachChildrenToOrder($order, $grouped);
        });

        return $roots->map->toArray()->values()->all();
    }

    /**
     * Recursively attach children to an order.
     */
    private function attachChildrenToOrder($order, $grouped)
    {
        $children = $grouped->get($order->id, collect());

        // Set children relationship
        $order->setRelation('children', $children);

        // Recursively process each child
        $children->each(function ($child) use ($grouped) {
            $this->attachChildrenToOrder($child, $grouped);
        });
    }

    /**
     * Load route templates with optimized eager loading.
     */
    private function loadRouteTemplates()
    {
        return ManufacturingRoute::forPlanningTemplates()
            ->latest()
            ->get()
            ->map(function ($template) {
                return [
                    'id' => $template->id,
                    'name' => $template->name,
                    'description' => $template->description,
                    'category' => 'Custom',
                    'item_category' => $template->itemCategory?->name,
                    'steps' => $template->steps,
                    'usage_count' => 0, // TODO: Track usage
                    'last_used_at' => null,
                    'rating' => 4.0,
                    'tags' => [],
                    'created_by' => [
                        'id' => $template->created_by ?? 1,
                        'name' => $template->createdBy?->name ?? 'System',
                    ],
                    'created_at' => $template->created_at->toIso8601String(),
                    'is_default' => false,
                    'item_types' => [],
                ];
            });
    }

    /**
     * Load work cells with optimized query.
     */
    private function loadWorkCells()
    {
        return WorkCell::active()
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
    }

    /**
     * Get all descendant IDs of a manufacturing order efficiently.
     * Uses the order number pattern to fetch all descendants in a single query.
     *
     * @deprecated Use loadManufacturingOrdersOptimized instead
     */
    private function getAllDescendantIds($parentId)
    {
        // Get the parent order to use its order_number pattern
        $parentOrder = ManufacturingOrder::findOrFail($parentId);

        // Leverage the order number hierarchy pattern (e.g., MO-001, MO-001.1, MO-001.1.1)
        // This gets all descendants in a single efficient query
        $descendants = ManufacturingOrder::query()
            ->select('id', 'parent_id', 'order_number')
            ->where('order_number', 'like', $parentOrder->order_number . '.%')
            ->pluck('id')
            ->toArray();

        return $descendants;
    }

    /**
     * Build hierarchical structure from a flat collection of orders.
     * This method processes the hierarchy in memory to avoid N+1 queries.
     *
     * @deprecated Use buildOptimizedHierarchy instead
     */
    private function buildHierarchyFromCollection($orders, $parentId = null)
    {
        $orderMap = $orders->keyBy('id');
        $result = [];

        foreach ($orders as $order) {
            if ($order->parent_id == $parentId) {
                $orderArray = $order->toArray();

                // Recursively build children from the already-loaded collection
                $orderArray['children'] = $this->buildHierarchyFromCollection($orders, $order->id);

                $result[] = $orderArray;
            }
        }

        return $result;
    }
}

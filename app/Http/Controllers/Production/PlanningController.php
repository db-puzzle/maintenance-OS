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
            'canSaveAsTemplate' => false,
        ];

        // Try to check permissions if they exist
        try {
            $permissions['canCreateRoute'] = $user->can('create', ManufacturingRoute::class);
            $permissions['canEditRoute'] = $user->hasPermissionTo('production.routes.create'); // Use permission directly instead of policy
            $permissions['canDeleteRoute'] = $user->hasPermissionTo('production.routes.delete');
            $permissions['canPlanOrder'] = $user->hasPermissionTo('production.orders.update');
            $permissions['canViewWorkCells'] = $user->can('viewAny', WorkCell::class);
            $permissions['canCreateWorkCell'] = $user->can('create', WorkCell::class);
            $permissions['canApplyTemplates'] = $user->hasPermissionTo('production.routes.create');
            $permissions['canSaveAsTemplate'] = $user->hasPermissionTo('production.templates.create') || $user->hasPermissionTo('production.routes.create');
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
        if ($request->boolean('autoSave', false)) {
            return response()->json(['success' => true]);
        }

        return redirect()
            ->route('production.planning.index')
            ->with('success', 'Route saved successfully.');
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

        // Get the template
        $template = ManufacturingRoute::where('is_template', true)
            ->where('id', $validated['template_id'])
            ->firstOrFail();

        // Apply the template
        DB::transaction(function () use ($order, $template) {
            // Check if order already has a route
            $existingRoute = $order->manufacturingRoute;

            if ($existingRoute) {
                // Delete existing steps
                $existingRoute->steps()->delete();
                $route = $existingRoute;
            } else {
                // Create new route
                $route = new ManufacturingRoute;
                $route->manufacturing_order_id = $order->id;
            }

            $route->name = "Route for {$order->order_number}";
            $route->is_active = true;
            $route->save();

            // Copy steps from template
            $template->load('steps');
            foreach ($template->steps as $step) {
                $route->steps()->create([
                    'name' => $step->name,
                    'description' => $step->description,
                    'work_cell_id' => $step->work_cell_id,
                    'setup_time_minutes' => $step->setup_time_minutes,
                    'cycle_time_minutes' => $step->cycle_time_minutes,
                    'display_order' => $step->display_order,
                    'step_type' => $step->step_type,
                    'is_required' => $step->is_required ?? true,
                    'status' => 'pending',
                    'child_order_dependency_type' => $step->child_order_dependency_type ?? 'all_children_completed',
                    'child_order_minimum_quantity' => $step->child_order_minimum_quantity ?? 0,
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Template applied successfully',
        ]);
    }

    /**
     * Bulk transition manufacturing orders to a new state.
     */
    public function bulkTransition(Request $request)
    {
        $validated = $request->validate([
            'orderIds' => 'required|array',
            'orderIds.*' => 'exists:manufacturing_orders,id',
            'targetState' => 'required|in:draft,planned,scheduled,released',
        ]);

        $orderIds = $validated['orderIds'];
        $targetState = $validated['targetState'];

        $orders = ManufacturingOrder::whereIn('id', $orderIds)->get();

        foreach ($orders as $order) {
            $this->authorize('update', $order);

            // Apply transition rules
            if ($targetState === 'planned' && $order->status === 'draft') {
                $order->status = 'planned';
                $order->save();
            } elseif ($targetState === 'draft' && $order->status === 'planned') {
                $order->status = 'draft';
                $order->save();
            }
            // Add other transition rules as needed
        }

        // Reload manufacturing orders after transition
        return redirect()->route('production.planning', $request->except(['orderIds', 'targetState']))
            ->with('success', 'Manufacturing orders updated successfully.');
    }

    /**
     * Load manufacturing orders with optimized queries.
     * This method loads all necessary data in a single pass to avoid N+1 queries.
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

            // Convert to array including all loaded relationships
            return [$this->orderToArrayWithRelationships($root)];
        }

        // Get all root orders (parent_id = null)
        $roots = $grouped->get('', collect());

        // Attach children to each root
        $roots->each(function ($order) use ($grouped) {
            $this->attachChildrenToOrder($order, $grouped);
        });

        // Convert to array including all loaded relationships
        return $roots->map(function ($order) {
            return $this->orderToArrayWithRelationships($order);
        })->values()->all();
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
     * Convert order to array ensuring all relationships are included.
     */
    private function orderToArrayWithRelationships($order)
    {
        // Get the base array
        $array = $order->toArray();

        // Ensure manufacturing_route is included if loaded
        if ($order->relationLoaded('manufacturingRoute') && $order->manufacturingRoute) {
            $array['manufacturing_route'] = $order->manufacturingRoute->toArray();
        } else {
            // Always include manufacturing_route key even if null
            $array['manufacturing_route'] = null;
        }

        // Recursively convert children
        if ($order->relationLoaded('children') && $order->children) {
            $array['children'] = $order->children->map(function ($child) {
                return $this->orderToArrayWithRelationships($child);
            })->all();
        }

        return $array;
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
                    'created_at' => $template->created_at ? $template->created_at->toIso8601String() : now()->toIso8601String(),
                    'updated_at' => $template->updated_at ? $template->updated_at->toIso8601String() : now()->toIso8601String(),
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

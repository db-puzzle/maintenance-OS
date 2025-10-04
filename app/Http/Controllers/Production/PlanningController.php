<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\WorkCell;
use App\Services\Production\ManufacturingOrderService;
use App\Services\Production\RouteBuilderService;
use Illuminate\Http\JsonResponse;
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
            'userSelection' => $request->input('userSelection') ? explode(',', $request->input('userSelection')) : [],
            'activeMO' => $request->input('activeMO') ? (int) $request->input('activeMO') : null,
            'sortField' => $request->input('sortField', 'order_number'),
            'sortDirection' => $request->input('sortDirection', 'asc'),
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

        // Return success - Inertia will handle the response properly based on the 'only' parameter
        if ($request->boolean('autoSave', false) || $request->boolean('is_autosave', false)) {
            // For autosave, just return back without a flash message
            return back();
        }

        return back()->with('success', 'Route saved successfully.');
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

        // Return success response for Inertia to handle
        return back()->with('success', count($orderIds) . ' manufacturing order(s) updated successfully.');
    }

    /**
     * Load manufacturing orders with optimized queries.
     * This method loads all necessary data in a single pass to avoid N+1 queries.
     */
    private function loadManufacturingOrdersOptimized(Request $request)
    {
        $search = $request->input('search');
        $selectedMO = $request->input('selectedMO');

        // If no MO is selected, return empty array to prevent loading data
        // The frontend will show the MO selection dialog
        if (! $selectedMO) {
            return [];
        }

        // Load specific MO and determine if we need to load from root
        $selectedOrder = ManufacturingOrder::find($selectedMO);

        if (! $selectedOrder) {
            throw new \Exception("Manufacturing order not found: {$selectedMO}");
        }

        // Load the hierarchy using the order number pattern
        // This will load the selected order and ALL its descendants
        $query = ManufacturingOrder::withHierarchy($selectedOrder->order_number);

        // Apply search filter if not already applied
        if ($search && $selectedMO) {
            $query->searchByText($search);
        }

        // Use the optimized scope for planning view with natural sorting
        $orders = $query
            ->forPlanningView()
            ->orderByRaw("SUBSTRING(order_number FROM '^[^0-9]*'), 
                         CAST(SUBSTRING(order_number FROM '[0-9]+') AS INTEGER),
                         SUBSTRING(order_number FROM '[^0-9]+$')")
            ->get();

        // If we have a selected MO, ensure its parent hierarchy is also loaded if needed
        if ($selectedMO) {
            $selectedOrder = $orders->firstWhere('id', $selectedMO);
            if ($selectedOrder && $selectedOrder->parent_id) {
                // Check if parent is already in the collection
                if (! $orders->contains('id', $selectedOrder->parent_id)) {
                    // We need to load the parent hierarchy
                    // Find the root by traversing up
                    $currentOrder = $selectedOrder;
                    $parentIds = [];

                    while ($currentOrder->parent_id && ! $orders->contains('id', $currentOrder->parent_id)) {
                        $parentIds[] = $currentOrder->parent_id;
                        $parentOrder = ManufacturingOrder::find($currentOrder->parent_id);
                        if (! $parentOrder) {
                            break;
                        }
                        $currentOrder = $parentOrder;
                    }

                    // Load all parent orders that are missing
                    if (! empty($parentIds)) {
                        $parentOrders = ManufacturingOrder::query()
                            ->whereIn('id', $parentIds)
                            ->forPlanningView()
                            ->get();

                        foreach ($parentOrders as $parentOrder) {
                            $orders->push($parentOrder);
                        }
                    }
                }
            }
        }

        // Add has_route attribute efficiently
        $orders->each(function ($order) {
            $order->has_route = $order->relationLoaded('manufacturingRoute') &&
                               $order->manufacturingRoute !== null;
        });

        // Build hierarchy in memory - pass the originally selected MO ID
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
            // Make sure to include the steps relationship
            $routeArray = $order->manufacturingRoute->toArray();

            // Always include steps array, even if empty
            if ($order->manufacturingRoute->relationLoaded('steps')) {
                $routeArray['steps'] = $order->manufacturingRoute->steps->toArray();
            } else {
                // Ensure steps is at least an empty array
                $routeArray['steps'] = $routeArray['steps'] ?? [];
            }

            $array['manufacturing_route'] = $routeArray;
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

    /**
     * Search manufacturing orders with advanced filtering for the selection modal.
     */
    public function searchOrders(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        $query = ManufacturingOrder::query()
            ->with([
                'item:id,item_number,name,description',
                'item.category:id,name',
                'item.media',
                'parent:id,order_number',
                'children:id,parent_id',
            ]);

        // Search filter
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('item', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('item_number', 'like', "%{$search}%");
                    });
            });
        }

        // Root only filter (father-most)
        if ($request->boolean('rootOnly')) {
            $query->whereNull('parent_id');
        }

        // Status filter
        if ($status = $request->input('status')) {
            if (is_array($status)) {
                $query->whereIn('status', $status);
            } else {
                $query->where('status', $status);
            }
        }

        // Date range filters
        if ($dateFrom = $request->input('createdFrom')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('createdTo')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }
        if ($dueDateFrom = $request->input('dueDateFrom')) {
            $query->whereDate('due_date', '>=', $dueDateFrom);
        }
        if ($dueDateTo = $request->input('dueDateTo')) {
            $query->whereDate('due_date', '<=', $dueDateTo);
        }

        // Category filter
        if ($categoryId = $request->input('categoryId')) {
            $query->whereHas('item.category', function ($q) use ($categoryId) {
                $q->where('id', $categoryId);
            });
        }

        // Priority filter
        if ($priority = $request->input('priority')) {
            $query->where('priority', $priority);
        }

        // Has unplanned children filter
        if ($request->boolean('hasUnplannedChildren')) {
            $query->whereHas('children', function ($q) {
                $q->whereIn('status', ['draft', 'pending']);
            });
        }

        // Recently modified filter (last 7 days)
        if ($request->boolean('recentlyModified')) {
            $query->where('updated_at', '>=', now()->subDays(7));
        }

        // Sorting
        $sortBy = $request->input('sortBy', 'created_at');
        $sortOrder = $request->input('sortOrder', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('perPage', 20);
        $results = $query->paginate($perPage);

        // Transform results to include useful computed properties
        $results->getCollection()->transform(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'priority' => $order->priority,
                'quantity' => $order->quantity,
                'due_date' => $order->due_date,
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at,
                'item' => $order->item ? [
                    'id' => $order->item->id,
                    'item_number' => $order->item->item_number,
                    'name' => $order->item->name,
                    'description' => $order->item->description,
                    'category' => $order->item->category,
                    'primary_image_url' => $order->item->primary_image_url,
                    'primary_image_thumbnail_url' => $order->item->getMedia('images')->first() ? route('api.media.show-conversion', [$order->item->getMedia('images')->first()->id, 'thumb']) : null,
                    'media' => $order->item->getMedia('images')->map(function ($media) {
                        return [
                            'id' => $media->id,
                            'url' => route('api.media.show', $media->id),
                            'thumbnail_url' => route('api.media.show-conversion', [$media->id, 'thumb']),
                        ];
                    }),
                ] : null,
                'parent' => $order->parent ? [
                    'id' => $order->parent->id,
                    'order_number' => $order->parent->order_number,
                ] : null,
                'has_children' => $order->children->isNotEmpty(),
                'children_count' => $order->children->count(),
                'is_root' => is_null($order->parent_id),
                'has_route' => ! is_null($order->manufacturing_route_id),
            ];
        });

        return response()->json($results);
    }

    /**
     * Get recent manufacturing orders for quick access.
     */
    public function recentOrders(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        $userId = $request->user()->id;

        // Get recently viewed/edited orders by this user
        // For now, we'll use recently updated orders as a proxy
        // In a real implementation, you might track user interactions separately
        $recentOrders = ManufacturingOrder::query()
            ->with([
                'item:id,item_number,name',
                'item.category:id,name',
                'item.media',
            ])
            ->whereIn('status', ['draft', 'planned'])
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'priority' => $order->priority,
                    'quantity' => $order->quantity,
                    'due_date' => $order->due_date,
                    'created_at' => $order->created_at,
                    'updated_at' => $order->updated_at,
                    'item' => $order->item ? [
                        'id' => $order->item->id,
                        'item_number' => $order->item->item_number,
                        'name' => $order->item->name,
                        'description' => $order->item->description,
                        'category' => $order->item->category,
                        'primary_image_url' => $order->item->primary_image_url,
                        'primary_image_thumbnail_url' => $order->item->getMedia('images')->first() ? route('api.media.show-conversion', [$order->item->getMedia('images')->first()->id, 'thumb']) : null,
                        'media' => $order->item->getMedia('images')->map(function ($media) {
                            return [
                                'id' => $media->id,
                                'url' => route('api.media.show', $media->id),
                                'thumbnail_url' => route('api.media.show-conversion', [$media->id, 'thumb']),
                            ];
                        }),
                    ] : null,
                    'parent' => null, // Recent orders don't need parent info for now
                    'has_children' => false, // Simplified for recent orders
                    'children_count' => 0,
                    'is_root' => is_null($order->parent_id),
                    'has_route' => ! is_null($order->manufacturing_route_id),
                ];
            });

        return response()->json($recentOrders);
    }

    /**
     * Helper method to find an order in the hierarchical array structure.
     */
    private function findOrderInHierarchy($orders, $orderId)
    {
        foreach ($orders as $order) {
            if ($order['id'] == $orderId) {
                return $order;
            }
            if (isset($order['children']) && is_array($order['children'])) {
                $found = $this->findOrderInHierarchy($order['children'], $orderId);
                if ($found) {
                    return $found;
                }
            }
        }

        return null;
    }

    /**
     * Bulk update priorities for multiple manufacturing orders.
     */
    public function bulkUpdatePriorities(Request $request)
    {
        $validated = $request->validate([
            'updates' => 'required|array',
            'updates.*.id' => 'required|exists:manufacturing_orders,id',
            'updates.*.priority' => 'required|integer|min:0|max:100',
        ]);

        $results = [];
        $errors = [];

        DB::transaction(function () use ($validated, &$results, &$errors) {
            foreach ($validated['updates'] as $update) {
                try {
                    $order = ManufacturingOrder::find($update['id']);

                    // Check authorization
                    if (! auth()->user()->can('update', $order)) {
                        $errors[] = [
                            'id' => $update['id'],
                            'success' => false,
                            'error' => 'Unauthorized to update this order',
                        ];
                        continue;
                    }

                    // Check if order can be updated
                    if (! in_array($order->status, ['draft', 'planned', 'scheduled'])) {
                        $errors[] = [
                            'id' => $update['id'],
                            'success' => false,
                            'error' => 'Only draft, planned, or scheduled orders can be updated',
                        ];
                        continue;
                    }

                    $order->priority = $update['priority'];
                    $order->save();

                    $results[] = [
                        'id' => $update['id'],
                        'success' => true,
                        'priority' => $order->priority,
                    ];
                } catch (\Exception $e) {
                    $errors[] = [
                        'id' => $update['id'],
                        'success' => false,
                        'error' => $e->getMessage(),
                    ];
                }
            }
        });

        // If there were any errors, return back with errors
        if (! empty($errors)) {
            return back()->withErrors(['updates' => 'Some priority updates failed.']);
        }

        // Return success and let Inertia handle the partial reload
        // The 'only' parameter in the request will ensure only manufacturingOrders are updated
        // The backend will use the selectedMO from the URL query string to maintain the same hierarchy
        // Also preserve user selection state
        $response = back()->with('success', count($results) . ' priority update' . (count($results) > 1 ? 's' : '') . ' applied successfully.');

        // If userSelection, activeMO, or sorting are in the request, ensure they're preserved in the response
        if ($request->has('userSelection') || $request->has('activeMO') || $request->has('sortField') || $request->has('sortDirection')) {
            // dd($request->input('sortField'), $request->input('sortDirection'));
            $response = $response->with([
                'preservedSelection' => [
                    'userSelection' => $request->input('userSelection') ? explode(',', $request->input('userSelection')) : [],
                    'activeMO' => $request->input('activeMO') ? (int) $request->input('activeMO') : null,
                ],
                'preservedSorting' => [
                    'sortField' => $request->input('sortField'),
                    'sortDirection' => $request->input('sortDirection'),
                ],
            ]);
        }

        return $response;
    }
}

<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ItemCategory;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Services\Production\RouteTemplateService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RouteTemplateController extends Controller
{
    public function __construct(
        private RouteTemplateService $templateService
    ) {}

    /**
     * Display listing of route templates.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingRoute::class);

        $templates = ManufacturingRoute::templates()
            ->with(['itemCategory', 'createdBy', 'steps'])
            ->when($request->input('category_id'), function ($query, $categoryId) {
                $query->where('item_category_id', $categoryId);
            })
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate($request->input('per_page', 20));

        $categories = ItemCategory::active()->orderBy('name')->get();

        return Inertia::render('production/templates/index', [
            'templates' => $templates,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category_id', 'per_page']),
        ]);
    }

    /**
     * Show the form for creating a new template.
     */
    public function create()
    {
        $this->authorize('create', ManufacturingRoute::class);

        $categories = ItemCategory::active()->orderBy('name')->get();

        return Inertia::render('production/templates/create', [
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created template.
     */
    public function store(Request $request)
    {
        $this->authorize('create', ManufacturingRoute::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'item_category_id' => 'nullable|exists:item_categories,id',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        $template = $this->templateService->createTemplate($validated);

        return redirect()->route('production.templates.show', $template)
            ->with('success', 'Template created successfully.');
    }

    /**
     * Display the specified template.
     */
    public function show(ManufacturingRoute $template)
    {
        $this->authorize('view', $template);

        if (! $template->is_template) {
            abort(404, 'Route is not a template.');
        }

        $template->load([
            'itemCategory',
            'createdBy',
            'steps.workCell',
        ]);

        $usageStats = $this->templateService->getTemplateUsageStats($template);

        return Inertia::render('production/templates/show', [
            'template' => $template,
            'usageStats' => $usageStats,
        ]);
    }

    /**
     * Show the form for editing the specified template.
     */
    public function edit(ManufacturingRoute $template)
    {
        $this->authorize('update', $template);

        if (! $template->is_template) {
            abort(404, 'Route is not a template.');
        }

        $template->load(['itemCategory', 'steps']);
        $categories = ItemCategory::active()->orderBy('name')->get();

        return Inertia::render('production/templates/edit', [
            'template' => $template,
            'categories' => $categories,
        ]);
    }

    /**
     * Update the specified template.
     */
    public function update(Request $request, ManufacturingRoute $template)
    {
        $this->authorize('update', $template);

        if (! $template->is_template) {
            abort(404, 'Route is not a template.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        $template = $this->templateService->updateTemplate($template, $validated);

        return redirect()->route('production.templates.show', $template)
            ->with('success', 'Template updated successfully.');
    }

    /**
     * Remove the specified template.
     */
    public function destroy(ManufacturingRoute $template)
    {
        $this->authorize('delete', $template);

        if (! $template->is_template) {
            abort(404, 'Route is not a template.');
        }

        try {
            $this->templateService->deleteTemplate($template);

            return redirect()->route('production.templates.index')
                ->with('success', 'Template deleted successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Save production route as template.
     */
    public function saveAsTemplate(Request $request, ManufacturingRoute $route)
    {
        $this->authorize('create', ManufacturingRoute::class);

        if ($route->is_template) {
            return back()->with('error', 'This route is already a template.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'item_category_id' => 'nullable|exists:item_categories,id',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Ensure steps are loaded with all their relationships
        $route->load('steps');

        try {
            $template = $this->templateService->saveAsTemplate($route, $validated);

            // Use back() to stay on the same page and let Inertia handle the response
            // This preserves the state and prevents page refresh
            return back()->with('success', 'Route saved as template successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Copy template to manufacturing order.
     */
    public function copyToOrder(Request $request, ManufacturingRoute $template)
    {
        $this->authorize('view', $template);

        if (! $template->is_template) {
            abort(404, 'Route is not a template.');
        }

        $validated = $request->validate([
            'manufacturing_order_id' => 'required|exists:manufacturing_orders,id',
            'force' => 'nullable|boolean',
        ]);

        $order = ManufacturingOrder::findOrFail($validated['manufacturing_order_id']);
        $this->authorize('update', $order);

        try {
            $route = $this->templateService->copyTemplateToOrder(
                $template,
                $order,
                $validated['force'] ?? false
            );

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Template copied to order successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Display template selection modal content.
     */
    public function select(Request $request)
    {
        $orderId = $request->input('order_id');
        if (! $orderId) {
            abort(400, 'Order ID is required.');
        }

        $order = ManufacturingOrder::with('item.category')->findOrFail($orderId);
        $this->authorize('update', $order);

        // Get templates for the item's category
        $categoryTemplates = collect();
        if ($order->item && $order->item->item_category_id) {
            $categoryTemplates = ManufacturingRoute::templates()
                ->where('item_category_id', $order->item->item_category_id)
                ->where('is_active', true)
                ->with('steps')
                ->orderBy('updated_at', 'desc')
                ->get();
        }

        // Get all active templates
        $allTemplates = ManufacturingRoute::templates()
            ->where('is_active', true)
            ->with(['itemCategory', 'steps'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'order' => $order,
            'categoryTemplates' => $categoryTemplates,
            'allTemplates' => $allTemplates,
            'recommendedTemplate' => $categoryTemplates->first(),
        ]);
    }
}

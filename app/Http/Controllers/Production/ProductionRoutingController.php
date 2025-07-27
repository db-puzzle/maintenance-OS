<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\RouteTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductionRoutingController extends Controller
{
    /**
     * Display a listing of production routings.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ManufacturingRoute::class);

        $routings = ManufacturingRoute::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhereHas('item', function ($query) use ($search) {
                          $query->where('item_number', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                      });
                });
            })
            ->when($request->filled('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->with(['item', 'manufacturingOrder', 'createdBy', 'routeTemplate'])
            ->withCount('steps')
            ->orderBy('id', 'desc')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('production/routing/index', [
            'routings' => $routings,
            'filters' => $request->only(['search', 'is_active', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', ManufacturingRoute::class),
            ],
        ]);
    }

    /**
     * Show the form for creating a new routing.
     */
    public function create(Request $request): Response
    {
        $this->authorize('create', ManufacturingRoute::class);

        $orderId = $request->input('order_id');
        $order = $orderId ? ManufacturingOrder::with('item')->find($orderId) : null;

        return Inertia::render('production/routing/create', [
            'order' => $order,
            'workCells' => WorkCell::where('is_active', true)->get(),
            'routeTemplates' => RouteTemplate::where('is_active', true)->get(),
        ]);
    }

    /**
     * Store a newly created routing.
     */
    public function store(Request $request)
    {
        $this->authorize('create', ManufacturingRoute::class);

        $validated = $request->validate([
            'production_order_id' => 'required|exists:manufacturing_orders,id',
            'item_id' => 'required|exists:items,id',
            'route_template_id' => 'nullable|exists:route_templates,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated) {
            $validated['created_by'] = auth()->id();
            $validated['is_active'] = true;

            $routing = ManufacturingRoute::create($validated);

            // Create steps from template if provided
            if (!empty($validated['route_template_id'])) {
                $template = RouteTemplate::find($validated['route_template_id']);
                $routing->createFromTemplate($template);
            }
        });

        return redirect()->route('production.routing.index')
            ->with('success', 'Routing created successfully.');
    }

    /**
     * Display the specified routing.
     */
    public function show(ManufacturingRoute $routing): Response
    {
        $this->authorize('view', $routing);

        $routing->load([
            'item',
            'manufacturingOrder',
            'steps.workCell',
            'routeTemplate',
            'createdBy',
        ]);

        return Inertia::render('production/routing/show', [
            'routing' => $routing,
            'effectiveSteps' => $routing->steps,
            'can' => [
                'update' => auth()->user()->can('update', $routing),
                'delete' => auth()->user()->can('delete', $routing),
                'manage_steps' => auth()->user()->can('manageSteps', $routing),
            ],
        ]);
    }

    /**
     * Show the form for editing the routing.
     */
    public function edit(ManufacturingRoute $routing): Response
    {
        $this->authorize('update', $routing);

        $routing->load(['manufacturingOrder', 'item', 'steps.workCell']);

        return Inertia::render('production/routing/edit', [
            'routing' => $routing,
            'workCells' => WorkCell::where('is_active', true)->get(),
        ]);
    }

    /**
     * Update the specified routing.
     */
    public function update(Request $request, ManufacturingRoute $routing)
    {
        $this->authorize('update', $routing);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $routing->update($validated);

        return redirect()->route('production.routing.show', $routing)
            ->with('success', 'Routing updated successfully.');
    }

    /**
     * Remove the specified routing.
     */
    public function destroy(ManufacturingRoute $routing)
    {
        $this->authorize('delete', $routing);

        // Check if routing has any completed steps
        if ($routing->steps()->whereNotIn('status', ['pending', 'cancelled'])->exists()) {
            return back()->with('error', 'Cannot delete routing with executed steps.');
        }

        $routing->delete();

        return redirect()->route('production.routing.index')
            ->with('success', 'Routing deleted successfully.');
    }

    /**
     * Update routing steps.
     */
    public function updateSteps(Request $request, ManufacturingRoute $routing)
    {
        $this->authorize('manageSteps', $routing);

        $validated = $request->validate([
            'steps' => 'required|array',
            'steps.*.id' => 'nullable|exists:manufacturing_steps,id',
            'steps.*.name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.work_cell_id' => 'required|exists:work_cells,id',
            'steps.*.setup_time_minutes' => 'required|numeric|min:0',
            'steps.*.cycle_time_minutes' => 'required|numeric|min:0',
            'steps.*.step_type' => 'required|in:standard,quality_check,rework',
        ]);

        DB::transaction(function () use ($routing, $validated) {
            // Get existing step IDs
            $existingIds = $routing->steps()->pluck('id')->toArray();
            $updatedIds = array_filter(array_column($validated['steps'], 'id'));
            
            // Delete removed steps (only if pending)
            $toDelete = array_diff($existingIds, $updatedIds);
            ManufacturingStep::whereIn('id', $toDelete)
                ->where('status', 'pending')
                ->delete();

            // Update or create steps
            foreach ($validated['steps'] as $index => $stepData) {
                $stepData['step_number'] = $index + 1;
                $stepData['status'] = $stepData['status'] ?? 'pending';
                
                if (isset($stepData['id'])) {
                    $step = ManufacturingStep::find($stepData['id']);
                    if ($step && $step->status === 'pending') {
                        $step->update($stepData);
                    }
                } else {
                    $routing->steps()->create($stepData);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Routing steps updated successfully.',
            'routing' => $routing->load('steps.workCell'),
        ]);
    }

    /**
     * Display the visual builder for the routing.
     */
    public function builder(ManufacturingRoute $routing): Response
    {
        $this->authorize('view', $routing);

        $routing->load(['steps.workCell', 'manufacturingOrder.item']);

        return Inertia::render('production/routing/builder', [
            'routing' => $routing,
            'workCells' => WorkCell::where('is_active', true)->get(),
            'stepTypes' => ManufacturingStep::STEP_TYPES,
            'can' => [
                'manage_steps' => auth()->user()->can('manageSteps', $routing),
            ],
        ]);
    }
} 
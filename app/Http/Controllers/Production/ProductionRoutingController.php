<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\BomItem;
use App\Models\Production\ProductionRouting;
use App\Models\Production\RoutingStep;
use App\Models\Production\WorkCell;
use App\Services\Production\RoutingInheritanceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductionRoutingController extends Controller
{
    protected RoutingInheritanceService $inheritanceService;

    public function __construct(RoutingInheritanceService $inheritanceService)
    {
        $this->inheritanceService = $inheritanceService;
    }

    /**
     * Display a listing of production routings.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ProductionRouting::class);

        $routings = ProductionRouting::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('routing_number', 'like', "%{$search}%")
                      ->orWhere('name', 'like', "%{$search}%")
                      ->orWhereHas('bomItem', function ($query) use ($search) {
                          $query->where('item_number', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                      });
                });
            })
            ->when($request->filled('routing_type'), function ($query) use ($request) {
                $query->where('routing_type', $request->input('routing_type'));
            })
            ->when($request->filled('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->with(['bomItem.item', 'bomItem.bomVersion.billOfMaterial', 'createdBy'])
            ->withCount('steps')
            ->orderBy('routing_number')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('production/routing/index', [
            'routings' => $routings,
            'filters' => $request->only(['search', 'routing_type', 'is_active', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', ProductionRouting::class),
            ],
        ]);
    }

    /**
     * Show the form for creating a new routing.
     */
    public function create(Request $request): Response
    {
        $this->authorize('create', ProductionRouting::class);

        $bomItemId = $request->input('bom_item_id');
        $bomItem = $bomItemId ? BomItem::with('bomVersion.billOfMaterial')->find($bomItemId) : null;

        return Inertia::render('production/routing/create', [
            'bomItem' => $bomItem,
            'workCells' => WorkCell::active()->get(),
            'inheritableRoutings' => $this->getInheritableRoutings($bomItem),
        ]);
    }

    /**
     * Store a newly created routing.
     */
    public function store(Request $request)
    {
        $this->authorize('create', ProductionRouting::class);

        $validated = $request->validate([
            'bom_item_id' => 'required|exists:bom_items,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'routing_type' => 'required|in:defined,inherited',
            'parent_routing_id' => 'nullable|required_if:routing_type,inherited|exists:production_routings,id',
            'steps' => 'required_if:routing_type,defined|array|min:1',
            'steps.*.name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.work_cell_id' => 'required|exists:work_cells,id',
            'steps.*.setup_time_minutes' => 'required|numeric|min:0',
            'steps.*.cycle_time_minutes' => 'required|numeric|min:0',
            'steps.*.teardown_time_minutes' => 'required|numeric|min:0',
            'steps.*.operators_required' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($validated) {
            // Generate routing number
            $validated['routing_number'] = $this->generateRoutingNumber();
            $validated['created_by'] = auth()->id();
            $validated['is_active'] = true;

            $routing = ProductionRouting::create($validated);

            // Create routing steps if defined
            if ($validated['routing_type'] === 'defined' && isset($validated['steps'])) {
                foreach ($validated['steps'] as $index => $stepData) {
                    $stepData['step_number'] = $index + 1;
                    $routing->steps()->create($stepData);
                }
            }

            // Update inheritance for child items
            if ($validated['routing_type'] === 'defined') {
                $this->inheritanceService->updateChildInheritance($routing->bomItem);
            }
        });

        return redirect()->route('production.routing.index')
            ->with('success', 'Routing created successfully.');
    }

    /**
     * Display the specified routing.
     */
    public function show(ProductionRouting $routing): Response
    {
        $this->authorize('view', $routing);

        $routing->load([
            'bomItem.item',
            'bomItem.bomVersion.billOfMaterial',
            'steps.workCell',
            'parentRouting',
            'childRoutings.bomItem.item',
            'createdBy',
        ]);

        // Get effective steps (handles inheritance)
        $effectiveSteps = $routing->getEffectiveSteps();

        return Inertia::render('production/routing/show', [
            'routing' => $routing,
            'effectiveSteps' => $effectiveSteps,
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
    public function edit(ProductionRouting $routing): Response
    {
        $this->authorize('update', $routing);

        $routing->load(['bomItem.bomVersion.billOfMaterial', 'steps.workCell']);

        return Inertia::render('production/routing/edit', [
            'routing' => $routing,
            'workCells' => WorkCell::active()->get(),
            'inheritableRoutings' => $this->getInheritableRoutings($routing->bomItem),
        ]);
    }

    /**
     * Update the specified routing.
     */
    public function update(Request $request, ProductionRouting $routing)
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
    public function destroy(ProductionRouting $routing)
    {
        $this->authorize('delete', $routing);

        // Check if routing has any production schedules
        if ($routing->steps()->has('productionSchedules')->exists()) {
            return back()->with('error', 'Cannot delete routing with active production schedules.');
        }

        // Check if routing is inherited by others
        if ($routing->childRoutings()->exists()) {
            return back()->with('error', 'Cannot delete routing that is inherited by other routings.');
        }

        $routing->delete();

        // Update inheritance for child items
        $this->inheritanceService->updateChildInheritance($routing->bomItem);

        return redirect()->route('production.routing.index')
            ->with('success', 'Routing deleted successfully.');
    }

    /**
     * Update routing steps (drag-and-drop interface).
     */
    public function updateSteps(Request $request, ProductionRouting $routing)
    {
        $this->authorize('manageSteps', $routing);

        if ($routing->routing_type !== 'defined') {
            return back()->with('error', 'Cannot modify steps for inherited routing.');
        }

        $validated = $request->validate([
            'steps' => 'required|array',
            'steps.*.id' => 'nullable|exists:routing_steps,id',
            'steps.*.name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.work_cell_id' => 'required|exists:work_cells,id',
            'steps.*.setup_time_minutes' => 'required|numeric|min:0',
            'steps.*.cycle_time_minutes' => 'required|numeric|min:0',
            'steps.*.teardown_time_minutes' => 'required|numeric|min:0',
            'steps.*.operators_required' => 'required|integer|min:1',
            'steps.*.dependencies' => 'nullable|array',
        ]);

        DB::transaction(function () use ($routing, $validated) {
            // Get existing step IDs
            $existingIds = $routing->steps()->pluck('id')->toArray();
            $updatedIds = array_filter(array_column($validated['steps'], 'id'));
            
            // Delete removed steps
            $toDelete = array_diff($existingIds, $updatedIds);
            RoutingStep::whereIn('id', $toDelete)->delete();

            // Update or create steps
            foreach ($validated['steps'] as $index => $stepData) {
                $stepData['step_number'] = $index + 1;
                
                if (isset($stepData['id'])) {
                    $step = RoutingStep::find($stepData['id']);
                    $step->update($stepData);
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
     * Clone routing for another BOM item.
     */
    public function clone(Request $request, ProductionRouting $routing)
    {
        $this->authorize('create', ProductionRouting::class);

        $validated = $request->validate([
            'bom_item_id' => 'required|exists:bom_items,id',
            'name' => 'nullable|string|max:255',
        ]);

        $bomItem = BomItem::find($validated['bom_item_id']);

        // Check if item already has routing
        if ($bomItem->routing()->exists()) {
            return back()->with('error', 'Target BOM item already has a routing defined.');
        }

        $newRouting = DB::transaction(function () use ($routing, $bomItem, $validated) {
            $newRouting = $routing->cloneForItem($bomItem);
            
            if (isset($validated['name'])) {
                $newRouting->update(['name' => $validated['name']]);
            }

            return $newRouting;
        });

        return redirect()->route('production.routing.show', $newRouting)
            ->with('success', 'Routing cloned successfully.');
    }

    /**
     * Validate routing completeness.
     */
    public function validateRouting(ProductionRouting $routing)
    {
        $this->authorize('view', $routing);

        $validation = $this->inheritanceService->validateBomRouting($routing->bomItem->bom_version_id);

        return response()->json([
            'valid' => empty($validation['missing']) && empty($validation['warnings']),
            'validation' => $validation,
        ]);
    }

    /**
     * Get routing diagram data.
     */
    public function diagram(ProductionRouting $routing)
    {
        $this->authorize('view', $routing);

        $steps = $routing->getEffectiveSteps()->map(function ($step) {
            return [
                'id' => $step->id,
                'name' => $step->name,
                'work_cell' => $step->workCell->name,
                'duration' => $step->getTotalTime(),
                'dependencies' => $step->dependencies ?? [],
                'position' => [
                    'x' => $step->step_number * 200,
                    'y' => 100,
                ],
            ];
        });

        return response()->json([
            'routing' => $routing,
            'steps' => $steps,
            'connections' => $this->buildStepConnections($steps),
        ]);
    }

    /**
     * Get inheritable routings for a BOM item.
     */
    protected function getInheritableRoutings(?BomItem $bomItem)
    {
        if (!$bomItem || !$bomItem->parent_item_id) {
            return collect();
        }

        return $this->inheritanceService->getInheritableRoutings($bomItem);
    }

    /**
     * Generate routing number.
     */
    protected function generateRoutingNumber(): string
    {
        $lastRouting = ProductionRouting::orderBy('routing_number', 'desc')->first();
        $sequence = $lastRouting 
            ? intval(substr($lastRouting->routing_number, -6)) + 1 
            : 1;

        return sprintf('RT-%06d', $sequence);
    }

    /**
     * Build step connections for diagram.
     */
    protected function buildStepConnections($steps)
    {
        $connections = [];

        foreach ($steps as $step) {
            if (!empty($step['dependencies'])) {
                foreach ($step['dependencies'] as $depId) {
                    $connections[] = [
                        'from' => $depId,
                        'to' => $step['id'],
                    ];
                }
            } elseif ($step !== $steps->first()) {
                // Linear connection if no dependencies
                $prevStep = $steps[$steps->search($step) - 1];
                $connections[] = [
                    'from' => $prevStep['id'],
                    'to' => $step['id'],
                ];
            }
        }

        return $connections;
    }
} 
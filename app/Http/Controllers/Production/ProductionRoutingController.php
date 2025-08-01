<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\RouteTemplate;
use App\Models\Production\Item;
use App\Models\Forms\Form;
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
            'items' => Item::where('is_active', true)->orderBy('item_number')->get(),
            'orders' => ManufacturingOrder::with('item')
                ->whereIn('status', ['released'])
                ->whereDoesntHave('manufacturingRoute')
                ->orderBy('order_number')
                ->get(),
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
            'manufacturing_order_id' => 'nullable|exists:manufacturing_orders,id',
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

        // Load templates if user can manage steps
        $templates = [];
        if (auth()->user()->can('manageSteps', $routing)) {
            $templates = RouteTemplate::where('is_active', true)
                ->when($routing->item?->item_category_id, function ($query, $categoryId) {
                    $query->where('item_category_id', $categoryId)
                          ->orWhereNull('item_category_id');
                })
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

        return Inertia::render('production/routing/show', [
            'routing' => $routing,
            'effectiveSteps' => $routing->steps,
            'templates' => $templates,
            'workCells' => WorkCell::where('is_active', true)->get(),
            'stepTypes' => ManufacturingStep::STEP_TYPES,
            'forms' => \App\Models\Forms\Form::where('is_active', true)->get(),
            'can' => [
                'update' => auth()->user()->can('update', $routing),
                'delete' => auth()->user()->can('delete', $routing),
                'manage_steps' => auth()->user()->can('manageSteps', $routing),
                'execute_steps' => auth()->user()->can('production.steps.execute'),
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
     * 
     * @deprecated This method is deprecated and should no longer be used.
     * The visual builder functionality has been removed from the application.
     */
    public function builder(ManufacturingRoute $routing): Response
    {
        abort(404, 'This functionality has been deprecated and is no longer available.');
    }

    /**
     * Store a new manufacturing step.
     */
    public function storeStep(Request $request, ManufacturingRoute $routing)
    {
        $this->authorize('update', $routing);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'step_type' => 'required|in:standard,quality_check,rework',
            'step_number' => 'required|integer|min:1',
            'work_cell_id' => 'nullable|exists:work_cells,id',
            'setup_time_minutes' => 'required|integer|min:0',
            'cycle_time_minutes' => 'required|integer|min:0',
            'depends_on_step_id' => [
                function ($attribute, $value, $fail) use ($request) {
                    if ($request->step_number > 1 && empty($value)) {
                        $fail('Steps after the first must have a dependency.');
                    }
                },
                'nullable',
                'exists:manufacturing_steps,id'
            ],
            'can_start_when_dependency' => 'nullable|in:completed',
            'quality_check_mode' => 'nullable|in:every_part,entire_lot,sampling',
            'sampling_size' => 'nullable|integer|min:0',
            'form_id' => 'nullable|exists:forms,id',
        ]);

        $validated['manufacturing_route_id'] = $routing->id;
        $validated['status'] = 'pending';
        
        // Default to 'completed' if not provided
        if (!isset($validated['can_start_when_dependency'])) {
            $validated['can_start_when_dependency'] = 'completed';
        }
        
        // Check if step_number already exists and find the next available one
        $existingStep = $routing->steps()->where('step_number', $validated['step_number'])->first();
        if ($existingStep) {
            // Find the maximum step number and use the next one
            $maxStepNumber = $routing->steps()->max('step_number') ?? 0;
            $validated['step_number'] = $maxStepNumber + 1;
        }

        $step = ManufacturingStep::create($validated);

        return back()->with('success', 'Step created successfully.');
    }

    /**
     * Update a manufacturing step.
     */
    public function updateStep(Request $request, ManufacturingRoute $routing, ManufacturingStep $step)
    {
        $this->authorize('update', $routing);
        
        if ($step->manufacturing_route_id !== $routing->id) {
            abort(404);
        }
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'step_type' => 'required|in:standard,quality_check,rework',
            'work_cell_id' => 'nullable|exists:work_cells,id',
            'setup_time_minutes' => 'required|integer|min:0',
            'cycle_time_minutes' => 'required|integer|min:0',
            'depends_on_step_id' => [
                function ($attribute, $value, $fail) use ($step) {
                    if ($step->step_number > 1 && empty($value)) {
                        $fail('Steps after the first must have a dependency.');
                    }
                },
                'nullable',
                'exists:manufacturing_steps,id'
            ],
            'can_start_when_dependency' => 'nullable|in:completed',
            'quality_check_mode' => 'nullable|in:every_part,entire_lot,sampling',
            'sampling_size' => 'nullable|integer|min:0',
            'form_id' => 'nullable|exists:forms,id',
        ]);
        
        // Default to 'completed' if not provided
        if (!isset($validated['can_start_when_dependency'])) {
            $validated['can_start_when_dependency'] = 'completed';
        }
        
        $step->update($validated);
        
        return back()->with('success', 'Step updated successfully.');
    }

    /**
     * Delete a manufacturing step.
     */
    public function destroyStep(ManufacturingRoute $routing, ManufacturingStep $step)
    {
        $this->authorize('update', $routing);
        
        if ($step->manufacturing_route_id !== $routing->id) {
            abort(404);
        }
        
        // Check if step has executions
        if ($step->executions()->exists()) {
            return back()->with('error', 'Cannot delete a step that has been executed.');
        }
        
        // Check if other steps depend on this one
        if ($step->dependentSteps()->exists()) {
            return back()->with('error', 'Cannot delete a step that other steps depend on.');
        }
        
        $step->delete();
        
        // Reorder remaining steps
        $routing->steps()
            ->where('step_number', '>', $step->step_number)
            ->decrement('step_number');
        
        return back()->with('success', 'Step deleted successfully.');
    }

    /**
     * Reorder manufacturing steps.
     */
    public function reorderSteps(Request $request, ManufacturingRoute $routing)
    {
        $this->authorize('update', $routing);
        
        $validated = $request->validate([
            'steps' => 'required|array',
            'steps.*.id' => 'required|exists:manufacturing_steps,id',
            'steps.*.step_number' => 'required|integer|min:1',
        ]);
        
        // Verify all steps belong to this route
        $stepIds = collect($validated['steps'])->pluck('id');
        $routeStepIds = $routing->steps()->pluck('id');
        
        if ($stepIds->diff($routeStepIds)->isNotEmpty() || $routeStepIds->diff($stepIds)->isNotEmpty()) {
            return back()->with('error', 'Invalid step IDs provided.');
        }
        
        // Update step numbers
        foreach ($validated['steps'] as $stepData) {
            ManufacturingStep::where('id', $stepData['id'])
                ->update(['step_number' => $stepData['step_number']]);
        }
        
        return back()->with('success', 'Steps reordered successfully.');
    }

    /**
     * Batch update route and steps.
     */
    public function batchUpdate(Request $request, ManufacturingRoute $routing)
    {
        $this->authorize('update', $routing);
        
        $validated = $request->validate([
            'route_name' => 'required|string|max:255',
            'route_description' => 'nullable|string',
            'is_active' => 'boolean',
            'deleted_step_ids' => 'array',
            'deleted_step_ids.*' => 'integer|exists:manufacturing_steps,id',
            'steps' => 'array',
            'steps.*.id' => 'nullable|integer',
            'steps.*.step_number' => 'required|integer|min:1',
            'steps.*.name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.step_type' => 'required|in:standard,quality_check,rework',
            'steps.*.work_cell_id' => 'nullable|exists:work_cells,id',
            'steps.*.setup_time_minutes' => 'required|integer|min:0',
            'steps.*.cycle_time_minutes' => 'required|integer|min:0',
            'steps.*.depends_on_step_id' => 'nullable|integer',
            'steps.*.can_start_when_dependency' => 'nullable|in:completed',
            'steps.*.quality_check_mode' => 'nullable|in:every_part,entire_lot,sampling',
            'steps.*.sampling_size' => 'nullable|integer|min:0',
            'steps.*.form_id' => 'nullable|exists:forms,id',
            'steps.*.is_new' => 'boolean',
        ]);
        
        // Additional validation: ensure non-first steps have dependencies
        foreach ($validated['steps'] as $index => $step) {
            if ($step['step_number'] > 1 && empty($step['depends_on_step_id'])) {
                return back()->withErrors([
                    "steps.{$index}.depends_on_step_id" => 'Steps after the first must have a dependency.'
                ]);
            }
        }
        
        DB::transaction(function () use ($validated, $routing) {
            // Update route info
            $routing->update([
                'name' => $validated['route_name'],
                'description' => $validated['route_description'],
                'is_active' => $validated['is_active'] ?? $routing->is_active,
            ]);
            
            // Delete removed steps
            if (!empty($validated['deleted_step_ids'])) {
                ManufacturingStep::whereIn('id', $validated['deleted_step_ids'])
                    ->where('manufacturing_route_id', $routing->id)
                    ->delete();
            }
            
            // First, temporarily set ALL existing steps to high step numbers to avoid conflicts
            // This prevents unique constraint violations when reordering steps
            ManufacturingStep::where('manufacturing_route_id', $routing->id)
                ->orderBy('step_number')
                ->get()
                ->each(function ($step, $index) {
                    $step->update(['step_number' => 1000 + $index]);
                });
            
            // Now create/update all steps with correct step numbers
            $stepMapping = []; // Map temporary IDs to real IDs
            
            foreach ($validated['steps'] as $stepData) {
                $stepAttributes = [
                    'step_number' => $stepData['step_number'],
                    'name' => $stepData['name'],
                    'description' => $stepData['description'] ?? null,
                    'step_type' => $stepData['step_type'],
                    'work_cell_id' => $stepData['work_cell_id'] ?? null,
                    'setup_time_minutes' => $stepData['setup_time_minutes'],
                    'cycle_time_minutes' => $stepData['cycle_time_minutes'],
                    'can_start_when_dependency' => $stepData['can_start_when_dependency'] ?? 'completed',
                    'quality_check_mode' => $stepData['quality_check_mode'] ?? 'every_part',
                    'sampling_size' => $stepData['sampling_size'] ?? 0,
                    'form_id' => $stepData['form_id'] ?? null,
                    // Don't set depends_on_step_id yet
                ];
                
                if (empty($stepData['id']) || !empty($stepData['is_new'])) {
                    // Create new step
                    $newStep = $routing->steps()->create($stepAttributes);
                    // Store mapping of temporary ID to real ID
                    if (!empty($stepData['id'])) {
                        $stepMapping[$stepData['id']] = $newStep->id;
                    }
                } else {
                    // Update existing step
                    ManufacturingStep::where('id', $stepData['id'])
                        ->where('manufacturing_route_id', $routing->id)
                        ->update($stepAttributes);
                    // Keep track of existing IDs
                    $stepMapping[$stepData['id']] = $stepData['id'];
                }
            }
            
            // Second pass: Update dependencies using real IDs
            foreach ($validated['steps'] as $stepData) {
                if (!empty($stepData['depends_on_step_id'])) {
                    $realStepId = null;
                    
                    // Determine the real ID of the current step
                    if (!empty($stepData['is_new']) && !empty($stepData['id'])) {
                        $realStepId = $stepMapping[$stepData['id']] ?? null;
                    } elseif (!empty($stepData['id'])) {
                        $realStepId = $stepData['id'];
                    }
                    
                    // Determine the real ID of the dependency
                    $realDependencyId = $stepMapping[$stepData['depends_on_step_id']] ?? $stepData['depends_on_step_id'];
                    
                    // Only update if we have valid IDs and the dependency is not a temporary ID
                    if ($realStepId && $realDependencyId && $realDependencyId < 1000000000) {
                        ManufacturingStep::where('id', $realStepId)
                            ->where('manufacturing_route_id', $routing->id)
                            ->update(['depends_on_step_id' => $realDependencyId]);
                    }
                }
            }
        });
        
        return back()->with('success', 'Route and steps updated successfully.');
    }

    /**
     * Initialize empty steps structure for a routing.
     */
    public function initializeSteps(Request $request, ManufacturingRoute $routing)
    {
        $this->authorize('update', $routing);
        
        // Check if routing already has steps
        if ($routing->steps()->exists()) {
            return back()->with('info', 'This routing already has steps configured.');
        }
        
        // Return success to trigger the builder view
        return back()->with('openRouteBuilder', true);
    }

    /**
     * Create steps from a template for a routing.
     */
    public function createStepsFromTemplate(Request $request, ManufacturingRoute $routing)
    {
        $this->authorize('update', $routing);
        
        $validated = $request->validate([
            'template_id' => 'required|exists:route_templates,id',
        ]);
        
        // Check if routing already has steps
        if ($routing->steps()->exists()) {
            return back()->with('error', 'This routing already has steps configured.');
        }
        
        try {
            DB::transaction(function () use ($validated, $routing) {
                $template = RouteTemplate::find($validated['template_id']);
                
                // Copy steps from template
                $stepMapping = [];
                foreach ($template->steps as $templateStep) {
                    $newStep = $routing->steps()->create([
                        'step_number' => $templateStep->step_number,
                        'name' => $templateStep->name,
                        'description' => $templateStep->description,
                        'step_type' => $templateStep->step_type,
                        'work_cell_id' => $templateStep->work_cell_id,
                        'setup_time_minutes' => $templateStep->setup_time_minutes,
                        'cycle_time_minutes' => $templateStep->cycle_time_minutes,
                        'depends_on_step_id' => null, // Will update after all steps are created
                        'can_start_when_dependency' => $templateStep->can_start_when_dependency,
                        'quality_check_mode' => $templateStep->quality_check_mode,
                        'sampling_size' => $templateStep->sampling_size,
                        'form_id' => $templateStep->form_id,
                        'status' => 'pending',
                    ]);
                    
                    $stepMapping[$templateStep->id] = $newStep->id;
                }
                
                // Update dependencies
                foreach ($template->steps as $templateStep) {
                    if ($templateStep->depends_on_step_id) {
                        $newStepId = $stepMapping[$templateStep->id];
                        $newDependencyId = $stepMapping[$templateStep->depends_on_step_id] ?? null;
                        
                        if ($newDependencyId) {
                            ManufacturingStep::where('id', $newStepId)
                                ->update(['depends_on_step_id' => $newDependencyId]);
                        }
                    }
                }
                
                // Update routing to reference the template
                $routing->update(['route_template_id' => $template->id]);
            });
            
            return back()->with('success', 'Steps created from template successfully.')
                ->with('openRouteBuilder', true);
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to create steps from template: ' . $e->getMessage());
        }
    }
} 
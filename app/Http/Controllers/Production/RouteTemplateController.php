<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Forms\Form;
use App\Models\Production\ItemCategory;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RouteTemplateController extends Controller
{
    /**
     * Display a listing of route templates.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', [ManufacturingRoute::class, true]); // true indicates template context

        $query = ManufacturingRoute::templates()
            ->with(['itemCategory', 'createdBy'])
            ->withCount('steps')
            ->withCount('derivedRoutes');

        // Search filter
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Category filter
        if ($categoryId = $request->get('category_id')) {
            $query->where('item_category_id', $categoryId);
        }

        // Active filter
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $templates = $query->orderBy('name')->paginate(20);

        // Calculate additional metrics for each template
        $templates->through(function ($template) {
            $template->estimated_time = $template->steps()
                ->sum(DB::raw('COALESCE(setup_time_minutes, 0) + COALESCE(cycle_time_minutes, 0)'));

            $template->last_used_at = $template->derivedRoutes()
                ->latest()
                ->value('created_at');

            return $template;
        });

        return Inertia::render('production/templates/index', [
            'templates' => $templates,
            'categories' => ItemCategory::active()->get(),
            'filters' => $request->only(['search', 'category_id', 'is_active']),
            'can' => [
                'create' => auth()->user()->can('create', [ManufacturingRoute::class, true]),
            ],
        ]);
    }

    /**
     * Show the form for creating a new route template.
     */
    public function create(): Response
    {
        $this->authorize('create', [ManufacturingRoute::class, true]);

        return Inertia::render('production/templates/create', [
            'categories' => ItemCategory::active()->get(),
            'workCells' => WorkCell::where('is_active', true)->get(),
            'stepTypes' => ManufacturingStep::STEP_TYPES,
            'forms' => Form::where('is_active', true)->get(),
        ]);
    }

    /**
     * Store a newly created route template.
     */
    public function store(Request $request)
    {
        $this->authorize('create', [ManufacturingRoute::class, true]);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:manufacturing_routes,name,NULL,id,is_template,1',
            'description' => 'nullable|string',
            'item_category_id' => 'nullable|exists:item_categories,id',
            'steps' => 'required|array|min:1',
            'steps.*.step_number' => 'required|integer|min:1',
            'steps.*.name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.step_type' => 'required|in:standard,quality_check,rework',
            'steps.*.work_cell_id' => 'nullable|exists:work_cells,id',
            'steps.*.form_id' => 'nullable|exists:forms,id',
            'steps.*.setup_time_minutes' => 'required|integer|min:0',
            'steps.*.cycle_time_minutes' => 'required|integer|min:0',
            'steps.*.quality_check_mode' => 'nullable|in:every_part,entire_lot,sampling',
            'steps.*.sampling_size' => 'nullable|integer|min:1',
        ]);

        $template = DB::transaction(function () use ($validated) {
            // Create the template route
            $template = ManufacturingRoute::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'item_category_id' => $validated['item_category_id'] ?? null,
                'is_template' => true,
                'is_active' => true,
                'created_by' => auth()->id(),
            ]);

            // Create template steps
            foreach ($validated['steps'] as $stepData) {
                $template->steps()->create([
                    'step_number' => $stepData['step_number'],
                    'display_order' => $stepData['step_number'] * 10, // For consistency
                    'name' => $stepData['name'],
                    'description' => $stepData['description'] ?? null,
                    'step_type' => $stepData['step_type'],
                    'work_cell_id' => $stepData['work_cell_id'] ?? null,
                    'form_id' => $stepData['form_id'] ?? null,
                    'setup_time_minutes' => $stepData['setup_time_minutes'],
                    'cycle_time_minutes' => $stepData['cycle_time_minutes'],
                    'quality_check_mode' => $stepData['quality_check_mode'] ?? 'every_part',
                    'sampling_size' => $stepData['sampling_size'] ?? null,
                    'is_template' => true,
                ]);
            }

            return $template;
        });

        return redirect()->route('production.templates.show', $template)
            ->with('success', 'Route template created successfully.');
    }

    /**
     * Display the specified route template.
     */
    public function show(ManufacturingRoute $template): Response
    {
        if (! $template->is_template) {
            abort(404);
        }

        $this->authorize('view', $template);

        $template->load([
            'steps.workCell',
            'steps.form',
            'itemCategory',
            'createdBy',
        ]);

        // Get usage statistics
        $usageStats = [
            'total_uses' => $template->derivedRoutes()->count(),
            'active_uses' => $template->derivedRoutes()
                ->whereHas('manufacturingOrder', function ($q) {
                    $q->whereNotIn('status', ['completed', 'cancelled']);
                })
                ->count(),
            'recent_uses' => $template->derivedRoutes()
                ->with(['manufacturingOrder.item', 'createdBy'])
                ->latest()
                ->limit(5)
                ->get(),
        ];

        return Inertia::render('production/templates/show', [
            'template' => $template,
            'usageStats' => $usageStats,
            'workCells' => WorkCell::where('is_active', true)->get(),
            'stepTypes' => ManufacturingStep::STEP_TYPES,
            'forms' => Form::where('is_active', true)->get(),
            'can' => [
                'update' => auth()->user()->can('update', $template),
                'delete' => auth()->user()->can('delete', $template),
                'duplicate' => auth()->user()->can('create', [ManufacturingRoute::class, true]),
            ],
        ]);
    }

    /**
     * Show the form for editing the route template.
     */
    public function edit(ManufacturingRoute $template): Response
    {
        if (! $template->is_template) {
            abort(404);
        }

        $this->authorize('update', $template);

        $template->load(['steps', 'itemCategory']);

        return Inertia::render('production/templates/edit', [
            'template' => $template,
            'categories' => ItemCategory::active()->get(),
            'workCells' => WorkCell::where('is_active', true)->get(),
            'stepTypes' => ManufacturingStep::STEP_TYPES,
            'forms' => Form::where('is_active', true)->get(),
        ]);
    }

    /**
     * Update the specified route template.
     */
    public function update(Request $request, ManufacturingRoute $template)
    {
        if (! $template->is_template) {
            abort(404);
        }

        $this->authorize('update', $template);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:manufacturing_routes,name,' . $template->id . ',id,is_template,1',
            'description' => 'nullable|string',
            'item_category_id' => 'nullable|exists:item_categories,id',
            'is_active' => 'boolean',
        ]);

        $template->update($validated);

        return redirect()->route('production.templates.show', $template)
            ->with('success', 'Template updated successfully.');
    }

    /**
     * Remove the specified route template.
     */
    public function destroy(ManufacturingRoute $template)
    {
        if (! $template->is_template) {
            abort(404);
        }

        $this->authorize('delete', $template);

        // Check if template is in use
        if ($template->derivedRoutes()->exists()) {
            return back()->with('error', 'Cannot delete template that is in use.');
        }

        $template->delete();

        return redirect()->route('production.templates.index')
            ->with('success', 'Template deleted successfully.');
    }

    /**
     * Duplicate a route template.
     */
    public function duplicate(Request $request, ManufacturingRoute $template)
    {
        if (! $template->is_template) {
            abort(404);
        }

        $this->authorize('create', [ManufacturingRoute::class, true]);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:manufacturing_routes,name,NULL,id,is_template,1',
        ]);

        $newTemplate = DB::transaction(function () use ($template, $validated) {
            // Clone the template
            $newTemplate = $template->replicate();
            $newTemplate->name = $validated['name'];
            $newTemplate->created_by = auth()->id();
            $newTemplate->save();

            // Clone all steps
            foreach ($template->steps as $step) {
                $newStep = $step->replicate();
                $newStep->manufacturing_route_id = $newTemplate->id;
                $newStep->save();
            }

            return $newTemplate;
        });

        return redirect()->route('production.templates.show', $newTemplate)
            ->with('success', 'Template duplicated successfully.');
    }

    /**
     * Toggle template active status.
     */
    public function toggleActive(ManufacturingRoute $template)
    {
        if (! $template->is_template) {
            abort(404);
        }

        $this->authorize('update', $template);

        $template->update(['is_active' => ! $template->is_active]);

        return back()->with('success', 'Template status updated.');
    }

    /**
     * Manage template steps.
     */
    public function updateSteps(Request $request, ManufacturingRoute $template)
    {
        if (! $template->is_template) {
            abort(404);
        }

        $this->authorize('update', $template);

        $validated = $request->validate([
            'steps' => 'required|array|min:1',
            'steps.*.id' => 'nullable|exists:manufacturing_steps,id',
            'steps.*.step_number' => 'required|integer|min:1',
            'steps.*.name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.step_type' => 'required|in:standard,quality_check,rework',
            'steps.*.work_cell_id' => 'nullable|exists:work_cells,id',
            'steps.*.form_id' => 'nullable|exists:forms,id',
            'steps.*.setup_time_minutes' => 'required|integer|min:0',
            'steps.*.cycle_time_minutes' => 'required|integer|min:0',
            'steps.*.quality_check_mode' => 'nullable|in:every_part,entire_lot,sampling',
            'steps.*.sampling_size' => 'nullable|integer|min:1',
            'deleted_step_ids' => 'array',
            'deleted_step_ids.*' => 'exists:manufacturing_steps,id',
        ]);

        DB::transaction(function () use ($template, $validated) {
            // Delete removed steps
            if (! empty($validated['deleted_step_ids'])) {
                $template->steps()->whereIn('id', $validated['deleted_step_ids'])->delete();
            }

            // Update or create steps
            foreach ($validated['steps'] as $stepData) {
                if (isset($stepData['id'])) {
                    // Update existing step
                    $template->steps()->where('id', $stepData['id'])->update([
                        'step_number' => $stepData['step_number'],
                        'display_order' => $stepData['step_number'] * 10,
                        'name' => $stepData['name'],
                        'description' => $stepData['description'] ?? null,
                        'step_type' => $stepData['step_type'],
                        'work_cell_id' => $stepData['work_cell_id'] ?? null,
                        'form_id' => $stepData['form_id'] ?? null,
                        'setup_time_minutes' => $stepData['setup_time_minutes'],
                        'cycle_time_minutes' => $stepData['cycle_time_minutes'],
                        'quality_check_mode' => $stepData['quality_check_mode'] ?? 'every_part',
                        'sampling_size' => $stepData['sampling_size'] ?? null,
                    ]);
                } else {
                    // Create new step
                    $template->steps()->create([
                        'step_number' => $stepData['step_number'],
                        'display_order' => $stepData['step_number'] * 10,
                        'name' => $stepData['name'],
                        'description' => $stepData['description'] ?? null,
                        'step_type' => $stepData['step_type'],
                        'work_cell_id' => $stepData['work_cell_id'] ?? null,
                        'form_id' => $stepData['form_id'] ?? null,
                        'setup_time_minutes' => $stepData['setup_time_minutes'],
                        'cycle_time_minutes' => $stepData['cycle_time_minutes'],
                        'quality_check_mode' => $stepData['quality_check_mode'] ?? 'every_part',
                        'sampling_size' => $stepData['sampling_size'] ?? null,
                        'is_template' => true,
                    ]);
                }
            }
        });

        return back()->with('success', 'Template steps updated successfully.');
    }
}

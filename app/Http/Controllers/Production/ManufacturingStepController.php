<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use App\Services\Production\ManufacturingOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ManufacturingStepController extends Controller
{
    protected ManufacturingOrderService $orderService;

    public function __construct(ManufacturingOrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Display a listing of manufacturing steps for a route.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingStep::class);

        $steps = ManufacturingStep::with([
            'manufacturingRoute.productionOrder.item',
            'workCell',
            'form',
            'executions.executedBy',
        ])
        ->when($request->route_id, function ($query, $routeId) {
            $query->where('manufacturing_route_id', $routeId);
        })
        ->when($request->status, function ($query, $status) {
            $query->where('status', $status);
        })
        ->when($request->work_cell_id, function ($query, $workCellId) {
            $query->where('work_cell_id', $workCellId);
        })
        ->orderBy('step_number')
        ->paginate(20)
        ->withQueryString();

        return Inertia::render('Production/Steps/Index', [
            'steps' => $steps,
            'statuses' => ManufacturingStep::STATUSES,
            'stepTypes' => ManufacturingStep::STEP_TYPES,
            'filters' => $request->only(['route_id', 'status', 'work_cell_id']),
        ]);
    }

    /**
     * Display the specified manufacturing step.
     */
    public function show(ManufacturingStep $step)
    {
        $this->authorize('view', $step);

        $step->load([
            'manufacturingRoute.productionOrder.item',
            'workCell',
            'form.currentVersion.tasks',
            'dependency',
            'dependentSteps',
            'executions' => function ($query) {
                $query->with('executedBy')
                    ->orderBy('created_at', 'desc');
            },
        ]);

        // Check if user can execute this step
        $user = auth()->user();
        $canExecute = false;

        if ($user->hasRole('machine-operator')) {
            // Machine operators can only execute steps in their assigned work cells
            $assignedWorkCells = $user->assignedWorkCells()->pluck('id');
            $canExecute = $assignedWorkCells->contains($step->work_cell_id) && 
                         $user->can('production.steps.execute');
        } else {
            $canExecute = $user->can('production.steps.execute');
        }

        return Inertia::render('Production/Steps/Show', [
            'step' => $step,
            'canExecute' => $canExecute && $step->canStart(),
            'qualityCheckModes' => ManufacturingStep::QUALITY_CHECK_MODES,
        ]);
    }

    /**
     * Start execution of a manufacturing step.
     */
    public function execute(Request $request, ManufacturingStep $step)
    {
        $this->authorize('execute', $step);

        $validated = $request->validate([
            'part_number' => 'nullable|integer|min:1',
            'total_parts' => 'nullable|integer|min:1',
        ]);

        try {
            $execution = $this->orderService->executeStep($step, $validated);
            
            return redirect()->route('production.executions.show', $execution)
                ->with('success', 'Step execution started successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Update step status.
     */
    public function updateStatus(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'status' => 'required|in:pending,queued,in_progress,on_hold,completed,skipped',
        ]);

        $step->update($validated);

        return back()->with('success', 'Step status updated successfully.');
    }

    /**
     * Display quality check form for a step.
     */
    public function qualityCheck(ManufacturingStep $step)
    {
        $this->authorize('executeQualityCheck', $step);

        if ($step->step_type !== 'quality_check') {
            return back()->with('error', 'This step is not a quality check.');
        }

        $step->load([
            'manufacturingRoute.productionOrder.item',
            'executions' => function ($query) {
                $query->where('status', 'in_progress')
                    ->orWhere(function ($q) {
                        $q->where('status', 'completed')
                          ->whereNull('quality_result');
                    });
            },
        ]);

        return Inertia::render('Production/Steps/QualityCheck', [
            'step' => $step,
            'pendingExecutions' => $step->executions,
        ]);
    }

    /**
     * Record quality check results.
     */
    public function recordQualityResult(Request $request, ManufacturingStep $step, ManufacturingStepExecution $execution)
    {
        $this->authorize('executeQualityCheck', $step);

        if ($execution->manufacturing_step_id !== $step->id) {
            abort(404);
        }

        $validated = $request->validate([
            'quality_result' => 'required|in:passed,failed',
            'quality_notes' => 'nullable|string|max:1000',
            'failure_action' => 'required_if:quality_result,failed|in:scrap,rework',
        ]);

        try {
            $this->orderService->completeExecution($execution, $validated);

            if ($validated['quality_result'] === 'failed') {
                $this->orderService->handleQualityFailure($execution, $validated['failure_action']);
            }

            return back()->with('success', 'Quality check result recorded successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Display rework handling form.
     */
    public function rework(ManufacturingStep $step)
    {
        $this->authorize('handleRework', $step);

        if ($step->step_type !== 'rework') {
            return back()->with('error', 'This step is not a rework step.');
        }

        $step->load([
            'dependency' => function ($query) {
                $query->with('executions' => function ($q) {
                    $q->where('quality_result', 'failed')
                      ->where('failure_action', 'rework');
                });
            },
        ]);

        return Inertia::render('Production/Steps/Rework', [
            'step' => $step,
            'failedExecutions' => $step->dependency->executions,
        ]);
    }
}
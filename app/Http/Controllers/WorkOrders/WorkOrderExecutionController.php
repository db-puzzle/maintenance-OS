<?php

namespace App\Http\Controllers\WorkOrders;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkOrderExecutionResource;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderExecution;
use App\Services\WorkOrders\WorkOrderExecutionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class WorkOrderExecutionController extends Controller
{
    public function __construct(
        private WorkOrderExecutionService $service
    ) {
    }

    /**
     * Show execution interface
     */
    public function show(WorkOrder $workOrder)
    {
        Gate::authorize('execute', $workOrder);
        
        $workOrder->load([
            'asset',
            'type',
            'form',
            'formVersion.tasks.instructions',
            'execution.taskResponses.attachments',
        ]);
        
        // Start execution if not started
        if (!$workOrder->execution) {
            $execution = $this->service->startExecution($workOrder, auth()->user());
        } else {
            $execution = $workOrder->execution;
        }
        
        return Inertia::render('WorkOrders/Execute', [
            'workOrder' => $workOrder,
            'execution' => new WorkOrderExecutionResource($execution),
            'statistics' => $this->service->getExecutionStats($execution),
        ]);
    }

    /**
     * Start execution
     */
    public function start(WorkOrder $workOrder)
    {
        Gate::authorize('execute', $workOrder);
        
        $execution = $this->service->startExecution($workOrder, auth()->user());
        
        if (request()->wantsJson()) {
            return new WorkOrderExecutionResource($execution);
        }
        
        return redirect()->route('work-orders.execution.show', $workOrder)
            ->with('success', 'Work order execution started.');
    }

    /**
     * Submit task response
     */
    public function submitTask(Request $request, WorkOrderExecution $execution)
    {
        Gate::authorize('execute', $execution->workOrder);
        
        $validated = $request->validate([
            'task_id' => 'required|exists:form_tasks,id',
            'response' => 'required',
            'response_data' => 'nullable|array',
        ]);
        
        $this->service->submitTaskResponse(
            $execution,
            $validated['task_id'],
            $validated['response'],
            $validated['response_data'] ?? null
        );
        
        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Task response submitted successfully.',
                'statistics' => $this->service->getExecutionStats($execution),
            ]);
        }
        
        return back()->with('success', 'Task response submitted.');
    }

    /**
     * Pause execution
     */
    public function pause(WorkOrderExecution $execution)
    {
        Gate::authorize('execute', $execution->workOrder);
        
        $this->service->pauseExecution($execution);
        
        if (request()->wantsJson()) {
            return new WorkOrderExecutionResource($execution->fresh());
        }
        
        return back()->with('success', 'Execution paused.');
    }

    /**
     * Resume execution
     */
    public function resume(WorkOrderExecution $execution)
    {
        Gate::authorize('execute', $execution->workOrder);
        
        $this->service->resumeExecution($execution);
        
        if (request()->wantsJson()) {
            return new WorkOrderExecutionResource($execution->fresh());
        }
        
        return back()->with('success', 'Execution resumed.');
    }

    /**
     * Complete execution
     */
    public function complete(Request $request, WorkOrderExecution $execution)
    {
        Gate::authorize('execute', $execution->workOrder);
        
        $validated = $request->validate([
            'work_performed' => 'required|string',
            'observations' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'follow_up_required' => 'boolean',
            'follow_up_description' => 'required_if:follow_up_required,true|string',
            'safety_checks_completed' => 'boolean',
            'quality_checks_completed' => 'boolean',
            'area_cleaned' => 'boolean',
            'tools_returned' => 'boolean',
        ]);
        
        try {
            $this->service->completeExecution($execution, $validated);
            
            if ($request->wantsJson()) {
                return response()->json([
                    'message' => 'Work order completed successfully.',
                    'work_order' => $execution->workOrder->fresh(),
                ]);
            }
            
            return redirect()->route('work-orders.show', $execution->workOrder)
                ->with('success', 'Work order completed successfully.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Get execution progress
     */
    public function progress(WorkOrderExecution $execution)
    {
        Gate::authorize('view', $execution->workOrder);
        
        return response()->json([
            'statistics' => $this->service->getExecutionStats($execution),
            'execution' => new WorkOrderExecutionResource($execution),
        ]);
    }
}
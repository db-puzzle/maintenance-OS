<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use App\Services\Production\ManufacturingStepExecutionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StepExecutionController extends Controller
{
    protected ManufacturingStepExecutionService $executionService;

    public function __construct(ManufacturingStepExecutionService $executionService)
    {
        $this->executionService = $executionService;
    }

    /**
     * Get the execution status for all steps in an order.
     */
    public function getOrderStepStatus(ManufacturingOrder $order)
    {
        $this->authorize('view', $order);

        // Load the route with steps and their executions
        $order->load([
            'manufacturingRoute.steps' => function ($query) {
                $query->with([
                    'workCell',
                    'executions' => function ($q) {
                        $q->orderBy('created_at', 'desc');
                    },
                    'dependency',
                    'dependentSteps',
                ]);
            },
        ]);

        // For each step, determine if it can be started
        $steps = $order->manufacturingRoute->steps->map(function ($step) {
            // Log step status for debugging
            \Log::info('Step status check', [
                'step_id' => $step->id,
                'step_name' => $step->name,
                'status' => $step->status,
                'depends_on_step_id' => $step->depends_on_step_id,
            ]);

            // For pending steps, check if they should be moved to queued
            if ($step->status === 'pending' && $step->canStart()) {
                $step->moveToQueued();
                \Log::info('Moved step to queued', ['step_id' => $step->id]);
            }

            $step->can_start = $step->canStart();

            // Add dependency information
            if ($step->depends_on_step_id) {
                $dependencyInfo = $this->getDependencyInfo($step);
                $step->dependency_info = $dependencyInfo;
            }

            // Get current active execution if any
            $activeExecution = $step->executions->firstWhere('status', 'in_progress');
            if ($activeExecution) {
                $step->active_execution = $activeExecution;
            }

            return $step;
        });

        return response()->json([
            'order' => $order,
            'steps' => $steps,
        ]);
    }

    /**
     * Start execution of a manufacturing step.
     */
    public function startStep(ManufacturingStep $step)
    {
        $this->authorize('execute', $step);

        // Log step details for debugging
        \Log::info('Attempting to start step', [
            'step_id' => $step->id,
            'step_name' => $step->name,
            'status' => $step->status,
            'canStart' => $step->canStart(),
        ]);

        // Validate that step can be started
        if (! $step->canStart()) {
            return response()->json([
                'message' => 'Step cannot be started. Dependencies not met.',
                'dependency_info' => $this->getDependencyInfo($step),
            ], 422);
        }

        // Also check if step is in the right status
        if (! in_array($step->status, ['queued', 'in_progress'])) {
            return response()->json([
                'message' => 'Step must be in queued status to start.',
                'current_status' => $step->status,
            ], 422);
        }

        // Check if there's already an active execution
        $activeExecution = $step->executions()->whereIn('status', ['in_progress', 'on_hold'])->first();
        if ($activeExecution) {
            return response()->json([
                'message' => 'Step already has an active execution.',
                'execution' => $activeExecution,
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Create new execution
            $execution = new ManufacturingStepExecution([
                'manufacturing_step_id' => $step->id,
                'manufacturing_order_id' => $step->manufacturingRoute->manufacturing_order_id,
                'status' => 'in_progress',
                'started_at' => now(),
                'executed_by' => auth()->id(),
                'work_cell_id' => $step->work_cell_id,
                'quantity_completed' => 0,
                'quantity_scrapped' => 0,
            ]);
            $execution->save();

            // Update step status
            $step->update([
                'status' => 'in_progress',
                'actual_start_time' => $step->actual_start_time ?? now(),
            ]);

            // Update order status if this is the first step being started
            $order = $step->manufacturingRoute->manufacturingOrder;
            if ($order->status === 'released') {
                $order->update([
                    'status' => 'in_progress',
                    'actual_start_date' => now(),
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Step execution started successfully.',
                'execution' => $execution->load('manufacturingStep.workCell'),
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json([
                'message' => 'Failed to start step execution.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Report progress on a step execution.
     */
    public function reportProgress(ManufacturingStepExecution $execution, Request $request)
    {
        $this->authorize('update', $execution);

        // Validate execution is active
        if (! in_array($execution->status, ['in_progress', 'on_hold'])) {
            return response()->json([
                'message' => 'Cannot report progress on a completed or cancelled execution.',
            ], 422);
        }

        $validated = $request->validate([
            'quantity_completed' => 'required|integer|min:0',
            'quantity_scrapped' => 'nullable|integer|min:0',
            'scrap_reason' => 'required_if:quantity_scrapped,>,0|nullable|string',
            'time_spent' => 'nullable|string',
            'notes' => 'nullable|string',
            'mark_complete' => 'boolean',
            // Quality check fields
            'quality_result' => 'nullable|in:passed,failed',
            'quality_notes' => 'nullable|string',
            'failure_action' => 'required_if:quality_result,failed|nullable|in:scrap,rework',
        ]);

        DB::beginTransaction();
        try {
            $step = $execution->manufacturingStep;
            $order = $execution->manufacturingOrder;

            // Validate quantities don't exceed order limits
            $totalReported = $step->cumulative_quantity_completed + $step->cumulative_quantity_scrapped +
                           $validated['quantity_completed'] + ($validated['quantity_scrapped'] ?? 0);

            if ($totalReported > $order->quantity) {
                return response()->json([
                    'message' => 'Reported quantities exceed order quantity.',
                    'max_remaining' => $order->quantity - $step->cumulative_quantity_completed - $step->cumulative_quantity_scrapped,
                ], 422);
            }

            // Update execution quantities
            $execution->increment('quantity_completed', $validated['quantity_completed']);
            if (! empty($validated['quantity_scrapped'])) {
                $execution->increment('quantity_scrapped', $validated['quantity_scrapped']);
            }

            // Update step cumulative quantities
            $step->updateCumulativeQuantities($validated['quantity_completed'], $validated['quantity_scrapped'] ?? 0);

            // Handle quality check results if provided
            if ($step->step_type === 'quality_check' && isset($validated['quality_result'])) {
                $execution->update([
                    'quality_result' => $validated['quality_result'],
                    'quality_notes' => $validated['quality_notes'] ?? null,
                    'failure_action' => $validated['failure_action'] ?? null,
                ]);
            }

            // Check if we should complete the execution
            $shouldComplete = $validated['mark_complete'] ?? false;

            // Auto-complete if all quantities are reported
            if (! $shouldComplete && $step->isLastStep()) {
                $totalStepReported = $step->cumulative_quantity_completed + $step->cumulative_quantity_scrapped;
                if ($totalStepReported >= $order->quantity) {
                    $shouldComplete = true;
                }
            }

            if ($shouldComplete) {
                $this->completeExecution($execution);
            }

            // Log the activity
            activity()
                ->performedOn($execution)
                ->causedBy(auth()->user())
                ->withProperties([
                    'quantity_completed' => $validated['quantity_completed'],
                    'quantity_scrapped' => $validated['quantity_scrapped'] ?? 0,
                    'notes' => $validated['notes'] ?? null,
                ])
                ->log('Progress reported on step execution');

            DB::commit();

            // Reload relationships for response
            $execution->load('manufacturingStep.workCell', 'manufacturingOrder');

            return response()->json([
                'message' => 'Progress reported successfully.',
                'execution' => $execution,
                'step' => $step->fresh(),
                'order' => $order->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json([
                'message' => 'Failed to report progress.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Complete a step execution.
     */
    public function completeStep(ManufacturingStepExecution $execution, Request $request)
    {
        $this->authorize('update', $execution);

        if ($execution->status === 'completed') {
            return response()->json([
                'message' => 'Execution is already completed.',
            ], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
            'actual_setup_time' => 'nullable|integer|min:0',
            'actual_cycle_time' => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $this->completeExecution($execution, $validated);

            DB::commit();

            return response()->json([
                'message' => 'Step execution completed successfully.',
                'execution' => $execution->fresh(['manufacturingStep', 'manufacturingOrder']),
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json([
                'message' => 'Failed to complete step execution.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Complete an execution and handle downstream effects.
     */
    protected function completeExecution(ManufacturingStepExecution $execution, array $data = [])
    {
        $step = $execution->manufacturingStep;

        // Update execution
        $execution->update([
            'status' => 'completed',
            'completed_at' => now(),
            'notes' => $data['notes'] ?? $execution->notes,
        ]);

        // Update step status
        $step->update([
            'status' => 'completed',
            'actual_end_time' => now(),
        ]);

        // Check and activate next steps
        $step->checkNextStepActivation();

        // If this is the last step, check if order should be completed
        if ($step->isLastStep()) {
            $order = $step->manufacturingRoute->manufacturingOrder;
            $allStepsComplete = $step->manufacturingRoute->steps()
                ->where('status', '!=', 'completed')
                ->where('status', '!=', 'skipped')
                ->doesntExist();

            if ($allStepsComplete) {
                // Update order quantities from last step
                $order->update([
                    'quantity_completed' => $step->cumulative_quantity_completed,
                    'quantity_scrapped' => $step->cumulative_quantity_scrapped,
                    'status' => 'completed',
                    'actual_end_date' => now(),
                ]);
            }
        }
    }

    /**
     * Get dependency information for a step.
     */
    protected function getDependencyInfo(ManufacturingStep $step): ?string
    {
        if (! $step->depends_on_step_id) {
            return null;
        }

        $dependency = $step->dependency;

        switch ($step->dependency_start_condition) {
            case 'quantity_based':
                $remaining = $step->dependency_minimum_quantity - $dependency->cumulative_quantity_completed;
                if ($remaining > 0) {
                    return "Waiting for Step {$dependency->step_number} to complete {$remaining} more units";
                }
                break;

            case 'percentage_based':
                $currentPercentage = ($dependency->cumulative_quantity_completed / $dependency->manufacturingRoute->manufacturingOrder->quantity) * 100;
                $remainingPercentage = $step->dependency_minimum_percentage - $currentPercentage;
                if ($remainingPercentage > 0) {
                    return "Waiting for Step {$dependency->step_number} to reach " . number_format($remainingPercentage, 1) . '% more completion';
                }
                break;

            case 'completed':
                if ($dependency->status !== 'completed') {
                    return "Waiting for Step {$dependency->step_number} to be fully completed";
                }
                break;

            case 'immediate':
                // Should already be able to start
                break;
        }

        // Check child order dependencies
        if ($step->child_order_dependency_type !== 'none') {
            $order = $step->manufacturingRoute->manufacturingOrder;

            switch ($step->child_order_dependency_type) {
                case 'all_children_completed':
                    $incompleteCount = $order->children()->where('status', '!=', 'completed')->count();
                    if ($incompleteCount > 0) {
                        return "Waiting for {$incompleteCount} child orders to be completed";
                    }
                    break;

                case 'children_quantity':
                    $childrenCompleted = $order->children()->sum('quantity_completed');
                    $remaining = $step->child_order_minimum_quantity - $childrenCompleted;
                    if ($remaining > 0) {
                        return "Waiting for {$remaining} more units from child orders";
                    }
                    break;
            }
        }

        return null;
    }
}

<?php

namespace App\Observers;

use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ManufacturingStepExecutionObserver
{
    /**
     * Handle the ManufacturingStepExecution "created" event.
     */
    public function created(ManufacturingStepExecution $execution): void
    {
        // When execution starts, check gate conditions
        $this->checkGateConditionsForProgress($execution);
    }

    /**
     * Handle the ManufacturingStepExecution "updated" event.
     */
    public function updated(ManufacturingStepExecution $execution): void
    {
        // Check gate conditions on quantity updates
        if ($execution->isDirty(['quantity_completed', 'quantity_scrapped'])) {
            $this->checkGateConditionsForProgress($execution);
        }

        // Handle execution completion
        if ($execution->isDirty('status') && $execution->status === 'completed') {
            $this->handleExecutionCompleted($execution);
        }
    }

    /**
     * Check gate conditions based on execution progress.
     */
    protected function checkGateConditionsForProgress(ManufacturingStepExecution $execution): void
    {
        $step = $execution->manufacturingStep;

        if (! $step) {
            return;
        }

        // Check if any steps depend on this one with progressive flow conditions
        $step->dependentSteps()
            ->where('status', 'pending')
            ->whereIn('dependency_start_condition', ['quantity_based', 'percentage_based', 'immediate'])
            ->with(['manufacturingRoute.manufacturingOrder'])
            ->each(function ($dependentStep) use ($step) {
                // Only process if the order is active
                $order = $dependentStep->manufacturingRoute->manufacturingOrder;
                if (! in_array($order->status, ['released', 'in_progress'])) {
                    return;
                }

                if ($this->meetsGateRequirements($step, $dependentStep)) {
                    DB::transaction(function () use ($dependentStep) {
                        $dependentStep->moveToQueued();

                        Log::info('Execution observer queued step based on gate progress', [
                            'step_id' => $dependentStep->id,
                            'step_name' => $dependentStep->name,
                            'order_id' => $dependentStep->manufacturingRoute->manufacturing_order_id,
                            'trigger' => 'execution_progress',
                        ]);
                    });
                }
            });
    }

    /**
     * Check if gate requirements are met.
     */
    protected function meetsGateRequirements($currentStep, $dependentStep): bool
    {
        switch ($dependentStep->dependency_start_condition) {
            case 'immediate':
                // For immediate dependencies, check if step is in progress
                return $currentStep->status === 'in_progress';

            case 'quantity_based':
                // Check if minimum quantity has been completed
                return $currentStep->cumulative_quantity_completed >=
                       ($dependentStep->dependency_minimum_quantity ?? 0);

            case 'percentage_based':
                // Calculate percentage of order quantity completed
                $order = $currentStep->manufacturingRoute->manufacturingOrder;
                if ($order->quantity <= 0) {
                    return false;
                }

                $percentage = ($currentStep->cumulative_quantity_completed / $order->quantity) * 100;

                return $percentage >= ($dependentStep->dependency_minimum_percentage ?? 0);

            case 'completed':
            default:
                // Traditional completion dependency
                return in_array($currentStep->status, ['completed', 'skipped']);
        }
    }

    /**
     * Handle execution completion.
     *
     * This method provides a safety net to ensure that:
     * 1. Dependent steps are checked and queued
     * 2. Manufacturing order status is updated if all steps are complete
     * 3. Parent orders are notified when child orders complete
     */
    protected function handleExecutionCompleted(ManufacturingStepExecution $execution): void
    {
        $step = $execution->manufacturingStep;

        if (! $step) {
            return;
        }

        // Note: Cumulative quantities are already updated in ManufacturingStepExecutionService
        // No need to update them again here - the service layer handles quantity updates

        // Check if this completion affects any dependent steps
        $step->dependentSteps()
            ->where('status', 'pending')
            ->where('dependency_start_condition', 'completed')
            ->with(['manufacturingRoute.manufacturingOrder'])
            ->each(function ($dependentStep) {
                $order = $dependentStep->manufacturingRoute->manufacturingOrder;
                if (in_array($order->status, ['released', 'in_progress'])) {
                    if ($dependentStep->canStart()) {
                        DB::transaction(function () use ($dependentStep) {
                            $dependentStep->moveToQueued();

                            Log::info('Execution observer queued step after execution completion', [
                                'step_id' => $dependentStep->id,
                                'step_name' => $dependentStep->name,
                                'order_id' => $dependentStep->manufacturingRoute->manufacturing_order_id,
                                'trigger' => 'execution_completed',
                            ]);
                        });
                    }
                }
            });

        // Safety check: Verify MO completion if this was the last step
        // This acts as a fallback in case the step->complete() chain was somehow broken
        $this->verifyOrderCompletionStatus($step);
    }

    /**
     * Verify that manufacturing order is properly completed when all steps are done.
     *
     * This is a safety net that ensures the MO status is updated even if
     * the normal completion flow fails for any reason.
     */
    protected function verifyOrderCompletionStatus(ManufacturingStep $step): void
    {
        // Only check if this step has a route and order
        if (! $step->manufacturingRoute || ! $step->manufacturingRoute->manufacturingOrder) {
            return;
        }

        $route = $step->manufacturingRoute;
        $order = $route->manufacturingOrder;

        // Check if all steps in the route are completed
        $allStepsCompleted = $route->allStepsCompleted();

        // If all steps are complete but order is not, fix it
        if ($allStepsCompleted && $order->status !== 'completed') {
            Log::warning('Observer safety net: Completing order with all steps done', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'step_id' => $step->id,
                'step_name' => $step->name,
                'trigger' => 'execution_observer_safety_check',
            ]);

            DB::transaction(function () use ($order) {
                $order->update([
                    'status' => 'completed',
                    'actual_end_date' => now(),
                    'quantity_completed' => $order->quantity,
                ]);

                // Notify parent order if this child is now complete
                if ($order->parent) {
                    $order->parent->incrementCompletedChildren();
                }
            });
        }
    }
}

<?php

namespace App\Observers;

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
        
        if (!$step) {
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
                if (!in_array($order->status, ['released', 'in_progress'])) {
                    return;
                }
                
                if ($this->meetsGateRequirements($step, $dependentStep)) {
                    DB::transaction(function () use ($dependentStep) {
                        $dependentStep->moveToQueued();
                        
                        Log::info('Execution observer queued step based on gate progress', [
                            'step_id' => $dependentStep->id,
                            'step_name' => $dependentStep->name,
                            'order_id' => $dependentStep->manufacturingRoute->manufacturing_order_id,
                            'trigger' => 'execution_progress'
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
     */
    protected function handleExecutionCompleted(ManufacturingStepExecution $execution): void
    {
        $step = $execution->manufacturingStep;
        
        if (!$step) {
            return;
        }
        
        // Update step cumulative quantities
        $step->updateCumulativeQuantities();
        
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
                                'trigger' => 'execution_completed'
                            ]);
                        });
                    }
                }
            });
    }
}

<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use Illuminate\Support\Facades\DB;

class ManufacturingStepExecutionService
{
    /**
     * Execute manufacturing order - handles both routed and non-routed execution.
     */
    public function executeOrder(ManufacturingOrder $order, array $data): void
    {
        // Check if order has route with steps
        $hasSteps = $order->manufacturingRoute && $order->manufacturingRoute->steps()->exists();

        if ($hasSteps) {
            // Execute through steps
            $this->executeNextStep($order, $data);
        } else {
            // Execute as simple production report
            $this->executeWithoutSteps($order, $data);
        }
    }

    /**
     * Execute order without steps (legacy behavior).
     */
    protected function executeWithoutSteps(ManufacturingOrder $order, array $data): void
    {
        // Validate
        if (! $order->canReportProduction()) {
            throw new \Exception('Cannot report production on this order');
        }

        DB::transaction(function () use ($order, $data) {
            // Update quantities
            $order->increment('quantity_completed', $data['quantity_completed']);

            if (isset($data['quantity_scrapped'])) {
                $order->increment('quantity_scrapped', $data['quantity_scrapped']);
            }

            // Update status
            if ($order->status === 'released') {
                $order->update([
                    'status' => 'in_progress',
                    'actual_start_date' => now(),
                ]);
            }

            // Check completion
            if ($order->quantity_completed >= $order->quantity) {
                $order->update([
                    'status' => 'completed',
                    'actual_end_date' => now(),
                ]);

                // Update parent
                if ($order->parent) {
                    $order->parent->checkAutoCompletion();
                }
            }

            // Log activity
            activity()
                ->performedOn($order)
                ->causedBy(auth()->user())
                ->withProperties($data)
                ->log('Direct production execution (no route steps)');
        });
    }

    /**
     * Execute the next available step for an order.
     */
    protected function executeNextStep(ManufacturingOrder $order, array $data): ManufacturingStepExecution
    {
        // Find the next executable step
        $step = $order->manufacturingRoute->steps()
            ->where('status', 'queued')
            ->orderBy('display_order')
            ->first();

        if (! $step) {
            // No queued steps, find first pending step that can start
            $step = $order->manufacturingRoute->steps()
                ->where('status', 'pending')
                ->orderBy('display_order')
                ->first();

            if ($step && $step->canStart()) {
                $step->moveToQueued();
            } else {
                throw new \Exception('No steps available for execution');
            }
        }

        return $this->executeStep($step, $data);
    }

    /**
     * Execute a specific manufacturing step.
     */
    public function executeStep(ManufacturingStep $step, array $data): ManufacturingStepExecution
    {
        // Validate step can be started
        if (! $step->canStart()) {
            throw new \Exception('Step dependencies not met');
        }

        // Handle different execution modes for quality checks
        if ($step->step_type === 'quality_check') {
            return $this->executeQualityCheck($step, $data);
        }

        // Standard step execution
        $execution = $step->startExecution(
            $data['part_number'] ?? null,
            $data['total_parts'] ?? null
        );

        // If this is the first started step, mark order as in_progress
        $order = $step->manufacturingRoute->manufacturingOrder;
        if (in_array($order->status, ['released', 'planned'])) {
            $order->update([
                'status' => 'in_progress',
                'actual_start_date' => $order->actual_start_date ?? now(),
            ]);
        }

        // Execute associated form if exists
        if ($step->form_id && isset($data['form_data'])) {
            $this->executeStepForm($execution, $step, $data['form_data']);
        }

        return $execution;
    }

    /**
     * Execute quality check step.
     */
    protected function executeQualityCheck(ManufacturingStep $step, array $data): ManufacturingStepExecution
    {
        $productionQuantity = $step->manufacturingRoute->manufacturingOrder->quantity;
        $executions = [];

        switch ($step->quality_check_mode) {
            case 'every_part':
                // Create execution for each part
                for ($i = 1; $i <= $productionQuantity; $i++) {
                    $executions[] = $step->startExecution($i, $productionQuantity);
                }
                break;

            case 'entire_lot':
                // Single execution for entire lot
                $executions[] = $step->startExecution(null, $productionQuantity);
                break;

            case 'sampling':
                // Calculate sample size using ISO 2859
                $sampleSize = $this->calculateSampleSize($productionQuantity, $step->sampling_size);
                for ($i = 1; $i <= $sampleSize; $i++) {
                    $executions[] = $step->startExecution($i, $sampleSize);
                }
                break;
        }

        return $executions[0] ?? null; // Return first execution
    }

    /**
     * Execute form associated with step.
     */
    protected function executeStepForm(ManufacturingStepExecution $execution, ManufacturingStep $step, array $formData): void
    {
        // This would integrate with the forms module
        // For now, just log the data
        activity()
            ->performedOn($execution)
            ->causedBy(auth()->user())
            ->withProperties(['form_data' => $formData])
            ->log('Step form executed');
    }

    /**
     * Calculate sample size based on ISO 2859.
     */
    protected function calculateSampleSize(int $lotSize, ?int $specifiedSize): int
    {
        if ($specifiedSize) {
            return min($specifiedSize, $lotSize);
        }

        // Simplified ISO 2859 sampling sizes
        // In production, use proper ISO 2859 tables
        if ($lotSize <= 8) {
            return $lotSize;
        }
        if ($lotSize <= 15) {
            return 5;
        }
        if ($lotSize <= 25) {
            return 8;
        }
        if ($lotSize <= 50) {
            return 13;
        }
        if ($lotSize <= 90) {
            return 20;
        }
        if ($lotSize <= 150) {
            return 32;
        }
        if ($lotSize <= 280) {
            return 50;
        }
        if ($lotSize <= 500) {
            return 80;
        }

        return 125; // For larger lots
    }

    /**
     * Complete a step execution.
     */
    public function completeStepExecution(ManufacturingStepExecution $execution, array $data): void
    {
        DB::transaction(function () use ($execution, $data) {
            // Update execution
            $execution->update([
                'status' => 'completed',
                'completed_at' => now(),
                'quality_result' => $data['quality_result'] ?? null,
                'quality_notes' => $data['quality_notes'] ?? null,
            ]);

            // Update step
            $step = $execution->manufacturingStep;

            // Check if all executions for this step are complete
            $pendingExecutions = ManufacturingStepExecution::where('manufacturing_step_id', $step->id)
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->exists();

            if (! $pendingExecutions) {
                // All executions complete, update step status
                $step->update([
                    'status' => 'completed',
                    'actual_end_time' => now(),
                ]);

                // Update order progress
                $this->updateOrderProgress($step->manufacturingRoute->manufacturingOrder);

                // Queue next steps
                $this->queueNextSteps($step);
            }
        });
    }

    /**
     * Update order progress based on completed steps.
     */
    protected function updateOrderProgress(ManufacturingOrder $order): void
    {
        $route = $order->manufacturingRoute;
        if (! $route) {
            return;
        }

        // Check if all steps are completed
        if ($route->allStepsCompleted()) {
            $order->update([
                'status' => 'completed',
                'actual_end_date' => now(),
                'quantity_completed' => $order->quantity,
            ]);

            // Check parent auto-completion
            if ($order->parent) {
                $order->parent->checkAutoCompletion();
            }
        }
    }

    /**
     * Queue next steps after completing a step.
     */
    protected function queueNextSteps(ManufacturingStep $completedStep): void
    {
        // Find steps that depend on this completed step
        $dependentSteps = $completedStep->manufacturingRoute->steps()
            ->where('depends_on_step_id', $completedStep->id)
            ->where('status', 'pending')
            ->get();

        foreach ($dependentSteps as $step) {
            if ($step->canStart()) {
                $step->moveToQueued();
            }
        }
    }

    /**
     * Handle quality check failure.
     */
    public function handleQualityFailure(ManufacturingStepExecution $execution, string $action): void
    {
        $execution->update([
            'failure_action' => $action,
            'quality_result' => 'failed',
        ]);

        if ($action === 'rework') {
            // Create rework step if doesn't exist
            $reworkStep = $execution->manufacturingStep->manufacturingRoute->steps()
                ->where('step_type', 'rework')
                ->where('depends_on_step_id', $execution->manufacturing_step_id)
                ->first();

            if (! $reworkStep) {
                $reworkStep = $this->createReworkStep($execution->manufacturingStep);
            }

            // Queue rework step
            $reworkStep->update(['status' => 'queued']);
        } else {
            // Scrap - update production order quantity
            $order = $execution->manufacturingOrder;
            $order->increment('quantity_scrapped', 1);
        }
    }

    /**
     * Create a rework step for failed quality check.
     */
    protected function createReworkStep(ManufacturingStep $failedStep): ManufacturingStep
    {
        $maxDisplayOrder = $failedStep->manufacturingRoute->steps()->max('display_order');

        return $failedStep->manufacturingRoute->steps()->create([
            'display_order' => $maxDisplayOrder + 10,
            'step_type' => 'rework',
            'name' => "Rework for {$failedStep->name}",
            'description' => "Rework step for failed quality check on {$failedStep->name}",
            'work_cell_id' => $failedStep->work_cell_id,
            'cycle_time_minutes' => $failedStep->cycle_time_minutes * 2, // Estimate
            'depends_on_step_id' => $failedStep->id,
            'status' => 'pending',
        ]);
    }
}

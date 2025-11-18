<?php

namespace App\Observers;

use App\Jobs\Production\UpdateSmartProgress;
use App\Models\Production\ManufacturingStep;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ManufacturingStepObserver
{
    /**
     * Handle the ManufacturingStep "created" event.
     */
    public function created(ManufacturingStep $step): void
    {
        // When a new step is added, recalculate progress
        $order = $step->manufacturingRoute?->manufacturingOrder;

        if ($order) {
            $order->invalidateSmartProgress();

            UpdateSmartProgress::dispatch($order)
                ->delay(now()->addSeconds(10))
                ->onQueue('low');

            // When a step is created on a released/in_progress order, check if it can be queued
            if (in_array($order->status, ['released', 'in_progress'])) {
                if ($step->canStart()) {
                    DB::transaction(function () use ($step) {
                        $step->moveToQueued();

                        Log::info('Step observer queued step on creation', [
                            'step_id' => $step->id,
                            'step_name' => $step->name,
                            'order_id' => $step->manufacturingRoute->manufacturing_order_id,
                            'order_status' => $step->manufacturingRoute->manufacturingOrder->status,
                            'trigger' => 'step_created',
                        ]);
                    });
                }
            }
        }
    }

    /**
     * Handle the ManufacturingStep "updated" event.
     */
    public function updated(ManufacturingStep $step): void
    {
        // Check if cumulative quantities changed
        if ($step->wasChanged(['cumulative_quantity_completed', 'cumulative_quantity_scrapped', 'status'])) {
            // Get the manufacturing order through the route
            $order = $step->manufacturingRoute->manufacturingOrder;

            if ($order) {
                // Invalidate and queue progress update
                $order->invalidateSmartProgress();

                UpdateSmartProgress::dispatch($order)
                    ->delay(now()->addSeconds(5))
                    ->onQueue('low');
            }
        }

        // Check if this update affects dependent steps
        if ($this->affectsDependencies($step)) {
            $this->checkDependentSteps($step);
        }

        // Check if gate conditions changed and need re-evaluation
        if ($this->gateConditionsChanged($step)) {
            $this->recheckGateConditions($step);
        }
    }

    /**
     * Check if the step update affects dependencies.
     */
    protected function affectsDependencies(ManufacturingStep $step): bool
    {
        return $step->wasChanged([
            'status',
            'cumulative_quantity_completed',
            'cumulative_quantity_scrapped',
            'depends_on_step_id',
            'dependency_start_condition',
            'dependency_minimum_quantity',
            'dependency_minimum_percentage',
        ]);
    }

    /**
     * Check if gate conditions changed.
     */
    protected function gateConditionsChanged(ManufacturingStep $step): bool
    {
        return $step->wasChanged([
            'dependency_start_condition',
            'dependency_minimum_quantity',
            'dependency_minimum_percentage',
        ]);
    }

    /**
     * Check and potentially queue dependent steps.
     */
    protected function checkDependentSteps(ManufacturingStep $step): void
    {
        // Only check if the step is in a state that could allow dependencies to proceed
        if (! in_array($step->status, ['in_progress', 'awaiting_quality', 'completed', 'skipped'])) {
            return;
        }

        // Check steps that depend on this one
        // Load necessary relationships for canStart() checks
        $step->dependentSteps()
            ->where('status', 'pending')
            ->with([
                'manufacturingRoute.manufacturingOrder',
                'dependency', // Load the dependency step for step dependency checks
            ])
            ->each(function ($dependentStep) {
                // Only queue if parent order is active
                $order = $dependentStep->manufacturingRoute->manufacturingOrder;
                if (in_array($order->status, ['released', 'in_progress'])) {
                    // Refresh the dependent step to ensure fresh data
                    $dependentStep->refresh();

                    if ($dependentStep->canStart()) {
                        DB::transaction(function () use ($dependentStep) {
                            $dependentStep->moveToQueued();
                        });
                    }
                }
            });
    }

    /**
     * Re-check gate conditions when they change.
     */
    protected function recheckGateConditions(ManufacturingStep $step): void
    {
        // If this step is pending and has dependencies, re-check if it can now start
        if ($step->status === 'pending' && $step->depends_on_step_id) {
            $order = $step->manufacturingRoute->manufacturingOrder;
            if (in_array($order->status, ['released', 'in_progress']) && $step->canStart()) {
                DB::transaction(function () use ($step) {
                    $step->moveToQueued();

                    Log::info('Step observer queued step after gate condition change', [
                        'step_id' => $step->id,
                        'step_name' => $step->name,
                        'order_id' => $step->manufacturingRoute->manufacturing_order_id,
                        'trigger' => 'gate_condition_change',
                    ]);
                });
            }
        }
    }

    /**
     * Handle the ManufacturingStep "deleted" event.
     */
    public function deleted(ManufacturingStep $step): void
    {
        // When a step is deleted, recalculate progress
        $order = $step->manufacturingRoute->manufacturingOrder ?? null;

        if ($order) {
            $order->invalidateSmartProgress();

            UpdateSmartProgress::dispatch($order)
                ->delay(now()->addSeconds(5))
                ->onQueue('low');
        }
    }
}

<?php

namespace App\Observers;

use App\Jobs\Production\UpdateSmartProgress;
use App\Models\Production\ManufacturingOrder;
use Illuminate\Support\Facades\DB;

class ManufacturingOrderObserver
{
    /**
     * Handle the ManufacturingOrder "created" event.
     */
    public function created(ManufacturingOrder $order): void
    {
        // Calculate initial smart progress for new orders
        if ($order->status !== 'draft') {
            UpdateSmartProgress::dispatch($order)
                ->delay(now()->addSeconds(10))
                ->onQueue('low');
        }
    }

    /**
     * Handle the ManufacturingOrder "updated" event.
     */
    public function updated(ManufacturingOrder $order): void
    {
        // Check if quantity or status changed
        if ($order->wasChanged(['quantity', 'quantity_completed', 'status'])) {
            // Invalidate and recalculate progress
            $order->invalidateSmartProgress();

            // Queue recalculation with debounce
            UpdateSmartProgress::dispatch($order)
                ->delay(now()->addSeconds(5))
                ->onQueue('low');
        }

        // Enhanced step queuing checks
        if ($order->wasChanged(['status', 'quantity', 'parent_id'])) {
            $this->checkAndQueueEligibleSteps($order);
        }

        // Handle status-specific transitions
        if ($order->wasChanged('status')) {
            $this->handleStatusTransition($order);
        }

        // If status changed to completed, update parent
        if ($order->wasChanged('status') && $order->status === 'completed' && $order->parent_id) {
            UpdateSmartProgress::dispatch($order->parent)
                ->delay(now()->addSeconds(10))
                ->onQueue('low');
        }

        // Update child order counts if needed
        if ($order->wasChanged('status') && in_array($order->status, ['completed', 'cancelled']) && $order->parent_id) {
            $order->parent->updateChildOrderCounts();
        }

        // Check parent step dependencies when child order quantity is updated
        if ($order->wasChanged('quantity_completed') && $order->parent_id) {
            $this->checkParentStepDependencies($order);
        }
    }

    /**
     * Check parent order's route steps when child order progress changes.
     */
    protected function checkParentStepDependencies(ManufacturingOrder $childOrder): void
    {
        $parentOrder = $childOrder->parent;
        if (! $parentOrder->manufacturingRoute) {
            return;
        }

        // Check all pending steps with child order dependencies
        $parentOrder->manufacturingRoute->steps()
            ->where('status', 'pending')
            ->where('child_order_dependency_type', '!=', 'none')
            ->each(function ($step) {
                if ($step->canStart()) {
                    $step->moveToQueued();
                }
            });
    }

    /**
     * Check and queue all eligible steps for an order.
     */
    protected function checkAndQueueEligibleSteps(ManufacturingOrder $order): void
    {
        // Only process for active orders
        if (! in_array($order->status, ['released', 'in_progress'])) {
            return;
        }

        // Check all pending steps
        $order->manufacturingRoute?->steps()
            ->where('status', 'pending')
            ->with(['dependency', 'manufacturingRoute.manufacturingOrder'])
            ->each(function ($step) {
                if ($step->canStart()) {
                    DB::transaction(function () use ($step) {
                        $step->moveToQueued();
                    });
                }
            });
    }

    /**
     * Handle status-specific transitions.
     */
    protected function handleStatusTransition(ManufacturingOrder $order): void
    {
        $previousStatus = $order->getOriginal('status');
        $newStatus = $order->status;

        // Handle specific transitions
        switch ($newStatus) {
            case 'released':
                $this->handleOrderReleased($order);
                break;
            case 'on_hold':
                $this->handleOrderOnHold($order);
                break;
            case 'cancelled':
                $this->handleOrderCancelled($order);
                break;
        }

        // Handle resume from hold
        if ($previousStatus === 'on_hold' && $newStatus !== 'on_hold' && $newStatus !== 'cancelled') {
            $this->handleOrderResumed($order);
        }
    }

    /**
     * Handle order release - queue first eligible steps.
     */
    protected function handleOrderReleased(ManufacturingOrder $order): void
    {
        // Queue all eligible steps when order is released
        $this->checkAndQueueEligibleSteps($order);
    }

    /**
     * Handle order on hold - pause active steps.
     */
    protected function handleOrderOnHold(ManufacturingOrder $order): void
    {
        if (! $order->manufacturingRoute) {
            return;
        }

        // Mark all queued and in_progress steps as on_hold
        $order->manufacturingRoute->steps()
            ->whereIn('status', ['queued', 'in_progress'])
            ->update(['status' => 'on_hold']);
    }

    /**
     * Handle order cancellation - cancel all non-completed steps.
     */
    protected function handleOrderCancelled(ManufacturingOrder $order): void
    {
        if (! $order->manufacturingRoute) {
            return;
        }

        // Cancel all non-completed steps
        $order->manufacturingRoute->steps()
            ->whereNotIn('status', ['completed', 'skipped'])
            ->update(['status' => 'cancelled']);
    }

    /**
     * Handle order resumed from hold - re-evaluate all steps.
     */
    protected function handleOrderResumed(ManufacturingOrder $order): void
    {
        if (! $order->manufacturingRoute) {
            return;
        }

        // Change on_hold steps back to their appropriate status
        $order->manufacturingRoute->steps()
            ->where('status', 'on_hold')
            ->each(function ($step) {
                // Re-evaluate if step can start
                if ($step->canStart()) {
                    $step->update(['status' => 'queued']);
                } else {
                    $step->update(['status' => 'pending']);
                }
            });

        // Check all pending steps again
        $this->checkAndQueueEligibleSteps($order);
    }

    /**
     * Handle the ManufacturingOrder "deleted" event.
     */
    public function deleted(ManufacturingOrder $order): void
    {
        // Update parent progress if this was a child order
        if ($order->parent_id && $order->parent) {
            $order->parent->updateChildOrderCounts();

            UpdateSmartProgress::dispatch($order->parent)
                ->delay(now()->addSeconds(5))
                ->onQueue('low');
        }
    }

    /**
     * Handle the ManufacturingOrder "restored" event.
     */
    public function restored(ManufacturingOrder $order): void
    {
        // Recalculate progress after restore
        UpdateSmartProgress::dispatch($order)
            ->delay(now()->addSeconds(5))
            ->onQueue('low');

        // Update parent if exists
        if ($order->parent_id && $order->parent) {
            $order->parent->updateChildOrderCounts();

            UpdateSmartProgress::dispatch($order->parent)
                ->delay(now()->addSeconds(10))
                ->onQueue('low');
        }
    }
}

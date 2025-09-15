<?php

namespace App\Observers;

use App\Jobs\Production\UpdateSmartProgress;
use App\Models\Production\ManufacturingOrder;

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
        if ($order->isDirty(['quantity', 'quantity_completed', 'status'])) {
            // Invalidate and recalculate progress
            $order->invalidateSmartProgress();
            
            // Queue recalculation with debounce
            UpdateSmartProgress::dispatch($order)
                ->delay(now()->addSeconds(5))
                ->onQueue('low');
        }
        
        // If status changed to completed, update parent
        if ($order->isDirty('status') && $order->status === 'completed' && $order->parent_id) {
            UpdateSmartProgress::dispatch($order->parent)
                ->delay(now()->addSeconds(10))
                ->onQueue('low');
        }
        
        // Update child order counts if needed
        if ($order->isDirty('status') && in_array($order->status, ['completed', 'cancelled']) && $order->parent_id) {
            $order->parent->updateChildOrderCounts();
        }
        
        // Check parent step dependencies when child order quantity is updated
        if ($order->isDirty('quantity_completed') && $order->parent_id) {
            $this->checkParentStepDependencies($order);
        }
    }

    /**
     * Check parent order's route steps when child order progress changes.
     */
    protected function checkParentStepDependencies(ManufacturingOrder $childOrder): void
    {
        $parentOrder = $childOrder->parent;
        if (!$parentOrder->manufacturingRoute) {
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

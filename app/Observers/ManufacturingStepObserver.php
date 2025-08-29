<?php

namespace App\Observers;

use App\Jobs\Production\UpdateSmartProgress;
use App\Models\Production\ManufacturingStep;

class ManufacturingStepObserver
{
    /**
     * Handle the ManufacturingStep "updated" event.
     */
    public function updated(ManufacturingStep $step): void
    {
        // Check if cumulative quantities changed
        if ($step->isDirty(['cumulative_quantity_completed', 'cumulative_quantity_scrapped', 'status'])) {
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
    }

    /**
     * Handle the ManufacturingStep "created" event.
     */
    public function created(ManufacturingStep $step): void
    {
        // When a new step is added, recalculate progress
        $order = $step->manufacturingRoute->manufacturingOrder;
        
        if ($order) {
            $order->invalidateSmartProgress();
            
            UpdateSmartProgress::dispatch($order)
                ->delay(now()->addSeconds(10))
                ->onQueue('low');
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

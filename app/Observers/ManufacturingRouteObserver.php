<?php

namespace App\Observers;

use App\Models\Production\ManufacturingRoute;

class ManufacturingRouteObserver
{
    /**
     * Handle the ManufacturingRoute "created" event.
     */
    public function created(ManufacturingRoute $route): void
    {
        // When a route is created, override auto_complete_on_children to false
        // Orders with routing steps must be completed manually
        $order = $route->manufacturingOrder;

        if ($order && $order->auto_complete_on_children) {
            $order->update(['auto_complete_on_children' => false]);

            // Log this change
            // TODO: Add activity logging when spatie/laravel-activitylog is installed
            // activity()
            //     ->performedOn($order)
            //     ->causedBy(auth()->user())
            //     ->withProperties([
            //         'reason' => 'Route added - auto-completion disabled',
            //         'previous_value' => true,
            //         'new_value' => false,
            //     ])
            //     ->log('Auto-completion disabled due to route creation');
        }
    }
}

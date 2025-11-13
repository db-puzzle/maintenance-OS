<?php

namespace App\Observers;

use App\Models\Production\ManufacturingRoute;
use Illuminate\Support\Facades\Log;

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
            activity()
                ->performedOn($order)
                ->causedBy(auth()->user())
                ->withProperties([
                    'reason' => 'Route added - auto-completion disabled',
                    'previous_value' => true,
                    'new_value' => false,
                ])
                ->log('Auto-completion disabled due to route creation');
        }

        // When route is created, check if order is already released
        if ($order && $order->status === 'released') {
            $this->queueFirstSteps($route);
        }
    }

    /**
     * Handle the ManufacturingRoute "updated" event.
     */
    public function updated(ManufacturingRoute $route): void
    {
        // Re-evaluate steps if route structure changes
        $order = $route->manufacturingOrder;
        if ($order && in_array($order->status, ['released', 'in_progress'])) {
            $this->checkAllPendingSteps($route);
        }
    }

    /**
     * Queue the first eligible steps when a route is created on a released order.
     */
    protected function queueFirstSteps(ManufacturingRoute $route): void
    {
        // Find steps with no dependencies or whose dependencies are met
        $route->steps()
            ->where('status', 'pending')
            ->with(['dependency', 'manufacturingRoute.manufacturingOrder'])
            ->each(function ($step) {
                if ($step->canStart()) {
                    $step->moveToQueued();

                    Log::info('Route observer queued first step', [
                        'step_id' => $step->id,
                        'step_name' => $step->name,
                        'order_id' => $step->manufacturingRoute->manufacturing_order_id,
                        'trigger' => 'route_created',
                    ]);
                }
            });
    }

    /**
     * Check all pending steps when route structure changes.
     */
    protected function checkAllPendingSteps(ManufacturingRoute $route): void
    {
        $route->steps()
            ->where('status', 'pending')
            ->with(['dependency', 'manufacturingRoute.manufacturingOrder'])
            ->each(function ($step) {
                if ($step->canStart()) {
                    $step->moveToQueued();

                    Log::info('Route observer queued step after route update', [
                        'step_id' => $step->id,
                        'step_name' => $step->name,
                        'order_id' => $step->manufacturingRoute->manufacturing_order_id,
                        'trigger' => 'route_updated',
                    ]);
                }
            });
    }
}

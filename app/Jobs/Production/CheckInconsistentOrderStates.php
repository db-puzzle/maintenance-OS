<?php

namespace App\Jobs\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Safety net job to detect and fix inconsistent manufacturing order states.
 *
 * This job runs periodically to catch edge cases where:
 * - Step executions are complete but MO status is not updated
 * - All steps are complete but MO status is not 'completed'
 * - Child orders are complete but parent was not notified
 * - Pending steps with met dependencies that were not queued
 */
class CheckInconsistentOrderStates implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        $this->onQueue('low');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Check for orders with all steps complete but status not completed
        $this->fixOrdersWithCompletedSteps();

        // Check for pending steps that should be queued
        $this->queueEligiblePendingSteps();

        // Check for parent orders with incorrect completed child counts
        $this->fixParentOrderChildCounts();
    }

    /**
     * Find and fix orders where all steps are complete but order status is not.
     */
    protected function fixOrdersWithCompletedSteps(): void
    {
        // Find orders that have routes with all steps completed but order is not completed
        ManufacturingOrder::query()
            ->whereIn('status', ['released', 'in_progress'])
            ->whereHas('manufacturingRoute', function ($query) {
                $query->whereHas('steps');
            })
            ->with(['manufacturingRoute.steps'])
            ->chunk(50, function ($orders) {
                foreach ($orders as $order) {
                    $route = $order->manufacturingRoute;

                    // Check if all steps are completed
                    if ($route && $route->allStepsCompleted()) {
                        Log::warning('Safety job: Fixing order with all steps completed', [
                            'order_id' => $order->id,
                            'order_number' => $order->order_number,
                            'current_status' => $order->status,
                            'trigger' => 'scheduled_safety_check',
                        ]);

                        DB::transaction(function () use ($order) {
                            $order->update([
                                'status' => 'completed',
                                'actual_end_date' => now(),
                                'quantity_completed' => $order->quantity,
                            ]);

                            // Notify parent if this child is now complete
                            if ($order->parent) {
                                $order->parent->incrementCompletedChildren();
                            }
                        });
                    }
                }
            });
    }

    /**
     * Find and queue pending steps that should be ready.
     */
    protected function queueEligiblePendingSteps(): void
    {
        // Find all pending steps on active orders
        ManufacturingStep::query()
            ->where('status', 'pending')
            ->whereHas('manufacturingRoute.manufacturingOrder', function ($query) {
                $query->whereIn('status', ['released', 'in_progress']);
            })
            ->with(['dependency', 'manufacturingRoute.manufacturingOrder'])
            ->chunk(100, function ($steps) {
                foreach ($steps as $step) {
                    if ($step->canStart()) {
                        Log::info('Safety job: Queuing step with met dependencies', [
                            'step_id' => $step->id,
                            'step_name' => $step->name,
                            'order_id' => $step->manufacturingRoute->manufacturing_order_id,
                            'order_number' => $step->manufacturingRoute->manufacturingOrder->order_number,
                            'trigger' => 'scheduled_safety_check',
                        ]);

                        DB::transaction(function () use ($step) {
                            $step->moveToQueued();
                        });
                    }
                }
            });
    }

    /**
     * Fix parent orders with incorrect completed child counts.
     */
    protected function fixParentOrderChildCounts(): void
    {
        // Find orders that have children
        ManufacturingOrder::query()
            ->where('child_orders_count', '>', 0)
            ->whereIn('status', ['released', 'in_progress'])
            ->with(['children' => function ($query) {
                $query->where('status', 'completed');
            }])
            ->chunk(50, function ($orders) {
                foreach ($orders as $order) {
                    $actualCompletedCount = $order->children()
                        ->where('status', 'completed')
                        ->count();

                    // If the count is wrong, fix it
                    if ($actualCompletedCount !== $order->completed_child_orders_count) {
                        Log::warning('Safety job: Fixing parent order child count', [
                            'order_id' => $order->id,
                            'order_number' => $order->order_number,
                            'recorded_count' => $order->completed_child_orders_count,
                            'actual_count' => $actualCompletedCount,
                            'trigger' => 'scheduled_safety_check',
                        ]);

                        DB::transaction(function () use ($order, $actualCompletedCount) {
                            $order->update([
                                'completed_child_orders_count' => $actualCompletedCount,
                            ]);

                            // Re-check if any pending steps can now start
                            $order->manufacturingRoute?->steps()
                                ->where('status', 'pending')
                                ->each(function ($step) {
                                    if ($step->canStart()) {
                                        $step->moveToQueued();
                                    }
                                });
                        });
                    }
                }
            });
    }
}

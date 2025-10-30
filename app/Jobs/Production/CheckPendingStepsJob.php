<?php

namespace App\Jobs\Production;

use App\Models\Production\ManufacturingStep;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckPendingStepsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info('CheckPendingStepsJob: Starting safety net check for pending steps');
        
        $queuedCount = 0;
        
        // Find all pending steps on active orders
        ManufacturingStep::query()
            ->where('status', 'pending')
            ->whereHas('manufacturingRoute.manufacturingOrder', function ($query) {
                $query->whereIn('status', ['released', 'in_progress']);
            })
            ->with(['dependency', 'manufacturingRoute.manufacturingOrder'])
            ->chunk(100, function ($steps) use (&$queuedCount) {
                foreach ($steps as $step) {
                    if ($step->canStart()) {
                        DB::transaction(function () use ($step, &$queuedCount) {
                            $step->moveToQueued();
                            $queuedCount++;
                            
                            Log::warning('Safety net queued step', [
                                'step_id' => $step->id,
                                'step_name' => $step->name,
                                'order_id' => $step->manufacturingRoute->manufacturing_order_id,
                                'order_number' => $step->manufacturingRoute->manufacturingOrder->order_number,
                                'trigger' => 'safety_net_job'
                            ]);
                        });
                    }
                }
            });
            
        if ($queuedCount > 0) {
            Log::warning('CheckPendingStepsJob: Safety net queued steps', [
                'queued_count' => $queuedCount,
                'message' => 'This indicates observer events may have been missed'
            ]);
        } else {
            Log::info('CheckPendingStepsJob: No pending steps found that need queuing');
        }
    }
}

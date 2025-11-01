<?php

namespace App\Jobs\Production;

use App\Models\Production\ManufacturingStep;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class CheckPendingStepsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
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
                        });
                    }
                }
            });
    }
}

<?php

namespace App\Jobs\Production;

use App\Models\Production\ManufacturingOrder;
use App\Services\Production\SmartProgressService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;

class UpdateSmartProgress implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * The manufacturing order to update.
     *
     * @var ManufacturingOrder
     */
    public $order;

    /**
     * Number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The maximum number of unhandled exceptions to allow before failing.
     *
     * @var int
     */
    public $maxExceptions = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(ManufacturingOrder $order)
    {
        $this->order = $order;
        $this->queue = 'low'; // Low priority queue
    }

    /**
     * Execute the job.
     */
    public function handle(SmartProgressService $progressService): void
    {
        // Check if we're already processing this order to prevent duplicate work
        $lockKey = "smart_progress_update_{$this->order->id}";
        $lock = Cache::lock($lockKey, 30); // 30 second lock

        if (! $lock->get()) {
            // Another job is already processing this order
            return;
        }

        try {
            // Refresh the order to get latest data
            $this->order->refresh();

            // Update progress
            $progressService->updateProgress($this->order, true);
        } catch (\Exception $e) {
            throw $e; // Re-throw to trigger retry
        } finally {
            $lock->release();
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        // Job failed permanently after all retries
    }

    /**
     * Get the tags that should be assigned to the job.
     */
    public function tags(): array
    {
        return [
            'smart_progress',
            'manufacturing_order:' . $this->order->id,
            'order_number:' . $this->order->order_number,
        ];
    }

    /**
     * Calculate the number of seconds to wait before retrying the job.
     *
     * @return array<int>
     */
    public function backoff(): array
    {
        return [30, 60, 90]; // Progressive backoff: 30s, 60s, 90s
    }
}

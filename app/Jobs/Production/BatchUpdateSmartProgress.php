<?php

namespace App\Jobs\Production;

use App\Services\Production\SmartProgressService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class BatchUpdateSmartProgress implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * The order IDs to update.
     *
     * @var array
     */
    public $orderIds;

    /**
     * Number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 300; // 5 minutes

    /**
     * Create a new job instance.
     */
    public function __construct(array $orderIds)
    {
        $this->orderIds = $orderIds;
        $this->queue = 'low'; // Low priority queue
    }

    /**
     * Execute the job.
     */
    public function handle(SmartProgressService $progressService): void
    {
        $startTime = microtime(true);

        try {
            $updated = $progressService->batchUpdateProgress($this->orderIds);

            $duration = round(microtime(true) - $startTime, 2);

            Log::info('Batch smart progress update completed', [
                'order_count' => count($this->orderIds),
                'updated_count' => $updated,
                'duration_seconds' => $duration,
            ]);
        } catch (\Exception $e) {
            Log::error('Batch smart progress update failed', [
                'order_count' => count($this->orderIds),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e; // Re-throw to trigger retry
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Batch smart progress update job failed permanently', [
            'order_count' => count($this->orderIds),
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Get the tags that should be assigned to the job.
     */
    public function tags(): array
    {
        return [
            'smart_progress',
            'batch_update',
            'order_count:' . count($this->orderIds),
        ];
    }

    /**
     * Calculate the number of seconds to wait before retrying the job.
     *
     * @return array<int>
     */
    public function backoff(): array
    {
        return [60, 120, 180]; // Progressive backoff: 60s, 120s, 180s
    }
}

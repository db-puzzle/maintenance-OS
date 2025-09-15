<?php

namespace App\Jobs\Production;

use App\Models\Production\ScheduleVersion;
use App\Services\Production\SchedulingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RunSchedulerJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $scheduleVersion;
    protected $options;

    /**
     * Create a new job instance.
     */
    public function __construct(ScheduleVersion $scheduleVersion, array $options = [])
    {
        $this->scheduleVersion = $scheduleVersion;
        $this->options = $options;
    }

    /**
     * Execute the job.
     */
    public function handle(SchedulingService $schedulingService): void
    {
        try {
            Log::info('Starting scheduler job', [
                'version_id' => $this->scheduleVersion->id,
                'algorithm' => $this->options['algorithm'] ?? 'asap',
                'options' => $this->options,
            ]);

            // Run the scheduler
            $schedulingService->runScheduler(
                $this->scheduleVersion,
                $this->options['algorithm'] ?? 'asap',
                $this->options
            );

            Log::info('Scheduler job completed successfully', [
                'version_id' => $this->scheduleVersion->id,
            ]);

            // TODO: Send notification to user that scheduling is complete
            // This could be done via websockets or database notifications
            
        } catch (\Exception $e) {
            Log::error('Scheduler job failed', [
                'version_id' => $this->scheduleVersion->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Re-throw to mark job as failed
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Scheduler job failed permanently', [
            'version_id' => $this->scheduleVersion->id,
            'error' => $exception->getMessage(),
        ]);

        // TODO: Send notification to user about the failure
    }
}
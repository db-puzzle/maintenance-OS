<?php

namespace App\Jobs\Production;

use App\Events\Scheduling\SchedulingComplete;
use App\Events\Scheduling\SchedulingFailed;
use App\Events\Scheduling\SchedulingStarted;
use App\Models\Production\ScheduleVersion;
use App\Services\Scheduling\SchedulingRequest;
use App\Services\SchedulingService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ScheduleProductionJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     */
    public $timeout = 300; // 5 minutes

    private SchedulingRequest $request;
    private ScheduleVersion $version;
    private string $jobId;

    /**
     * Create a new job instance.
     */
    public function __construct(SchedulingRequest $request, ScheduleVersion $version, string $jobId)
    {
        $this->request = $request;
        $this->version = $version;
        $this->jobId = $jobId;
        $this->onQueue('scheduling');
    }

    /**
     * Execute the job.
     */
    public function handle(SchedulingService $schedulingService): void
    {
        try {
            // Mark job as started
            $this->version->markSchedulingStarted(
                $this->request->algorithmType,
                $this->jobId
            );

            // Broadcast start event
            broadcast(new SchedulingStarted(
                jobId: $this->jobId,
                scheduleVersionId: $this->version->id,
                algorithm: $this->request->algorithmType,
                totalSteps: $this->estimateTotalSteps($schedulingService),
                options: [
                    'start_date' => $this->request->scheduleStartDate?->format('Y-m-d'),
                    'end_date' => $this->request->scheduleEndDate?->format('Y-m-d'),
                ]
            ));

            // Create and run the algorithm
            $algorithm = $schedulingService->createAlgorithm($this->request->algorithmType);

            // Set up progress reporting
            $this->setupProgressReporting($algorithm);

            // Execute scheduling
            $result = $algorithm->schedule($this->request);

            if (! $result->success) {
                throw new Exception('Scheduling algorithm failed to produce a valid schedule');
            }

            // Save results
            $schedulingService->saveSchedulingResults($this->version, $result);

            // Calculate summary stats
            $orders = $schedulingService->getOrdersForScheduling(
                [],
                $this->request->manufacturingOrderIds
            );

            $schedules = $this->version->productionSchedules()
                ->with('manufacturingStep.manufacturingRoute.manufacturingOrder')
                ->get();

            $metrics = $schedulingService->calculateMetrics($schedules, $orders);

            // Broadcast completion
            broadcast(new SchedulingComplete(
                jobId: $this->jobId,
                scheduleVersionId: $this->version->id,
                success: true,
                summary: [
                    'totalScheduled' => count($result->scheduledSteps),
                    'executionTime' => $result->executionTime,
                    'algorithm' => $this->request->algorithmType,
                    'metrics' => $metrics,
                ],
                alertCount: count($result->alerts),
                alertBreakdown: $this->getAlertBreakdown()
            ));

            Log::info('Scheduling completed successfully', [
                'job_id' => $this->job->getJobId(),
                'version_id' => $this->version->id,
                'algorithm' => $this->request->algorithmType,
                'execution_time' => $result->executionTime,
                'scheduled_steps' => count($result->scheduledSteps),
                'alerts' => count($result->alerts),
            ]);
        } catch (Exception $e) {
            $this->handleFailure($e);
            throw $e;
        }
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $this->handleFailure($exception);
    }

    /**
     * Handle failure and broadcast event.
     */
    private function handleFailure(\Throwable $exception): void
    {
        // Update version status
        $this->version->updateSchedulingStatus('failed', $exception->getMessage());

        // Log detailed error
        Log::error('Scheduling failed', [
            'job_id' => $this->job->getJobId(),
            'version_id' => $this->version->id,
            'algorithm' => $this->request->algorithmType,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);

        // Broadcast user-friendly error
        broadcast(new SchedulingFailed(
            jobId: $this->job->getJobId(),
            scheduleVersionId: $this->version->id,
            error: $this->getUserFriendlyError($exception),
            context: [
                'algorithm' => $this->request->algorithmType,
                'canRetry' => $this->attempts() < $this->tries,
            ]
        ));
    }

    /**
     * Get user-friendly error message.
     */
    private function getUserFriendlyError(\Throwable $exception): string
    {
        $message = $exception->getMessage();

        // Map technical errors to user-friendly messages
        if (str_contains($message, 'timeout')) {
            return 'Scheduling took too long to complete. Try scheduling fewer orders or use a simpler algorithm.';
        }

        if (str_contains($message, 'memory')) {
            return 'Not enough resources to complete scheduling. Try scheduling fewer orders.';
        }

        if (str_contains($message, 'locked step conflicts')) {
            return 'Unable to find valid schedule due to locked step constraints. Try unlocking some steps.';
        }

        // Default message
        return 'An error occurred during scheduling. Please try again or contact support if the problem persists.';
    }

    /**
     * Estimate total steps for progress reporting.
     */
    private function estimateTotalSteps(SchedulingService $service): int
    {
        $orders = $service->getOrdersForScheduling([], $this->request->manufacturingOrderIds);

        $totalSteps = 0;
        foreach ($orders as $order) {
            $totalSteps += $order->manufacturingRoute?->steps->count() ?? 0;
        }

        return $totalSteps;
    }

    /**
     * Set up progress reporting for the algorithm.
     */
    private function setupProgressReporting($algorithm): void
    {
        // This would require modifying the base scheduler to accept a progress callback
        // For now, progress is reported within the algorithm implementation
    }

    /**
     * Get alert breakdown by type and severity.
     */
    private function getAlertBreakdown(): array
    {
        $alerts = $this->version->alerts;

        return [
            'errors' => $alerts->where('severity', 'error')->count(),
            'warnings' => $alerts->where('severity', 'warning')->count(),
            'by_type' => [
                'capacity_overrun' => $alerts->where('alert_type', 'capacity_overrun')->count(),
                'dependency_violation' => $alerts->where('alert_type', 'dependency_violation')->count(),
                'late_delivery' => $alerts->where('alert_type', 'late_delivery')->count(),
            ],
        ];
    }
}

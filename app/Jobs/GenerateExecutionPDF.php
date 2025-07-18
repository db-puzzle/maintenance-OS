<?php

namespace App\Jobs;

use App\Models\Maintenance\ExecutionExport;
use App\Services\PDFGeneratorService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateExecutionPDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of seconds the job can run before timing out.
     */
    public $timeout = 300; // 5 minutes

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    public function __construct(
        public ExecutionExport $export
    ) {}

    /**
     * Execute the job.
     */
    public function handle(PDFGeneratorService $pdfService)
    {
        try {
            $this->export->markAsProcessing();

            // Generate the export based on format
            $filePath = match ($this->export->export_format) {
                'csv' => $this->generateCSV($pdfService),
                'pdf' => $this->generatePDF($pdfService),
                default => throw new \Exception('Unsupported export format: '.$this->export->export_format),
            };

            // Update export record
            $this->export->file_path = $filePath;
            $this->export->save();
            $this->export->markAsCompleted();

            // Send email notification if requested
            if ($this->shouldSendEmail()) {
                $this->sendCompletionEmail();
            }
        } catch (\Exception $e) {
            Log::error('PDF generation failed for export '.$this->export->id, [
                'export_id' => $this->export->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->export->markAsFailed();

            // Re-throw to trigger retry if attempts remain
            throw $e;
        }
    }

    /**
     * Generate PDF based on export type
     */
    private function generatePDF(PDFGeneratorService $pdfService): string
    {
        $metadata = $this->export->metadata ?? [];

        if ($this->export->export_type === ExecutionExport::TYPE_SINGLE) {
            return $pdfService->generateExecutionReport(
                $this->export->getExecutions()->first(),
                $metadata
            );
        }

        // For batch reports, we need work order IDs, not execution IDs
        // Get work order IDs from the executions
        $workOrderIds = $this->export->getExecutions()
            ->pluck('work_order_id')
            ->unique()
            ->toArray();

        return $pdfService->generateBatchReport(
            $workOrderIds,
            $metadata
        );
    }

    /**
     * Generate CSV export
     */
    private function generateCSV(PDFGeneratorService $pdfService): string
    {
        // Get work order IDs from the executions
        $workOrderIds = $this->export->getExecutions()
            ->pluck('work_order_id')
            ->unique()
            ->toArray();

        return $pdfService->generateCSVExport($workOrderIds);
    }

    /**
     * Check if email should be sent
     */
    private function shouldSendEmail(): bool
    {
        $metadata = $this->export->metadata ?? [];

        return isset($metadata['delivery']['method']) &&
               $metadata['delivery']['method'] === 'email' &&
               ! empty($metadata['delivery']['email']);
    }

    /**
     * Send completion email
     */
    private function sendCompletionEmail()
    {
        $metadata = $this->export->metadata ?? [];
        $email = $metadata['delivery']['email'] ?? null;

        if (! $email) {
            return;
        }

        // In a real implementation, you would create a proper Mailable class
        // For now, we'll just log that we would send an email
        Log::info('Would send export completion email', [
            'export_id' => $this->export->id,
            'email' => $email,
        ]);
    }

    /**
     * Get estimated progress percentage
     */
    public function getProgressPercentage(): int
    {
        if ($this->export->isCompleted()) {
            return 100;
        }

        if ($this->export->isPending()) {
            return 0;
        }

        // Calculate based on creation time and estimated duration
        $createdAt = $this->export->created_at;
        $now = now();
        $elapsedSeconds = $now->diffInSeconds($createdAt);

        // Estimate based on execution count
        $executionCount = count($this->export->execution_ids);
        $estimatedSeconds = $this->getEstimatedDuration($executionCount);

        $progress = min(95, round(($elapsedSeconds / $estimatedSeconds) * 100));

        return max(5, $progress); // Always show at least 5% when processing
    }

    /**
     * Get estimated duration in seconds
     */
    private function getEstimatedDuration(int $executionCount): int
    {
        // Base time + time per execution
        $baseTime = 5; // 5 seconds base
        $timePerExecution = 3; // 3 seconds per execution

        return $baseTime + ($executionCount * $timePerExecution);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Export job permanently failed', [
            'export_id' => $this->export->id,
            'error' => $exception->getMessage(),
        ]);

        $this->export->markAsFailed();
    }
}

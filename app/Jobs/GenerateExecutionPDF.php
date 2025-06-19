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
use Illuminate\Support\Facades\Mail;

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
            Log::info('Starting PDF generation for export ' . $this->export->id, [
                'export_id' => $this->export->id,
                'execution_count' => count($this->export->execution_ids),
                'format' => $this->export->export_format,
                'type' => $this->export->export_type,
            ]);

            $this->export->markAsProcessing();

            // Generate the export based on format
            $filePath = match ($this->export->export_format) {
                'csv' => $pdfService->generateCSVExport($this->export->execution_ids),
                'pdf' => $this->generatePDF($pdfService),
                default => throw new \Exception('Unsupported export format: ' . $this->export->export_format),
            };

            // Update export record
            $this->export->file_path = $filePath;
            $this->export->save();
            $this->export->markAsCompleted();

            Log::info('PDF generation completed for export ' . $this->export->id, [
                'export_id' => $this->export->id,
                'file_path' => $filePath,
            ]);

            // Send email notification if requested
            if ($this->shouldSendEmail()) {
                $this->sendCompletionEmail();
            }
        } catch (\Exception $e) {
            Log::error('PDF generation failed for export ' . $this->export->id, [
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

        return $pdfService->generateBatchReport(
            $this->export->execution_ids,
            $metadata
        );
    }

    /**
     * Check if email should be sent
     */
    private function shouldSendEmail(): bool
    {
        $metadata = $this->export->metadata ?? [];
        return isset($metadata['delivery']['method']) && 
               $metadata['delivery']['method'] === 'email' &&
               !empty($metadata['delivery']['email']);
    }

    /**
     * Send completion email
     */
    private function sendCompletionEmail()
    {
        $metadata = $this->export->metadata ?? [];
        $email = $metadata['delivery']['email'] ?? null;

        if (!$email) {
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
     * Calculate progress percentage
     */
    public function getProgressPercentage(): int
    {
        // This is a simple estimation
        // In a real implementation, you might track actual progress
        $createdAt = $this->export->created_at;
        $estimatedSeconds = app(PDFGeneratorService::class)->getEstimatedGenerationTime(
            count($this->export->execution_ids),
            $this->export->export_format
        );

        $elapsedSeconds = now()->diffInSeconds($createdAt);
        $percentage = min(95, ($elapsedSeconds / $estimatedSeconds) * 100);

        return (int) $percentage;
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
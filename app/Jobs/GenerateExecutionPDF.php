<?php

namespace App\Jobs;

use App\Models\Maintenance\ExecutionExport;
use App\Services\PDFGeneratorService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Exception;
use Illuminate\Support\Facades\Log;

class GenerateExecutionPDF implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 300; // 5 minutes

    /**
     * Create a new job instance.
     */
    public function __construct(
        public ExecutionExport $export
    ) {
        $this->onQueue('exports');
    }

    /**
     * Execute the job.
     */
    public function handle(PDFGeneratorService $pdfService): void
    {
        try {
            // Mark export as processing
            $this->export->markAsProcessing();

            Log::info("Starting PDF generation for export {$this->export->id}", [
                'export_id' => $this->export->id,
                'execution_count' => count($this->export->execution_ids),
                'format' => $this->export->export_format,
                'type' => $this->export->export_type,
            ]);

            $filePath = $this->generateFile($pdfService);

            // Mark as completed
            $this->export->markAsCompleted($filePath);

            Log::info("PDF generation completed for export {$this->export->id}", [
                'export_id' => $this->export->id,
                'file_path' => $filePath,
                'file_size' => $this->getFileSize($filePath),
            ]);

            // TODO: Send notification to user if email delivery is requested
            $this->notifyUserIfNeeded();

        } catch (Exception $e) {
            // Mark as failed
            $this->export->markAsFailed();

            Log::error("PDF generation failed for export {$this->export->id}", [
                'export_id' => $this->export->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        $this->export->markAsFailed();

        Log::error("PDF generation job failed permanently for export {$this->export->id}", [
            'export_id' => $this->export->id,
            'attempts' => $this->attempts,
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Generate the file based on export type and format
     */
    private function generateFile(PDFGeneratorService $pdfService): string
    {
        $options = $this->export->metadata ?? [];
        
        return match ([$this->export->export_type, $this->export->export_format]) {
            [ExecutionExport::TYPE_SINGLE, ExecutionExport::FORMAT_PDF] => 
                $this->generateSinglePDF($pdfService, $options),
            
            [ExecutionExport::TYPE_BATCH, ExecutionExport::FORMAT_PDF] => 
                $this->generateBatchPDF($pdfService, $options),
            
            [ExecutionExport::TYPE_SINGLE, ExecutionExport::FORMAT_CSV],
            [ExecutionExport::TYPE_BATCH, ExecutionExport::FORMAT_CSV] => 
                $this->generateCSV($pdfService),
            
            default => throw new Exception("Unsupported export combination: {$this->export->export_type}/{$this->export->export_format}")
        };
    }

    /**
     * Generate single execution PDF
     */
    private function generateSinglePDF(PDFGeneratorService $pdfService, array $options): string
    {
        $executionId = $this->export->execution_ids[0] ?? null;
        
        if (!$executionId) {
            throw new Exception('No execution ID provided for single PDF generation');
        }

        $execution = \App\Models\Maintenance\RoutineExecution::findOrFail($executionId);
        
        return $pdfService->generateExecutionReport($execution, $options);
    }

    /**
     * Generate batch PDF
     */
    private function generateBatchPDF(PDFGeneratorService $pdfService, array $options): string
    {
        return $pdfService->generateBatchReport($this->export->execution_ids, $options);
    }

    /**
     * Generate CSV export
     */
    private function generateCSV(PDFGeneratorService $pdfService): string
    {
        return $pdfService->generateCSVExport($this->export->execution_ids);
    }

    /**
     * Get file size for logging
     */
    private function getFileSize(string $filePath): ?int
    {
        try {
            return \Illuminate\Support\Facades\Storage::size($filePath);
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Notify user if email delivery is requested
     */
    private function notifyUserIfNeeded(): void
    {
        $metadata = $this->export->metadata ?? [];
        
        if (($metadata['delivery']['method'] ?? null) === 'email') {
            $emailAddress = $metadata['delivery']['email'] ?? $this->export->user->email;
            
            if ($emailAddress) {
                // TODO: Dispatch email notification job
                Log::info("Should send email notification to {$emailAddress} for export {$this->export->id}");
            }
        }
    }

    /**
     * Calculate estimated progress percentage
     */
    public function getProgressPercentage(): int
    {
        // This is a rough estimate based on processing time
        $processingTime = now()->diffInSeconds($this->export->updated_at);
        $estimatedTime = (new PDFGeneratorService())->getEstimatedGenerationTime(
            count($this->export->execution_ids),
            $this->export->export_format
        );
        
        $progress = min(90, ($processingTime / $estimatedTime) * 100);
        
        return (int) $progress;
    }
}
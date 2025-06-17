<?php

namespace App\Services;

use App\Models\Maintenance\RoutineExecution;
use App\Models\Maintenance\ExecutionExport;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;

class PDFGeneratorService
{
    /**
     * Generate a single execution report
     */
    public function generateExecutionReport(
        RoutineExecution $execution,
        array $options = []
    ): string {
        // Load all necessary data
        $execution->loadMissing([
            'routine.assets',
            'formExecution.taskResponses.formTask',
            'formExecution.taskResponses.attachments',
            'formExecution.formVersion',
            'executor'
        ]);

        $data = [
            'execution' => $execution,
            'logoPath' => public_path('images/logo.png'),
            'includeImages' => $options['include_images'] ?? true,
            'compressImages' => $options['compress_images'] ?? true,
            'includeSignatures' => $options['include_signatures'] ?? true,
            'generatedAt' => now(),
        ];

        // Generate the HTML content
        $html = View::make('pdf.execution-report', $data)->render();

        // For now, we'll use a simple HTML to text conversion
        // In a real implementation, you'd use a proper PDF library
        $filename = "execution-report-{$execution->id}-" . now()->format('YmdHis') . '.html';
        $path = "exports/executions/{$filename}";
        
        Storage::put($path, $html);
        
        return $path;
    }

    /**
     * Generate a batch report for multiple executions
     */
    public function generateBatchReport(
        array $executionIds,
        array $options = []
    ): string {
        $executions = RoutineExecution::whereIn('id', $executionIds)
            ->withFullDetails()
            ->orderBy('started_at', 'desc')
            ->get();

        $data = [
            'executions' => $executions,
            'grouping' => $options['grouping'] ?? 'none',
            'includeCoverPage' => $options['include_cover_page'] ?? true,
            'includeIndex' => $options['include_index'] ?? true,
            'includeImages' => $options['include_images'] ?? true,
            'generatedAt' => now(),
            'logoPath' => public_path('images/logo.png'),
        ];

        $html = View::make('pdf.batch-execution-report', $data)->render();
        
        $filename = "batch-report-" . now()->format('YmdHis') . '.html';
        $path = "exports/executions/{$filename}";
        
        Storage::put($path, $html);
        
        return $path;
    }

    /**
     * Generate CSV export for executions
     */
    public function generateCSVExport(array $executionIds): string
    {
        $executions = RoutineExecution::whereIn('id', $executionIds)
            ->with(['routine', 'executor', 'routine.assets'])
            ->orderBy('started_at', 'desc')
            ->get();

        $csvData = [];
        
        // Header row
        $csvData[] = [
            'Execution ID',
            'Routine Name',
            'Asset Tag',
            'Executor',
            'Status',
            'Started At',
            'Completed At',
            'Duration (minutes)',
            'Progress (%)',
            'Notes'
        ];

        // Data rows
        foreach ($executions as $execution) {
            $csvData[] = [
                $execution->id,
                $execution->routine->name,
                $execution->primary_asset_tag,
                $execution->executor->name,
                $execution->status,
                $execution->started_at?->format('Y-m-d H:i:s'),
                $execution->completed_at?->format('Y-m-d H:i:s'),
                $execution->duration_minutes,
                $execution->progress_percentage,
                $execution->notes,
            ];
        }

        // Convert to CSV
        $csv = $this->arrayToCsv($csvData);
        
        $filename = "executions-export-" . now()->format('YmdHis') . '.csv';
        $path = "exports/executions/{$filename}";
        
        Storage::put($path, $csv);
        
        return $path;
    }

    /**
     * Get download URL for a file
     */
    public function getDownloadUrl(string $filePath): string
    {
        return Storage::temporaryUrl($filePath, now()->addHours(24));
    }

    /**
     * Clean up old export files
     */
    public function cleanupOldExports(int $daysOld = 7): int
    {
        $files = Storage::files('exports/executions');
        $deletedCount = 0;
        $cutoffDate = now()->subDays($daysOld);

        foreach ($files as $file) {
            $lastModified = Storage::lastModified($file);
            if ($lastModified && $lastModified < $cutoffDate->timestamp) {
                Storage::delete($file);
                $deletedCount++;
            }
        }

        return $deletedCount;
    }

    /**
     * Process images for PDF (compression, etc.)
     */
    private function processImages(RoutineExecution $execution, bool $compress = true): array
    {
        $processedImages = [];
        
        if (!$execution->formExecution || !$execution->formExecution->taskResponses) {
            return $processedImages;
        }

        foreach ($execution->formExecution->taskResponses as $response) {
            if ($response->attachments->isNotEmpty()) {
                foreach ($response->attachments as $attachment) {
                    if ($this->isImageFile($attachment->file_path)) {
                        $processedPath = $attachment->file_path;
                        
                        if ($compress) {
                            // In a real implementation, you'd compress the image here
                            $processedPath = $this->compressImage($attachment->file_path);
                        }
                        
                        $processedImages[] = [
                            'task_id' => $response->form_task_id,
                            'original_path' => $attachment->file_path,
                            'processed_path' => $processedPath,
                            'filename' => $attachment->filename,
                        ];
                    }
                }
            }
        }

        return $processedImages;
    }

    /**
     * Check if file is an image
     */
    private function isImageFile(string $filePath): bool
    {
        $extension = Str::lower(pathinfo($filePath, PATHINFO_EXTENSION));
        return in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
    }

    /**
     * Compress image (placeholder implementation)
     */
    private function compressImage(string $filePath): string
    {
        // In a real implementation, you'd use an image processing library
        // like Intervention Image to compress the image
        return $filePath;
    }

    /**
     * Convert array to CSV string
     */
    private function arrayToCsv(array $data): string
    {
        $output = fopen('php://temp', 'r+');
        
        foreach ($data as $row) {
            fputcsv($output, $row);
        }
        
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        
        return $csv;
    }

    /**
     * Validate export options
     */
    public function validateExportOptions(array $options): array
    {
        $errors = [];

        if (isset($options['paper_size']) && !in_array($options['paper_size'], ['A4', 'Letter'])) {
            $errors[] = 'Invalid paper size. Must be A4 or Letter.';
        }

        if (isset($options['export_format']) && !in_array($options['export_format'], ['pdf', 'csv', 'excel'])) {
            $errors[] = 'Invalid export format.';
        }

        return $errors;
    }

    /**
     * Get estimated generation time based on execution count and format
     */
    public function getEstimatedGenerationTime(int $executionCount, string $format): int
    {
        // Rough estimates in seconds
        return match ($format) {
            'pdf' => min(60, max(5, $executionCount * 2)), // 2 seconds per execution, 5-60 seconds
            'csv' => min(10, max(1, $executionCount * 0.1)), // 0.1 seconds per execution, 1-10 seconds
            'excel' => min(30, max(2, $executionCount * 0.5)), // 0.5 seconds per execution, 2-30 seconds
            default => 5,
        };
    }
}
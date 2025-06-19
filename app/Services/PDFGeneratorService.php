<?php

namespace App\Services;

use App\Models\Maintenance\RoutineExecution;
use App\Models\Maintenance\ExecutionExport;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\LaravelPdf\Facades\Pdf;
use Spatie\LaravelPdf\Enums\Format;
use App\Services\ResponseFormatterService;

class PDFGeneratorService
{
    protected ResponseFormatterService $responseFormatter;

    public function __construct(ResponseFormatterService $responseFormatter)
    {
        $this->responseFormatter = $responseFormatter;
    }

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
            'formExecution.taskResponses.formTask.instructions',
            'formExecution.taskResponses.attachments',
            'formExecution.formVersion',
            'executor'
        ]);

        // Format task responses
        $taskResponses = [];
        if ($execution->formExecution && $execution->formExecution->taskResponses) {
            foreach ($execution->formExecution->taskResponses as $response) {
                $taskResponses[] = $this->responseFormatter->formatResponse($response);
            }
        }

        // Generate HTML content directly
        $html = $this->generateExecutionReportHtml($execution, $taskResponses, $options);

        // Generate the PDF using Spatie/Laravel-PDF
        $filename = "execution-report-{$execution->id}-" . now()->format('YmdHis') . '.pdf';
        $path = "exports/executions/{$filename}";
        
        // Create the PDF from HTML
        $pdf = Pdf::html($html)
            ->format(Format::A4)
            ->margins(15, 15, 15, 15)
            ->withBrowsershot(function ($browsershot) {
                $browsershot->setChromePath('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
            });
        
        // Apply paper size option if provided
        if (isset($options['paper_size']) && $options['paper_size'] === 'Letter') {
            $pdf->format(Format::Letter);
        }
        
        // Save the PDF to storage
        $pdf->save(storage_path('app/' . $path));
        
        return $path;
    }

    /**
     * Generate HTML for execution report
     */
    private function generateExecutionReportHtml(RoutineExecution $execution, array $taskResponses, array $options): string
    {
        $includeImages = $options['include_images'] ?? true;
        $logoPath = file_exists(public_path('logo.svg')) ? asset('logo.svg') : '';
        
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .logo { max-width: 200px; }
        .title { text-align: right; }
        .title h1 { margin: 0; color: #333; }
        .subtitle { margin: 5px 0; color: #666; }
        .section { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section h2 { margin-top: 0; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px; }
        .label { font-weight: bold; width: 25%; }
        .status-completed { color: #155724; font-weight: bold; text-transform: uppercase; }
        .status-in_progress { color: #0c5460; font-weight: bold; text-transform: uppercase; }
        .status-pending { color: #856404; font-weight: bold; text-transform: uppercase; }
        .status-cancelled { color: #721c24; font-weight: bold; text-transform: uppercase; }
        .task-container { border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px; page-break-inside: avoid; }
        .task-header { background-color: #e9ecef; padding: 15px; border-radius: 8px 8px 0 0; font-weight: bold; }
        .task-body { padding: 20px; }
        .task-meta { color: #6c757d; font-size: 14px; margin-bottom: 10px; }
        .instructions { background-color: #f8f9fa; padding: 12px; border-radius: 4px; margin-bottom: 15px; }
        .measurement-value { padding: 4px 12px; border-radius: 4px; font-weight: bold; }
        .in-range { background-color: #d4edda; color: #155724; }
        .out-range { background-color: #f8d7da; color: #721c24; }
        .photo-container { margin-top: 12px; }
        .photo { max-width: 300px; max-height: 200px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>';
        
        // Header
        $html .= '<div class="header">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 50%;">';
        if ($logoPath) {
            $html .= '<img src="' . $logoPath . '" alt="Logo" class="logo">';
        }
        $html .= '</td>
                    <td style="text-align: right;">
                        <h1>Routine Execution Report</h1>
                        <p class="subtitle">Generated on ' . now()->format('Y-m-d H:i:s') . '</p>
                    </td>
                </tr>
            </table>
        </div>';
        
        // Execution Details
        $html .= '<div class="section">
            <h2>Execution Details</h2>
            <table>
                <tr>
                    <td class="label">Execution ID</td>
                    <td>#' . $execution->id . '</td>
                    <td class="label">Status</td>
                    <td><span class="status-' . $execution->status . '">' . str_replace('_', ' ', $execution->status) . '</span></td>
                </tr>
                <tr>
                    <td class="label">Routine</td>
                    <td>' . e($execution->routine->name) . '</td>
                    <td class="label">Asset</td>
                    <td>' . e($execution->primary_asset_tag ?? 'N/A') . '</td>
                </tr>
                <tr>
                    <td class="label">Executor</td>
                    <td>' . e($execution->executor->name) . '</td>
                    <td class="label">Started At</td>
                    <td>' . ($execution->started_at ? $execution->started_at->format('Y-m-d H:i:s') : 'N/A') . '</td>
                </tr>
                <tr>
                    <td class="label">Completed At</td>
                    <td>' . ($execution->completed_at ? $execution->completed_at->format('Y-m-d H:i:s') : 'N/A') . '</td>
                    <td class="label">Duration</td>
                    <td>' . ($execution->duration_minutes ? $execution->duration_minutes . ' minutes' : 'N/A') . '</td>
                </tr>';
        
        if ($execution->notes) {
            $html .= '<tr>
                <td class="label">Notes</td>
                <td colspan="3">' . e($execution->notes) . '</td>
            </tr>';
        }
        
        $html .= '</table></div>';
        
        // Task Responses
        $html .= '<div>
            <h2>Task Responses</h2>';
        
        if ($execution->formExecution && $execution->formExecution->taskResponses) {
            $index = 1;
            foreach ($execution->formExecution->taskResponses as $response) {
                $formattedResponse = $this->responseFormatter->formatResponse($response);
                
                $html .= '<div class="task-container">
                    <div class="task-header">
                        ' . $index . '. ' . e($response->formTask->description);
                
                if ($response->formTask->is_required) {
                    $html .= ' <span style="color: #dc3545; font-size: 12px;">(Required)</span>';
                }
                
                $html .= '</div>
                    <div class="task-body">
                        <div class="task-meta">
                            <strong>Type:</strong> ' . str_replace('_', ' ', $response->formTask->type);
                
                if ($response->responded_at) {
                    $html .= ' | <strong>Completed:</strong> ' . $response->responded_at->format('Y-m-d H:i:s');
                }
                
                $html .= '</div>';
                
                // Instructions
                if ($response->formTask->instructions->count() > 0) {
                    $html .= '<div class="instructions">
                        <strong>Instructions:</strong><br>';
                    foreach ($response->formTask->instructions as $instruction) {
                        $html .= e($instruction->content) . '<br>';
                    }
                    $html .= '</div>';
                }
                
                // Response content
                $html .= $this->renderResponseHtml($formattedResponse, $includeImages);
                
                $html .= '</div></div>';
                $index++;
            }
        }
        
        $html .= '</div>';
        
        // Footer
        $html .= '<div class="footer">
            <p>Routine Execution Report | Generated on ' . now()->format('Y-m-d H:i:s') . ' | Execution #' . $execution->id . '</p>
        </div>';
        
        $html .= '</body></html>';
        
        return $html;
    }

    /**
     * Render response HTML based on type
     */
    private function renderResponseHtml(array $response, bool $includeImages): string
    {
        $html = '<div>';
        
        switch ($response['type']) {
            case 'measurement':
                $html .= '<div style="margin-bottom: 8px;">
                    <strong>Value: </strong>
                    <span class="measurement-value ' . ($response['is_within_range'] ? 'in-range' : 'out-range') . '">
                        ' . e($response['display_value']) . '
                    </span>
                </div>';
                if (isset($response['range_info'])) {
                    $html .= '<p style="font-size: 14px; color: #666;">' . e($response['range_info']['range_text']) . '</p>';
                }
                break;
                
            case 'multiple_choice':
            case 'multiple_select':
                $html .= '<strong>Selected: </strong>' . e($response['display_value']);
                break;
                
            case 'question':
                $html .= '<p>' . nl2br(e($response['display_value'])) . '</p>';
                $html .= '<p style="font-size: 12px; color: #666;">' . 
                    $response['word_count'] . ' words • ' . $response['character_count'] . ' characters</p>';
                break;
                
            case 'photo':
                $html .= '<p>' . e($response['display_value']) . '</p>';
                if ($includeImages && isset($response['photos']) && count($response['photos']) > 0) {
                    $html .= '<div class="photo-container">';
                    foreach ($response['photos'] as $photo) {
                        $html .= '<div>
                            <img src="' . $photo['url'] . '" alt="' . e($photo['filename']) . '" class="photo">
                            <p style="font-size: 12px; color: #666; margin-top: 4px;">' . e($photo['filename']) . '</p>
                        </div>';
                    }
                    $html .= '</div>';
                }
                break;
                
            case 'file_upload':
                $html .= '<p>' . e($response['display_value']) . '</p>';
                if (isset($response['files']) && count($response['files']) > 0) {
                    $html .= '<div style="margin-top: 8px;">';
                    foreach ($response['files'] as $file) {
                        $html .= '<p style="font-size: 14px; margin: 4px 0;">📎 ' . e($file['filename']) . '</p>';
                    }
                    $html .= '</div>';
                }
                break;
                
            case 'code_reader':
                $html .= '<strong>Code: </strong>
                    <code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">
                        ' . e($response['display_value']) . '
                    </code>';
                break;
                
            default:
                $html .= e($response['display_value']);
        }
        
        $html .= '</div>';
        return $html;
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

        // Generate HTML content
        $html = $this->generateBatchReportHtml($executions, $options);

        // Generate the PDF
        $filename = "batch-report-" . now()->format('YmdHis') . '.pdf';
        $path = "exports/executions/{$filename}";
        
        // Create the PDF with landscape orientation for batch reports
        $pdf = Pdf::html($html)
            ->format(Format::A4)
            ->landscape()
            ->margins(15, 15, 15, 15)
            ->withBrowsershot(function ($browsershot) {
                $browsershot->setChromePath('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
            });
        
        // Save the PDF to storage
        $pdf->save(storage_path('app/' . $path));
        
        return $path;
    }

    /**
     * Generate HTML for batch report
     */
    private function generateBatchReportHtml($executions, array $options): string
    {
        $includeImages = $options['include_images'] ?? true;
        $includeCoverPage = $options['include_cover_page'] ?? true;
        $includeIndex = $options['include_index'] ?? true;
        
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; margin: 0; padding: 15px; }
        .page-break { page-break-after: always; }
        .cover-page { text-align: center; padding-top: 100px; }
        .cover-title { font-size: 28px; font-weight: bold; margin-bottom: 20px; }
        .cover-subtitle { font-size: 16px; color: #666; }
        .index-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .index-table th, .index-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .index-table th { background-color: #f4f4f4; font-weight: bold; }
        .execution-summary { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        .summary-header { font-weight: bold; font-size: 14px; margin-bottom: 10px; }
        table.details { width: 100%; }
        table.details td { padding: 4px 8px; }
        .label { font-weight: bold; width: 20%; }
    </style>
</head>
<body>';

        // Cover page
        if ($includeCoverPage) {
            $html .= '<div class="cover-page">
                <h1 class="cover-title">Batch Execution Report</h1>
                <p class="cover-subtitle">Generated on ' . now()->format('F j, Y') . '</p>
                <p class="cover-subtitle">Total Executions: ' . $executions->count() . '</p>
            </div>
            <div class="page-break"></div>';
        }

        // Index page
        if ($includeIndex) {
            $html .= '<h2>Execution Index</h2>
            <table class="index-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Routine</th>
                        <th>Asset</th>
                        <th>Executor</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>';
            
            foreach ($executions as $execution) {
                $html .= '<tr>
                    <td>#' . $execution->id . '</td>
                    <td>' . e($execution->routine->name) . '</td>
                    <td>' . e($execution->primary_asset_tag ?? 'N/A') . '</td>
                    <td>' . e($execution->executor->name) . '</td>
                    <td>' . ucwords(str_replace('_', ' ', $execution->status)) . '</td>
                    <td>' . ($execution->started_at ? $execution->started_at->format('Y-m-d') : 'N/A') . '</td>
                </tr>';
            }
            
            $html .= '</tbody></table>
            <div class="page-break"></div>';
        }

        // Individual execution summaries
        foreach ($executions as $execution) {
            $html .= '<div class="execution-summary">
                <div class="summary-header">Execution #' . $execution->id . ' - ' . e($execution->routine->name) . '</div>
                <table class="details">
                    <tr>
                        <td class="label">Asset:</td>
                        <td>' . e($execution->primary_asset_tag ?? 'N/A') . '</td>
                        <td class="label">Executor:</td>
                        <td>' . e($execution->executor->name) . '</td>
                    </tr>
                    <tr>
                        <td class="label">Status:</td>
                        <td>' . ucwords(str_replace('_', ' ', $execution->status)) . '</td>
                        <td class="label">Progress:</td>
                        <td>' . $execution->progress_percentage . '%</td>
                    </tr>
                    <tr>
                        <td class="label">Started:</td>
                        <td>' . ($execution->started_at ? $execution->started_at->format('Y-m-d H:i:s') : 'N/A') . '</td>
                        <td class="label">Completed:</td>
                        <td>' . ($execution->completed_at ? $execution->completed_at->format('Y-m-d H:i:s') : 'N/A') . '</td>
                    </tr>';
            
            if ($execution->notes) {
                $html .= '<tr>
                    <td class="label">Notes:</td>
                    <td colspan="3">' . e($execution->notes) . '</td>
                </tr>';
            }
            
            $html .= '</table></div>';
        }

        $html .= '</body></html>';
        
        return $html;
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
        // Get the export record that has this file path
        $export = \App\Models\Maintenance\ExecutionExport::where('file_path', $filePath)->first();
        
        if ($export) {
            // Return the proper download route
            return route('maintenance.executions.export.download', ['export' => $export->id]);
        }
        
        // Fallback to temporary URL for other files
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
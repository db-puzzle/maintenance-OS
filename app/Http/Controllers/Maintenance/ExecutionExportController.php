<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateExecutionPDF;
use App\Models\Maintenance\ExecutionExport;
use App\Models\WorkOrders\WorkOrderExecution;
use App\Services\PDFGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ExecutionExportController extends Controller
{
    public function __construct(
        private PDFGeneratorService $pdfService
    ) {}

    /**
     * Export a single execution
     */
    public function exportSingle(Request $request, WorkOrderExecution $execution)
    {
        // $this->authorize('export', $execution);

        $validated = $this->validateExportRequest($request, 'single');

        // Create export record
        $export = ExecutionExport::create([
            'user_id' => $request->user()->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => $validated['format'],
            'execution_ids' => [$execution->id],
            'metadata' => $validated,
        ]);

        // For small exports, process immediately; for larger ones, queue
        if ($this->shouldProcessImmediately($validated['format'], 1)) {
            return $this->processExportImmediately($export);
        }

        // Queue the export job
        GenerateExecutionPDF::dispatch($export);

        return response()->json([
            'export_id' => $export->id,
            'status' => 'processing',
            'estimated_time_seconds' => $this->pdfService->getEstimatedGenerationTime(1, $validated['format']),
            'download_url' => null,
        ]);
    }

    /**
     * Get export status
     */
    public function exportStatus(Request $request, ExecutionExport $export)
    {
        // Ensure user can access this export - simplified check
        if ($export->user_id !== $request->user()->id) {
            abort(403);
        }

        $response = [
            'export_id' => $export->id,
            'status' => $export->status,
            'created_at' => $export->created_at,
            'completed_at' => $export->completed_at,
            'download_url' => null,
            'file_size_kb' => null,
            'progress_percentage' => 0,
        ];

        if ($export->isCompleted() && $export->file_path) {
            $response['download_url'] = $this->pdfService->getDownloadUrl($export->file_path);
            $response['file_size_kb'] = $export->getEstimatedSizeKB();
            $response['progress_percentage'] = 100;
        } elseif ($export->isProcessing()) {
            // Estimate progress for processing exports
            $job = new GenerateExecutionPDF($export);
            $response['progress_percentage'] = $job->getProgressPercentage();
        }

        return response()->json($response);
    }

    /**
     * Download exported file
     */
    public function download(Request $request, ExecutionExport $export)
    {
        // Ensure user can access this export - simplified check
        if ($export->user_id !== $request->user()->id) {
            abort(403);
        }

        if (! $export->isCompleted() || ! $export->file_path) {
            return response()->json(['error' => 'Export is not ready for download'], 422);
        }

        $filePath = storage_path("app/{$export->file_path}");

        if (! file_exists($filePath)) {
            return response()->json(['error' => 'Export file not found'], 404);
        }

        // Always use the specified filename format
        try {
            $execution = WorkOrderExecution::with(['workOrder', 'workOrder.asset'])->find($export->execution_ids[0]);
            
            if ($execution && $execution->workOrder) {
                // Get asset tag
                $assetTag = $execution->workOrder->asset->tag ?? 'NoAsset';
                
                // Get work order title
                $workOrderTitle = $execution->workOrder->title;
                
                // Sanitize filename components - use Laravel's Str::slug for better handling of special characters
                // This will convert accented characters to their ASCII equivalents
                $assetTag = Str::slug($assetTag, '_');
                $workOrderTitle = Str::slug($workOrderTitle, '_');
                
                // Convert to uppercase
                $assetTag = strtoupper($assetTag);
                $workOrderTitle = strtoupper($workOrderTitle);
                
                // Get execution ID
                $executionId = $execution->id;
                
                // Get execution date/time
                $executionDateTime = $execution->started_at 
                    ? \Carbon\Carbon::parse($execution->started_at)->format('Y-m-d_His')
                    : $export->created_at->format('Y-m-d_His');
                
                // Build filename: AssetTag_WorkOrderTitle_ExecutionID_ExecutionDateTime.pdf
                $fileName = "{$assetTag}_{$workOrderTitle}_ID{$executionId}_{$executionDateTime}.pdf";
            } else {
                // Fallback if execution not found or incomplete
                $fileName = "execution_{$export->execution_ids[0]}_{$export->created_at->format('Y-m-d_His')}.pdf";
            }
        } catch (\Exception $e) {
            // Fallback on any error
            $fileName = "execution_{$export->execution_ids[0]}_{$export->created_at->format('Y-m-d_His')}.pdf";
        }

        $mimeType = 'application/pdf';

        if (str_ends_with($export->file_path, '.csv')) {
            $mimeType = 'text/csv';
            $fileName = str_replace('.pdf', '.csv', $fileName);
        } elseif (str_ends_with($export->file_path, '.xlsx')) {
            $mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            $fileName = str_replace('.pdf', '.xlsx', $fileName);
        }

        return response()->download($filePath, $fileName, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Get user's export history
     */
    public function userExports(Request $request)
    {
        $exports = ExecutionExport::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($export) {
                return [
                    'id' => $export->id,
                    'export_type' => $export->export_type,
                    'export_format' => $export->export_format,
                    'execution_count' => count($export->execution_ids),
                    'status' => $export->status,
                    'created_at' => $export->created_at,
                    'completed_at' => $export->completed_at,
                    'estimated_size_kb' => $export->getEstimatedSizeKB(),
                    'can_download' => $export->isCompleted() && $export->file_path,
                ];
            });

        return response()->json(['exports' => $exports]);
    }

    /**
     * Cancel a pending export
     */
    public function cancel(Request $request, ExecutionExport $export)
    {
        if ($export->user_id !== $request->user()->id) {
            abort(403);
        }

        if (! in_array($export->status, [ExecutionExport::STATUS_PENDING, ExecutionExport::STATUS_PROCESSING])) {
            return response()->json(['error' => 'Export cannot be cancelled'], 422);
        }

        $export->markAsFailed(); // We'll use failed status for cancelled exports

        return response()->json(['message' => 'Export cancelled successfully']);
    }

    /**
     * Validate export request
     */
    private function validateExportRequest(Request $request, string $type): array
    {
        $rules = [
            'format' => ['required', Rule::in(['pdf', 'csv', 'excel'])],
            'template' => ['nullable', Rule::in(['standard', 'summary', 'detailed'])],
            'include_images' => ['boolean'],
            'compress_images' => ['boolean'],
            'include_signatures' => ['boolean'],
            'paper_size' => ['nullable', Rule::in(['A4', 'Letter'])],
            'delivery.method' => ['required', Rule::in(['download', 'email'])],
            'delivery.email' => ['nullable', 'email', 'required_if:delivery.method,email'],
        ];

        return Validator::make($request->all(), $rules)->validate();
    }

    /**
     * Determine if export should be processed immediately
     */
    private function shouldProcessImmediately(string $format, int $executionCount): bool
    {
        // Never process PDFs immediately as they require Browsershot/Chrome
        // and can timeout in web requests
        return match ($format) {
            'csv' => true,  // Single CSV exports can be processed immediately
            'excel' => true,  // Single Excel exports can be processed immediately
            'pdf' => false, // Always queue PDF exports
            default => false,
        };
    }

    /**
     * Process export immediately and return response
     */
    private function processExportImmediately(ExecutionExport $export)
    {
        try {
            $job = new GenerateExecutionPDF($export);
            $job->handle($this->pdfService);

            return response()->json([
                'export_id' => $export->id,
                'status' => 'completed',
                'download_url' => $this->pdfService->getDownloadUrl($export->file_path),
                'file_size_kb' => $export->getEstimatedSizeKB(),
            ]);
        } catch (\Exception $e) {
            $export->markAsFailed();

            return response()->json([
                'error' => 'Export failed: '.$e->getMessage(),
            ], 500);
        }
    }
}

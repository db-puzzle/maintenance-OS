<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\Maintenance\RoutineExecution;
use App\Models\Maintenance\ExecutionExport;
use App\Services\PDFGeneratorService;
use App\Jobs\GenerateExecutionPDF;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ExecutionExportController extends Controller
{
    public function __construct(
        private PDFGeneratorService $pdfService
    ) {}

    /**
     * Export a single execution
     */
    public function exportSingle(Request $request, RoutineExecution $execution)
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
     * Export multiple executions
     */
    public function exportBatch(Request $request)
    {
        // $this->authorize('viewAny', RoutineExecution::class);

        $validated = $this->validateBatchExportRequest($request);

        // Validate execution IDs and permissions
        $executionIds = $validated['execution_ids'];
        $executions = RoutineExecution::whereIn('id', $executionIds)->get();

        if ($executions->count() !== count($executionIds)) {
            return response()->json([
                'error' => 'Some execution IDs are invalid or not found.'
            ], 422);
        }

        // Check permissions for each execution - disabled for now
        // foreach ($executions as $execution) {
        //     if (!$request->user()->can('view', $execution)) {
        //         return response()->json([
        //             'error' => 'You do not have permission to export all selected executions.'
        //         ], 403);
        //     }
        // }

        // Create export record
        $export = ExecutionExport::create([
            'user_id' => $request->user()->id,
            'export_type' => ExecutionExport::TYPE_BATCH,
            'export_format' => $validated['format'],
            'execution_ids' => $executionIds,
            'metadata' => $validated,
        ]);

        // For small exports, process immediately; for larger ones, queue
        if ($this->shouldProcessImmediately($validated['format'], count($executionIds))) {
            return $this->processExportImmediately($export);
        }

        // Queue the export job
        GenerateExecutionPDF::dispatch($export);

        return response()->json([
            'export_id' => $export->id,
            'status' => 'processing',
            'estimated_time_seconds' => $this->pdfService->getEstimatedGenerationTime(
                count($executionIds), 
                $validated['format']
            ),
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

        if (!$export->isCompleted() || !$export->file_path) {
            return response()->json(['error' => 'Export is not ready for download'], 422);
        }

        $filePath = storage_path("app/{$export->file_path}");
        
        if (!file_exists($filePath)) {
            return response()->json(['error' => 'Export file not found'], 404);
        }

        $fileName = basename($export->file_path);
        $mimeType = 'application/pdf';
        
        if (str_ends_with($fileName, '.csv')) {
            $mimeType = 'text/csv';
        } elseif (str_ends_with($fileName, '.txt')) {
            $mimeType = 'text/plain';
        }

        return response()->download($filePath, $fileName, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
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

        if (!in_array($export->status, [ExecutionExport::STATUS_PENDING, ExecutionExport::STATUS_PROCESSING])) {
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

        if ($type === 'batch') {
            $rules = array_merge($rules, [
                'grouping' => ['nullable', Rule::in(['none', 'by_asset', 'by_routine'])],
                'include_cover_page' => ['boolean'],
                'include_index' => ['boolean'],
                'separate_files' => ['boolean'],
            ]);
        }

        return Validator::make($request->all(), $rules)->validate();
    }

    /**
     * Validate batch export request
     */
    private function validateBatchExportRequest(Request $request): array
    {
        $validated = $this->validateExportRequest($request, 'batch');

        // Additional validation for batch exports
        $batchRules = [
            'execution_ids' => ['required', 'array', 'min:1', 'max:100'],
            'execution_ids.*' => ['integer', 'exists:routine_executions,id'],
        ];

        $batchValidated = Validator::make($request->all(), $batchRules)->validate();

        return array_merge($validated, $batchValidated);
    }

    /**
     * Determine if export should be processed immediately
     */
    private function shouldProcessImmediately(string $format, int $executionCount): bool
    {
        // Never process PDFs immediately as they require Browsershot/Chrome
        // and can timeout in web requests
        return match ($format) {
            'csv' => $executionCount <= 50,
            'excel' => $executionCount <= 25,
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
                'error' => 'Export failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
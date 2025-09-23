<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\ChunkedUpload;
use App\Models\Production\Item;
use App\Services\MediaService;
use App\Services\Production\ItemImageBulkImportServiceV2;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ItemImageImportController extends Controller
{
    public function __construct(
        private ItemImageBulkImportServiceV2 $bulkService,
        private MediaService $mediaService
    ) {}

    /**
     * Show the bulk picture import wizard.
     */
    public function wizard(Request $request): Response
    {
        $this->authorize('import', Item::class);

        return Inertia::render('production/items/ItemImageImport/index', [
            'acceptedExtensions' => ['jpg', 'jpeg', 'png', 'webp', 'heif'],
            'maxFileSize' => 50, // MB
            'maxTotalSize' => 1024, // MB (1GB)
            'chunkSize' => 5, // MB
            'concurrentUploads' => 5,
            'sessionId' => $request->get('sessionId', null),
        ]);
    }

    /**
     * Initialize a new import session.
     */
    public function initSession(Request $request): JsonResponse
    {
        $this->authorize('import', Item::class);

        $sessionId = Str::uuid()->toString();
        $sessionData = [
            'user_id' => auth()->id(),
            'created_at' => now(),
            'status' => 'initialized',
            'files' => [],
            'processed' => 0,
            'total' => 0,
        ];

        Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        return response()->json([
            'sessionId' => $sessionId,
            'expiresAt' => now()->addHours(24)->toIso8601String(),
        ]);
    }

    /**
     * Validate files for import.
     */
    public function validateFiles(Request $request): JsonResponse
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'sessionId' => 'required|string|uuid',
            'files' => 'required|array',
            'files.*.name' => 'required|string',
            'files.*.size' => 'required|integer',
            'files.*.type' => 'required|string',
        ]);

        $sessionId = $request->input('sessionId');
        $files = $request->input('files');

        $results = [];
        $itemMatches = [];

        foreach ($files as $file) {
            $filename = $file['name'];
            $itemCode = $this->extractItemCode($filename);

            $validation = [
                'filename' => $filename,
                'valid' => true,
                'errors' => [],
                'itemCode' => $itemCode,
                'itemExists' => false,
                'itemName' => null,
                'hasExistingImage' => false,
            ];

            // Validate file extension
            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'heif'])) {
                $validation['valid'] = false;
                $validation['errors'][] = 'Invalid file type';
            }

            // Validate file size
            if ($file['size'] > 50 * 1024 * 1024) {
                $validation['valid'] = false;
                $validation['errors'][] = 'File too large (max 50MB)';
            }

            // Check if item exists
            if ($itemCode && $validation['valid']) {
                $item = Item::where('item_number', $itemCode)->first();
                if ($item) {
                    $validation['itemExists'] = true;
                    $validation['itemName'] = $item->name;
                    $validation['hasExistingImage'] = $item->hasMedia('images');

                    // Check for duplicate assignment
                    if (isset($itemMatches[$itemCode])) {
                        $validation['errors'][] = 'Multiple images assigned to same item';
                        $validation['valid'] = false;
                    } else {
                        $itemMatches[$itemCode] = $filename;
                    }
                } else {
                    $validation['valid'] = false;
                    $validation['errors'][] = 'Item not found';
                }
            } elseif (! $itemCode) {
                $validation['valid'] = false;
                $validation['errors'][] = 'No item code detected in filename';
            }

            $results[] = $validation;
        }

        // Update session with validation results
        $sessionData = Cache::get("image_import_session_{$sessionId}");
        if ($sessionData) {
            $sessionData['files'] = $results;
            $sessionData['total'] = count($files);
            Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));
        }

        return response()->json([
            'validations' => $results,
            'summary' => [
                'total' => count($files),
                'valid' => collect($results)->where('valid', true)->count(),
                'invalid' => collect($results)->where('valid', false)->count(),
                'replacements' => collect($results)->where('hasExistingImage', true)->count(),
            ],
        ]);
    }

    /**
     * Start chunked upload for a file.
     */
    public function startChunkedUpload(Request $request): JsonResponse
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'sessionId' => 'required|string|uuid',
            'filename' => 'required|string',
            'fileSize' => 'required|integer',
            'totalChunks' => 'required|integer',
            'fileHash' => 'nullable|string',
        ]);

        $uploadId = Str::uuid()->toString();
        $filename = $request->input('filename');
        $sessionId = $request->input('sessionId');

        Log::info('[ItemImageImport] Starting chunked upload', [
            'uploadId' => $uploadId,
            'sessionId' => $sessionId,
            'filename' => $filename,
            'fileSize' => $request->input('fileSize'),
            'totalChunks' => $request->input('totalChunks'),
            'fileHash' => $request->input('fileHash'),
            'userId' => auth()->id(),
        ]);

        // Extract item code using the same method as validation
        $itemCode = $this->extractItemCode($filename);

        // Find the item if code was extracted
        $item = null;
        if ($itemCode) {
            $item = Item::where('item_number', $itemCode)->first();
        }

        // Create chunked upload record
        $chunkedUpload = ChunkedUpload::create([
            'id' => $uploadId,
            'user_id' => auth()->id(),
            'filename' => $filename,
            'mime_type' => 'image/jpeg', // Default mime type, will be updated later
            'total_size' => $request->input('fileSize'),
            'total_chunks' => $request->input('totalChunks'),
            'uploaded_chunks' => [],
            'file_hash' => $request->input('fileHash'),
            'status' => 'pending',
            'model_type' => Item::class,
            'model_id' => $item ? $item->id : 0, // Set to actual item ID if found
            'collection' => 'images',
            'metadata' => [
                'sessionId' => $sessionId,
                'itemCode' => $itemCode,
                'itemFound' => $item !== null,
            ],
            'expires_at' => now()->addHours(24),
        ]);

        Log::info('[ItemImageImport] Chunked upload record created', [
            'uploadId' => $uploadId,
            'itemCode' => $itemCode,
            'itemId' => $item?->id,
            'itemFound' => $item !== null,
        ]);

        return response()->json([
            'uploadId' => $uploadId,
            'chunkSize' => 5 * 1024 * 1024, // 5MB chunks
        ]);
    }

    /**
     * Upload a file chunk.
     */
    public function uploadChunk(Request $request): JsonResponse
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'uploadId' => 'required|string|uuid',
            'chunkIndex' => 'required|integer|min:0',
            'chunk' => 'required|file',
        ]);

        $uploadId = $request->input('uploadId');
        $chunkIndex = $request->input('chunkIndex');

        Log::info('[ItemImageImport] Uploading chunk', [
            'uploadId' => $uploadId,
            'chunkIndex' => $chunkIndex,
            'chunkSize' => $request->file('chunk')->getSize(),
        ]);

        $chunkedUpload = ChunkedUpload::findOrFail($uploadId);

        // Store chunk
        $chunkPath = "chunks/{$uploadId}/chunk_{$chunkIndex}";
        Storage::disk('local')->put($chunkPath, $request->file('chunk')->get());

        // Update progress
        $currentUploadedChunks = $chunkedUpload->uploaded_chunks ?? [];
        if (! in_array($chunkIndex, $currentUploadedChunks)) {
            $currentUploadedChunks[] = $chunkIndex;
            $chunkedUpload->update([
                'uploaded_chunks' => $currentUploadedChunks,
            ]);
        }

        // If all chunks uploaded, assemble the file
        if (count($currentUploadedChunks) === $chunkedUpload->total_chunks) {
            Log::info('[ItemImageImport] All chunks uploaded, processing assembly', [
                'uploadId' => $uploadId,
                'totalChunks' => $chunkedUpload->total_chunks,
                'modelId' => $chunkedUpload->model_id,
            ]);

            // Update status to processing
            $chunkedUpload->update(['status' => 'processing']);

            // If we have a valid model_id, dispatch assembly job
            if ($chunkedUpload->model_id > 0) {
                Log::info('[ItemImageImport] Dispatching AssembleChunkedUpload job', [
                    'uploadId' => $chunkedUpload->id,
                    'modelId' => $chunkedUpload->model_id,
                    'filename' => $chunkedUpload->filename,
                ]);
                dispatch(new \App\Jobs\AssembleChunkedUpload($chunkedUpload->id));
            } else {
                Log::warning('[ItemImageImport] No item found for upload', [
                    'uploadId' => $uploadId,
                    'filename' => $chunkedUpload->filename,
                    'metadata' => $chunkedUpload->metadata,
                ]);
                // Mark as completed but not attached to any item
                $chunkedUpload->update([
                    'status' => 'completed',
                    'metadata' => array_merge($chunkedUpload->metadata ?? [], [
                        'warning' => 'No item found for attachment',
                        'completed_at' => now(),
                    ]),
                ]);
            }
        }

        return response()->json([
            'uploaded' => count($currentUploadedChunks),
            'total' => $chunkedUpload->total_chunks,
            'complete' => count($currentUploadedChunks) === $chunkedUpload->total_chunks,
        ]);
    }

    /**
     * Process uploaded files.
     */
    public function processUploads(Request $request): JsonResponse
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'sessionId' => 'required|string|uuid',
            'options' => 'array',
            'options.replaceExisting' => 'boolean',
            'options.skipDuplicates' => 'boolean',
            'options.generateBlurhash' => 'boolean',
            'options.quality' => 'integer|min:1|max:100',
        ]);

        $sessionId = $request->input('sessionId');
        $options = $request->input('options', []);

        Log::info('[ItemImageImport] Processing uploads requested', [
            'sessionId' => $sessionId,
            'options' => $options,
            'userId' => auth()->id(),
        ]);

        $sessionData = Cache::get("image_import_session_{$sessionId}");
        if (! $sessionData) {
            Log::error('[ItemImageImport] Session not found for processing', [
                'sessionId' => $sessionId,
            ]);

            return response()->json(['error' => 'Session not found'], 404);
        }

        Log::info('[ItemImageImport] Session data found', [
            'sessionId' => $sessionId,
            'status' => $sessionData['status'],
            'filesCount' => count($sessionData['files'] ?? []),
            'validFiles' => collect($sessionData['files'] ?? [])->where('valid', true)->count(),
        ]);

        // Start processing in background
        Log::info('[ItemImageImport] Dispatching ProcessImageImportSession job', [
            'sessionId' => $sessionId,
            'options' => $options,
        ]);
        dispatch(new \App\Jobs\Production\ProcessImageImportSession($sessionId, $options));

        return response()->json([
            'status' => 'processing',
            'message' => 'Import processing started',
        ]);
    }

    /**
     * Get import session status.
     */
    public function getSessionStatus(Request $request, string $sessionId): JsonResponse
    {
        $this->authorize('import', Item::class);

        $sessionData = Cache::get("image_import_session_{$sessionId}");
        if (! $sessionData) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        // Get upload status for this session
        $uploads = ChunkedUpload::where('metadata->sessionId', $sessionId)
            ->get()
            ->map(function ($upload) {
                return [
                    'id' => $upload->id,
                    'filename' => $upload->filename,
                    'status' => $upload->status,
                    'progress' => $upload->isComplete() ? 100 :
                        ($upload->total_chunks > 0 ? (count($upload->uploaded_chunks) / $upload->total_chunks) * 100 : 0),
                    'model_id' => $upload->model_id,
                    'error' => $upload->metadata['error'] ?? null,
                ];
            });

        // Check if all uploads are complete
        $allComplete = $uploads->every(fn ($u) => in_array($u['status'], ['completed', 'failed']));

        // Update session status
        if ($allComplete && $sessionData['status'] !== 'completed') {
            $sessionData['status'] = 'completed';
            $sessionData['uploads'] = $uploads->toArray();
            Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));
        }

        return response()->json(array_merge($sessionData, [
            'uploads' => $uploads,
        ]));
    }

    /**
     * Cancel import session.
     */
    public function cancelSession(Request $request, string $sessionId): JsonResponse
    {
        $this->authorize('import', Item::class);

        $sessionData = Cache::get("image_import_session_{$sessionId}");
        if (! $sessionData) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        // Clean up any temporary files
        Storage::disk('local')->deleteDirectory("chunks/{$sessionId}");
        Cache::forget("image_import_session_{$sessionId}");

        return response()->json(['message' => 'Session cancelled']);
    }

    /**
     * Check for duplicate images by hash.
     */
    public function checkDuplicates(Request $request): JsonResponse
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'hashes' => 'required|array',
            'hashes.*' => 'required|string',
        ]);

        $hashes = $request->input('hashes');

        // Check in media table
        $existingMedia = DB::table('media')
            ->whereIn('file_hash', $hashes)
            ->select('file_hash', 'model_type', 'model_id', 'name')
            ->get();

        // Check in item_images table (legacy)
        $existingImages = DB::table('item_images')
            ->whereIn('hash', $hashes)
            ->select('hash', 'item_id', 'filename')
            ->get();

        $duplicates = [];

        foreach ($existingMedia as $media) {
            if ($media->model_type === 'App\\Models\\Production\\Item') {
                $item = Item::find($media->model_id);
                $duplicates[$media->file_hash] = [
                    'type' => 'media',
                    'itemNumber' => $item?->item_number,
                    'itemName' => $item?->name,
                    'filename' => $media->name,
                ];
            }
        }

        foreach ($existingImages as $image) {
            $item = Item::find($image->item_id);
            $duplicates[$image->hash] = [
                'type' => 'legacy',
                'itemNumber' => $item?->item_number,
                'itemName' => $item?->name,
                'filename' => $image->filename,
            ];
        }

        return response()->json(['duplicates' => $duplicates]);
    }

    /**
     * Extract item code from filename.
     */
    private function extractItemCode(string $filename): ?string
    {
        // Remove file extension
        $name = pathinfo($filename, PATHINFO_FILENAME);

        // Trim whitespace
        $name = trim($name);

        // The entire filename (without extension) is the item code
        // This means "ITEM-001-1" is treated as item code "ITEM-001-1", not "ITEM-001"
        return $name ?: null;
    }

    /**
     * Legacy single-batch import (limited to 20 files for backward compatibility).
     */
    public function import(Request $request)
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'matching_key' => 'required|string|in:item_number',
            'manifest' => 'required|string',
            'files' => 'required|array|max:20',
            'files.*' => 'file|image|mimes:jpg,jpeg,png,webp,heic,heif|max:10240',
        ]);

        $matchingKey = $request->string('matching_key')->toString();
        $manifest = json_decode($request->string('manifest')->toString(), true);
        if (! is_array($manifest)) {
            return back()->withErrors(['manifest' => 'Invalid manifest JSON.']);
        }

        $uploadedFiles = $request->file('files', []);

        // Use the new Media Library service
        $summary = $this->bulkService->importFromManifest($matchingKey, $manifest, $uploadedFiles);

        // Prepare the success message following project standard
        $message = "Importadas {$summary['imagesImported']} imagens em {$summary['itemsAffected']} itens com sucesso.";

        if ($summary['imagesSkipped'] > 0) {
            $message .= " {$summary['imagesSkipped']} imagens foram ignoradas.";
        }

        if (count($summary['errors']) > 0) {
            $message .= ' Alguns erros ocorreram durante a importação.';
        }

        return redirect()
            ->route('production.items.index')
            ->with('success', $message)
            ->with('imageImportSummary', $summary);
    }
}

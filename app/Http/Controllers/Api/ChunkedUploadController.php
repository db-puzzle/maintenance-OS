<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaResource;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class ChunkedUploadController extends Controller
{
    private MediaService $mediaService;

    public function __construct(MediaService $mediaService)
    {
        $this->middleware('auth:sanctum');
        $this->mediaService = $mediaService;
    }

    /**
     * Upload a file chunk.
     */
    public function uploadChunk(Request $request): JsonResponse
    {
        $request->validate([
            'chunk' => 'required|file',
            'upload_id' => 'required|string',
            'chunk_index' => 'required|integer|min:0',
            'total_chunks' => 'required|integer|min:1',
            'file_hash' => 'required|string',
        ]);

        $uploadId = $request->input('upload_id');
        $chunkIndex = $request->input('chunk_index');
        $totalChunks = $request->input('total_chunks');
        $fileHash = $request->input('file_hash');

        // Store chunk temporarily
        $chunkPath = "chunks/{$uploadId}/{$chunkIndex}";
        Storage::disk('local')->put($chunkPath, $request->file('chunk')->get());

        // Track upload progress
        $uploadKey = "upload:{$uploadId}";
        $uploadData = Cache::get($uploadKey, [
            'chunks' => [],
            'total_chunks' => $totalChunks,
            'file_hash' => $fileHash,
            'user_id' => auth()->id(),
            'started_at' => now(),
        ]);

        $uploadData['chunks'][] = $chunkIndex;
        $uploadData['updated_at'] = now();

        // Extend cache TTL
        Cache::put($uploadKey, $uploadData, now()->addHours(24));

        // Check if all chunks are uploaded
        if (count($uploadData['chunks']) === $totalChunks) {
            dispatch(new \App\Jobs\AssembleChunkedUpload($uploadId));
        }

        return response()->json([
            'success' => true,
            'chunk_index' => $chunkIndex,
            'total_uploaded' => count($uploadData['chunks']),
            'total_chunks' => $totalChunks,
        ]);
    }

    /**
     * Finalize chunked upload.
     */
    public function finalizeUpload(Request $request): JsonResponse
    {
        $request->validate([
            'upload_id' => 'required|string',
            'filename' => 'required|string',
            'mime_type' => 'required|string',
            'model_type' => 'required|string',
            'model_id' => 'required',
            'collection' => 'required|string',
        ]);

        $uploadId = $request->input('upload_id');
        $uploadData = Cache::get("upload:{$uploadId}");

        if (! $uploadData || $uploadData['user_id'] !== auth()->id()) {
            return response()->json(['error' => 'Invalid upload'], 403);
        }

        // Verify all chunks are present
        if (count($uploadData['chunks']) !== $uploadData['total_chunks']) {
            return response()->json([
                'error' => 'Missing chunks',
                'uploaded' => count($uploadData['chunks']),
                'expected' => $uploadData['total_chunks'],
            ], 400);
        }

        // Assemble file from chunks
        $assembledPath = $this->assembleChunks($uploadId, $uploadData);

        // Find the model
        $model = $this->findModel($request->input('model_type'), $request->input('model_id'));

        // Create media record
        $media = $model->addMedia($assembledPath)
            ->withCustomProperties([
                'uploaded_by' => auth()->id(),
                'upload_method' => 'chunked',
                'file_hash' => $uploadData['file_hash'],
            ])
            ->usingName(pathinfo($request->input('filename'), PATHINFO_FILENAME))
            ->usingFileName($request->input('filename'))
            ->toMediaCollection($request->input('collection'));

        // Cleanup chunks
        Storage::disk('local')->deleteDirectory("chunks/{$uploadId}");
        Cache::forget("upload:{$uploadId}");

        return response()->json([
            'success' => true,
            'media' => new MediaResource($media),
        ]);
    }

    /**
     * Get upload status.
     */
    public function getUploadStatus(Request $request, string $uploadId): JsonResponse
    {
        $uploadData = Cache::get("upload:{$uploadId}");

        if (! $uploadData || $uploadData['user_id'] !== auth()->id()) {
            return response()->json(['error' => 'Invalid upload'], 404);
        }

        return response()->json([
            'success' => true,
            'upload_id' => $uploadId,
            'chunks_uploaded' => count($uploadData['chunks']),
            'total_chunks' => $uploadData['total_chunks'],
            'progress' => round((count($uploadData['chunks']) / $uploadData['total_chunks']) * 100, 2),
            'started_at' => $uploadData['started_at'],
            'updated_at' => $uploadData['updated_at'] ?? null,
        ]);
    }

    /**
     * Cancel upload.
     */
    public function cancelUpload(Request $request, string $uploadId): JsonResponse
    {
        $uploadData = Cache::get("upload:{$uploadId}");

        if (! $uploadData || $uploadData['user_id'] !== auth()->id()) {
            return response()->json(['error' => 'Invalid upload'], 404);
        }

        // Cleanup
        Storage::disk('local')->deleteDirectory("chunks/{$uploadId}");
        Cache::forget("upload:{$uploadId}");

        return response()->json([
            'success' => true,
            'message' => 'Upload cancelled',
        ]);
    }

    /**
     * Assemble chunks into final file.
     */
    private function assembleChunks(string $uploadId, array $uploadData): string
    {
        $tempPath = storage_path("app/temp/{$uploadId}_assembled");
        $handle = fopen($tempPath, 'wb');

        // Sort chunks to ensure correct order
        sort($uploadData['chunks']);

        foreach ($uploadData['chunks'] as $chunkIndex) {
            $chunkPath = "chunks/{$uploadId}/{$chunkIndex}";
            $chunkContent = Storage::disk('local')->get($chunkPath);
            fwrite($handle, $chunkContent);
        }

        fclose($handle);

        // Verify file hash
        $actualHash = md5_file($tempPath);
        if ($actualHash !== $uploadData['file_hash']) {
            unlink($tempPath);
            throw new \Exception('File integrity check failed');
        }

        return $tempPath;
    }

    /**
     * Find model by type and ID.
     */
    protected function findModel(string $modelType, $modelId)
    {
        $allowedModels = [
            'item' => \App\Models\Production\Item::class,
            'work_order' => \App\Models\WorkOrders\WorkOrder::class,
            'work_order_execution' => \App\Models\WorkOrders\WorkOrderExecution::class,
            'user' => \App\Models\User::class,
            'qr_tag_template' => \App\Models\QrTagTemplate::class,
        ];

        if (! isset($allowedModels[$modelType])) {
            abort(422, 'Invalid model type');
        }

        $modelClass = $allowedModels[$modelType];

        return $modelClass::findOrFail($modelId);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaResource;
use App\Jobs\AssembleChunkedUpload;
use App\Models\ChunkedUpload;
use App\Services\Media\DuplicateDetectionService;
use App\Services\MediaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdvancedChunkedUploadController extends Controller
{
    private MediaService $mediaService;
    private DuplicateDetectionService $duplicateService;

    public function __construct(
        MediaService $mediaService,
        DuplicateDetectionService $duplicateService
    ) {
        $this->mediaService = $mediaService;
        $this->duplicateService = $duplicateService;
    }

    public function initializeUpload(Request $request): JsonResponse
    {
        $request->validate([
            'filename' => 'required|string',
            'mime_type' => 'required|string',
            'total_size' => 'required|integer|min:1',
            'total_chunks' => 'required|integer|min:1',
            'file_hash' => 'required|string',
            'model_type' => 'required|string',
            'model_id' => 'required',
            'collection' => 'required|string',
            'check_duplicates' => 'boolean',
        ]);

        // Check for duplicates if requested
        if ($request->input('check_duplicates', true)) {
            $duplicates = $this->duplicateService->checkByFileHash($request->input('file_hash'));

            if ($duplicates->isNotEmpty()) {
                return response()->json([
                    'duplicate' => true,
                    'matches' => MediaResource::collection($duplicates),
                ], 409);
            }
        }

        // Create chunked upload record
        $upload = ChunkedUpload::create([
            'id' => Str::uuid(),
            'user_id' => auth()->id(),
            'filename' => $request->input('filename'),
            'mime_type' => $request->input('mime_type'),
            'total_size' => $request->input('total_size'),
            'total_chunks' => $request->input('total_chunks'),
            'uploaded_chunks' => [],
            'file_hash' => $request->input('file_hash'),
            'status' => 'pending',
            'model_type' => $request->input('model_type'),
            'model_id' => $request->input('model_id'),
            'collection' => $request->input('collection'),
            'metadata' => $request->input('metadata', []),
            'expires_at' => now()->addHours(24),
        ]);

        return response()->json([
            'upload_id' => $upload->id,
            'chunk_size' => config('media.chunk_size', 5 * 1024 * 1024),
            'expires_at' => $upload->expires_at,
        ], 201);
    }

    public function uploadChunk(Request $request): JsonResponse
    {
        $request->validate([
            'chunk' => 'required|file',
            'upload_id' => 'required|uuid',
            'chunk_index' => 'required|integer|min:0',
        ]);

        $upload = ChunkedUpload::where('id', $request->input('upload_id'))
            ->where('user_id', auth()->id())
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->firstOrFail();

        $chunkIndex = $request->input('chunk_index');

        // Validate chunk index
        if ($chunkIndex >= $upload->total_chunks) {
            return response()->json(['error' => 'Invalid chunk index'], 400);
        }

        // Check if chunk already uploaded
        if (in_array($chunkIndex, $upload->uploaded_chunks)) {
            return response()->json([
                'success' => true,
                'chunk_index' => $chunkIndex,
                'already_uploaded' => true,
            ]);
        }

        // Store chunk
        $chunkPath = "chunks/{$upload->id}/{$chunkIndex}";
        Storage::disk('local')->put($chunkPath, $request->file('chunk')->get());

        // Update upload record
        $uploadedChunks = $upload->uploaded_chunks;
        $uploadedChunks[] = $chunkIndex;

        $upload->uploaded_chunks = $uploadedChunks;
        $upload->save();

        // Check if all chunks are uploaded
        if (count($uploadedChunks) === $upload->total_chunks) {
            $upload->status = 'processing';
            $upload->save();

            dispatch(new AssembleChunkedUpload($upload->id));
        }

        return response()->json([
            'success' => true,
            'chunk_index' => $chunkIndex,
            'total_uploaded' => count($uploadedChunks),
            'total_chunks' => $upload->total_chunks,
            'progress' => round((count($uploadedChunks) / $upload->total_chunks) * 100, 2),
        ]);
    }

    public function getUploadStatus(string $uploadId): JsonResponse
    {
        $upload = ChunkedUpload::where('id', $uploadId)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $missingChunks = [];
        for ($i = 0; $i < $upload->total_chunks; $i++) {
            if (! in_array($i, $upload->uploaded_chunks)) {
                $missingChunks[] = $i;
            }
        }

        return response()->json([
            'upload_id' => $upload->id,
            'status' => $upload->status,
            'chunks_uploaded' => count($upload->uploaded_chunks),
            'total_chunks' => $upload->total_chunks,
            'missing_chunks' => $missingChunks,
            'progress' => round((count($upload->uploaded_chunks) / $upload->total_chunks) * 100, 2),
            'expires_at' => $upload->expires_at,
        ]);
    }

    public function resumeUpload(string $uploadId): JsonResponse
    {
        $upload = ChunkedUpload::where('id', $uploadId)
            ->where('user_id', auth()->id())
            ->where('status', '!=', 'completed')
            ->firstOrFail();

        // Extend expiration
        $upload->expires_at = now()->addHours(24);
        $upload->save();

        $missingChunks = [];
        for ($i = 0; $i < $upload->total_chunks; $i++) {
            if (! in_array($i, $upload->uploaded_chunks)) {
                $missingChunks[] = $i;
            }
        }

        return response()->json([
            'upload_id' => $upload->id,
            'missing_chunks' => $missingChunks,
            'chunk_size' => config('media.chunk_size', 5 * 1024 * 1024),
            'expires_at' => $upload->expires_at,
        ]);
    }

    public function cancelUpload(string $uploadId): JsonResponse
    {
        $upload = ChunkedUpload::where('id', $uploadId)
            ->where('user_id', auth()->id())
            ->where('status', '!=', 'completed')
            ->firstOrFail();

        // Clean up chunks
        Storage::disk('local')->deleteDirectory("chunks/{$upload->id}");

        $upload->status = 'cancelled';
        $upload->save();

        return response()->json(['success' => true]);
    }

    protected function findModel(string $modelType, $modelId): \Illuminate\Database\Eloquent\Model
    {
        $modelClass = $modelType;

        if (! class_exists($modelClass)) {
            throw new ModelNotFoundException("Model class {$modelClass} not found");
        }

        $model = $modelClass::find($modelId);

        if (! $model) {
            throw new ModelNotFoundException("Model {$modelClass} with ID {$modelId} not found");
        }

        // Check authorization
        if (! Gate::allows('uploadMedia', $model)) {
            abort(403, 'Unauthorized to upload media to this model');
        }

        return $model;
    }
}

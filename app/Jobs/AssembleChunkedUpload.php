<?php

namespace App\Jobs;

use App\Models\ChunkedUpload;
use App\Services\MediaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\UploadedFile;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AssembleChunkedUpload implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public $tries = 3;

    public $backoff = [60, 180, 300];

    protected string $uploadId;

    public function __construct(string $uploadId)
    {
        $this->uploadId = $uploadId;
    }

    public function handle(MediaService $mediaService): void
    {
        Log::info('[AssembleChunkedUpload] Starting job', [
            'uploadId' => $this->uploadId,
        ]);

        $upload = ChunkedUpload::find($this->uploadId);

        if (! $upload) {
            Log::warning("[AssembleChunkedUpload] Chunked upload not found: {$this->uploadId}");

            return;
        }

        Log::info('[AssembleChunkedUpload] Upload found', [
            'uploadId' => $this->uploadId,
            'status' => $upload->status,
            'totalChunks' => $upload->total_chunks,
            'uploadedChunks' => count($upload->uploaded_chunks),
            'modelType' => $upload->model_type,
            'modelId' => $upload->model_id,
            'metadata' => $upload->metadata,
        ]);

        if (! $upload->isComplete()) {
            Log::error("[AssembleChunkedUpload] Upload not complete: {$this->uploadId}. Expected {$upload->total_chunks}, found " . count($upload->uploaded_chunks), [
                'expected' => $upload->total_chunks,
                'found' => count($upload->uploaded_chunks),
                'uploadedChunks' => $upload->uploaded_chunks,
            ]);
            $upload->status = 'failed';
            $upload->save();

            return;
        }

        try {
            Log::info('[AssembleChunkedUpload] Assembling chunks', [
                'uploadId' => $this->uploadId,
            ]);

            $tempPath = $this->assembleChunks($upload);

            Log::info('[AssembleChunkedUpload] Chunks assembled successfully', [
                'uploadId' => $this->uploadId,
                'tempPath' => $tempPath,
                'fileSize' => filesize($tempPath),
            ]);

            $modelClass = $upload->model_type;
            $modelId = $upload->model_id;
            $collection = $upload->collection;
            $fileName = $upload->filename;

            Log::info('[AssembleChunkedUpload] Looking for model', [
                'uploadId' => $this->uploadId,
                'modelClass' => $modelClass,
                'modelId' => $modelId,
                'collection' => $collection,
            ]);

            $model = $modelClass::find($modelId);

            if (! $model) {
                throw new ModelNotFoundException("Model {$modelClass} with ID {$modelId} not found");
            }

            Log::info('[AssembleChunkedUpload] Model found', [
                'uploadId' => $this->uploadId,
                'modelType' => get_class($model),
                'modelId' => $model->id,
            ]);

            // Check if this is part of an import session
            $sessionId = $upload->metadata['sessionId'] ?? null;

            if ($sessionId) {
                // This is part of an import session, store file for later processing
                Log::info('[AssembleChunkedUpload] Part of import session, storing for later processing', [
                    'uploadId' => $this->uploadId,
                    'sessionId' => $sessionId,
                    'fileName' => $fileName,
                ]);

                // Create directory for session files
                $sessionDir = "imports/{$sessionId}";
                Storage::disk('local')->makeDirectory($sessionDir);

                // Move assembled file to session directory
                $sessionFilePath = "{$sessionDir}/{$fileName}";
                Storage::disk('local')->put($sessionFilePath, file_get_contents($tempPath));

                Log::info('[AssembleChunkedUpload] File stored for import session', [
                    'uploadId' => $this->uploadId,
                    'sessionId' => $sessionId,
                    'filePath' => $sessionFilePath,
                ]);

                // Update upload status without creating media yet
                $upload->status = 'completed';
                $upload->metadata = array_merge($upload->metadata, [
                    'stored_path' => $sessionFilePath,
                    'completed_at' => now(),
                ]);
                $upload->save();
            } else {
                // Not part of import session, process normally
                // Create uploaded file instance
                $uploadedFile = new UploadedFile(
                    $tempPath,
                    $fileName,
                    $upload->mime_type,
                    null,
                    true
                );

                // Add media
                Log::info('[AssembleChunkedUpload] Adding media to model', [
                    'uploadId' => $this->uploadId,
                    'collection' => $collection,
                    'fileName' => $fileName,
                ]);

                $media = $mediaService->addMedia($model, $uploadedFile, $collection, [
                    'uploaded_by' => $upload->user_id,
                    'upload_method' => 'chunked',
                    'file_hash' => $upload->file_hash,
                    'original_size' => $upload->total_size,
                ]);

                Log::info('[AssembleChunkedUpload] Media added successfully', [
                    'uploadId' => $this->uploadId,
                    'mediaId' => $media->id,
                    'mediaUrl' => $media->getUrl(),
                ]);

                // Update upload status
                $upload->status = 'completed';
                $upload->metadata = array_merge($upload->metadata, [
                    'media_id' => $media->id,
                    'completed_at' => now(),
                ]);
                $upload->save();
            }

            Log::info("[AssembleChunkedUpload] Chunked upload {$this->uploadId} assembled successfully", [
                'sessionId' => $sessionId,
                'size' => $upload->total_size,
            ]);

            // Cleanup
            Storage::disk('local')->deleteDirectory("chunks/{$upload->id}");
            unlink($tempPath);
        } catch (\Exception $e) {
            Log::error("Failed to assemble chunked upload {$this->uploadId}", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $upload->status = 'failed';
            $upload->metadata = array_merge($upload->metadata, [
                'error' => $e->getMessage(),
                'failed_at' => now(),
            ]);
            $upload->save();

            // Cleanup on failure
            Storage::disk('local')->deleteDirectory("chunks/{$upload->id}");

            throw $e;
        }
    }

    private function assembleChunks(ChunkedUpload $upload): string
    {
        $tempDir = storage_path('app/temp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $tempPath = $tempDir . '/' . $upload->id . '_assembled';
        $handle = fopen($tempPath, 'wb');

        // Sort chunks to ensure correct order
        $chunks = $upload->uploaded_chunks;
        sort($chunks);

        foreach ($chunks as $chunkIndex) {
            $chunkPath = "chunks/{$upload->id}/chunk_{$chunkIndex}";

            if (! Storage::disk('local')->exists($chunkPath)) {
                fclose($handle);
                unlink($tempPath);
                throw new \Exception("Missing chunk {$chunkIndex}");
            }

            $chunkContent = Storage::disk('local')->get($chunkPath);
            fwrite($handle, $chunkContent);
        }

        fclose($handle);

        // Verify file hash
        $actualHash = md5_file($tempPath);
        if ($actualHash !== $upload->file_hash) {
            unlink($tempPath);
            throw new \Exception('File integrity check failed');
        }

        return $tempPath;
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('AssembleChunkedUpload job failed permanently', [
            'upload_id' => $this->uploadId,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);

        // Mark upload as failed
        $upload = ChunkedUpload::find($this->uploadId);
        if ($upload) {
            $upload->status = 'failed';
            $upload->metadata = array_merge($upload->metadata ?? [], [
                'error' => $exception->getMessage(),
                'failed_at' => now(),
            ]);
            $upload->save();
        }

        // Clean up chunks
        Storage::disk('local')->deleteDirectory("chunks/{$this->uploadId}");
    }
}

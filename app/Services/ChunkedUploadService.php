<?php

namespace App\Services;

use App\Models\ChunkedUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class ChunkedUploadService
{
    /**
     * Handle chunk upload - always stored locally during assembly
     * Implements the chunked upload pattern from Advanced Media Features spec.
     */
    public function storeChunk(string $uploadId, int $chunkIndex, UploadedFile $chunk): void
    {
        $chunkPath = "chunks/{$uploadId}/{$chunkIndex}";
        Storage::disk('temp')->put($chunkPath, $chunk->get());
    }

    /**
     * Assemble chunks and add to media library.
     */
    public function assembleAndStore(ChunkedUpload $upload, HasMedia $model, string $collection): Media
    {
        // Assemble chunks locally
        $tempPath = $this->assembleChunks($upload);

        try {
            // Create UploadedFile from assembled file
            $file = new UploadedFile(
                $tempPath,
                $upload->filename,
                $upload->mime_type,
                null,
                true
            );

            // Add to media library (will upload to R2 if in production)
            $media = $model->addMedia($file)
                ->withCustomProperties([
                    'uploaded_by' => $upload->user_id,
                    'chunked_upload' => true,
                    'original_size' => $upload->total_size,
                ])
                ->toMediaCollection($collection);

            // Clean up
            $this->cleanup($upload->id);
            unlink($tempPath);

            return $media;
        } catch (\Exception $e) {
            // Clean up on failure
            $this->cleanup($upload->id);
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
            throw $e;
        }
    }

    /**
     * Assemble chunks into a single file.
     */
    private function assembleChunks(ChunkedUpload $upload): string
    {
        $tempPath = tempnam(sys_get_temp_dir(), 'upload_');
        $handle = fopen($tempPath, 'wb');

        for ($i = 0; $i < $upload->total_chunks; $i++) {
            $chunkPath = "chunks/{$upload->id}/{$i}";
            $chunkContent = Storage::disk('temp')->get($chunkPath);
            fwrite($handle, $chunkContent);
        }

        fclose($handle);

        return $tempPath;
    }

    /**
     * Clean up chunk files.
     */
    private function cleanup(string $uploadId): void
    {
        Storage::disk('temp')->deleteDirectory("chunks/{$uploadId}");
    }
}

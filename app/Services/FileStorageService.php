<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class FileStorageService
{
    /**
     * Store any file using appropriate method
     */
    public function store(
        UploadedFile $file,
        HasMedia $model,
        string $collection,
        array $properties = []
    ): Media {
        // For large files (>10MB), consider using chunked upload
        if ($file->getSize() > 10 * 1024 * 1024) {
            // In the future, this could integrate with ChunkedUploadService
            // For now, we'll use standard upload
        }
        
        // Standard upload via Spatie
        return $model->addMedia($file)
            ->withCustomProperties($properties)
            ->toMediaCollection($collection);
    }
    
    /**
     * Get file for local processing
     */
    public function getForLocalProcessing(Media $media): string
    {
        // If already local, return path
        if ($this->isLocalMedia($media)) {
            return $media->getPath();
        }
        
        // Download to temp
        return $this->downloadToTemp($media);
    }
    
    /**
     * Store temporary file (always local)
     */
    public function storeTemp(UploadedFile $file, string $directory = 'temp'): string
    {
        return Storage::disk('temp')->putFile($directory, $file);
    }
    
    /**
     * Move temp file to media library
     */
    public function moveFromTemp(
        string $tempPath,
        HasMedia $model,
        string $collection,
        string $filename = null
    ): Media {
        $fullPath = Storage::disk('temp')->path($tempPath);
        
        return $model->addMedia($fullPath)
            ->usingName($filename ?: basename($tempPath))
            ->toMediaCollection($collection);
    }
    
    /**
     * Check if media is stored locally
     */
    private function isLocalMedia(Media $media): bool
    {
        return in_array($media->disk, ['local', 'media-local', 'public']);
    }
    
    /**
     * Download media to temporary file
     */
    private function downloadToTemp(Media $media): string
    {
        $tempPath = tempnam(sys_get_temp_dir(), 'media_');
        $content = Storage::disk($media->disk)->get($media->getPath());
        file_put_contents($tempPath, $content);
        return $tempPath;
    }
    
    /**
     * Clean up temporary file
     */
    public function cleanupTemp(string $tempPath): void
    {
        if (file_exists($tempPath) && is_file($tempPath)) {
            unlink($tempPath);
        }
    }
}

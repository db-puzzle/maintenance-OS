<?php

namespace App\Services\Media;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;

class MediaImageProcessingService
{
    /**
     * Process images that need local file access
     */
    public function processMediaImage(Media $media, callable $processor): Media
    {
        // For local storage, process directly
        if ($this->isLocalDisk($media->disk)) {
            $path = $media->getPath();
            $result = $processor($path);
            $this->updateMediaWithResult($media, $result);
            return $media;
        }
        
        // For cloud storage, download to temp first
        $tempPath = $this->downloadToTemp($media);
        
        try {
            $result = $processor($tempPath);
            $this->updateMediaWithResult($media, $result);
            return $media;
        } finally {
            // Always clean up temp file
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
        }
    }
    
    /**
     * Download media to temporary file
     */
    private function downloadToTemp(Media $media): string
    {
        $tempPath = tempnam(sys_get_temp_dir(), 'media_');
        $stream = Storage::disk($media->disk)->readStream($media->getPath());
        file_put_contents($tempPath, $stream);
        return $tempPath;
    }
    
    /**
     * Check if disk is local
     */
    private function isLocalDisk(string $disk): bool
    {
        return in_array($disk, ['local', 'media-local', 'public']);
    }
    
    /**
     * Update media with processing result
     */
    private function updateMediaWithResult(Media $media, array $result): void
    {
        $media->setCustomProperty('processing_result', $result);
        $media->save();
    }
}

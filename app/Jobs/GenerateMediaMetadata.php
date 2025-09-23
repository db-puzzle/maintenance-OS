<?php

namespace App\Jobs;

use App\Models\Media;
use App\Services\Media\BlurHashService;
use App\Services\Media\ImageHashService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateMediaMetadata implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public $tries = 3;

    public $backoff = [60, 180, 300];

    protected Media $media;

    public function __construct(Media $media)
    {
        $this->media = $media;
    }

    public function handle(ImageHashService $hashService, BlurHashService $blurHashService): void
    {
        try {
            // Get the file path
            $path = Storage::disk($this->media->disk)->path($this->media->getPathRelativeToRoot());

            // Generate file hash
            $this->media->file_hash = $hashService->generateFileHash($path);

            // For images, generate additional metadata
            if ($this->media->is_image) {
                // Generate perceptual hash
                $this->media->perceptual_hash = $hashService->generatePerceptualHash($path);

                // Generate BlurHash
                $this->media->blurhash = $blurHashService->generateBlurHash($path);

                // Extract dominant color
                $this->media->dominant_color = $hashService->extractDominantColor($path);

                // Get image dimensions
                $dimensions = $hashService->getImageDimensions($path);
                if ($dimensions) {
                    $this->media->width = $dimensions['width'];
                    $this->media->height = $dimensions['height'];
                    $this->media->aspect_ratio = $dimensions['aspect_ratio'];
                }

                // Calculate compression ratio if we have original size
                if ($this->media->original_size) {
                    $this->media->compression_ratio = round(
                        1 - ($this->media->size / $this->media->original_size),
                        2
                    );
                }
            }

            $this->media->save();
        } catch (\Exception $e) {
            Log::error('Failed to generate media metadata', [
                'media_id' => $this->media->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('GenerateMediaMetadata job failed', [
            'media_id' => $this->media->id,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}

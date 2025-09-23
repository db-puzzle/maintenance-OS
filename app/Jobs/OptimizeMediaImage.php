<?php

namespace App\Jobs;

use App\Models\Media;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Spatie\ImageOptimizer\OptimizerChainFactory;

class OptimizeMediaImage implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public $tries = 3;
    public $backoff = [60, 180, 300]; // Exponential backoff

    protected Media $media;

    /**
     * Create a new job instance.
     */
    public function __construct(Media $media)
    {
        $this->media = $media;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        if (! $this->media->is_image) {
            return;
        }

        $optimizerChain = OptimizerChainFactory::create();

        // Download to temp
        $tempPath = tempnam(sys_get_temp_dir(), 'optimize_');
        file_put_contents($tempPath, Storage::disk($this->media->disk)->get($this->media->getPathRelativeToRoot()));

        // Store original size
        $originalSize = filesize($tempPath);

        // Optimize
        $optimizerChain->optimize($tempPath);

        // Get new size
        $optimizedSize = filesize($tempPath);

        // Only update if we achieved meaningful compression
        if ($optimizedSize < $originalSize * 0.95) { // At least 5% reduction
            // Re-upload
            Storage::disk($this->media->disk)->put(
                $this->media->getPathRelativeToRoot(),
                file_get_contents($tempPath)
            );

            // Update size
            $this->media->size = $optimizedSize;
            $this->media->setCustomProperty('was_optimized', true);
            $this->media->setCustomProperty('optimization_ratio', round(($originalSize - $optimizedSize) / $originalSize * 100, 2));
            $this->media->save();

            // Log optimization
            activity()
                ->performedOn($this->media)
                ->withProperties([
                    'original_size' => $originalSize,
                    'optimized_size' => $optimizedSize,
                    'savings_bytes' => $originalSize - $optimizedSize,
                    'savings_percentage' => round(($originalSize - $optimizedSize) / $originalSize * 100, 2),
                ])
                ->log('media_optimized');
        }

        // Cleanup
        @unlink($tempPath);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        activity()
            ->performedOn($this->media)
            ->withProperties([
                'error' => $exception->getMessage(),
            ])
            ->log('media_optimization_failed');
    }
}

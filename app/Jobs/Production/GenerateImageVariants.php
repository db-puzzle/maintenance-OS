<?php

namespace App\Jobs\Production;

use App\Models\Production\ItemImage;
use App\Services\Production\ImageProcessingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateImageVariants implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    /**
     * Create a new job instance.
     */
    public function __construct(
        private ItemImage $itemImage
    ) {}
    
    /**
     * Execute the job.
     */
    public function handle(ImageProcessingService $imageService): void
    {
        $variants = $imageService->generateVariants(
            $this->itemImage->id,
            $this->itemImage->storage_path
        );
        
        foreach ($variants as $variantData) {
            $this->itemImage->variants()->create($variantData);
        }
    }
}
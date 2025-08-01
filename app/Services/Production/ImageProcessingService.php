<?php

namespace App\Services\Production;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ImageProcessingService
{
    private ImageManager $imageManager;
    private array $variantSizes = [
        'thumbnail' => ['width' => 150, 'height' => 150],
        'small' => ['width' => 400, 'height' => 400],
        'medium' => ['width' => 800, 'height' => 800],
        'large' => ['width' => 1200, 'height' => 1200],
    ];
    
    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver());
    }
    
    public function processItemImage(UploadedFile $file, string $itemId): array
    {
        $image = $this->imageManager->read($file);
        
        // Auto-orient based on EXIF data
        $image->orient();
        
        // Get original dimensions
        $originalWidth = $image->width();
        $originalHeight = $image->height();
        
        // Check if image needs to be optimized (> 500KB)
        $needsOptimization = $file->getSize() > 500 * 1024;
        
        // Generate unique filename
        $filename = $this->generateFilename($file);
        $basePath = "items/{$itemId}/images";
        
        // Process and store original (or optimized version)
        if ($needsOptimization) {
            $optimized = $this->optimizeImage($image, 500 * 1024);
            $path = "{$basePath}/original/{$filename}";
            Storage::put($path, $optimized['encoded']);
            $fileSize = strlen($optimized['encoded']);
            $width = $optimized['width'];
            $height = $optimized['height'];
        } else {
            $path = $file->storeAs("{$basePath}/original", $filename);
            $fileSize = $file->getSize();
            $width = $originalWidth;
            $height = $originalHeight;
        }
        
        return [
            'filename' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $fileSize,
            'width' => $width,
            'height' => $height,
            'was_optimized' => $needsOptimization,
        ];
    }
    
    public function generateVariants(string $itemImageId, string $originalPath): array
    {
        $variants = [];
        $image = $this->imageManager->read(Storage::get($originalPath));
        
        foreach ($this->variantSizes as $type => $dimensions) {
            $variant = clone $image;
            
            // Resize to fit within dimensions while maintaining aspect ratio
            $variant->scaleDown($dimensions['width'], $dimensions['height']);
            
            // Convert to WebP for web variants
            $variant->toWebp(85);
            
            $filename = pathinfo($originalPath, PATHINFO_FILENAME) . '.webp';
            $variantPath = str_replace(
                '/original/',
                "/variants/{$type}/",
                dirname($originalPath)
            ) . '/' . $filename;
            
            Storage::put($variantPath, $variant->encode());
            
            $variants[] = [
                'item_image_id' => $itemImageId,
                'variant_type' => $type,
                'storage_path' => $variantPath,
                'width' => $variant->width(),
                'height' => $variant->height(),
                'file_size' => strlen($variant->encode()),
            ];
        }
        
        return $variants;
    }
    
    private function optimizeImage($image, int $targetSize): array
    {
        $quality = 85;
        $scale = 1.0;
        $encoded = null;
        
        // Try progressive reduction until under target size
        while ($quality >= 60 && $scale >= 0.5) {
            $testImage = clone $image;
            
            if ($scale < 1.0) {
                $newWidth = (int)($image->width() * $scale);
                $newHeight = (int)($image->height() * $scale);
                $testImage->scale($newWidth, $newHeight);
            }
            
            $encoded = $testImage->toJpeg($quality)->encode();
            
            if (strlen($encoded) <= $targetSize) {
                return [
                    'encoded' => $encoded,
                    'width' => $testImage->width(),
                    'height' => $testImage->height(),
                    'quality' => $quality,
                    'scale' => $scale,
                ];
            }
            
            // Reduce quality first, then scale
            if ($quality > 60) {
                $quality -= 5;
            } else {
                $scale -= 0.1;
                $quality = 85; // Reset quality for new scale
            }
        }
        
        // If still too large, use minimum settings
        $finalImage = clone $image;
        $finalImage->scale((int)($image->width() * 0.5), (int)($image->height() * 0.5));
        
        return [
            'encoded' => $finalImage->toJpeg(60)->encode(),
            'width' => $finalImage->width(),
            'height' => $finalImage->height(),
            'quality' => 60,
            'scale' => 0.5,
        ];
    }
    
    private function generateFilename(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();
        return uniqid() . '_' . time() . '.' . $extension;
    }
    
    public function deleteImage(string $path): void
    {
        Storage::delete($path);
    }
}
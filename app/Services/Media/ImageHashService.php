<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\Log;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use Jenssegers\ImageHash\ImageHash;
use Jenssegers\ImageHash\Implementations\PerceptualHash;

class ImageHashService
{
    private ImageManager $imageManager;
    private ImageHash $hasher;

    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver);
        $this->hasher = new ImageHash(new PerceptualHash);
    }

    /**
     * Generate MD5 hash of file contents.
     */
    public function generateFileHash(string $path): string
    {
        return md5_file($path);
    }

    /**
     * Generate perceptual hash for visual similarity detection.
     */
    public function generatePerceptualHash(string $path): ?string
    {
        try {
            $hash = $this->hasher->hash($path);

            return $hash->toHex();
        } catch (\Exception $e) {
            Log::error('Failed to generate perceptual hash', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Calculate Hamming distance between two perceptual hashes.
     */
    public function calculateSimilarity(string $hash1, string $hash2): float
    {
        $distance = $this->hasher->distance($hash1, $hash2);

        // Convert distance to similarity percentage (0-64 distance to 0-100% similarity)
        return max(0, 100 - ($distance * 100 / 64));
    }

    /**
     * Check if two images are visually similar.
     */
    public function areImagesSimilar(string $hash1, string $hash2, float $threshold = 90): bool
    {
        return $this->calculateSimilarity($hash1, $hash2) >= $threshold;
    }

    /**
     * Extract dominant color from image.
     */
    public function extractDominantColor(string $path): ?string
    {
        try {
            $image = $this->imageManager->read($path);

            // Resize to small size for faster processing
            $image->scale(width: 50);

            // Get color palette
            $colors = [];
            $width = $image->width();
            $height = $image->height();

            for ($y = 0; $y < $height; $y += 5) {
                for ($x = 0; $x < $width; $x += 5) {
                    $color = $image->pickColor($x, $y);
                    $hex = sprintf('#%02x%02x%02x', $color->red()->value(), $color->green()->value(), $color->blue()->value());
                    $colors[$hex] = ($colors[$hex] ?? 0) + 1;
                }
            }

            // Get most common color
            arsort($colors);

            return array_key_first($colors);
        } catch (\Exception $e) {
            Log::error('Failed to extract dominant color', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Get image dimensions.
     */
    public function getImageDimensions(string $path): ?array
    {
        try {
            $image = $this->imageManager->read($path);

            return [
                'width' => $image->width(),
                'height' => $image->height(),
                'aspect_ratio' => round($image->width() / $image->height(), 3),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get image dimensions', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}

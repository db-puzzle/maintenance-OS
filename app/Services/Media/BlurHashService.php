<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\Log;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use kornrunner\Blurhash\Blurhash;

class BlurHashService
{
    private ImageManager $imageManager;

    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver);
    }

    /**
     * Generate BlurHash for an image.
     */
    public function generateBlurHash(string $path, int $componentsX = 4, int $componentsY = 3): ?string
    {
        try {
            $image = $this->imageManager->read($path);

            // Resize to small size for blurhash calculation (max 64x64)
            $width = 64;
            $height = (int) round(64 * ($image->height() / $image->width()));

            if ($height > 64) {
                $height = 64;
                $width = (int) round(64 * ($image->width() / $image->height()));
            }

            $image->scale(width: $width, height: $height);

            // Get pixel data - BlurHash expects a 2D array [y][x] = [r, g, b]
            $pixels = [];
            for ($y = 0; $y < $height; $y++) {
                $row = [];
                for ($x = 0; $x < $width; $x++) {
                    $color = $image->pickColor($x, $y);

                    // Extract RGB values and ensure they are integers
                    $r = $color->red()->value();
                    $g = $color->green()->value();
                    $b = $color->blue()->value();

                    // Ensure values are within valid range (0-255)
                    $r = max(0, min(255, (int) $r));
                    $g = max(0, min(255, (int) $g));
                    $b = max(0, min(255, (int) $b));

                    $row[] = [$r, $g, $b];
                }
                $pixels[] = $row;
            }

            // Generate BlurHash
            $hash = Blurhash::encode($pixels, $componentsX, $componentsY);

            return $hash;
        } catch (\Exception $e) {
            Log::error('Failed to generate BlurHash', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Decode BlurHash to image data URL.
     */
    public function decodeBlurHash(string $hash, int $width = 32, int $height = 32): ?string
    {
        try {
            $pixels = Blurhash::decode($hash, $width, $height);
            $image = $this->imageManager->create($width, $height);

            $pixelIndex = 0;
            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    $rgb = $pixels[$pixelIndex];
                    $image->drawPixel($x, $y, sprintf('rgb(%d,%d,%d)', $rgb[0], $rgb[1], $rgb[2]));
                    $pixelIndex++;
                }
            }

            return $image->toDataUri();
        } catch (\Exception $e) {
            Log::error('Failed to decode BlurHash', [
                'hash' => $hash,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}

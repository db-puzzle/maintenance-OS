<?php

namespace App\Services\Media;

use Illuminate\Support\Str;
use Spatie\MediaLibrary\Conversions\Conversion;
use Spatie\MediaLibrary\Support\FileNamer\FileNamer;

class MediaFileNamer extends FileNamer
{
    /**
     * Get the name for the original file.
     *
     * Note: Spatie Media Library can call this method in two ways:
     * 1. With just the filename (no extension) when using ->usingName()
     * 2. With the full filename (including extension) when using ->usingFileName() or default behavior
     *
     * We need to handle both cases to avoid double extensions.
     */
    public function originalFileName(string $fileName): string
    {
        $baseName = pathinfo($fileName, PATHINFO_FILENAME);
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);


        // Check if filename already has our unique suffix pattern (e.g., filename_a1b2c3.ext)
        // This prevents double processing
        if (preg_match('/^(.+)_[a-f0-9]{6}$/', $baseName, $matches)) {

            // Return the filename as-is if it already has our suffix
            return ! empty($extension) ? "{$baseName}.{$extension}" : $baseName;
        }

        // Sanitize the filename
        $baseName = Str::slug($baseName);

        // Add a unique suffix to prevent conflicts
        $uniqueSuffix = substr(uniqid(), -6);

        // Always return just the basename without extension
        // Spatie Media Library will add the extension automatically
        $finalFileName = "{$baseName}_{$uniqueSuffix}";


        return $finalFileName;
    }

    /**
     * Get the name for a conversion.
     */
    public function conversionFileName(string $fileName, Conversion $conversion): string
    {
        $baseName = pathinfo($fileName, PATHINFO_FILENAME);
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);

        $conversionName = $conversion->getName();
        // Return just the basename with conversion name, Spatie will add the extension
        $finalFileName = "{$baseName}_{$conversionName}";


        return $finalFileName;
    }

    /**
     * Get the name for a responsive image.
     */
    public function responsiveFileName(string $fileName): string
    {
        $baseName = pathinfo($fileName, PATHINFO_FILENAME);
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);

        return "{$baseName}___media_library_original_.{$extension}";
    }
}

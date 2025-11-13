<?php

namespace App\Services\Media;

class MediaDiskResolver
{
    /**
     * Get the default disk based on environment
     * All collections are private - require authentication.
     */
    public static function getDefaultDisk(): string
    {
        return self::isProduction() ? 'default' : 'media-local';
    }

    /**
     * Get disk for a specific collection
     * All collections use the same private disk.
     */
    public static function getDiskForCollection(string $collection): string
    {
        // All collections use the same private disk
        return self::getDefaultDisk();
    }

    /**
     * Get the temporary disk (always local).
     */
    public static function getTempDisk(): string
    {
        return 'temp'; // Always local
    }

    /**
     * Check if running in production environment.
     */
    public static function isProduction(): bool
    {
        return app()->environment('production');
    }

    /**
     * Check if CDN should be used.
     */
    public static function shouldUseCdn(): bool
    {
        return self::isProduction() && config('media-library.use_cdn', true);
    }
}

<?php

namespace App\Services;

class MediaDiskResolver
{
    /**
     * Get the public media disk name.
     */
    public static function getPublicDisk(): string
    {
        return config('media-library.disk_name', 'media');
    }

    /**
     * Get the private media disk name.
     */
    public static function getPrivateDisk(): string
    {
        return config('media-library.private_disk_name', 'media-private');
    }

    /**
     * Get the appropriate disk for a media collection.
     */
    public static function getDiskForCollection(string $collection): string
    {
        $privateCollections = [
            'attachments',
            'exports',
            'financial-documents',
            'employee-files',
            'work-order-documents',
            'maintenance-reports',
        ];

        return in_array($collection, $privateCollections)
            ? self::getPrivateDisk()
            : self::getPublicDisk();
    }

    /**
     * Check if we're in a local environment.
     */
    public static function isLocalEnvironment(): bool
    {
        return app()->environment('local');
    }

    /**
     * Check if CDN should be used for media delivery.
     */
    public static function shouldUseCdn(): bool
    {
        return ! self::isLocalEnvironment() && config('media-library.use_cdn', true);
    }

    /**
     * Get the temporary upload disk.
     */
    public static function getTempDisk(): string
    {
        return config('media-library.temporary_upload_disk', 'media-temp');
    }
}

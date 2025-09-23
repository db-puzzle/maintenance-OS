<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MediaServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void {}

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Configure media library disk based on environment
        if ($this->app->environment('local')) {
            config([
                'media-library.disk_name' => 'media',
                'media-library.private_disk_name' => 'media-private',
                'media-library.temporary_upload_disk' => 'local',
                'media-library.queue_conversions_by_default' => false,
            ]);
        } else {
            config([
                'media-library.disk_name' => 'media',
                'media-library.private_disk_name' => 'media-private',
                'media-library.temporary_upload_disk' => 'media-temp',
                'media-library.queue_conversions_by_default' => true,
            ]);
        }

        // Register media observer
        \App\Models\Media::observe(\App\Observers\MediaObserver::class);
    }
}

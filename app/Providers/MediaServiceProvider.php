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
                'media-library.disk_name' => 'media-local',
                'media-library.private_disk_name' => 'media-local',
                'media-library.temporary_upload_disk' => 'temp',
                'media-library.queue_conversions_by_default' => false,
            ]);
        } else {
            config([
                'media-library.disk_name' => 'default',
                'media-library.private_disk_name' => 'default',
                'media-library.temporary_upload_disk' => 'temp',
                'media-library.queue_conversions_by_default' => true,
            ]);
        }

        // Register custom path generator
        config([
            'media-library.path_generator' => \App\Services\Media\MediaPathGenerator::class,
        ]);

        // Register custom file namer
        config([
            'media-library.file_namer' => \App\Services\Media\MediaFileNamer::class,
        ]);

        // Register media observer
        \App\Models\Media::observe(\App\Observers\MediaObserver::class);
    }
}

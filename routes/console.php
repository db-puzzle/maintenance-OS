<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Work Order Generation Schedule
Schedule::command('work-orders:generate-from-routines')
    ->hourly()
    ->name('generate-work-orders')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/work-order-generation.log'));

// Media Library Maintenance
Schedule::command('media:health-check --notify')
    ->daily()
    ->at('02:00')
    ->name('media-health-check')
    ->appendOutputTo(storage_path('logs/media-health.log'));

Schedule::command('media:cleanup')
    ->weekly()
    ->sundays()
    ->at('03:00')
    ->name('media-cleanup')
    ->appendOutputTo(storage_path('logs/media-cleanup.log'));

// Spatie Media Library cleanup
Schedule::command('media-library:delete-old-temporary-uploads')
    ->daily()
    ->at('01:00');

// Clean up expired chunked uploads
Schedule::command('media:cleanup-chunked-uploads')
    ->hourly()
    ->name('cleanup-chunked-uploads')
    ->appendOutputTo(storage_path('logs/chunked-uploads.log'));

// Media analytics cache refresh
Schedule::call(function () {
    $analytics = app(\App\Services\MediaStorageAnalytics::class);
    $analytics->clearCache();
    $analytics->getStorageMetrics(); // Refresh cache
    $analytics->getGrowthMetrics(); // Refresh cache
})->daily()->at('04:00')->name('refresh-media-analytics');

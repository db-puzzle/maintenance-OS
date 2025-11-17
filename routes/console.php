<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Work Order Generation Schedule
// CRITICAL: Uses tenants:run to ensure complete tenant isolation
// Routine and WorkOrder models are tenant-specific
Schedule::command('tenants:run workorders:generate-from-routines')
    ->hourly()
    ->name('generate-work-orders')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/work-order-generation.log'));

// Media Library Maintenance
// CRITICAL: Uses tenants:run to ensure complete tenant isolation
// Media model is tenant-specific
Schedule::command('tenants:run', [
    'commandname' => 'media:health-check',
    '--option' => ['notify'],
])
    ->daily()
    ->at('02:00')
    ->name('media-health-check')
    ->appendOutputTo(storage_path('logs/media-health.log'));

Schedule::command('tenants:run media:cleanup')
    ->weekly()
    ->sundays()
    ->at('03:00')
    ->name('media-cleanup')
    ->appendOutputTo(storage_path('logs/media-cleanup.log'));

// Spatie Media Library cleanup (central context - handles own tenant iteration)
Schedule::command('media-library:delete-old-temporary-uploads')
    ->daily()
    ->at('01:00');

// Clean up expired chunked uploads
// CRITICAL: Uses tenants:run to ensure complete tenant isolation
// ChunkedUpload model is tenant-specific
Schedule::command('tenants:run media:cleanup-chunked-uploads')
    ->hourly()
    ->name('cleanup-chunked-uploads')
    ->appendOutputTo(storage_path('logs/chunked-uploads.log'));

// Media analytics cache refresh
// CRITICAL: Iterates through ALL tenants to refresh cache for each
// MediaStorageAnalytics queries tenant-specific Media data
Schedule::call(function () {
    \App\Models\Account::all()->each(function ($tenant) {
        $tenant->run(function () {
            $analytics = app(\App\Services\MediaStorageAnalytics::class);
            $analytics->clearCache();
            $analytics->getStorageMetrics(); // Refresh cache
            $analytics->getGrowthMetrics(); // Refresh cache
        });
    });
})->daily()->at('04:00')->name('refresh-media-analytics');

// Production Step Safety Net
// CRITICAL: Uses tenants:run to ensure complete tenant isolation
// This command executes once per tenant, with each execution having:
// - Isolated database context (only accesses current tenant's database)
// - No possibility of cross-tenant data access
// - Automatic context initialization and cleanup
Schedule::command('tenants:run production:check-pending-steps')
    ->everyFiveMinutes()
    ->name('check-pending-steps')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/production-step-safety-net.log'));

// Manufacturing Order State Consistency Check
// CRITICAL: Uses job dispatch with tenant context
// This job checks for and fixes inconsistent states such as:
// - Orders with all steps complete but status not 'completed'
// - Child orders complete but parent not notified
// - Pending steps with met dependencies not queued
Schedule::call(function () {
    \App\Models\Account::all()->each(function ($tenant) {
        $tenant->run(function () {
            \App\Jobs\Production\CheckInconsistentOrderStates::dispatch();
        });
    });
})->everyTenMinutes()
    ->name('check-inconsistent-order-states')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/order-state-consistency.log'));

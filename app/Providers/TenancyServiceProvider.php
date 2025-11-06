<?php

namespace App\Providers;

use App\Events\TenantStatusChanged;
use App\Mail\TenantReadyMail;
use App\Mail\WelcomeTenantMail;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Stancl\JobPipeline\JobPipeline;
use Stancl\Tenancy\Events;

/**
 * Service Provider for handling tenant lifecycle events.
 */
class TenancyServiceProvider extends ServiceProvider
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
        $this->configureEventListeners();
    }

    /**
     * Configure event listeners for tenant lifecycle events.
     */
    protected function configureEventListeners(): void
    {
        // CRITICAL: Register the bootstrapper listener
        // This is what actually runs the DatabaseTenancyBootstrapper and other bootstrappers
        Event::listen(
            Events\TenancyInitialized::class,
            \Stancl\Tenancy\Listeners\BootstrapTenancy::class
        );

        Event::listen(
            Events\RevertingToCentralContext::class,
            \Stancl\Tenancy\Listeners\RevertToCentralContext::class
        );

        // Tenant created - run job pipeline for database setup
        // Uses JobPipeline to automatically run jobs from config/tenancy.php
        // Note: Jobs run synchronously in tests (queue is 'sync')
        Event::listen(
            Events\TenantCreated::class,
            JobPipeline::make(config('tenancy.jobs', []))
                ->send(function (Events\TenantCreated $event) {
                    return $event->tenant;
                })
                ->toListener()
        );

        // Tenant created - additional custom logic (runs AFTER job pipeline)
        Event::listen(
            Events\TenantCreated::class,
            function ($event) {
                $this->onTenantCreated($event);
            }
        );

        // Database created - log it
        Event::listen(
            Events\DatabaseCreated::class,
            function ($event) {
                Log::info("Database created for tenant: {$event->tenant->id}");
            }
        );

        // Database migrated - track version
        Event::listen(
            Events\DatabaseMigrated::class,
            function ($event) {
                // Log only if enabled
                if (config('logging.default') !== 'null') {
                    Log::info("Database migrated for tenant: {$event->tenant->id}");
                }
            }
        );

        // Database seeded - notify ready
        Event::listen(
            Events\DatabaseSeeded::class,
            function ($event) {
                $this->onDatabaseSeeded($event);
            }
        );

        // Tenant deleting - cleanup resources
        Event::listen(
            Events\DeletingTenant::class,
            function ($event) {
                $this->onDeletingTenant($event);
            }
        );

        // Database deleted - log it
        Event::listen(
            Events\DatabaseDeleted::class,
            function ($event) {
                Log::info("Database deleted for tenant: {$event->tenantId}");
            }
        );

        // Custom app event for status changes
        Event::listen(
            TenantStatusChanged::class,
            function ($event) {
                $this->onTenantStatusChanged($event);
            }
        );
    }

    /**
     * Handle tenant created event - custom application logic.
     *
     * Note: Job pipeline (CreateDatabase, MigrateDatabase, etc.) is registered
     * separately above using JobPipeline as per tenancyforlaravel.com/docs/v3/event-system
     */
    protected function onTenantCreated($event): void
    {
        $tenant = $event->tenant;

        // Log tenant creation to central database (disabled in tests via config)
        // Must use central connection since Account model uses UUIDs and lives in central DB
        if (config('activitylog.enabled', true)) {
            central_activity()
                ->performedOn($tenant)
                ->log("Tenant created: {$tenant->name}");
        }

        // Send welcome email after a delay to ensure database is ready
        if (isset($tenant->metadata['admin_email'])) {
            dispatch(function () use ($tenant) {
                if (class_exists(WelcomeTenantMail::class)) {
                    Mail::to($tenant->metadata['admin_email'])
                        ->send(new WelcomeTenantMail($tenant));
                }
            })->delay(now()->addMinutes(2));
        }
    }

    /**
     * Handle database seeded event.
     */
    protected function onDatabaseSeeded($event): void
    {
        $tenant = $event->tenant;

        // Log seeding completion
        Log::info("Database seeded for tenant: {$tenant->id}");

        // Send ready notification
        if (isset($tenant->metadata['admin_email']) && class_exists(TenantReadyMail::class)) {
            Mail::to($tenant->metadata['admin_email'])
                ->send(new TenantReadyMail($tenant));
        }
    }

    /**
     * Handle tenant deletion.
     */
    protected function onDeletingTenant($event): void
    {
        $tenant = $event->tenant;

        // Log deletion to central database (disabled in tests via config)
        // Must use central connection since Account model uses UUIDs and lives in central DB
        if (config('activitylog.enabled', true)) {
            central_activity()
                ->performedOn($tenant)
                ->log("Tenant being deleted: {$tenant->name}");
        }

        // Cleanup S3 files if configured
        if (config('filesystems.disks.s3')) {
            try {
                \Storage::disk('s3')->deleteDirectory("tenants/{$tenant->id}");
            } catch (\Exception $e) {
                Log::error("Failed to cleanup S3 files for tenant {$tenant->id}: " . $e->getMessage());
            }
        }

        // Cancel any active subscriptions
        if ($tenant->subscription && $tenant->subscription->status === 'active') {
            try {
                $tenant->subscription->update(['status' => 'cancelled']);
            } catch (\Exception $e) {
                Log::error("Failed to cancel subscription for tenant {$tenant->id}: " . $e->getMessage());
            }
        }
    }

    /**
     * Handle tenant status change.
     */
    protected function onTenantStatusChanged($event): void
    {
        $tenant = $event->tenant;
        $oldStatus = $event->oldStatus;

        // Log status change to central database (disabled in tests via config)
        // Must use central connection since Account model uses UUIDs and lives in central DB
        if (config('activitylog.enabled', true)) {
            central_activity()
                ->performedOn($tenant)
                ->withProperties([
                    'old_status' => $oldStatus,
                    'new_status' => $tenant->status,
                ])
                ->log("Tenant status changed from {$oldStatus} to {$tenant->status}");
        }

        // Handle status-specific logic
        if ($tenant->status === 'suspended' && isset($tenant->metadata['admin_email'])) {
            // Notify tenant of suspension
            Log::info("Tenant {$tenant->id} has been suspended");
            // Add email notification here if needed
        }
    }
}

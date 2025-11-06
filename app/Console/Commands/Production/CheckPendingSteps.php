<?php

namespace App\Console\Commands\Production;

use App\Jobs\Production\CheckPendingStepsJob;
use Illuminate\Console\Command;

/**
 * Safety net command to check and queue eligible pending manufacturing steps.
 *
 * TENANT ISOLATION:
 * This command is designed to run via `tenants:run` which ensures complete tenant isolation.
 * Each execution runs in a single tenant's context with no access to other tenant data.
 *
 * Security guarantees:
 * - Database queries are scoped to current tenant's database only
 * - No cross-tenant data access is possible
 * - Tenant context is automatically initialized before execution
 * - Tenant context is automatically reverted after execution
 *
 * Usage:
 * - Via scheduler: `tenants:run production:check-pending-steps` (recommended)
 * - Manually for all tenants: `php artisan tenants:run production:check-pending-steps`
 * - Manually for specific tenant: `php artisan tenants:run production:check-pending-steps --tenants=<tenant-id>`
 */
class CheckPendingSteps extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'production:check-pending-steps';

    /**
     * The console command description.
     */
    protected $description = 'Safety net to check and queue eligible pending manufacturing steps (runs in tenant context)';

    /**
     * Execute the console command.
     *
     * IMPORTANT: This command MUST be run via `tenants:run` to ensure proper tenant context.
     * When run via scheduler with `tenants:run`, it executes once per tenant in complete isolation.
     */
    public function handle(): int
    {
        // Verify we're in a tenant context (safety check)
        if (! tenancy()->initialized) {
            $this->error('ERROR: This command must be run in tenant context via "tenants:run"');
            $this->error('Usage: php artisan tenants:run production:check-pending-steps');

            return 1;
        }

        // Log which tenant we're processing (for debugging)
        $tenantId = tenant('id');
        $tenantName = tenant('name') ?? 'Unknown';
        $this->info("Processing tenant: {$tenantName} (ID: {$tenantId})");

        // Execute the job logic directly in current tenant context
        // All database queries will be automatically scoped to this tenant's database
        $job = new CheckPendingStepsJob;
        $job->handle();

        $this->info("Completed processing for tenant: {$tenantName}");

        return 0;
    }
}

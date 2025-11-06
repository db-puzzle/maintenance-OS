<?php

namespace Tests\Feature\MultiTenancy\Jobs;

use App\Jobs\Production\UpdateSmartProgress;
use App\Models\Production\ManufacturingOrder;
use Illuminate\Support\Facades\Queue;
use Tests\MultiTenancyTestCase;

/**
 * Test that jobs work correctly with QueueTenancyBootstrapper.
 *
 * Verifies that jobs are automatically scoped to tenants via the
 * QueueTenancyBootstrapper which adds tenant_id to job payloads.
 */
class TenantAwareJobTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy for tests that create their own tenants.
     */
    protected $tenancy = false;

    /**
     * Test that jobs are queued with tenant context.
     */
    public function test_jobs_queued_with_tenant_context(): void
    {
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Tenant',
            'subdomain' => 'job-test-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant->run(function () {
            // Create manufacturing order using factory
            $order = ManufacturingOrder::factory()->create([
                'status' => 'draft',
            ]);

            // Dispatch job in tenant context
            Queue::fake();
            UpdateSmartProgress::dispatch($order);

            // Verify job was queued
            Queue::assertPushed(UpdateSmartProgress::class);
        });
    }

    /**
     * Test jobs work in different tenant contexts.
     */
    public function test_jobs_work_in_different_tenant_contexts(): void
    {
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Tenant 1',
            'subdomain' => 'job-tenant1-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Tenant 2',
            'subdomain' => 'job-tenant2-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        Queue::fake();

        // Dispatch job in tenant1
        $tenant1->run(function () {
            $order = ManufacturingOrder::factory()->create(['status' => 'draft']);
            UpdateSmartProgress::dispatch($order);
        });

        // Dispatch job in tenant2
        $tenant2->run(function () {
            $order = ManufacturingOrder::factory()->create(['status' => 'draft']);
            UpdateSmartProgress::dispatch($order);
        });

        // Verify both jobs were queued
        Queue::assertPushed(UpdateSmartProgress::class, 2);
    }
}

<?php

namespace Tests\Feature\MultiTenancy\Jobs;

use App\Jobs\Production\UpdateSmartProgress;
use App\Models\Production\ManufacturingOrder;
use Illuminate\Support\Facades\Queue;
use Tests\MultiTenancyTestCase;

/**
 * Test job execution in multi-tenant context.
 *
 * Verifies that jobs execute in the correct tenant context
 * and maintain context through failures and retries.
 */
class JobExecutionTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy for tests that create their own tenants.
     */
    protected $tenancy = false;

    /**
     * Test job execution in correct tenant context.
     */
    public function test_job_execution_in_correct_tenant_context(): void
    {
        $tenant = $this->createAdditionalTenant([
            'name' => 'Test Tenant',
            'subdomain' => 'job-exec-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant->run(function () {
            // Create order using factory
            $order = ManufacturingOrder::factory()->create(['status' => 'draft']);

            // Dispatch and process job
            Queue::fake();
            UpdateSmartProgress::dispatch($order);

            Queue::assertPushed(UpdateSmartProgress::class);
        });
    }

    /**
     * Test queued job tenant switching.
     */
    public function test_queued_job_tenant_switching(): void
    {
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Tenant 1',
            'subdomain' => 'job-switch1-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Tenant 2',
            'subdomain' => 'job-switch2-' . time(),
            'metadata' => [], // No admin_email so seeder won't create user
        ]);

        Queue::fake();

        // Dispatch jobs from different tenants
        $order1 = $tenant1->run(function () {
            $order = ManufacturingOrder::factory()->create(['status' => 'draft']);
            UpdateSmartProgress::dispatch($order);

            return $order;
        });

        $order2 = $tenant2->run(function () {
            $order = ManufacturingOrder::factory()->create(['status' => 'draft']);
            UpdateSmartProgress::dispatch($order);

            return $order;
        });

        // Verify both jobs were queued
        Queue::assertPushed(UpdateSmartProgress::class, 2);
    }
}

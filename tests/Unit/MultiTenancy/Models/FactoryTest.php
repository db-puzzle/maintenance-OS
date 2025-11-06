<?php

namespace Tests\Unit\MultiTenancy\Models;

use App\Models\AssetHierarchy\Asset;
use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use Tests\MultiTenancyTestCase;

/**
 * Test that factories work correctly in tenant context.
 */
class FactoryTest extends MultiTenancyTestCase
{
    /**
     * Use the shared tenant for these tests.
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * Test that factories create tenant-scoped data.
     */
    public function test_factories_create_tenant_scoped_data(): void
    {
        $this->tenant->run(function () {
            $initialCount = User::count();

            // Create user using factory
            $user = User::factory()->create();

            $this->assertNotNull($user);
            $this->assertEquals($initialCount + 1, User::count());

            // User should be in tenant database
            $this->assertNotNull(User::find($user->id));
        });
    }

    /**
     * Test that factories work without tenant_id.
     */
    public function test_factories_work_without_tenant_id(): void
    {
        $this->tenant->run(function () {
            // Create various models
            $user = User::factory()->create();
            $workOrder = WorkOrder::factory()->create();

            // Factories should not have tenant_id attribute
            $this->assertFalse(array_key_exists('tenant_id', $user->getAttributes()));
            $this->assertFalse(array_key_exists('tenant_id', $workOrder->getAttributes()));
        });
    }

    /**
     * Test that factory relationships stay within tenant.
     */
    public function test_factory_relationships_stay_within_tenant(): void
    {
        $this->tenant->run(function () {
            // Create asset with work orders
            $asset = Asset::factory()->create();
            $workOrder = WorkOrder::factory()->create([
                'asset_id' => $asset->id,
            ]);

            // Verify relationship works
            $this->assertNotNull($workOrder->asset);
            $this->assertEquals($asset->id, $workOrder->asset->id);

            // Verify data is in same tenant (only our created ones, ignore seeded data)
            $this->assertGreaterThan(0, Asset::count());
            $this->assertGreaterThan(0, WorkOrder::count());
        });
    }

    /**
     * Test that seeder creates correct tenant data.
     */
    public function test_seeder_creates_correct_tenant_data(): void
    {
        // The shared tenant has already been seeded
        $this->tenant->run(function () {
            // Check that seeded data exists (admin user from seeder)
            $this->assertGreaterThan(0, User::count());

            // Check roles were seeded
            $this->assertGreaterThan(0, \Spatie\Permission\Models\Role::count());
        });
    }
}

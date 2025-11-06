<?php

namespace Tests\Feature\MultiTenancy\Models;

use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use Tests\MultiTenancyTestCase;

/**
 * Test that data is properly isolated between tenants.
 */
class DataIsolationTest extends MultiTenancyTestCase
{
    /**
     * Disable automatic tenancy for tests that need to create multiple tenants.
     *
     * @var bool
     */
    protected $tenancy = false;

    /**
     * Test that users cannot access other tenant's data.
     */
    public function test_user_cannot_access_other_tenant_data(): void
    {
        // Create two tenants using helper method
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Company One',
            'subdomain' => 'isolation-test-1-' . time(),
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Company Two',
            'subdomain' => 'isolation-test-2-' . time(),
        ]);

        // Create a unique user in tenant 1
        $user1Email = 'unique-user1@company-one.com';
        $tenant1->run(function () use ($user1Email) {
            User::factory()->create(['email' => $user1Email]);
        });

        // Create a unique user in tenant 2
        $user2Email = 'unique-user2@company-two.com';
        $tenant2->run(function () use ($user2Email) {
            User::factory()->create(['email' => $user2Email]);
        });

        // Test tenant 1 isolation
        $tenant1->run(function () use ($user1Email, $user2Email) {
            // Should find tenant 1 user
            $this->assertNotNull(User::where('email', $user1Email)->first());
            // Should NOT find tenant 2 user
            $this->assertNull(User::where('email', $user2Email)->first());
            // All users in this context belong to tenant 1
            $this->assertGreaterThan(0, User::count());
        });

        // Test tenant 2 isolation
        $tenant2->run(function () use ($user1Email, $user2Email) {
            // Should NOT find tenant 1 user
            $this->assertNull(User::where('email', $user1Email)->first());
            // Should find tenant 2 user
            $this->assertNotNull(User::where('email', $user2Email)->first());
            // All users in this context belong to tenant 2
            $this->assertGreaterThan(0, User::count());
        });

        // Cleanup
        $this->cleanupAdditionalTenant($tenant1);
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test that API endpoints respect tenant boundaries.
     */
    public function test_api_endpoints_respect_tenant_boundaries(): void
    {
        // Create two tenants with work orders
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Company One',
            'subdomain' => 'api-test-1-' . time(),
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Company Two',
            'subdomain' => 'api-test-2-' . time(),
        ]);

        // Create work orders in tenant 1
        $workOrder1 = $tenant1->run(function () {
            return WorkOrder::factory()->create(['title' => 'Tenant 1 Work Order']);
        });

        // Create work orders in tenant 2
        $workOrder2 = $tenant2->run(function () {
            return WorkOrder::factory()->create(['title' => 'Tenant 2 Work Order']);
        });

        // Access tenant 1
        $tenant1->run(function () {
            $this->assertEquals(1, WorkOrder::count());
            $this->assertEquals('Tenant 1 Work Order', WorkOrder::first()->title);
        });

        // Access tenant 2
        $tenant2->run(function () {
            $this->assertEquals(1, WorkOrder::count());
            $this->assertEquals('Tenant 2 Work Order', WorkOrder::first()->title);
        });

        // Cleanup
        $this->cleanupAdditionalTenant($tenant1);
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test that model queries are automatically scoped to tenant.
     */
    public function test_model_queries_are_automatically_scoped(): void
    {
        // Create tenant
        $tenant = $this->createAdditionalTenant([
            'name' => 'Scoped Query Test',
            'subdomain' => 'scope-test-' . time(),
        ]);

        // Get initial user count (may include seeded admin)
        $initialCount = $tenant->run(function () {
            return User::count();
        });

        // Create users in tenant context
        $tenant->run(function () {
            User::factory()->count(5)->create();
        });

        // Query should be automatically scoped
        $tenant->run(function () use ($initialCount) {
            $expectedCount = $initialCount + 5;
            $this->assertEquals($expectedCount, User::count());
            $this->assertEquals($expectedCount, User::all()->count());
            $this->assertEquals($expectedCount, User::query()->count());
        });

        // Cleanup
        $this->cleanupAdditionalTenant($tenant);
    }

    /**
     * Test that there are no cross-tenant relationships.
     */
    public function test_no_cross_tenant_relationships(): void
    {
        // Create two tenants
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Company One',
            'subdomain' => 'cross-tenant-1-' . time(),
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Company Two',
            'subdomain' => 'cross-tenant-2-' . time(),
        ]);

        // Create a specific user and work orders in tenant 1
        $user1Id = $tenant1->run(function () {
            $user = User::factory()->create(['email' => 'cross-test-user1@tenant1.com']);
            // Create work orders explicitly for this user
            WorkOrder::factory()->count(3)->create(['requested_by' => $user->id]);

            return $user->id;
        });

        // Create a specific user in tenant 2
        $user2Email = 'cross-test-user2@tenant2.com';
        $tenant2->run(function () use ($user2Email) {
            $user = User::factory()->create(['email' => $user2Email]);
            // Create work orders for tenant 2 (with their own users)
            WorkOrder::factory()->count(2)->create();
        });

        // Verify tenant 1 user only sees their work orders
        $tenant1->run(function () use ($user1Id) {
            $user = User::find($user1Id);
            $this->assertNotNull($user);
            $this->assertEquals(3, WorkOrder::where('requested_by', $user->id)->count());
            $this->assertEquals(3, WorkOrder::count()); // Should only see tenant 1 work orders

            // Verify tenant 2 user doesn't exist here
            $this->assertNull(User::where('email', 'cross-test-user2@tenant2.com')->first());
        });

        // Verify tenant 2 data is isolated
        $tenant2->run(function () use ($user2Email) {
            $this->assertEquals(2, WorkOrder::count());
            $this->assertNotNull(User::where('email', $user2Email)->first());

            // Verify tenant 1 user doesn't exist here
            $this->assertNull(User::where('email', 'cross-test-user1@tenant1.com')->first());
        });

        // Cleanup
        $this->cleanupAdditionalTenant($tenant1);
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test that tenant data is completely isolated.
     */
    public function test_tenant_data_completely_isolated(): void
    {
        // Create two tenants with unique identifiable data
        $tenant1 = $this->createAdditionalTenant([
            'name' => 'Company Alpha',
            'subdomain' => 'complete-alpha-' . time(),
        ]);

        $tenant2 = $this->createAdditionalTenant([
            'name' => 'Company Beta',
            'subdomain' => 'complete-beta-' . time(),
        ]);

        // Create unique users in each tenant
        $tenant1->run(function () {
            User::factory()->create(['email' => 'alpha-user@tenant1.com']);
            User::factory()->create(['email' => 'alpha-admin@tenant1.com']);
        });

        $tenant2->run(function () {
            User::factory()->create(['email' => 'beta-user@tenant2.com']);
            User::factory()->create(['email' => 'beta-admin@tenant2.com']);
            User::factory()->create(['email' => 'beta-manager@tenant2.com']);
        });

        // Verify tenant 1 only sees its own users
        $tenant1->run(function () {
            $this->assertNotNull(User::where('email', 'alpha-user@tenant1.com')->first());
            $this->assertNotNull(User::where('email', 'alpha-admin@tenant1.com')->first());
            $this->assertNull(User::where('email', 'beta-user@tenant2.com')->first());
            $this->assertNull(User::where('email', 'beta-admin@tenant2.com')->first());
            $this->assertNull(User::where('email', 'beta-manager@tenant2.com')->first());
        });

        // Verify tenant 2 only sees its own users
        $tenant2->run(function () {
            $this->assertNull(User::where('email', 'alpha-user@tenant1.com')->first());
            $this->assertNull(User::where('email', 'alpha-admin@tenant1.com')->first());
            $this->assertNotNull(User::where('email', 'beta-user@tenant2.com')->first());
            $this->assertNotNull(User::where('email', 'beta-admin@tenant2.com')->first());
            $this->assertNotNull(User::where('email', 'beta-manager@tenant2.com')->first());
        });

        // Cleanup all tenants
        $this->cleanupAdditionalTenant($tenant1);
        $this->cleanupAdditionalTenant($tenant2);
    }
}

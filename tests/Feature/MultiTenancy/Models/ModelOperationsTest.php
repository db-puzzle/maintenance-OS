<?php

namespace Tests\Feature\MultiTenancy\Models;

use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use Tests\MultiTenancyTestCase;

/**
 * Test model CRUD operations in tenant context.
 */
class ModelOperationsTest extends MultiTenancyTestCase
{
    /**
     * Use the shared tenant for these tests.
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * Test model creation in tenant context.
     */
    public function test_model_creation_in_tenant_context(): void
    {
        // Use the shared test tenant
        $this->tenant->run(function () {
            // Get initial user count (may include seeded admin)
            $initialCount = User::count();

            // Create user
            $user = User::factory()->create([
                'name' => 'Test User',
                'email' => 'test-create-' . time() . '@example.com',
            ]);

            $this->assertNotNull($user);
            $this->assertEquals('Test User', $user->name);
            $this->assertEquals($initialCount + 1, User::count());
        });
    }

    /**
     * Test model updates in tenant context.
     */
    public function test_model_updates_in_tenant_context(): void
    {
        $this->tenant->run(function () {
            $user = User::factory()->create(['name' => 'Original Name']);

            // Update the user
            $user->update(['name' => 'Updated Name']);

            $this->assertEquals('Updated Name', $user->fresh()->name);
        });
    }

    /**
     * Test model deletion in tenant context.
     */
    public function test_model_deletion_in_tenant_context(): void
    {
        $this->tenant->run(function () {
            $initialCount = User::count();
            $user = User::factory()->create();
            $this->assertEquals($initialCount + 1, User::count());

            // Delete the user
            $user->delete();

            $this->assertEquals($initialCount, User::count());
        });
    }

    /**
     * Test bulk operations respect tenant context.
     */
    public function test_bulk_operations_respect_tenant_context(): void
    {
        $this->tenant->run(function () {
            // Get initial user count (may include seeded admin)
            $initialCount = User::count();

            // Create multiple users with unique emails
            User::factory()->count(10)->create();

            $expectedTotal = $initialCount + 10;
            $this->assertEquals($expectedTotal, User::count());

            // Bulk update
            User::query()->update(['timezone' => 'America/New_York']);

            $this->assertEquals($expectedTotal, User::where('timezone', 'America/New_York')->count());

            // Bulk delete (delete all except one to avoid issues with seeded admin)
            User::query()->skip(1)->delete();

            $this->assertLessThan($expectedTotal, User::count());
        });
    }

    /**
     * Test eager loading respects tenant boundaries.
     */
    public function test_eager_loading_respects_tenant_boundaries(): void
    {
        $this->tenant->run(function () {
            // Create user with work orders
            $user = User::factory()->create();
            WorkOrder::factory()->count(3)->create(['requested_by' => $user->id]);

            // Eager load relationships
            $userWithWorkOrders = User::with('requestedWorkOrders')->find($user->id);

            $this->assertNotNull($userWithWorkOrders);
            $this->assertCount(3, $userWithWorkOrders->requestedWorkOrders);
        });
    }
}

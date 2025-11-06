<?php

namespace Tests\Feature\MultiTenancy\Models;

use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use Tests\MultiTenancyTestCase;

/**
 * Test that model relationships work correctly in tenant context.
 */
class RelationshipTest extends MultiTenancyTestCase
{
    /**
     * Use the shared tenant for these tests.
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * Test belongs to relationships work correctly.
     */
    public function test_belongs_to_relationships_work_correctly(): void
    {
        $this->tenant->run(function () {
            $user = User::factory()->create();
            $workOrder = WorkOrder::factory()->create([
                'requested_by' => $user->id,
            ]);

            // Test belongsTo relationship
            $this->assertNotNull($workOrder->requestedBy);
            $this->assertEquals($user->id, $workOrder->requestedBy->id);
        });
    }

    /**
     * Test has many relationships are scoped to tenant.
     */
    public function test_has_many_relationships_scoped_to_tenant(): void
    {
        $this->tenant->run(function () {
            $user = User::factory()->create();
            WorkOrder::factory()->count(3)->create(['requested_by' => $user->id]);

            // Test hasMany relationship
            $this->assertCount(3, $user->requestedWorkOrders);

            // All work orders should belong to this user
            $user->requestedWorkOrders->each(function ($workOrder) use ($user) {
                $this->assertEquals($user->id, $workOrder->requested_by);
            });
        });
    }

    /**
     * Test many to many relationships are isolated.
     */
    public function test_many_to_many_relationships_isolated(): void
    {
        $this->tenant->run(function () {
            $user = User::factory()->create();

            // Attach roles (many-to-many relationship)
            $user->assignRole('administrator');

            // Verify relationship works
            $this->assertTrue($user->hasRole('administrator'));
            $this->assertCount(1, $user->roles);
        });
    }

    /**
     * Test polymorphic relationships respect tenant boundaries.
     */
    public function test_polymorphic_relationships_respect_tenant(): void
    {
        // Configure media library to use local disk for tests (not S3)
        config(['filesystems.default' => 'public']);
        config(['media-library.disk_name' => 'public']);

        $this->tenant->run(function () {
            $user = User::factory()->create();
            $workOrder = WorkOrder::factory()->create();

            // Add media (polymorphic relationship)
            $user->addMediaFromString('test content')->usingFileName('test.txt')->toMediaCollection();
            $workOrder->addMediaFromString('test content')->usingFileName('test2.txt')->toMediaCollection();

            // Verify media is attached correctly
            $this->assertCount(1, $user->getMedia());
            $this->assertCount(1, $workOrder->getMedia());

            // Verify media belongs to correct model
            $userMedia = $user->getMedia()->first();
            $this->assertEquals(User::class, $userMedia->model_type);
            $this->assertEquals($user->id, $userMedia->model_id);

            $workOrderMedia = $workOrder->getMedia()->first();
            $this->assertEquals(WorkOrder::class, $workOrderMedia->model_type);
            $this->assertEquals($workOrder->id, $workOrderMedia->model_id);
        });
    }
}

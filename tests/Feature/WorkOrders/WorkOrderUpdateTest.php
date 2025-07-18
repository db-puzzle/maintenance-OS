<?php

namespace Tests\Feature\WorkOrders;

use Tests\TestCase;
use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderType;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Sector;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;

class WorkOrderUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected WorkOrder $workOrder;
    protected Asset $asset;
    protected WorkOrderType $workOrderType;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin user and authenticate first
        $this->admin = User::factory()->create();
        $adminRole = Role::firstOrCreate(['name' => 'Administrator']);
        $this->admin->assignRole($adminRole);
        
        // Authenticate as admin before creating entities
        $this->actingAs($this->admin);

        // Create asset hierarchy
        $plant = Plant::factory()->create();
        $area = Area::factory()->create(['plant_id' => $plant->id]);
        $sector = Sector::factory()->create(['area_id' => $area->id]);
        $this->asset = Asset::factory()->create([
            'plant_id' => $plant->id,
            'area_id' => $area->id,
            'sector_id' => $sector->id,
        ]);

        // Create work order type
        $this->workOrderType = WorkOrderType::factory()->create([
            'category' => 'corrective'
        ]);

        // Create work order
        $this->workOrder = WorkOrder::factory()->create([
            'discipline' => 'maintenance',
            'work_order_type_id' => $this->workOrderType->id,
            'work_order_category' => 'corrective',
            'title' => 'Original Title',
            'description' => 'Original Description',
            'asset_id' => $this->asset->id,

            'priority_score' => 50,
            'requested_due_date' => now()->addDays(7),
            'downtime_required' => false,
            'external_reference' => 'REF-001',
            'warranty_claim' => false,
            'tags' => ['original', 'test'],
            'status' => WorkOrder::STATUS_REQUESTED,
        ]);
    }

    public function test_admin_can_update_work_order_with_all_fields()
    {
        $this->actingAs($this->admin);

        $newAsset = Asset::factory()->create();
        $newType = WorkOrderType::factory()->create([
            'category' => 'preventive'
        ]);

        $updateData = [
            'work_order_type_id' => $newType->id,
            'work_order_category' => 'preventive',
            'title' => 'Updated Title',
            'description' => 'Updated Description',
            'asset_id' => $newAsset->id,
            'priority_score' => 75,
            'requested_due_date' => now()->addDays(14)->format('Y-m-d\TH:i:s'),
            'downtime_required' => true,
            'external_reference' => 'REF-002-UPDATED',
            'warranty_claim' => true,
            'tags' => ['updated', 'test', 'new'],
        ];

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            $updateData
        );

        $response->assertRedirect(route('maintenance.work-orders.show', $this->workOrder));
        $response->assertSessionHas('success', 'Ordem de serviço atualizada com sucesso.');

        // Verify the work order was updated
        $this->workOrder->refresh();
        
        $this->assertEquals($newType->id, $this->workOrder->work_order_type_id);
        $this->assertEquals('preventive', $this->workOrder->work_order_category);
        $this->assertEquals('Updated Title', $this->workOrder->title);
        $this->assertEquals('Updated Description', $this->workOrder->description);
        $this->assertEquals($newAsset->id, $this->workOrder->asset_id);
        $this->assertEquals(75, $this->workOrder->priority_score);
        $this->assertTrue($this->workOrder->downtime_required);
        $this->assertEquals('REF-002-UPDATED', $this->workOrder->external_reference);
        $this->assertTrue($this->workOrder->warranty_claim);
        $this->assertEquals(['updated', 'test', 'new'], $this->workOrder->tags);
    }

    public function test_update_preserves_fields_not_sent()
    {
        $this->actingAs($this->admin);

        $originalDueDate = $this->workOrder->requested_due_date;

        // Update only title and description
        $updateData = [
            'title' => 'Only Title Updated',
            'description' => 'Only Description Updated',
        ];

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            $updateData
        );

        $response->assertRedirect();

        // Verify only specified fields were updated
        $this->workOrder->refresh();
        
        $this->assertEquals('Only Title Updated', $this->workOrder->title);
        $this->assertEquals('Only Description Updated', $this->workOrder->description);
        
        // Verify other fields remain unchanged
        $this->assertEquals('corrective', $this->workOrder->work_order_category);
        $this->assertEquals(50, $this->workOrder->priority_score);
        $this->assertEquals($originalDueDate->format('Y-m-d H:i:s'), $this->workOrder->requested_due_date->format('Y-m-d H:i:s'));
        $this->assertFalse($this->workOrder->downtime_required);
        $this->assertEquals('REF-001', $this->workOrder->external_reference);
    }

    public function test_cannot_update_work_order_in_progress_with_restricted_fields()
    {
        $this->actingAs($this->admin);

        // Change work order status to in_progress
        $this->workOrder->update(['status' => 'in_progress']);

        $updateData = [
            'title' => 'Should Not Update',
            'work_order_category' => 'predictive',
            'priority_score' => 80, // This should also not update
        ];

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            $updateData
        );

        $response->assertRedirect();

        // Verify only allowed fields were updated
        $this->workOrder->refresh();
        
        // These fields should NOT have been updated for in_progress status
        $this->assertEquals('Original Title', $this->workOrder->title);
        $this->assertEquals('corrective', $this->workOrder->work_order_category);
        $this->assertEquals(50, $this->workOrder->priority_score);
    }

    public function test_validation_errors_for_invalid_data()
    {
        $this->actingAs($this->admin);

        $updateData = [
            'priority_score' => 150, // Invalid: max is 100
            'work_order_category' => 'invalid_category', // Invalid category
            'work_order_type_id' => 99999, // Non-existent ID
        ];

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            $updateData
        );

        $response->assertSessionHasErrors([
            'priority_score',
            'work_order_category',
            'work_order_type_id'
        ]);

        // Verify nothing was updated
        $this->workOrder->refresh();
        $this->assertEquals('Original Title', $this->workOrder->title);
        $this->assertEquals(50, $this->workOrder->priority_score);
    }

    /**
     * Test that work orders can only be edited when in 'requested' status
     */
    public function test_can_only_update_work_order_in_requested_status()
    {
        $this->actingAs($this->admin);

        // Verify we can update when status is 'requested'
        $this->assertEquals(WorkOrder::STATUS_REQUESTED, $this->workOrder->status);

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            ['title' => 'Updated in Requested Status']
        );

        $response->assertRedirect();
        $this->workOrder->refresh();
        $this->assertEquals('Updated in Requested Status', $this->workOrder->title);
    }

    /**
     * Test that approved work orders cannot be edited
     */
    public function test_cannot_update_approved_work_order()
    {
        $this->actingAs($this->admin);

        // Change status to approved
        $this->workOrder->update(['status' => WorkOrder::STATUS_APPROVED]);

        $updateData = [
            'title' => 'Should Not Update',
            'description' => 'This should not be saved',
            'priority_score' => 90,
            'work_order_category' => 'preventive',
        ];

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            $updateData
        );

        $response->assertRedirect();

        // Verify nothing was updated
        $this->workOrder->refresh();
        $this->assertEquals('Original Title', $this->workOrder->title);
        $this->assertEquals('Original Description', $this->workOrder->description);
        $this->assertEquals(50, $this->workOrder->priority_score);
        $this->assertEquals('corrective', $this->workOrder->work_order_category);
    }

    /**
     * Test that rejected work orders cannot be edited
     */
    public function test_cannot_update_rejected_work_order()
    {
        $this->actingAs($this->admin);

        // Change status to rejected
        $this->workOrder->update(['status' => WorkOrder::STATUS_REJECTED]);

        $updateData = [
            'title' => 'Should Not Update',
            'priority_score' => 90,
        ];

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            $updateData
        );

        $response->assertRedirect();

        // Verify nothing was updated
        $this->workOrder->refresh();
        $this->assertEquals('Original Title', $this->workOrder->title);
        $this->assertEquals(50, $this->workOrder->priority_score);
    }

    /**
     * Test that planned work orders cannot be edited
     */
    public function test_cannot_update_planned_work_order()
    {
        $this->actingAs($this->admin);

        // Change status to planned
        $this->workOrder->update(['status' => WorkOrder::STATUS_PLANNED]);

        $updateData = [
            'title' => 'Should Not Update',
            'description' => 'This should not be saved',
        ];

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            $updateData
        );

        $response->assertRedirect();

        // Verify nothing was updated
        $this->workOrder->refresh();
        $this->assertEquals('Original Title', $this->workOrder->title);
        $this->assertEquals('Original Description', $this->workOrder->description);
    }

    /**
     * Test that completed work orders cannot be edited
     */
    public function test_cannot_update_completed_work_order()
    {
        $this->actingAs($this->admin);

        // Change status to completed
        $this->workOrder->update(['status' => WorkOrder::STATUS_COMPLETED]);

        $updateData = [
            'title' => 'Should Not Update',
        ];

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            $updateData
        );

        $response->assertRedirect();

        // Verify nothing was updated
        $this->workOrder->refresh();
        $this->assertEquals('Original Title', $this->workOrder->title);
    }

    /**
     * Test all different statuses to ensure only 'requested' allows updates
     */
    public function test_comprehensive_status_update_restrictions()
    {
        $this->actingAs($this->admin);

        $statuses = [
            WorkOrder::STATUS_APPROVED,
            WorkOrder::STATUS_REJECTED,
            WorkOrder::STATUS_PLANNED,
            WorkOrder::STATUS_READY_TO_SCHEDULE,
            WorkOrder::STATUS_SCHEDULED,
            WorkOrder::STATUS_IN_PROGRESS,
            WorkOrder::STATUS_ON_HOLD,
            WorkOrder::STATUS_COMPLETED,
            WorkOrder::STATUS_VERIFIED,
            WorkOrder::STATUS_CLOSED,
            WorkOrder::STATUS_CANCELLED,
        ];

        foreach ($statuses as $status) {
            // Create a new work order for each test to avoid state pollution
            $workOrder = WorkOrder::factory()->create([
                'discipline' => 'maintenance',
                'work_order_category' => 'corrective',
                'title' => 'Original Title',
                'status' => $status,
                'asset_id' => $this->asset->id,
                'work_order_type_id' => $this->workOrderType->id,
            ]);

            $response = $this->put(
                route('maintenance.work-orders.update', $workOrder),
                ['title' => "Updated in {$status} status"]
            );

            $response->assertRedirect();
            
            $workOrder->refresh();
            // Title should not have been updated for any of these statuses
            $this->assertEquals(
                'Original Title', 
                $workOrder->title,
                "Work order in '{$status}' status should not allow title updates"
            );
        }
    }

    /**
     * Test that in_progress status only allows specific field updates
     */
    public function test_in_progress_allows_only_estimated_hours_update()
    {
        $this->actingAs($this->admin);

        // Change status to in_progress
        $this->workOrder->update(['status' => WorkOrder::STATUS_IN_PROGRESS]);

        $updateData = [
            'title' => 'Should Not Update',
            'estimated_hours' => 8.5, // This should update
            'priority_score' => 90, // This should not update
        ];

        $response = $this->put(
            route('maintenance.work-orders.update', $this->workOrder),
            $updateData
        );

        $response->assertRedirect();

        // Verify only estimated_hours was updated
        $this->workOrder->refresh();
        $this->assertEquals('Original Title', $this->workOrder->title);
        $this->assertEquals(50, $this->workOrder->priority_score);
        $this->assertEquals(8.5, $this->workOrder->estimated_hours);
    }
} 
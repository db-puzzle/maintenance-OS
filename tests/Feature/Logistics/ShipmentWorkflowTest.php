<?php

namespace Tests\Feature\Logistics;

use App\Models\AssetHierarchy\Manufacturer;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\Shipment;
use App\Models\Production\ShipmentItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for shipment workflow.
 *
 * Tests the complete logistics workflow including shipment creation,
 * marking as shipped, and receiving with integration to external steps.
 */
class ShipmentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        // Create a non-admin user for testing
        $this->user = User::factory()->create();
        User::factory()->create(); // Create another user so first isn't auto-admin
    }

    /**
     * Test user can view shipments index.
     */
    public function test_user_can_view_shipments_index(): void
    {
        $this->actingAs($this->user)
            ->get(route('logistics.shipments.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('logistics/shipments/index')
                ->has('shipments'));
    }

    /**
     * Test user can create shipment.
     */
    public function test_user_can_create_shipment(): void
    {
        $manufacturer = Manufacturer::factory()->create();
        $mo = ManufacturingOrder::factory()->create();

        $this->actingAs($this->user)
            ->post(route('logistics.shipments.store'), [
                'destination_type' => 'manufacturer',
                'destination_id' => $manufacturer->id,
                'planned_ship_date' => now()->addDays(1)->format('Y-m-d'),
                'items' => [
                    [
                        'manufacturing_order_id' => $mo->id,
                        'quantity' => 100,
                    ],
                ],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('shipments', [
            'destination_type' => 'manufacturer',
            'destination_id' => $manufacturer->id,
        ]);
    }

    /**
     * Test marking shipment as shipped updates related steps.
     */
    public function test_marking_shipment_as_shipped_updates_related_steps(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'awaiting_shipment',
            'status' => 'queued',
        ]);

        $shipment = Shipment::factory()->create(['status' => 'planned']);
        $item = ShipmentItem::factory()->create([
            'shipment_id' => $shipment->id,
            'manufacturing_step_id' => $step->id,
            'quantity_shipped' => 50,
        ]);

        $this->actingAs($this->user)
            ->post(route('logistics.shipments.mark-as-shipped', $shipment), [
                'tracking_number' => 'TRACK123',
                'carrier_name' => 'UPS',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $shipment->refresh();
        $step->refresh();

        expect($shipment->status)->toBe('shipped')
            ->and($step->external_status)->toBe('shipped')
            ->and($step->status)->toBe('in_progress');
    }

    /**
     * Test marking shipment as received completes external step.
     */
    public function test_marking_shipment_as_received_completes_external_step(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'in_process',
            'status' => 'in_progress',
            'quantity_shipped' => 100,
        ]);

        $shipment = Shipment::factory()->create(['status' => 'shipped']);
        $item = ShipmentItem::factory()->create([
            'shipment_id' => $shipment->id,
            'manufacturing_step_id' => $step->id,
            'quantity_shipped' => 100,
        ]);

        $this->actingAs($this->user)
            ->post(route('logistics.shipments.mark-as-received', $shipment), [
                'items' => [
                    [
                        'item_id' => $item->id,
                        'quantity_received' => 100,
                        'quantity_rejected' => 0,
                    ],
                ],
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $shipment->refresh();
        $step->refresh();

        expect($shipment->status)->toBe('received')
            ->and($step->status)->toBe('completed')
            ->and($step->quantity_received)->toBe(100.0);
    }

    /**
     * Test partial shipment receipt does not complete step.
     */
    public function test_partial_shipment_receipt_does_not_complete_step(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'in_process',
            'status' => 'in_progress',
            'quantity_shipped' => 100,
        ]);

        $shipment = Shipment::factory()->create(['status' => 'shipped']);
        $item = ShipmentItem::factory()->create([
            'shipment_id' => $shipment->id,
            'manufacturing_step_id' => $step->id,
            'quantity_shipped' => 100,
        ]);

        // Receive only 50 units
        $this->actingAs($this->user)
            ->post(route('logistics.shipments.mark-as-received', $shipment), [
                'items' => [
                    [
                        'item_id' => $item->id,
                        'quantity_received' => 50,
                        'quantity_rejected' => 0,
                    ],
                ],
            ])
            ->assertRedirect();

        $step->refresh();
        expect($step->status)->toBe('in_progress') // Still in progress!
            ->and($step->quantity_received)->toBe(50.0);
    }
}

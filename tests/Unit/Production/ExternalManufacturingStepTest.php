<?php

namespace Tests\Unit\Production;

use App\Models\AssetHierarchy\Manufacturer;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Unit tests for external manufacturing step functionality.
 *
 * Tests the lifecycle of steps executed by external manufacturers,
 * including status transitions, quantity tracking, and completion logic.
 */
class ExternalManufacturingStepTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that external step initializes with awaiting_shipment status.
     */
    public function test_external_step_initializes_with_awaiting_shipment_status(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'status' => 'pending',
        ]);

        expect($step->external_status)->toBe('awaiting_shipment');
    }

    /**
     * Test that internal step clears external fields.
     */
    public function test_internal_step_clears_external_fields(): void
    {
        $manufacturer = Manufacturer::factory()->create();

        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'manufacturer_id' => $manufacturer->id,
            'expected_lead_time_days' => 10,
        ]);

        $step->update(['execution_location' => 'internal']);

        expect($step->manufacturer_id)->toBeNull()
            ->and($step->expected_lead_time_days)->toBeNull()
            ->and($step->external_status)->toBeNull();
    }

    /**
     * Test can mark external step as shipped.
     */
    public function test_can_mark_external_step_as_shipped(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'awaiting_shipment',
            'manufacturer_id' => Manufacturer::factory()->create()->id,
            'status' => 'queued',
        ]);

        $step->markAsShipped(50, 'Shipped via UPS');

        expect($step->external_status)->toBe('shipped')
            ->and($step->quantity_shipped)->toBe(50.0)
            ->and($step->shipped_date)->not->toBeNull()
            ->and($step->status)->toBe('in_progress');
    }

    /**
     * Test cannot skip external status progression.
     */
    public function test_cannot_skip_external_status_progression(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'awaiting_shipment',
            'manufacturer_id' => Manufacturer::factory()->create()->id,
        ]);

        $this->expectException(\Exception::class);
        $step->markAsInProcess();
    }

    /**
     * Test calculates remaining quantity to ship correctly.
     */
    public function test_calculates_remaining_quantity_to_ship_correctly(): void
    {
        $order = ManufacturingOrder::factory()->create(['quantity' => 100]);
        $route = ManufacturingRoute::factory()->create([
            'manufacturing_order_id' => $order->id,
        ]);

        $step = ManufacturingStep::factory()->create([
            'manufacturing_route_id' => $route->id,
            'execution_location' => 'external',
            'quantity_shipped' => 30,
        ]);

        expect($step->remaining_quantity_to_ship)->toBe(70.0);
    }

    /**
     * Test external step uses lead time for duration.
     */
    public function test_external_step_uses_lead_time_for_duration(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'expected_lead_time_days' => 5,
        ]);

        $expectedDuration = 5 * 24 * 60 * 60; // 5 days in seconds
        expect($step->getEstimatedDuration())->toBe($expectedDuration);
    }

    /**
     * Test step completes when all quantity received.
     */
    public function test_step_completes_when_all_quantity_received(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'in_process',
            'status' => 'in_progress',
            'quantity_shipped' => 100,
        ]);

        $step->recordQuantityReceived(100, 'All items returned from manufacturer');

        $step->refresh();
        expect($step->status)->toBe('completed')
            ->and($step->actual_end_time)->not->toBeNull();
    }

    /**
     * Test partial receipt does not complete step.
     */
    public function test_partial_receipt_does_not_complete_step(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'in_process',
            'status' => 'in_progress',
            'quantity_shipped' => 100,
            'quantity_received' => 0,
        ]);

        // Receive only 50 out of 100
        $step->recordQuantityReceived(50, 'First batch returned');

        $step->refresh();
        expect($step->external_status)->toBe('in_process')
            ->and($step->status)->toBe('in_progress')
            ->and($step->quantity_received)->toBe(50.0)
            ->and($step->actual_end_time)->toBeNull();
    }

    /**
     * Test isExternal helper method.
     */
    public function test_is_external_helper_method(): void
    {
        $externalStep = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
        ]);

        $internalStep = ManufacturingStep::factory()->create([
            'execution_location' => 'internal',
        ]);

        expect($externalStep->isExternal())->toBeTrue()
            ->and($internalStep->isExternal())->toBeFalse()
            ->and($externalStep->isInternal())->toBeFalse()
            ->and($internalStep->isInternal())->toBeTrue();
    }
}

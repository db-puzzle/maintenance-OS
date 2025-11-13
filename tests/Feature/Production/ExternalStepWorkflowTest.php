<?php

namespace Tests\Feature\Production;

use App\Models\AssetHierarchy\Manufacturer;
use App\Models\Production\ManufacturingStep;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Feature tests for external step workflow.
 *
 * Tests the complete workflow of external manufacturing steps,
 * from marking as shipped through receiving and completion.
 */
class ExternalStepWorkflowTest extends TestCase
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
     * Test user can view external steps dashboard.
     */
    public function test_user_can_view_external_steps_dashboard(): void
    {
        $this->actingAs($this->user)
            ->get(route('production.external-steps.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('production/external-steps/index')
                ->has('awaitingShipment')
                ->has('atManufacturers'));
    }

    /**
     * Test user can mark step as shipped with photos.
     */
    public function test_user_can_mark_step_as_shipped_with_photos(): void
    {
        Storage::fake('public');

        $manufacturer = Manufacturer::factory()->create();
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'awaiting_shipment',
            'manufacturer_id' => $manufacturer->id,
            'status' => 'queued',
        ]);

        $photo = UploadedFile::fake()->image('shipment.jpg');

        $this->actingAs($this->user)
            ->post(route('production.external-steps.mark-as-shipped', $step), [
                'quantity' => 50,
                'notes' => 'Shipped today',
                'photos' => [$photo],
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $step->refresh();
        expect($step->external_status)->toBe('shipped')
            ->and($step->quantity_shipped)->toBe(50.0)
            ->and($step->status)->toBe('in_progress');
    }

    /**
     * Test user cannot skip status progression.
     */
    public function test_user_cannot_skip_status_progression(): void
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'awaiting_shipment',
            'manufacturer_id' => Manufacturer::factory()->create()->id,
        ]);

        $this->actingAs($this->user)
            ->post(route('production.external-steps.record-quantity-received', $step), [
                'quantity' => 50,
            ])
            ->assertRedirect()
            ->assertSessionHas('error');

        $step->refresh();
        expect($step->external_status)->toBe('awaiting_shipment');
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

        // This would typically be called by ShipmentService::markAsReceived()
        $step->recordQuantityReceived(100, 'All items returned from manufacturer');

        $step->refresh();
        expect($step->external_status)->toBe('in_process')
            ->and($step->status)->toBe('completed')
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
}

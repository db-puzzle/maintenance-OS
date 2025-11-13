<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingStep;
use Illuminate\Support\Facades\DB;

/**
 * Service for handling external manufacturing step operations.
 *
 * This service manages the lifecycle of steps executed by external manufacturers,
 * including shipping, processing status updates, and receipt tracking.
 */
class ExternalStepService
{
    /**
     * Mark a step as shipped with quantity.
     *
     * @param ManufacturingStep $step The step to mark as shipped
     * @param float $quantity The quantity being shipped
     * @param string|null $notes Optional shipping notes
     * @param array $photos Array of photo files
     * @return ManufacturingStep Updated step with relationships
     *
     * @throws \Exception If step cannot be shipped
     */
    public function markAsShipped(
        ManufacturingStep $step,
        float $quantity,
        ?string $notes = null,
        array $photos = []
    ): ManufacturingStep {
        if (! $step->canMarkAsShipped()) {
            throw new \Exception('Step cannot be marked as shipped in current state');
        }

        DB::transaction(function () use ($step, $quantity, $notes, $photos) {
            $step->markAsShipped($quantity, $notes);

            // Handle photos if provided
            if (! empty($photos)) {
                foreach ($photos as $photo) {
                    $step->addMedia($photo)
                        ->withCustomProperties(['type' => 'shipment'])
                        ->toMediaCollection('external_step_photos');
                }
            }
        });

        return $step->fresh(['manufacturer', 'manufacturingRoute.manufacturingOrder']);
    }

    /**
     * Mark a step as in process at manufacturer.
     *
     * @param ManufacturingStep $step The step to mark as in process
     * @param string|null $notes Optional processing notes
     * @return ManufacturingStep Updated step with relationships
     *
     * @throws \Exception If step cannot be marked as in process
     */
    public function markAsInProcess(
        ManufacturingStep $step,
        ?string $notes = null
    ): ManufacturingStep {
        if (! $step->canMarkAsInProcess()) {
            throw new \Exception('Step cannot be marked as in process in current state');
        }

        $step->markAsInProcess($notes);

        return $step->fresh(['manufacturer', 'manufacturingRoute.manufacturingOrder']);
    }

    /**
     * Record quantity received for a step.
     *
     * NOTE: This is typically called by the Logistics Module when a shipment
     * is marked as received. Direct calls to this service are for cases where
     * items are received without formal shipment tracking.
     *
     * @param ManufacturingStep $step The step receiving items
     * @param float $quantity The quantity received
     * @param string|null $notes Optional receipt notes
     * @param array $photos Array of photo files
     * @return ManufacturingStep Updated step with relationships
     *
     * @throws \Exception If step is not external
     */
    public function recordQuantityReceived(
        ManufacturingStep $step,
        float $quantity,
        ?string $notes = null,
        array $photos = []
    ): ManufacturingStep {
        if (! $step->isExternal()) {
            throw new \Exception('Can only record received quantity for external steps');
        }

        DB::transaction(function () use ($step, $quantity, $notes, $photos) {
            $step->recordQuantityReceived($quantity, $notes);

            // Handle photos if provided (these go on the step, not the shipment)
            if (! empty($photos)) {
                foreach ($photos as $photo) {
                    $step->addMedia($photo)
                        ->withCustomProperties(['type' => 'receipt'])
                        ->toMediaCollection('external_step_photos');
                }
            }
        });

        return $step->fresh(['manufacturer', 'manufacturingRoute.manufacturingOrder']);
    }

    /**
     * Get all steps awaiting shipment.
     *
     * @return \Illuminate\Support\Collection Collection of steps
     */
    public function getStepsAwaitingShipment()
    {
        return ManufacturingStep::awaitingShipment()
            ->with([
                'manufacturer',
                'manufacturingRoute.manufacturingOrder.item',
                'workCell',
            ])
            ->orderBy('scheduled_start')
            ->get();
    }

    /**
     * Get all steps currently at manufacturers.
     *
     * @return \Illuminate\Support\Collection Collection of steps
     */
    public function getStepsAtManufacturers()
    {
        return ManufacturingStep::atManufacturer()
            ->with([
                'manufacturer',
                'manufacturingRoute.manufacturingOrder.item',
                'workCell',
            ])
            ->orderBy('shipped_date')
            ->get();
    }

    /**
     * Get steps by manufacturer.
     *
     * @param int $manufacturerId The manufacturer ID
     * @return \Illuminate\Support\Collection Collection of steps
     */
    public function getStepsByManufacturer(int $manufacturerId)
    {
        return ManufacturingStep::external()
            ->where('manufacturer_id', $manufacturerId)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->with([
                'manufacturingRoute.manufacturingOrder.item',
                'workCell',
            ])
            ->orderBy('external_status')
            ->orderBy('scheduled_start')
            ->get();
    }

    /**
     * Validate if step can transition to external.
     *
     * @param ManufacturingStep $step The step to validate
     * @return array Array of validation issues (empty if valid)
     */
    public function validateExternalTransition(ManufacturingStep $step): array
    {
        $issues = [];

        // Check if step is already started
        if (in_array($step->status, ['in_progress', 'completed'])) {
            $issues[] = 'Cannot convert to external: step is already in progress or completed';
        }

        // Check if there are any completed executions
        if ($step->executions()->where('status', 'completed')->exists()) {
            $issues[] = 'Cannot convert to external: step has completed executions';
        }

        return $issues;
    }

    /**
     * Convert an internal step to external.
     *
     * @param ManufacturingStep $step The step to convert
     * @param int $manufacturerId The manufacturer ID
     * @param int|null $expectedLeadTimeDays Expected lead time in days
     * @return ManufacturingStep Updated step
     *
     * @throws \Exception If conversion is not allowed
     */
    public function convertToExternal(
        ManufacturingStep $step,
        int $manufacturerId,
        ?int $expectedLeadTimeDays = null
    ): ManufacturingStep {
        $issues = $this->validateExternalTransition($step);

        if (! empty($issues)) {
            throw new \Exception('Cannot convert to external: ' . implode('; ', $issues));
        }

        $step->update([
            'execution_location' => 'external',
            'manufacturer_id' => $manufacturerId,
            'expected_lead_time_days' => $expectedLeadTimeDays,
            'external_status' => 'awaiting_shipment',
            // Clear internal-specific times if using lead time
            'setup_time_seconds' => 0,
            'cycle_time_seconds' => 0,
            'use_workcell_throughput' => false,
        ]);

        activity()
            ->performedOn($step)
            ->causedBy(auth()->user())
            ->withProperties([
                'manufacturer_id' => $manufacturerId,
                'expected_lead_time_days' => $expectedLeadTimeDays,
            ])
            ->log('Step converted to external execution');

        return $step->fresh(['manufacturer']);
    }
}

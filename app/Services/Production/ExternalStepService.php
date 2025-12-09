<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingStep;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Service for managing external manufacturing steps.
 *
 * Handles the lifecycle of steps executed by third-party manufacturers,
 * including status transitions, quantity tracking, and photo management.
 */
class ExternalStepService
{
    /**
     * Mark step as shipped.
     *
     * Updates step when items are shipped to external manufacturer.
     *
     * @param ManufacturingStep $step The step to mark as shipped
     * @param float $quantityShipped Quantity being shipped
     * @param array $photos Optional array of photo files
     * @return ManufacturingStep Updated step
     */
    public function markAsShipped(ManufacturingStep $step, float $quantityShipped, array $photos = []): ManufacturingStep
    {
        DB::transaction(function () use ($step, $quantityShipped, $photos) {
            $step->update([
                'external_status' => 'at_manufacturer',
                'status' => 'in_progress',
            ]);

            // Handle photos if provided
            foreach ($photos as $photo) {
                $step->addMedia($photo)
                    ->withCustomProperties([
                        'type' => 'shipment',
                        'taken_by' => auth()->id(),
                    ])
                    ->toMediaCollection('step_photos');
            }

            activity()
                ->performedOn($step)
                ->causedBy(auth()->user())
                ->withProperties(['quantity_shipped' => $quantityShipped])
                ->log('External step marked as shipped');
        });

        return $step->fresh();
    }

    /**
     * Mark step as in process at manufacturer.
     *
     * Updates step when manufacturer starts working on it.
     *
     * @param ManufacturingStep $step The step to mark as in process
     * @param string|null $notes Optional notes
     * @return ManufacturingStep Updated step
     */
    public function markAsInProcess(ManufacturingStep $step, ?string $notes = null): ManufacturingStep
    {
        $step->update([
            'external_status' => 'at_manufacturer',
            'status' => 'in_progress',
        ]);

        activity()
            ->performedOn($step)
            ->causedBy(auth()->user())
            ->withProperties(['notes' => $notes])
            ->log('External step marked as in process at manufacturer');

        return $step->fresh();
    }

    /**
     * Record quantity received from manufacturer.
     *
     * This is the critical integration point. When items are received,
     * the step may be marked as completed if all quantities are received.
     *
     * @param ManufacturingStep $step The step
     * @param float $quantityReceived Quantity received
     * @param string|null $notes Optional notes
     * @param array $photos Optional array of photo files
     * @return ManufacturingStep Updated step
     */
    public function recordQuantityReceived(
        ManufacturingStep $step,
        float $quantityReceived,
        ?string $notes = null,
        array $photos = []
    ): ManufacturingStep {
        DB::transaction(function () use ($step, $quantityReceived, $notes, $photos) {
            // This method is typically called from ShipmentItem::recordReceipt()
            // The step model's recordQuantityReceived() will handle completion logic
            $step->recordQuantityReceived($quantityReceived, $notes);

            // Handle photos if provided
            foreach ($photos as $photo) {
                $step->addMedia($photo)
                    ->withCustomProperties([
                        'type' => 'receipt',
                        'taken_by' => auth()->id(),
                        'notes' => $notes,
                    ])
                    ->toMediaCollection('step_photos');
            }
        });

        return $step->fresh();
    }

    /**
     * Get steps awaiting shipment.
     *
     * Returns steps that are ready to be shipped to external manufacturers.
     *
     * @return Collection Collection of steps awaiting shipment
     */
    public function getStepsAwaitingShipment(): Collection
    {
        return ManufacturingStep::where('execution_location', 'external')
            ->where('external_status', 'awaiting_shipment')
            ->whereIn('status', ['queued', 'in_progress'])
            ->with([
                'manufacturer',
                'manufacturingRoute.manufacturingOrder.item',
            ])
            ->orderBy('scheduled_start')
            ->get();
    }

    /**
     * Get steps currently at manufacturers.
     *
     * Returns steps that are in process at external manufacturers.
     *
     * @return Collection Collection of steps at manufacturers
     */
    public function getStepsAtManufacturers(): Collection
    {
        return ManufacturingStep::where('execution_location', 'external')
            ->where('external_status', 'at_manufacturer')
            ->where('status', 'in_progress')
            ->with([
                'manufacturer',
                'manufacturingRoute.manufacturingOrder.item',
                'shipmentItems.shipment',
            ])
            ->orderBy('scheduled_start')
            ->get();
    }

    /**
     * Get steps grouped by manufacturer.
     *
     * Groups external steps by manufacturer for bundling suggestions.
     *
     * @return Collection Collection grouped by manufacturer
     */
    public function getStepsByManufacturer(): Collection
    {
        $steps = $this->getStepsAwaitingShipment();

        return $steps->groupBy('manufacturer_id')->map(function ($manufacturerSteps, $manufacturerId) {
            return [
                'manufacturer_id' => $manufacturerId,
                'manufacturer' => $manufacturerSteps->first()->manufacturer,
                'steps' => $manufacturerSteps,
                'total_orders' => $manufacturerSteps->pluck('manufacturingRoute.manufacturing_order_id')->unique()->count(),
                'total_steps' => $manufacturerSteps->count(),
            ];
        })->values();
    }

    /**
     * Validate external step transition.
     *
     * Checks if a step can transition to a new status.
     *
     * @param ManufacturingStep $step The step
     * @param string $newStatus The desired new status
     * @return array Validation result
     */
    public function validateExternalTransition(ManufacturingStep $step, string $newStatus): array
    {
        if ($step->execution_location !== 'external') {
            return [
                'valid' => false,
                'error' => 'Step is not an external step',
            ];
        }

        $validTransitions = [
            'awaiting_shipment' => ['at_manufacturer'],
            'at_manufacturer' => ['at_manufacturer'], // Can stay in same status
        ];

        $currentStatus = $step->external_status;

        if (! isset($validTransitions[$currentStatus]) || ! in_array($newStatus, $validTransitions[$currentStatus])) {
            return [
                'valid' => false,
                'error' => "Cannot transition from {$currentStatus} to {$newStatus}",
            ];
        }

        return [
            'valid' => true,
        ];
    }

    /**
     * Convert internal step to external.
     *
     * Converts an existing internal step to be executed externally.
     *
     * @param ManufacturingStep $step The step to convert
     * @param int $manufacturerId The manufacturer ID
     * @param int|null $leadTimeDays Expected lead time in days
     * @return ManufacturingStep Updated step
     */
    public function convertToExternal(
        ManufacturingStep $step,
        int $manufacturerId,
        ?int $leadTimeDays = null
    ): ManufacturingStep {
        if ($step->status !== 'pending' && $step->status !== 'queued') {
            throw new \Exception('Can only convert pending or queued steps to external');
        }

        $step->update([
            'execution_location' => 'external',
            'manufacturer_id' => $manufacturerId,
            'expected_lead_time_days' => $leadTimeDays,
            'external_status' => 'awaiting_shipment',
        ]);

        activity()
            ->performedOn($step)
            ->causedBy(auth()->user())
            ->withProperties(['manufacturer_id' => $manufacturerId])
            ->log('Step converted to external execution');

        return $step->fresh();
    }
}

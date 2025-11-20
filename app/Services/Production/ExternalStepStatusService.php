<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingStep;
use App\Models\Production\Shipment;

/**
 * Service for providing a unified view of external step status.
 *
 * This service consolidates data from manufacturing steps and the logistics module
 * to provide a complete picture of external step status without data duplication.
 */
class ExternalStepStatusService
{
    /**
     * Get comprehensive external step status.
     *
     * @param ManufacturingStep $step The external manufacturing step
     * @return array Unified status information
     */
    public function getExternalStepStatus(ManufacturingStep $step): array
    {
        if (! $step->isExternal()) {
            throw new \InvalidArgumentException('Step must be external');
        }

        $activeShipments = $this->getActiveShipments($step);
        $allShipments = $this->getAllShipments($step);

        return [
            'step_id' => $step->id,
            'step_name' => $step->name,
            'step_status' => $step->status,
            'external_status' => $step->external_status,
            'manufacturer' => $step->manufacturer,
            'expected_lead_time_days' => $step->expected_lead_time_days,

            // Quantities (computed from shipments)
            'quantity_required' => $step->manufacturingRoute->manufacturingOrder->quantity,
            'quantity_shipped' => $step->total_quantity_shipped,
            'quantity_received' => $step->total_quantity_received,
            'quantity_remaining_to_ship' => $step->remaining_quantity_to_ship,
            'quantity_remaining_to_receive' => $step->remaining_quantity_to_receive,

            // Status flags
            'is_fully_shipped' => $this->isFullyShipped($step),
            'is_fully_received' => $this->isFullyReceived($step),
            'has_active_shipments' => $activeShipments->isNotEmpty(),

            // Location tracking
            'current_location' => $this->determineCurrentLocation($step, $activeShipments),
            'location_details' => $this->getLocationDetails($step, $activeShipments),

            // Shipment information
            'active_shipments' => $activeShipments->map(fn ($s) => $this->formatShipmentSummary($s)),
            'all_shipments' => $allShipments->map(fn ($s) => $this->formatShipmentSummary($s)),

            // Timeline
            'timeline' => $this->buildTimeline($step, $allShipments),

            // Dates (from shipments)
            'first_shipped_date' => $this->getFirstShippedDate($allShipments),
            'last_shipped_date' => $step->last_shipped_date,
            'last_received_date' => $step->last_received_date,
            'estimated_completion_date' => $this->estimateCompletionDate($step, $activeShipments),
        ];
    }

    /**
     * Get simplified status for list views.
     */
    public function getSimplifiedStatus(ManufacturingStep $step): array
    {
        if (! $step->isExternal()) {
            return [];
        }

        $activeShipment = $this->getLatestActiveShipment($step);

        return [
            'step_id' => $step->id,
            'status' => $step->status,
            'external_status' => $step->external_status,
            'current_location' => $this->determineCurrentLocation($step, collect([$activeShipment])->filter()),
            'quantity_shipped' => $step->total_quantity_shipped,
            'quantity_received' => $step->total_quantity_received,
            'active_shipment' => $activeShipment ? $this->formatShipmentSummary($activeShipment) : null,
        ];
    }

    /**
     * Get active shipments for a step.
     */
    private function getActiveShipments(ManufacturingStep $step)
    {
        return Shipment::whereHas('items', function ($query) use ($step) {
            $query->where('manufacturing_step_id', $step->id);
        })
            ->whereNotIn('status', ['received', 'cancelled'])
            ->with(['items' => function ($query) use ($step) {
                $query->where('manufacturing_step_id', $step->id);
            }])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get all shipments for a step.
     */
    private function getAllShipments(ManufacturingStep $step)
    {
        return Shipment::whereHas('items', function ($query) use ($step) {
            $query->where('manufacturing_step_id', $step->id);
        })
            ->with(['items' => function ($query) use ($step) {
                $query->where('manufacturing_step_id', $step->id);
            }])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get the latest active shipment.
     */
    private function getLatestActiveShipment(ManufacturingStep $step): ?Shipment
    {
        return Shipment::whereHas('items', function ($query) use ($step) {
            $query->where('manufacturing_step_id', $step->id);
        })
            ->whereNotIn('status', ['received', 'cancelled'])
            ->with(['items' => function ($query) use ($step) {
                $query->where('manufacturing_step_id', $step->id);
            }])
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Determine if step is fully shipped.
     */
    private function isFullyShipped(ManufacturingStep $step): bool
    {
        $requiredQuantity = $step->manufacturingRoute->manufacturingOrder->quantity;

        return $step->total_quantity_shipped >= $requiredQuantity;
    }

    /**
     * Determine if step is fully received.
     */
    private function isFullyReceived(ManufacturingStep $step): bool
    {
        return $step->total_quantity_received >= $step->total_quantity_shipped
            && $step->total_quantity_shipped > 0;
    }

    /**
     * Determine current location of items.
     */
    private function determineCurrentLocation(ManufacturingStep $step, $activeShipments): string
    {
        // If no active shipments and not fully received, items are awaiting shipment
        if ($activeShipments->isEmpty()) {
            if ($step->total_quantity_received < $step->total_quantity_shipped) {
                // Items were shipped but we don't have active shipment records
                return 'unknown';
            }

            return $step->external_status === 'at_manufacturer' ? 'at_manufacturer' : 'awaiting_shipment';
        }

        // Check the status of active shipments
        $latestShipment = $activeShipments->first();

        switch ($latestShipment->status) {
            case 'planned':
            case 'packed':
                return 'awaiting_shipment';
            case 'shipped':
            case 'in_transit':
                return 'in_transit';
            case 'delivered':
                return 'at_manufacturer';
            default:
                return 'unknown';
        }
    }

    /**
     * Get detailed location information.
     */
    private function getLocationDetails(ManufacturingStep $step, $activeShipments): array
    {
        $location = $this->determineCurrentLocation($step, $activeShipments);
        $details = [
            'location' => $location,
            'description' => $this->getLocationDescription($location),
        ];

        if ($location === 'in_transit' && $activeShipments->isNotEmpty()) {
            $shipment = $activeShipments->first();
            $details['carrier'] = $shipment->carrier_name;
            $details['tracking_number'] = $shipment->tracking_number;
            $details['expected_delivery'] = $shipment->expected_delivery_date;
        }

        if ($location === 'at_manufacturer') {
            $details['manufacturer_name'] = $step->manufacturer->name;
            $details['manufacturer_address'] = $step->manufacturer->full_address ?? null;
        }

        return $details;
    }

    /**
     * Get human-readable location description.
     */
    private function getLocationDescription(string $location): string
    {
        return match ($location) {
            'awaiting_shipment' => 'Items are awaiting shipment to manufacturer',
            'in_transit' => 'Items are in transit to manufacturer',
            'at_manufacturer' => 'Items are at manufacturer for processing',
            'unknown' => 'Location unknown',
            default => 'Unknown status',
        };
    }

    /**
     * Format shipment for summary display.
     */
    private function formatShipmentSummary(Shipment $shipment): array
    {
        return [
            'id' => $shipment->id,
            'shipment_number' => $shipment->shipment_number,
            'status' => $shipment->status,
            'status_label' => $shipment->status_label ?? Shipment::STATUSES[$shipment->status] ?? $shipment->status,
            'quantity_shipped' => $shipment->items->where('manufacturing_step_id', '!=', null)->sum('quantity_shipped'),
            'quantity_received' => $shipment->items->where('manufacturing_step_id', '!=', null)->sum('quantity_received'),
            'carrier' => $shipment->carrier_name,
            'tracking_number' => $shipment->tracking_number,
            'ship_date' => $shipment->actual_ship_date?->toDateString(),
            'expected_delivery' => $shipment->expected_delivery_date?->toDateString(),
            'actual_delivery' => $shipment->actual_delivery_date?->toDateString(),
        ];
    }

    /**
     * Build timeline of events.
     */
    private function buildTimeline(ManufacturingStep $step, $shipments): array
    {
        $events = [];

        // Step queued
        if ($step->status !== 'pending') {
            $events[] = [
                'type' => 'step_queued',
                'date' => $step->updated_at,
                'description' => 'Step queued for external processing',
            ];
        }

        // Shipment events
        foreach ($shipments as $shipment) {
            if ($shipment->actual_ship_date) {
                $events[] = [
                    'type' => 'shipped',
                    'date' => $shipment->actual_ship_date,
                    'description' => "Shipped {$shipment->items->sum('quantity_shipped')} units via {$shipment->carrier_name}",
                    'shipment_id' => $shipment->id,
                ];
            }

            if ($shipment->actual_delivery_date) {
                $events[] = [
                    'type' => 'delivered',
                    'date' => $shipment->actual_delivery_date,
                    'description' => 'Delivered to manufacturer',
                    'shipment_id' => $shipment->id,
                ];
            }

            if ($shipment->status === 'received') {
                $events[] = [
                    'type' => 'received',
                    'date' => $shipment->updated_at,
                    'description' => "Received {$shipment->items->sum('quantity_received')} units from manufacturer",
                    'shipment_id' => $shipment->id,
                ];
            }
        }

        // Step completed
        if ($step->status === 'completed') {
            $events[] = [
                'type' => 'completed',
                'date' => $step->actual_end_time ?? $step->updated_at,
                'description' => 'External processing completed',
            ];
        }

        // Sort by date
        return collect($events)->sortBy('date')->values()->all();
    }

    /**
     * Get first shipped date from shipments.
     */
    private function getFirstShippedDate($shipments): ?string
    {
        return $shipments
            ->whereNotNull('actual_ship_date')
            ->sortBy('actual_ship_date')
            ->first()
            ?->actual_ship_date
            ?->toDateTimeString();
    }

    /**
     * Estimate completion date based on lead time.
     */
    private function estimateCompletionDate(ManufacturingStep $step, $activeShipments): ?string
    {
        if ($step->status === 'completed') {
            return $step->actual_end_time?->toDateTimeString();
        }

        if (! $step->expected_lead_time_days || $activeShipments->isEmpty()) {
            return null;
        }

        // Find the latest delivery date
        $latestDelivery = $activeShipments
            ->filter(fn ($s) => $s->status === 'delivered' || $s->actual_delivery_date)
            ->sortByDesc('actual_delivery_date')
            ->first();

        if ($latestDelivery && $latestDelivery->actual_delivery_date) {
            return $latestDelivery->actual_delivery_date
                ->addDays($step->expected_lead_time_days)
                ->toDateTimeString();
        }

        // If not delivered yet, use expected delivery
        $expectedDelivery = $activeShipments
            ->whereNotNull('expected_delivery_date')
            ->sortByDesc('expected_delivery_date')
            ->first();

        if ($expectedDelivery) {
            return $expectedDelivery->expected_delivery_date
                ->addDays($step->expected_lead_time_days)
                ->toDateTimeString();
        }

        return null;
    }

    /**
     * Get steps grouped by manufacturer and status.
     */
    public function getStepsGroupedByManufacturer()
    {
        $steps = ManufacturingStep::external()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->with(['manufacturer', 'manufacturingRoute.manufacturingOrder.item'])
            ->get();

        return $steps->groupBy('manufacturer_id')->map(function ($manufacturerSteps, $manufacturerId) {
            $manufacturer = $manufacturerSteps->first()->manufacturer;

            return [
                'manufacturer' => $manufacturer,
                'awaiting_shipment' => $manufacturerSteps->where('external_status', 'awaiting_shipment')->values(),
                'at_manufacturer' => $manufacturerSteps->where('external_status', 'at_manufacturer')->values(),
                'total_steps' => $manufacturerSteps->count(),
                'summary' => [
                    'total_orders' => $manufacturerSteps->pluck('manufacturingRoute.manufacturing_order_id')->unique()->count(),
                    'total_quantity_awaiting_shipment' => $manufacturerSteps
                        ->where('external_status', 'awaiting_shipment')
                        ->sum(fn ($s) => $s->remaining_quantity_to_ship),
                    'total_quantity_at_manufacturer' => $manufacturerSteps
                        ->where('external_status', 'at_manufacturer')
                        ->sum(fn ($s) => $s->remaining_quantity_to_receive),
                ],
            ];
        });
    }
}

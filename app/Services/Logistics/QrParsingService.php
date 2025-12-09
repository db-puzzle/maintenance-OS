<?php

namespace App\Services\Logistics;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ShipmentItem;

/**
 * Service for parsing QR codes in the logistics module.
 *
 * Handles parsing of Manufacturing Order QR codes for
 * shipment verification and MO lookup.
 */
class QrParsingService
{
    /**
     * Parse MO number from QR code URL.
     *
     * Supports multiple formats:
     * - https://domain.com/production/orders/MO-2024-0001/qr
     * - /production/orders/MO-2024-0001/qr
     * - MO-2024-0001 (direct number)
     *
     * @param string $qrContent The scanned QR code content
     * @return string|null Extracted MO number or null if invalid
     */
    public function parseMoNumberFromQr(string $qrContent): ?string
    {
        // Pattern matches: /production/orders/{mo-number}/qr or /production/orders/{mo-number}
        $pattern = '/\/production\/orders\/([A-Z0-9-]+)(?:\/qr)?/i';

        if (preg_match($pattern, $qrContent, $matches)) {
            return strtoupper($matches[1]);
        }

        // If it looks like an MO number directly (MO-YYYY-####)
        if (preg_match('/^MO-\d{4}-\d+$/i', $qrContent)) {
            return strtoupper($qrContent);
        }

        return null;
    }

    /**
     * Find Manufacturing Order from QR code content.
     *
     * @param string $qrContent The scanned QR code content
     * @return ManufacturingOrder|null The found MO or null
     */
    public function findMoFromQr(string $qrContent): ?ManufacturingOrder
    {
        $moNumber = $this->parseMoNumberFromQr($qrContent);

        if (! $moNumber) {
            return null;
        }

        return ManufacturingOrder::where('order_number', $moNumber)->first();
    }

    /**
     * Validate QR code belongs to expected shipment.
     *
     * Checks if the scanned MO is part of the given shipment.
     *
     * @param string $qrContent The scanned QR code content
     * @param int $shipmentId The shipment ID to validate against
     * @return array Validation result with status and data
     */
    public function validateQrForShipment(string $qrContent, int $shipmentId): array
    {
        $mo = $this->findMoFromQr($qrContent);

        if (! $mo) {
            return [
                'valid' => false,
                'error' => 'Manufacturing Order not found',
                'mo_number' => $this->parseMoNumberFromQr($qrContent),
            ];
        }

        // Check if MO is in this shipment
        $shipmentItem = ShipmentItem::where('shipment_id', $shipmentId)
            ->where('manufacturing_order_id', $mo->id)
            ->first();

        if (! $shipmentItem) {
            return [
                'valid' => false,
                'error' => 'This MO is not part of the shipment',
                'mo' => $mo,
            ];
        }

        return [
            'valid' => true,
            'mo' => $mo,
            'shipment_item' => $shipmentItem,
            'message' => 'MO verified successfully',
        ];
    }

    /**
     * Get MO details with external steps for shipment creation.
     *
     * Returns MO with external steps that are awaiting shipment.
     *
     * @param string $moNumber The MO number
     * @return array MO details with external steps
     */
    public function getMoDetailsForShipment(string $moNumber): array
    {
        $mo = ManufacturingOrder::where('order_number', $moNumber)
            ->with([
                'item',
                'manufacturingRoute.steps' => function ($query) {
                    $query->where('execution_location', 'external')
                        ->where('external_status', 'awaiting_shipment');
                },
            ])
            ->first();

        if (! $mo) {
            return [
                'found' => false,
                'error' => 'Manufacturing Order not found',
            ];
        }

        $externalSteps = $mo->manufacturingRoute?->steps ?? collect();

        return [
            'found' => true,
            'mo' => $mo,
            'has_external_steps_awaiting_shipment' => $externalSteps->isNotEmpty(),
            'external_steps' => $externalSteps,
            'item_name' => $mo->item?->name ?? 'Unknown Item',
            'quantity' => $mo->quantity_to_produce,
        ];
    }
}

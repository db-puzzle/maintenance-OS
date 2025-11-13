<?php

namespace App\Services\Logistics;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ShipmentItem;

/**
 * Service for parsing QR codes in logistics workflows.
 *
 * Reuses the existing MO QR code system - no changes to QR generation needed!
 * Parses manufacturing order numbers from QR code URLs for shipping and receiving.
 */
class QrParsingService
{
    /**
     * Parse MO number from QR code URL.
     *
     * Supports formats:
     * - https://domain.com/production/orders/MO-2024-0001/qr
     * - /production/orders/MO-2024-0001/qr
     * - MO-2024-0001 (direct number)
     *
     * @param string $qrContent The QR code content (URL or MO number)
     * @return string|null The parsed MO number or null if invalid
     */
    public function parseMoNumberFromQr(string $qrContent): ?string
    {
        // Pattern matches:
        // /production/orders/{mo-number}/qr
        // /production/orders/{mo-number}
        $pattern = '/\/production\/orders\/([A-Z0-9-]+)(?:\/qr)?/i';

        if (preg_match($pattern, $qrContent, $matches)) {
            return $matches[1];
        }

        // If it looks like an MO number directly (MO-YYYY-####)
        if (preg_match('/^MO-\d{4}-\d+$/i', $qrContent)) {
            return strtoupper($qrContent);
        }

        return null;
    }

    /**
     * Find MO from QR code content.
     *
     * @param string $qrContent The QR code content
     * @return ManufacturingOrder|null The manufacturing order or null if not found
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
     * @param string $qrContent The QR code content
     * @param int $shipmentId The shipment ID to validate against
     * @return array Validation result with details
     */
    public function validateQrForShipment(string $qrContent, int $shipmentId): array
    {
        $mo = $this->findMoFromQr($qrContent);

        if (! $mo) {
            return [
                'valid' => false,
                'error' => 'Manufacturing Order not found',
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
        ];
    }
}

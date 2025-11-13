<?php

namespace App\Services\Logistics;

use App\Models\Production\ManufacturingStep;
use App\Models\Production\Shipment;
use App\Models\Production\ShipmentItem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Service for managing shipments.
 *
 * Handles creation, status updates, and tracking of shipments
 * for external manufacturing, customer deliveries, and internal transfers.
 */
class ShipmentService
{
    /**
     * Get suggested shipments (items that should ship together).
     *
     * Groups steps by manufacturer and expected ship date to suggest
     * efficient bundling of shipments.
     *
     * @return Collection Collection of suggested shipment groups
     */
    public function getSuggestedShipments(): Collection
    {
        // Group steps by manufacturer and expected ship date
        $steps = ManufacturingStep::awaitingShipment()
            ->with(['manufacturer', 'manufacturingRoute.manufacturingOrder.item'])
            ->get();

        $grouped = $steps->groupBy(function ($step) {
            $date = $step->scheduled_start?->format('Y-m-d') ?? 'unscheduled';

            return "{$step->manufacturer_id}_{$date}";
        });

        return $grouped->map(function ($steps, $key) {
            [$manufacturerId, $date] = explode('_', $key);

            return [
                'manufacturer_id' => $manufacturerId,
                'manufacturer' => $steps->first()->manufacturer,
                'planned_ship_date' => $date !== 'unscheduled' ? $date : null,
                'steps' => $steps,
                'total_orders' => $steps->pluck('manufacturingRoute.manufacturing_order_id')->unique()->count(),
            ];
        })->values();
    }

    /**
     * Create a shipment with items.
     *
     * @param array $data Shipment data
     * @param array $items Array of shipment items
     * @return Shipment Created shipment with items
     */
    public function createShipment(array $data, array $items): Shipment
    {
        return DB::transaction(function () use ($data, $items) {
            // Create shipment
            $shipment = Shipment::create([
                'destination_type' => $data['destination_type'],
                'destination_id' => $data['destination_id'] ?? null,
                'destination_name' => $data['destination_name'] ?? null,
                'destination_address' => $data['destination_address'] ?? null,
                'shipping_method' => $data['shipping_method'] ?? 'courier',
                'carrier_name' => $data['carrier_name'] ?? null,
                'planned_ship_date' => $data['planned_ship_date'] ?? null,
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'shipping_notes' => $data['shipping_notes'] ?? null,
                'status' => 'planned',
            ]);

            // Create shipment items
            foreach ($items as $itemData) {
                ShipmentItem::create([
                    'shipment_id' => $shipment->id,
                    'manufacturing_order_id' => $itemData['manufacturing_order_id'],
                    'manufacturing_step_id' => $itemData['manufacturing_step_id'] ?? null,
                    'quantity_shipped' => $itemData['quantity'],
                    'package_count' => $itemData['package_count'] ?? null,
                    'package_type' => $itemData['package_type'] ?? null,
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }

            activity()
                ->performedOn($shipment)
                ->causedBy(auth()->user())
                ->withProperties(['item_count' => count($items)])
                ->log('Shipment created');

            return $shipment->load(['items.manufacturingOrder.item', 'items.manufacturingStep']);
        });
    }

    /**
     * Mark shipment as shipped with photos.
     *
     * @param Shipment $shipment The shipment to mark as shipped
     * @param array $data Shipping data (tracking, carrier, notes)
     * @param array $photos Array of photo files
     * @return Shipment Updated shipment
     */
    public function markAsShipped(
        Shipment $shipment,
        array $data,
        array $photos = []
    ): Shipment {
        DB::transaction(function () use ($shipment, $data, $photos) {
            $shipment->markAsShipped(
                $data['tracking_number'] ?? null,
                $data['carrier_name'] ?? null
            );

            // Handle photos
            foreach ($photos as $photo) {
                $shipment->addMedia($photo)
                    ->withCustomProperties([
                        'type' => 'pre_shipment',
                        'taken_by' => auth()->id(),
                        'notes' => $data['photo_notes'] ?? null,
                    ])
                    ->toMediaCollection('shipment_photos');
            }
        });

        return $shipment->fresh(['items']);
    }

    /**
     * Mark shipment as received with photos and item receipts.
     *
     * This is the CRITICAL integration point with external steps.
     * When a shipment is received, related steps are marked as completed.
     *
     * @param Shipment $shipment The shipment being received
     * @param array $itemReceipts Array of item receipt data
     * @param string|null $notes Receiving notes
     * @param array $photos Array of photo files
     * @return Shipment Updated shipment
     */
    public function markAsReceived(
        Shipment $shipment,
        array $itemReceipts,
        ?string $notes = null,
        array $photos = []
    ): Shipment {
        DB::transaction(function () use ($shipment, $itemReceipts, $notes, $photos) {
            // Record receipt for each item
            foreach ($itemReceipts as $receipt) {
                $item = ShipmentItem::find($receipt['item_id']);
                if ($item) {
                    $item->recordReceipt(
                        $receipt['quantity_received'],
                        $receipt['quantity_rejected'] ?? 0,
                        $receipt['rejection_reason'] ?? null
                    );
                }
            }

            // Mark shipment as received
            $shipment->markAsReceived($notes);

            // Handle photos
            foreach ($photos as $photo) {
                $shipment->addMedia($photo)
                    ->withCustomProperties([
                        'type' => 'post_receipt',
                        'taken_by' => auth()->id(),
                        'notes' => $notes,
                    ])
                    ->toMediaCollection('shipment_photos');
            }
        });

        return $shipment->fresh(['items']);
    }

    /**
     * Get shipments by destination.
     *
     * @param string $destinationType Type of destination
     * @param int $destinationId Destination ID
     * @return Collection Collection of shipments
     */
    public function getShipmentsByDestination(
        string $destinationType,
        int $destinationId
    ): Collection {
        return Shipment::where('destination_type', $destinationType)
            ->where('destination_id', $destinationId)
            ->with(['items.manufacturingOrder.item'])
            ->orderBy('planned_ship_date', 'desc')
            ->get();
    }

    /**
     * Get overdue shipments.
     *
     * @return Collection Collection of overdue shipments
     */
    public function getOverdueShipments(): Collection
    {
        return Shipment::overdue()
            ->with(['items.manufacturingOrder.item', 'destination'])
            ->get();
    }

    /**
     * Get shipments awaiting receipt.
     *
     * @return Collection Collection of shipments awaiting receipt
     */
    public function getShipmentsAwaitingReceipt(): Collection
    {
        return Shipment::whereIn('status', ['shipped', 'in_transit', 'delivered'])
            ->where('destination_type', '!=', 'customer') // Don't show customer shipments
            ->with(['items.manufacturingOrder.item'])
            ->orderBy('expected_delivery_date')
            ->get();
    }
}

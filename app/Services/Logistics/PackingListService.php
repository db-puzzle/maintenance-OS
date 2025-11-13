<?php

namespace App\Services\Logistics;

use App\Models\Production\Shipment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Service for generating packing lists.
 *
 * Generates PDF packing lists for shipments, including QR codes
 * for easy receiving verification.
 */
class PackingListService
{
    /**
     * Generate packing list PDF for shipment.
     *
     * @param Shipment $shipment The shipment to generate packing list for
     * @return string Path to generated PDF
     */
    public function generatePackingList(Shipment $shipment): string
    {
        $pdf = Pdf::loadView('pdf.packing-list', [
            'shipment' => $shipment->load([
                'items.manufacturingOrder.item',
                'items.manufacturingStep',
                'destination',
            ]),
        ]);

        $filename = "{$shipment->shipment_number}.pdf";
        $path = "packing-lists/{$filename}";

        Storage::disk('public')->put($path, $pdf->output());

        $shipment->update([
            'packing_list_generated' => true,
            'packing_list_path' => $path,
        ]);

        activity()
            ->performedOn($shipment)
            ->causedBy(auth()->user())
            ->log('Packing list generated');

        return $path;
    }

    /**
     * Get packing list data for preview.
     *
     * @param Shipment $shipment The shipment
     * @return array Formatted data for packing list
     */
    public function getPackingListData(Shipment $shipment): array
    {
        $shipment->load([
            'items.manufacturingOrder.item',
            'items.manufacturingStep',
            'destination',
        ]);

        return [
            'shipment_number' => $shipment->shipment_number,
            'ship_date' => $shipment->planned_ship_date?->format('M d, Y'),
            'destination' => $this->formatDestination($shipment),
            'items' => $shipment->items->map(function ($item) {
                return [
                    'order_number' => $item->manufacturingOrder->order_number,
                    'item_code' => $item->item_code,
                    'item_name' => $item->item_name,
                    'item_description' => $item->item_description,
                    'quantity' => $item->quantity_shipped,
                    'packages' => $item->package_count ? "{$item->package_count} {$item->package_type}" : '-',
                    'step' => $item->manufacturingStep?->name,
                    'notes' => $item->notes,
                ];
            }),
            'total_items' => $shipment->items->count(),
            'total_quantity' => $shipment->items->sum('quantity_shipped'),
            'total_packages' => $shipment->items->sum('package_count'),
        ];
    }

    /**
     * Format destination for packing list.
     *
     * @param Shipment $shipment The shipment
     * @return array Formatted destination information
     */
    protected function formatDestination(Shipment $shipment): array
    {
        return [
            'name' => $shipment->destination_name ?? $shipment->destination?->name ?? 'Unknown',
            'address' => $shipment->destination_address ?? $this->getDestinationAddress($shipment),
        ];
    }

    /**
     * Get destination address from related model.
     *
     * @param Shipment $shipment The shipment
     * @return string|null Formatted address
     */
    protected function getDestinationAddress(Shipment $shipment): ?string
    {
        if (! $shipment->destination) {
            return null;
        }

        $parts = array_filter([
            $shipment->destination->address ?? null,
            $shipment->destination->city ?? null,
            $shipment->destination->state ?? null,
            $shipment->destination->zip_code ?? null,
        ]);

        return implode(', ', $parts);
    }
}

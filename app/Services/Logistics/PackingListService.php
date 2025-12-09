<?php

namespace App\Services\Logistics;

use App\Models\Production\Shipment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Service for generating packing list PDFs for shipments.
 *
 * Handles PDF generation with shipment details, item lists,
 * and destination information.
 */
class PackingListService
{
    /**
     * Generate packing list PDF for shipment.
     *
     * Creates a PDF document with shipment details and stores it.
     *
     * @param Shipment $shipment The shipment to generate packing list for
     * @return string Path to the generated PDF file
     */
    public function generatePackingList(Shipment $shipment): string
    {
        $data = $this->getPackingListData($shipment);

        $pdf = Pdf::loadView('pdf.packing-list', $data);

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
     * Get packing list data for PDF generation.
     *
     * @param Shipment $shipment The shipment
     * @return array Formatted data for PDF template
     */
    public function getPackingListData(Shipment $shipment): array
    {
        $shipment->load([
            'items.manufacturingOrder.item',
            'items.manufacturingStep',
            'createdBy',
        ]);

        return [
            'shipment' => $shipment,
            'shipment_number' => $shipment->shipment_number,
            'ship_date' => $shipment->planned_ship_date?->format('M d, Y') ?? 'Not scheduled',
            'destination' => $this->formatDestination($shipment),
            'items' => $shipment->items->map(function ($item) {
                return [
                    'order_number' => $item->manufacturingOrder?->order_number ?? 'N/A',
                    'item_code' => $item->item_code,
                    'item_name' => $item->item_name,
                    'item_description' => $item->item_description,
                    'quantity' => $item->quantity_shipped,
                    'packages' => $item->package_count ? "{$item->package_count} {$item->package_type}" : '-',
                    'step' => $item->manufacturingStep?->name ?? 'Final Product',
                    'notes' => $item->notes,
                ];
            }),
            'total_items' => $shipment->items->count(),
            'total_quantity' => $shipment->items->sum('quantity_shipped'),
            'total_packages' => $shipment->items->sum('package_count'),
            'created_by' => $shipment->createdBy?->name ?? 'Unknown',
            'created_date' => $shipment->created_at->format('M d, Y'),
            'notes' => $shipment->shipping_notes,
        ];
    }

    /**
     * Format destination information for packing list.
     *
     * @param Shipment $shipment The shipment
     * @return array Formatted destination data
     */
    protected function formatDestination(Shipment $shipment): array
    {
        $name = $shipment->destination_name;
        $address = $shipment->destination_address;

        // Try to get from related model if not denormalized
        if (! $name && $shipment->destination) {
            $name = $shipment->destination->name ?? 'Unknown';
        }

        if (! $address && $shipment->destination) {
            $address = $this->getDestinationAddress($shipment);
        }

        return [
            'name' => $name ?? 'Unknown',
            'address' => $address ?? 'Address not provided',
            'type' => $shipment->destination_type,
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

        return implode(', ', $parts) ?: null;
    }
}

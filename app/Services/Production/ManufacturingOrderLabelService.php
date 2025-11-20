<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingOrder;
use Barryvdh\DomPDF\Facade\Pdf;

class ManufacturingOrderLabelService
{
    private QrCodeService $qrCodeService;

    public function __construct(QrCodeService $qrCodeService)
    {
        $this->qrCodeService = $qrCodeService;
    }

    /**
     * Generate a label for a manufacturing order.
     */
    public function generateLabel(ManufacturingOrder $order, array $options = []): string
    {
        // Load relationships
        $order->load(['item.media']);

        // Generate QR code
        $qrUrl = $this->qrCodeService->generateOrderUrl($order);
        $qrCode = $this->qrCodeService->generateQrCode($qrUrl, [
            'size' => $options['qr_size'] ?? 200,
            'margin' => 1,
        ]);

        $data = [
            'order' => $order,
            'item' => $order->item,
            'qrCode' => base64_encode($qrCode),
            'qrUrl' => $qrUrl,
            'generatedAt' => now()->format('Y-m-d H:i:s'),
            'itemImage' => $this->getItemImageBase64($order->item),
            'labelSize' => $options['size'] ?? 'standard', // standard, large, small
        ];

        return $this->generatePdf($data);
    }

    /**
     * Generate multiple labels in a batch.
     */
    public function generateBatchLabels(array $orders, array $options = []): string
    {
        $labels = [];

        foreach ($orders as $order) {
            $labels[] = $this->generateLabel($order, $options);
        }

        // For now, return the first label - in the future, combine PDFs
        return $labels[0] ?? '';
    }

    /**
     * Get item image as base64 encoded string.
     */
    private function getItemImageBase64($item): ?string
    {
        if (! $item) {
            return null;
        }

        // Get the first image from media collection
        $media = $item->getFirstMedia('images');

        if (! $media) {
            return null;
        }

        try {
            // Get the file path
            $path = $media->getPath();

            if (! file_exists($path)) {
                return null;
            }

            $imageContent = file_get_contents($path);
            $mimeType = $media->mime_type;

            return 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
        } catch (\Exception $e) {
            \Log::warning('Failed to get image for label', [
                'item_id' => $item->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Generate PDF from data.
     */
    private function generatePdf(array $data): string
    {
        $pdf = Pdf::loadView('pdf.manufacturing-order-label', $data);

        // Set paper size based on label size
        switch ($data['labelSize']) {
            case 'large':
                $pdf->setPaper([0, 0, 288, 432], 'portrait'); // 4x6 inches
                break;
            case 'small':
                $pdf->setPaper([0, 0, 144, 144], 'portrait'); // 2x2 inches
                break;
            default: // standard
                $pdf->setPaper([0, 0, 216, 288], 'portrait'); // 3x4 inches
                break;
        }

        return $pdf->download()->getOriginalContent();
    }
}

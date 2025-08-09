<?php

namespace App\Services\Production;

use App\Models\Production\Item;
use App\Models\Production\ItemImage;
use App\Models\Production\ManufacturingOrder;
use App\Models\QrTagTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class QrTagPdfService
{
    private QrCodeService $qrCodeService;
    
    public function __construct(QrCodeService $qrCodeService)
    {
        $this->qrCodeService = $qrCodeService;
    }

    public function generateItemTag(Item $item): string
    {
        // Load the primary image relationship to get the image URL
        $item->load('primaryImage');
        
        $url = $this->qrCodeService->generateItemUrl($item);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        $data = [
            'type' => 'item',
            'item' => $item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now()
        ];
        
        // Get base64 encoded image if available
        // Use the first primary marked image or just the first image
        $primaryImage = $item->images()->where('is_primary', true)->first() ?? $item->images()->first();
        $data['itemImageBase64'] = $this->getImageAsBase64($primaryImage);
        
        return $this->generatePdf('item-tag', $data);
    }

    public function generateOrderTag(ManufacturingOrder $order): string
    {
        // Load relationships for images
        $order->load(['item.primaryImage', 'manufacturingRoute']);
        
        $url = $this->qrCodeService->generateOrderUrl($order);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        // Get parent item with route if needed
        $parentWithRoute = null;
        if (!$order->has_route) {
            $parentWithRoute = $this->qrCodeService->findClosestParentWithRoute($order);
            if ($parentWithRoute) {
                $parentWithRoute->load('item.primaryImage');
            }
        }
        
        $data = [
            'type' => 'order',
            'order' => $order,
            'item' => $order->item,
            'parentItem' => $parentWithRoute?->item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now()
        ];
        
        // Get base64 encoded images if available
        if ($order->item) {
            $itemPrimaryImage = $order->item->images()->where('is_primary', true)->first() 
                ?? $order->item->images()->first();
            $data['itemImageBase64'] = $this->getImageAsBase64($itemPrimaryImage);
        } else {
            $data['itemImageBase64'] = null;
        }
        
        if ($parentWithRoute && $parentWithRoute->item) {
            $parentPrimaryImage = $parentWithRoute->item->images()->where('is_primary', true)->first() 
                ?? $parentWithRoute->item->images()->first();
            $data['parentImageBase64'] = $this->getImageAsBase64($parentPrimaryImage);
        } else {
            $data['parentImageBase64'] = null;
        }
        
        return $this->generatePdf('order-tag', $data);
    }

    public function generateBatchTags(array $items, string $type = 'item'): string
    {
        $tags = [];
        
        foreach ($items as $item) {
            $tags[] = match($type) {
                'item' => $this->prepareItemTagData($item),
                'order' => $this->prepareOrderTagData($item),
                default => null
            };
        }
        
        // Generate multi-page PDF with all tags
        return $this->generateBatchPdf($tags, $type, count($items));
    }

    private function prepareItemTagData(Item $item): array
    {
        // Load the primary image relationship if not already loaded
        if (!$item->relationLoaded('primaryImage')) {
            $item->load('primaryImage');
        }
        
        $url = $this->qrCodeService->generateItemUrl($item);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        // Get primary image
        $primaryImage = $item->images()->where('is_primary', true)->first() ?? $item->images()->first();
        
        $data = [
            'type' => 'item',
            'item' => $item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now(),
            'itemImageBase64' => $this->getImageAsBase64($primaryImage)
        ];
        
        return $data;
    }

    private function prepareOrderTagData(ManufacturingOrder $order): array
    {
        // Load relationships for images
        if (!$order->relationLoaded('item.primaryImage')) {
            $order->load(['item.primaryImage', 'manufacturingRoute']);
        }
        
        $url = $this->qrCodeService->generateOrderUrl($order);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        $parentWithRoute = null;
        if (!$order->has_route) {
            $parentWithRoute = $this->qrCodeService->findClosestParentWithRoute($order);
            if ($parentWithRoute) {
                $parentWithRoute->load('item.primaryImage');
            }
        }
        
        $data = [
            'type' => 'order',
            'order' => $order,
            'item' => $order->item,
            'parentItem' => $parentWithRoute?->item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now()
        ];
        
        // Get base64 encoded images if available
        if ($order->item) {
            $itemPrimaryImage = $order->item->images()->where('is_primary', true)->first() 
                ?? $order->item->images()->first();
            $data['itemImageBase64'] = $this->getImageAsBase64($itemPrimaryImage);
        } else {
            $data['itemImageBase64'] = null;
        }
        
        if ($parentWithRoute && $parentWithRoute->item) {
            $parentPrimaryImage = $parentWithRoute->item->images()->where('is_primary', true)->first() 
                ?? $parentWithRoute->item->images()->first();
            $data['parentImageBase64'] = $this->getImageAsBase64($parentPrimaryImage);
        } else {
            $data['parentImageBase64'] = null;
        }
        
        return $data;
    }

    private function generatePdf(string $template, array $data): string
    {
        // Use landscape orientation for order tags, portrait for item tags
        $width = ($template === 'order-tag') ? 150 : 100;
        $height = ($template === 'order-tag') ? 100 : 150;
        
        // Generate descriptive filename with item/order number and UTC timestamp
        $timestamp = now()->utc()->format('Ymd_His');
        
        if ($data['type'] === 'item') {
            $filename = "QR-ITEM-{$data['item']->item_number}-{$timestamp}.pdf";
        } else {
            $filename = "QR-MO-{$data['order']->order_number}-{$timestamp}.pdf";
        }
        
        $path = "qr-tags/{$filename}";
        
        try {
            // Create PDF with DomPDF
            $pdf = Pdf::loadView("pdf.qr-tags.{$template}", $data);
            
            // Set custom paper size (convert mm to points: 1mm = 2.83465 points)
            $pdf->setPaper([0, 0, $width * 2.83465, $height * 2.83465]);
            
            // Apply DomPDF options from config
            $options = config('pdf.dompdf.options', []);
            $pdf->setOptions($options);
            
            // Generate and save PDF
            Storage::disk('local')->put($path, $pdf->output());
            
            // Return a route URL that requires authentication
            return route('production.qr-tags.serve', ['path' => $path]);
            
        } catch (\Exception $e) {
            Log::error('PDF generation failed', [
                'error' => $e->getMessage(),
                'template' => $template,
                'type' => $data['type'] ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }



    private function generateBatchPdf(array $tags, string $type, int $count = 0): string
    {
        // For order tags, use landscape orientation; for items, use portrait
        $paperWidth = $type === 'order' ? 150 : 100;
        $paperHeight = $type === 'order' ? 100 : 150;
        
        try {
            // Create PDF with DomPDF
            $pdf = Pdf::loadView("pdf.qr-tags.batch", ['tags' => $tags, 'type' => $type]);
            
            // Set custom paper size (convert mm to points: 1mm = 2.83465 points)
            $pdf->setPaper([0, 0, $paperWidth * 2.83465, $paperHeight * 2.83465]);
            
            // Apply DomPDF options from config
            $options = config('pdf.dompdf.options', []);
            $pdf->setOptions($options);
            
            // Generate descriptive filename for batch with UTC timestamp and count
            $timestamp = now()->utc()->format('Ymd_His');
            $countInfo = $count > 0 ? "-count{$count}" : "";
            $filename = "qr-tags-batch-{$type}{$countInfo}-{$timestamp}-UTC.pdf";
            $path = "qr-tags/{$filename}";
            
            // Generate and save PDF
            Storage::disk('local')->put($path, $pdf->output());
            
            // Return a route URL that requires authentication
            return route('production.qr-tags.serve', ['path' => $path]);
            
        } catch (\Exception $e) {
            Log::error('Batch PDF generation failed', [
                'error' => $e->getMessage(),
                'type' => $type,
                'count' => $count,
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
    
    /**
     * Convert image to base64 with optional resizing for PDF optimization
     */
    private function getImageAsBase64(?ItemImage $image, int $maxWidth = 800): ?string
    {
        if (!$image) {
            return null;
        }
        
        $imagePath = storage_path('app/private/' . $image->storage_path);
        if (!file_exists($imagePath)) {
            return null;
        }
        
        try {
            // Read the image file
            $imageData = file_get_contents($imagePath);
            
            // For now, we'll use the original image
            // In production, you might want to resize using Intervention Image
            $base64 = base64_encode($imageData);
            
            return 'data:' . $image->mime_type . ';base64,' . $base64;
        } catch (\Exception $e) {
            \Log::error('Error processing image for QR tag: ' . $e->getMessage());
            return null;
        }
    }
}
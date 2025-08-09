<?php

namespace App\Services\Production;

use App\Models\Production\Item;
use App\Models\Production\ItemImage;
use App\Models\Production\ManufacturingOrder;
use App\Models\QrTagTemplate;
use Spatie\LaravelPdf\Facades\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf as DomPdf;

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
            // Try using Spatie PDF (Browsershot) first
            $pdf = Pdf::view("pdf.qr-tags.{$template}", $data)
                ->paperSize($width, $height, 'mm')
                ->margins(3, 3, 3, 3);
            
            // Apply Browsershot configuration if available
            if (config('pdf.browsershot.chrome_path')) {
                $pdf->setChromePath(config('pdf.browsershot.chrome_path'));
            }
            
            // Add Chrome options from config
            $options = config('pdf.browsershot.options.args', []);
            foreach ($options as $option) {
                $pdf->addChromiumArguments([$option]);
            }
            
            $pdfContent = $pdf->base64();
            Storage::disk('public')->put($path, base64_decode($pdfContent));
            
        } catch (\Exception $e) {
            // Log the Browsershot error
            Log::warning('Browsershot PDF generation failed, falling back to DomPDF', [
                'error' => $e->getMessage(),
                'template' => $template,
                'type' => $data['type'] ?? 'unknown'
            ]);
            
            // Fallback to DomPDF
            try {
                $pdf = DomPdf::loadView("pdf.qr-tags.{$template}", $data);
                $pdf->setPaper([0, 0, $width * 2.83465, $height * 2.83465]); // Convert mm to points
                $pdf->setOptions(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true]);
                
                Storage::disk('public')->put($path, $pdf->output());
                
            } catch (\Exception $domPdfError) {
                Log::error('Both PDF generators failed', [
                    'browsershot_error' => $e->getMessage(),
                    'dompdf_error' => $domPdfError->getMessage()
                ]);
                throw $domPdfError;
            }
        }
        
        return Storage::disk('public')->url($path);
    }

    private function generateBatchPdf(array $tags, string $type, int $count = 0): string
    {
        // For order tags, use landscape orientation; for items, use portrait
        $paperWidth = $type === 'order' ? 150 : 100;
        $paperHeight = $type === 'order' ? 100 : 150;
        
        $pdf = Pdf::view("pdf.qr-tags.batch", ['tags' => $tags, 'type' => $type])
            ->paperSize($paperWidth, $paperHeight, 'mm') // 150mm x 100mm for orders (landscape), 100mm x 150mm for items (portrait)
            ->margins(3, 3, 3, 3);
            
        // Generate descriptive filename for batch with UTC timestamp and count
        $timestamp = now()->utc()->format('Ymd_His');
        $countInfo = $count > 0 ? "-count{$count}" : "";
        $filename = "qr-tags-batch-{$type}{$countInfo}-{$timestamp}-UTC.pdf";
        $path = "qr-tags/{$filename}";
        
        $pdfContent = $pdf->base64();
        Storage::disk('public')->put($path, base64_decode($pdfContent));
        
        return Storage::disk('public')->url($path);
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
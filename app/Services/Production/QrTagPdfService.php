<?php

namespace App\Services\Production;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\QrTagTemplate;
use Spatie\LaravelPdf\Facades\Pdf;
use Illuminate\Support\Facades\Storage;

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
        
        // Add item image URL using the primary_image_url accessor
        $data['item']->image_url = $item->primary_image_url;
        
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
        
        // Add image URLs
        if ($order->item) {
            $data['item']->image_url = $order->item->primary_image_url;
        }
        
        if ($parentWithRoute && $parentWithRoute->item) {
            $data['parentItem']->image_url = $parentWithRoute->item->primary_image_url;
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
        
        return [
            'type' => 'item',
            'item' => $item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now(),
            'item_image_url' => $item->primary_image_url
        ];
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
        
        // Add image URLs
        if ($order->item) {
            $data['item_image_url'] = $order->item->primary_image_url;
        }
        
        if ($parentWithRoute && $parentWithRoute->item) {
            $data['parent_item_image_url'] = $parentWithRoute->item->primary_image_url;
        }
        
        return $data;
    }

    private function generatePdf(string $template, array $data): string
    {
        $pdf = Pdf::view("pdf.qr-tags.{$template}", $data)
            ->paperSize(70, 140, 'mm') // 70mm x 140mm
            ->margins(3, 3, 3, 3); // 3mm margins on all sides
            
        // Generate descriptive filename with item/order number and UTC timestamp
        $timestamp = now()->utc()->format('Ymd_His');
        
        if ($data['type'] === 'item') {
            $filename = "QR-ITEM-{$data['item']->item_number}-{$timestamp}.pdf";
        } else {
            $filename = "QR-MO-{$data['order']->order_number}-{$timestamp}.pdf";
        }
        
        $path = "qr-tags/{$filename}";
        
        // For now, save locally. In production, you'd save to S3
        $pdfContent = $pdf->base64();
        Storage::disk('public')->put($path, base64_decode($pdfContent));
        
        return Storage::disk('public')->url($path);
    }

    private function generateBatchPdf(array $tags, string $type, int $count = 0): string
    {
        $pdf = Pdf::view("pdf.qr-tags.batch", ['tags' => $tags, 'type' => $type])
            ->paperSize(70, 140, 'mm') // 70mm x 140mm per page
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
}
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
        $url = $this->qrCodeService->generateItemUrl($item);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        $data = [
            'type' => 'item',
            'item' => $item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now()
        ];
        
        return $this->generatePdf('item-tag', $data);
    }

    public function generateOrderTag(ManufacturingOrder $order): string
    {
        $url = $this->qrCodeService->generateOrderUrl($order);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        // Get parent item with route if needed
        $parentWithRoute = null;
        if (!$order->has_route) {
            $parentWithRoute = $this->qrCodeService->findClosestParentWithRoute($order);
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
        return $this->generateBatchPdf($tags, $type);
    }

    private function prepareItemTagData(Item $item): array
    {
        $url = $this->qrCodeService->generateItemUrl($item);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        return [
            'type' => 'item',
            'item' => $item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now()
        ];
    }

    private function prepareOrderTagData(ManufacturingOrder $order): array
    {
        $url = $this->qrCodeService->generateOrderUrl($order);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        $parentWithRoute = null;
        if (!$order->has_route) {
            $parentWithRoute = $this->qrCodeService->findClosestParentWithRoute($order);
        }
        
        return [
            'type' => 'order',
            'order' => $order,
            'item' => $order->item,
            'parentItem' => $parentWithRoute?->item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now()
        ];
    }

    private function generatePdf(string $template, array $data): string
    {
        $pdf = Pdf::view("pdf.qr-tags.{$template}", $data)
            ->format([70, 140]) // 70mm x 140mm
            ->margins(3, 3, 3, 3); // 3mm margins on all sides
            
        $filename = "qr-tag-{$data['type']}-" . ($data['item']->id ?? $data['order']->id) . "-" . time() . ".pdf";
        $path = "qr-tags/{$filename}";
        
        // For now, save locally. In production, you'd save to S3
        $pdfContent = $pdf->base64();
        Storage::disk('public')->put($path, base64_decode($pdfContent));
        
        return Storage::disk('public')->url($path);
    }

    private function generateBatchPdf(array $tags, string $type): string
    {
        $pdf = Pdf::view("pdf.qr-tags.batch", ['tags' => $tags, 'type' => $type])
            ->format([70, 140]) // 70mm x 140mm per page
            ->margins(3, 3, 3, 3);
            
        $filename = "qr-tags-batch-{$type}-" . time() . ".pdf";
        $path = "qr-tags/{$filename}";
        
        $pdfContent = $pdf->base64();
        Storage::disk('public')->put($path, base64_decode($pdfContent));
        
        return Storage::disk('public')->url($path);
    }
}
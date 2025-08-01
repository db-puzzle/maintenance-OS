<?php

namespace App\Console\Commands;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Services\Production\QrTagPdfService;
use Illuminate\Console\Command;

class TestQrTagGeneration extends Command
{
    protected $signature = 'test:qr-tags {type=item} {id=1}';
    protected $description = 'Test QR tag generation with images';

    public function handle(QrTagPdfService $qrTagService)
    {
        $type = $this->argument('type');
        $id = $this->argument('id');

        try {
            if ($type === 'item') {
                $item = Item::find($id);
                if (!$item) {
                    $this->error("Item with ID {$id} not found.");
                    return 1;
                }
                
                $this->info("Generating QR tag for Item: {$item->name} ({$item->item_number})");
                $this->info("Primary Image URL: " . ($item->primary_image_url ?? 'No image'));
                
                $pdfUrl = $qrTagService->generateItemTag($item);
                $this->info("PDF generated: {$pdfUrl}");
                
            } elseif ($type === 'order') {
                $order = ManufacturingOrder::find($id);
                if (!$order) {
                    $this->error("Manufacturing Order with ID {$id} not found.");
                    return 1;
                }
                
                $this->info("Generating QR tag for MO: {$order->order_number}");
                $this->info("Item: {$order->item->name} ({$order->item->item_number})");
                $this->info("Has Route: " . ($order->has_route ? 'Yes' : 'No'));
                
                if (!$order->has_route) {
                    $parentWithRoute = app(\App\Services\Production\QrCodeService::class)->findClosestParentWithRoute($order);
                    if ($parentWithRoute) {
                        $this->info("Parent with route found: MO {$parentWithRoute->order_number} - Item: {$parentWithRoute->item->name}");
                    } else {
                        $this->info("No parent with route found.");
                    }
                }
                
                $pdfUrl = $qrTagService->generateOrderTag($order);
                $this->info("PDF generated: {$pdfUrl}");
                
            } else {
                $this->error("Invalid type. Use 'item' or 'order'.");
                return 1;
            }
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error("Error: " . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }
}
<?php

namespace App\Services\Production;

use SimpleSoftwareIO\QrCode\Facades\QrCode;
use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use Illuminate\Support\Facades\Storage;

class QrCodeService
{
    public function generateItemUrl(Item $item): string
    {
        return route('qr.item', ['item_number' => $item->item_number]);
    }

    public function generateOrderUrl(ManufacturingOrder $order): string
    {
        // If order has no route, find closest parent with route
        if (!$order->has_route) {
            $parentWithRoute = $this->findClosestParentWithRoute($order);
            if ($parentWithRoute) {
                return route('qr.order', ['mo_number' => $parentWithRoute->order_number]);
            }
        }
        
        return route('qr.order', ['mo_number' => $order->order_number]);
    }

    public function generateQrCode(string $url, array $options = []): string
    {
        $size = $options['size'] ?? 300;
        $margin = $options['margin'] ?? 2;
        $errorCorrection = $options['error_correction'] ?? 'M';
        
        return QrCode::format('png')
            ->size($size)
            ->margin($margin)
            ->errorCorrection($errorCorrection)
            ->generate($url);
    }

    public function findClosestParentWithRoute(ManufacturingOrder $order): ?ManufacturingOrder
    {
        $current = $order;
        
        while ($current->parent_order_id) {
            $current = $current->parentOrder;
            if ($current->has_route) {
                return $current;
            }
        }
        
        return null;
    }
}
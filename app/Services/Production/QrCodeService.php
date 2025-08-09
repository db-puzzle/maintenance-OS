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
        // Absolute URL pointing to /production/items/{item_number}/qr
        return url(route('production.items.qr', ['item_number' => $item->item_number], false));
    }

    public function generateOrderUrl(ManufacturingOrder $order): string
    {
        // If order has no route, find closest parent with route
        if (!$order->has_route) {
            $parentWithRoute = $this->findClosestParentWithRoute($order);
            if ($parentWithRoute) {
                return url(route('production.orders.qr', ['mo_number' => $parentWithRoute->order_number], false));
            }
        }
        // Absolute URL
        return url(route('production.orders.qr', ['mo_number' => $order->order_number], false));
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
        
        while ($current->parent_id) {
            $current = $current->parent;
            if ($current->has_route) {
                return $current;
            }
        }
        
        return null;
    }
}
<?php

namespace App\Services\Production;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

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
        if (! $order->has_route) {
            $parentWithRoute = $this->findClosestParentWithRoute($order);
            if ($parentWithRoute) {
                return $this->buildTenantQrUrl($parentWithRoute->order_number);
            }
        }

        return $this->buildTenantQrUrl($order->order_number);
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

    /**
     * Build tenant-aware QR URL.
     */
    private function buildTenantQrUrl(string $orderNumber): string
    {
        $tenant = tenant();

        // If no tenant context (e.g., in central domain), use current URL
        if (! $tenant) {
            // For central domain access, use the current domain
            return url('/qr/orders/' . $orderNumber);
        }

        // Get tenant's primary domain
        $domain = $tenant->domains()->first();
        if (! $domain) {
            throw new \RuntimeException('Tenant has no configured domain');
        }

        // Build the absolute URL with tenant's domain
        $protocol = request()->secure() ? 'https://' : 'http://';

        // Handle port for local development
        $port = request()->getPort();
        $portSuffix = '';
        if ($port && ! in_array($port, [80, 443])) {
            $portSuffix = ':' . $port;
        }

        return $protocol . $domain->domain . $portSuffix . '/qr/orders/' . $orderNumber;
    }
}

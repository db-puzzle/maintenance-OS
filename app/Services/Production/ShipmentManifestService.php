<?php

namespace App\Services\Production;

use App\Models\Production\Shipment;
use App\Services\PDFGeneratorService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;

class ShipmentManifestService
{
    protected PDFGeneratorService $pdfService;

    public function __construct(PDFGeneratorService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    /**
     * Generate manifest for a shipment.
     */
    public function generateManifest(Shipment $shipment): string
    {
        // Prepare data for manifest
        $data = $this->prepareManifestData($shipment);

        // Generate HTML
        $html = $this->generateManifestHtml($data);

        // Generate PDF
        $pdfPath = $this->generatePdf($shipment, $html);

        // Update shipment record
        $shipment->update([
            'manifest_generated_at' => now(),
            'manifest_path' => $pdfPath,
        ]);

        return $pdfPath;
    }

    /**
     * Prepare data for manifest generation.
     */
    protected function prepareManifestData(Shipment $shipment): array
    {
        $shipment->load([
            'items.bomItem',
            'items.manufacturingOrder.product',
            'createdBy',
        ]);

        return [
            'shipment' => $shipment,
            'company' => [
                'name' => config('app.name', 'Maintenance OS'),
                'address' => config('company.address'),
                'phone' => config('company.phone'),
                'email' => config('company.email'),
                'logo' => config('company.logo'),
            ],
            'destination' => $this->formatDestination($shipment),
            'items' => $this->formatItems($shipment),
            'totals' => $this->calculateTotals($shipment),
            'generated_at' => now(),
            'generated_by' => auth()->user(),
        ];
    }

    /**
     * Format destination information.
     */
    protected function formatDestination(Shipment $shipment): array
    {
        $details = $shipment->destination_details ?? [];

        return [
            'type' => $shipment->destination_type,
            'reference' => $shipment->destination_reference,
            'name' => $details['name'] ?? 'N/A',
            'address' => $details['address'] ?? [],
            'contact' => [
                'name' => $details['contact_name'] ?? null,
                'phone' => $details['contact_phone'] ?? null,
                'email' => $details['contact_email'] ?? null,
            ],
        ];
    }

    /**
     * Format shipment items.
     */
    protected function formatItems(Shipment $shipment): array
    {
        return $shipment->items->map(function ($item) {
            return [
                'line_number' => $item->id,
                'item_number' => $item->item_number,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_of_measure' => $item->unit_of_measure,
                'package_number' => $item->package_number,
                'package_type' => $item->package_type,
                'weight' => $item->weight,
                'dimensions' => $this->formatDimensions($item->dimensions),
                'qr_codes' => $item->qr_codes ?? [],
                'manufacturing_order' => $item->manufacturingOrder?->order_number,
                'product' => $item->manufacturingOrder?->product?->name,
            ];
        })->toArray();
    }

    /**
     * Format dimensions.
     */
    protected function formatDimensions($dimensions): ?string
    {
        if (!$dimensions || !is_array($dimensions)) {
            return null;
        }

        $length = $dimensions['length'] ?? 0;
        $width = $dimensions['width'] ?? 0;
        $height = $dimensions['height'] ?? 0;
        $unit = $dimensions['unit'] ?? 'cm';

        return "{$length} x {$width} x {$height} {$unit}";
    }

    /**
     * Calculate totals.
     */
    protected function calculateTotals(Shipment $shipment): array
    {
        return [
            'total_items' => $shipment->items->count(),
            'total_quantity' => $shipment->total_quantity,
            'total_weight' => $shipment->total_weight,
            'total_packages' => $shipment->package_count,
            'freight_cost' => $shipment->freight_cost,
        ];
    }

    /**
     * Generate manifest HTML.
     */
    protected function generateManifestHtml(array $data): string
    {
        return View::make('production.manifest', $data)->render();
    }

    /**
     * Generate PDF from HTML.
     */
    protected function generatePdf(Shipment $shipment, string $html): string
    {
        // Generate filename
        $filename = sprintf(
            'manifest-%s-%s.pdf',
            $shipment->shipment_number,
            now()->format('YmdHis')
        );

        // Generate path
        $path = sprintf(
            'production/manifests/%s/%s',
            now()->format('Y/m'),
            $filename
        );

        // Create PDF
        $pdf = $this->pdfService->generateFromHtml($html, [
            'format' => 'A4',
            'orientation' => 'portrait',
            'margin-top' => '10mm',
            'margin-bottom' => '10mm',
            'margin-left' => '10mm',
            'margin-right' => '10mm',
        ]);

        // Save to storage
        Storage::disk('s3')->put($path, $pdf, 'private');

        return $path;
    }

    /**
     * Get manifest template.
     */
    public function getManifestTemplate(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Shipping Manifest - {{ $shipment->shipment_number }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            color: #333;
            line-height: 1.5;
        }
        .header {
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .company-info {
            float: left;
            width: 50%;
        }
        .manifest-info {
            float: right;
            width: 50%;
            text-align: right;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 10px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        th {
            background-color: #f0f0f0;
            padding: 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
        }
        td {
            padding: 6px;
            border: 1px solid #ddd;
        }
        .totals {
            text-align: right;
            margin-top: 10px;
        }
        .signature-block {
            margin-top: 40px;
            border-top: 1px solid #ccc;
            padding-top: 20px;
        }
        .signature-line {
            display: inline-block;
            width: 45%;
            margin-right: 5%;
            border-bottom: 1px solid #000;
            height: 40px;
        }
        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        @page {
            margin: 20mm;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>{{ $company['name'] }}</h1>
            <p>
                {{ $company['address']['street'] }}<br>
                {{ $company['address']['city'] }}, {{ $company['address']['state'] }} {{ $company['address']['zip'] }}<br>
                Phone: {{ $company['phone'] }}<br>
                Email: {{ $company['email'] }}
            </p>
        </div>
        <div class="manifest-info">
            <h2>SHIPPING MANIFEST</h2>
            <p>
                <strong>Manifest #:</strong> {{ $shipment->shipment_number }}<br>
                <strong>Date:</strong> {{ $generated_at->format('M d, Y') }}<br>
                <strong>Ship Date:</strong> {{ $shipment->scheduled_ship_date->format('M d, Y') }}<br>
                <strong>Type:</strong> {{ ucfirst($shipment->shipment_type) }}
            </p>
        </div>
        <div style="clear: both;"></div>
    </div>

    <div class="section">
        <div class="section-title">Ship To</div>
        <p>
            <strong>{{ $destination['name'] }}</strong><br>
            @if($destination['address'])
                {{ $destination['address']['street'] }}<br>
                {{ $destination['address']['city'] }}, {{ $destination['address']['state'] }} {{ $destination['address']['zip'] }}<br>
            @endif
            @if($destination['contact']['name'])
                Attn: {{ $destination['contact']['name'] }}<br>
            @endif
            @if($destination['contact']['phone'])
                Phone: {{ $destination['contact']['phone'] }}<br>
            @endif
        </p>
    </div>

    <div class="section">
        <div class="section-title">Shipment Details</div>
        <table>
            <thead>
                <tr>
                    <th width="5%">#</th>
                    <th width="15%">Item Number</th>
                    <th width="30%">Description</th>
                    <th width="10%">Qty</th>
                    <th width="10%">UOM</th>
                    <th width="10%">Package</th>
                    <th width="10%">Weight</th>
                    <th width="10%">Dimensions</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $index => $item)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $item['item_number'] }}</td>
                    <td>{{ $item['description'] }}</td>
                    <td style="text-align: right;">{{ number_format($item['quantity'], 2) }}</td>
                    <td>{{ $item['unit_of_measure'] }}</td>
                    <td>{{ $item['package_number'] }}</td>
                    <td style="text-align: right;">{{ number_format($item['weight'], 2) }}</td>
                    <td>{{ $item['dimensions'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        
        <div class="totals">
            <p>
                <strong>Total Items:</strong> {{ $totals['total_items'] }}<br>
                <strong>Total Quantity:</strong> {{ number_format($totals['total_quantity'], 2) }}<br>
                <strong>Total Weight:</strong> {{ number_format($totals['total_weight'], 2) }} kg<br>
                <strong>Total Packages:</strong> {{ $totals['total_packages'] }}
            </p>
        </div>
    </div>

    @if($shipment->carrier || $shipment->tracking_number)
    <div class="section">
        <div class="section-title">Shipping Information</div>
        <p>
            @if($shipment->carrier)
                <strong>Carrier:</strong> {{ $shipment->carrier }}<br>
            @endif
            @if($shipment->tracking_number)
                <strong>Tracking #:</strong> {{ $shipment->tracking_number }}<br>
            @endif
            @if($totals['freight_cost'])
                <strong>Freight Cost:</strong> ${{ number_format($totals['freight_cost'], 2) }}<br>
            @endif
        </p>
    </div>
    @endif

    <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-line"></div>
        <div style="clear: both;"></div>
        <div style="width: 45%; display: inline-block;">
            <p>
                <strong>Shipped By:</strong><br>
                Date: _______________
            </p>
        </div>
        <div style="width: 45%; display: inline-block; margin-left: 5%;">
            <p>
                <strong>Received By:</strong><br>
                Date: _______________
            </p>
        </div>
    </div>

    <div class="footer">
        <p>
            Generated on {{ $generated_at->format('M d, Y \a\t g:i A') }} by {{ $generated_by->name }}<br>
            Page <span class="page"></span> of <span class="topage"></span>
        </p>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Download manifest.
     */
    public function downloadManifest(Shipment $shipment): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (!$shipment->manifest_path) {
            throw new \Exception('Manifest has not been generated for this shipment.');
        }

        return Storage::disk('s3')->download(
            $shipment->manifest_path,
            "manifest-{$shipment->shipment_number}.pdf",
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment',
            ]
        );
    }

    /**
     * Email manifest.
     */
    public function emailManifest(Shipment $shipment, array $recipients): void
    {
        if (!$shipment->manifest_path) {
            $this->generateManifest($shipment);
        }

        // TODO: Implement email functionality
        // This would use Laravel's mail functionality to send the manifest
    }
}
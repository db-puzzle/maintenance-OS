<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Packing List - {{ $shipment->shipment_number }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .info-section {
            margin-bottom: 20px;
        }
        .info-section h2 {
            font-size: 14px;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .info-grid {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .info-row {
            display: table-row;
        }
        .info-label {
            display: table-cell;
            font-weight: bold;
            width: 30%;
            padding: 5px;
        }
        .info-value {
            display: table-cell;
            padding: 5px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-weight: bold;
        }
        .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        .items-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 40px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            font-size: 10px;
            color: #666;
        }
        .signature-section {
            margin-top: 50px;
        }
        .signature-box {
            display: inline-block;
            width: 45%;
            margin-right: 5%;
        }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>PACKING LIST</h1>
        <p><strong>{{ $shipment->shipment_number }}</strong></p>
    </div>

    <!-- Shipment Information -->
    <div class="info-section">
        <h2>Shipment Information</h2>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Shipment Number:</div>
                <div class="info-value">{{ $shipment->shipment_number }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Ship Date:</div>
                <div class="info-value">{{ $shipment->planned_ship_date?->format('M d, Y') ?? 'TBD' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Expected Delivery:</div>
                <div class="info-value">{{ $shipment->expected_delivery_date?->format('M d, Y') ?? 'TBD' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Carrier:</div>
                <div class="info-value">{{ $shipment->carrier_name ?? '-' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Tracking Number:</div>
                <div class="info-value">{{ $shipment->tracking_number ?? '-' }}</div>
            </div>
        </div>
    </div>

    <!-- Destination -->
    <div class="info-section">
        <h2>Destination</h2>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Name:</div>
                <div class="info-value">{{ $shipment->destination_name ?? $shipment->destination?->name ?? '-' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Address:</div>
                <div class="info-value">{{ $shipment->destination_address ?? '-' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Type:</div>
                <div class="info-value">{{ ucfirst($shipment->destination_type) }}</div>
            </div>
        </div>
    </div>

    <!-- Items -->
    <div class="info-section">
        <h2>Items ({{ $shipment->items->count() }})</h2>
        <table class="items-table">
            <thead>
                <tr>
                    <th>MO Number</th>
                    <th>Item Code</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Packages</th>
                    <th>Step</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                @foreach($shipment->items as $item)
                <tr>
                    <td>{{ $item->manufacturingOrder->order_number }}</td>
                    <td>{{ $item->item_code }}</td>
                    <td>{{ $item->item_name }}</td>
                    <td>{{ number_format($item->quantity_shipped, 2) }}</td>
                    <td>{{ $item->package_count ? "{$item->package_count} {$item->package_type}" : '-' }}</td>
                    <td>{{ $item->manufacturingStep?->name ?? '-' }}</td>
                    <td>{{ $item->notes ?? '-' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- Summary -->
    <div class="info-section">
        <h2>Summary</h2>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Total Items:</div>
                <div class="info-value">{{ $shipment->items->count() }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Total Quantity:</div>
                <div class="info-value">{{ number_format($shipment->items->sum('quantity_shipped'), 2) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Total Packages:</div>
                <div class="info-value">{{ $shipment->items->sum('package_count') ?? '-' }}</div>
            </div>
        </div>
    </div>

    @if($shipment->shipping_notes)
    <div class="info-section">
        <h2>Shipping Notes</h2>
        <p>{{ $shipment->shipping_notes }}</p>
    </div>
    @endif

    <!-- Signature Section -->
    <div class="signature-section">
        <div class="signature-box">
            <div class="signature-line">
                <strong>Shipped By</strong><br>
                Name: _______________________________<br>
                Date: _______________________________
            </div>
        </div>
        <div class="signature-box">
            <div class="signature-line">
                <strong>Received By</strong><br>
                Name: _______________________________<br>
                Date: _______________________________
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>Generated on {{ now()->format('M d, Y H:i:s') }}</p>
    </div>
</body>
</html>


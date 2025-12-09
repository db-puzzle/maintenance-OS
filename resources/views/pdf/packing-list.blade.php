<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Packing List - {{ $shipment_number }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .info-section {
            margin-bottom: 20px;
        }
        .info-section h2 {
            font-size: 14px;
            margin-bottom: 10px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 8px;
        }
        .label {
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .totals {
            margin-top: 20px;
            text-align: right;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 10px;
            color: #666;
        }
        .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
        }
        .signature-box {
            border-top: 1px solid #333;
            padding-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PACKING LIST</h1>
        <p>{{ $shipment_number }}</p>
    </div>

    <div class="info-section">
        <h2>Shipment Information</h2>
        <div class="info-grid">
            <div class="label">Ship Date:</div>
            <div>{{ $ship_date }}</div>

            <div class="label">Created By:</div>
            <div>{{ $created_by }}</div>

            <div class="label">Created Date:</div>
            <div>{{ $created_date }}</div>

            @if($shipment->tracking_number)
            <div class="label">Tracking Number:</div>
            <div>{{ $shipment->tracking_number }}</div>
            @endif

            @if($shipment->carrier_name)
            <div class="label">Carrier:</div>
            <div>{{ $shipment->carrier_name }}</div>
            @endif

            <div class="label">Shipping Method:</div>
            <div>{{ ucfirst(str_replace('_', ' ', $shipment->shipping_method)) }}</div>
        </div>
    </div>

    <div class="info-section">
        <h2>Destination</h2>
        <div class="info-grid">
            <div class="label">Type:</div>
            <div>{{ ucfirst(str_replace('_', ' ', $destination['type'])) }}</div>

            <div class="label">Name:</div>
            <div>{{ $destination['name'] }}</div>

            <div class="label">Address:</div>
            <div>{{ $destination['address'] }}</div>
        </div>
    </div>

    @if($notes)
    <div class="info-section">
        <h2>Shipping Notes</h2>
        <div>{{ $notes }}</div>
    </div>
    @endif

    <div class="info-section">
        <h2>Items</h2>
        <table>
            <thead>
                <tr>
                    <th>Order Number</th>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Description</th>
                    <th>Step</th>
                    <th style="text-align: right;">Quantity</th>
                    <th>Packages</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $item)
                <tr>
                    <td>{{ $item['order_number'] }}</td>
                    <td>{{ $item['item_code'] ?: '-' }}</td>
                    <td>{{ $item['item_name'] ?: '-' }}</td>
                    <td>{{ $item['item_description'] ?: '-' }}</td>
                    <td>{{ $item['step'] ?: '-' }}</td>
                    <td style="text-align: right;">{{ number_format($item['quantity'], 2) }}</td>
                    <td>{{ $item['packages'] }}</td>
                </tr>
                @if($item['notes'])
                <tr>
                    <td colspan="7" style="background-color: #f9f9f9; font-style: italic;">
                        Notes: {{ $item['notes'] }}
                    </td>
                </tr>
                @endif
                @endforeach
            </tbody>
        </table>

        <div class="totals">
            <div>Total Items: {{ $total_items }}</div>
            <div>Total Quantity: {{ number_format($total_quantity, 2) }}</div>
            @if($total_packages)
            <div>Total Packages: {{ $total_packages }}</div>
            @endif
        </div>
    </div>

    <div class="signature-section">
        <div>
            <div class="label">Prepared By:</div>
            <div class="signature-box">
                <div>{{ $created_by }}</div>
                <div style="margin-top: 5px;">Date: _________________</div>
            </div>
        </div>
        <div>
            <div class="label">Received By:</div>
            <div class="signature-box">
                <div>Name: _______________________</div>
                <div style="margin-top: 5px;">Date: _________________</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>This packing list was computer-generated on {{ now()->format('Y-m-d H:i:s') }}</p>
        <p>{{ $shipment_number }}</p>
    </div>
</body>
</html>

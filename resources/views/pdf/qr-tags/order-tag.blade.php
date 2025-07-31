<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: 70mm 140mm;
            margin: 3mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            width: 64mm;
            height: 134mm;
        }
        
        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
            text-align: center;
        }
        
        .header {
            margin-bottom: 3mm;
        }
        
        .title {
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 1mm;
        }
        
        .order-number {
            font-size: 10pt;
            background: #f0f0f0;
            padding: 2mm 4mm;
            border-radius: 2mm;
            display: inline-block;
        }
        
        .qr-code {
            margin: 3mm 0;
        }
        
        .qr-code img {
            width: 25mm;
            height: 25mm;
        }
        
        .images-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 3mm;
        }
        
        .item-image, .parent-image {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .item-image img {
            max-width: 45mm;
            max-height: 35mm;
            object-fit: contain;
        }
        
        .parent-section {
            border-top: 1px dashed #ccc;
            padding-top: 3mm;
        }
        
        .parent-label {
            font-size: 8pt;
            color: #666;
            margin-bottom: 2mm;
        }
        
        .parent-image img {
            max-width: 35mm;
            max-height: 25mm;
            object-fit: contain;
        }
        
        .details {
            margin-top: auto;
            padding-top: 3mm;
            border-top: 1px solid #ddd;
            font-size: 9pt;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1mm;
        }
        
        .generated-date {
            font-size: 7pt;
            color: #666;
            margin-top: 2mm;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">Ordem de Manufatura</div>
            <div class="order-number">{{ $order->order_number }}</div>
        </div>
        
        <div class="qr-code">
            <img src="data:image/png;base64,{{ $qrCode }}" alt="QR Code">
        </div>
        
        <div class="images-section">
            @if($item->image_url ?? false)
                <div class="item-image">
                    <img src="{{ $item->image_url }}" alt="{{ $item->name }}">
                </div>
            @endif
            
            @if($parentItem && ($parentItem->image_url ?? false))
                <div class="parent-section">
                    <div class="parent-label">Roteamento via:</div>
                    <div class="parent-image">
                        <img src="{{ $parentItem->image_url }}" alt="{{ $parentItem->name }}">
                    </div>
                </div>
            @endif
        </div>
        
        <div class="details">
            <div class="detail-row">
                <span>Item:</span>
                <span>{{ \Illuminate\Support\Str::limit($item->name, 20) }}</span>
            </div>
            <div class="detail-row">
                <span>Qtd:</span>
                <span>{{ $order->quantity }}</span>
            </div>
            <div class="detail-row">
                <span>Entrega:</span>
                <span>{{ $order->planned_end_date ? $order->planned_end_date->format('d/m/Y') : 'N/A' }}</span>
            </div>
            <div class="generated-date">
                Gerado em {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </div>
    </div>
</body>
</html>

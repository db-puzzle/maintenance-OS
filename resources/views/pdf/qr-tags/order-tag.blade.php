<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: 100mm 100mm;
            margin: 3mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            width: 94mm;
            height: 94mm;
        }
        
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 2mm;
            height: 100%;
            width: 100%;
        }
        
        /* Top-left quadrant: QR Code */
        .qr-quadrant {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #ddd;
            padding: 2mm;
            background: #fafafa;
        }
        
        .qr-code img {
            width: 35mm;
            height: 35mm;
        }
        
        .order-number {
            font-size: 10pt;
            font-weight: bold;
            margin-top: 2mm;
            background: #333;
            color: white;
            padding: 1mm 3mm;
            border-radius: 2mm;
        }
        
        /* Top-right quadrant: Item Image */
        .item-image-quadrant {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #ddd;
            padding: 2mm;
            position: relative;
        }
        
        .quadrant-label {
            position: absolute;
            top: 2mm;
            left: 2mm;
            font-size: 8pt;
            color: #666;
            font-weight: bold;
        }
        
        .item-image-quadrant img {
            max-width: 38mm;
            max-height: 35mm;
            object-fit: contain;
        }
        
        .item-name {
            font-size: 8pt;
            margin-top: 2mm;
            text-align: center;
            color: #333;
        }
        
        /* Bottom-left quadrant: Parent Image */
        .parent-image-quadrant {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #ddd;
            padding: 2mm;
            position: relative;
        }
        
        .parent-image-quadrant img {
            max-width: 38mm;
            max-height: 35mm;
            object-fit: contain;
        }
        
        /* Bottom-right quadrant: Details */
        .details-quadrant {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border: 1px solid #ddd;
            padding: 3mm;
            background: #f8f8f8;
        }
        
        .title {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 3mm;
            text-align: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: 2mm;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2mm;
            font-size: 9pt;
        }
        
        .detail-label {
            font-weight: bold;
            color: #555;
        }
        
        .detail-value {
            color: #333;
        }
        
        .generated-date {
            font-size: 7pt;
            color: #666;
            margin-top: 3mm;
            text-align: center;
            border-top: 1px dashed #ccc;
            padding-top: 2mm;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Top-left quadrant: QR Code -->
        <div class="qr-quadrant">
            <div class="qr-code">
                <img src="data:image/png;base64,{{ $qrCode }}" alt="QR Code">
            </div>
            <div class="order-number">{{ $order->order_number }}</div>
        </div>
        
        <!-- Top-right quadrant: Item Image -->
        <div class="item-image-quadrant">
            <span class="quadrant-label">Item</span>
            @if(isset($itemImageBase64) && $itemImageBase64)
                <img src="{{ $itemImageBase64 }}" alt="{{ $item->name }}">
                <div class="item-name">{{ \Illuminate\Support\Str::limit($item->name, 25) }}</div>
            @else
                <div style="color: #999; font-size: 9pt;">Sem imagem</div>
            @endif
        </div>
        
        <!-- Bottom-left quadrant: Parent Image -->
        <div class="parent-image-quadrant">
            <span class="quadrant-label">Roteamento via</span>
            @if(isset($parentImageBase64) && $parentImageBase64)
                <img src="{{ $parentImageBase64 }}" alt="{{ $parentItem->name }}">
                <div class="item-name">{{ \Illuminate\Support\Str::limit($parentItem->name, 25) }}</div>
            @else
                <div style="color: #999; font-size: 9pt;">Sem roteamento</div>
            @endif
        </div>
        
        <!-- Bottom-right quadrant: Details -->
        <div class="details-quadrant">
            <div class="title">Ordem de Manufatura</div>
            <div>
                <div class="detail-row">
                    <span class="detail-label">Item:</span>
                    <span class="detail-value">{{ \Illuminate\Support\Str::limit($item->name, 20) }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Quantidade:</span>
                    <span class="detail-value">{{ $order->quantity }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Entrega:</span>
                    <span class="detail-value">{{ $order->planned_end_date ? $order->planned_end_date->format('d/m/Y') : 'N/A' }}</span>
                </div>
            </div>
            <div class="generated-date">
                Gerado em {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </div>
    </div>
</body>
</html>

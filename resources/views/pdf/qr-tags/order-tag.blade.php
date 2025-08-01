<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: 150mm 100mm;
            margin: 1mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            width: 148mm;
            height: 98mm;
        }
        
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 60mm auto;
            gap: 1mm;
            height: 100%;
            width: 100%;
        }
        
        /* QR Code Cell */
        .qr-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #ddd;
            padding: 1mm;
            background: #fafafa;
        }
        
        .qr-code img {
            width: 40mm;
            height: 40mm;
        }
        
        .order-number {
            font-size: 8pt;
            font-weight: bold;
            margin-top: 1mm;
            background: #333;
            color: white;
            padding: 0.5mm 2mm;
            border-radius: 1mm;
        }
        
        /* Image Cells */
        .image-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #ddd;
            padding: 1mm;
            position: relative;
        }
        
        .cell-label {
            position: absolute;
            top: 1mm;
            left: 1mm;
            font-size: 6pt;
            color: #666;
            font-weight: bold;
        }
        
        .image-cell img {
            max-width: 45mm;
            max-height: 50mm;
            object-fit: contain;
        }
        
        .item-name {
            font-size: 6pt;
            margin-top: 1mm;
            text-align: center;
            color: #333;
            max-width: 28mm;
            word-wrap: break-word;
            line-height: 1.1;
        }
        
        /* Details Section - spans all 3 columns */
        .details-section {
            grid-column: 1 / -1;
            display: flex;
            flex-direction: column;
            border: 1px solid #ddd;
            padding: 1.5mm;
            background: #f8f8f8;
        }
        
        .title {
            font-size: 8pt;
            font-weight: bold;
            margin-bottom: 1mm;
            text-align: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: 1mm;
        }
        
        .detail-rows {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1mm;
            font-size: 7pt;
            line-height: 1.2;
        }
        
        .detail-label {
            font-weight: bold;
            color: #555;
        }
        
        .detail-value {
            color: #333;
            text-align: right;
            flex: 1;
            margin-left: 2mm;
        }
        
        .generated-date {
            font-size: 6pt;
            color: #666;
            margin-top: 1mm;
            text-align: center;
            border-top: 1px dashed #ccc;
            padding-top: 1mm;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- First cell: QR Code -->
        <div class="qr-cell">
            <div class="qr-code">
                <img src="data:image/png;base64,{{ $qrCode }}" alt="QR Code">
            </div>
            <div class="order-number">{{ $order->order_number }}</div>
        </div>
        
        <!-- Second cell: Item Image -->
        <div class="image-cell">
            <span class="cell-label">Item</span>
            @if(isset($itemImageBase64) && $itemImageBase64)
                <img src="{{ $itemImageBase64 }}" alt="{{ $item->name }}">
                <div class="item-name">{{ \Illuminate\Support\Str::limit($item->name, 25) }}</div>
            @else
                <div style="color: #999; font-size: 6pt;">Sem imagem</div>
            @endif
        </div>
        
        <!-- Third cell: Routing Image -->
        <div class="image-cell">
            <span class="cell-label">Roteamento via</span>
            @if(isset($parentImageBase64) && $parentImageBase64)
                <img src="{{ $parentImageBase64 }}" alt="{{ $parentItem->name }}">
                <div class="item-name">{{ \Illuminate\Support\Str::limit($parentItem->name, 25) }}</div>
            @else
                <div style="color: #999; font-size: 8pt;">Sem roteamento</div>
            @endif
        </div>
        
        <!-- Bottom section spanning all columns: Details -->
        <div class="details-section">
            <div class="title">Ordem de Manufatura</div>
            <div class="detail-rows">
                <div class="detail-row">
                    <span class="detail-label">Item:</span>
                    <span class="detail-value">{{ $item->name }}</span>
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

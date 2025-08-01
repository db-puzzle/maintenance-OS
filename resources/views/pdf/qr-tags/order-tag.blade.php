<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: 140mm 70mm;
            margin: 3mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            width: 134mm;
            height: 64mm;
        }
        
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 40mm auto;
            gap: 2mm;
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
            padding: 2mm;
            background: #fafafa;
        }
        
        .qr-code img {
            width: 30mm;
            height: 30mm;
        }
        
        .order-number {
            font-size: 9pt;
            font-weight: bold;
            margin-top: 2mm;
            background: #333;
            color: white;
            padding: 1mm 3mm;
            border-radius: 2mm;
        }
        
        /* Image Cells */
        .image-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #ddd;
            padding: 2mm;
            position: relative;
        }
        
        .cell-label {
            position: absolute;
            top: 2mm;
            left: 2mm;
            font-size: 7pt;
            color: #666;
            font-weight: bold;
        }
        
        .image-cell img {
            max-width: 40mm;
            max-height: 30mm;
            object-fit: contain;
        }
        
        .item-name {
            font-size: 7pt;
            margin-top: 2mm;
            text-align: center;
            color: #333;
            max-width: 28mm;
            word-wrap: break-word;
        }
        
        /* Details Section - spans all 3 columns */
        .details-section {
            grid-column: 1 / -1;
            display: flex;
            flex-direction: column;
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
        
        .detail-rows {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
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
            text-align: right;
            flex: 1;
            margin-left: 3mm;
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
                <div style="color: #999; font-size: 8pt;">Sem imagem</div>
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

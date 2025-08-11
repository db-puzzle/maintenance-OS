<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * {
            box-sizing: border-box;
        }
        
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
        
        /* Wrapper to keep entire tag together */
        .tag-wrapper {
            width: 100%;
            height: 100%;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Main table layout */
        .main-table {
            width: 100%;
            height: 100%;
            border-collapse: separate;
            table-layout: fixed;
            /* Prevent page breaks inside the table */
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Top row with 3 cells */
        .top-row {
            height: 66%;
            /* Keep row content together */
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .top-cell {
            width: 33.33%;
            border: 1px solid #ddd;
            padding: 1mm;
            vertical-align: middle;
            text-align: center;
            position: relative;
            /* Prevent breaks within cells */
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* QR Code Cell */
        .qr-cell {
            background: #fafafa;
        }
        
        .qr-code img {
            width: 40mm;
            height: 40mm;
            display: block;
            margin: 0 auto;
        }
        
        .order-number {
            font-size: 8pt;
            font-weight: bold;
            margin-top: 1mm;
            background: #333;
            color: white;
            padding: 0.5mm 2mm;
            border-radius: 1mm;
            display: inline-block;
        }
        
        /* Image Cells */
        .cell-label {
            position: absolute;
            top: 1mm;
            left: 1mm;
            font-size: 6pt;
            color: #666;
            font-weight: bold;
        }
        
        .image-content {
            padding-top: 5mm;
        }
        
        .image-content img {
            max-width: 43mm;
            max-height: 48mm;
            object-fit: contain;
            display: block;
            margin: 0 auto;
        }
        
        .item-name {
            font-size: 6pt;
            margin-top: 1mm;
            text-align: center;
            color: #333;
            max-width: 43mm;
            word-wrap: break-word;
            line-height: 1.1;
            margin-left: auto;
            margin-right: auto;
        }
        
        /* Bottom row - Details Section */
        .bottom-row {
            height: auto;
            /* Keep row content together */
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .details-cell {
            border: 1px solid #ddd;
            padding: 1.5mm;
            background: #f8f8f8;
            vertical-align: top;
            /* Prevent breaks within cell */
            page-break-inside: avoid;
            break-inside: avoid;
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
            margin-top: 2mm;
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
            margin-top: 2mm;
            text-align: center;
            border-top: 1px dashed #ccc;
            padding-top: 1mm;
        }
    </style>
</head>
<body>
    <div class="tag-wrapper">
        <table class="main-table">
        <!-- Top row with 3 cells side by side -->
        <tr class="top-row">
            <!-- First cell: QR Code -->
            <td class="top-cell qr-cell">
                <div class="qr-code">
                    <img src="data:image/png;base64,{{ $qrCode }}" alt="QR Code">
                </div>
                <div class="order-number">{{ $order->order_number }}</div>
            </td>
            
            <!-- Second cell: Item Image -->
            <td class="top-cell">
                <span class="cell-label">Item</span>
                <div class="image-content">
                    @if(isset($itemImageBase64) && $itemImageBase64)
                        <img src="{{ $itemImageBase64 }}" alt="{{ $item->name }}">
                        <div class="item-name">{{ \Illuminate\Support\Str::limit($item->name, 25) }}</div>
                    @else
                        <div style="color: #999; font-size: 6pt;">Sem imagem</div>
                    @endif
                </div>
            </td>
            
            <!-- Third cell: Routing Image -->
            <td class="top-cell">
                <span class="cell-label">Roteamento via</span>
                <div class="image-content">
                    @if(isset($parentImageBase64) && $parentImageBase64)
                        <img src="{{ $parentImageBase64 }}" alt="{{ $parentItem->name }}">
                        <div class="item-name">{{ \Illuminate\Support\Str::limit($parentItem->name, 25) }}</div>
                    @else
                        <div style="color: #999; font-size: 8pt;">Sem roteamento</div>
                    @endif
                </div>
            </td>
        </tr>
        
        <!-- Bottom row spanning all columns: Details -->
        <tr class="bottom-row">
            <td colspan="3" class="details-cell">
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
            </td>
        </tr>
    </table>
    </div>
</body>
</html>
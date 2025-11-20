<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>MO Label - {{ $order->order_number }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }
        
        .label-container {
            padding: 10px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            justify-content: space-between;
        }
        
        .header {
            text-align: center;
            margin-bottom: 10px;
        }
        
        .mo-number {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .item-info {
            margin-bottom: 10px;
        }
        
        .item-name {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 3px;
        }
        
        .quantity {
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
        }
        
        .content {
            display: flex;
            align-items: center;
            justify-content: space-around;
            flex: 1;
            gap: 10px;
        }
        
        .qr-code {
            text-align: center;
        }
        
        .qr-code img {
            max-width: 100%;
            height: auto;
        }
        
        .item-image {
            text-align: center;
            max-width: 40%;
        }
        
        .item-image img {
            max-width: 100%;
            max-height: 150px;
            height: auto;
            object-fit: contain;
        }
        
        .no-image {
            width: 120px;
            height: 120px;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 10px;
            text-align: center;
            border-radius: 4px;
        }
        
        .footer {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #666;
            text-align: center;
        }
        
        /* Size adjustments */
        @if($labelSize === 'large')
            body { font-size: 14px; }
            .mo-number { font-size: 24px; }
            .item-name { font-size: 18px; }
            .quantity { font-size: 20px; }
            .footer { font-size: 12px; }
            .item-image img { max-height: 200px; }
        @elseif($labelSize === 'small')
            body { font-size: 10px; }
            .mo-number { font-size: 14px; }
            .item-name { font-size: 12px; }
            .quantity { font-size: 14px; }
            .footer { font-size: 8px; }
            .content { flex-direction: column; }
            .item-image { display: none; }
        @endif
    </style>
</head>
<body>
    <div class="label-container">
        <div class="header">
            <div class="mo-number">MO: {{ $order->order_number }}</div>
            <div class="item-info">
                <div class="item-name">{{ $item->name }}</div>
                <div class="quantity">Qty: {{ number_format($order->quantity) }} {{ $order->unit_of_measure }}</div>
            </div>
        </div>
        
        <div class="content">
            <div class="qr-code">
                <img src="data:image/png;base64,{{ $qrCode }}" alt="QR Code">
                @if($labelSize !== 'small')
                    <div style="font-size: 8px; margin-top: 5px; color: #666;">
                        Scan for details
                    </div>
                @endif
            </div>
            
            @if($labelSize !== 'small')
                <div class="item-image">
                    @if($itemImage)
                        <img src="{{ $itemImage }}" alt="{{ $item->name }}">
                    @else
                        <div class="no-image">
                            No image<br>available
                        </div>
                    @endif
                </div>
            @endif
        </div>
        
        <div class="footer">
            Generated: {{ $generatedAt }}
        </div>
    </div>
</body>
</html>

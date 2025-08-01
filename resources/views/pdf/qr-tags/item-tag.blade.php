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
            margin-bottom: 5mm;
        }
        
        .title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 2mm;
        }
        
        .item-number {
            font-size: 10pt;
            background: #f0f0f0;
            padding: 2mm 4mm;
            border-radius: 2mm;
            display: inline-block;
        }
        
        .qr-code {
            margin: 5mm 0;
        }
        
        .qr-code img {
            width: 25mm;
            height: 25mm;
        }
        
        .item-image {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 5mm 0;
        }
        
        .item-image img {
            max-width: 50mm;
            max-height: 40mm;
            object-fit: contain;
        }
        
        .details {
            margin-top: auto;
            padding-top: 3mm;
            border-top: 1px solid #ddd;
            font-size: 9pt;
        }
        
        .item-name {
            font-weight: bold;
            margin-bottom: 2mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .generated-date {
            font-size: 7pt;
            color: #666;
            margin-top: 2mm;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">Item</div>
            <div class="item-number">{{ $item->item_number }}</div>
        </div>
        
        <div class="qr-code">
            <img src="data:image/png;base64,{{ $qrCode }}" alt="QR Code">
        </div>
        
        @if(isset($itemImageBase64) && $itemImageBase64)
            <div class="item-image">
                <img src="{{ $itemImageBase64 }}" alt="{{ $item->name }}">
            </div>
        @endif
        
        <div class="details">
            <div class="item-name">{{ $item->name }}</div>
            @if($item->category ?? false)
                <div>{{ $item->category->name }}</div>
            @endif
            <div class="generated-date">
                Gerado em {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </div>
    </div>
</body>
</html>

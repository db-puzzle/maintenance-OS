<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: 100mm 150mm;
            margin: 3mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        .container {
            width: 94mm;
            height: 144mm;
            display: flex;
            flex-direction: column;
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
        
        .resource-number {
            font-size: 10pt;
            background: #f0f0f0;
            padding: 2mm 4mm;
            border-radius: 2mm;
            display: inline-block;
            margin-bottom: 3mm;
        }
        
        .qr-code {
            margin: 5mm 0;
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
            margin: 3mm 0;
        }
        
        .item-image {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .item-image img {
            max-width: 45mm;
            max-height: 30mm;
            object-fit: contain;
        }
        
        .parent-image {
            display: flex;
            align-items: center;
            justify-content: center;
            border-top: 1px dashed #ccc;
            padding-top: 3mm;
        }
        
        .parent-image img {
            max-width: 35mm;
            max-height: 25mm;
            object-fit: contain;
        }
        
        .parent-label {
            font-size: 8pt;
            color: #666;
            margin-bottom: 2mm;
            text-align: center;
        }
        
        .item-details {
            display: flex;
            flex-direction: column;
            padding: 0 3mm;
        }
        
        .item-name {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 2mm;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        
        .item-info {
            font-size: 9pt;
            margin-bottom: 1mm;
        }
        
        .footer {
            margin-top: auto;
            padding-top: 3mm;
            border-top: 1px solid #ddd;
        }
        
        .generated-date {
            font-size: 7pt;
            color: #666;
        }
    </style>
</head>
<body>
    @foreach($tags as $index => $tag)
        @if($index > 0)
            <div class="page-break"></div>
        @endif
        
        <div class="container">
            <div class="header">
                <div class="title">{{ $tag['type'] === 'item' ? 'Item' : 'Ordem de Manufatura' }}</div>
                @if($tag['type'] === 'item')
                    <div class="resource-number">{{ $tag['item']->item_number }}</div>
                @else
                    <div class="resource-number">{{ $tag['order']->order_number }}</div>
                @endif
            </div>
            
            <div class="qr-code">
                <img src="data:image/png;base64,{{ $tag['qrCode'] }}" alt="QR Code">
            </div>
            
            <div class="images-section">
                @if($tag['type'] === 'item')
                    @if(isset($tag['itemImageBase64']) && $tag['itemImageBase64'])
                        <div class="item-image">
                            <img src="{{ $tag['itemImageBase64'] }}" alt="{{ $tag['item']->name }}">
                        </div>
                    @endif
                @else
                    @if(isset($tag['itemImageBase64']) && $tag['itemImageBase64'])
                        <div class="item-image">
                            <img src="{{ $tag['itemImageBase64'] }}" alt="{{ $tag['item']->name }}">
                        </div>
                    @endif
                    @if(isset($tag['parentImageBase64']) && $tag['parentImageBase64'] && $tag['parentItem'])
                        <div class="parent-label">Roteamento via: {{ $tag['parentItem']->name }}</div>
                        <div class="parent-image">
                            <img src="{{ $tag['parentImageBase64'] }}" alt="{{ $tag['parentItem']->name }}">
                        </div>
                    @endif
                @endif
            </div>
            
            <div class="item-details">
                @if($tag['type'] === 'item')
                    <div class="item-name">{{ $tag['item']->name }}</div>
                    @if($tag['item']->category)
                        <div class="item-info">{{ $tag['item']->category->name }}</div>
                    @endif
                @else
                    <div class="item-name">{{ $tag['item']->name }}</div>
                    <div class="item-info">Qtd: {{ $tag['order']->quantity }}</div>
                    <div class="item-info">Entrega: {{ $tag['order']->due_date->format('d/m/Y') }}</div>
                    @if($tag['parentItem'])
                        <div class="item-info" style="margin-top: 3mm;">
                            <small>Roteamento via: {{ $tag['parentItem']->name }}</small>
                        </div>
                    @endif
                @endif
            </div>
            
            <div class="footer">
                <div class="generated-date">
                    Gerado em {{ $tag['generatedAt']->format('d/m/Y H:i') }}
                </div>
            </div>
        </div>
    @endforeach
</body>
</html>
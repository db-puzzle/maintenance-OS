<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: 100mm 150mm;
            margin: 1mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            width: 98mm;
            height: 148mm;
        }
        
        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            text-align: center;
            box-sizing: border-box;
        }
        
        .header {
            margin-bottom: 2mm;
            padding: 1mm;
            background: #f8f8f8;
            border: 1px solid #ddd;
        }
        
        .title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 0.5mm;
        }
        
        .item-number {
            font-size: 10pt;
            background: #333;
            color: white;
            padding: 0.5mm 3mm;
            border-radius: 1mm;
            display: inline-block;
        }
        
        .qr-code {
            margin: 2mm 0;
            padding: 2mm;
            background: #fafafa;
            border: 1px solid #ddd;
            display: inline-block;
        }
        
        .qr-code img {
            width: 40mm;
            height: 40mm;
        }
        
        .item-image {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 2mm 0;
            padding: 2mm;
            border: 1px solid #ddd;
            background: white;
            min-height: 50mm;
            max-height: 60mm;
            overflow: hidden;
            position: relative;
        }
        
        .item-image img {
            max-width: calc(100% - 4mm);
            max-height: calc(100% - 4mm);
            object-fit: contain;
            display: block;
        }
        
        .details {
            margin-top: auto;
            padding: 2mm;
            border: 1px solid #ddd;
            font-size: 9pt;
            background: #f8f8f8;
        }
        
        .item-name {
            font-weight: bold;
            margin-bottom: 1mm;
            font-size: 10pt;
            word-wrap: break-word;
            line-height: 1.2;
            max-height: 20mm;
            overflow: hidden;
        }
        
        .generated-date {
            font-size: 7pt;
            color: #666;
            margin-top: 1mm;
            border-top: 1px dashed #ccc;
            padding-top: 1mm;
        }
        
        .category {
            font-size: 8pt;
            color: #555;
            margin-bottom: 1mm;
        }
        
        .no-image {
            color: #999;
            font-size: 9pt;
            padding: 25mm 0;
            background: #f5f5f5;
            border: 2px dashed #ddd;
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
        
        <div class="item-image">
            @if(isset($itemImageBase64) && $itemImageBase64)
                <img src="{{ $itemImageBase64 }}" alt="{{ $item->name }}">
            @else
                <div class="no-image">Sem imagem disponível</div>
            @endif
        </div>
        
        <div class="details">
            <div class="item-name">{{ $item->name }}</div>
            @if($item->category ?? false)
                <div class="category">Categoria: {{ $item->category->name }}</div>
            @endif
            <div class="generated-date">
                Gerado em {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </div>
    </div>
</body>
</html>

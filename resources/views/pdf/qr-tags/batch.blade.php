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
        }
        
        .page-break {
            page-break-after: always;
        }
        
        .container {
            width: 64mm;
            height: 134mm;
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
        
        .qr-code {
            margin: 5mm 0;
        }
        
        .qr-code img {
            width: 25mm;
            height: 25mm;
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
            </div>
            
            <div class="qr-code">
                <img src="data:image/png;base64,{{ $tag['qrCode'] }}" alt="QR Code">
            </div>
        </div>
    @endforeach
</body>
</html>

# QR Code and Tracking System - Implementation Specification

## 1. Overview

This document provides the technical implementation specification for the QR Code and Tracking System as defined in the requirements document (1a-qr-code-tracking-requirements.md). The implementation follows the project's established patterns using Laravel, Inertia.js, React with TypeScript, and ShadCN UI components.

## 2. Architecture Overview

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Inertia)                 │
├─────────────────────────────────────────────────────────────┤
│  - QR Tag Generation UI       │  - QR Scanner Interface      │
│  - PDF Preview Components     │  - Mobile-Optimized Views    │
│  - Batch Generation Tools     │  - Deep Link Handler         │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Laravel)                         │
├─────────────────────────────────────────────────────────────┤
│  - QR Code Generation Service │  - URL Routing & Parsing     │
│  - PDF Tag Builder           │  - Authentication Middleware  │
│  - Image Processing          │  - Mobile Detection          │
│  - Batch Job Handlers        │  - Scan Event Logging        │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage & External Services               │
├─────────────────────────────────────────────────────────────┤
│  - S3 for PDF Storage        │  - Redis for URL Caching     │
│  - PostgreSQL for Scan Logs  │  - Queue for Batch Generation│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 URL Structure

All QR codes will encode URLs following this pattern:
- Items: `https://[APP_URL]/qr/items/{item_number}`
- Manufacturing Orders: `https://[APP_URL]/qr/orders/{mo_number}`
- Shipments: `https://[APP_URL]/qr/shipments/{shipment_number}`

The `/qr/` prefix allows for:
1. Easy identification of QR-initiated requests
2. Separate middleware handling
3. Analytics tracking
4. Mobile optimization detection

## 3. Backend Implementation

### 3.1 Database Schema

#### 3.1.1 QR Scan Logs Table

```php
// Migration: 2025_XX_XX_create_qr_scan_logs_table.php
Schema::create('qr_scan_logs', function (Blueprint $table) {
    $table->id();
    $table->string('resource_type'); // 'item', 'order', 'shipment'
    $table->string('resource_id');
    $table->foreignId('user_id')->nullable()->constrained();
    $table->string('ip_address');
    $table->string('user_agent');
    $table->string('device_type'); // 'mobile', 'tablet', 'desktop'
    $table->boolean('in_app')->default(false);
    $table->json('metadata')->nullable(); // Additional tracking data
    $table->timestamp('scanned_at');
    $table->timestamps();
    
    $table->index(['resource_type', 'resource_id']);
    $table->index('user_id');
    $table->index('scanned_at');
});
```

#### 3.1.2 QR Tag Templates Table

```php
// Migration: 2025_XX_XX_create_qr_tag_templates_table.php
Schema::create('qr_tag_templates', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('type'); // 'item', 'order'
    $table->json('layout'); // JSON configuration for PDF layout
    $table->boolean('is_default')->default(false);
    $table->boolean('is_active')->default(true);
    $table->foreignId('created_by')->constrained('users');
    $table->timestamps();
});
```

### 3.2 Models

#### 3.2.1 QrScanLog Model

```php
// app/Models/QrScanLog.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrScanLog extends Model
{
    protected $fillable = [
        'resource_type',
        'resource_id',
        'user_id',
        'ip_address',
        'user_agent',
        'device_type',
        'in_app',
        'metadata',
        'scanned_at'
    ];

    protected $casts = [
        'metadata' => 'array',
        'scanned_at' => 'datetime',
        'in_app' => 'boolean'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getResourceAttribute()
    {
        return match($this->resource_type) {
            'item' => Item::where('item_number', $this->resource_id)->first(),
            'order' => ManufacturingOrder::where('order_number', $this->resource_id)->first(),
            'shipment' => Shipment::where('shipment_number', $this->resource_id)->first(),
            default => null
        };
    }
}
```

### 3.3 Services

#### 3.3.1 QR Code Generation Service

```php
// app/Services/Production/QrCodeService.php
<?php

namespace App\Services\Production;

use SimpleSoftwareIO\QrCode\Facades\QrCode;
use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use Illuminate\Support\Facades\Storage;

class QrCodeService
{
    public function generateItemUrl(Item $item): string
    {
        return route('qr.item', ['item_number' => $item->item_number]);
    }

    public function generateOrderUrl(ManufacturingOrder $order): string
    {
        // If order has no route, find closest parent with route
        if (!$order->has_route) {
            $parentWithRoute = $this->findClosestParentWithRoute($order);
            if ($parentWithRoute) {
                return route('qr.order', ['mo_number' => $parentWithRoute->order_number]);
            }
        }
        
        return route('qr.order', ['mo_number' => $order->order_number]);
    }

    public function generateQrCode(string $url, array $options = []): string
    {
        $size = $options['size'] ?? 300;
        $margin = $options['margin'] ?? 2;
        $errorCorrection = $options['error_correction'] ?? 'M';
        
        return QrCode::format('png')
            ->size($size)
            ->margin($margin)
            ->errorCorrection($errorCorrection)
            ->generate($url);
    }

    private function findClosestParentWithRoute(ManufacturingOrder $order): ?ManufacturingOrder
    {
        $current = $order;
        
        while ($current->parent_order_id) {
            $current = $current->parentOrder;
            if ($current->has_route) {
                return $current;
            }
        }
        
        return null;
    }
}
```

#### 3.3.2 PDF Tag Generation Service

```php
// app/Services/Production/QrTagPdfService.php
<?php

namespace App\Services\Production;

use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class QrTagPdfService
{
    private QrCodeService $qrCodeService;
    
    public function __construct(QrCodeService $qrCodeService)
    {
        $this->qrCodeService = $qrCodeService;
    }

    public function generateItemTag(Item $item): string
    {
        $url = $this->qrCodeService->generateItemUrl($item);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        $data = [
            'type' => 'item',
            'item' => $item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now()
        ];
        
        return $this->generatePdf('item-tag', $data);
    }

    public function generateOrderTag(ManufacturingOrder $order): string
    {
        $url = $this->qrCodeService->generateOrderUrl($order);
        $qrCode = $this->qrCodeService->generateQrCode($url);
        
        // Get parent item with route if needed
        $parentWithRoute = null;
        if (!$order->has_route) {
            $parentWithRoute = $this->qrCodeService->findClosestParentWithRoute($order);
        }
        
        $data = [
            'type' => 'order',
            'order' => $order,
            'item' => $order->item,
            'parentItem' => $parentWithRoute?->item,
            'qrCode' => base64_encode($qrCode),
            'url' => $url,
            'generatedAt' => now()
        ];
        
        return $this->generatePdf('order-tag', $data);
    }

    public function generateBatchTags(array $items, string $type = 'item'): string
    {
        $tags = [];
        
        foreach ($items as $item) {
            $tags[] = match($type) {
                'item' => $this->generateItemTag($item),
                'order' => $this->generateOrderTag($item),
                default => null
            };
        }
        
        // Combine all PDFs into single document
        return $this->combinePdfs($tags);
    }

    private function generatePdf(string $template, array $data): string
    {
        $pdf = Pdf::loadView("pdf.qr-tags.{$template}", $data)
            ->setPaper([0, 0, 198.425, 396.85], 'portrait') // 70mm x 140mm in points
            ->setOptions([
                'dpi' => 300,
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true
            ]);
            
        $filename = "qr-tag-{$data['type']}-{$data['item']->id}-" . time() . ".pdf";
        $path = "qr-tags/{$filename}";
        
        Storage::disk('s3')->put($path, $pdf->output());
        
        return Storage::disk('s3')->url($path);
    }
}
```

### 3.4 Controllers

#### 3.4.1 QR Code Controller (For Scanning)

```php
// app/Http/Controllers/Production/QrCodeController.php
<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\QrScanLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Jenssegers\Agent\Agent;

class QrCodeController extends Controller
{
    public function handleItemScan(Request $request, string $itemNumber)
    {
        $item = Item::where('item_number', $itemNumber)->firstOrFail();
        
        // Log the scan
        $this->logScan($request, 'item', $itemNumber);
        
        // Check if request is from in-app scanner
        if ($this->isInAppRequest($request)) {
            // Return data for in-app navigation
            return response()->json([
                'type' => 'item',
                'redirect' => route('production.items.show', $item),
                'data' => $item
            ]);
        }
        
        // Return mobile-optimized Inertia page
        return Inertia::render('production/qr/ItemScan', [
            'item' => $item->load(['category', 'current_bom']),
            'can' => [
                'view' => $request->user()->can('view', $item),
                'update' => $request->user()->can('update', $item),
                'execute_steps' => $request->user()->can('production.steps.execute', $item)
            ],
            'actions' => $this->getAvailableActions($request->user(), $item)
        ])->withViewData(['layout' => 'mobile']);
    }

    public function handleOrderScan(Request $request, string $orderNumber)
    {
        $order = ManufacturingOrder::where('order_number', $orderNumber)
            ->with(['item', 'route.steps', 'childOrders'])
            ->firstOrFail();
        
        // Log the scan
        $this->logScan($request, 'order', $orderNumber);
        
        // Check if request is from in-app scanner
        if ($this->isInAppRequest($request)) {
            return response()->json([
                'type' => 'order',
                'redirect' => route('production.orders.show', $order),
                'data' => $order
            ]);
        }
        
        // Return mobile-optimized Inertia page
        return Inertia::render('production/qr/OrderScan', [
            'order' => $order,
            'currentStep' => $order->getCurrentStep(),
            'can' => [
                'view' => $request->user()->can('view', $order),
                'execute_steps' => $request->user()->can('production.steps.execute', $order),
                'update_quality' => $request->user()->can('production.quality.executeCheck', $order)
            ],
            'actions' => $this->getAvailableOrderActions($request->user(), $order)
        ])->withViewData(['layout' => 'mobile']);
    }

    private function logScan(Request $request, string $type, string $resourceId): void
    {
        $agent = new Agent();
        $agent->setUserAgent($request->userAgent());
        
        QrScanLog::create([
            'resource_type' => $type,
            'resource_id' => $resourceId,
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_type' => $agent->isMobile() ? 'mobile' : ($agent->isTablet() ? 'tablet' : 'desktop'),
            'in_app' => $this->isInAppRequest($request),
            'metadata' => [
                'referer' => $request->header('referer'),
                'platform' => $agent->platform(),
                'browser' => $agent->browser()
            ],
            'scanned_at' => now()
        ]);
    }

    private function isInAppRequest(Request $request): bool
    {
        // Check for custom header set by in-app scanner
        return $request->hasHeader('X-App-Scanner') || 
               $request->expectsJson() ||
               str_contains($request->userAgent(), 'AppWebView');
    }

    private function getAvailableActions($user, Item $item): array
    {
        $actions = [];
        
        if ($user->can('production.orders.create', $item)) {
            $actions[] = [
                'label' => 'Criar Ordem de Manufatura',
                'route' => route('production.orders.create', ['item_id' => $item->id]),
                'icon' => 'Factory'
            ];
        }
        
        if ($item->current_bom && $user->can('view', $item->current_bom)) {
            $actions[] = [
                'label' => 'Ver BOM',
                'route' => route('production.bom.show', $item->current_bom),
                'icon' => 'Package'
            ];
        }
        
        return $actions;
    }

    private function getAvailableOrderActions($user, ManufacturingOrder $order): array
    {
        $actions = [];
        $currentStep = $order->getCurrentStep();
        
        if ($currentStep && $user->can('production.steps.execute', $currentStep)) {
            $actions[] = [
                'label' => $currentStep->status === 'pending' ? 'Iniciar Etapa' : 'Completar Etapa',
                'route' => route('production.steps.execute', $currentStep),
                'icon' => 'Play',
                'primary' => true
            ];
        }
        
        if ($order->hasQualityChecks() && $user->can('production.quality.executeCheck', $order)) {
            $actions[] = [
                'label' => 'Executar Verificação de Qualidade',
                'route' => route('production.quality.check', $order),
                'icon' => 'CheckCircle'
            ];
        }
        
        return $actions;
    }
}
```

#### 3.4.2 QR Tag Generation Controller

```php
// app/Http/Controllers/Production/QrTagController.php
<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Services\Production\QrTagPdfService;
use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QrTagController extends Controller
{
    private QrTagPdfService $pdfService;
    
    public function __construct(QrTagPdfService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    public function index()
    {
        return Inertia::render('production/qr/TagGenerator', [
            'recentTags' => auth()->user()->recentQrTags()->take(10)->get(),
            'templates' => QrTagTemplate::where('is_active', true)->get()
        ]);
    }

    public function generateItemTag(Item $item)
    {
        $this->authorize('view', $item);
        
        $pdfUrl = $this->pdfService->generateItemTag($item);
        
        return response()->json([
            'success' => true,
            'pdf_url' => $pdfUrl,
            'preview_url' => route('qr.preview', ['type' => 'item', 'id' => $item->id])
        ]);
    }

    public function generateOrderTag(ManufacturingOrder $order)
    {
        $this->authorize('view', $order);
        
        $pdfUrl = $this->pdfService->generateOrderTag($order);
        
        return response()->json([
            'success' => true,
            'pdf_url' => $pdfUrl,
            'preview_url' => route('qr.preview', ['type' => 'order', 'id' => $order->id])
        ]);
    }

    public function generateBatch(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:item,order',
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'required|integer'
        ]);
        
        $items = match($validated['type']) {
            'item' => Item::whereIn('id', $validated['ids'])->get(),
            'order' => ManufacturingOrder::whereIn('id', $validated['ids'])->get()
        };
        
        // Check permissions
        $items->each(fn($item) => $this->authorize('view', $item));
        
        // Queue batch generation for large sets
        if (count($items) > 10) {
            dispatch(new GenerateQrBatchJob(
                $validated['type'],
                $items->pluck('id')->toArray(),
                auth()->user()
            ));
            
            return response()->json([
                'success' => true,
                'queued' => true,
                'message' => 'Geração em lote iniciada. Você receberá uma notificação quando estiver pronta.'
            ]);
        }
        
        $pdfUrl = $this->pdfService->generateBatchTags($items->all(), $validated['type']);
        
        return response()->json([
            'success' => true,
            'pdf_url' => $pdfUrl
        ]);
    }
}
```

### 3.5 Routes

```php
// routes/qr.php
<?php

use App\Http\Controllers\Production\QrCodeController;
use App\Http\Controllers\Production\QrTagController;

// QR Code Scanning Routes (public with auth redirect)
Route::prefix('qr')->group(function () {
    Route::get('/items/{item_number}', [QrCodeController::class, 'handleItemScan'])
        ->name('qr.item');
    Route::get('/orders/{mo_number}', [QrCodeController::class, 'handleOrderScan'])
        ->name('qr.order');
    Route::get('/shipments/{shipment_number}', [QrCodeController::class, 'handleShipmentScan'])
        ->name('qr.shipment');
});

// QR Tag Generation Routes (authenticated)
Route::middleware(['auth'])->prefix('production/qr-tags')->group(function () {
    Route::get('/', [QrTagController::class, 'index'])
        ->name('production.qr-tags.index');
    
    Route::post('/items/{item}/generate', [QrTagController::class, 'generateItemTag'])
        ->name('production.qr-tags.item');
    
    Route::post('/orders/{order}/generate', [QrTagController::class, 'generateOrderTag'])
        ->name('production.qr-tags.order');
    
    Route::post('/batch', [QrTagController::class, 'generateBatch'])
        ->name('production.qr-tags.batch');
    
    Route::get('/preview/{type}/{id}', [QrTagController::class, 'preview'])
        ->name('qr.preview');
});
```

## 4. Frontend Implementation

### 4.1 Components

#### 4.1.1 QR Tag Preview Component

```tsx
// resources/js/components/production/QrTagPreview.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, Download, Eye } from 'lucide-react';
import { Item, ManufacturingOrder } from '@/types/production';

interface QrTagPreviewProps {
    type: 'item' | 'order';
    resource: Item | ManufacturingOrder;
    qrCodeUrl: string;
    onPrint: () => void;
    onDownload: () => void;
    onPreview: () => void;
}

export default function QrTagPreview({
    type,
    resource,
    qrCodeUrl,
    onPrint,
    onDownload,
    onPreview
}: QrTagPreviewProps) {
    const isItem = type === 'item';
    const item = isItem ? resource as Item : (resource as ManufacturingOrder).item;
    
    return (
        <Card className="w-[70mm] h-[140mm] p-3 flex flex-col">
            {/* Header */}
            <div className="text-center mb-2">
                <h3 className="text-sm font-semibold">
                    {isItem ? 'Item' : 'Ordem de Manufatura'}
                </h3>
                <Badge variant="outline" className="text-xs">
                    {isItem ? (resource as Item).item_number : (resource as ManufacturingOrder).order_number}
                </Badge>
            </div>
            
            {/* QR Code */}
            <div className="flex justify-center my-3">
                <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-[25mm] h-[25mm]"
                />
            </div>
            
            {/* Item Image(s) */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                {item?.image_url && (
                    <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="max-w-[50mm] max-h-[40mm] object-contain"
                    />
                )}
                
                {!isItem && (resource as ManufacturingOrder).parent_with_route?.item?.image_url && (
                    <div className="border-t pt-2">
                        <p className="text-xs text-muted-foreground text-center mb-1">
                            Roteamento via:
                        </p>
                        <img 
                            src={(resource as ManufacturingOrder).parent_with_route.item.image_url} 
                            alt={(resource as ManufacturingOrder).parent_with_route.item.name}
                            className="max-w-[40mm] max-h-[30mm] object-contain"
                        />
                    </div>
                )}
            </div>
            
            {/* Details */}
            <div className="mt-2 text-xs space-y-1">
                <p className="font-medium truncate">{item?.name}</p>
                {!isItem && (
                    <>
                        <p>Qtd: {(resource as ManufacturingOrder).quantity}</p>
                        <p>Entrega: {new Date((resource as ManufacturingOrder).due_date).toLocaleDateString('pt-BR')}</p>
                    </>
                )}
            </div>
            
            {/* Actions */}
            <div className="mt-3 flex gap-2">
                <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={onPreview}
                >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                </Button>
                <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={onDownload}
                >
                    <Download className="w-4 h-4 mr-1" />
                    Baixar
                </Button>
                <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={onPrint}
                >
                    <Printer className="w-4 h-4 mr-1" />
                    Imprimir
                </Button>
            </div>
        </Card>
    );
}
```

#### 4.1.2 QR Scanner Component

```tsx
// resources/js/components/production/QrScanner.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, X } from 'lucide-react';
import { router } from '@inertiajs/react';
import axios from 'axios';

interface QrScannerProps {
    onScan?: (data: string) => void;
    onClose?: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    
    useEffect(() => {
        if (!scannerRef.current && isScanning) {
            scannerRef.current = new Html5QrcodeScanner(
                "qr-reader",
                { 
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                false
            );
            
            scannerRef.current.render(onScanSuccess, onScanFailure);
        }
        
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        };
    }, [isScanning]);
    
    const onScanSuccess = async (decodedText: string) => {
        // Check if it's our QR code URL pattern
        const urlPattern = /^https?:\/\/[^\/]+\/qr\/(items|orders|shipments)\/([^\/]+)$/;
        const match = decodedText.match(urlPattern);
        
        if (match) {
            const [, resourceType, resourceId] = match;
            
            // If we're in the app, handle navigation internally
            try {
                const response = await axios.get(decodedText, {
                    headers: {
                        'X-App-Scanner': 'true',
                        'Accept': 'application/json'
                    }
                });
                
                if (response.data.redirect) {
                    router.visit(response.data.redirect);
                }
            } catch (error) {
                // If request fails, fall back to opening URL
                window.location.href = decodedText;
            }
        } else if (onScan) {
            // Custom handler for non-standard QR codes
            onScan(decodedText);
        } else {
            setError('QR Code não reconhecido');
        }
    };
    
    const onScanFailure = (error: string) => {
        // Ignore continuous scan errors
        console.log('Scan error:', error);
    };
    
    return (
        <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Scanner QR Code</h3>
                {onClose && (
                    <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>
            
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            {!isScanning ? (
                <div className="text-center py-8">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <Button onClick={() => setIsScanning(true)}>
                        Iniciar Scanner
                    </Button>
                </div>
            ) : (
                <div id="qr-reader" className="w-full" />
            )}
        </Card>
    );
}
```

#### 4.1.3 Batch Tag Generator

```tsx
// resources/js/components/production/QrBatchGenerator.tsx
import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { Item, ManufacturingOrder } from '@/types/production';
import { Download, Printer } from 'lucide-react';
import axios from 'axios';

interface QrBatchGeneratorProps {
    type: 'item' | 'order';
    items: (Item | ManufacturingOrder)[];
}

export default function QrBatchGenerator({ type, items }: QrBatchGeneratorProps) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    
    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? items.map(item => item.id) : []);
    };
    
    const handleSelectItem = (id: number, checked: boolean) => {
        setSelectedIds(prev => 
            checked 
                ? [...prev, id]
                : prev.filter(itemId => itemId !== id)
        );
    };
    
    const handleGenerate = async () => {
        if (selectedIds.length === 0) return;
        
        setIsGenerating(true);
        try {
            const response = await axios.post(route('production.qr-tags.batch'), {
                type,
                ids: selectedIds
            });
            
            if (response.data.queued) {
                // Show notification about queued job
                alert(response.data.message);
            } else {
                setPdfUrl(response.data.pdf_url);
            }
        } catch (error) {
            console.error('Failed to generate batch:', error);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const columns = [
        {
            id: 'select',
            header: () => (
                <Checkbox 
                    checked={selectedIds.length === items.length}
                    onCheckedChange={handleSelectAll}
                />
            ),
            cell: ({ row }) => (
                <Checkbox 
                    checked={selectedIds.includes(row.original.id)}
                    onCheckedChange={(checked) => 
                        handleSelectItem(row.original.id, checked as boolean)
                    }
                />
            )
        },
        {
            id: 'number',
            header: type === 'item' ? 'Número do Item' : 'Número da Ordem',
            accessorKey: type === 'item' ? 'item_number' : 'order_number'
        },
        {
            id: 'name',
            header: 'Nome',
            accessorKey: type === 'item' ? 'name' : 'item.name'
        },
        {
            id: 'status',
            header: 'Status',
            accessorKey: 'status',
            cell: ({ value }) => (
                <Badge variant={value === 'active' ? 'default' : 'secondary'}>
                    {value}
                </Badge>
            )
        }
    ];
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Geração em Lote de Etiquetas QR</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert className="mb-4">
                    <AlertDescription>
                        Selecione os itens para gerar etiquetas QR em um único PDF.
                        Cada página terá o tamanho de 70mm x 140mm.
                    </AlertDescription>
                </Alert>
                
                <EntityDataTable 
                    columns={columns}
                    data={items}
                    pageSize={10}
                />
                
                <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        {selectedIds.length} {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
                    </p>
                    
                    <div className="flex gap-2">
                        {pdfUrl && (
                            <>
                                <Button 
                                    variant="outline"
                                    onClick={() => window.open(pdfUrl, '_blank')}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar PDF
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={() => {
                                        const printWindow = window.open(pdfUrl, '_blank');
                                        printWindow?.print();
                                    }}
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir
                                </Button>
                            </>
                        )}
                        
                        <Button 
                            onClick={handleGenerate}
                            disabled={selectedIds.length === 0 || isGenerating}
                        >
                            {isGenerating ? 'Gerando...' : 'Gerar Etiquetas'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
```

### 4.2 Pages

#### 4.2.1 Mobile Scan Page (Item)

```tsx
// resources/js/pages/production/qr/ItemScan.tsx
import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Item } from '@/types/production';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Package, Factory, FileText } from 'lucide-react';

interface Props {
    item: Item;
    can: {
        view: boolean;
        update: boolean;
        execute_steps: boolean;
    };
    actions: Array<{
        label: string;
        route: string;
        icon: string;
        primary?: boolean;
    }>;
}

export default function ItemScan({ item, can, actions }: Props) {
    return (
        <>
            <Head title={`Item ${item.item_number}`} />
            
            <div className="min-h-screen bg-background p-4 pb-20">
                {/* Header Card */}
                <Card className="mb-4">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">{item.name}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {item.item_number}
                                </p>
                            </div>
                            <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                                {item.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {item.image_url && (
                            <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="w-full max-h-48 object-contain mb-4 rounded-lg bg-muted"
                            />
                        )}
                        
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Categoria:</span>
                                <span>{item.category?.name || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Unidade:</span>
                                <span>{item.unit_of_measure}</span>
                            </div>
                            {item.description && (
                                <div className="pt-2 border-t">
                                    <p className="text-muted-foreground mb-1">Descrição:</p>
                                    <p>{item.description}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                
                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ações Disponíveis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {actions.map((action, index) => {
                            const Icon = {
                                Factory,
                                Package,
                                FileText
                            }[action.icon] || FileText;
                            
                            return (
                                <Button
                                    key={index}
                                    variant={action.primary ? 'default' : 'outline'}
                                    className="w-full justify-between"
                                    asChild
                                >
                                    <Link href={action.route}>
                                        <div className="flex items-center">
                                            <Icon className="w-4 h-4 mr-2" />
                                            {action.label}
                                        </div>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </Button>
                            );
                        })}
                        
                        {can.view && (
                            <Button
                                variant="ghost"
                                className="w-full"
                                asChild
                            >
                                <Link href={route('production.items.show', item)}>
                                    Ver Detalhes Completos
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
```

#### 4.2.2 Mobile Scan Page (Manufacturing Order)

```tsx
// resources/js/pages/production/qr/OrderScan.tsx
import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ManufacturingOrder, ManufacturingStep } from '@/types/production';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    ArrowRight, 
    Play, 
    CheckCircle, 
    Clock,
    AlertCircle 
} from 'lucide-react';

interface Props {
    order: ManufacturingOrder;
    currentStep: ManufacturingStep | null;
    can: {
        view: boolean;
        execute_steps: boolean;
        update_quality: boolean;
    };
    actions: Array<{
        label: string;
        route: string;
        icon: string;
        primary?: boolean;
    }>;
}

export default function OrderScan({ order, currentStep, can, actions }: Props) {
    const { post } = useForm();
    
    const handleStepAction = () => {
        if (!currentStep) return;
        
        post(route('production.steps.execute', currentStep), {
            preserveScroll: true,
            onSuccess: () => {
                // Handle success
            }
        });
    };
    
    const progress = order.route ? 
        (order.route.steps.filter(s => s.status === 'completed').length / order.route.steps.length) * 100 
        : 0;
    
    return (
        <>
            <Head title={`Ordem ${order.order_number}`} />
            
            <div className="min-h-screen bg-background p-4 pb-20">
                {/* Header Card */}
                <Card className="mb-4">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">
                                    Ordem {order.order_number}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {order.item.name}
                                </p>
                            </div>
                            <Badge variant={
                                order.status === 'completed' ? 'default' :
                                order.status === 'in_progress' ? 'secondary' :
                                'outline'
                            }>
                                {order.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {/* Progress */}
                            {order.route && (
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Progresso</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            )}
                            
                            {/* Key Details */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Quantidade:</span>
                                    <p className="font-medium">{order.quantity}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Entrega:</span>
                                    <p className="font-medium">
                                        {new Date(order.due_date).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Current Step */}
                {currentStep && (
                    <Card className="mb-4 border-primary">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <Clock className="w-5 h-5 mr-2" />
                                Etapa Atual
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <h4 className="font-medium mb-2">{currentStep.name}</h4>
                            {currentStep.description && (
                                <p className="text-sm text-muted-foreground mb-3">
                                    {currentStep.description}
                                </p>
                            )}
                            
                            {currentStep.work_cell && (
                                <div className="flex items-center text-sm mb-3">
                                    <span className="text-muted-foreground mr-2">Célula:</span>
                                    <Badge variant="outline">
                                        {currentStep.work_cell.name}
                                    </Badge>
                                </div>
                            )}
                            
                            {can.execute_steps && (
                                <Button 
                                    className="w-full"
                                    onClick={handleStepAction}
                                >
                                    {currentStep.status === 'pending' ? (
                                        <>
                                            <Play className="w-4 h-4 mr-2" />
                                            Iniciar Etapa
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Completar Etapa
                                        </>
                                    )}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
                
                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Outras Ações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {actions.map((action, index) => (
                            <Button
                                key={index}
                                variant={action.primary ? 'default' : 'outline'}
                                className="w-full justify-between"
                                asChild
                            >
                                <Link href={action.route}>
                                    <span>{action.label}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        ))}
                        
                        {can.view && (
                            <Button
                                variant="ghost"
                                className="w-full"
                                asChild
                            >
                                <Link href={route('production.orders.show', order)}>
                                    Ver Ordem Completa
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
```

### 4.3 PDF Templates

#### 4.3.1 Item Tag Template

```blade
{{-- resources/views/pdf/qr-tags/item-tag.blade.php --}}
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
        
        @if($item->image_url)
            <div class="item-image">
                <img src="{{ $item->image_url }}" alt="{{ $item->name }}">
            </div>
        @endif
        
        <div class="details">
            <div class="item-name">{{ $item->name }}</div>
            @if($item->category)
                <div>{{ $item->category->name }}</div>
            @endif
            <div class="generated-date">
                Gerado em {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </div>
    </div>
</body>
</html>
```

#### 4.3.2 Manufacturing Order Tag Template

```blade
{{-- resources/views/pdf/qr-tags/order-tag.blade.php --}}
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
            @if($item->image_url)
                <div class="item-image">
                    <img src="{{ $item->image_url }}" alt="{{ $item->name }}">
                </div>
            @endif
            
            @if($parentItem && $parentItem->image_url)
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
                <span>{{ Str::limit($item->name, 20) }}</span>
            </div>
            <div class="detail-row">
                <span>Qtd:</span>
                <span>{{ $order->quantity }}</span>
            </div>
            <div class="detail-row">
                <span>Entrega:</span>
                <span>{{ $order->due_date->format('d/m/Y') }}</span>
            </div>
            <div class="generated-date">
                Gerado em {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </div>
    </div>
</body>
</html>
```

## 5. Implementation Guidelines

### 5.1 Security Considerations

1. **Authentication**: All QR URLs must handle authentication properly
2. **Authorization**: Check permissions before displaying actions
3. **Rate Limiting**: Implement rate limiting on scan endpoints
4. **Token Expiry**: Consider adding time-limited tokens to QR codes
5. **HTTPS Only**: Enforce HTTPS for all QR code URLs

### 5.2 Performance Optimizations

1. **Caching**: Cache generated QR codes and PDFs
2. **Queue Large Batches**: Use job queues for batch generation > 10 items
3. **Image Optimization**: Compress images before including in PDFs
4. **Lazy Loading**: Load scan history data on demand
5. **CDN**: Serve PDFs from CDN for better performance

### 5.3 Mobile Optimization

1. **Touch Targets**: Ensure all buttons are at least 44x44 pixels
2. **Offline Support**: Implement service workers for offline scanning
3. **Fast Loading**: Optimize bundle size for mobile networks
4. **Responsive Design**: Test on various device sizes
5. **Camera Permissions**: Handle camera permission requests gracefully

### 5.4 Testing Strategy

1. **Unit Tests**: Test QR generation and URL parsing logic
2. **Integration Tests**: Test the full scan-to-action flow
3. **Browser Tests**: Use Laravel Dusk for E2E testing
4. **Device Testing**: Test on real devices (iOS/Android)
5. **Print Testing**: Verify PDF dimensions and print quality

### 5.5 Monitoring and Analytics

1. **Scan Metrics**: Track scan frequency and success rates
2. **Error Logging**: Log and monitor scan failures
3. **Performance Metrics**: Monitor page load times
4. **User Journey**: Track user actions after scanning
5. **Device Analytics**: Analyze device types and browsers

## 6. Deployment Checklist

- [ ] Configure APP_URL environment variable correctly
- [ ] Set up HTTPS certificates
- [ ] Configure CORS for mobile app access
- [ ] Set up S3 bucket for PDF storage
- [ ] Configure Redis for caching
- [ ] Set up queue workers for batch generation
- [ ] Test QR code generation at production scale
- [ ] Verify mobile responsiveness
- [ ] Configure monitoring and alerting
- [ ] Document API endpoints for mobile app team
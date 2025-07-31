<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Services\Production\QrTagPdfService;
use App\Models\Production\Item;
use App\Models\Production\ManufacturingOrder;
use App\Models\QrTagTemplate;
use App\Jobs\Production\GenerateQrBatchJob;
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
        $this->authorize('production.qr-tags.view');
        
        return Inertia::render('production/qr/TagGenerator', [
            'templates' => QrTagTemplate::where('is_active', true)->get()
        ]);
    }

    public function generateItemTag(Item $item)
    {
        $this->authorize('view', $item);
        $this->authorize('production.qr-tags.generate');
        
        $pdfUrl = $this->pdfService->generateItemTag($item);
        
        return response()->json([
            'success' => true,
            'pdf_url' => $pdfUrl,
            'preview_url' => route('production.qr-tags.preview', ['type' => 'item', 'id' => $item->id])
        ]);
    }

    public function generateOrderTag(ManufacturingOrder $order)
    {
        $this->authorize('view', $order);
        $this->authorize('production.qr-tags.generate');
        
        $pdfUrl = $this->pdfService->generateOrderTag($order);
        
        return response()->json([
            'success' => true,
            'pdf_url' => $pdfUrl,
            'preview_url' => route('production.qr-tags.preview', ['type' => 'order', 'id' => $order->id])
        ]);
    }

    public function generateBatch(Request $request)
    {
        $this->authorize('production.qr-tags.generate');
        
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

    public function preview(Request $request, string $type, int $id)
    {
        $this->authorize('production.qr-tags.view');
        
        $resource = match($type) {
            'item' => Item::findOrFail($id),
            'order' => ManufacturingOrder::findOrFail($id),
            default => abort(404)
        };
        
        $this->authorize('view', $resource);
        
        return Inertia::render('production/qr/TagPreview', [
            'type' => $type,
            'resource' => $resource,
            'template' => QrTagTemplate::where('type', $type)->where('is_default', true)->first()
        ]);
    }
}
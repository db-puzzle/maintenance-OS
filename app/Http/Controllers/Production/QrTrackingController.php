<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\BomItem;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\QrTracking;
use App\Services\Production\QrCodeGenerationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class QrTrackingController extends Controller
{
    protected QrCodeGenerationService $qrService;

    public function __construct(QrCodeGenerationService $qrService)
    {
        $this->qrService = $qrService;
    }

    /**
     * Display the QR tracking dashboard.
     */
    public function dashboard(Request $request): Response
    {
        $this->authorize('viewAny', QrTracking::class);

        // Get summary statistics
        $totalScans = QrTracking::count();
        $todayScans = QrTracking::whereDate('created_at', today())->count();
        $activeItems = BomItem::whereNotNull('qr_code')->count();
        $uniqueOperators = QrTracking::whereNotNull('scanned_by')->distinct('scanned_by')->count();

        // Get recent events
        $recentEvents = QrTracking::query()
            ->with('scannedBy:id,name')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Get event type distribution
        $eventTypeDistribution = QrTracking::query()
            ->selectRaw('event_type, COUNT(*) as count')
            ->groupBy('event_type')
            ->get()
            ->pluck('count', 'event_type');

        // Get daily scan trends for the last 7 days
        $dailyTrends = QrTracking::query()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return Inertia::render('production/qr-tracking/dashboard', [
            'statistics' => [
                'total_scans' => $totalScans,
                'today_scans' => $todayScans,
                'active_items' => $activeItems,
                'unique_operators' => $uniqueOperators,
            ],
            'recent_events' => $recentEvents,
            'event_type_distribution' => $eventTypeDistribution,
            'daily_trends' => $dailyTrends,
            'filters' => $request->only(['date_range']),
        ]);
    }

    /**
     * Display a listing of QR tracking events.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', QrTracking::class);

        $events = QrTracking::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where('qr_code', 'like', "%{$search}%")
                    ->orWhere('event_type', 'like', "%{$search}%")
                    ->orWhereJsonContains('event_data', ['item_number' => $search]);
            })
            ->when($request->filled('event_type'), function ($query) use ($request) {
                $query->where('event_type', $request->input('event_type'));
            })
            ->when($request->filled('scanned_by'), function ($query) use ($request) {
                $query->where('scanned_by', $request->input('scanned_by'));
            })
            ->when($request->filled('date_from'), function ($query) use ($request) {
                $query->whereDate('created_at', '>=', $request->input('date_from'));
            })
            ->when($request->filled('date_to'), function ($query) use ($request) {
                $query->whereDate('created_at', '<=', $request->input('date_to'));
            })
            ->with('scannedBy:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('production/qr-tracking/index', [
            'events' => $events,
            'filters' => $request->only(['search', 'event_type', 'scanned_by', 'date_from', 'date_to', 'per_page']),
            'eventTypes' => [
                'generated' => 'QR Code Generated',
                'printed' => 'Label Printed',
                'scan' => 'Scanned',
                'start_production' => 'Production Started',
                'complete_production' => 'Production Completed',
                'ship' => 'Shipped',
            ],
        ]);
    }

    /**
     * Display QR code generation interface.
     */
    public function generate(): Response
    {
        $this->authorize('generate', QrTracking::class);

        $activeOrders = ManufacturingOrder::query()
            ->whereIn('status', ['released', 'in_progress'])
            ->with(['product', 'billOfMaterial.currentVersion.items'])
            ->get();

        return Inertia::render('production/qr-tracking/generate', [
            'activeOrders' => $activeOrders,
        ]);
    }

    /**
     * Generate QR codes for production order.
     */
    public function generateForOrder(Request $request, ManufacturingOrder $order)
    {
        $this->authorize('generate', QrTracking::class);

        if (!in_array($order->status, ['released', 'in_progress'])) {
            return back()->with('error', 'QR codes can only be generated for released or in-progress orders.');
        }

        $validated = $request->validate([
            'include_non_routed' => 'boolean',
            'regenerate_existing' => 'boolean',
        ]);

        $order->load('billOfMaterial.currentVersion.items.routing');
        $items = $order->billOfMaterial->currentVersion->items;

        $generated = [];
        $errors = [];

        DB::transaction(function () use ($items, $order, $validated, &$generated, &$errors) {
            foreach ($items as $item) {
                // Skip non-routed items if not included
                if (!$validated['include_non_routed'] && !$item->routing) {
                    continue;
                }

                // Skip if QR code already exists and not regenerating
                if ($item->qr_code && !$validated['regenerate_existing']) {
                    continue;
                }

                try {
                    $qrData = $this->qrService->generateForBomItem($item, $order);
                    $generated[] = [
                        'item' => $item->name,
                        'qr_code' => $qrData['qr_code'],
                        'url' => $qrData['url'],
                    ];
                } catch (\Exception $e) {
                    $errors[] = [
                        'item' => $item->name,
                        'error' => $e->getMessage(),
                    ];
                }
            }
        });

        return response()->json([
            'success' => count($errors) === 0,
            'generated' => $generated,
            'errors' => $errors,
            'message' => sprintf('Generated %d QR codes%s', 
                count($generated), 
                count($errors) > 0 ? ' with ' . count($errors) . ' errors' : ''
            ),
        ]);
    }

    /**
     * Generate QR code for single item.
     */
    public function generateForItem(Request $request, BomItem $item)
    {
        $this->authorize('generate', QrTracking::class);

        $validated = $request->validate([
            'production_order_id' => 'required|exists:manufacturing_orders,id',
            'force_regenerate' => 'boolean',
        ]);

        if ($item->qr_code && !$validated['force_regenerate']) {
            return back()->with('error', 'QR code already exists for this item.');
        }

        $order = ManufacturingOrder::find($validated['production_order_id']);

        try {
            $qrData = $this->qrService->generateForBomItem($item, $order);
            
            return response()->json([
                'success' => true,
                'qr_code' => $qrData['qr_code'],
                'url' => $qrData['url'],
                'message' => 'QR code generated successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'QR code generation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display label printing interface.
     */
    public function labels(Request $request): Response
    {
        $this->authorize('print', QrTracking::class);

        $order = null;
        if ($request->filled('order_id')) {
            $order = ManufacturingOrder::with([
                'product',
                'billOfMaterial.currentVersion.items' => function ($query) {
                    $query->whereNotNull('qr_code')
                        ->with(['routing', 'thumbnail']);
                },
            ])->find($request->input('order_id'));
        }

        return Inertia::render('production/qr-tracking/labels', [
            'order' => $order,
            'labelFormats' => [
                'standard' => '2" x 1" Standard',
                'large' => '4" x 2" Large',
                'sheet' => '8.5" x 11" Sheet (30 labels)',
            ],
        ]);
    }

    /**
     * Generate printable labels.
     */
    public function printLabels(Request $request)
    {
        $this->authorize('print', QrTracking::class);

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*' => 'exists:bom_items,id',
            'format' => 'required|in:standard,large,sheet',
            'include_thumbnail' => 'boolean',
            'include_routing' => 'boolean',
        ]);

        $items = BomItem::whereIn('id', $validated['items'])
            ->whereNotNull('qr_code')
            ->with(['bomVersion.billOfMaterial', 'routing', 'thumbnail'])
            ->get();

        if ($items->isEmpty()) {
            return back()->with('error', 'No items with QR codes found.');
        }

        // Log print event
        foreach ($items as $item) {
            QrTracking::create([
                'qr_code' => $item->qr_code,
                'event_type' => 'printed',
                'event_data' => [
                    'format' => $validated['format'],
                    'item_id' => $item->id,
                    'item_number' => $item->item_number,
                ],
                'scanned_by' => auth()->id(),
            ]);
        }

        // Generate PDF based on format
        $pdf = $this->generateLabelsPdf($items, $validated);

        return response()->streamDownload(function () use ($pdf) {
            echo $pdf;
        }, 'qr-labels-' . now()->format('Y-m-d-His') . '.pdf', [
            'Content-Type' => 'application/pdf',
        ]);
    }

    /**
     * Display QR code scanning interface.
     */
    public function scan(): Response
    {
        $this->authorize('scan', QrTracking::class);

        return Inertia::render('production/qr-tracking/scan', [
            'scan_modes' => [
                'production' => 'Production Tracking',
                'inventory' => 'Inventory Movement',
                'quality' => 'Quality Check',
                'shipping' => 'Shipping',
            ],
        ]);
    }

    /**
     * Process a QR code scan.
     */
    public function processScan(Request $request)
    {
        $this->authorize('scan', QrTracking::class);

        $validated = $request->validate([
            'qr_code' => 'required|string',
            'scan_mode' => 'required|in:production,inventory,quality,shipping',
            'notes' => 'nullable|string|max:500',
            'location' => 'nullable|array',
            'location.latitude' => 'nullable|numeric',
            'location.longitude' => 'nullable|numeric',
        ]);

        // Find the BOM item by QR code
        $item = BomItem::where('qr_code', $validated['qr_code'])->first();
        
        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid QR code. Item not found.',
            ], 404);
        }

        // Create tracking record
        $tracking = QrTracking::create([
            'qr_code' => $validated['qr_code'],
            'event_type' => $validated['scan_mode'],
            'event_data' => [
                'item_id' => $item->id,
                'item_number' => $item->item_number,
                'notes' => $validated['notes'] ?? null,
                'location' => $validated['location'] ?? null,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
            'scanned_by' => auth()->id(),
        ]);

        // Load relationships for response
        $item->load(['bomVersion.billOfMaterial', 'routing', 'thumbnail']);

        return response()->json([
            'success' => true,
            'tracking_id' => $tracking->id,
            'item' => $item,
            'message' => 'Scan recorded successfully.',
        ]);
    }

    /**
     * Track QR code scan.
     */
    public function track(Request $request)
    {
        $validated = $request->validate([
            'qr_code' => 'required|string',
            'event_type' => 'required|string|max:50',
            'event_data' => 'nullable|array',
            'location' => 'nullable|array',
            'location.latitude' => 'nullable|numeric',
            'location.longitude' => 'nullable|numeric',
        ]);

        $tracking = QrTracking::create([
            'qr_code' => $validated['qr_code'],
            'event_type' => $validated['event_type'],
            'event_data' => array_merge($validated['event_data'] ?? [], [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'location' => $validated['location'] ?? null,
            ]),
            'scanned_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'tracking_id' => $tracking->id,
        ]);
    }

    /**
     * Get QR code details.
     */
    public function details($qrCode)
    {
        // Find the BOM item by QR code
        $item = BomItem::where('qr_code', $qrCode)->first();
        
        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'QR code not found.',
            ], 404);
        }

        $item->load([
            'bomVersion.billOfMaterial',
            'routing.steps.workCell',
            'thumbnail',
        ]);

        // Get tracking history
        $history = QrTracking::where('qr_code', $qrCode)
            ->with('scannedBy:id,name')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Get current production status
        $currentProduction = DB::table('production_schedules')
            ->join('routing_steps', 'production_schedules.routing_step_id', '=', 'routing_steps.id')
            ->join('production_routings', 'routing_steps.production_routing_id', '=', 'production_routings.id')
            ->where('production_routings.bom_item_id', $item->id)
            ->whereIn('production_schedules.status', ['scheduled', 'in_progress'])
            ->select('production_schedules.*')
            ->first();

        return response()->json([
            'success' => true,
            'item' => $item,
            'history' => $history,
            'current_production' => $currentProduction,
        ]);
    }

    /**
     * Get QR code analytics.
     */
    public function analytics(Request $request)
    {
        $this->authorize('viewAny', QrTracking::class);

        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $analytics = [
            'total_scans' => QrTracking::whereBetween('created_at', [$startDate, $endDate])->count(),
            'unique_codes' => QrTracking::whereBetween('created_at', [$startDate, $endDate])
                ->distinct('qr_code')->count(),
            'by_event_type' => QrTracking::whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('event_type')
                ->selectRaw('event_type, COUNT(*) as count')
                ->pluck('count', 'event_type'),
            'by_day' => $this->getAnalyticsByDay($startDate, $endDate),
            'by_operator' => $this->getAnalyticsByOperator($startDate, $endDate),
            'most_scanned' => $this->getMostScannedItems($startDate, $endDate),
        ];

        return response()->json($analytics);
    }

    /**
     * Generate labels PDF.
     */
    protected function generateLabelsPdf($items, $options)
    {
        // This would use a PDF generation service
        // For now, return a placeholder
        return "PDF content would be generated here";
    }

    /**
     * Get analytics by day.
     */
    protected function getAnalyticsByDay($startDate, $endDate)
    {
        return QrTracking::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'count' => $item->count,
                ];
            });
    }

    /**
     * Get analytics by operator.
     */
    protected function getAnalyticsByOperator($startDate, $endDate)
    {
        return QrTracking::whereBetween('created_at', [$startDate, $endDate])
            ->whereNotNull('scanned_by')
            ->groupBy('scanned_by')
            ->selectRaw('scanned_by, COUNT(*) as count')
            ->with('scannedBy:id,name')
            ->get()
            ->map(function ($item) {
                return [
                    'operator' => $item->scannedBy->name ?? 'Unknown',
                    'count' => $item->count,
                ];
            });
    }

    /**
     * Get most scanned items.
     */
    protected function getMostScannedItems($startDate, $endDate)
    {
        return QrTracking::whereBetween('created_at', [$startDate, $endDate])
            ->groupBy('qr_code')
            ->selectRaw('qr_code, COUNT(*) as scan_count')
            ->orderBy('scan_count', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                $bomItem = BomItem::where('qr_code', $item->qr_code)->first();
                return [
                    'qr_code' => $item->qr_code,
                    'scan_count' => $item->scan_count,
                    'item_number' => $bomItem->item_number ?? 'Unknown',
                    'item_name' => $bomItem->name ?? 'Unknown',
                ];
            });
    }
} 
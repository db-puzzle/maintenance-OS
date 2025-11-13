<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\Shipment;
use App\Services\Logistics\PackingListService;
use App\Services\Logistics\QrParsingService;
use App\Services\Logistics\ShipmentService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Controller for managing shipments in the logistics module.
 *
 * Handles CRUD operations, status updates, QR code scanning,
 * and packing list generation for shipments.
 */
class ShipmentController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(
        protected ShipmentService $shipmentService,
        protected PackingListService $packingListService,
        protected QrParsingService $qrParsingService
    ) {}

    /**
     * Display shipments dashboard.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Shipment::class);

        $shipments = Shipment::with([
            'items.manufacturingOrder.item',
            'destination',
        ])
            ->when($request->status, fn ($q, $status) => $q->byStatus($status))
            ->when($request->destination_type, fn ($q, $type) => $q->where('destination_type', $type))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('logistics/shipments/index', [
            'shipments' => $shipments,
            'filters' => $request->only(['status', 'destination_type']),
        ]);
    }

    /**
     * Show shipment creation form.
     */
    public function create(Request $request)
    {
        $this->authorize('create', Shipment::class);

        $suggestions = $this->shipmentService->getSuggestedShipments();

        return Inertia::render('logistics/shipments/create', [
            'suggestions' => $suggestions,
            'manufacturers' => Manufacturer::select('id', 'name', 'address', 'city', 'state')->get(),
        ]);
    }

    /**
     * Store new shipment.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Shipment::class);

        $validated = $request->validate([
            'destination_type' => 'required|in:manufacturer,customer,warehouse,work_cell',
            'destination_id' => 'nullable|integer',
            'destination_name' => 'nullable|string|max:255',
            'destination_address' => 'nullable|string',
            'shipping_method' => 'nullable|in:courier,freight,pickup,internal,other',
            'carrier_name' => 'nullable|string|max:255',
            'planned_ship_date' => 'nullable|date',
            'expected_delivery_date' => 'nullable|date',
            'shipping_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.manufacturing_order_id' => 'required|exists:manufacturing_orders,id',
            'items.*.manufacturing_step_id' => 'nullable|exists:manufacturing_steps,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.package_count' => 'nullable|integer|min:1',
            'items.*.package_type' => 'nullable|in:box,pallet,crate,bag,other',
            'items.*.notes' => 'nullable|string',
        ]);

        $shipment = $this->shipmentService->createShipment(
            $validated,
            $validated['items']
        );

        return redirect()
            ->route('logistics.shipments.show', $shipment)
            ->with('success', 'Shipment created successfully');
    }

    /**
     * Display shipment details.
     */
    public function show(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        $shipment->load([
            'items.manufacturingOrder.item',
            'items.manufacturingStep',
            'destination',
            'createdBy',
            'shipper',
            'receiver',
            'media',
        ]);

        return Inertia::render('logistics/shipments/show', [
            'shipment' => $shipment,
        ]);
    }

    /**
     * Mark shipment as shipped.
     */
    public function markAsShipped(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'tracking_number' => 'nullable|string|max:255',
            'carrier_name' => 'nullable|string|max:255',
            'photo_notes' => 'nullable|string',
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:10240',
        ]);

        $shipment = $this->shipmentService->markAsShipped(
            $shipment,
            $validated,
            $request->file('photos') ?? []
        );

        return back()->with('success', 'Shipment marked as shipped');
    }

    /**
     * Mark shipment as received.
     */
    public function markAsReceived(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'receiving_notes' => 'nullable|string',
            'items' => 'required|array',
            'items.*.item_id' => 'required|exists:shipment_items,id',
            'items.*.quantity_received' => 'required|numeric|min:0',
            'items.*.quantity_rejected' => 'nullable|numeric|min:0',
            'items.*.rejection_reason' => 'nullable|string',
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:10240',
        ]);

        $shipment = $this->shipmentService->markAsReceived(
            $shipment,
            $validated['items'],
            $validated['receiving_notes'] ?? null,
            $request->file('photos') ?? []
        );

        return back()->with('success', 'Shipment marked as received');
    }

    /**
     * Generate packing list.
     */
    public function generatePackingList(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        $path = $this->packingListService->generatePackingList($shipment);

        return response()->download(storage_path("app/public/{$path}"));
    }

    /**
     * Find MO from QR scan for shipment creation.
     *
     * This endpoint is called when scanning QR codes during shipment creation
     * to add manufacturing orders to the shipment.
     */
    public function findMoFromQr(Request $request, string $moNumber)
    {
        $this->authorize('create', Shipment::class);

        $mo = ManufacturingOrder::where('order_number', $moNumber)
            ->with([
                'item',
                'manufacturingRoute.steps' => function ($query) {
                    $query->where('execution_location', 'external')
                        ->where('external_status', 'awaiting_shipment');
                },
            ])
            ->first();

        if (! $mo) {
            return response()->json(['error' => 'Manufacturing Order not found'], 404);
        }

        // Check if MO has external steps awaiting shipment
        $externalSteps = $mo->manufacturingRoute?->steps ?? collect();

        return response()->json([
            'mo' => $mo,
            'has_external_steps_awaiting_shipment' => $externalSteps->isNotEmpty(),
            'external_steps' => $externalSteps,
        ]);
    }
}

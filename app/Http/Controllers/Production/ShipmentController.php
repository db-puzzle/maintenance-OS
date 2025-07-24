<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ProductionOrder;
use App\Models\Production\Shipment;
use App\Models\Production\ShipmentItem;
use App\Models\Production\ShipmentPhoto;
use App\Services\Production\ShipmentManifestService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ShipmentController extends Controller
{
    protected ShipmentManifestService $manifestService;

    public function __construct(ShipmentManifestService $manifestService)
    {
        $this->manifestService = $manifestService;
    }

    /**
     * Display a listing of shipments.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Shipment::class);

        $shipments = Shipment::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('shipment_number', 'like', "%{$search}%")
                      ->orWhere('destination', 'like', "%{$search}%")
                      ->orWhere('customer_name', 'like', "%{$search}%")
                      ->orWhere('tracking_number', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->input('status'));
            })
            ->when($request->filled('shipment_type'), function ($query) use ($request) {
                $query->where('shipment_type', $request->input('shipment_type'));
            })
            ->when($request->filled('date_from'), function ($query) use ($request) {
                $query->whereDate('scheduled_date', '>=', $request->input('date_from'));
            })
            ->when($request->filled('date_to'), function ($query) use ($request) {
                $query->whereDate('scheduled_date', '<=', $request->input('date_to'));
            })
            ->with(['createdBy'])
            ->withCount(['items', 'photos'])
            ->orderBy('scheduled_date', 'desc')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('production/shipments/index', [
            'shipments' => $shipments,
            'filters' => $request->only(['search', 'status', 'shipment_type', 'date_from', 'date_to', 'per_page']),
            'statuses' => [
                'draft' => 'Draft',
                'ready' => 'Ready to Ship',
                'in_transit' => 'In Transit',
                'delivered' => 'Delivered',
                'cancelled' => 'Cancelled',
            ],
            'shipmentTypes' => [
                'customer' => 'Customer Shipment',
                'internal' => 'Internal Transfer',
                'vendor' => 'Vendor Return',
                'other' => 'Other',
            ],
            'can' => [
                'create' => $request->user()->can('create', Shipment::class),
            ],
        ]);
    }

    /**
     * Show the form for creating a new shipment.
     */
    public function create(): Response
    {
        $this->authorize('create', Shipment::class);

        // Get completed production orders with items ready to ship
        $availableOrders = ProductionOrder::query()
            ->where('status', 'completed')
            ->whereDoesntHave('shipmentItems', function ($query) {
                $query->whereHas('shipment', function ($q) {
                    $q->whereNotIn('status', ['cancelled']);
                });
            })
            ->with(['product', 'billOfMaterial'])
            ->get();

        return Inertia::render('production/shipments/create', [
            'availableOrders' => $availableOrders,
        ]);
    }

    /**
     * Store a newly created shipment.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Shipment::class);

        $validated = $request->validate([
            'shipment_type' => 'required|in:customer,internal,vendor,other',
            'scheduled_date' => 'required|date|after_or_equal:today',
            'destination' => 'required|string|max:500',
            'customer_name' => 'nullable|required_if:shipment_type,customer|string|max:255',
            'customer_contact' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'carrier' => 'nullable|string|max:100',
            'special_instructions' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.production_order_id' => 'required|exists:production_orders,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.package_type' => 'required|string|max:50',
            'items.*.package_count' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string',
        ]);

        $shipment = DB::transaction(function () use ($validated) {
            // Create shipment
            $shipmentData = $validated;
            unset($shipmentData['items']);
            $shipmentData['shipment_number'] = Shipment::generateShipmentNumber();
            $shipmentData['status'] = 'draft';
            $shipmentData['created_by'] = auth()->id();

            $shipment = Shipment::create($shipmentData);

            // Create shipment items
            foreach ($validated['items'] as $itemData) {
                $order = ProductionOrder::find($itemData['production_order_id']);
                
                ShipmentItem::create([
                    'shipment_id' => $shipment->id,
                    'production_order_id' => $itemData['production_order_id'],
                    'product_id' => $order->product_id,
                    'quantity' => $itemData['quantity'],
                    'package_type' => $itemData['package_type'],
                    'package_count' => $itemData['package_count'],
                    'weight' => $itemData['weight'] ?? null,
                    'dimensions' => $itemData['dimensions'] ?? null,
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }

            return $shipment;
        });

        return redirect()->route('production.shipments.show', $shipment)
            ->with('success', 'Shipment created successfully.');
    }

    /**
     * Display the specified shipment.
     */
    public function show(Shipment $shipment): Response
    {
        $this->authorize('view', $shipment);

        $shipment->load([
            'items' => function ($query) {
                $query->with(['productionOrder.billOfMaterial', 'product']);
            },
            'photos',
            'createdBy',
        ]);

        return Inertia::render('production/shipments/show', [
            'shipment' => $shipment,
            'can' => [
                'update' => auth()->user()->can('update', $shipment),
                'delete' => auth()->user()->can('delete', $shipment),
                'ready' => auth()->user()->can('markReady', $shipment),
                'ship' => auth()->user()->can('ship', $shipment),
                'deliver' => auth()->user()->can('deliver', $shipment),
                'upload_photos' => auth()->user()->can('uploadPhotos', $shipment),
            ],
        ]);
    }

    /**
     * Show the form for editing the shipment.
     */
    public function edit(Shipment $shipment): Response
    {
        $this->authorize('update', $shipment);

        if (!in_array($shipment->status, ['draft', 'ready'])) {
            return redirect()->route('production.shipments.show', $shipment)
                ->with('error', 'Cannot edit shipment in current status.');
        }

        $shipment->load('items.productionOrder.product');

        return Inertia::render('production/shipments/edit', [
            'shipment' => $shipment,
        ]);
    }

    /**
     * Update the specified shipment.
     */
    public function update(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        if (!in_array($shipment->status, ['draft', 'ready'])) {
            return back()->with('error', 'Cannot update shipment in current status.');
        }

        $validated = $request->validate([
            'scheduled_date' => 'required|date|after_or_equal:today',
            'destination' => 'required|string|max:500',
            'customer_name' => 'nullable|required_if:shipment_type,customer|string|max:255',
            'customer_contact' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'carrier' => 'nullable|string|max:100',
            'special_instructions' => 'nullable|string',
        ]);

        $shipment->update($validated);

        return redirect()->route('production.shipments.show', $shipment)
            ->with('success', 'Shipment updated successfully.');
    }

    /**
     * Remove the specified shipment.
     */
    public function destroy(Shipment $shipment)
    {
        $this->authorize('delete', $shipment);

        if (!in_array($shipment->status, ['draft', 'cancelled'])) {
            return back()->with('error', 'Cannot delete shipment in current status.');
        }

        // Delete associated photos from storage
        foreach ($shipment->photos as $photo) {
            Storage::delete($photo->file_path);
        }

        $shipment->delete();

        return redirect()->route('production.shipments.index')
            ->with('success', 'Shipment deleted successfully.');
    }

    /**
     * Mark shipment as ready.
     */
    public function markReady(Shipment $shipment)
    {
        $this->authorize('markReady', $shipment);

        try {
            $shipment->markAsReady();
            return back()->with('success', 'Shipment marked as ready.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Ship the shipment.
     */
    public function ship(Request $request, Shipment $shipment)
    {
        $this->authorize('ship', $shipment);

        $validated = $request->validate([
            'tracking_number' => 'nullable|string|max:100',
            'actual_carrier' => 'nullable|string|max:100',
            'shipping_notes' => 'nullable|string',
        ]);

        try {
            $shipment->ship();
            $shipment->update([
                'tracking_number' => $validated['tracking_number'],
                'carrier' => $validated['actual_carrier'] ?? $shipment->carrier,
                'shipping_notes' => $validated['shipping_notes'],
            ]);

            return back()->with('success', 'Shipment shipped successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Mark shipment as delivered.
     */
    public function deliver(Request $request, Shipment $shipment)
    {
        $this->authorize('deliver', $shipment);

        $validated = $request->validate([
            'delivery_notes' => 'nullable|string',
            'recipient_name' => 'nullable|string|max:255',
            'recipient_signature' => 'nullable|string', // Base64 encoded signature
        ]);

        try {
            $shipment->markAsDelivered();
            $shipment->update([
                'delivery_notes' => $validated['delivery_notes'],
                'recipient_name' => $validated['recipient_name'],
            ]);

            // Store signature if provided
            if ($validated['recipient_signature']) {
                $this->storeSignature($shipment, $validated['recipient_signature']);
            }

            return back()->with('success', 'Shipment marked as delivered.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Cancel the shipment.
     */
    public function cancel(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'cancellation_reason' => 'required|string|max:500',
        ]);

        try {
            $shipment->cancel();
            $shipment->update(['cancellation_reason' => $validated['cancellation_reason']]);
            
            return back()->with('success', 'Shipment cancelled successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Upload photos for shipment.
     */
    public function uploadPhotos(Request $request, Shipment $shipment)
    {
        $this->authorize('uploadPhotos', $shipment);

        $validated = $request->validate([
            'photos' => 'required|array|min:1|max:10',
            'photos.*' => 'required|image|max:10240', // 10MB max
            'photo_type' => 'required|in:package,loading,documentation,delivery',
            'description' => 'nullable|string|max:500',
        ]);

        $uploadedPhotos = [];

        DB::transaction(function () use ($request, $shipment, $validated, &$uploadedPhotos) {
            foreach ($request->file('photos') as $photo) {
                $path = $photo->store('shipment-photos/' . $shipment->id, 'private');
                
                // Extract GPS data if available
                $gpsData = $this->extractGpsData($photo);
                
                $uploadedPhoto = ShipmentPhoto::create([
                    'shipment_id' => $shipment->id,
                    'file_path' => $path,
                    'file_name' => $photo->getClientOriginalName(),
                    'file_size' => $photo->getSize(),
                    'mime_type' => $photo->getMimeType(),
                    'photo_type' => $validated['photo_type'],
                    'description' => $validated['description'],
                    'gps_coordinates' => $gpsData,
                    'uploaded_by' => auth()->id(),
                ]);
                
                $uploadedPhotos[] = $uploadedPhoto;
            }
        });

        return response()->json([
            'success' => true,
            'message' => count($uploadedPhotos) . ' photos uploaded successfully.',
            'photos' => $uploadedPhotos,
        ]);
    }

    /**
     * Delete a shipment photo.
     */
    public function deletePhoto(Shipment $shipment, ShipmentPhoto $photo)
    {
        $this->authorize('uploadPhotos', $shipment);

        if ($photo->shipment_id !== $shipment->id) {
            abort(404);
        }

        Storage::delete($photo->file_path);
        $photo->delete();

        return back()->with('success', 'Photo deleted successfully.');
    }

    /**
     * Generate shipment manifest.
     */
    public function manifest(Shipment $shipment, Request $request)
    {
        $this->authorize('view', $shipment);

        $format = $request->input('format', 'pdf');
        $template = $request->input('template', 'default');

        try {
            $manifest = $this->manifestService->generate($shipment, [
                'format' => $format,
                'template' => $template,
                'include_photos' => $request->boolean('include_photos'),
                'include_qr_codes' => $request->boolean('include_qr_codes'),
            ]);

            if ($format === 'pdf') {
                return response()->streamDownload(function () use ($manifest) {
                    echo $manifest;
                }, 'manifest-' . $shipment->shipment_number . '.pdf', [
                    'Content-Type' => 'application/pdf',
                ]);
            } else {
                return response()->json($manifest);
            }
        } catch (\Exception $e) {
            return back()->with('error', 'Manifest generation failed: ' . $e->getMessage());
        }
    }

    /**
     * Get shipment tracking info.
     */
    public function tracking(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        // In a real implementation, this would integrate with carrier APIs
        $tracking = [
            'shipment_number' => $shipment->shipment_number,
            'tracking_number' => $shipment->tracking_number,
            'carrier' => $shipment->carrier,
            'status' => $shipment->status,
            'events' => [
                [
                    'date' => $shipment->created_at,
                    'status' => 'Created',
                    'location' => 'Warehouse',
                ],
            ],
        ];

        if ($shipment->ready_at) {
            $tracking['events'][] = [
                'date' => $shipment->ready_at,
                'status' => 'Ready to Ship',
                'location' => 'Warehouse',
            ];
        }

        if ($shipment->shipped_at) {
            $tracking['events'][] = [
                'date' => $shipment->shipped_at,
                'status' => 'Shipped',
                'location' => 'Warehouse',
            ];
        }

        if ($shipment->delivered_at) {
            $tracking['events'][] = [
                'date' => $shipment->delivered_at,
                'status' => 'Delivered',
                'location' => $shipment->destination,
            ];
        }

        return response()->json($tracking);
    }

    /**
     * Store signature image.
     */
    protected function storeSignature(Shipment $shipment, $signatureData)
    {
        $data = substr($signatureData, strpos($signatureData, ',') + 1);
        $data = base64_decode($data);
        
        $fileName = 'signature-' . $shipment->id . '.png';
        $path = 'shipment-signatures/' . $shipment->id . '/' . $fileName;
        
        Storage::put($path, $data);
        
        ShipmentPhoto::create([
            'shipment_id' => $shipment->id,
            'file_path' => $path,
            'file_name' => $fileName,
            'file_size' => strlen($data),
            'mime_type' => 'image/png',
            'photo_type' => 'delivery',
            'description' => 'Recipient signature',
            'uploaded_by' => auth()->id(),
        ]);
    }

    /**
     * Extract GPS data from photo EXIF.
     */
    protected function extractGpsData($photo)
    {
        try {
            $exif = exif_read_data($photo->getRealPath());
            
            if (isset($exif['GPSLatitude']) && isset($exif['GPSLongitude'])) {
                $lat = $this->getGps($exif['GPSLatitude'], $exif['GPSLatitudeRef']);
                $lon = $this->getGps($exif['GPSLongitude'], $exif['GPSLongitudeRef']);
                
                return [
                    'latitude' => $lat,
                    'longitude' => $lon,
                ];
            }
        } catch (\Exception $e) {
            // Silently fail if EXIF data cannot be read
        }
        
        return null;
    }

    /**
     * Convert GPS coordinates.
     */
    protected function getGps($exifCoord, $hemi)
    {
        $degrees = count($exifCoord) > 0 ? $this->gps2Num($exifCoord[0]) : 0;
        $minutes = count($exifCoord) > 1 ? $this->gps2Num($exifCoord[1]) : 0;
        $seconds = count($exifCoord) > 2 ? $this->gps2Num($exifCoord[2]) : 0;

        $flip = ($hemi == 'W' or $hemi == 'S') ? -1 : 1;

        return $flip * ($degrees + $minutes / 60 + $seconds / 3600);
    }

    /**
     * Convert GPS fraction to number.
     */
    protected function gps2Num($coordPart)
    {
        $parts = explode('/', $coordPart);

        if (count($parts) <= 0) {
            return 0;
        }

        if (count($parts) == 1) {
            return $parts[0];
        }

        return floatval($parts[0]) / floatval($parts[1]);
    }
} 
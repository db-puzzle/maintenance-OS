<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\Production\ManufacturingStep;
use App\Services\Production\ExternalStepService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Controller for managing external manufacturing steps.
 *
 * Handles manual status updates for steps executed
 * by third-party manufacturers.
 */
class ExternalStepController extends Controller
{
    public function __construct(
        protected ExternalStepService $externalStepService
    ) {}

    /**
     * Display a listing of external manufacturing steps.
     *
     * @param Request $request The request
     */
    public function index(Request $request): Response
    {
        // Get filters from request
        $search = $request->input('search');
        $statuses = $request->input('statuses', 'awaiting_shipment,at_manufacturer');
        $manufacturerId = $request->input('manufacturer_id');
        $perPage = $request->input('per_page', 20);

        // Parse statuses
        $statusArray = $statuses === 'none' ? [] : explode(',', $statuses);

        // Build query
        $query = ManufacturingStep::query()
            ->with([
                'manufacturingRoute.manufacturingOrder.item.primaryImage',
                'manufacturingRoute.manufacturingOrder',
                'workCell',
                'manufacturer',
            ])
            ->where('execution_location', 'external');

        // Apply status filters
        if (! empty($statusArray)) {
            $query->where(function ($q) use ($statusArray) {
                foreach ($statusArray as $status) {
                    if ($status === 'awaiting_shipment') {
                        $q->orWhere('external_status', 'awaiting_shipment');
                    } elseif ($status === 'at_manufacturer') {
                        $q->orWhere('external_status', 'at_manufacturer');
                    }
                }
            });
        }

        // Apply manufacturer filter
        if ($manufacturerId) {
            $query->where('manufacturer_id', $manufacturerId);
        }

        // Apply search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('manufacturingRoute.manufacturingOrder', function ($orderQuery) use ($search) {
                        $orderQuery->where('mo_number', 'like', "%{$search}%")
                            ->orWhereHas('item', function ($itemQuery) use ($search) {
                                $itemQuery->where('item_number', 'like', "%{$search}%")
                                    ->orWhere('description', 'like', "%{$search}%");
                            });
                    });
            });
        }

        // Get paginated steps
        $steps = $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        // Get status counts
        $statusCounts = [
            'awaiting_shipment' => ManufacturingStep::where('execution_location', 'external')
                ->where('external_status', 'awaiting_shipment')
                ->count(),
            'at_manufacturer' => ManufacturingStep::where('execution_location', 'external')
                ->where('external_status', 'at_manufacturer')
                ->count(),
            'unassigned_manufacturer' => ManufacturingStep::where('execution_location', 'external')
                ->whereNull('manufacturer_id')
                ->count(),
            'total_awaiting_units' => ManufacturingStep::where('execution_location', 'external')
                ->where('external_status', 'awaiting_shipment')
                ->join('manufacturing_routes', 'manufacturing_steps.manufacturing_route_id', '=', 'manufacturing_routes.id')
                ->join('manufacturing_orders', 'manufacturing_routes.manufacturing_order_id', '=', 'manufacturing_orders.id')
                ->sum('manufacturing_orders.quantity'),
            'total_at_manufacturer_units' => ManufacturingStep::where('execution_location', 'external')
                ->where('external_status', 'at_manufacturer')
                ->join('manufacturing_routes', 'manufacturing_steps.manufacturing_route_id', '=', 'manufacturing_routes.id')
                ->join('manufacturing_orders', 'manufacturing_routes.manufacturing_order_id', '=', 'manufacturing_orders.id')
                ->sum('manufacturing_orders.quantity'),
        ];

        // Get all manufacturers
        $manufacturers = Manufacturer::orderBy('name')->get();

        return Inertia::render('production/external-steps/index', [
            'steps' => $steps,
            'statusCounts' => $statusCounts,
            'manufacturers' => $manufacturers,
            'filters' => [
                'search' => $search,
                'statuses' => $statuses,
                'manufacturer_id' => $manufacturerId,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Mark step as shipped.
     *
     * @param Request $request The request
     * @param ManufacturingStep $step The step
     * @return \Illuminate\Http\RedirectResponse
     */
    public function markAsShipped(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'quantity_shipped' => 'required|numeric|min:0.01',
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:10240',
        ]);

        $this->externalStepService->markAsShipped(
            $step,
            $validated['quantity_shipped'],
            $request->file('photos') ?? []
        );

        return back()->with('success', 'Step marked as shipped');
    }

    /**
     * Mark step as in process at manufacturer.
     *
     * @param Request $request The request
     * @param ManufacturingStep $step The step
     * @return \Illuminate\Http\RedirectResponse
     */
    public function markAsInProcess(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $this->externalStepService->markAsInProcess(
            $step,
            $validated['notes'] ?? null
        );

        return back()->with('success', 'Step marked as in process');
    }

    /**
     * Record quantity received from manufacturer.
     *
     * @param Request $request The request
     * @param ManufacturingStep $step The step
     * @return \Illuminate\Http\RedirectResponse
     */
    public function recordQuantityReceived(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'quantity_received' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:1000',
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:10240',
        ]);

        $this->externalStepService->recordQuantityReceived(
            $step,
            $validated['quantity_received'],
            $validated['notes'] ?? null,
            $request->file('photos') ?? []
        );

        return back()->with('success', 'Quantity received recorded');
    }

    /**
     * Convert internal step to external.
     *
     * @param Request $request The request
     * @param ManufacturingStep $step The step
     * @return \Illuminate\Http\RedirectResponse
     */
    public function convertToExternal(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'manufacturer_id' => 'required|exists:manufacturers,id',
            'expected_lead_time_days' => 'nullable|integer|min:1',
        ]);

        try {
            $this->externalStepService->convertToExternal(
                $step,
                $validated['manufacturer_id'],
                $validated['expected_lead_time_days'] ?? null
            );

            return back()->with('success', 'Step converted to external execution');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Get the status of an external step.
     *
     * @param ManufacturingStep $step The step
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatus(ManufacturingStep $step)
    {
        $this->authorize('view', $step);

        $step->load([
            'manufacturingRoute.manufacturingOrder.item',
            'manufacturer',
            'workCell',
        ]);

        return response()->json([
            'step' => $step,
            'external_status' => $step->external_status,
            'quantity_shipped' => $step->quantity_shipped,
            'quantity_received' => $step->quantity_received,
            'expected_delivery_date' => $step->expected_delivery_date,
        ]);
    }
}

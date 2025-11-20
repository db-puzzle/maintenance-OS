<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\Production\ManufacturingStep;
use App\Services\Production\ExternalStepService;
use App\Services\Production\ExternalStepStatusService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Controller for managing external manufacturing steps.
 *
 * Handles steps that are executed by external manufacturers,
 * including shipping, status tracking, and receipt operations.
 */
class ExternalStepController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(
        protected ExternalStepService $externalStepService,
        protected ExternalStepStatusService $statusService
    ) {}

    /**
     * Display external steps dashboard.
     *
     * Shows steps awaiting shipment and steps currently at manufacturers.
     * Supports pagination, search, and filtering.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingStep::class);

        // Validate filters
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'statuses' => 'nullable|string',
            'manufacturer_id' => 'nullable|exists:manufacturers,id',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:5|max:100',
        ]);

        $search = $validated['search'] ?? null;
        $statusesString = $validated['statuses'] ?? 'awaiting_shipment,at_manufacturer';
        $manufacturerId = $validated['manufacturer_id'] ?? null;
        $perPage = $validated['per_page'] ?? 20;

        // Parse statuses
        $statuses = $statusesString === 'none' ? [] : explode(',', $statusesString);

        // Build base query for external steps
        $query = ManufacturingStep::query()
            ->with([
                'manufacturingRoute.manufacturingOrder.item.media',
                'manufacturer',
                'workCell',
            ])
            ->where('execution_location', 'external')
            ->whereIn('status', ['queued', 'in_progress', 'on_hold', 'awaiting_quality']);

        // Filter by external status
        if (! empty($statuses)) {
            $query->whereIn('external_status', $statuses);
        }

        // Filter by manufacturer
        if ($manufacturerId) {
            $query->where('manufacturer_id', $manufacturerId);
        }

        // Search functionality
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('manufacturingRoute.manufacturingOrder', function ($q) use ($search) {
                        $q->where('order_number', 'like', "%{$search}%");
                    })
                    ->orWhereHas('manufacturingRoute.manufacturingOrder.item', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Order by priority and scheduled start
        $query->orderByRaw("
            CASE external_status
                WHEN 'awaiting_shipment' THEN 1
                WHEN 'at_manufacturer' THEN 2
                ELSE 3
            END
        ")
            ->orderBy('scheduled_start', 'asc')
            ->orderBy('id', 'asc'); // Use id as tiebreaker instead of display_position

        // Paginate results
        $steps = $query->paginate($perPage)->withQueryString();

        // Enhance step data with status info
        $steps->getCollection()->transform(function ($step) {
            return array_merge(
                $step->toArray(),
                $this->statusService->getSimplifiedStatus($step)
            );
        });

        // Get status counts for the filter cards
        $statusCounts = [
            'awaiting_shipment' => ManufacturingStep::where('execution_location', 'external')
                ->where('external_status', 'awaiting_shipment')
                ->whereIn('status', ['queued', 'in_progress', 'on_hold', 'awaiting_quality'])
                ->count(),
            'at_manufacturer' => ManufacturingStep::where('execution_location', 'external')
                ->where('external_status', 'at_manufacturer')
                ->whereIn('status', ['queued', 'in_progress', 'on_hold', 'awaiting_quality'])
                ->count(),
            'unassigned_manufacturer' => ManufacturingStep::where('execution_location', 'external')
                ->whereNull('manufacturer_id')
                ->whereIn('status', ['queued', 'in_progress', 'on_hold', 'awaiting_quality'])
                ->count(),
            'total_awaiting_units' => 0, // Will be computed from the collection
            'total_at_manufacturer_units' => 0, // Will be computed from the collection
        ];

        // Compute totals from the steps (since these are computed attributes)
        $awaitingSteps = ManufacturingStep::where('execution_location', 'external')
            ->where('external_status', 'awaiting_shipment')
            ->whereIn('status', ['queued', 'in_progress', 'on_hold', 'awaiting_quality'])
            ->with('manufacturingRoute.manufacturingOrder')
            ->get();

        $atManufacturerSteps = ManufacturingStep::where('execution_location', 'external')
            ->where('external_status', 'at_manufacturer')
            ->whereIn('status', ['queued', 'in_progress', 'on_hold', 'awaiting_quality'])
            ->get();

        $statusCounts['total_awaiting_units'] = $awaitingSteps->sum('remaining_quantity_to_ship');
        $statusCounts['total_at_manufacturer_units'] = $atManufacturerSteps->sum('total_quantity_shipped');

        // Get all manufacturers for the filter dialog
        $manufacturers = Manufacturer::select('id', 'name', 'email', 'phone')->orderBy('name')->get();

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
     * @return \Illuminate\Http\RedirectResponse
     */
    public function markAsShipped(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            // Mark step as shipped (photos will be attached to shipment in logistics module)
            $step = $this->externalStepService->markAsShipped(
                $step,
                $validated['quantity'],
                $validated['notes'] ?? null,
                [] // Photos now handled by shipment creation
            );

            return back()->with('success', 'Step marked as shipped. Please create a shipment in the Logistics module to track the physical items.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Mark step as in process.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function markAsInProcess(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $step = $this->externalStepService->markAsInProcess(
                $step,
                $validated['notes'] ?? null
            );

            return back()->with('success', 'Step marked as in process');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Record quantity received (typically called from Logistics Module).
     *
     * This endpoint exists for direct receipt recording without formal shipment,
     * but normally the Logistics Module handles this automatically.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function recordQuantityReceived(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:1000',
            'photos' => 'nullable|array|max:5',
            'photos.*' => 'image|max:10240', // 10MB max per photo
        ]);

        try {
            $step = $this->externalStepService->recordQuantityReceived(
                $step,
                $validated['quantity'],
                $validated['notes'] ?? null,
                $request->file('photos') ?? []
            );

            $message = $step->status === 'completed'
                ? 'Step completed - all quantities received'
                : 'Quantity received - awaiting remaining items';

            return back()->with('success', $message);
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Convert step to external.
     *
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
            $step = $this->externalStepService->convertToExternal(
                $step,
                $validated['manufacturer_id'],
                $validated['expected_lead_time_days'] ?? null
            );

            return back()->with('success', 'Step converted to external execution');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Get detailed status for an external step.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatus(ManufacturingStep $step)
    {
        $this->authorize('view', $step);

        if (! $step->isExternal()) {
            return response()->json(['error' => 'Step is not external'], 400);
        }

        try {
            $status = $this->statusService->getExternalStepStatus($step);

            return response()->json($status);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}

<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\Production\ManufacturingStep;
use App\Services\Production\ExternalStepService;
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
        protected ExternalStepService $externalStepService
    ) {}

    /**
     * Display external steps dashboard.
     *
     * Shows steps awaiting shipment and steps currently at manufacturers.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingStep::class);

        $awaitingShipment = $this->externalStepService->getStepsAwaitingShipment();
        $atManufacturers = $this->externalStepService->getStepsAtManufacturers();

        return Inertia::render('production/external-steps/index', [
            'awaitingShipment' => $awaitingShipment,
            'atManufacturers' => $atManufacturers,
            'manufacturers' => Manufacturer::select('id', 'name')->get(),
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
            'photos' => 'nullable|array|max:5',
            'photos.*' => 'image|max:10240', // 10MB max per photo
        ]);

        try {
            $step = $this->externalStepService->markAsShipped(
                $step,
                $validated['quantity'],
                $validated['notes'] ?? null,
                $request->file('photos') ?? []
            );

            return back()->with('success', 'Step marked as shipped successfully');
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
}

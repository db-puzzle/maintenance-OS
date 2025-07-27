<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use App\Services\Production\ProductionSchedulingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductionScheduleController extends Controller
{
    protected ProductionSchedulingService $schedulingService;

    public function __construct(ProductionSchedulingService $schedulingService)
    {
        $this->schedulingService = $schedulingService;
    }

    /**
     * Display a listing of production schedules.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        $schedules = ManufacturingStep::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->whereHas('manufacturingRoute.manufacturingOrder', function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%");
                })
                ->orWhereHas('manufacturingRoute.item', function ($q) use ($search) {
                    $q->where('item_number', 'like', "%{$search}%")
                      ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->input('status'));
            })
            ->when($request->filled('work_cell_id'), function ($query) use ($request) {
                $query->where('work_cell_id', $request->input('work_cell_id'));
            })
            ->when($request->filled('date_from'), function ($query) use ($request) {
                $query->where('actual_start_time', '>=', $request->input('date_from'));
            })
            ->when($request->filled('date_to'), function ($query) use ($request) {
                $query->where('actual_start_time', '<=', $request->input('date_to'));
            })
            ->with([
                'manufacturingRoute.manufacturingOrder.item',
                'manufacturingRoute.item',
                'workCell',
            ])
            ->orderBy($request->input('sort', 'step_number'), $request->input('direction', 'asc'))
            ->paginate($request->input('per_page', 15))
            ->withQueryString();

        return Inertia::render('production/schedule/index', [
            'schedules' => $schedules,
            'filters' => $request->only(['search', 'status', 'work_cell_id', 'date_from', 'date_to', 'per_page', 'sort', 'direction']),
            'workCells' => WorkCell::active()->get(['id', 'name'])->toArray(),
            'statuses' => [
                'pending' => 'Pending',
                'queued' => 'Queued',
                'in_progress' => 'In Progress',
                'on_hold' => 'On Hold',
                'completed' => 'Completed',
                'skipped' => 'Skipped',
            ],
        ]);
    }

    /**
     * Display the calendar view of schedules.
     */
    public function calendar(Request $request): Response
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        $startDate = $request->input('start', now()->startOfMonth());
        $endDate = $request->input('end', now()->endOfMonth());

        $schedules = ManufacturingStep::query()
            ->whereNotNull('actual_start_time')
            ->whereBetween('actual_start_time', [$startDate, $endDate])
            ->when($request->filled('work_cell_id'), function ($query) use ($request) {
                $query->where('work_cell_id', $request->input('work_cell_id'));
            })
            ->with([
                'manufacturingRoute.manufacturingOrder.item',
                'manufacturingRoute.item',
                'workCell',
            ])
            ->get();

        return Inertia::render('production/schedule/calendar', [
            'schedules' => $schedules,
            'workCells' => WorkCell::active()->get(['id', 'name']),
        ]);
    }

    /**
     * Show the form for creating a new schedule.
     */
    public function create(): Response
    {
        $this->authorize('create', ManufacturingOrder::class);

        return Inertia::render('production/schedule/create', [
            'manufacturingOrders' => ManufacturingOrder::query()
                ->whereIn('status', ['draft', 'planned'])
                ->with('item')
                ->get(),
            'workCells' => WorkCell::active()->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created schedule.
     */
    public function store(Request $request)
    {
        $this->authorize('create', ManufacturingOrder::class);

        $validated = $request->validate([
            'manufacturing_order_id' => 'required|exists:manufacturing_orders,id',
            'scheduled_start' => 'required|date|after:now',
            'work_cell_assignments' => 'array',
        ]);

        DB::transaction(function () use ($validated) {
            $order = ManufacturingOrder::findOrFail($validated['manufacturing_order_id']);
            $this->schedulingService->scheduleProduction($order);
        });

        return redirect()->route('production.schedules.index')
            ->with('success', 'Production scheduled successfully.');
    }

    /**
     * Display the specified schedule.
     */
    public function show(ManufacturingStep $schedule): Response
    {
        $this->authorize('view', $schedule->manufacturingRoute->manufacturingOrder);

        $schedule->load([
            'manufacturingRoute.manufacturingOrder.item',
            'manufacturingRoute.item',
            'workCell',
            'executions.executedBy',
        ]);

        return Inertia::render('production/schedule/show', [
            'schedule' => $schedule,
        ]);
    }

    /**
     * Show the form for editing the schedule.
     */
    public function edit(ManufacturingStep $schedule): Response
    {
        $this->authorize('update', $schedule->manufacturingRoute->manufacturingOrder);

        // Cannot update completed or skipped schedules
        if (in_array($schedule->status, ['completed', 'skipped'])) {
            abort(403, 'Cannot edit completed or skipped schedules.');
        }

        $schedule->load([
            'manufacturingRoute.manufacturingOrder',
            'workCell',
        ]);

        return Inertia::render('production/schedule/edit', [
            'schedule' => $schedule,
            'workCells' => WorkCell::active()->get(['id', 'name']),
        ]);
    }

    /**
     * Update the specified schedule.
     */
    public function update(Request $request, ManufacturingStep $schedule)
    {
        $this->authorize('update', $schedule->manufacturingRoute->manufacturingOrder);

        // Cannot update completed or skipped schedules
        if (in_array($schedule->status, ['completed', 'skipped'])) {
            return back()->withErrors(['error' => 'Cannot update completed or skipped schedules.']);
        }

        $validated = $request->validate([
            'work_cell_id' => 'nullable|exists:work_cells,id',
            'setup_time_minutes' => 'required|integer|min:0',
            'cycle_time_minutes' => 'required|integer|min:1',
        ]);

        $schedule->update($validated);

        return back()->with('success', 'Schedule updated successfully.');
    }

    /**
     * Start the production schedule.
     */
    public function start(Request $request, ManufacturingStep $schedule)
    {
        $this->authorize('update', $schedule->manufacturingRoute->manufacturingOrder);

        // Can only start pending or queued items
        if (!in_array($schedule->status, ['pending', 'queued'])) {
            return back()->withErrors(['error' => 'Can only start pending or queued schedules.']);
        }

        DB::transaction(function () use ($schedule) {
            $schedule->update([
                'status' => 'in_progress',
                'actual_start_time' => now(),
            ]);

            // Update manufacturing order status if this is the first step
            $order = $schedule->manufacturingRoute->manufacturingOrder;
            if ($order->status === 'released') {
                $order->update([
                    'status' => 'in_progress',
                    'actual_start_date' => now(),
                ]);
            }
        });

        return back()->with('success', 'Production started successfully.');
    }

    /**
     * Complete the production schedule.
     */
    public function complete(Request $request, ManufacturingStep $schedule)
    {
        $this->authorize('update', $schedule->manufacturingRoute->manufacturingOrder);

        // Can only complete in-progress items
        if ($schedule->status !== 'in_progress') {
            return back()->withErrors(['error' => 'Can only complete in-progress schedules.']);
        }

        $validated = $request->validate([
            'quantity_completed' => 'required|numeric|min:0',
            'quantity_scrapped' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        DB::transaction(function () use ($schedule, $validated) {
            $schedule->update([
                'status' => 'completed',
                'actual_end_time' => now(),
            ]);

            // Update manufacturing order quantities
            $order = $schedule->manufacturingRoute->manufacturingOrder;
            $order->increment('quantity_completed', $validated['quantity_completed']);
            if ($validated['quantity_scrapped'] ?? 0 > 0) {
                $order->increment('quantity_scrapped', $validated['quantity_scrapped']);
            }

            // Check if all steps are completed
            $allStepsCompleted = $order->manufacturingRoute->steps()
                ->whereNotIn('status', ['completed', 'skipped'])
                ->doesntExist();

            if ($allStepsCompleted) {
                $order->update([
                    'status' => 'completed',
                    'actual_end_date' => now(),
                ]);
            }
        });

        return back()->with('success', 'Production completed successfully.');
    }

    /**
     * Put the schedule on hold.
     */
    public function hold(Request $request, ManufacturingStep $schedule)
    {
        $this->authorize('update', $schedule->manufacturingRoute->manufacturingOrder);

        // Can only hold in-progress items
        if ($schedule->status !== 'in_progress') {
            return back()->withErrors(['error' => 'Can only hold in-progress schedules.']);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $schedule->update([
            'status' => 'on_hold',
        ]);

        return back()->with('success', 'Production put on hold.');
    }

    /**
     * Resume the schedule from hold.
     */
    public function resume(ManufacturingStep $schedule)
    {
        $this->authorize('update', $schedule->manufacturingRoute->manufacturingOrder);

        // Can only resume on-hold items
        if ($schedule->status !== 'on_hold') {
            return back()->withErrors(['error' => 'Can only resume on-hold schedules.']);
        }

        $schedule->update([
            'status' => 'in_progress',
        ]);

        return back()->with('success', 'Production resumed.');
    }

    /**
     * Cancel the schedule.
     */
    public function cancel(Request $request, ManufacturingStep $schedule)
    {
        $this->authorize('update', $schedule->manufacturingRoute->manufacturingOrder);

        // Cannot cancel completed schedules
        if ($schedule->status === 'completed') {
            return back()->withErrors(['error' => 'Cannot cancel completed schedules.']);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $schedule->update([
            'status' => 'skipped',
        ]);

        return back()->with('success', 'Schedule cancelled.');
    }

    /**
     * Optimize schedules for a date range.
     */
    public function optimize(Request $request)
    {
        $this->authorize('update', ManufacturingOrder::class);

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'work_cell_ids' => 'nullable|array',
            'work_cell_ids.*' => 'exists:work_cells,id',
        ]);

        $result = $this->schedulingService->optimizeSchedule(
            $validated['start_date'],
            $validated['end_date'],
            $validated['work_cell_ids'] ?? []
        );

        return response()->json([
            'message' => 'Schedule optimized successfully',
            'improvements' => $result,
        ]);
    }

    /**
     * Get workload analysis for work cells.
     */
    public function workload(Request $request)
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'work_cell_ids' => 'nullable|array',
            'work_cell_ids.*' => 'exists:work_cells,id',
        ]);

        $workload = $this->schedulingService->getWorkloadAnalysis(
            $validated['start_date'],
            $validated['end_date'],
            $validated['work_cell_ids'] ?? []
        );

        return Inertia::render('production/schedule/workload', [
            'workload' => $workload,
            'filters' => $validated,
            'workCells' => WorkCell::active()->get(['id', 'name']),
        ]);
    }
} 
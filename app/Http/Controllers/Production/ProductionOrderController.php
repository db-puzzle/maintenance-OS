<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\Item;
use App\Models\Production\ProductionOrder;
use App\Services\Production\ProductionSchedulingService;
use App\Services\Production\QrCodeGenerationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductionOrderController extends Controller
{
    protected ProductionSchedulingService $schedulingService;
    protected QrCodeGenerationService $qrService;

    public function __construct(
        ProductionSchedulingService $schedulingService,
        QrCodeGenerationService $qrService
    ) {
        $this->schedulingService = $schedulingService;
        $this->qrService = $qrService;
    }

    /**
     * Display a listing of production orders.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ProductionOrder::class);

        $orders = ProductionOrder::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%")
                      ->orWhereHas('item', function ($query) use ($search) {
                          $query->where('item_number', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                      })
                      ->orWhereHas('billOfMaterial', function ($query) use ($search) {
                          $query->where('bom_number', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%");
                      });
                });
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->input('status'));
            })
            ->when($request->filled('priority'), function ($query) use ($request) {
                $query->where('priority', $request->input('priority'));
            })
            ->when($request->filled('date_from'), function ($query) use ($request) {
                $query->whereDate('required_date', '>=', $request->input('date_from'));
            })
            ->when($request->filled('date_to'), function ($query) use ($request) {
                $query->whereDate('required_date', '<=', $request->input('date_to'));
            })
            ->with(['item', 'billOfMaterial', 'createdBy'])
            ->withCount(['productionSchedules', 'shipmentItems'])
            ->orderBy('priority', 'desc')
            ->orderBy('required_date')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('production/orders/index', [
            'orders' => $orders,
            'filters' => $request->only(['search', 'status', 'priority', 'date_from', 'date_to', 'per_page']),
            'statuses' => ProductionOrder::STATUSES,
            'priorities' => ProductionOrder::PRIORITIES,
            'can' => [
                'create' => $request->user()->can('create', ProductionOrder::class),
            ],
        ]);
    }

    /**
     * Show the form for creating a new production order.
     */
    public function create(): Response
    {
        $this->authorize('create', ProductionOrder::class);

        return Inertia::render('production/orders/create', [
            'items' => Item::with('currentBom')->manufacturable()->get(),
        ]);
    }

    /**
     * Store a newly created production order.
     */
    public function store(Request $request)
    {
        $this->authorize('create', ProductionOrder::class);

        $validated = $request->validate([
            'item_id' => 'required|exists:items,id',
            'bill_of_material_id' => 'required|exists:bill_of_materials,id',
            'quantity' => 'required|integer|min:1',
            'required_date' => 'required|date|after:today',
            'priority' => 'required|in:low,normal,high,urgent',
            'notes' => 'nullable|string',
            'customer_reference' => 'nullable|string|max:100',
        ]);

        // Verify BOM belongs to item
        $item = Item::find($validated['item_id']);
        if ($item->current_bom_id !== $validated['bill_of_material_id']) {
            return back()->withErrors(['bill_of_material_id' => 'Selected BOM is not the current BOM for this item.']);
        }

        DB::transaction(function () use ($validated) {
            // Generate order number
            $validated['order_number'] = ProductionOrder::generateOrderNumber();
            $validated['status'] = 'draft';
            $validated['created_by'] = auth()->id();

            $order = ProductionOrder::create($validated);

            // Generate initial schedules if requested
            if (request()->boolean('auto_schedule')) {
                $this->schedulingService->generateSchedule($order);
            }
        });

        return redirect()->route('production.orders.index')
            ->with('success', 'Production order created successfully.');
    }

    /**
     * Display the specified production order.
     */
    public function show(ProductionOrder $order): Response
    {
        $this->authorize('view', $order);

        $order->load([
            'item',
            'billOfMaterial.currentVersion.items' => function ($query) {
                $query->with(['routing', 'thumbnail'])
                    ->orderBy('level')
                    ->orderBy('sequence_number');
            },
            'productionSchedules' => function ($query) {
                $query->with(['routingStep.workCell', 'productionExecutions'])
                    ->orderBy('scheduled_start_date');
            },
            'shipmentItems.shipment',
            'createdBy',
        ]);

        // Calculate production progress
        $progress = $this->calculateProductionProgress($order);

        return Inertia::render('production/orders/show', [
            'order' => $order,
            'progress' => $progress,
            'can' => [
                'update' => auth()->user()->can('update', $order),
                'delete' => auth()->user()->can('delete', $order),
                'release' => auth()->user()->can('release', $order),
                'schedule' => auth()->user()->can('schedule', $order),
                'cancel' => auth()->user()->can('cancel', $order),
            ],
        ]);
    }

    /**
     * Show the form for editing the production order.
     */
    public function edit(ProductionOrder $order): Response
    {
        $this->authorize('update', $order);

        if (!in_array($order->status, ['draft', 'scheduled'])) {
            return redirect()->route('production.orders.show', $order)
                ->with('error', 'Cannot edit production order in current status.');
        }

        return Inertia::render('production/orders/edit', [
            'order' => $order->load(['product', 'billOfMaterial']),
            'products' => Product::with('currentBom')->active()->get(),
        ]);
    }

    /**
     * Update the specified production order.
     */
    public function update(Request $request, ProductionOrder $order)
    {
        $this->authorize('update', $order);

        if (!in_array($order->status, ['draft', 'scheduled'])) {
            return back()->with('error', 'Cannot update production order in current status.');
        }

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'required_date' => 'required|date|after:today',
            'priority' => 'required|in:low,normal,high,urgent',
            'notes' => 'nullable|string',
            'customer_reference' => 'nullable|string|max:100',
        ]);

        $order->update($validated);

        // Reschedule if requested and order is scheduled
        if ($request->boolean('reschedule') && $order->status === 'scheduled') {
            $this->schedulingService->reschedule($order);
        }

        return redirect()->route('production.orders.show', $order)
            ->with('success', 'Production order updated successfully.');
    }

    /**
     * Remove the specified production order.
     */
    public function destroy(ProductionOrder $order)
    {
        $this->authorize('delete', $order);

        if (!in_array($order->status, ['draft', 'cancelled'])) {
            return back()->with('error', 'Cannot delete production order in current status.');
        }

        if ($order->shipmentItems()->exists()) {
            return back()->with('error', 'Cannot delete production order with shipment items.');
        }

        $order->delete();

        return redirect()->route('production.orders.index')
            ->with('success', 'Production order deleted successfully.');
    }

    /**
     * Schedule the production order.
     */
    public function schedule(Request $request, ProductionOrder $order)
    {
        $this->authorize('schedule', $order);

        if ($order->status !== 'draft') {
            return back()->with('error', 'Only draft orders can be scheduled.');
        }

        $validated = $request->validate([
            'scheduling_method' => 'required|in:forward,backward',
            'start_date' => 'required_if:scheduling_method,forward|date',
            'preferred_work_cells' => 'nullable|array',
            'preferred_work_cells.*' => 'exists:work_cells,id',
        ]);

        try {
            DB::transaction(function () use ($order, $validated) {
                $this->schedulingService->generateSchedule($order, $validated);
                $order->update(['status' => 'scheduled']);
            });

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Production order scheduled successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Scheduling failed: ' . $e->getMessage());
        }
    }

    /**
     * Release the production order for production.
     */
    public function release(ProductionOrder $order)
    {
        $this->authorize('release', $order);

        if ($order->status !== 'scheduled') {
            return back()->with('error', 'Only scheduled orders can be released.');
        }

        try {
            DB::transaction(function () use ($order) {
                $order->release();
                
                // Generate QR codes for all BOM items
                $bomItems = $order->billOfMaterial->currentVersion->items;
                foreach ($bomItems as $item) {
                    $this->qrService->generateForBomItem($item, $order);
                }
            });

            return back()->with('success', 'Production order released successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Release failed: ' . $e->getMessage());
        }
    }

    /**
     * Cancel the production order.
     */
    public function cancel(Request $request, ProductionOrder $order)
    {
        $this->authorize('cancel', $order);

        if (in_array($order->status, ['completed', 'cancelled'])) {
            return back()->with('error', 'Cannot cancel order in current status.');
        }

        $validated = $request->validate([
            'cancellation_reason' => 'required|string|max:500',
        ]);

        $order->cancel($validated['cancellation_reason']);

        return back()->with('success', 'Production order cancelled successfully.');
    }

    /**
     * Get production order timeline.
     */
    public function timeline(ProductionOrder $order)
    {
        $this->authorize('view', $order);

        $schedules = $order->productionSchedules()
            ->with(['routingStep.productionRouting.bomItem', 'workCell', 'productionExecutions'])
            ->orderBy('scheduled_start_date')
            ->get();

        $timeline = $schedules->map(function ($schedule) {
            return [
                'id' => $schedule->id,
                'item' => $schedule->routingStep->productionRouting->bomItem->name,
                'step' => $schedule->routingStep->name,
                'work_cell' => $schedule->workCell->name,
                'start' => $schedule->scheduled_start_date->toIso8601String(),
                'end' => $schedule->scheduled_end_date->toIso8601String(),
                'status' => $schedule->status,
                'progress' => $schedule->getProgressPercentage(),
            ];
        });

        return response()->json([
            'order' => $order,
            'timeline' => $timeline,
            'critical_path' => $this->schedulingService->getCriticalPath($order),
        ]);
    }

    /**
     * Reschedule the production order.
     */
    public function reschedule(Request $request, ProductionOrder $order)
    {
        $this->authorize('schedule', $order);

        if (!in_array($order->status, ['scheduled', 'released'])) {
            return back()->with('error', 'Cannot reschedule order in current status.');
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
            'scheduling_method' => 'required|in:forward,backward',
            'start_date' => 'required_if:scheduling_method,forward|date',
        ]);

        try {
            DB::transaction(function () use ($order, $validated) {
                // Cancel incomplete executions
                $order->productionSchedules()
                    ->where('status', 'in_progress')
                    ->each(function ($schedule) {
                        $schedule->productionExecutions()
                            ->whereNull('completed_at')
                            ->update(['cancelled_at' => now()]);
                    });

                // Regenerate schedule
                $this->schedulingService->reschedule($order, $validated);
            });

            return back()->with('success', 'Production order rescheduled successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Rescheduling failed: ' . $e->getMessage());
        }
    }

    /**
     * Export production order details.
     */
    public function export(ProductionOrder $order, Request $request)
    {
        $this->authorize('view', $order);

        $format = $request->input('format', 'pdf');

        switch ($format) {
            case 'pdf':
                return $this->exportPdf($order);
            case 'excel':
                return $this->exportExcel($order);
            default:
                return back()->with('error', 'Invalid export format.');
        }
    }

    /**
     * Calculate production progress.
     */
    protected function calculateProductionProgress(ProductionOrder $order): array
    {
        $totalSchedules = $order->productionSchedules()->count();
        $completedSchedules = $order->productionSchedules()
            ->where('status', 'completed')
            ->count();
        $inProgressSchedules = $order->productionSchedules()
            ->where('status', 'in_progress')
            ->count();

        $overallProgress = $totalSchedules > 0 
            ? ($completedSchedules / $totalSchedules) * 100 
            : 0;

        return [
            'overall' => round($overallProgress, 2),
            'total_steps' => $totalSchedules,
            'completed_steps' => $completedSchedules,
            'in_progress_steps' => $inProgressSchedules,
            'by_item' => $this->calculateProgressByItem($order),
        ];
    }

    /**
     * Calculate progress by BOM item.
     */
    protected function calculateProgressByItem(ProductionOrder $order): array
    {
        return $order->productionSchedules()
            ->with('routingStep.productionRouting.bomItem')
            ->get()
            ->groupBy('routing_step.production_routing.bom_item_id')
            ->map(function ($schedules, $itemId) {
                $total = $schedules->count();
                $completed = $schedules->where('status', 'completed')->count();
                
                return [
                    'item' => $schedules->first()->routingStep->productionRouting->bomItem->name,
                    'total' => $total,
                    'completed' => $completed,
                    'progress' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
                ];
            })
            ->values()
            ->toArray();
    }

    /**
     * Export production order as PDF.
     */
    protected function exportPdf(ProductionOrder $order)
    {
        // Implementation would use a PDF service
        // For now, just return a placeholder response
        return response()->json([
            'message' => 'PDF export not yet implemented',
        ]);
    }

    /**
     * Export production order as Excel.
     */
    protected function exportExcel(ProductionOrder $order)
    {
        // Implementation would use an Excel export service
        // For now, just return a placeholder response
        return response()->json([
            'message' => 'Excel export not yet implemented',
        ]);
    }
} 
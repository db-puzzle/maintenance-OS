<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ProductionExecution;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\QrTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductionExecutionController extends Controller
{
    /**
     * Display a listing of production executions.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ProductionExecution::class);

        $executions = ProductionExecution::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->whereHas('productionSchedule.manufacturingOrder', function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%");
                })
                ->orWhereHas('productionSchedule.routingStep.productionRouting.bomItem', function ($q) use ($search) {
                    $q->where('item_number', 'like', "%{$search}%")
                      ->orWhere('name', 'like', "%{$search}%");
                })
                ->orWhereHas('operator', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                $status = $request->input('status');
                if ($status === 'in_progress') {
                    $query->whereNull('completed_at')->whereNull('cancelled_at');
                } elseif ($status === 'completed') {
                    $query->whereNotNull('completed_at');
                } elseif ($status === 'cancelled') {
                    $query->whereNotNull('cancelled_at');
                }
            })
            ->when($request->filled('operator_id'), function ($query) use ($request) {
                $query->where('operator_id', $request->input('operator_id'));
            })
            ->when($request->filled('date_from'), function ($query) use ($request) {
                $query->whereDate('started_at', '>=', $request->input('date_from'));
            })
            ->when($request->filled('date_to'), function ($query) use ($request) {
                $query->whereDate('started_at', '<=', $request->input('date_to'));
            })
            ->with([
                'productionSchedule' => function ($query) {
                    $query->with([
                        'manufacturingOrder.product',
                        'routingStep.productionRouting.bomItem',
                        'workCell',
                    ]);
                },
                'operator',
            ])
            ->orderBy('started_at', 'desc')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        // Method temporarily disabled - page not implemented yet
        return response()->json(["message" => "This feature is not yet implemented"], 501);
    }

    /**
     * Display the mobile scanning interface.
     */
    public function scan(): Response
    {
        $this->authorize('scan', ProductionExecution::class);

        // Get active executions for current user
        $activeExecutions = ProductionExecution::query()
            ->where('operator_id', auth()->id())
            ->whereNull('completed_at')
            ->whereNull('cancelled_at')
            ->with([
                'productionSchedule' => function ($query) {
                    $query->with([
                        'manufacturingOrder.product',
                        'routingStep.productionRouting.bomItem',
                        'workCell',
                    ]);
                },
            ])
            ->get();

        // Method temporarily disabled - page not implemented yet
        return response()->json(["message" => "This feature is not yet implemented"], 501);
    }

    /**
     * Process QR code scan.
     */
    public function processScan(Request $request)
    {
        $this->authorize('scan', ProductionExecution::class);

        $validated = $request->validate([
            'qr_code' => 'required|string',
            'action' => 'required|in:query,start,complete',
            'execution_id' => 'required_if:action,complete|exists:production_executions,id',
            'notes' => 'nullable|string|max:500',
        ]);

        // Decode QR code to get item information
        $qrData = $this->decodeQrCode($validated['qr_code']);
        if (!$qrData) {
            return back()->with('error', 'Invalid QR code.');
        }

        // Log the scan event
        QrTracking::create([
            'qr_code' => $validated['qr_code'],
            'event_type' => 'scan',
            'event_data' => [
                'action' => $validated['action'],
                'user_id' => auth()->id(),
                'location' => $request->ip(),
            ],
            'scanned_at' => now(),
            'scanned_by' => auth()->id(),
        ]);

        switch ($validated['action']) {
            case 'query':
                return $this->handleQueryScan($qrData);
            case 'start':
                return $this->handleStartScan($qrData, $validated['notes'] ?? null);
            case 'complete':
                return $this->handleCompleteScan($validated['execution_id'], $validated['notes'] ?? null);
            default:
                return back()->with('error', 'Invalid action.');
        }
    }

    /**
     * Display the specified execution.
     */
    public function show(ProductionExecution $execution): Response
    {
        $this->authorize('view', $execution);

        $execution->load([
            'productionSchedule' => function ($query) {
                $query->with([
                    'manufacturingOrder.product',
                    'routingStep.productionRouting.bomItem',
                    'workCell',
                ]);
            },
            'operator',
        ]);

        // Get QR tracking events
        $qrEvents = QrTracking::where('event_data->execution_id', $execution->id)
            ->orderBy('scanned_at', 'desc')
            ->get();

        // Method temporarily disabled - page not implemented yet
        return response()->json(["message" => "This feature is not yet implemented"], 501);
    }

    /**
     * Update the execution.
     */
    public function update(Request $request, ProductionExecution $execution)
    {
        $this->authorize('update', $execution);

        if ($execution->completed_at || $execution->cancelled_at) {
            return back()->with('error', 'Cannot update completed or cancelled executions.');
        }

        $validated = $request->validate([
            'progress_percentage' => 'nullable|integer|min:0|max:100',
            'notes' => 'nullable|string',
            'issues' => 'nullable|array',
        ]);

        $execution->update($validated);

        return back()->with('success', 'Execution updated successfully.');
    }

    /**
     * Complete the execution.
     */
    public function complete(Request $request, ProductionExecution $execution)
    {
        $this->authorize('complete', $execution);

        if ($execution->completed_at) {
            return back()->with('error', 'Execution already completed.');
        }

        $validated = $request->validate([
            'quantity_completed' => 'required|numeric|min:0',
            'quantity_rejected' => 'nullable|numeric|min:0',
            'completion_notes' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($execution, $validated) {
            $execution->update([
                'completed_at' => now(),
                'quantity_completed' => $validated['quantity_completed'],
                'quantity_rejected' => $validated['quantity_rejected'] ?? 0,
                'completion_notes' => $validated['completion_notes'],
                'actual_duration_minutes' => $execution->started_at->diffInMinutes(now()),
            ]);

            // Update production schedule progress
            $schedule = $execution->productionSchedule;
            $totalCompleted = $schedule->productionExecutions()
                ->whereNotNull('completed_at')
                ->sum('quantity_completed');

            if ($totalCompleted >= $schedule->manufacturingOrder->quantity) {
                $schedule->complete($totalCompleted, 0, 'Completed via executions');
            }
        });

        return back()->with('success', 'Execution completed successfully.');
    }

    /**
     * Cancel the execution.
     */
    public function cancel(Request $request, ProductionExecution $execution)
    {
        $this->authorize('update', $execution);

        if ($execution->completed_at || $execution->cancelled_at) {
            return back()->with('error', 'Cannot cancel completed executions.');
        }

        $validated = $request->validate([
            'cancellation_reason' => 'required|string|max:500',
        ]);

        $execution->update([
            'cancelled_at' => now(),
            'cancellation_reason' => $validated['cancellation_reason'],
        ]);

        return back()->with('success', 'Execution cancelled successfully.');
    }

    /**
     * Get execution statistics.
     */
    public function statistics(Request $request)
    {
        $this->authorize('viewAny', ProductionExecution::class);

        $startDate = $request->input('start_date', now()->startOfMonth());
        $endDate = $request->input('end_date', now()->endOfMonth());

        $statistics = [
            'total_executions' => ProductionExecution::whereBetween('started_at', [$startDate, $endDate])->count(),
            'completed_executions' => ProductionExecution::whereBetween('started_at', [$startDate, $endDate])
                ->whereNotNull('completed_at')->count(),
            'average_duration' => ProductionExecution::whereBetween('started_at', [$startDate, $endDate])
                ->whereNotNull('completed_at')->avg('actual_duration_minutes'),
            'total_quantity_completed' => ProductionExecution::whereBetween('started_at', [$startDate, $endDate])
                ->whereNotNull('completed_at')->sum('quantity_completed'),
            'total_quantity_rejected' => ProductionExecution::whereBetween('started_at', [$startDate, $endDate])
                ->whereNotNull('completed_at')->sum('quantity_rejected'),
            'by_operator' => $this->getOperatorStatistics($startDate, $endDate),
            'by_work_cell' => $this->getWorkCellStatistics($startDate, $endDate),
        ];

        return response()->json($statistics);
    }

    /**
     * Handle query scan.
     */
    protected function handleQueryScan($qrData)
    {
        // Find the BOM item and its current production status
        $bomItem = \App\Models\Production\BomItem::find($qrData['bom_item_id'] ?? null);
        if (!$bomItem) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found.',
            ], 404);
        }

        // Get current production schedules for this item
        $schedules = ProductionSchedule::query()
            ->whereHas('routingStep.productionRouting', function ($query) use ($bomItem) {
                $query->where('bom_item_id', $bomItem->id);
            })
            ->whereIn('status', ['scheduled', 'in_progress'])
            ->with(['manufacturingOrder', 'routingStep', 'workCell'])
            ->get();

        return response()->json([
            'success' => true,
            'item' => $bomItem->load(['routing', 'thumbnail']),
            'schedules' => $schedules,
        ]);
    }

    /**
     * Handle start scan.
     */
    protected function handleStartScan($qrData, $notes)
    {
        // Find available schedule for this item
        $schedule = ProductionSchedule::query()
            ->whereHas('routingStep.productionRouting', function ($query) use ($qrData) {
                $query->where('bom_item_id', $qrData['bom_item_id'] ?? null);
            })
            ->where('status', 'scheduled')
            ->where('manufacturing_order_id', $qrData['manufacturing_order_id'] ?? null)
            ->first();

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'No scheduled production found for this item.',
            ], 404);
        }

        // Start the schedule and create execution
        DB::transaction(function () use ($schedule, $notes) {
            $schedule->start($notes);
            
            ProductionExecution::create([
                'production_schedule_id' => $schedule->id,
                'routing_step_id' => $schedule->routing_step_id,
                'operator_id' => auth()->id(),
                'started_at' => now(),
                'notes' => $notes,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Production started successfully.',
            'schedule' => $schedule->load(['routingStep', 'workCell']),
        ]);
    }

    /**
     * Handle complete scan.
     */
    protected function handleCompleteScan($executionId, $notes)
    {
        $execution = ProductionExecution::find($executionId);
        if (!$execution || $execution->operator_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid execution.',
            ], 403);
        }

        $execution->update([
            'completed_at' => now(),
            'completion_notes' => $notes,
            'actual_duration_minutes' => $execution->started_at->diffInMinutes(now()),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Production step completed.',
            'execution' => $execution,
        ]);
    }

    /**
     * Decode QR code.
     */
    protected function decodeQrCode($qrCode)
    {
        // In a real implementation, this would decode the QR code
        // For now, we'll parse a simple format: PROD-{order_id}-{item_id}
        $parts = explode('-', $qrCode);
        if (count($parts) !== 3 || $parts[0] !== 'PROD') {
            return null;
        }

        return [
            'manufacturing_order_id' => $parts[1],
            'bom_item_id' => $parts[2],
        ];
    }

    /**
     * Get operator statistics.
     */
    protected function getOperatorStatistics($startDate, $endDate)
    {
        return ProductionExecution::query()
            ->whereBetween('started_at', [$startDate, $endDate])
            ->whereNotNull('completed_at')
            ->select('operator_id')
            ->selectRaw('COUNT(*) as total_executions')
            ->selectRaw('AVG(actual_duration_minutes) as avg_duration')
            ->selectRaw('SUM(quantity_completed) as total_completed')
            ->groupBy('operator_id')
            ->with('operator:id,name')
            ->get();
    }

    /**
     * Get work cell statistics.
     */
    protected function getWorkCellStatistics($startDate, $endDate)
    {
        return ProductionExecution::query()
            ->whereBetween('started_at', [$startDate, $endDate])
            ->whereNotNull('completed_at')
            ->join('production_schedules', 'production_executions.production_schedule_id', '=', 'production_schedules.id')
            ->select('production_schedules.work_cell_id')
            ->selectRaw('COUNT(*) as total_executions')
            ->selectRaw('AVG(production_executions.actual_duration_minutes) as avg_duration')
            ->selectRaw('SUM(production_executions.quantity_completed) as total_completed')
            ->groupBy('production_schedules.work_cell_id')
            ->with('workCell:id,name')
            ->get();
    }
} 
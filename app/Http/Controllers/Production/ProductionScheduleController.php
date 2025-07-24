<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ProductionOrder;
use App\Models\Production\ProductionSchedule;
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
        $this->authorize('viewAny', ProductionSchedule::class);

        $schedules = ProductionSchedule::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->whereHas('productionOrder', function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%");
                })
                ->orWhereHas('routingStep.productionRouting.bomItem', function ($q) use ($search) {
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
                $query->whereDate('scheduled_start_date', '>=', $request->input('date_from'));
            })
            ->when($request->filled('date_to'), function ($query) use ($request) {
                $query->whereDate('scheduled_start_date', '<=', $request->input('date_to'));
            })
            ->with([
                'productionOrder.product',
                'routingStep.productionRouting.bomItem',
                'workCell',
            ])
            ->orderBy('scheduled_start_date')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('production/schedules/index', [
            'schedules' => $schedules,
            'filters' => $request->only(['search', 'status', 'work_cell_id', 'date_from', 'date_to', 'per_page']),
            'workCells' => WorkCell::active()->get(['id', 'name']),
            'statuses' => [
                'scheduled' => 'Scheduled',
                'in_progress' => 'In Progress',
                'completed' => 'Completed',
                'delayed' => 'Delayed',
                'cancelled' => 'Cancelled',
            ],
        ]);
    }

    /**
     * Display the calendar view of schedules.
     */
    public function calendar(Request $request): Response
    {
        $this->authorize('viewAny', ProductionSchedule::class);

        $startDate = $request->input('start', now()->startOfMonth());
        $endDate = $request->input('end', now()->endOfMonth());

        $schedules = ProductionSchedule::query()
            ->whereBetween('scheduled_start_date', [$startDate, $endDate])
            ->when($request->filled('work_cell_id'), function ($query) use ($request) {
                $query->where('work_cell_id', $request->input('work_cell_id'));
            })
            ->with([
                'productionOrder.product',
                'routingStep.productionRouting.bomItem',
                'workCell',
            ])
            ->get();

        $events = $schedules->map(function ($schedule) {
            return [
                'id' => $schedule->id,
                'title' => $schedule->routingStep->productionRouting->bomItem->name . ' - ' . $schedule->routingStep->name,
                'start' => $schedule->scheduled_start_date->toIso8601String(),
                'end' => $schedule->scheduled_end_date->toIso8601String(),
                'color' => $this->getStatusColor($schedule->status),
                'extendedProps' => [
                    'order_number' => $schedule->productionOrder->order_number,
                    'work_cell' => $schedule->workCell->name,
                    'status' => $schedule->status,
                    'progress' => $schedule->getProgressPercentage(),
                ],
            ];
        });

        return Inertia::render('production/schedules/calendar', [
            'events' => $events,
            'workCells' => WorkCell::active()->get(['id', 'name']),
            'filters' => $request->only(['work_cell_id', 'start', 'end']),
        ]);
    }

    /**
     * Display the Gantt chart view of schedules.
     */
    public function gantt(Request $request): Response
    {
        $this->authorize('viewAny', ProductionSchedule::class);

        $orders = ProductionOrder::query()
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->input('status'));
            })
            ->with([
                'productionSchedules' => function ($query) {
                    $query->with(['routingStep.productionRouting.bomItem', 'workCell'])
                        ->orderBy('scheduled_start_date');
                },
                'product',
            ])
            ->whereHas('productionSchedules')
            ->get();

        $ganttData = $orders->map(function ($order) {
            return [
                'id' => 'order-' . $order->id,
                'name' => $order->order_number . ' - ' . $order->product->name,
                'type' => 'order',
                'start' => $order->productionSchedules->min('scheduled_start_date')->toIso8601String(),
                'end' => $order->productionSchedules->max('scheduled_end_date')->toIso8601String(),
                'progress' => $order->getCompletionPercentage(),
                'children' => $order->productionSchedules->map(function ($schedule) {
                    return [
                        'id' => 'schedule-' . $schedule->id,
                        'name' => $schedule->routingStep->productionRouting->bomItem->name . ' - ' . $schedule->routingStep->name,
                        'type' => 'schedule',
                        'start' => $schedule->scheduled_start_date->toIso8601String(),
                        'end' => $schedule->scheduled_end_date->toIso8601String(),
                        'progress' => $schedule->getProgressPercentage(),
                        'work_cell' => $schedule->workCell->name,
                        'status' => $schedule->status,
                    ];
                }),
            ];
        });

        return Inertia::render('production/schedules/gantt', [
            'ganttData' => $ganttData,
            'filters' => $request->only(['status']),
        ]);
    }

    /**
     * Display the specified schedule.
     */
    public function show(ProductionSchedule $schedule): Response
    {
        $this->authorize('view', $schedule);

        $schedule->load([
            'productionOrder.product',
            'routingStep.productionRouting.bomItem',
            'workCell',
            'productionExecutions.operator',
        ]);

        return Inertia::render('production/schedules/show', [
            'schedule' => $schedule,
            'can' => [
                'update' => auth()->user()->can('update', $schedule),
                'start' => auth()->user()->can('start', $schedule),
                'complete' => auth()->user()->can('complete', $schedule),
            ],
        ]);
    }

    /**
     * Update the schedule.
     */
    public function update(Request $request, ProductionSchedule $schedule)
    {
        $this->authorize('update', $schedule);

        if (in_array($schedule->status, ['completed', 'cancelled'])) {
            return back()->with('error', 'Cannot update completed or cancelled schedules.');
        }

        $validated = $request->validate([
            'scheduled_start_date' => 'required|date',
            'scheduled_end_date' => 'required|date|after:scheduled_start_date',
            'work_cell_id' => 'required|exists:work_cells,id',
            'assigned_operators' => 'nullable|array',
            'assigned_operators.*' => 'exists:users,id',
        ]);

        // Check for conflicts
        $conflicts = $this->schedulingService->checkScheduleConflicts(
            $schedule->work_cell_id,
            $validated['scheduled_start_date'],
            $validated['scheduled_end_date'],
            $schedule->id
        );

        if (!empty($conflicts)) {
            return back()->withErrors([
                'scheduled_start_date' => 'Schedule conflicts with existing schedules.',
            ])->with('conflicts', $conflicts);
        }

        $schedule->update($validated);

        return back()->with('success', 'Schedule updated successfully.');
    }

    /**
     * Start the scheduled production.
     */
    public function start(Request $request, ProductionSchedule $schedule)
    {
        $this->authorize('start', $schedule);

        if ($schedule->status !== 'scheduled') {
            return back()->with('error', 'Only scheduled items can be started.');
        }

        $validated = $request->validate([
            'operator_notes' => 'nullable|string|max:500',
        ]);

        try {
            $schedule->start($validated['operator_notes'] ?? null);
            return back()->with('success', 'Production started successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Complete the scheduled production.
     */
    public function complete(Request $request, ProductionSchedule $schedule)
    {
        $this->authorize('complete', $schedule);

        if ($schedule->status !== 'in_progress') {
            return back()->with('error', 'Only in-progress items can be completed.');
        }

        $validated = $request->validate([
            'quantity_completed' => 'required|numeric|min:0',
            'quantity_rejected' => 'nullable|numeric|min:0',
            'completion_notes' => 'nullable|string|max:500',
        ]);

        try {
            DB::transaction(function () use ($schedule, $validated) {
                $schedule->complete(
                    $validated['quantity_completed'],
                    $validated['quantity_rejected'] ?? 0,
                    $validated['completion_notes'] ?? null
                );

                // Check if all schedules for the order are complete
                $order = $schedule->productionOrder;
                if ($order->productionSchedules()->where('status', '!=', 'completed')->count() === 0) {
                    $order->update([
                        'status' => 'completed',
                        'actual_end_date' => now(),
                    ]);
                }
            });

            return back()->with('success', 'Production completed successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Delay the schedule.
     */
    public function delay(Request $request, ProductionSchedule $schedule)
    {
        $this->authorize('update', $schedule);

        if (in_array($schedule->status, ['completed', 'cancelled'])) {
            return back()->with('error', 'Cannot delay completed or cancelled schedules.');
        }

        $validated = $request->validate([
            'delay_reason' => 'required|string|max:500',
            'new_start_date' => 'required|date|after:now',
            'new_end_date' => 'required|date|after:new_start_date',
        ]);

        DB::transaction(function () use ($schedule, $validated) {
            $schedule->update([
                'scheduled_start_date' => $validated['new_start_date'],
                'scheduled_end_date' => $validated['new_end_date'],
                'status' => 'delayed',
                'delay_reason' => $validated['delay_reason'],
            ]);

            // Cascade delay to dependent schedules
            $this->schedulingService->cascadeDelay($schedule);
        });

        return back()->with('success', 'Schedule delayed successfully.');
    }

    /**
     * Cancel the schedule.
     */
    public function cancel(Request $request, ProductionSchedule $schedule)
    {
        $this->authorize('update', $schedule);

        if (in_array($schedule->status, ['completed', 'cancelled'])) {
            return back()->with('error', 'Cannot cancel completed schedules.');
        }

        $validated = $request->validate([
            'cancellation_reason' => 'required|string|max:500',
        ]);

        $schedule->update([
            'status' => 'cancelled',
            'cancellation_reason' => $validated['cancellation_reason'],
            'cancelled_at' => now(),
        ]);

        return back()->with('success', 'Schedule cancelled successfully.');
    }

    /**
     * Reassign schedule to different work cell.
     */
    public function reassign(Request $request, ProductionSchedule $schedule)
    {
        $this->authorize('update', $schedule);

        if ($schedule->status === 'in_progress') {
            return back()->with('error', 'Cannot reassign in-progress schedules.');
        }

        $validated = $request->validate([
            'work_cell_id' => 'required|exists:work_cells,id',
            'reason' => 'required|string|max:500',
        ]);

        $workCell = WorkCell::find($validated['work_cell_id']);

        // Check if work cell can handle the routing step
        if ($workCell->type === 'external' && $schedule->routingStep->requires_internal) {
            return back()->with('error', 'External work cell cannot handle internal routing steps.');
        }

        // Recalculate schedule based on new work cell capacity
        $duration = $this->schedulingService->calculateDuration(
            $schedule->routingStep,
            $schedule->productionOrder->quantity,
            $workCell
        );

        $schedule->update([
            'work_cell_id' => $validated['work_cell_id'],
            'scheduled_end_date' => $schedule->scheduled_start_date->copy()->addMinutes($duration),
            'reassignment_reason' => $validated['reason'],
        ]);

        return back()->with('success', 'Schedule reassigned successfully.');
    }

    /**
     * Get schedule conflicts.
     */
    public function conflicts(Request $request)
    {
        $this->authorize('viewAny', ProductionSchedule::class);

        $validated = $request->validate([
            'work_cell_id' => 'required|exists:work_cells,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'exclude_id' => 'nullable|exists:production_schedules,id',
        ]);

        $conflicts = $this->schedulingService->checkScheduleConflicts(
            $validated['work_cell_id'],
            $validated['start_date'],
            $validated['end_date'],
            $validated['exclude_id'] ?? null
        );

        return response()->json([
            'conflicts' => $conflicts,
            'has_conflicts' => !empty($conflicts),
        ]);
    }

    /**
     * Get status color for calendar.
     */
    protected function getStatusColor(string $status): string
    {
        return match ($status) {
            'scheduled' => '#3b82f6', // blue
            'in_progress' => '#eab308', // yellow
            'completed' => '#22c55e', // green
            'delayed' => '#f97316', // orange
            'cancelled' => '#ef4444', // red
            default => '#6b7280', // gray
        };
    }
} 
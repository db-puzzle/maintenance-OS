<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\WorkCell;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkCellController extends Controller
{
    /**
     * Display a listing of work cells.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', WorkCell::class);

        $workCells = WorkCell::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('type'), function ($query) use ($request) {
                $query->where('type', $request->input('type'));
            })
            ->when($request->filled('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->with(['createdBy'])
            ->withCount(['routingSteps', 'productionSchedules'])
            ->orderBy('code')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('production/work-cells/index', [
            'workCells' => $workCells,
            'filters' => $request->only(['search', 'type', 'is_active', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', WorkCell::class),
            ],
        ]);
    }

    /**
     * Show the form for creating a new work cell.
     */
    public function create(): Response
    {
        $this->authorize('create', WorkCell::class);

        return Inertia::render('production/work-cells/create');
    }

    /**
     * Store a newly created work cell.
     */
    public function store(Request $request)
    {
        $this->authorize('create', WorkCell::class);

        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:work_cells',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:internal,external',
            'capacity_units' => 'required|integer|min:1',
            'capacity_per_hour' => 'required|numeric|min:0.01',
            'efficiency_rate' => 'nullable|numeric|min:0|max:100',
            'operating_hours' => 'nullable|array',
            'attributes' => 'nullable|array',
        ]);

        $validated['created_by'] = auth()->id();
        $validated['is_active'] = true;
        $validated['efficiency_rate'] = $validated['efficiency_rate'] ?? 85;

        $workCell = WorkCell::create($validated);

        return redirect()->route('production.work-cells.show', $workCell)
            ->with('success', 'Work cell created successfully.');
    }

    /**
     * Display the specified work cell.
     */
    public function show(WorkCell $workCell): Response
    {
        $this->authorize('view', $workCell);

        $workCell->load([
            'routingSteps.productionRouting.bomItem',
            'productionSchedules' => function ($query) {
                $query->with(['manufacturingOrder.product', 'routingStep'])
                    ->whereIn('status', ['scheduled', 'in_progress'])
                    ->orderBy('scheduled_start_date');
            },
            'createdBy',
        ]);

        // Calculate current utilization
        $utilization = $this->calculateCurrentUtilization($workCell);

        return Inertia::render('production/work-cells/show', [
            'workCell' => $workCell,
            'utilization' => $utilization,
            'can' => [
                'update' => auth()->user()->can('update', $workCell),
                'delete' => auth()->user()->can('delete', $workCell),
            ],
        ]);
    }

    /**
     * Show the form for editing the work cell.
     */
    public function edit(WorkCell $workCell): Response
    {
        $this->authorize('update', $workCell);

        return Inertia::render('production/work-cells/edit', [
            'workCell' => $workCell,
        ]);
    }

    /**
     * Update the specified work cell.
     */
    public function update(Request $request, WorkCell $workCell)
    {
        $this->authorize('update', $workCell);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:internal,external',
            'capacity_units' => 'required|integer|min:1',
            'capacity_per_hour' => 'required|numeric|min:0.01',
            'efficiency_rate' => 'nullable|numeric|min:0|max:100',
            'operating_hours' => 'nullable|array',
            'attributes' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $workCell->update($validated);

        return redirect()->route('production.work-cells.show', $workCell)
            ->with('success', 'Work cell updated successfully.');
    }

    /**
     * Remove the specified work cell.
     */
    public function destroy(WorkCell $workCell)
    {
        $this->authorize('delete', $workCell);

        // Check if work cell is assigned to any routing steps
        if ($workCell->routingSteps()->exists()) {
            return back()->with('error', 'Cannot delete work cell that is assigned to routing steps.');
        }

        // Check if work cell has any scheduled production
        if ($workCell->productionSchedules()->whereIn('status', ['scheduled', 'in_progress'])->exists()) {
            return back()->with('error', 'Cannot delete work cell with active production schedules.');
        }

        $workCell->delete();

        return redirect()->route('production.work-cells.index')
            ->with('success', 'Work cell deleted successfully.');
    }

    /**
     * Get work cell capacity analysis.
     */
    public function capacity(WorkCell $workCell, Request $request)
    {
        $this->authorize('view', $workCell);

        $startDate = $request->input('start_date', now()->startOfWeek());
        $endDate = $request->input('end_date', now()->endOfWeek());

        $schedules = $workCell->productionSchedules()
            ->whereBetween('scheduled_start_date', [$startDate, $endDate])
            ->with(['manufacturingOrder.product', 'routingStep'])
            ->get();

        $capacityData = $this->calculateCapacityAnalysis($workCell, $schedules, $startDate, $endDate);

        return response()->json([
            'workCell' => $workCell,
            'capacity' => $capacityData,
            'schedules' => $schedules,
        ]);
    }

    /**
     * Get work cell schedule.
     */
    public function schedule(WorkCell $workCell, Request $request): Response
    {
        $this->authorize('view', $workCell);

        $startDate = $request->input('start_date', now()->startOfWeek());
        $endDate = $request->input('end_date', now()->addWeeks(4));

        $schedules = $workCell->productionSchedules()
            ->whereBetween('scheduled_start_date', [$startDate, $endDate])
            ->with([
                'manufacturingOrder' => function ($query) {
                    $query->with(['product', 'billOfMaterial']);
                },
                'routingStep.productionRouting.bomItem',
            ])
            ->orderBy('scheduled_start_date')
            ->get();

        return Inertia::render('production/work-cells/schedule', [
            'workCell' => $workCell,
            'schedules' => $schedules,
            'dateRange' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * Calculate current utilization for a work cell.
     */
    protected function calculateCurrentUtilization(WorkCell $workCell): array
    {
        $now = now();
        $weekStart = $now->copy()->startOfWeek();
        $weekEnd = $now->copy()->endOfWeek();

        $weeklySchedules = $workCell->productionSchedules()
            ->whereBetween('scheduled_start_date', [$weekStart, $weekEnd])
            ->get();

        $totalScheduledHours = $weeklySchedules->sum(function ($schedule) {
            return $schedule->scheduled_start_date->diffInHours($schedule->scheduled_end_date);
        });

        $availableHours = $workCell->getAvailableCapacity($weekStart, $weekEnd);
        $utilizationRate = $availableHours > 0 ? ($totalScheduledHours / $availableHours) * 100 : 0;

        return [
            'weekly' => [
                'scheduled_hours' => $totalScheduledHours,
                'available_hours' => $availableHours,
                'utilization_rate' => round($utilizationRate, 2),
            ],
            'daily' => $this->calculateDailyUtilization($workCell, $weekStart, $weekEnd),
        ];
    }

    /**
     * Calculate daily utilization.
     */
    protected function calculateDailyUtilization(WorkCell $workCell, $start, $end): array
    {
        $daily = [];
        $current = $start->copy();

        while ($current <= $end) {
            $dayStart = $current->copy()->startOfDay();
            $dayEnd = $current->copy()->endOfDay();

            $daySchedules = $workCell->productionSchedules()
                ->whereBetween('scheduled_start_date', [$dayStart, $dayEnd])
                ->get();

            $scheduledHours = $daySchedules->sum(function ($schedule) use ($dayStart, $dayEnd) {
                $start = max($schedule->scheduled_start_date, $dayStart);
                $end = min($schedule->scheduled_end_date, $dayEnd);
                return $start->diffInHours($end);
            });

            $availableHours = $workCell->getDailyCapacity($current);
            $utilizationRate = $availableHours > 0 ? ($scheduledHours / $availableHours) * 100 : 0;

            $daily[] = [
                'date' => $current->format('Y-m-d'),
                'scheduled_hours' => $scheduledHours,
                'available_hours' => $availableHours,
                'utilization_rate' => round($utilizationRate, 2),
            ];

            $current->addDay();
        }

        return $daily;
    }

    /**
     * Calculate capacity analysis.
     */
    protected function calculateCapacityAnalysis(WorkCell $workCell, $schedules, $startDate, $endDate): array
    {
        $totalCapacity = $workCell->getAvailableCapacity($startDate, $endDate);
        $totalScheduled = $schedules->sum(function ($schedule) {
            return $schedule->scheduled_start_date->diffInHours($schedule->scheduled_end_date);
        });

        $utilizationByDay = [];
        $current = $startDate->copy();

        while ($current <= $endDate) {
            $daySchedules = $schedules->filter(function ($schedule) use ($current) {
                return $schedule->scheduled_start_date->isSameDay($current);
            });

            $dayHours = $daySchedules->sum(function ($schedule) {
                return $schedule->scheduled_start_date->diffInHours($schedule->scheduled_end_date);
            });

            $utilizationByDay[$current->format('Y-m-d')] = [
                'scheduled' => $dayHours,
                'capacity' => $workCell->getDailyCapacity($current),
            ];

            $current->addDay();
        }

        return [
            'total_capacity' => $totalCapacity,
            'total_scheduled' => $totalScheduled,
            'utilization_rate' => $totalCapacity > 0 ? ($totalScheduled / $totalCapacity) * 100 : 0,
            'available_capacity' => $totalCapacity - $totalScheduled,
            'by_day' => $utilizationByDay,
        ];
    }
} 
<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\BaseSearchController;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use App\Models\Production\UnitOfMeasure;
use App\Models\Production\WorkCell;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WorkCellController extends BaseSearchController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', WorkCell::class);

        $query = WorkCell::with(['plant', 'area', 'sector', 'shift', 'manufacturer'])
            ->withCount('routingSteps');

        // Apply search filter
        if ($search = $request->input('search')) {
            $searchConfig = [
                'name',
                'description',
                [
                    'relation' => 'plant',
                    'columns' => ['name'],
                ],
                [
                    'relation' => 'area',
                    'columns' => ['name'],
                ],
                [
                    'relation' => 'sector',
                    'columns' => ['name'],
                ],
            ];
            $query = $this->applySearchFilter($query, $search, $searchConfig);
        }

        // Apply cell type filter
        if ($cellType = $request->input('cell_type')) {
            $query->where('cell_type', $cellType);
        }

        // Apply active filter
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Apply sorting
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        switch ($sort) {
            case 'plant':
                $query->leftJoin('plants', 'work_cells.plant_id', '=', 'plants.id')
                    ->orderBy('plants.name', $direction)
                    ->select('work_cells.*');
                break;
            case 'area':
                $query->leftJoin('areas', 'work_cells.area_id', '=', 'areas.id')
                    ->orderBy('areas.name', $direction)
                    ->select('work_cells.*');
                break;
            case 'shift':
                $query->leftJoin('shifts', 'work_cells.shift_id', '=', 'shifts.id')
                    ->orderBy('shifts.name', $direction)
                    ->select('work_cells.*');
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $workCells = $query->paginate($request->input('per_page', 10));

        // Get all plants, shifts, and manufacturers for creation
        $plants = Plant::orderBy('name')->get(['id', 'name']);
        $shifts = Shift::orderBy('name')->get(['id', 'name']);
        $manufacturers = Manufacturer::orderBy('name')->get(['id', 'name']);
        $unitsOfMeasure = UnitOfMeasure::where('is_active', true)
            ->orderBy('uom_type')
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'symbol', 'uom_type']);

        return Inertia::render('production/work-cells/index', [
            'workCells' => $workCells,
            'filters' => [
                'search' => $request->input('search', ''),
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $request->input('per_page', 10),
                'cell_type' => $request->input('cell_type', ''),
                'is_active' => $request->input('is_active', ''),
            ],
            'plants' => $plants,
            'shifts' => $shifts,
            'manufacturers' => $manufacturers,
            'unitsOfMeasure' => $unitsOfMeasure,
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, WorkCell $workCell)
    {
        $this->authorize('view', $workCell);

        $workCell->load(['plant', 'area', 'sector', 'shift', 'manufacturer']);

        // Get routing steps with pagination
        $routingStepsQuery = $workCell->routingSteps()
            ->with(['manufacturingRoute.item'])
            ->select('manufacturing_steps.*');

        // Apply sorting for routing steps
        $stepsSort = $request->input('steps_sort', 'step_number');
        $stepsDirection = $request->input('steps_direction', 'asc');

        if ($stepsSort === 'route') {
            $routingStepsQuery->leftJoin('manufacturing_routes', 'manufacturing_steps.manufacturing_route_id', '=', 'manufacturing_routes.id')
                ->leftJoin('items', 'manufacturing_routes.item_id', '=', 'items.id')
                ->orderBy('items.name', $stepsDirection)
                ->select('manufacturing_steps.*');
        } else {
            $routingStepsQuery->orderBy($stepsSort, $stepsDirection);
        }

        $routingSteps = $routingStepsQuery->paginate(10, ['*'], 'steps_page');

        // Get production schedules with pagination
        // TODO: Uncomment when ProductionSchedule model is created
        // $schedulesQuery = $workCell->productionSchedules()
        //     ->with(['manufacturingOrder.item', 'manufacturingStep'])
        //     ->select('production_schedules.*');

        // Apply sorting for schedules - keep these for the view even though we're not using them yet
        $schedulesSort = $request->input('schedules_sort', 'scheduled_start');
        $schedulesDirection = $request->input('schedules_direction', 'desc');

        // if ($schedulesSort === 'order') {
        //     $schedulesQuery->leftJoin('manufacturing_orders', 'production_schedules.manufacturing_order_id', '=', 'manufacturing_orders.id')
        //         ->orderBy('manufacturing_orders.order_number', $schedulesDirection)
        //         ->select('production_schedules.*');
        // } else {
        //     $schedulesQuery->orderBy($schedulesSort, $schedulesDirection);
        // }

        // $productionSchedules = $schedulesQuery->paginate(10, ['*'], 'schedules_page');

        // Temporary empty collection until ProductionSchedule model is created
        $productionSchedules = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 10);

        // Get all plants for editing
        $plants = Plant::orderBy('name')->get(['id', 'name']);
        $shifts = Shift::orderBy('name')->get(['id', 'name']);
        $manufacturers = Manufacturer::orderBy('name')->get(['id', 'name']);
        $unitsOfMeasure = UnitOfMeasure::where('is_active', true)
            ->orderBy('uom_type')
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'symbol', 'uom_type']);

        // Get areas if plant is selected
        $areas = $workCell->plant_id
            ? Area::where('plant_id', $workCell->plant_id)->orderBy('name')->get(['id', 'name'])
            : [];

        // Get sectors if area is selected
        $sectors = $workCell->area_id
            ? Sector::where('area_id', $workCell->area_id)->orderBy('name')->get(['id', 'name'])
            : [];

        return Inertia::render('production/work-cells/show', [
            'workCell' => $workCell,
            'routingSteps' => $routingSteps,
            'productionSchedules' => $productionSchedules,
            'plants' => $plants,
            'areas' => $areas,
            'sectors' => $sectors,
            'shifts' => $shifts,
            'manufacturers' => $manufacturers,
            'unitsOfMeasure' => $unitsOfMeasure,
            'activeTab' => $request->input('tab', 'informacoes'),
            'filters' => [
                'steps' => [
                    'sort' => $stepsSort,
                    'direction' => $stepsDirection,
                ],
                'schedules' => [
                    'sort' => $schedulesSort,
                    'direction' => $schedulesDirection,
                ],
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', WorkCell::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cell_type' => 'required|in:internal,external',
            'has_finite_capacity' => 'boolean',
            'default_production_rate_per_hour' => 'nullable|numeric|min:0.001',
            'default_unit_of_measure' => 'nullable|string|max:50',
            'default_setup_time_minutes' => 'integer|min:0|max:9999',
            'max_parallel_executions' => 'integer|min:1|max:999',
            'shift_id' => 'nullable|exists:shifts,id',
            'plant_id' => 'nullable|exists:plants,id',
            'area_id' => 'nullable|exists:areas,id',
            'sector_id' => 'nullable|exists:sectors,id',
            'manufacturer_id' => 'nullable|required_if:cell_type,external|exists:manufacturers,id',
            'is_active' => 'boolean',
        ]);

        // Set defaults
        $validated['has_finite_capacity'] = $validated['has_finite_capacity'] ?? true;
        $validated['default_unit_of_measure'] = $validated['default_unit_of_measure'] ?? 'PC';
        $validated['default_setup_time_minutes'] = $validated['default_setup_time_minutes'] ?? 0;
        $validated['max_parallel_executions'] = $validated['max_parallel_executions'] ?? 1;

        // Validate finite capacity requirements - shift is only required for cells with finite capacity
        if ($validated['has_finite_capacity'] && empty($validated['shift_id'])) {
            return back()->withErrors(['shift_id' => 'Turno é obrigatório para células com capacidade finita.']);
        }

        // Clear finite capacity fields when infinite capacity is selected
        if (! $validated['has_finite_capacity']) {
            $validated['shift_id'] = null;
            $validated['default_production_rate_per_hour'] = null;
            $validated['max_parallel_executions'] = 1;
        }

        // Ensure area belongs to plant if both are provided
        if (! empty($validated['plant_id']) && ! empty($validated['area_id'])) {
            $area = Area::find($validated['area_id']);
            if ($area->plant_id != $validated['plant_id']) {
                return back()->withErrors(['area_id' => 'A área selecionada não pertence à planta escolhida.']);
            }
        }

        // Ensure sector belongs to area if both are provided
        if (! empty($validated['area_id']) && ! empty($validated['sector_id'])) {
            $sector = Sector::find($validated['sector_id']);
            if ($sector->area_id != $validated['area_id']) {
                return back()->withErrors(['sector_id' => 'O setor selecionado não pertence à área escolhida.']);
            }
        }

        $workCell = DB::transaction(function () use ($validated) {
            return WorkCell::create($validated);
        });

        // If request has 'stay' parameter (indicates Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Célula de trabalho {$workCell->name} criada com sucesso.")
                ->with('newWorkCellId', $workCell->id);
        }

        return redirect()->route('production.work-cells.show', $workCell)
            ->with('success', 'Célula de trabalho criada com sucesso.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, WorkCell $workCell)
    {
        $this->authorize('update', $workCell);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cell_type' => 'required|in:internal,external',
            'has_finite_capacity' => 'boolean',
            'default_production_rate_per_hour' => 'nullable|numeric|min:0.001',
            'default_unit_of_measure' => 'nullable|string|max:50',
            'default_setup_time_minutes' => 'integer|min:0|max:9999',
            'max_parallel_executions' => 'integer|min:1|max:999',
            'shift_id' => 'nullable|exists:shifts,id',
            'plant_id' => 'nullable|exists:plants,id',
            'area_id' => 'nullable|exists:areas,id',
            'sector_id' => 'nullable|exists:sectors,id',
            'manufacturer_id' => 'nullable|required_if:cell_type,external|exists:manufacturers,id',
            'is_active' => 'boolean',
        ]);

        // Set defaults
        $validated['has_finite_capacity'] = $validated['has_finite_capacity'] ?? true;
        $validated['default_unit_of_measure'] = $validated['default_unit_of_measure'] ?? 'PC';
        $validated['default_setup_time_minutes'] = $validated['default_setup_time_minutes'] ?? 0;
        $validated['max_parallel_executions'] = $validated['max_parallel_executions'] ?? 1;

        // Validate finite capacity requirements - shift is only required for cells with finite capacity
        if ($validated['has_finite_capacity'] && empty($validated['shift_id'])) {
            return back()->withErrors(['shift_id' => 'Turno é obrigatório para células com capacidade finita.']);
        }

        // Clear finite capacity fields when infinite capacity is selected
        if (! $validated['has_finite_capacity']) {
            $validated['shift_id'] = null;
            $validated['default_production_rate_per_hour'] = null;
            $validated['max_parallel_executions'] = 1;
        }

        // Ensure area belongs to plant if both are provided
        if (! empty($validated['plant_id']) && ! empty($validated['area_id'])) {
            $area = Area::find($validated['area_id']);
            if ($area->plant_id != $validated['plant_id']) {
                return back()->withErrors(['area_id' => 'A área selecionada não pertence à planta escolhida.']);
            }
        }

        // Ensure sector belongs to area if both are provided
        if (! empty($validated['area_id']) && ! empty($validated['sector_id'])) {
            $sector = Sector::find($validated['sector_id']);
            if ($sector->area_id != $validated['area_id']) {
                return back()->withErrors(['sector_id' => 'O setor selecionado não pertence à área escolhida.']);
            }
        }

        DB::transaction(function () use ($validated, $workCell) {
            $workCell->update($validated);
        });

        // If request has 'stay' parameter (indicates Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Célula de trabalho {$workCell->name} atualizada com sucesso.");
        }

        return redirect()->route('production.work-cells.show', $workCell)
            ->with('success', 'Célula de trabalho atualizada com sucesso.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(WorkCell $workCell)
    {
        $this->authorize('delete', $workCell);

        try {
            DB::transaction(function () use ($workCell) {
                $workCell->delete();
            });

            return redirect()->route('production.work-cells.index')
                ->with('success', 'Célula de trabalho excluída com sucesso.');
        } catch (\Exception $e) {
            return back()->with('error', 'Não foi possível excluir a célula de trabalho: ' . $e->getMessage());
        }
    }

    /**
     * Check dependencies before deletion.
     */
    public function checkDependencies(WorkCell $workCell)
    {
        $this->authorize('delete', $workCell);

        $dependencies = [];
        $hasDependencies = false;

        // Check routing steps
        $routingStepsCount = $workCell->routingSteps()->count();
        if ($routingStepsCount > 0) {
            $hasDependencies = true;
            $dependencies['routing_steps'] = [
                'count' => $routingStepsCount,
                'label' => 'Etapas de Roteiro',
                'items' => $workCell->routingSteps()
                    ->with(['manufacturingRoute.item', 'manufacturingRoute.manufacturingOrder'])
                    ->orderBy('created_at', 'desc')
                    ->limit(3)
                    ->get()
                    ->map(function ($step) {
                        $route = $step->manufacturingRoute;
                        $order = $route->manufacturingOrder;

                        return [
                            'id' => $step->id,
                            'name' => "Etapa {$step->step_number} - {$step->name}",
                            'item_name' => $route->item->name,
                            'manufacturing_order' => [
                                'id' => $order->id,
                                'order_number' => $order->order_number,
                                'route' => route('production.orders.show', ['order' => $order->id]),
                            ],
                            'manufacturing_route' => [
                                'id' => $route->id,
                                'name' => $route->name,
                                'route' => route('production.routing.show', ['routing' => $route->id]),
                            ],
                            'step_route' => route('production.steps.execute', ['step' => $step->id]),
                        ];
                    }),
            ];
        }

        // Check production schedules
        // TODO: Uncomment when ProductionSchedule model is created
        // $schedulesCount = $workCell->productionSchedules()->count();
        // if ($schedulesCount > 0) {
        //     $hasDependencies = true;
        //     $dependencies['production_schedules'] = [
        //         'count' => $schedulesCount,
        //         'label' => 'Agendamentos de Produção',
        //         'items' => $workCell->productionSchedules()
        //             ->with('manufacturingOrder')
        //             ->limit(10)
        //             ->get()
        //             ->map(function ($schedule) {
        //                 return [
        //                     'id' => $schedule->id,
        //                     'name' => "Ordem {$schedule->manufacturingOrder->order_number}",
        //                 ];
        //             }),
        //     ];
        // }

        return response()->json([
            'can_delete' => ! $hasDependencies,
            'dependencies' => $dependencies,
        ]);
    }

    /**
     * Get areas for a specific plant.
     */
    public function getAreas(Plant $plant)
    {
        $areas = $plant->areas()->orderBy('name')->get(['id', 'name']);

        return response()->json($areas);
    }

    /**
     * Get sectors for a specific area.
     */
    public function getSectors(Area $area)
    {
        $sectors = $area->sectors()->orderBy('name')->get(['id', 'name']);

        return response()->json($sectors);
    }
}

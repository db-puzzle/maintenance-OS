<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\WorkCell;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Shift;
use App\Models\AssetHierarchy\Manufacturer;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class WorkCellController extends Controller
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
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('plant', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('area', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('sector', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
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

        // Calculate utilization for the current month
        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();
        $utilization = $workCell->getUtilization($startOfMonth, $endOfMonth);

        // Get all plants for editing
        $plants = Plant::orderBy('name')->get(['id', 'name']);
        $shifts = Shift::orderBy('name')->get(['id', 'name']);
        $manufacturers = Manufacturer::orderBy('name')->get(['id', 'name']);
        
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
            'utilization' => $utilization,
            'plants' => $plants,
            'areas' => $areas,
            'sectors' => $sectors,
            'shifts' => $shifts,
            'manufacturers' => $manufacturers,
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
            'available_hours_per_day' => 'required|numeric|min:0.01|max:24',
            'efficiency_percentage' => 'required|numeric|min:0|max:100',
            'shift_id' => 'nullable|exists:shifts,id',
            'plant_id' => 'nullable|exists:plants,id',
            'area_id' => 'nullable|exists:areas,id',
            'sector_id' => 'nullable|exists:sectors,id',
            'manufacturer_id' => 'nullable|required_if:cell_type,external|exists:manufacturers,id',
            'is_active' => 'boolean',
        ]);

        // Ensure area belongs to plant if both are provided
        if (!empty($validated['plant_id']) && !empty($validated['area_id'])) {
            $area = Area::find($validated['area_id']);
            if ($area->plant_id != $validated['plant_id']) {
                return back()->withErrors(['area_id' => 'A área selecionada não pertence à planta escolhida.']);
            }
        }

        // Ensure sector belongs to area if both are provided
        if (!empty($validated['area_id']) && !empty($validated['sector_id'])) {
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
            return back()->with('success', "Célula de trabalho {$workCell->name} criada com sucesso.");
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
            'available_hours_per_day' => 'required|numeric|min:0.01|max:24',
            'efficiency_percentage' => 'required|numeric|min:0|max:100',
            'shift_id' => 'nullable|exists:shifts,id',
            'plant_id' => 'nullable|exists:plants,id',
            'area_id' => 'nullable|exists:areas,id',
            'sector_id' => 'nullable|exists:sectors,id',
            'manufacturer_id' => 'nullable|required_if:cell_type,external|exists:manufacturers,id',
            'is_active' => 'boolean',
        ]);

        // Ensure area belongs to plant if both are provided
        if (!empty($validated['plant_id']) && !empty($validated['area_id'])) {
            $area = Area::find($validated['area_id']);
            if ($area->plant_id != $validated['plant_id']) {
                return back()->withErrors(['area_id' => 'A área selecionada não pertence à planta escolhida.']);
            }
        }

        // Ensure sector belongs to area if both are provided
        if (!empty($validated['area_id']) && !empty($validated['sector_id'])) {
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

        $dependencies = [
            'dependencies' => []
        ];

        // Check routing steps
        $routingStepsCount = $workCell->routingSteps()->count();
        if ($routingStepsCount > 0) {
            $dependencies['dependencies']['routing_steps'] = [
                'count' => $routingStepsCount,
                'label' => 'Etapas de Roteiro',
                'items' => $workCell->routingSteps()
                    ->with('manufacturingRoute.item')
                    ->limit(10)
                    ->get()
                    ->map(function ($step) {
                        return [
                            'id' => $step->id,
                            'name' => "Etapa {$step->step_number} - {$step->manufacturingRoute->item->name}",
                        ];
                    }),
            ];
        }

        // Check production schedules
        // TODO: Uncomment when ProductionSchedule model is created
        // $schedulesCount = $workCell->productionSchedules()->count();
        // if ($schedulesCount > 0) {
        //     $dependencies['dependencies']['production_schedules'] = [
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

        return response()->json($dependencies);
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
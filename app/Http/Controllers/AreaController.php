<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Plant;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AreaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $query = Area::query()
            ->with(['plant'])
            ->withCount(['equipment', 'sectors']);

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(areas.name) LIKE ?', ["%{$search}%"])
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('plants')
                            ->whereColumn('plants.id', 'areas.plant_id')
                            ->whereRaw('LOWER(plants.name) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        if ($sort === 'plant') {
            $query->join('plants', 'areas.plant_id', '=', 'plants.id')
                ->orderBy('plants.name', $direction)
                ->select('areas.*');
        } else {
            $query->orderBy($sort, $direction);
        }

        $areas = $query->paginate(8);

        return Inertia::render('cadastro/areas', [
            'areas' => $areas,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $plants = Plant::all();
        
        return Inertia::render('cadastro/areas/create', [
            'plants' => $plants->map(function ($plant) {
                return [
                    'id' => $plant->id,
                    'name' => $plant->name,
                ];
            })->values()->all()
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'plant_id' => 'required|exists:plants,id'
        ]);

        $area = Area::create($validated);

        return redirect()->route('cadastro.areas')
            ->with('success', "A área {$area->name} foi criada com sucesso.");
    }

    /**
     * Display the specified resource.
     */
    public function show(Area $area)
    {
        // Carrega explicitamente o relacionamento com a planta
        $area->load('plant');

        $sectorsPage = request()->get('sectors_page', 1);
        $equipmentPage = request()->get('equipment_page', 1);
        $perPage = 10;

        // Busca os setores com contagem de equipamentos
        $sectorsQuery = $area->sectors()
            ->withCount('equipment')
            ->orderBy('name')
            ->get();

        // Pagina os setores usando array_slice
        $allSectors = $sectorsQuery->all();
        $sectorsOffset = ($sectorsPage - 1) * $perPage;
        $sectorsItems = array_slice($allSectors, $sectorsOffset, $perPage);
        
        $sectors = new \Illuminate\Pagination\LengthAwarePaginator(
            collect($sectorsItems),
            count($allSectors),
            $perPage,
            $sectorsPage,
            ['path' => request()->url(), 'pageName' => 'sectors_page']
        );

        // Busca os equipamentos
        $equipmentQuery = $area->equipment()
            ->with('equipmentType')
            ->orderBy('tag')
            ->get();

        // Pagina os equipamentos usando array_slice
        $allEquipment = $equipmentQuery->all();
        $equipmentOffset = ($equipmentPage - 1) * $perPage;
        $equipmentItems = array_slice($allEquipment, $equipmentOffset, $perPage);
        
        $equipment = new \Illuminate\Pagination\LengthAwarePaginator(
            collect($equipmentItems),
            count($allEquipment),
            $perPage,
            $equipmentPage,
            ['path' => request()->url(), 'pageName' => 'equipment_page']
        );

        // Conta o total de equipamentos (incluindo os dos setores)
        $totalEquipmentCount = $area->equipment()->count() + 
            $area->sectors()->withCount('equipment')->get()->sum('equipment_count');

        return Inertia::render('cadastro/areas/show', [
            'area' => [
                'id' => $area->id,
                'name' => $area->name,
                'plant' => [
                    'id' => $area->plant->id,
                    'name' => $area->plant->name,
                ],
            ],
            'sectors' => $sectors,
            'equipment' => $equipment,
            'totalEquipmentCount' => $totalEquipmentCount,
            'activeTab' => request()->get('tab', 'informacoes'),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Area $area)
    {
        return Inertia::render('cadastro/areas/edit', [
            'area' => $area->load(['plant']),
            'plants' => Plant::all()
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Area $area)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'plant_id' => 'required|exists:plants,id'
        ]);

        $area->update($validated);

        return redirect()->route('cadastro.areas')
            ->with('success', "A área {$area->name} foi atualizada com sucesso.");
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Area $area)
    {
        $areaName = $area->name;
        $area->delete();

        return back()->with('success', "A área {$areaName} foi excluída com sucesso.");
    }

    public function checkDependencies(Area $area)
    {
        $equipment = $area->equipment()->take(5)->get(['id', 'tag', 'name']);
        $totalEquipment = $area->equipment()->count();

        return response()->json([
            'can_delete' => $totalEquipment === 0,
            'dependencies' => [
                'equipment' => [
                    'total' => $totalEquipment,
                    'items' => $equipment
                ]
            ]
        ]);
    }
}

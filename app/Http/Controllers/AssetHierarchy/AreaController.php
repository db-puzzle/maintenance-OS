<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AreaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 8);
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

        switch ($sort) {
            case 'plant':
                $query->leftJoin('plants', 'areas.plant_id', '=', 'plants.id')
                    ->orderBy('plants.name', $direction);
                break;
            case 'equipment_count':
                $query->orderBy('equipment_count', $direction);
                break;
            case 'sectors_count':
                $query->orderBy('sectors_count', $direction);
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $areas = $query->paginate($perPage)->withQueryString();

        return Inertia::render('asset-hierarchy/areas', [
            'areas' => $areas,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $plants = Plant::all();
        
        return Inertia::render('asset-hierarchy/areas/create', [
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

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Área {$area->name} criada com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('asset-hierarchy.areas')
            ->with('success', "Área {$area->name} criada com sucesso.");
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

        // Parâmetros de ordenação para setores
        $sectorsSort = request()->get('sectors_sort', 'name');
        $sectorsDirection = request()->get('sectors_direction', 'asc');

        // Parâmetros de ordenação para equipamentos
        $equipmentSort = request()->get('equipment_sort', 'tag');
        $equipmentDirection = request()->get('equipment_direction', 'asc');

        // Busca os setores com contagem de equipamentos
        $sectorsQuery = $area->sectors()
            ->withCount('equipment')
            ->get();

        // Aplica ordenação personalizada para setores
        $sectorsQuery = $sectorsQuery->sort(function ($a, $b) use ($sectorsSort, $sectorsDirection) {
            $direction = $sectorsDirection === 'asc' ? 1 : -1;
            
            switch ($sectorsSort) {
                case 'name':
                    return strcmp($a->name, $b->name) * $direction;
                case 'equipment_count':
                    return (($a->equipment_count ?? 0) - ($b->equipment_count ?? 0)) * $direction;
                case 'description':
                    return strcmp($a->description ?? '', $b->description ?? '') * $direction;
                default:
                    return 0;
            }
        });

        // Pagina os setores
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
            ->get();

        // Aplica ordenação personalizada para equipamentos
        $equipmentQuery = $equipmentQuery->sort(function ($a, $b) use ($equipmentSort, $equipmentDirection) {
            $direction = $equipmentDirection === 'asc' ? 1 : -1;
            
            switch ($equipmentSort) {
                case 'tag':
                    return strcmp($a->tag, $b->tag) * $direction;
                case 'type':
                    return strcmp($a->equipmentType?->name ?? '', $b->equipmentType?->name ?? '') * $direction;
                case 'manufacturer':
                    return strcmp($a->manufacturer ?? '', $b->manufacturer ?? '') * $direction;
                case 'year':
                    return (($a->manufacturing_year ?? 0) - ($b->manufacturing_year ?? 0)) * $direction;
                default:
                    return 0;
            }
        });

        // Pagina os equipamentos
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

        return Inertia::render('asset-hierarchy/areas/show', [
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
            'filters' => [
                'sectors' => [
                    'sort' => $sectorsSort,
                    'direction' => $sectorsDirection,
                ],
                'equipment' => [
                    'sort' => $equipmentSort,
                    'direction' => $equipmentDirection,
                ],
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Area $area)
    {
        return Inertia::render('asset-hierarchy/areas/edit', [
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

        return redirect()->route('asset-hierarchy.areas')
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
        $equipment = $area->equipment()->take(5)->get(['id', 'tag', 'description']);
        $totalEquipment = $area->equipment()->count();

        $sectors = $area->sectors()->take(5)->get(['id', 'name']);
        $totalSectors = $area->sectors()->count();

        return response()->json([
            'can_delete' => $totalEquipment === 0 && $totalSectors === 0,
            'dependencies' => [
                'equipment' => [
                    'total' => $totalEquipment,
                    'items' => $equipment
                ],
                'sectors' => [
                    'total' => $totalSectors,
                    'items' => $sectors
                ]
            ]
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Plant;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PlantsController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $query = Plant::query()
            ->withCount('areas');

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(plants.name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(plants.street) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(plants.city) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(plants.state) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(plants.zip_code) LIKE ?', ["%{$search}%"]);
            });
        }

        if ($sort === 'areas_count') {
            $query->withCount('areas')
                ->orderBy('areas_count', $direction);
        } else {
            $query->orderBy($sort, $direction);
        }

        $plants = $query->paginate(8);

        return Inertia::render('cadastro/plantas', [
            'plants' => $plants,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/plantas/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'street' => 'nullable|string|max:255',
            'number' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:2',
            'zip_code' => 'nullable|string|max:9|regex:/^\d{5}-\d{3}$/',
            'gps_coordinates' => 'nullable|string|max:255',
        ]);

        $plant = Plant::create($validated);

        return redirect()->route('cadastro.plantas')
            ->with('success', "A planta {$plant->name} foi criada com sucesso.");
    }

    public function destroy(Plant $plant)
    {
        $plantName = $plant->name;
        $plant->delete();

        return back()->with('success', "A planta {$plantName} foi excluída com sucesso.");
    }

    public function checkDependencies(Plant $plant)
    {
        $areas = $plant->areas()->take(5)->get(['id', 'name']);
        $totalAreas = $plant->areas()->count();

        return response()->json([
            'can_delete' => $totalAreas === 0,
            'dependencies' => [
                'areas' => [
                    'total' => $totalAreas,
                    'items' => $areas
                ]
            ]
        ]);
    }

    public function edit(Plant $plant)
    {
        return Inertia::render('cadastro/plantas/edit', [
            'plant' => $plant
        ]);
    }

    public function update(Request $request, Plant $plant)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'street' => 'nullable|string|max:255',
            'number' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:2',
            'zip_code' => 'nullable|string|max:9|regex:/^\d{5}-\d{3}$/',
            'gps_coordinates' => 'nullable|string|max:255',
        ]);

        $plant->update($validated);

        return redirect()->route('cadastro.plantas')
            ->with('success', "A planta {$plant->name} foi atualizada com sucesso.");
    }

    public function show(Plant $plant)
    {
        // Busca a página atual para cada seção
        $areasPage = request()->get('areas_page', 1);
        $sectorsPage = request()->get('sectors_page', 1);
        $equipmentPage = request()->get('equipment_page', 1);
        $perPage = 10;

        // Busca as áreas com paginação
        $areasQuery = $plant->areas()
            ->orderBy('name')
            ->get();

        // Pagina as áreas usando array_slice
        $allAreas = $areasQuery->all();
        $areasOffset = ($areasPage - 1) * $perPage;
        $areasItems = array_slice($allAreas, $areasOffset, $perPage);
        
        $areas = new \Illuminate\Pagination\LengthAwarePaginator(
            collect($areasItems),
            count($allAreas),
            $perPage,
            $areasPage,
            ['path' => request()->url(), 'pageName' => 'areas_page']
        );

        // Conta o total de setores através das áreas
        $totalSectors = $plant->areas()
            ->withCount('sectors')
            ->get()
            ->sum('sectors_count');

        // Conta o total de equipamentos através das áreas e setores
        $totalEquipment = $plant->areas()
            ->with(['sectors' => function ($query) {
                $query->withCount('equipment');
            }])
            ->withCount(['equipment' => function ($query) {
                $query->whereNull('sector_id');
            }])
            ->get()
            ->map(function ($area) {
                $areaEquipmentCount = $area->equipment_count;
                $sectorsEquipmentCount = $area->sectors->sum('equipment_count');
                return $areaEquipmentCount + $sectorsEquipmentCount;
            })
            ->sum();

        // Busca os setores com suas áreas
        $sectorsQuery = $plant->areas()
            ->with(['sectors' => function ($query) {
                $query->withCount('equipment')
                    ->orderBy('name');
            }])
            ->get()
            ->pluck('sectors')
            ->flatten()
            ->map(function ($sector) {
                return [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'description' => $sector->description,
                    'equipment_count' => $sector->equipment_count,
                    'area' => [
                        'id' => $sector->area->id,
                        'name' => $sector->area->name,
                    ],
                ];
            })
            ->values();

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

        // Busca os equipamentos com suas áreas e setores
        $equipmentQuery = $plant->areas()
            ->with(['equipment.equipmentType', 'sectors.equipment.equipmentType'])
            ->get()
            ->flatMap(function ($area) {
                // Busca equipamentos que estão diretamente na área (sem setor)
                $areaEquipment = $area->equipment()
                    ->whereNull('sector_id')
                    ->get()
                    ->map(function ($item) use ($area) {
                        return [
                            'id' => $item->id,
                            'tag' => $item->tag,
                            'equipment_type' => $item->equipmentType ? [
                                'id' => $item->equipmentType->id,
                                'name' => $item->equipmentType->name,
                            ] : null,
                            'manufacturer' => $item->manufacturer,
                            'manufacturing_year' => $item->manufacturing_year,
                            'area_name' => $area->name,
                            'sector_name' => null,
                            'source' => 'area'
                        ];
                    });

                // Busca equipamentos que estão nos setores da área
                $sectorsEquipment = $area->sectors->flatMap(function ($sector) use ($area) {
                    return $sector->equipment->map(function ($item) use ($area, $sector) {
                        return [
                            'id' => $item->id,
                            'tag' => $item->tag,
                            'equipment_type' => $item->equipmentType ? [
                                'id' => $item->equipmentType->id,
                                'name' => $item->equipmentType->name,
                            ] : null,
                            'manufacturer' => $item->manufacturer,
                            'manufacturing_year' => $item->manufacturing_year,
                            'area_name' => $area->name,
                            'sector_name' => $sector->name,
                            'source' => 'sector'
                        ];
                    });
                });

                return $areaEquipment->concat($sectorsEquipment);
            })
            ->sortBy('tag')
            ->values();

        // Pagina os equipamentos usando array_slice para garantir a paginação correta
        $allEquipment = $equipmentQuery->all();
        $offset = ($equipmentPage - 1) * $perPage;
        $items = array_slice($allEquipment, $offset, $perPage);
        
        $equipment = new \Illuminate\Pagination\LengthAwarePaginator(
            collect($items),
            count($allEquipment),
            $perPage,
            $equipmentPage,
            ['path' => request()->url(), 'pageName' => 'equipment_page']
        );

        return Inertia::render('cadastro/plantas/show', [
            'plant' => $plant,
            'areas' => $areas,
            'sectors' => $sectors,
            'equipment' => $equipment,
            'totalSectors' => $totalSectors,
            'totalEquipment' => $totalEquipment,
            'activeTab' => request()->get('tab', 'informacoes'),
        ]);
    }
} 
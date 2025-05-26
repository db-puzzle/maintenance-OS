<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Plant;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PlantsController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 8);
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $query = Plant::query()
            ->withCount(['areas', 'asset'])
            ->with(['areas' => function ($query) {
                $query->withCount(['sectors', 'asset']);
            }]);

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(plants.name) LIKE ?', ["%{$search}%"]);
            });
        }

        $plants = $query->get()->map(function ($plant) {
            $totalSectors = $plant->areas->sum('sectors_count');
            $totalAsset = $plant->asset_count;

            return [
                'id' => $plant->id,
                'name' => $plant->name,
                'description' => $plant->description,
                'areas_count' => $plant->areas_count,
                'sectors_count' => $totalSectors,
                'asset_count' => $totalAsset,
                'created_at' => $plant->created_at,
                'updated_at' => $plant->updated_at,
            ];
        });

        // Aplicar ordenação
        $plants = $plants->sort(function ($a, $b) use ($sort, $direction) {
            $comparison = match($sort) {
                'name' => strcmp($a[$sort], $b[$sort]),
                'created_at', 'updated_at' => strtotime($a[$sort]) - strtotime($b[$sort]),
                default => $a[$sort] - $b[$sort]
            };
            
            return $direction === 'asc' ? $comparison : -$comparison;
        });

        // Paginar manualmente
        $total = $plants->count();
        $page = $request->input('page', 1);
        $items = $plants->forPage($page, $perPage)->values();
        
        $plants = new \Illuminate\Pagination\LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'pageName' => 'page']
        );

        return Inertia::render('asset-hierarchy/plantas', [
            'plants' => $plants,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('asset-hierarchy/plantas/create');
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

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Planta {$plant->name} criada com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('asset-hierarchy.plantas')
            ->with('success', "Planta {$plant->name} criada com sucesso.");
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

        $asset = $plant->asset()
            ->whereNull('area_id')
            ->whereNull('sector_id')
            ->take(5)
            ->get(['id', 'tag']);
        $totalAsset = $plant->asset()
            ->whereNull('area_id')
            ->whereNull('sector_id')
            ->count();

        return response()->json([
            'can_delete' => $totalAreas === 0 && $totalAsset === 0,
            'dependencies' => [
                'areas' => [
                    'total' => $totalAreas,
                    'items' => $areas
                ],
                'asset' => [
                    'total' => $totalAsset,
                    'items' => $asset
                ]
            ]
        ]);
    }

    public function edit(Plant $plant)
    {
        return Inertia::render('asset-hierarchy/plantas/edit', [
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

        return redirect()->route('asset-hierarchy.plantas')
            ->with('success', "A planta {$plant->name} foi atualizada com sucesso.");
    }

    public function show(Plant $plant)
    {
        // Busca a página atual e parâmetros de ordenação para cada seção
        $areasPage = request()->get('areas_page', 1);
        $sectorsPage = request()->get('sectors_page', 1);
        $assetPage = request()->get('asset_page', 1);
        $perPage = 10;

        // Parâmetros de ordenação para áreas
        $areasSort = request()->get('areas_sort', 'name');
        $areasDirection = request()->get('areas_direction', 'asc');

        // Parâmetros de ordenação para setores
        $sectorsSort = request()->get('sectors_sort', 'name');
        $sectorsDirection = request()->get('sectors_direction', 'asc');

        // Parâmetros de ordenação para ativos
        $assetSort = request()->get('asset_sort', 'tag');
        $assetDirection = request()->get('asset_direction', 'asc');

        // Busca as áreas com ordenação
        $areasQuery = $plant->areas()
            ->withCount(['asset', 'sectors'])
            ->orderBy('name');

        // Aplica ordenação personalizada para áreas
        switch ($areasSort) {
            case 'name':
                $areasQuery->orderBy('name', $areasDirection);
                break;
            case 'asset_count':
                $areasQuery->orderBy('asset_count', $areasDirection);
                break;
            case 'sectors_count':
                $areasQuery->orderBy('sectors_count', $areasDirection);
                break;
            default:
                $areasQuery->orderBy($areasSort, $areasDirection);
        }

        // Pagina as áreas
        $allAreas = $areasQuery->get();
        $areasOffset = ($areasPage - 1) * $perPage;
        $areasItems = array_slice($allAreas->all(), $areasOffset, $perPage);
        
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

        // Busca os setores com suas áreas
        $sectorsQuery = $plant->areas()
            ->with(['sectors' => function ($query) use ($sectorsSort, $sectorsDirection) {
                $query->withCount('asset');
            }])
            ->get()
            ->pluck('sectors')
            ->flatten()
            ->map(function ($sector) {
                return [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'description' => $sector->description,
                    'asset_count' => $sector->asset_count,
                    'area' => [
                        'id' => $sector->area->id,
                        'name' => $sector->area->name,
                    ],
                ];
            })
            ->values();

        // Aplica ordenação personalizada para setores
        $sectorsQuery = $sectorsQuery->sort(function ($a, $b) use ($sectorsSort, $sectorsDirection) {
            $direction = $sectorsDirection === 'asc' ? 1 : -1;
            
            switch ($sectorsSort) {
                case 'name':
                    return strcmp($a['name'], $b['name']) * $direction;
                case 'area':
                    return strcmp($a['area']['name'], $b['area']['name']) * $direction;
                case 'asset_count':
                    return (($a['asset_count'] ?? 0) - ($b['asset_count'] ?? 0)) * $direction;
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

        // Busca os ativos diretamente da planta
        $assetQuery = $plant->asset()
            ->with(['assetType', 'area', 'sector'])
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'tag' => $item->tag,
                    'asset_type' => $item->assetType ? [
                        'id' => $item->assetType->id,
                        'name' => $item->assetType->name,
                    ] : null,
                    'manufacturer' => $item->manufacturer,
                    'manufacturing_year' => $item->manufacturing_year,
                    'area_name' => $item->area ? $item->area->name : null,
                    'sector_name' => $item->sector ? $item->sector->name : null,
                ];
            })
            ->values();

        // Aplica ordenação personalizada para ativos
        $assetQuery = $assetQuery->sort(function ($a, $b) use ($assetSort, $assetDirection) {
            $direction = $assetDirection === 'asc' ? 1 : -1;
            
            switch ($assetSort) {
                case 'tag':
                    return strcmp($a['tag'], $b['tag']) * $direction;
                case 'type':
                    return strcmp($a['asset_type']['name'] ?? '', $b['asset_type']['name'] ?? '') * $direction;
                case 'location':
                    return strcmp($a['area_name'] . ($a['sector_name'] ? ' / ' . $a['sector_name'] : ''), 
                                $b['area_name'] . ($b['sector_name'] ? ' / ' . $b['sector_name'] : '')) * $direction;
                case 'manufacturer':
                    return strcmp($a['manufacturer'] ?? '', $b['manufacturer'] ?? '') * $direction;
                case 'year':
                    return (($a['manufacturing_year'] ?? 0) - ($b['manufacturing_year'] ?? 0)) * $direction;
                default:
                    return 0;
            }
        });

        // Pagina os ativos
        $allAsset = $assetQuery->all();
        $offset = ($assetPage - 1) * $perPage;
        $items = array_slice($allAsset, $offset, $perPage);
        
        $asset = new \Illuminate\Pagination\LengthAwarePaginator(
            collect($items),
            count($allAsset),
            $perPage,
            $assetPage,
            ['path' => request()->url(), 'pageName' => 'asset_page']
        );

        return Inertia::render('asset-hierarchy/plantas/show', [
            'plant' => $plant,
            'areas' => $areas,
            'sectors' => $sectors,
            'asset' => $asset,
            'totalSectors' => $totalSectors,
            'totalAsset' => $plant->asset_count,
            'activeTab' => request()->get('tab', 'informacoes'),
            'filters' => [
                'areas' => [
                    'sort' => $areasSort,
                    'direction' => $areasDirection,
                ],
                'sectors' => [
                    'sort' => $sectorsSort,
                    'direction' => $sectorsDirection,
                ],
                'asset' => [
                    'sort' => $assetSort,
                    'direction' => $assetDirection,
                ],
            ],
        ]);
    }
} 
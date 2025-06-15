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
            ->withCount(['asset', 'sectors']);

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
            case 'asset_count':
                $query->orderBy('asset_count', $direction);
                break;
            case 'sectors_count':
                $query->orderBy('sectors_count', $direction);
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $areas = $query->paginate($perPage)->withQueryString();

        $plants = Plant::all();

        return Inertia::render('asset-hierarchy/areas', [
            'areas' => $areas,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'plants' => $plants->map(function ($plant) {
                return [
                    'id' => $plant->id,
                    'name' => $plant->name,
                ];
            })->values()->all()
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
        // Check if JSON response is requested
        if (request()->input('format') === 'json' || request()->wantsJson()) {
            return response()->json([
                'area' => [
                    'id' => $area->id,
                    'name' => $area->name,
                    'description' => $area->description,
                    'plant_id' => $area->plant_id,
                    'created_at' => $area->created_at,
                    'updated_at' => $area->updated_at,
                ]
            ]);
        }

        // Carrega explicitamente o relacionamento com a planta
        $area->load('plant');

        $sectorsPage = request()->get('sectors_page', 1);
        $assetPage = request()->get('asset_page', 1);
        $perPage = 10;

        // Parâmetros de ordenação para setores
        $sectorsSort = request()->get('sectors_sort', 'name');
        $sectorsDirection = request()->get('sectors_direction', 'asc');

        // Parâmetros de ordenação para ativos
        $assetSort = request()->get('asset_sort', 'tag');
        $assetDirection = request()->get('asset_direction', 'asc');

        // Busca os setores com contagem de ativos
        $sectorsQuery = $area->sectors()
            ->withCount('asset')
            ->get();

        // Aplica ordenação personalizada para setores
        $sectorsQuery = $sectorsQuery->sort(function ($a, $b) use ($sectorsSort, $sectorsDirection) {
            $direction = $sectorsDirection === 'asc' ? 1 : -1;
            
            switch ($sectorsSort) {
                case 'name':
                    return strcmp($a->name, $b->name) * $direction;
                case 'asset_count':
                    return (($a->asset_count ?? 0) - ($b->asset_count ?? 0)) * $direction;
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

        // Busca os ativos
        $assetQuery = $area->asset()
            ->with('assetType')
            ->get();

        // Aplica ordenação personalizada para ativos
        $assetQuery = $assetQuery->sort(function ($a, $b) use ($assetSort, $assetDirection) {
            $direction = $assetDirection === 'asc' ? 1 : -1;
            
            switch ($assetSort) {
                case 'tag':
                    return strcmp($a->tag, $b->tag) * $direction;
                case 'type':
                    return strcmp($a->assetType?->name ?? '', $b->assetType?->name ?? '') * $direction;
                case 'manufacturer':
                    return strcmp($a->manufacturer ?? '', $b->manufacturer ?? '') * $direction;
                case 'year':
                    return (($a->manufacturing_year ?? 0) - ($b->manufacturing_year ?? 0)) * $direction;
                default:
                    return 0;
            }
        });

        // Pagina os ativos
        $allAsset = $assetQuery->all();
        $assetOffset = ($assetPage - 1) * $perPage;
        $assetItems = array_slice($allAsset, $assetOffset, $perPage);
        
        $asset = new \Illuminate\Pagination\LengthAwarePaginator(
            collect($assetItems),
            count($allAsset),
            $perPage,
            $assetPage,
            ['path' => request()->url(), 'pageName' => 'asset_page']
        );

        // Conta o total de ativos (incluindo os dos setores)
        $totalAssetCount = $area->asset()->count() + 
            $area->sectors()->withCount('asset')->get()->sum('asset_count');

        return Inertia::render('asset-hierarchy/areas/show', [
            'area' => [
                'id' => $area->id,
                'name' => $area->name,
                'plant' => [
                    'id' => $area->plant->id,
                    'name' => $area->plant->name,
                ],
            ],
            'plants' => Plant::all()->map(function ($plant) {
                return [
                    'id' => $plant->id,
                    'name' => $plant->name,
                ];
            })->values()->all(),
            'sectors' => $sectors,
            'asset' => $asset,
            'totalAssetCount' => $totalAssetCount,
            'activeTab' => request()->get('tab', 'informacoes'),
            'filters' => [
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

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Área {$area->name} atualizada com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
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
        $asset = $area->asset()->take(5)->get(['id', 'tag', 'description']);
        $totalAsset = $area->asset()->count();

        $sectors = $area->sectors()->take(5)->get(['id', 'name']);
        $totalSectors = $area->sectors()->count();

        $canDelete = $totalAsset === 0 && $totalSectors === 0;

        return response()->json([
            'can_delete' => $canDelete,
            'dependencies' => [
                'asset' => [
                    'total' => $totalAsset,
                    'items' => $asset
                ],
                'sectors' => [
                    'total' => $totalSectors,
                    'items' => $sectors
                ]
            ]
        ]);
    }
}

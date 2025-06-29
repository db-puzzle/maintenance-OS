<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SectorController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Sector::class);
        $perPage = $request->input('per_page', 8);
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $user = auth()->user();
        $query = Sector::query()
            ->with(['area.plant'])
            ->withCount('asset');

        // Filter sectors based on user permissions (unless administrator)
        if (!$user->isAdministrator()) {
            $query->where(function ($q) use ($user) {
                // Get all user permissions
                $permissions = $user->getAllPermissions()->pluck('name')->toArray();
                
                // Extract sector IDs from permissions
                $sectorIds = [];
                $areaIds = [];
                $plantIds = [];
                
                foreach ($permissions as $permission) {
                    // Direct sector permissions (sectors.view.123)
                    if (preg_match('/^sectors\.view\.(\d+)$/', $permission, $matches)) {
                        $sectorIds[] = $matches[1];
                    }
                    // Sector-scoped permissions (*.sector.123)
                    elseif (preg_match('/\.sector\.(\d+)$/', $permission, $matches)) {
                        $sectorIds[] = $matches[1];
                    }
                    // Area permissions - sectors belong to areas
                    elseif (preg_match('/^areas\.\w+\.(\d+)$/', $permission, $matches)) {
                        $areaIds[] = $matches[1];
                    }
                    // Plant permissions - need to find sectors through areas
                    elseif (preg_match('/^plants\.\w+\.(\d+)$/', $permission, $matches)) {
                        $plantIds[] = $matches[1];
                    }
                    // Plant-scoped permissions
                    elseif (preg_match('/\.plant\.(\d+)$/', $permission, $matches)) {
                        $plantIds[] = $matches[1];
                    }
                }
                
                // Remove duplicates
                $sectorIds = array_unique($sectorIds);
                $areaIds = array_unique($areaIds);
                $plantIds = array_unique($plantIds);
                
                // Build query conditions
                $q->where(function ($query) use ($sectorIds, $areaIds, $plantIds) {
                    if (!empty($sectorIds)) {
                        $query->orWhereIn('id', $sectorIds);
                    }
                    if (!empty($areaIds)) {
                        $query->orWhereIn('area_id', $areaIds);
                    }
                    if (!empty($plantIds)) {
                        $query->orWhereHas('area', function ($q) use ($plantIds) {
                            $q->whereIn('plant_id', $plantIds);
                        });
                    }
                });
                
                // If user has no relevant permissions, show nothing
                if (empty($sectorIds) && empty($areaIds) && empty($plantIds)) {
                    $q->whereRaw('1 = 0');
                }
            });
        }

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(sectors.name) LIKE ?', ["%{$search}%"])
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('plants')
                            ->join('areas', 'areas.plant_id', '=', 'plants.id')
                            ->whereColumn('areas.id', 'sectors.area_id')
                            ->whereRaw('LOWER(plants.name) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        switch ($sort) {
            case 'area':
                $query->join('areas', 'sectors.area_id', '=', 'areas.id')
                    ->orderBy('areas.name', $direction)
                    ->select('sectors.*');
                break;
            case 'plant':
                $query->join('areas', 'sectors.area_id', '=', 'areas.id')
                    ->join('plants', 'areas.plant_id', '=', 'plants.id')
                    ->orderBy('plants.name', $direction)
                    ->select('sectors.*');
                break;
            case 'asset_count':
                $query->orderBy('asset_count', $direction);
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $sectors = $query->paginate($perPage)->withQueryString();

        // Filter plants based on user permissions for the dropdown
        $plantsQuery = Plant::with('areas');
        
        if (!$user->isAdministrator()) {
            $permissions = $user->getAllPermissions()->pluck('name')->toArray();
            $allowedPlantIds = [];
            
            foreach ($permissions as $permission) {
                // Direct plant permissions
                if (preg_match('/^plants\.\w+\.(\d+)$/', $permission, $matches)) {
                    $allowedPlantIds[] = $matches[1];
                }
                // Plant-scoped permissions
                elseif (preg_match('/\.plant\.(\d+)$/', $permission, $matches)) {
                    $allowedPlantIds[] = $matches[1];
                }
                // Area permissions - get the plant through area
                elseif (preg_match('/^areas\.\w+\.(\d+)$/', $permission, $matches)) {
                    $area = \App\Models\AssetHierarchy\Area::find($matches[1]);
                    if ($area) {
                        $allowedPlantIds[] = $area->plant_id;
                    }
                }
            }
            
            $allowedPlantIds = array_unique($allowedPlantIds);
            if (!empty($allowedPlantIds)) {
                $plantsQuery->whereIn('id', $allowedPlantIds);
            } else {
                $plantsQuery->whereRaw('1 = 0');
            }
        }
        
        $plants = $plantsQuery->get();

        return Inertia::render('asset-hierarchy/sectors/index', [
            'sectors' => $sectors,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'plants' => $plants,
        ]);
    }

    public function create()
    {
        $this->authorize('create', Sector::class);
        $plants = Plant::with('areas')->get();

        return Inertia::render('asset-hierarchy/sectors/create', [
            'plants' => $plants,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Sector::class);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'area_id' => 'required|exists:areas,id',
        ]);

        // Additional check: user must have permission to create sectors in this specific area
        $user = auth()->user();
        if (!$user->isAdministrator()) {
            $area = \App\Models\AssetHierarchy\Area::findOrFail($validated['area_id']);
            $hasAreaPermission = $user->can("sectors.create.area.{$area->id}");
            $hasPlantPermission = $user->can("sectors.create.plant.{$area->plant_id}");
            
            if (!$hasAreaPermission && !$hasPlantPermission && !$user->can('system.create-sectors')) {
                abort(403, 'You do not have permission to create sectors in this area.');
            }
        }

        $sector = Sector::create($validated);

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Setor {$sector->name} criado com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('asset-hierarchy.sectors')
            ->with('success', "Setor {$sector->name} criado com sucesso.");
    }

    public function edit(Sector $setor)
    {
        $this->authorize('update', $setor);
        $plants = Plant::with('areas')->get();

        return Inertia::render('asset-hierarchy/sectors/edit', [
            'sector' => $setor->load('area.plant'),
            'plants' => $plants,
        ]);
    }

    public function show(Sector $setor)
    {
        $this->authorize('view', $setor);
        // Check if JSON response is requested
        if (request()->input('format') === 'json' || request()->wantsJson()) {
            return response()->json([
                'sector' => [
                    'id' => $setor->id,
                    'name' => $setor->name,
                    'description' => $setor->description,
                    'area_id' => $setor->area_id,
                    'created_at' => $setor->created_at,
                    'updated_at' => $setor->updated_at,
                ],
            ]);
        }

        $setor->load(['area.plant']);

        // Busca a página atual e parâmetros de ordenação para ativos
        $assetPage = request()->get('asset_page', 1);
        $perPage = 10;
        $assetSort = request()->get('asset_sort', 'tag');
        $assetDirection = request()->get('asset_direction', 'asc');

        // Busca os ativos com ordenação
        $assetQuery = $setor->asset()
            ->with('assetType')
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
        $assetOffset = ($assetPage - 1) * $perPage;
        $assetItems = array_slice($allAsset, $assetOffset, $perPage);

        $asset = new \Illuminate\Pagination\LengthAwarePaginator(
            collect($assetItems),
            count($allAsset),
            $perPage,
            $assetPage,
            ['path' => request()->url(), 'pageName' => 'asset_page']
        );

        return Inertia::render('asset-hierarchy/sectors/show', [
            'sector' => $setor,
            'plants' => Plant::with('areas')->get()->map(function ($plant) {
                return [
                    'id' => $plant->id,
                    'name' => $plant->name,
                    'areas' => $plant->areas->map(function ($area) {
                        return [
                            'id' => $area->id,
                            'name' => $area->name,
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
            'asset' => $asset,
            'activeTab' => request()->get('tab', 'informacoes'),
            'filters' => [
                'asset' => [
                    'sort' => $assetSort,
                    'direction' => $assetDirection,
                ],
            ],
        ]);
    }

    public function update(Request $request, Sector $setor)
    {
        $this->authorize('update', $setor);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'area_id' => 'required|exists:areas,id',
            'description' => 'nullable|string',
        ]);

        $setor->update($validated);

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Setor {$setor->name} atualizado com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('asset-hierarchy.sectors')
            ->with('success', "O setor {$setor->name} foi atualizado com sucesso.");
    }

    public function destroy(Sector $setor)
    {
        $this->authorize('delete', $setor);
        if ($setor->asset()->exists()) {
            return back()->with('error', 'Não é possível excluir um setor que possui ativos.');
        }

        $setorName = $setor->name;
        $setor->delete();

        return back()->with('success', "O setor {$setorName} foi excluído com sucesso.");
    }

    public function checkDependencies(Sector $setor)
    {
        $asset = $setor->asset()->take(5)->get(['id', 'tag', 'description']);
        $totalAsset = $setor->asset()->count();

        $canDelete = $totalAsset === 0;

        return response()->json([
            'can_delete' => $canDelete,
            'dependencies' => [
                'asset' => [
                    'total' => $totalAsset,
                    'items' => $asset,
                ],
            ],
        ]);
    }
}

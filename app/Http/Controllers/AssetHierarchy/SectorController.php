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
        $perPage = $request->input('per_page', 8);
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $query = Sector::query()
            ->with(['area.plant'])
            ->withCount('asset');

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

        $plants = Plant::with('areas')->get();

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
        $plants = Plant::with('areas')->get();

        return Inertia::render('asset-hierarchy/sectors/create', [
            'plants' => $plants,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'area_id' => 'required|exists:areas,id',
        ]);

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
        $plants = Plant::with('areas')->get();

        return Inertia::render('asset-hierarchy/sectors/edit', [
            'sector' => $setor->load('area.plant'),
            'plants' => $plants,
        ]);
    }

    public function show(Sector $setor)
    {
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

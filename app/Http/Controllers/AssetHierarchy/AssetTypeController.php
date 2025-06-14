<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\AssetType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetTypeController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 8);
        $sort = $request->sort ?? 'name';
        $direction = $request->direction === 'desc' ? 'desc' : 'asc';

        $assetTypes = AssetType::query()
            ->withCount('asset')
            ->when($request->search, function ($query, $search) {
                $query->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($search) . '%']);
            })
            ->when($sort, function ($query) use ($sort, $direction) {
                switch ($sort) {
                    case 'name':
                        $query->orderBy('name', $direction);
                        break;
                    case 'description':
                        $query->orderBy('description', $direction);
                        break;
                    case 'asset_count':
                        $query->orderBy('asset_count', $direction);
                        break;
                    default:
                        $query->orderBy('name', 'asc');
                }
            }, function ($query) {
                $query->orderBy('name', 'asc');
            })
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('asset-hierarchy/tipos-ativo', [
            'assetTypes' => $assetTypes,
            'filters' => [
                'search' => $request->search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ]
        ]);
    }

    public function create()
    {
        return Inertia::render('asset-hierarchy/tipos-ativo/create');
    }

    public function show(AssetType $assetType)
    {
        if (!$assetType->exists) {
            abort(404);
        }

        // If this is a JSON request (for edit functionality), return just the asset type data
        if (request()->expectsJson() || request()->get('format') === 'json') {
            return response()->json([
                'assetType' => [
                    'id' => $assetType->id,
                    'name' => $assetType->name,
                    'description' => $assetType->description,
                ]
            ]);
        }

        // Busca a página atual para ativos
        $assetPage = request()->get('asset_page', 1);
        $perPage = 10;

        // Busca os ativos
        $assetQuery = $assetType->asset()
            ->with(['area:id,name', 'assetType:id,name'])
            ->orderBy('tag')
            ->get();

        // Pagina os ativos usando array_slice
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

        return Inertia::render('asset-hierarchy/tipos-ativo/show', [
            'assetType' => $assetType,
            'asset' => $asset,
            'activeTab' => request()->get('tab', 'informacoes'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:asset_types',
            'description' => 'nullable|string',
        ]);

        $assetType = AssetType::create($validated);

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Tipo de ativo {$assetType->name} criado com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('asset-hierarchy.tipos-ativo')
            ->with('success', "Tipo de ativo {$assetType->name} criado com sucesso.");
    }

    public function edit(AssetType $assetType)
    {
        if (!$assetType->exists) {
            abort(404);
        }

        return Inertia::render('asset-hierarchy/tipos-ativo/edit', [
            'assetType' => $assetType,
        ]);
    }

    public function update(Request $request, AssetType $assetType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:asset_types,name,' . $assetType->id,
            'description' => 'nullable|string',
        ]);

        $assetType->update($validated);

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Tipo de ativo {$assetType->name} atualizado com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('asset-hierarchy.tipos-ativo')
            ->with('success', "O tipo de ativo {$assetType->name} foi atualizado com sucesso.");
    }

    public function destroy(AssetType $assetType)
    {
        $assetTypeName = $assetType->name;
        $assetType->delete();

        return back()->with('success', "O tipo de ativo {$assetTypeName} foi excluído com sucesso.");
    }

    public function checkDependencies(AssetType $assetType)
    {
        $asset = $assetType->asset()->take(5)->get(['id', 'tag', 'description']);
        $totalAsset = $assetType->asset()->count();

        $canDelete = $totalAsset === 0;

        return response()->json([
            'can_delete' => $canDelete,
            'dependencies' => [
                'asset' => [
                    'total' => $totalAsset,
                    'items' => $asset
                ]
            ]
        ]);
    }
} 
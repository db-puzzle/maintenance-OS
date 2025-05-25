<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\EquipmentType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EquipmentTypeController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 8);
        $sort = $request->sort ?? 'name';
        $direction = $request->direction === 'desc' ? 'desc' : 'asc';

        $equipmentTypes = EquipmentType::query()
            ->withCount('equipment')
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
                    case 'equipment_count':
                        $query->orderBy('equipment_count', $direction);
                        break;
                    default:
                        $query->orderBy('name', 'asc');
                }
            }, function ($query) {
                $query->orderBy('name', 'asc');
            })
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('asset-hierarchy/tipos-equipamento', [
            'equipmentTypes' => $equipmentTypes,
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
        return Inertia::render('asset-hierarchy/tipos-equipamento/create');
    }

    public function show(EquipmentType $equipmentType)
    {
        if (!$equipmentType->exists) {
            abort(404);
        }

        // Busca a página atual para equipamentos
        $equipmentPage = request()->get('equipment_page', 1);
        $perPage = 10;

        // Busca os equipamentos
        $equipmentQuery = $equipmentType->equipment()
            ->with(['area:id,name', 'equipmentType:id,name'])
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

        return Inertia::render('asset-hierarchy/tipos-equipamento/show', [
            'equipmentType' => $equipmentType,
            'equipment' => $equipment,
            'activeTab' => request()->get('tab', 'informacoes'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:equipment_types',
            'description' => 'nullable|string',
        ]);

        $equipmentType = EquipmentType::create($validated);

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Tipo de equipamento {$equipmentType->name} criado com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('asset-hierarchy.tipos-equipamento')
            ->with('success', "Tipo de equipamento {$equipmentType->name} criado com sucesso.");
    }

    public function edit(EquipmentType $equipmentType)
    {
        if (!$equipmentType->exists) {
            abort(404);
        }

        return Inertia::render('asset-hierarchy/tipos-equipamento/edit', [
            'equipmentType' => $equipmentType,
        ]);
    }

    public function update(Request $request, EquipmentType $equipmentType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:equipment_types,name,' . $equipmentType->id,
            'description' => 'nullable|string',
        ]);

        $equipmentType->update($validated);

        return redirect()->route('asset-hierarchy.tipos-equipamento')
            ->with('success', "O tipo de equipamento {$equipmentType->name} foi atualizado com sucesso.");
    }

    public function destroy(EquipmentType $equipmentType)
    {
        $equipmentTypeName = $equipmentType->name;
        $equipmentType->delete();

        return back()->with('success', "O tipo de equipamento {$equipmentTypeName} foi excluído com sucesso.");
    }

    public function checkDependencies(EquipmentType $equipmentType)
    {
        $equipment = $equipmentType->equipment()->take(5)->get(['id', 'tag', 'description']);
        $totalEquipment = $equipmentType->equipment()->count();

        return response()->json([
            'hasDependencies' => $totalEquipment > 0,
            'equipment' => $equipment,
            'totalEquipment' => $totalEquipment,
        ]);
    }
} 
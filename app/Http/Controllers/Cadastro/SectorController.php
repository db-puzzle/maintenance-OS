<?php

namespace App\Http\Controllers\Cadastro;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Sector;
use App\Models\Plant;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SectorController extends Controller
{
    public function index(Request $request)
    {
        $perPage = 8;
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $query = Sector::query()
            ->with(['area.plant'])
            ->withCount('equipment');

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(sectors.name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(sectors.description) LIKE ?', ["%{$search}%"])
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
            case 'equipment_count':
                $query->orderBy('equipment_count', $direction);
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $sectors = $query->paginate($perPage)->withQueryString();

        return Inertia::render('cadastro/setores', [
            'sectors' => $sectors,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create()
    {
        $plants = Plant::with('areas')->get();
        return Inertia::render('cadastro/setores/create', [
            'plants' => $plants
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'area_id' => 'required|exists:areas,id'
        ]);

        $sector = Sector::create($validated);

        return redirect()->route('cadastro.setores')
            ->with('success', "Setor {$sector->name} criado com sucesso.");
    }

    public function edit(Sector $setor)
    {
        $plants = Plant::with('areas')->get();
        return Inertia::render('cadastro/setores/edit', [
            'sector' => $setor->load('area.plant'),
            'plants' => $plants
        ]);
    }

    public function show(Sector $setor)
    {
        $setor->load(['area.plant']);
        
        // Busca a página atual e parâmetros de ordenação para equipamentos
        $equipmentPage = request()->get('equipment_page', 1);
        $perPage = 10;
        $equipmentSort = request()->get('equipment_sort', 'tag');
        $equipmentDirection = request()->get('equipment_direction', 'asc');

        // Busca os equipamentos com ordenação
        $equipmentQuery = $setor->equipment()
            ->with('equipmentType')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'tag' => $item->tag,
                    'equipment_type' => $item->equipmentType ? [
                        'id' => $item->equipmentType->id,
                        'name' => $item->equipmentType->name,
                    ] : null,
                    'manufacturer' => $item->manufacturer,
                    'manufacturing_year' => $item->manufacturing_year,
                ];
            })
            ->values();

        // Aplica ordenação personalizada para equipamentos
        $equipmentQuery = $equipmentQuery->sort(function ($a, $b) use ($equipmentSort, $equipmentDirection) {
            $direction = $equipmentDirection === 'asc' ? 1 : -1;
            
            switch ($equipmentSort) {
                case 'tag':
                    return strcmp($a['tag'], $b['tag']) * $direction;
                case 'type':
                    return strcmp($a['equipment_type']['name'] ?? '', $b['equipment_type']['name'] ?? '') * $direction;
                case 'manufacturer':
                    return strcmp($a['manufacturer'] ?? '', $b['manufacturer'] ?? '') * $direction;
                case 'year':
                    return (($a['manufacturing_year'] ?? 0) - ($b['manufacturing_year'] ?? 0)) * $direction;
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

        return Inertia::render('cadastro/setores/show', [
            'sector' => $setor,
            'equipment' => $equipment,
            'activeTab' => request()->get('tab', 'informacoes'),
            'filters' => [
                'equipment' => [
                    'sort' => $equipmentSort,
                    'direction' => $equipmentDirection,
                ],
            ],
        ]);
    }

    public function update(Request $request, Sector $setor)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'area_id' => 'required|exists:areas,id'
        ]);

        $setor->update($validated);

        return redirect()->route('cadastro.setores')
            ->with('success', "O setor {$setor->name} foi atualizado com sucesso.");
    }

    public function destroy(Sector $setor)
    {
        if ($setor->equipment()->exists()) {
            return back()->with('error', 'Não é possível excluir um setor que possui equipamentos.');
        }

        $setorName = $setor->name;
        $setor->delete();

        return back()->with('success', "O setor {$setorName} foi excluído com sucesso.");
    }

    public function checkDependencies(Sector $setor)
    {
        $equipment = $setor->equipment()->take(5)->get(['id', 'tag', 'description']);
        $totalEquipment = $setor->equipment()->count();

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
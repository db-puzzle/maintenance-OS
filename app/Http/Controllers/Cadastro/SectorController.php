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

        if ($sort === 'area') {
            $query->join('areas', 'sectors.area_id', '=', 'areas.id')
                ->orderBy('areas.name', $direction)
                ->select('sectors.*');
        } else if ($sort === 'plant') {
            $query->join('areas', 'sectors.area_id', '=', 'areas.id')
                ->join('plants', 'areas.plant_id', '=', 'plants.id')
                ->orderBy('plants.name', $direction)
                ->select('sectors.*');
        } else {
            $query->orderBy($sort, $direction);
        }

        $sectors = $query->paginate(8);

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

        Sector::create($validated);

        return redirect()->route('cadastro.setores')
            ->with('success', 'Setor criado com sucesso.');
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
        return Inertia::render('cadastro/setores/show', [
            'sector' => $setor->load(['area.plant', 'equipment.equipmentType'])
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
            ->with('success', 'Setor atualizado com sucesso.');
    }

    public function destroy(Sector $setor)
    {
        if ($setor->equipment()->exists()) {
            return redirect()->route('cadastro.setores')
                ->with('error', 'Não é possível excluir um setor que possui equipamentos.');
        }

        $setor->delete();

        return redirect()->route('cadastro.setores')
            ->with('success', 'Setor excluído com sucesso.');
    }
} 
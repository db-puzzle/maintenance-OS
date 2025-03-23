<?php

namespace App\Http\Controllers\Cadastro;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Sector;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SectorController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $sectors = Sector::query()
            ->with(['area.plant'])
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('area.plant', function ($query) use ($search) {
                            $query->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($sort === 'area', function ($query) use ($direction) {
                $query->join('areas', 'sectors.area_id', '=', 'areas.id')
                    ->orderBy('areas.name', $direction)
                    ->select('sectors.*');
            })
            ->when($sort === 'plant', function ($query) use ($direction) {
                $query->join('areas', 'sectors.area_id', '=', 'areas.id')
                    ->join('plants', 'areas.plant_id', '=', 'plants.id')
                    ->orderBy('plants.name', $direction)
                    ->select('sectors.*');
            })
            ->when(!in_array($sort, ['area', 'plant']), function ($query) use ($sort, $direction) {
                $query->orderBy($sort, $direction);
            })
            ->paginate(8);

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
        $areas = Area::with('plant')->get();
        return Inertia::render('cadastro/setores/create', [
            'areas' => $areas
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
        $areas = Area::with('plant')->get();
        return Inertia::render('cadastro/setores/edit', [
            'sector' => $setor->load('area.plant'),
            'areas' => $areas
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
<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Machine;
use App\Models\MachineType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MachineController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'tag');
        $direction = $request->input('direction', 'asc');

        $machines = Machine::query()
            ->with(['machineType:id,name', 'area:id,name'])
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('tag', 'like', "%{$search}%")
                        ->orWhere('nickname', 'like', "%{$search}%")
                        ->orWhere('manufacturer', 'like', "%{$search}%");
                });
            })
            ->when($sort === 'machine_type', function ($query) use ($direction) {
                $query->join('machine_types', 'machines.machine_type_id', '=', 'machine_types.id')
                    ->orderBy('machine_types.name', $direction)
                    ->select('machines.*');
            })
            ->when($sort === 'area', function ($query) use ($direction) {
                $query->join('areas', 'machines.area_id', '=', 'areas.id')
                    ->orderBy('areas.name', $direction)
                    ->select('machines.*');
            })
            ->when(!in_array($sort, ['machine_type', 'area']), function ($query) use ($sort, $direction) {
                $query->orderBy($sort, $direction);
            })
            ->paginate(8);

        \Log::info('Machines data:', ['machines' => $machines->toArray()]);

        return Inertia::render('cadastro/maquinas', [
            'machines' => $machines,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/maquinas/create', [
            'machineTypes' => MachineType::all(),
            'areas' => Area::all()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tag' => 'required|string|max:255',
            'machine_type_id' => 'required|exists:machine_types,id',
            'description' => 'nullable|string',
            'nickname' => 'nullable|string|max:255',
            'manufacturer' => 'nullable|string|max:255',
            'manufacturing_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'area_id' => 'required|exists:areas,id'
        ]);

        $machine = Machine::create($validated);

        return redirect()->route('cadastro.maquinas')
            ->with('success', "A máquina {$machine->tag} foi criada com sucesso.");
    }

    public function edit(Machine $machine)
    {
        return Inertia::render('cadastro/maquinas/edit', [
            'machine' => $machine->load(['machineType', 'area']),
            'machineTypes' => MachineType::all(),
            'areas' => Area::all()
        ]);
    }

    public function update(Request $request, Machine $machine)
    {
        $validated = $request->validate([
            'tag' => 'required|string|max:255',
            'machine_type_id' => 'required|exists:machine_types,id',
            'description' => 'nullable|string',
            'nickname' => 'nullable|string|max:255',
            'manufacturer' => 'nullable|string|max:255',
            'manufacturing_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'area_id' => 'required|exists:areas,id'
        ]);

        $machine->update($validated);

        return redirect()->route('cadastro.maquinas')
            ->with('success', "A máquina {$machine->tag} foi atualizada com sucesso.");
    }

    public function destroy(Machine $machine)
    {
        $machineTag = $machine->tag;
        $machine->delete();

        return back()->with('success', "A máquina {$machineTag} foi excluída com sucesso.");
    }
} 
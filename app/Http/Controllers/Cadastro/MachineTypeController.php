<?php

namespace App\Http\Controllers\Cadastro;

use App\Http\Controllers\Controller;
use App\Models\MachineType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MachineTypeController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $machineTypes = MachineType::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderBy($sort, $direction)
            ->paginate(8);

        return Inertia::render('cadastro/tipos-maquina', [
            'machineTypes' => $machineTypes,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/tipos-maquina/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $machineType = MachineType::create($validated);

        return redirect()->route('cadastro.tipos-maquina')
            ->with('success', "O tipo de máquina {$machineType->name} foi criado com sucesso.");
    }

    public function edit(MachineType $machineType)
    {
        if (!$machineType->exists) {
            abort(404);
        }

        return Inertia::render('cadastro/tipos-maquina/edit', [
            'machineType' => $machineType,
        ]);
    }

    public function update(Request $request, MachineType $machineType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $machineType->update($validated);

        return redirect()->route('cadastro.tipos-maquina')
            ->with('success', "O tipo de máquina {$machineType->name} foi atualizado com sucesso.");
    }

    public function destroy(MachineType $machineType)
    {
        $machineTypeName = $machineType->name;
        $machineType->delete();

        return back()->with('success', "O tipo de máquina {$machineTypeName} foi excluído com sucesso.");
    }

    public function checkDependencies(MachineType $machineType)
    {
        $machines = $machineType->machines()->take(5)->get(['id', 'tag', 'name']);
        $totalMachines = $machineType->machines()->count();

        return response()->json([
            'can_delete' => $totalMachines === 0,
            'dependencies' => [
                'machines' => [
                    'total' => $totalMachines,
                    'items' => $machines
                ]
            ]
        ]);
    }
} 
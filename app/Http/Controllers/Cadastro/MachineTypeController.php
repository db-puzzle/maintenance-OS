<?php

namespace App\Http\Controllers\Cadastro;

use App\Http\Controllers\Controller;
use App\Models\MachineType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class MachineTypeController extends Controller
{
    public function index(Request $request)
    {
        Log::info('MachineTypeController@index called');
        $search = $request->input('search');

        $machineTypes = MachineType::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->paginate(8);

        Log::info('Machine types:', ['count' => $machineTypes->count(), 'data' => $machineTypes->toArray()]);

        return Inertia::render('cadastro/tipos-maquina', [
            'machineTypes' => $machineTypes,
            'filters' => [
                'search' => $search,
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
        Log::info('MachineTypeController@edit called', [
            'machineType' => $machineType->toArray(),
            'request' => request()->all(),
            'route' => request()->route()->parameters(),
            'id' => $machineType->id
        ]);

        if (!$machineType->exists) {
            Log::error('MachineType not found', [
                'id' => request()->route('machineType')
            ]);
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

        return redirect()->route('cadastro.tipos-maquina')
            ->with('success', "O tipo de máquina {$machineTypeName} foi excluído com sucesso.");
    }
} 
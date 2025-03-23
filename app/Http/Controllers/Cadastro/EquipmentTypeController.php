<?php

namespace App\Http\Controllers\Cadastro;

use App\Http\Controllers\Controller;
use App\Models\EquipmentType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EquipmentTypeController extends Controller
{
    public function index(Request $request)
    {
        $equipmentTypes = EquipmentType::query()
            ->when($request->search, function ($query, $search) {
                $query->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($search) . '%']);
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('cadastro/tipos-equipamento', [
            'equipmentTypes' => $equipmentTypes,
            'filters' => $request->only(['search'])
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/tipos-equipamento/create');
    }

    public function show(EquipmentType $equipmentType)
    {
        if (!$equipmentType->exists) {
            abort(404);
        }

        $equipmentType->load(['equipment' => function ($query) {
            $query->select('id', 'tag', 'area_id', 'manufacturer', 'manufacturing_year')
                  ->with(['area:id,name']);
        }]);

        return Inertia::render('cadastro/tipos-equipamento/show', [
            'equipmentType' => $equipmentType,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:equipment_types',
            'description' => 'nullable|string',
        ]);

        $equipmentType = EquipmentType::create($validated);

        return redirect()->route('cadastro.tipos-equipamento')
            ->with('success', "O tipo de equipamento {$equipmentType->name} foi criado com sucesso.");
    }

    public function edit(EquipmentType $equipmentType)
    {
        if (!$equipmentType->exists) {
            abort(404);
        }

        return Inertia::render('cadastro/tipos-equipamento/edit', [
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

        return redirect()->route('cadastro.tipos-equipamento')
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
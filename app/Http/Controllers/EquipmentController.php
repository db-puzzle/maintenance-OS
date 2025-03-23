<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Equipment;
use App\Models\MachineType;
use App\Models\Plant;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'tag');
        $direction = $request->input('direction', 'asc');

        $query = Equipment::query()
            ->with(['machineType:id,name', 'area.plant:id,name', 'sector:id,name']);

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(equipment.tag) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(equipment.manufacturer) LIKE ?', ["%{$search}%"])
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('plants')
                            ->join('areas', 'areas.plant_id', '=', 'plants.id')
                            ->whereColumn('areas.id', 'equipment.area_id')
                            ->whereRaw('LOWER(plants.name) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        if ($sort === 'machine_type') {
            $query->join('machine_types', 'equipment.machine_type_id', '=', 'machine_types.id')
                ->orderBy('machine_types.name', $direction)
                ->select('equipment.*');
        } else if ($sort === 'sector') {
            $query->join('sectors', 'equipment.sector_id', '=', 'sectors.id')
                ->orderBy('sectors.name', $direction)
                ->select('equipment.*');
        } else if ($sort === 'area') {
            $query->join('areas', 'equipment.area_id', '=', 'areas.id')
                ->orderBy('areas.name', $direction)
                ->select('equipment.*');
        } else if ($sort === 'plant') {
            $query->join('areas', 'equipment.area_id', '=', 'areas.id')
                ->join('plants', 'areas.plant_id', '=', 'plants.id')
                ->orderBy('plants.name', $direction)
                ->select('equipment.*');
        } else {
            $query->orderBy($sort, $direction);
        }

        $equipment = $query->paginate(8);

        return Inertia::render('cadastro/equipamentos', [
            'equipment' => $equipment,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/equipamentos/create', [
            'machineTypes' => MachineType::all(),
            'plants' => Plant::with(['areas' => function($query) {
                $query->select('id', 'name', 'plant_id');
            }, 'areas.sectors' => function($query) {
                $query->select('id', 'name', 'area_id');
            }])->get()->map(function ($plant) {
                return [
                    'id' => $plant->id,
                    'name' => $plant->name,
                    'areas' => $plant->areas->map(function ($area) {
                        return [
                            'id' => $area->id,
                            'name' => $area->name,
                            'sectors' => $area->sectors
                        ];
                    })
                ];
            })
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tag' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'machine_type_id' => 'required|exists:machine_types,id',
            'description' => 'nullable|string',
            'manufacturer' => 'nullable|string|max:255',
            'manufacturing_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'area_id' => 'required|exists:areas,id',
            'sector_id' => 'nullable|exists:sectors,id',
            'photo' => 'nullable|image|max:2048'
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('equipment-photos', 'public');
            $validated['photo_path'] = $path;
        }

        $equipment = Equipment::create($validated);

        return redirect()->route('cadastro.equipamentos')
            ->with('success', "O equipamento {$equipment->tag} foi criado com sucesso.");
    }

    public function edit(Equipment $equipment)
    {
        return Inertia::render('cadastro/equipamentos/edit', [
            'equipment' => $equipment->load(['machineType', 'area.plant', 'sector']),
            'machineTypes' => MachineType::all(),
            'plants' => Plant::with(['areas' => function($query) {
                $query->select('id', 'name', 'plant_id');
            }, 'areas.sectors' => function($query) {
                $query->select('id', 'name', 'area_id');
            }])->get()->map(function ($plant) {
                return [
                    'id' => $plant->id,
                    'name' => $plant->name,
                    'areas' => $plant->areas->map(function ($area) {
                        return [
                            'id' => $area->id,
                            'name' => $area->name,
                            'sectors' => $area->sectors
                        ];
                    })
                ];
            })
        ]);
    }

    public function show(Equipment $equipment)
    {
        return Inertia::render('cadastro/equipamentos/show', [
            'equipment' => $equipment->load(['machineType', 'area.plant', 'sector']),
        ]);
    }

    public function update(Request $request, Equipment $equipment)
    {
        $validated = $request->validate([
            'tag' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'machine_type_id' => 'required|exists:machine_types,id',
            'description' => 'nullable|string',
            'manufacturer' => 'nullable|string|max:255',
            'manufacturing_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'area_id' => 'required|exists:areas,id',
            'sector_id' => 'nullable|exists:sectors,id',
            'photo' => 'nullable|image|max:2048'
        ]);

        if ($request->hasFile('photo')) {
            if ($equipment->photo_path) {
                Storage::disk('public')->delete($equipment->photo_path);
            }
            
            $path = $request->file('photo')->store('equipment-photos', 'public');
            $validated['photo_path'] = $path;
        }

        $equipment->update($validated);

        return redirect()->route('cadastro.equipamentos')
            ->with('success', "O equipamento {$equipment->tag} foi atualizado com sucesso.");
    }

    public function destroy(Equipment $equipment)
    {
        $equipmentTag = $equipment->tag;

        if ($equipment->photo_path) {
            Storage::disk('public')->delete($equipment->photo_path);
        }

        $equipment->delete();

        return back()->with('success', "O equipamento {$equipmentTag} foi excluído com sucesso.");
    }

    public function removePhoto(Equipment $equipment)
    {
        if ($equipment->photo_path) {
            Storage::disk('public')->delete($equipment->photo_path);
            $equipment->update(['photo_path' => null]);
            return back()->with('success', 'Foto removida com sucesso.');
        }
        return back()->with('error', 'Não foi possível remover a foto.');
    }
} 
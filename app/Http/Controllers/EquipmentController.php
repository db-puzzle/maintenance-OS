<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Equipment;
use App\Models\EquipmentType;
use App\Models\Plant;
use App\Models\Sector;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 8);
        $search = $request->input('search');
        $sort = $request->input('sort', 'tag');
        $direction = $request->input('direction', 'asc');

        $query = Equipment::query()
            ->with(['equipmentType:id,name', 'plant:id,name', 'area.plant:id,name', 'sector:id,name']);

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(equipment.tag) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(equipment.manufacturer) LIKE ?', ["%{$search}%"])
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('plants')
                            ->whereColumn('plants.id', 'equipment.plant_id')
                            ->whereRaw('LOWER(plants.name) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        switch ($sort) {
            case 'equipment_type':
                $query->join('equipment_types', 'equipment.equipment_type_id', '=', 'equipment_types.id')
                    ->orderBy('equipment_types.name', $direction)
                    ->select('equipment.*');
                break;
            case 'sector':
                $query->leftJoin('sectors', 'equipment.sector_id', '=', 'sectors.id')
                    ->orderBy('sectors.name', $direction)
                    ->select('equipment.*');
                break;
            case 'area':
                $query->leftJoin('areas', 'equipment.area_id', '=', 'areas.id')
                    ->orderBy('areas.name', $direction)
                    ->select('equipment.*');
                break;
            case 'plant':
                $query->join('plants', 'equipment.plant_id', '=', 'plants.id')
                    ->orderBy('plants.name', $direction)
                    ->select('equipment.*');
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $equipment = $query->paginate($perPage)->withQueryString();

        return Inertia::render('cadastro/equipamentos', [
            'equipment' => $equipment,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/equipamentos/create', [
            'equipmentTypes' => EquipmentType::all(),
            'plants' => Plant::with('areas.sectors')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tag' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'equipment_type_id' => 'required|exists:equipment_types,id',
            'description' => 'nullable|string',
            'manufacturer' => 'nullable|string|max:255',
            'manufacturing_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'plant_id' => 'required|exists:plants,id',
            'area_id' => 'nullable|exists:areas,id|required_with:sector_id',
            'sector_id' => 'nullable|exists:sectors,id',
            'photo' => 'nullable|image|max:2048'
        ]);

        // Valida se a área pertence à planta quando fornecida
        if (!empty($validated['area_id'])) {
            $area = Area::findOrFail($validated['area_id']);
            $plantId = (int)$validated['plant_id'];
            
            if ((int)$area->plant_id !== $plantId) {
                throw ValidationException::withMessages([
                    'area_id' => ["A área selecionada não pertence à planta escolhida."]
                ]);
            }

            // Valida se o setor pertence à área quando fornecido
            if (!empty($validated['sector_id'])) {
                $sector = Sector::findOrFail($validated['sector_id']);
                if ((int)$sector->area_id !== (int)$validated['area_id']) {
                    throw ValidationException::withMessages([
                        'sector_id' => ["O setor selecionado não pertence à área escolhida."]
                    ]);
                }
            }
        } else {
            // Se não há área selecionada, não pode haver setor
            $validated['sector_id'] = null;
        }

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('equipment-photos', 'public');
            $validated['photo_path'] = $path;
        }

        $equipment = Equipment::create($validated);

        return redirect()->route('cadastro.equipamentos')
            ->with('success', "Equipamento {$equipment->tag} criado com sucesso.");
    }

    public function edit(Equipment $equipment)
    {
        $loadedEquipment = $equipment->load(['equipmentType', 'plant', 'area.plant', 'sector']);
        return Inertia::render('cadastro/equipamentos/edit', [
            'equipment' => $loadedEquipment,
            'equipmentTypes' => EquipmentType::all(),
            'plants' => Plant::with('areas.sectors')->get(),
        ]);
    }

    public function show(Equipment $equipment)
    {
        $loadedEquipment = $equipment->load(['equipmentType', 'plant', 'area.plant', 'sector']);
        return Inertia::render('cadastro/equipamentos/show', [
            'equipment' => $loadedEquipment,
        ]);
    }

    public function update(Request $request, Equipment $equipment)
    {
        try {
            // Verifica se os dados estão vindo corretamente
            if (empty($request->all()) && empty($request->allFiles())) {
                throw ValidationException::withMessages([
                    'general' => ['Nenhum dado foi recebido na requisição.']
                ]);
            }

            // Converte os dados do formulário para o formato esperado
            $data = $request->all();
            if ($request->has('equipment_type_id')) {
                $data['equipment_type_id'] = (int) $request->input('equipment_type_id');
            }
            if ($request->has('plant_id')) {
                $data['plant_id'] = (int) $request->input('plant_id');
            }
            if ($request->has('area_id') && !empty($request->input('area_id'))) {
                $data['area_id'] = (int) $request->input('area_id');
            }
            if ($request->has('sector_id') && !empty($request->input('sector_id'))) {
                $data['sector_id'] = (int) $request->input('sector_id');
            }
            if ($request->has('manufacturing_year') && !empty($request->input('manufacturing_year'))) {
                $data['manufacturing_year'] = (int) $request->input('manufacturing_year');
            }

            $validated = $request->validate([
                'tag' => 'required|string|max:255',
                'serial_number' => 'nullable|string|max:255',
                'equipment_type_id' => 'required|exists:equipment_types,id',
                'description' => 'nullable|string',
                'manufacturer' => 'nullable|string|max:255',
                'manufacturing_year' => 'nullable|integer|min:1900|max:' . date('Y'),
                'plant_id' => 'required|exists:plants,id',
                'area_id' => 'nullable|exists:areas,id|required_with:sector_id',
                'sector_id' => 'nullable|exists:sectors,id',
                'photo' => 'nullable|image|max:2048'
            ]);

            // Valida se a área pertence à planta quando fornecida
            if (!empty($validated['area_id'])) {
                $area = Area::findOrFail($validated['area_id']);
                $plantId = (int)$validated['plant_id'];
                
                if ((int)$area->plant_id !== $plantId) {
                    throw ValidationException::withMessages([
                        'area_id' => ["A área selecionada não pertence à planta escolhida."]
                    ]);
                }

                // Valida se o setor pertence à área quando fornecido
                if (!empty($validated['sector_id'])) {
                    $sector = Sector::findOrFail($validated['sector_id']);
                    if ((int)$sector->area_id !== (int)$validated['area_id']) {
                        throw ValidationException::withMessages([
                            'sector_id' => ["O setor selecionado não pertence à área escolhida."]
                        ]);
                    }
                }
            } else {
                // Se não há área selecionada, não pode haver setor
                $validated['sector_id'] = null;
            }

            if ($request->hasFile('photo')) {
                // Remove a foto antiga se existir
                if ($equipment->photo_path) {
                    Storage::disk('public')->delete($equipment->photo_path);
                }
                $path = $request->file('photo')->store('equipment-photos', 'public');
                $validated['photo_path'] = $path;
            } else {
                // Se não há nova foto, mantém a foto antiga
                unset($validated['photo_path']);
            }

            $equipment->update($validated);

            return back()->with('success', "O equipamento {$equipment->tag} foi atualizado com sucesso.");
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            return back()->with('error', 'Ocorreu um erro ao atualizar o equipamento. Por favor, tente novamente.');
        }
    }

    public function destroy(Equipment $equipment)
    {
        $equipmentTag = $equipment->tag;

        if ($equipment->photo_path) {
            Storage::disk('public')->delete($equipment->photo_path);
        }

        $equipment->delete();

        return redirect()->route('cadastro.equipamentos')
            ->with('success', "O equipamento {$equipmentTag} foi excluído com sucesso.");
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
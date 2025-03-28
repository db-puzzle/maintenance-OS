<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Equipment;
use App\Models\EquipmentType;
use App\Models\Plant;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $perPage = 8;
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
            'area_id' => 'nullable|exists:areas,id',
            'sector_id' => 'nullable|exists:sectors,id|required_with:area_id',
            'photo' => 'nullable|image|max:2048'
        ]);

        // Valida se a área pertence à planta quando fornecida
        if (!empty($validated['area_id'])) {
            $area = Area::findOrFail($validated['area_id']);
            if ($area->plant_id !== $validated['plant_id']) {
                throw ValidationException::withMessages([
                    'area_id' => ["A área selecionada não pertence à planta escolhida."]
                ]);
            }

            // Valida se o setor pertence à área quando ambos são fornecidos
            if (!empty($validated['sector_id'])) {
                $sector = Sector::findOrFail($validated['sector_id']);
                if ($sector->area_id !== $validated['area_id']) {
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
        $validated = $request->validate([
            'tag' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'equipment_type_id' => 'required|exists:equipment_types,id',
            'description' => 'nullable|string',
            'manufacturer' => 'nullable|string|max:255',
            'manufacturing_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'plant_id' => 'required|exists:plants,id',
            'area_id' => 'nullable|exists:areas,id',
            'sector_id' => 'nullable|exists:sectors,id|required_with:area_id',
            'photo' => 'nullable|image|max:2048'
        ]);

        // Valida se a área pertence à planta quando fornecida
        if (!empty($validated['area_id'])) {
            $area = Area::findOrFail($validated['area_id']);
            if ($area->plant_id !== $validated['plant_id']) {
                throw ValidationException::withMessages([
                    'area_id' => ["A área selecionada não pertence à planta escolhida."]
                ]);
            }

            // Valida se o setor pertence à área quando ambos são fornecidos
            if (!empty($validated['sector_id'])) {
                $sector = Sector::findOrFail($validated['sector_id']);
                if ($sector->area_id !== $validated['area_id']) {
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

    public function import()
    {
        return Inertia::render('cadastro/equipamentos/import');
    }

    public function export()
    {
        return Inertia::render('cadastro/equipamentos/export');
    }

    public function exportData(Request $request)
    {
        \Log::info('Iniciando exportação de equipamentos', ['format' => $request->input('format')]);
        
        $format = $request->input('format', 'csv');
        
        // Busca todos os equipamentos com seus relacionamentos
        $equipment = Equipment::with([
            'equipmentType:id,name',
            'plant:id,name',
            'area:id,name,plant_id',
            'sector:id,name,area_id'
        ])->get();

        \Log::info('Equipamentos carregados', ['count' => $equipment->count()]);

        // Prepara os dados para exportação
        $data = $equipment->map(function ($item) {
            return [
                'ID' => $item->id,
                'Tag' => $item->tag,
                'Número de Série' => $item->serial_number,
                'Tipo de Equipamento' => $item->equipmentType?->name,
                'Descrição' => $item->description,
                'Fabricante' => $item->manufacturer,
                'Ano de Fabricação' => $item->manufacturing_year,
                'Planta' => $item->plant?->name,
                'Área' => $item->area?->name,
                'Setor' => $item->sector?->name,
                'Data de Criação' => $item->created_at->format('d/m/Y H:i:s'),
                'Última Atualização' => $item->updated_at->format('d/m/Y H:i:s'),
            ];
        })->toArray();

        if ($format === 'csv') {
            // Cria o arquivo CSV
            $filename = 'equipamentos_' . date('Y-m-d_His') . '.csv';
            $filepath = storage_path('app/public/exports/' . $filename);
            
            \Log::info('Criando arquivo CSV', [
                'filename' => $filename,
                'filepath' => $filepath
            ]);

            // Cria o diretório se não existir
            if (!file_exists(storage_path('app/public/exports'))) {
                mkdir(storage_path('app/public/exports'), 0755, true);
                \Log::info('Diretório de exportação criado');
            }

            // Abre o arquivo para escrita
            $file = fopen($filepath, 'w');

            // Escreve o cabeçalho
            fputcsv($file, array_keys($data[0]));

            // Escreve os dados
            foreach ($data as $row) {
                fputcsv($file, $row);
            }

            fclose($file);

            \Log::info('Arquivo CSV criado com sucesso');

            // Se for uma requisição de download, retorna o arquivo
            if ($request->has('download')) {
                \Log::info('Iniciando download direto do arquivo');
                return response()->download($filepath)->deleteFileAfterSend();
            }

            // Retorna a URL do arquivo para download
            $downloadUrl = route('cadastro.equipamentos.export.download', ['filename' => $filename]);
            \Log::info('Retornando URL para download', ['url' => $downloadUrl]);

            return Inertia::render('cadastro/equipamentos/export', [
                'success' => true,
                'download_url' => $downloadUrl,
                'filename' => $filename
            ]);
        }

        \Log::warning('Formato não suportado', ['format' => $format]);
        return Inertia::render('cadastro/equipamentos/export', [
            'success' => false,
            'error' => 'Formato não suportado'
        ]);
    }

    public function downloadExport($filename)
    {
        \Log::info('Iniciando download do arquivo', ['filename' => $filename]);
        
        $filepath = storage_path('app/public/exports/' . $filename);
        
        if (!file_exists($filepath)) {
            \Log::error('Arquivo não encontrado', ['filepath' => $filepath]);
            return back()->with('error', 'Arquivo não encontrado');
        }

        \Log::info('Arquivo encontrado, iniciando download', ['filepath' => $filepath]);
        return response()->download($filepath)->deleteFileAfterSend();
    }
} 
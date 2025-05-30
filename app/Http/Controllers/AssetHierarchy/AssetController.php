<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\AssetType;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 8);
        $search = $request->input('search');
        $sort = $request->input('sort', 'tag');
        $direction = $request->input('direction', 'asc');

        $query = Asset::query()
            ->with(['assetType:id,name', 'plant:id,name', 'area.plant:id,name', 'sector:id,name']);

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(asset.tag) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(asset.manufacturer) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(asset.description) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(asset.serial_number) LIKE ?', ["%{$search}%"])
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('plants')
                            ->whereColumn('plants.id', 'asset.plant_id')
                            ->whereRaw('LOWER(plants.name) LIKE ?', ["%{$search}%"]);
                    })
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('areas')
                            ->whereColumn('areas.id', 'asset.area_id')
                            ->whereRaw('LOWER(areas.name) LIKE ?', ["%{$search}%"]);
                    })
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('sectors')
                            ->whereColumn('sectors.id', 'asset.sector_id')
                            ->whereRaw('LOWER(sectors.name) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        switch ($sort) {
            case 'asset_type':
                $query->join('asset_types', 'asset.asset_type_id', '=', 'asset_types.id')
                    ->orderBy('asset_types.name', $direction)
                    ->select('asset.*');
                break;
            case 'serial_number':
                $query->orderBy('asset.serial_number', $direction);
                break;
            case 'sector':
                $query->leftJoin('sectors', 'asset.sector_id', '=', 'sectors.id')
                    ->orderBy('sectors.name', $direction)
                    ->select('asset.*');
                break;
            case 'area':
                $query->leftJoin('areas', 'asset.area_id', '=', 'areas.id')
                    ->orderBy('areas.name', $direction)
                    ->select('asset.*');
                break;
            case 'plant':
                $query->join('plants', 'asset.plant_id', '=', 'plants.id')
                    ->orderBy('plants.name', $direction)
                    ->select('asset.*');
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $asset = $query->paginate($perPage)->withQueryString();

        return Inertia::render('asset-hierarchy/assets', [
            'asset' => $asset,
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
        return Inertia::render('asset-hierarchy/assets/asset-form', [
            'assetTypes' => AssetType::all(),
            'plants' => Plant::with('areas.sectors')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'tag' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'asset_type_id' => 'required|exists:asset_types,id',
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
            $path = $request->file('photo')->store('asset-photos', 'public');
            $validated['photo_path'] = $path;
        }

        $asset = Asset::create($validated);

        return redirect()->route('asset-hierarchy.assets.show', ['asset' => $asset, 'tab' => 'rotinas'])
            ->with('success', "Ativo {$asset->tag} criado com sucesso.");
    }

    public function edit(Asset $asset)
    {
        $loadedAsset = $asset->load(['assetType', 'plant', 'area.plant', 'sector']);
        return Inertia::render('asset-hierarchy/assets/asset-form', [
            'asset' => $loadedAsset,
            'assetTypes' => AssetType::all(),
            'plants' => Plant::with('areas.sectors')->get(),
        ]);
    }

    public function show(Asset $asset)
    {
        $loadedAsset = $asset->load(['assetType', 'plant', 'area.plant', 'sector', 'routines.form']);
        return Inertia::render('asset-hierarchy/assets/show', [
            'asset' => $loadedAsset,
            'assetTypes' => AssetType::all(),
            'plants' => Plant::with('areas.sectors')->get(),
        ]);
    }

    public function update(Request $request, Asset $asset)
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
            if ($request->has('asset_type_id')) {
                $data['asset_type_id'] = (int) $request->input('asset_type_id');
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
                'asset_type_id' => 'required|exists:asset_types,id',
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
                if ($asset->photo_path) {
                    Storage::disk('public')->delete($asset->photo_path);
                }
                $path = $request->file('photo')->store('asset-photos', 'public');
                $validated['photo_path'] = $path;
            } else {
                // Se não há nova foto, mantém a foto antiga
                unset($validated['photo_path']);
            }

            $asset->update($validated);

            return redirect()->route('asset-hierarchy.assets.show', ['asset' => $asset, 'tab' => 'rotinas'])
                ->with('success', "O ativo {$asset->tag} foi atualizado com sucesso.");
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            return back()->with('error', 'Ocorreu um erro ao atualizar o ativo. Por favor, tente novamente.');
        }
    }

    public function destroy(Asset $asset)
    {
        $assetTag = $asset->tag;

        if ($asset->photo_path) {
            Storage::disk('public')->delete($asset->photo_path);
        }

        $asset->delete();

        return redirect()->route('asset-hierarchy.assets')
            ->with('success', "O ativo {$assetTag} foi excluído com sucesso.");
    }

    public function removePhoto(Asset $asset)
    {
        if ($asset->photo_path) {
            Storage::disk('public')->delete($asset->photo_path);
            $asset->update(['photo_path' => null]);
            return back()->with('success', 'Foto removida com sucesso.');
        }
        return back()->with('error', 'Não foi possível remover a foto.');
    }
} 
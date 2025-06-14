<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Manufacturer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ManufacturerController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 8);
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $query = Manufacturer::query()
            ->withCount('assets');

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(email) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(country) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(notes) LIKE ?', ["%{$search}%"]);
            });
        }

        switch ($sort) {
            case 'assets_count':
                $query->orderBy('assets_count', $direction);
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $manufacturers = $query->paginate($perPage)->withQueryString();

        return Inertia::render('asset-hierarchy/manufacturers', [
            'manufacturers' => $manufacturers,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:manufacturers,name',
            'website' => 'nullable|url|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $manufacturer = Manufacturer::create($validated);

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Fabricante {$manufacturer->name} criado com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('asset-hierarchy.manufacturers')
            ->with('success', "Fabricante {$manufacturer->name} criado com sucesso.");
    }

    public function show(Manufacturer $manufacturer)
    {
        $manufacturer->loadCount('assets');
        
        // If this is a JSON request (for edit functionality), return just the manufacturer data
        if (request()->expectsJson() || request()->get('format') === 'json') {
            return response()->json([
                'manufacturer' => [
                    'id' => $manufacturer->id,
                    'name' => $manufacturer->name,
                    'website' => $manufacturer->website,
                    'email' => $manufacturer->email,
                    'phone' => $manufacturer->phone,
                    'country' => $manufacturer->country,
                    'notes' => $manufacturer->notes,
                ]
            ]);
        }
        
        // Load assets if needed for the assets tab
        $manufacturer->load(['assets' => function ($query) {
            $query->with(['assetType:id,name', 'plant:id,name', 'area:id,name', 'sector:id,name'])
                ->select('id', 'tag', 'description', 'asset_type_id', 'plant_id', 'area_id', 'sector_id', 'serial_number', 'part_number', 'manufacturer_id');
        }]);
        
        // Transform assets data for the frontend
        $manufacturer->assets = $manufacturer->assets->map(function ($asset) {
            return [
                'id' => $asset->id,
                'tag' => $asset->tag,
                'description' => $asset->description,
                'serial_number' => $asset->serial_number,
                'part_number' => $asset->part_number,
                'asset_type' => $asset->assetType?->name,
                'plant' => $asset->plant?->name,
                'area' => $asset->area?->name,
                'sector' => $asset->sector?->name,
            ];
        });
        
        return Inertia::render('asset-hierarchy/manufacturers/show', [
            'manufacturer' => $manufacturer,
        ]);
    }

    public function edit(Manufacturer $manufacturer)
    {
        return redirect()->route('asset-hierarchy.manufacturers.show', $manufacturer);
    }

    public function update(Request $request, Manufacturer $manufacturer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:manufacturers,name,' . $manufacturer->id,
            'website' => 'nullable|url|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $manufacturer->update($validated);

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Fabricante {$manufacturer->name} atualizado com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('asset-hierarchy.manufacturers.show', $manufacturer)
            ->with('success', "Fabricante {$manufacturer->name} atualizado com sucesso.");
    }

    public function destroy(Manufacturer $manufacturer)
    {
        $manufacturerName = $manufacturer->name;
        
        // Check if manufacturer has associated assets
        if ($manufacturer->assets()->exists()) {
            return back()->with('error', 'Não é possível excluir um fabricante com ativos associados.');
        }

        $manufacturer->delete();

        return redirect()->route('asset-hierarchy.manufacturers')
            ->with('success', "Fabricante {$manufacturerName} excluído com sucesso.");
    }

    /**
     * Check dependencies before deletion
     */
    public function checkDependencies(Manufacturer $manufacturer)
    {
        $assets = $manufacturer->assets()->take(5)->get(['id', 'tag', 'description']);
        $totalAssets = $manufacturer->assets()->count();

        $canDelete = $totalAssets === 0;

        return response()->json([
            'can_delete' => $canDelete,
            'dependencies' => [
                'assets' => [
                    'total' => $totalAssets,
                    'items' => $assets
                ]
            ]
        ]);
    }

    /**
     * Get assets associated with a manufacturer
     */
    public function assets(Manufacturer $manufacturer)
    {
        $assets = $manufacturer->assets()
            ->with(['assetType:id,name', 'plant:id,name', 'area:id,name', 'sector:id,name'])
            ->select('id', 'tag', 'description', 'asset_type_id', 'plant_id', 'area_id', 'sector_id', 'serial_number', 'part_number')
            ->get()
            ->map(function ($asset) {
                return [
                    'id' => $asset->id,
                    'tag' => $asset->tag,
                    'description' => $asset->description,
                    'serial_number' => $asset->serial_number,
                    'part_number' => $asset->part_number,
                    'asset_type' => $asset->assetType?->name,
                    'plant' => $asset->plant?->name,
                    'area' => $asset->area?->name,
                    'sector' => $asset->sector?->name,
                ];
            });

        return response()->json(['assets' => $assets]);
    }

    /**
     * Get all manufacturers for select options
     */
    public function all(Request $request)
    {
        $manufacturers = Manufacturer::orderBy('name')->get(['id', 'name']);
        
        return response()->json(['manufacturers' => $manufacturers]);
    }
} 
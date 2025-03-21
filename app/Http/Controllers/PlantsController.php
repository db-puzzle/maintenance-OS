<?php

namespace App\Http\Controllers;

use App\Models\Plant;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PlantsController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $plants = Plant::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%")
                        ->orWhere('state', 'like', "%{$search}%");
                });
            })
            ->orderBy($sort, $direction)
            ->paginate(8);

        return Inertia::render('cadastro/plantas', [
            'plants' => $plants,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/plantas/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'street' => 'nullable|string|max:255',
            'number' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:2',
            'zip_code' => 'nullable|string|max:9|regex:/^\d{5}-\d{3}$/',
            'gps_coordinates' => 'nullable|string|max:255',
        ]);

        $plant = Plant::create($validated);

        return redirect()->route('cadastro.plantas')
            ->with('success', "A planta {$plant->name} foi criada com sucesso.");
    }

    public function destroy(Plant $plant)
    {
        $plantName = $plant->name;
        $plant->delete();

        return back()->with('success', "A planta {$plantName} foi excluída com sucesso.");
    }

    public function checkDependencies(Plant $plant)
    {
        $areas = $plant->areas()->take(5)->get(['id', 'name']);
        $totalAreas = $plant->areas()->count();

        return response()->json([
            'can_delete' => $totalAreas === 0,
            'dependencies' => [
                'areas' => [
                    'total' => $totalAreas,
                    'items' => $areas
                ]
            ]
        ]);
    }

    public function edit(Plant $plant)
    {
        return Inertia::render('cadastro/plantas/edit', [
            'plant' => $plant
        ]);
    }

    public function update(Request $request, Plant $plant)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'street' => 'nullable|string|max:255',
            'number' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:2',
            'zip_code' => 'nullable|string|max:9|regex:/^\d{5}-\d{3}$/',
            'gps_coordinates' => 'nullable|string|max:255',
        ]);

        $plant->update($validated);

        return redirect()->route('cadastro.plantas')
            ->with('success', "A planta {$plant->name} foi atualizada com sucesso.");
    }

    public function show(Plant $plant)
    {
        $areas = $plant->areas()
            ->orderBy('name')
            ->paginate(10);

        return Inertia::render('cadastro/plantas/show', [
            'plant' => $plant,
            'areas' => $areas,
        ]);
    }
} 
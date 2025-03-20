<?php

namespace App\Http\Controllers;

use App\Models\Factory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FactoriesController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $factories = Factory::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%")
                        ->orWhere('state', 'like', "%{$search}%");
                });
            })
            ->orderBy($sort, $direction)
            ->paginate(8);

        return Inertia::render('cadastro/fabricas', [
            'factories' => $factories,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/fabricas/create');
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

        $factory = Factory::create($validated);

        return redirect()->route('cadastro.fabricas')
            ->with('success', "A fábrica {$factory->name} foi criada com sucesso.");
    }

    public function destroy(Factory $factory)
    {
        $factoryName = $factory->name;
        $factory->delete();

        return back()->with('success', "A fábrica {$factoryName} foi excluída com sucesso.");
    }

    public function checkDependencies(Factory $factory)
    {
        $areas = $factory->areas()->take(5)->get(['id', 'name']);
        $totalAreas = $factory->areas()->count();

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

    public function edit(Factory $factory)
    {
        return Inertia::render('cadastro/fabricas/edit', [
            'factory' => $factory
        ]);
    }

    public function update(Request $request, Factory $factory)
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

        $factory->update($validated);

        return redirect()->route('cadastro.fabricas')
            ->with('success', "A fábrica {$factory->name} foi atualizada com sucesso.");
    }

    public function show(Factory $factory)
    {
        $areas = $factory->areas()
            ->orderBy('name')
            ->paginate(10);

        return Inertia::render('cadastro/fabricas/show', [
            'factory' => $factory,
            'areas' => $areas,
        ]);
    }
} 
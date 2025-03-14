<?php

namespace App\Http\Controllers;

use App\Models\Factory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FactoriesController extends Controller
{
    public function index()
    {
        $factories = Factory::paginate(8);

        return Inertia::render('cadastro/fabricas', [
            'factories' => $factories
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
} 
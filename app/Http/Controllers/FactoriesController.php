<?php

namespace App\Http\Controllers;

use App\Models\Factory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FactoriesController extends Controller
{
    public function index()
    {
        $factories = Factory::all();

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

        Factory::create($validated);

        return redirect()->route('cadastro.fabricas')
            ->with('success', 'Fábrica criada com sucesso.');
    }

    public function destroy(Factory $factory)
    {
        $factory->delete();

        return back();
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
            ->with('success', 'Fábrica atualizada com sucesso.');
    }
} 
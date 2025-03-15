<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Factory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AreaController extends Controller
{
    /**
     * Encontra a fábrica mais próxima na hierarquia de áreas
     */
    private function findClosestFactory(Area $area): ?Factory
    {
        if ($area->factory) {
            return $area->factory;
        }

        if ($area->parent_area_id) {
            return $this->findClosestFactory($area->parentArea);
        }

        return null;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $areas = Area::with(['factory', 'parentArea' => function($query) {
            $query->with('factory')
                ->select('id', 'name', 'factory_id', 'parent_area_id');
        }])
        ->when($search, function ($query, $search) {
            $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhereHas('factory', function ($query) use ($search) {
                        $query->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('parentArea', function ($query) use ($search) {
                        $query->where('name', 'like', "%{$search}%");
                    });
            });
        })
        ->when($sort === 'factory', function ($query) use ($direction) {
            $query->join('factories', 'areas.factory_id', '=', 'factories.id')
                ->orderBy('factories.name', $direction)
                ->select('areas.*');
        })
        ->when($sort === 'parent_area', function ($query) use ($direction) {
            $query->leftJoin('areas as parent_areas', 'areas.parent_area_id', '=', 'parent_areas.id')
                ->orderBy('parent_areas.name', $direction)
                ->select('areas.*');
        })
        ->when(!in_array($sort, ['factory', 'parent_area']), function ($query) use ($sort, $direction) {
            $query->orderBy($sort, $direction);
        })
        ->paginate(8)
        ->through(function ($area) {
            $area->closest_factory = $this->findClosestFactory($area);
            return $area;
        });

        return Inertia::render('cadastro/areas', [
            'areas' => $areas,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('cadastro/areas/create', [
            'factories' => Factory::all(),
            'areas' => Area::all()
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'factory_id' => 'nullable|exists:factories,id',
            'parent_area_id' => 'nullable|exists:areas,id'
        ]);

        // Converter "none" para null
        if ($validated['factory_id'] === 'none') {
            $validated['factory_id'] = null;
        }
        if ($validated['parent_area_id'] === 'none') {
            $validated['parent_area_id'] = null;
        }

        if ($validated['factory_id'] && $validated['parent_area_id']) {
            return back()->withErrors([
                'message' => 'Uma área não pode pertencer a uma fábrica e a outra área simultaneamente.'
            ]);
        }

        $area = Area::create($validated);

        return redirect()->route('cadastro.areas')
            ->with('success', "A área {$area->name} foi criada com sucesso.");
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Area $area)
    {
        return Inertia::render('cadastro/areas/edit', [
            'area' => $area->load(['factory', 'parentArea' => function($query) {
                $query->select('id', 'name', 'factory_id', 'parent_area_id');
            }]),
            'factories' => Factory::all(),
            'areas' => Area::where('id', '!=', $area->id)->get()
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Area $area)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'factory_id' => 'nullable|exists:factories,id',
            'parent_area_id' => 'nullable|exists:areas,id'
        ]);

        // Converter "none" para null
        if ($validated['factory_id'] === 'none') {
            $validated['factory_id'] = null;
        }
        if ($validated['parent_area_id'] === 'none') {
            $validated['parent_area_id'] = null;
        }

        if ($validated['factory_id'] && $validated['parent_area_id']) {
            return back()->withErrors([
                'message' => 'Uma área não pode pertencer a uma fábrica e a outra área simultaneamente.'
            ]);
        }

        $area->update($validated);

        return redirect()->route('cadastro.areas')
            ->with('success', "A área {$area->name} foi atualizada com sucesso.");
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Area $area)
    {
        $areaName = $area->name;
        $area->delete();

        return redirect()->route('cadastro.areas')
            ->with('success', "A área {$areaName} foi excluída com sucesso.");
    }
}

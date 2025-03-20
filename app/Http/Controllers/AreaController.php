<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Factory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AreaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $areas = Area::with(['factory'])
        ->withCount('machines')
        ->when($search, function ($query, $search) {
            $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhereHas('factory', function ($query) use ($search) {
                        $query->where('name', 'like', "%{$search}%");
                    });
            });
        })
        ->when($sort === 'factory', function ($query) use ($direction) {
            $query->join('factories', 'areas.factory_id', '=', 'factories.id')
                ->orderBy('factories.name', $direction)
                ->select('areas.*');
        })
        ->when(!in_array($sort, ['factory']), function ($query) use ($sort, $direction) {
            $query->orderBy($sort, $direction);
        })
        ->paginate(8);

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
        $factories = Factory::all();
        \Log::info('AreaController@create - Factories:', ['factories' => $factories->toArray()]);
        
        return Inertia::render('cadastro/areas/create', [
            'factories' => $factories->map(function ($factory) {
                return [
                    'id' => $factory->id,
                    'name' => $factory->name,
                ];
            })->values()->all()
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'factory_id' => 'required|exists:factories,id'
        ]);

        $area = Area::create($validated);

        return redirect()->route('cadastro.areas')
            ->with('success', "A área {$area->name} foi criada com sucesso.");
    }

    /**
     * Display the specified resource.
     */
    public function show(Area $area)
    {
        return Inertia::render('cadastro/areas/show', [
            'area' => $area->load(['factory', 'machines.machineType'])
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Area $area)
    {
        return Inertia::render('cadastro/areas/edit', [
            'area' => $area->load(['factory']),
            'factories' => Factory::all()
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Area $area)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'factory_id' => 'required|exists:factories,id'
        ]);

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

        return back()->with('success', "A área {$areaName} foi excluída com sucesso.");
    }

    public function checkDependencies(Area $area)
    {
        $machines = $area->machines()->take(5)->get(['id', 'tag', 'name']);
        $totalMachines = $area->machines()->count();

        return response()->json([
            'can_delete' => $totalMachines === 0,
            'dependencies' => [
                'machines' => [
                    'total' => $totalMachines,
                    'items' => $machines
                ]
            ]
        ]);
    }
}

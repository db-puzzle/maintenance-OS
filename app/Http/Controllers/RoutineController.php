<?php

namespace App\Http\Controllers;

use App\Models\Maintenance\Routine;
use App\Models\Forms\Form;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Maintenance\MaintenancePlan;

class RoutineController extends Controller
{
    public function index()
    {
        $routines = Routine::with(['maintenancePlan', 'form', 'tasks', 'routineExecutions'])->get();
        return response()->json($routines);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'maintenance_plan_id' => 'required|exists:maintenance_plans,id',
            'form_id' => 'nullable|exists:forms,id|unique:routines,form_id',
            'name' => 'required|string',
            'trigger_hours' => 'required|integer',
            'type' => 'required|integer|in:1,2,3,4'
        ]);

        $routine = Routine::create($validated);

        return response()->json($routine, 201);
    }

    public function show(Routine $routine)
    {
        return response()->json($routine->load(['maintenancePlan', 'form', 'tasks', 'routineExecutions']));
    }

    public function update(Request $request, Routine $routine)
    {
        $validated = $request->validate([
            'form_id' => 'nullable|exists:forms,id|unique:routines,form_id,' . $routine->id,
            'name' => 'required|string',
            'trigger_hours' => 'required|integer',
            'type' => 'required|integer|in:1,2,3,4'
        ]);

        $routine->update($validated);

        return response()->json($routine);
    }

    public function destroy(Routine $routine)
    {
        $routine->delete();
        return response()->json(['message' => 'Routine deleted']);
    }

    public function updateStatus(Request $request, Routine $routine)
    {
        $routine->update($request->validate([
            'status' => 'required|in:active,inactive'
        ]));

        return response()->json($routine);
    }

    public function create()
    {
        $maintenancePlans = MaintenancePlan::where('status', 'Active')->get();
        $availableForms = Form::whereDoesntHave('routine')
            ->where('is_active', true)
            ->get();
        
        return Inertia::render('routines/routine-editor', [
            'maintenancePlans' => $maintenancePlans,
            'availableForms' => $availableForms
        ]);
    }
} 
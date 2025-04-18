<?php

namespace App\Http\Controllers;

use App\Models\Routine;
use Illuminate\Http\Request;

class RoutineController extends Controller
{
    public function index()
    {
        $routines = Routine::with(['maintenancePlan', 'tasks', 'routineExecutions'])->get();
        return response()->json($routines);
    }

    public function store(Request $request)
    {
        $routine = Routine::create($request->validate([
            'maintenance_plan_id' => 'required|exists:maintenance_plans,id',
            'name' => 'required|string',
            'trigger_hours' => 'required|integer'
        ]));

        return response()->json($routine, 201);
    }

    public function show(Routine $routine)
    {
        return response()->json($routine->load(['maintenancePlan', 'tasks', 'routineExecutions']));
    }

    public function update(Request $request, Routine $routine)
    {
        $routine->update($request->validate([
            'name' => 'required|string',
            'trigger_hours' => 'required|integer'
        ]));

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
} 
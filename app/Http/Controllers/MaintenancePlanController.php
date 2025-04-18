<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\MaintenancePlan;
use Illuminate\Http\Request;

class MaintenancePlanController extends Controller
{
    public function index()
    {
        $plans = MaintenancePlan::with(['equipment', 'equipmentType', 'routines'])->get();
        return response()->json($plans);
    }

    public function store(Request $request)
    {
        $plan = MaintenancePlan::create($request->validate([
            'equipment_id' => 'nullable|exists:equipment,id',
            'equipment_type_id' => 'nullable|exists:equipment_types,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive'
        ]));

        return response()->json($plan, 201);
    }

    public function show(MaintenancePlan $maintenancePlan)
    {
        return response()->json($maintenancePlan->load(['equipment', 'equipmentType', 'routines']));
    }

    public function update(Request $request, MaintenancePlan $maintenancePlan)
    {
        $maintenancePlan->update($request->validate([
            'equipment_id' => 'nullable|exists:equipment,id',
            'equipment_type_id' => 'nullable|exists:equipment_types,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive'
        ]));

        return response()->json($maintenancePlan);
    }

    public function destroy(MaintenancePlan $maintenancePlan)
    {
        $maintenancePlan->delete();
        return response()->json(['message' => 'Maintenance plan deleted successfully']);
    }

    public function copyFromType(Request $request, Equipment $equipment)
    {
        $typePlan = $equipment->equipmentType->maintenancePlan;
        if (!$typePlan) {
            return response()->json(['message' => 'No default plan found for Equipment Type'], 404);
        }

        $newPlan = $typePlan->replicate();
        $newPlan->equipment_id = $equipment->id;
        $newPlan->equipment_type_id = null;
        $newPlan->status = 'Inactive';
        $newPlan->save();

        // Replicate routines and tasks
        foreach ($typePlan->routines as $routine) {
            $newRoutine = $routine->replicate();
            $newRoutine->maintenance_plan_id = $newPlan->id;
            $newRoutine->save();

            foreach ($routine->tasks as $task) {
                $newTask = $task->replicate();
                $newTask->routine_id = $newRoutine->id;
                $newTask->save();
            }
        }

        return response()->json(['message' => 'Plan copied successfully', 'plan' => $newPlan]);
    }
} 
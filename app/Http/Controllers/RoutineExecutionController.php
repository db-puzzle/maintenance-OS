<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\Routine;
use App\Models\RoutineExecution;
use Illuminate\Http\Request;

class RoutineExecutionController extends Controller
{
    public function index()
    {
        $executions = RoutineExecution::with(['routine', 'equipment', 'taskExecutions', 'completedBy'])
            ->latest()
            ->get();
        return response()->json($executions);
    }

    public function show(RoutineExecution $execution)
    {
        return response()->json($execution->load(['routine', 'equipment', 'taskExecutions', 'completedBy']));
    }

    public function triggerRoutine(Routine $routine, Equipment $equipment)
    {
        $execution = RoutineExecution::create([
            'routine_id' => $routine->id,
            'equipment_id' => $equipment->id,
            'triggered_at' => now(),
            'status' => 'Programada',
            'accumulated_hours_at_execution' => $equipment->accumulated_hours
        ]);

        return response()->json($execution, 201);
    }

    public function updateStatus(Request $request, RoutineExecution $execution)
    {
        $execution->update($request->validate([
            'status' => 'required|in:Programada,Em Andamento,Completa,Atrasada'
        ]));

        return response()->json($execution);
    }

    public function completeRoutine(Request $request, RoutineExecution $execution)
    {
        $execution->update([
            'completed_at' => now(),
            'completed_by_user_id' => $request->user()->id,
            'status' => 'Completa',
            'signature' => $request->input('signature')
        ]);

        return response()->json($execution);
    }

    public function destroy(RoutineExecution $execution)
    {
        $execution->delete();
        return response()->json(['message' => 'Routine execution deleted successfully']);
    }
} 
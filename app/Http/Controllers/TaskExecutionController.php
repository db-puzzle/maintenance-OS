<?php

namespace App\Http\Controllers;

use App\Models\RoutineExecution;
use App\Models\Task;
use App\Models\TaskExecution;
use Illuminate\Http\Request;

class TaskExecutionController extends Controller
{
    public function index(RoutineExecution $execution)
    {
        $taskExecutions = $execution->taskExecutions()->with('task')->get();
        return response()->json($taskExecutions);
    }

    public function show(TaskExecution $taskExecution)
    {
        return response()->json($taskExecution->load(['routineExecution', 'task']));
    }

    public function executeTask(Request $request, RoutineExecution $execution, Task $task)
    {
        $taskExecution = TaskExecution::create([
            'routine_execution_id' => $execution->id,
            'task_id' => $task->id,
            'executed_at' => now(),
            'text_response' => $request->input('text_response'),
            'selected_option' => $request->input('selected_option'),
            'measurement_values' => $request->input('measurement_values'),
            'photo_urls' => $request->input('photo_urls')
        ]);

        return response()->json($taskExecution, 201);
    }

    public function update(Request $request, TaskExecution $taskExecution)
    {
        $taskExecution->update($request->validate([
            'text_response' => 'nullable|string',
            'selected_option' => 'nullable|string',
            'measurement_values' => 'nullable|array',
            'photo_urls' => 'nullable|array'
        ]));

        return response()->json($taskExecution);
    }

    public function destroy(TaskExecution $taskExecution)
    {
        $taskExecution->delete();
        return response()->json(['message' => 'Task execution deleted successfully']);
    }
} 
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
            'selected_options' => $request->input('selected_options'),
            'measurement_values' => $request->input('measurement_values'),
            'photo_urls' => $request->input('photo_urls'),
            'code_reader_value' => $request->input('code_reader_value'),
            'uploaded_files' => $request->input('uploaded_files')
        ]);

        return response()->json($taskExecution, 201);
    }

    public function update(Request $request, TaskExecution $taskExecution)
    {
        $taskExecution->update($request->validate([
            'text_response' => 'nullable|string',
            'selected_option' => 'nullable|string',
            'selected_options' => 'nullable|array',
            'measurement_values' => 'nullable|array',
            'photo_urls' => 'nullable|array',
            'code_reader_value' => 'nullable|string',
            'uploaded_files' => 'nullable|array'
        ]));

        return response()->json($taskExecution);
    }

    public function destroy(TaskExecution $taskExecution)
    {
        $taskExecution->delete();
        return response()->json(['message' => 'Task execution deleted successfully']);
    }
} 
<?php

namespace App\Http\Controllers;

use App\Models\Routine;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Routine $routine)
    {
        $tasks = $routine->tasks;
        return response()->json($tasks);
    }

    public function store(Request $request, Routine $routine)
    {
        $task = $routine->tasks()->create($request->validate([
            'description' => 'required|string',
            'type' => 'required|in:Text,MultipleChoice,MultipleSelect,Measurement,Photo,CodeReader,FileUpload',
            'options' => 'nullable|array',
            'measurement_unit' => 'nullable|string',
            'instruction_images' => 'nullable|array',
            'code_reader_type' => 'nullable|in:qr_code,barcode',
            'code_reader_instructions' => 'nullable|string',
            'file_upload_instructions' => 'nullable|string'
        ]));

        return response()->json($task, 201);
    }

    public function show(Task $task)
    {
        return response()->json($task->load(['routine', 'taskExecutions']));
    }

    public function update(Request $request, Task $task)
    {
        $task->update($request->validate([
            'description' => 'required|string',
            'type' => 'required|in:Text,MultipleChoice,MultipleSelect,Measurement,Photo,CodeReader,FileUpload',
            'options' => 'nullable|array',
            'measurement_unit' => 'nullable|string',
            'instruction_images' => 'nullable|array',
            'code_reader_type' => 'nullable|in:qr_code,barcode',
            'code_reader_instructions' => 'nullable|string',
            'file_upload_instructions' => 'nullable|string'
        ]));

        return response()->json($task);
    }

    public function destroy(Task $task)
    {
        $task->delete();
        return response()->json(['message' => 'Task deleted']);
    }
} 
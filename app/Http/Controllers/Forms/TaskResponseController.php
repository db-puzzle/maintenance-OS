<?php

namespace App\Http\Controllers\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\FormExecution;
use App\Models\Forms\TaskResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;

class TaskResponseController extends Controller
{
    /**
     * Display a listing of responses for a form execution.
     */
    public function index(FormExecution $formExecution)
    {
        $responses = $formExecution->taskResponses()->with('attachments')->get();
        
        return Inertia::render('Forms/Responses/Index', [
            'execution' => $formExecution,
            'responses' => $responses
        ]);
    }

    /**
     * Store a new task response.
     */
    public function store(Request $request, FormExecution $formExecution)
    {
        $validated = $request->validate([
            'task_id' => 'required|integer',
            'response' => 'required|array',
        ]);
        
        // Find the task in the form snapshot
        $taskSnapshot = null;
        foreach ($formExecution->form_snapshot['tasks'] as $task) {
            if ($task['id'] == $validated['task_id']) {
                $taskSnapshot = $task;
                break;
            }
        }
        
        if (!$taskSnapshot) {
            return redirect()->back()->with('error', 'Tarefa não encontrada no formulário.');
        }
        
        // Check if a response already exists for this task
        $existingResponse = $formExecution->taskResponses()
            ->where('task_snapshot->id', $validated['task_id'])
            ->first();
            
        if ($existingResponse) {
            $existingResponse->complete($validated['response']);
            
            return redirect()->back()->with('success', 'Resposta atualizada com sucesso.');
        }
        
        // Create a new response
        $taskResponse = $formExecution->taskResponses()->create([
            'task_snapshot' => $taskSnapshot,
            'response' => $validated['response'],
            'is_completed' => true,
            'responded_at' => now(),
        ]);
        
        // If this was the last task to be completed, check if we should complete the execution
        $totalTasks = count($formExecution->form_snapshot['tasks']);
        $completedTasks = $formExecution->taskResponses()->where('is_completed', true)->count();
        
        if ($completedTasks == $totalTasks && $formExecution->isInProgress()) {
            $formExecution->complete();
        }
        
        return redirect()->back()->with('success', 'Resposta salva com sucesso.');
    }

    /**
     * Display the specified response.
     */
    public function show(FormExecution $formExecution, TaskResponse $taskResponse)
    {
        if ($taskResponse->form_execution_id !== $formExecution->id) {
            return redirect()->route('forms.executions.show', $formExecution)
                ->with('error', 'Esta resposta não pertence a esta execução.');
        }
        
        $taskResponse->load('attachments');
        
        return Inertia::render('Forms/Responses/Show', [
            'execution' => $formExecution,
            'response' => $taskResponse
        ]);
    }

    /**
     * Update an existing task response.
     */
    public function update(Request $request, FormExecution $formExecution, TaskResponse $taskResponse)
    {
        if ($taskResponse->form_execution_id !== $formExecution->id) {
            return redirect()->back()->with('error', 'Esta resposta não pertence a esta execução.');
        }
        
        if (!$formExecution->isInProgress()) {
            return redirect()->back()->with('error', 'Não é possível atualizar respostas - formulário não está em andamento.');
        }
        
        $validated = $request->validate([
            'response' => 'required|array',
        ]);
        
        $taskResponse->complete($validated['response']);
        
        return redirect()->back()->with('success', 'Resposta atualizada com sucesso.');
    }

    /**
     * Check if all required tasks are completed.
     */
    public function validateCompletion(FormExecution $formExecution): JsonResponse
    {
        $missingRequiredTasks = [];
        
        foreach ($formExecution->form_snapshot['tasks'] as $task) {
            if ($task['is_required']) {
                $response = $formExecution->taskResponses()
                    ->where('task_snapshot->id', $task['id'])
                    ->where('is_completed', true)
                    ->first();
                    
                if (!$response) {
                    $missingRequiredTasks[] = $task;
                }
            }
        }
        
        return response()->json([
            'is_valid' => count($missingRequiredTasks) === 0,
            'missing_required_tasks' => $missingRequiredTasks
        ]);
    }
} 
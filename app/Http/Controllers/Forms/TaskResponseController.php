<?php

namespace App\Http\Controllers\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\FormExecution;
use App\Models\Forms\FormTask;
use App\Models\Forms\TaskResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TaskResponseController extends Controller
{
    /**
     * Display a listing of responses for a form execution.
     */
    public function index(FormExecution $formExecution)
    {
        $responses = $formExecution->taskResponses()
            ->with(['attachments', 'formTask'])
            ->get();

        // Method temporarily disabled - page not implemented yet
        return Inertia::render('error/not-implemented', [
            'status' => 501,
            'message' => 'This feature is not yet implemented'
        ]);
    }

    /**
     * Store a new task response.
     */
    public function store(Request $request, FormExecution $formExecution)
    {
        if (! $formExecution->isInProgress()) {
            return redirect()->back()
                ->with('error', 'Este formulário não está em andamento.');
        }

        $validated = $request->validate([
            'task_id' => 'required|integer|exists:form_tasks,id',
            'response' => 'required|array',
        ]);

        // Verify the task belongs to this form version
        $task = FormTask::where('id', $validated['task_id'])
            ->where('form_version_id', $formExecution->form_version_id)
            ->first();

        if (! $task) {
            return redirect()->back()
                ->with('error', 'Tarefa não encontrada neste formulário.');
        }

        DB::beginTransaction();
        try {
            // Check if a response already exists for this task
            $existingResponse = $formExecution->taskResponses()
                ->where('form_task_id', $validated['task_id'])
                ->first();

            if ($existingResponse) {
                $existingResponse->complete($validated['response']);

                DB::commit();

                return redirect()->back()
                    ->with('success', 'Resposta atualizada com sucesso.');
            }

            // Create a new response
            $taskResponse = $formExecution->taskResponses()->create([
                'form_task_id' => $task->id,
                'response' => $validated['response'],
                'is_completed' => true,
                'responded_at' => now(),
            ]);

            // Check if this was the last task to be completed
            if ($formExecution->hasAllRequiredTasksCompleted()) {
                $totalTasks = $formExecution->formVersion->tasks()->count();
                $completedTasks = $formExecution->taskResponses()
                    ->where('is_completed', true)
                    ->count();

                if ($completedTasks == $totalTasks && $formExecution->isInProgress()) {
                    $formExecution->complete();
                }
            }

            DB::commit();

            return redirect()->back()
                ->with('success', 'Resposta salva com sucesso.');
        } catch (\Exception $e) {
            DB::rollback();

            return redirect()->back()
                ->with('error', 'Erro ao salvar resposta: '.$e->getMessage());
        }
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

        $taskResponse->load(['attachments', 'formTask.instructions']);

        // Method temporarily disabled - page not implemented yet
        return Inertia::render('error/not-implemented', [
            'status' => 501,
            'message' => 'This feature is not yet implemented'
        ]);
    }

    /**
     * Update an existing task response.
     */
    public function update(Request $request, FormExecution $formExecution, TaskResponse $taskResponse)
    {
        if ($taskResponse->form_execution_id !== $formExecution->id) {
            return redirect()->back()
                ->with('error', 'Esta resposta não pertence a esta execução.');
        }

        if (! $formExecution->isInProgress()) {
            return redirect()->back()
                ->with('error', 'Não é possível atualizar respostas - formulário não está em andamento.');
        }

        $validated = $request->validate([
            'response' => 'required|array',
        ]);

        $taskResponse->complete($validated['response']);

        return redirect()->back()
            ->with('success', 'Resposta atualizada com sucesso.');
    }

    /**
     * Check if all required tasks are completed.
     */
    public function validateCompletion(FormExecution $formExecution): JsonResponse
    {
        $missingRequiredTasks = [];

        if (! $formExecution->hasAllRequiredTasksCompleted()) {
            $missingRequiredTasks = $formExecution->getMissingRequiredTasks()
                ->map(function ($task) {
                    return [
                        'id' => $task->id,
                        'description' => $task->description,
                        'type' => $task->type,
                    ];
                })
                ->toArray();
        }

        return response()->json([
            'is_valid' => count($missingRequiredTasks) === 0,
            'missing_required_tasks' => $missingRequiredTasks,
        ]);
    }
}

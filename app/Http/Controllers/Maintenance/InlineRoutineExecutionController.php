<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\FormExecution;
use App\Models\Forms\FormTask;
use App\Models\Forms\TaskResponse;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InlineRoutineExecutionController extends Controller
{
    /**
     * Start or get an in-progress execution for a routine
     */
    public function startOrGetExecution(Request $request, Asset $asset, Routine $routine)
    {
        // Check if routine is associated with asset
        if (! $asset->routines()->where('routines.id', $routine->id)->exists()) {
            return response()->json(['error' => 'Esta rotina não está associada a este ativo.'], 403);
        }

        // Check if routine has a published form version
        $formVersion = $routine->getFormVersionForExecution();
        if (! $formVersion) {
            return response()->json(['error' => 'Esta rotina não possui um formulário publicado.'], 422);
        }

        // Check for existing in-progress execution
        $existingExecution = RoutineExecution::where('routine_id', $routine->id)
            ->where('executed_by', auth()->id())
            ->where('status', RoutineExecution::STATUS_IN_PROGRESS)
            ->with(['formExecution.taskResponses.formTask'])
            ->first();

        if ($existingExecution) {
            return response()->json([
                'execution' => $existingExecution,
                'form_execution' => $existingExecution->formExecution,
                'task_responses' => $existingExecution->formExecution->taskResponses,
            ]);
        }

        // Create new execution
        DB::beginTransaction();
        try {
            // Create routine execution
            $routineExecution = RoutineExecution::create([
                'routine_id' => $routine->id,
                'status' => RoutineExecution::STATUS_IN_PROGRESS,
                'executed_by' => auth()->id(),
                'started_at' => now(),
            ]);

            // Create form execution with version reference
            $formExecution = FormExecution::create([
                'form_version_id' => $formVersion->id,
                'user_id' => auth()->id(),
                'status' => FormExecution::STATUS_IN_PROGRESS,
                'started_at' => now(),
            ]);

            // Update routine execution with form execution ID
            $routineExecution->form_execution_id = $formExecution->id;
            $routineExecution->save();

            // Load the form version with tasks
            $formExecution->load('formVersion.tasks.instructions');

            DB::commit();

            return response()->json([
                'execution' => $routineExecution,
                'form_execution' => $formExecution,
                'task_responses' => [],
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json(['error' => 'Erro ao iniciar execução: '.$e->getMessage()], 500);
        }
    }

    /**
     * Save a single task response
     */
    public function saveTaskResponse(Request $request, Asset $asset, Routine $routine, $executionId)
    {
        // Validate execution belongs to routine and user
        $routineExecution = RoutineExecution::where('id', $executionId)
            ->where('routine_id', $routine->id)
            ->where('executed_by', auth()->id())
            ->where('status', RoutineExecution::STATUS_IN_PROGRESS)
            ->with('formExecution.formVersion')
            ->first();

        if (! $routineExecution) {
            return response()->json(['error' => 'Execução não encontrada ou não autorizada.'], 404);
        }

        $validated = $request->validate([
            'task_id' => 'required|string',
            'response' => 'nullable|array',
            'files' => 'nullable|array',
            'files.*' => 'file|max:10240', // 10MB max per file
        ]);

        DB::beginTransaction();
        try {
            // Validate task belongs to the form version
            $formTask = FormTask::where('id', $validated['task_id'])
                ->where('form_version_id', $routineExecution->formExecution->form_version_id)
                ->first();

            if (! $formTask) {
                throw new \Exception('Tarefa não encontrada no formulário.');
            }

            // Check if response already exists
            $existingResponse = TaskResponse::where('form_execution_id', $routineExecution->formExecution->id)
                ->where('form_task_id', $validated['task_id'])
                ->first();

            if ($existingResponse) {
                // Update existing response
                $existingResponse->update([
                    'response' => $validated['response'] ?? [],
                    'is_completed' => true,
                    'responded_at' => now(),
                ]);
                $taskResponse = $existingResponse;
            } else {
                // Create new response
                $taskResponse = TaskResponse::create([
                    'form_execution_id' => $routineExecution->formExecution->id,
                    'form_task_id' => $formTask->id,
                    'response' => $validated['response'] ?? [],
                    'is_completed' => true,
                    'responded_at' => now(),
                ]);
            }

            // Handle file uploads
            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $file) {
                    $path = $file->store('task-responses/'.$routineExecution->formExecution->id, 'public');

                    $taskResponse->attachments()->create([
                        'type' => in_array($formTask->type, ['photo']) ? 'photo' : 'file',
                        'file_path' => $path,
                        'file_name' => $file->getClientOriginalName(),
                        'mime_type' => $file->getMimeType(),
                        'file_size' => $file->getSize(),
                    ]);
                }
            }

            // Calculate progress
            $totalTasks = $routineExecution->formExecution->formVersion->tasks()->count();
            $completedTasks = TaskResponse::where('form_execution_id', $routineExecution->formExecution->id)
                ->where('is_completed', true)
                ->count();

            $allTasksCompleted = $totalTasks === $completedTasks;

            // Load the task data for response
            $taskResponse->load('formTask');

            DB::commit();

            return response()->json([
                'success' => true,
                'task_response' => [
                    'id' => $taskResponse->id,
                    'form_task_id' => $taskResponse->form_task_id,
                    'response' => $taskResponse->response,
                    'is_completed' => $taskResponse->is_completed,
                ],
                'progress' => [
                    'total' => $totalTasks,
                    'completed' => $completedTasks,
                    'percentage' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0,
                ],
                'all_tasks_completed' => $allTasksCompleted,
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json(['error' => 'Erro ao salvar resposta: '.$e->getMessage()], 500);
        }
    }

    /**
     * Complete the routine execution
     */
    public function completeExecution(Request $request, Asset $asset, Routine $routine, $executionId)
    {
        $routineExecution = RoutineExecution::where('id', $executionId)
            ->where('routine_id', $routine->id)
            ->where('executed_by', auth()->id())
            ->where('status', RoutineExecution::STATUS_IN_PROGRESS)
            ->with('formExecution')
            ->first();

        if (! $routineExecution) {
            return response()->json(['error' => 'Execução não encontrada ou não autorizada.'], 404);
        }

        // Check if all required tasks are completed
        if (! $routineExecution->formExecution->hasAllRequiredTasksCompleted()) {
            $missingTasks = $routineExecution->formExecution->getMissingRequiredTasks();

            return response()->json([
                'error' => 'Existem tarefas obrigatórias não preenchidas.',
                'missing_tasks' => $missingTasks->pluck('description')->toArray(),
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Complete form execution
            $routineExecution->formExecution->complete();

            // Complete routine execution
            $routineExecution->complete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Rotina concluída com sucesso!',
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json(['error' => 'Erro ao concluir execução: '.$e->getMessage()], 500);
        }
    }

    /**
     * Cancel the routine execution
     */
    public function cancelExecution(Request $request, Asset $asset, Routine $routine, $executionId)
    {
        $routineExecution = RoutineExecution::where('id', $executionId)
            ->where('routine_id', $routine->id)
            ->where('executed_by', auth()->id())
            ->where('status', RoutineExecution::STATUS_IN_PROGRESS)
            ->with('formExecution')
            ->first();

        if (! $routineExecution) {
            return response()->json(['error' => 'Execução não encontrada ou não autorizada.'], 404);
        }

        DB::beginTransaction();
        try {
            // Cancel form execution
            $routineExecution->formExecution->cancel();

            // Cancel routine execution
            $routineExecution->cancel();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Execução cancelada.',
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json(['error' => 'Erro ao cancelar execução: '.$e->getMessage()], 500);
        }
    }

    /**
     * Get execution status and progress
     */
    public function getExecutionStatus(Request $request, Asset $asset, Routine $routine, $executionId)
    {
        $routineExecution = RoutineExecution::where('id', $executionId)
            ->where('routine_id', $routine->id)
            ->with(['formExecution.taskResponses.formTask', 'formExecution.formVersion'])
            ->first();

        if (! $routineExecution) {
            return response()->json(['error' => 'Execução não encontrada.'], 404);
        }

        $totalTasks = $routineExecution->formExecution->formVersion->tasks()->count();
        $completedTasks = $routineExecution->formExecution->taskResponses()
            ->where('is_completed', true)
            ->count();

        return response()->json([
            'execution' => $routineExecution,
            'progress' => [
                'total' => $totalTasks,
                'completed' => $completedTasks,
                'percentage' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0,
            ],
            'status' => $routineExecution->status,
            'task_responses' => $routineExecution->formExecution->taskResponses,
        ]);
    }
}

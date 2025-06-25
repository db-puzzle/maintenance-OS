<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormExecution;
use App\Models\Forms\FormResponse;
use App\Models\Forms\FormTask;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RoutineController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:0',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string',
            'asset_id' => 'required|exists:assets,id',
        ]);
        
        // Force status to Inactive for new routines
        $validated['status'] = 'Inactive';

        $routine = Routine::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Rotina criada com sucesso.',
            'routine' => $routine->load(['asset', 'form']),
        ]);
    }

    public function update(Request $request, Routine $routine)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:0',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string',
            'asset_id' => 'required|exists:assets,id',
        ]);

        $routine->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Rotina atualizada com sucesso.',
            'routine' => $routine->load(['asset', 'form']),
        ]);
    }

    public function destroy(Routine $routine)
    {
        // Verificar se existem execuções associadas
        if ($routine->routineExecutions()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Não é possível excluir uma rotina com execuções associadas.',
            ], 400);
        }

        $routine->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rotina excluída com sucesso.',
        ]);
    }

    public function createExecution(Routine $routine)
    {
        $execution = new RoutineExecution([
            'routine_id' => $routine->id,
            'status' => RoutineExecution::STATUS_PENDING,
        ]);
        $execution->save();

        return response()->json([
            'success' => true,
            'message' => 'Nova execução da rotina criada com sucesso.',
            'execution' => $execution,
        ]);
    }

    public function storeForm(Request $request, Routine $routine)
    {
        $validated = $request->validate([
            'tasks' => 'required|string', // JSON string of tasks
        ]);

        $tasksData = json_decode($validated['tasks'], true);

        DB::beginTransaction();
        try {
            // Remove existing draft tasks
            $routine->form->draftTasks()->delete();

            // Create new draft tasks
            foreach ($tasksData as $index => $taskData) {
                $this->createFormTask($routine->form, $taskData, $index);
            }

            DB::commit();

            return redirect()->back()
                ->with('success', 'Rascunho do formulário salvo com sucesso. Publique para torná-lo disponível.');
        } catch (\Exception $e) {
            DB::rollback();

            return redirect()->back()
                ->with('error', 'Erro ao salvar formulário: '.$e->getMessage());
        }
    }

    public function publishForm(Request $request, Routine $routine)
    {
        // Check if there are draft tasks to publish
        if (! $routine->form->draftTasks()->exists()) {
            return redirect()->back()
                ->with('error', 'Não há alterações para publicar.');
        }

        DB::beginTransaction();
        try {
            // Publish the form
            $version = $routine->form->publish(auth()->id());

            // Update routine's active version
            $routine->active_form_version_id = $version->id;
            
            // Automatically activate the routine when published
            $routine->status = 'Active';
            
            $routine->save();

            DB::commit();

            return redirect()->back()
                ->with('success', 'Formulário publicado com sucesso! Versão '.$version->getVersionLabel().' está agora ativa.');
        } catch (\Exception $e) {
            DB::rollback();

            return redirect()->back()
                ->with('error', 'Erro ao publicar formulário: '.$e->getMessage());
        }
    }

    private function mapTaskType(string $dbType): string
    {
        $mapping = [
            'question' => 'question',
            'multiple_choice' => 'multiple_choice',
            'multiple_select' => 'multiple_select',
            'measurement' => 'measurement',
            'photo' => 'photo',
            'code_reader' => 'code_reader',
            'file_upload' => 'file_upload',
        ];

        return $mapping[$dbType] ?? 'question';
    }

    private function createFormTask(Form $form, array $taskData, int $position): void
    {
        $configuration = [];

        // Adicionar configuração específica baseada no tipo
        switch ($taskData['type']) {
            case 'measurement':
                if (isset($taskData['measurement'])) {
                    $configuration['measurement'] = $taskData['measurement'];
                }
                break;
            case 'multiple_choice':
            case 'multiple_select':
                if (isset($taskData['options'])) {
                    $configuration['options'] = $taskData['options'];
                }
                break;
            case 'code_reader':
                if (isset($taskData['codeReaderType'])) {
                    $configuration['codeReaderType'] = $taskData['codeReaderType'];
                }
                break;
        }

        // Create draft task with form_id
        $task = FormTask::create([
            'form_id' => $form->id, // Draft task belongs to form
            'form_version_id' => null, // Not yet published
            'position' => $position,
            'type' => $taskData['type'],
            'description' => $taskData['description'] ?? '',
            'is_required' => $taskData['isRequired'] ?? false,
            'configuration' => $configuration,
        ]);

        // Criar instruções se existirem
        if (isset($taskData['instructionImages']) && is_array($taskData['instructionImages'])) {
            foreach ($taskData['instructionImages'] as $index => $imagePath) {
                $task->instructions()->create([
                    'position' => $index,
                    'type' => 'image',
                    'media_url' => $imagePath,
                ]);
            }
        }
    }

    // ===== MÉTODOS PARA GERENCIAR ROTINAS NO CONTEXTO DE ATIVOS =====

    public function storeAssetRoutine(Request $request, Asset $asset)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:1',
            'status' => 'nullable|in:Active,Inactive',
            'description' => 'nullable|string',
        ]);

        // Force status to Inactive for new routines
        $validated['status'] = 'Inactive';
        $validated['asset_id'] = $asset->id;

        $routine = Routine::create($validated);

        // The Routine model should automatically create a form in the creating event
        // But let's ensure it has one
        if (! $routine->form_id) {
            // Create the form for the routine
            $form = Form::create([
                'name' => $routine->name.' - Formulário',
                'description' => 'Formulário para a rotina '.$routine->name,
                'is_active' => true,
                'created_by' => auth()->id(),
            ]);

            $routine->form_id = $form->id;
            $routine->save();
        }

        // Load the relationships - form is newly created so it won't have tasks yet
        $routine->load(['asset', 'form']);

        // Return to the same page with the new routine data
        return redirect()->route('asset-hierarchy.assets.show', ['asset' => $asset->id, 'tab' => 'rotinas'])
            ->with([
                'success' => 'Rotina criada com sucesso.',
                'newRoutineId' => $routine->id,
            ]);
    }

    public function updateAssetRoutine(Request $request, Asset $asset, Routine $routine)
    {
        // Verificar se a rotina pertence ao ativo
        if ($routine->asset_id !== $asset->id) {
            return redirect()->back()
                ->with('error', 'Esta rotina não pertence a este ativo.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:1',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string',
        ]);

        $routine->update($validated);

        return redirect()->back()
            ->with('success', 'Rotina atualizada com sucesso.');
    }

    public function destroyAssetRoutine(Asset $asset, Routine $routine)
    {
        // Verificar se a rotina pertence ao ativo
        if ($routine->asset_id !== $asset->id) {
            return redirect()->back()
                ->with('error', 'Esta rotina não pertence a este ativo.');
        }

        $routineName = $routine->name;

        // Excluir execuções da rotina
        $routine->routineExecutions()->delete();

        // Excluir a rotina (o formulário será excluído automaticamente pelo model event)
        $routine->delete();

        return redirect()->back()
            ->with('success', "Rotina '{$routineName}' removida do ativo com sucesso.");
    }

    public function storeAssetRoutineForm(Request $request, Asset $asset, Routine $routine)
    {
        // Verificar se a rotina pertence ao ativo
        if ($routine->asset_id !== $asset->id) {
            return redirect()->back()
                ->with('error', 'Esta rotina não pertence a este ativo.');
        }

        $validated = $request->validate([
            'tasks' => 'required|string', // JSON string of tasks
        ]);

        $tasksData = json_decode($validated['tasks'], true);

        DB::beginTransaction();
        try {
            // Check if form exists
            if (! $routine->form) {
                throw new \Exception('Routine has no associated form');
            }

            // Remove existing draft tasks
            $routine->form->draftTasks()->delete();

            // Create new draft tasks
            foreach ($tasksData as $index => $taskData) {
                $this->createFormTask($routine->form, $taskData, $index + 1); // Position starts at 1, not 0
            }

            DB::commit();

            return redirect()->back()
                ->with('success', 'Rascunho do formulário salvo com sucesso. Publique para torná-lo disponível.');
        } catch (\Exception $e) {
            DB::rollback();

            return redirect()->back()
                ->with('error', 'Erro ao salvar formulário: '.$e->getMessage());
        }
    }

    public function publishAssetRoutineForm(Request $request, Asset $asset, Routine $routine)
    {
        // Verificar se a rotina pertence ao ativo
        if ($routine->asset_id !== $asset->id) {
            return redirect()->back()
                ->with('error', 'Esta rotina não pertence a este ativo.');
        }

        // Check if there are draft tasks to publish
        if (! $routine->form->draftTasks()->exists()) {
            return redirect()->back()
                ->with('error', 'Não há alterações para publicar.');
        }

        DB::beginTransaction();
        try {
            // Publish the form
            $version = $routine->form->publish(auth()->id());

            // Update routine's active version
            $routine->active_form_version_id = $version->id;
            
            // Automatically activate the routine when published
            $routine->status = 'Active';
            
            $routine->save();

            DB::commit();

            return redirect()->back()
                ->with('success', 'Formulário publicado com sucesso! Versão '.$version->getVersionLabel().' está agora ativa.');
        } catch (\Exception $e) {
            DB::rollback();

            return redirect()->back()
                ->with('error', 'Erro ao publicar formulário: '.$e->getMessage());
        }
    }

    public function assetRoutineExecutions(Asset $asset, Routine $routine)
    {
        // Verificar se a rotina pertence ao ativo
        if ($routine->asset_id !== $asset->id) {
            return redirect()->back()
                ->with('error', 'Esta rotina não pertence a este ativo.');
        }

        $executions = RoutineExecution::where('routine_id', $routine->id)
            ->with(['executedBy:id,name', 'formExecution.responses.task'])
            ->orderBy('executed_at', 'desc')
            ->paginate(15);

        return Inertia::render('asset-hierarchy/assets/routine-executions', [
            'asset' => $asset,
            'routine' => $routine->load('form'),
            'executions' => $executions,
        ]);
    }

    public function storeAssetRoutineExecution(Request $request, Asset $asset, Routine $routine)
    {
        // Verificar se a rotina pertence ao ativo
        if ($routine->asset_id !== $asset->id) {
            return redirect()->back()
                ->with('error', 'Esta rotina não pertence a este ativo.');
        }

        $validated = $request->validate([
            'responses' => 'required|array',
            'responses.*.task_id' => 'required|exists:form_tasks,id',
            'responses.*.value' => 'nullable',
            'responses.*.measurement' => 'nullable|array',
            'responses.*.measurement.value' => 'nullable|numeric',
            'responses.*.files' => 'nullable|array',
            'responses.*.files.*' => 'file|max:10240', // 10MB max per file
        ]);

        // Criar execução da rotina
        $routineExecution = RoutineExecution::create([
            'routine_id' => $routine->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
            'executed_by' => auth()->id(),
            'executed_at' => now(),
        ]);

        // Criar execução do formulário
        $formExecution = FormExecution::create([
            'form_id' => $routine->form_id,
            'asset_id' => $asset->id,
            'routine_execution_id' => $routineExecution->id,
            'executed_by' => auth()->id(),
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        // Processar cada resposta
        foreach ($validated['responses'] as $response) {
            $formTask = FormTask::find($response['task_id']);

            $responseData = [
                'form_execution_id' => $formExecution->id,
                'form_task_id' => $response['task_id'],
                'type' => $formTask->type,
            ];

            // Processar valor baseado no tipo
            switch ($formTask->type) {
                case 'measurement':
                    if (isset($response['measurement']['value'])) {
                        $responseData['value'] = json_encode($response['measurement']);
                    }
                    break;

                case 'multiple_select':
                    if (isset($response['value']) && is_array($response['value'])) {
                        $responseData['value'] = json_encode($response['value']);
                    }
                    break;

                case 'photo':
                case 'file_upload':
                    // Arquivos serão processados separadamente
                    break;

                default:
                    $responseData['value'] = $response['value'] ?? null;
            }

            $formResponse = FormResponse::create($responseData);

            // Processar arquivos se existirem
            if (isset($response['files']) && is_array($response['files'])) {
                foreach ($response['files'] as $file) {
                    $path = $file->store('form-responses/'.$formExecution->id, 'public');

                    $formResponse->attachments()->create([
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                        'uploaded_by' => auth()->id(),
                    ]);
                }
            }
        }

        return redirect()->route('asset-hierarchy.assets.show', ['asset' => $asset->id, 'tab' => 'rotinas'])
            ->with('success', 'Formulário preenchido com sucesso.');
    }

    /**
     * Get routine details with form data for API/AJAX requests
     */
    public function getRoutineWithFormData(Routine $routine)
    {
        // Check if routine has a form
        if (! $routine->form) {
            return response()->json(['error' => 'Routine has no associated form'], 404);
        }

        $routine->load(['form.draftTasks.instructions', 'form.currentVersion.tasks.instructions']);

        // Get tasks - draft tasks if available, otherwise current version tasks
        $tasks = collect([]);
        if ($routine->form->draftTasks->count() > 0) {
            $tasks = $routine->form->draftTasks;
        } elseif ($routine->form->currentVersion) {
            $tasks = $routine->form->currentVersion->tasks;
        }

        // Transform tasks to frontend format
        $formattedTasks = $tasks->map(function ($task) {
            return [
                'id' => (string) $task->id,
                'type' => $this->mapTaskType($task->type),
                'description' => $task->description,
                'isRequired' => $task->is_required,
                'state' => 'viewing',
                'measurement' => $task->getMeasurementConfig(),
                'options' => $task->getOptions(),
                'codeReaderType' => $task->getCodeReaderType(),
                'instructionImages' => $task->instructions->where('type', 'image')->pluck('media_url')->toArray(),
            ];
        });

        return response()->json([
            'routine' => [
                'id' => $routine->id,
                'name' => $routine->name,
                'description' => $routine->description,
                'trigger_hours' => $routine->trigger_hours,
                'status' => $routine->status,
                'form' => [
                    'id' => $routine->form->id,
                    'tasks' => $formattedTasks,
                    'is_draft' => $routine->form->isDraft(),
                    'current_version_id' => $routine->form->current_version_id,
                    'has_draft_changes' => $routine->form->draftTasks()->exists(),
                    'current_version' => $routine->form->currentVersion ? [
                        'id' => $routine->form->currentVersion->id,
                        'version_number' => $routine->form->currentVersion->version_number,
                        'published_at' => $routine->form->currentVersion->published_at,
                    ] : null,
                ],
            ],
        ]);
    }

    public function getFormData(Routine $routine)
    {        
        // Check if routine has a form
        if (! $routine->form) {
            return response()->json(['error' => 'Routine has no associated form'], 404);
        }

        $routine->load([
            'form.draftTasks.instructions',
            'form.currentVersion.tasks.instructions',
            'form.currentVersion.publisher',
            'routineExecutions' => function ($query) {
                $query->where('status', RoutineExecution::STATUS_COMPLETED)
                    ->orderBy('completed_at', 'desc')
                    ->limit(1)
                    ->with('executor:id,name');
            },
        ]);

        // If form is published and has no draft tasks, create draft from current version
        if ($routine->form->current_version_id && ! $routine->form->draftTasks()->exists()) {
            $routine->form->createDraftFromCurrentVersion();
            // Reload draft tasks after creation
            $routine->form->load('draftTasks.instructions');
        }

        // Get tasks - draft tasks if available, otherwise current version tasks
        $tasks = collect([]);
        $draftUpdatedAt = null;
        $draftUpdatedBy = null;

        if ($routine->form->draftTasks->count() > 0) {
            $tasks = $routine->form->draftTasks;
            // Get the most recent draft task update
            $latestDraftTask = $routine->form->draftTasks()
                ->orderBy('updated_at', 'desc')
                ->first();
            if ($latestDraftTask) {
                $draftUpdatedAt = $latestDraftTask->updated_at;
                // For now, we'll use the current user as the editor
                // In a real implementation, you might want to track who last edited each task
                $draftUpdatedBy = auth()->user();
            }
        } elseif ($routine->form->currentVersion) {
            $tasks = $routine->form->currentVersion->tasks;
        } else {
        }

        // Transform tasks to frontend format
        $formattedTasks = $tasks->map(function ($task) {
            return [
                'id' => (string) $task->id,
                'type' => $this->mapTaskType($task->type),
                'description' => $task->description,
                'isRequired' => $task->is_required,
                'state' => 'viewing',
                'measurement' => $task->getMeasurementConfig(),
                'options' => $task->getOptions(),
                'codeReaderType' => $task->getCodeReaderType(),
                'instructionImages' => $task->instructions->where('type', 'image')->pluck('media_url')->toArray(),
                'form_version_id' => $task->form_version_id,
            ];
        });

        // Get last execution data
        $lastExecution = $routine->routineExecutions->first();

        $responseData = [
            'routine' => [
                'id' => $routine->id,
                'name' => $routine->name,
                'description' => $routine->description,
                'trigger_hours' => $routine->trigger_hours,
                'status' => $routine->status,
                'form' => [
                    'id' => $routine->form->id,
                    'tasks' => $formattedTasks,
                    'is_draft' => $routine->form->isDraft(),
                    'current_version_id' => $routine->form->current_version_id,
                    'has_draft_changes' => $routine->form->draftTasks()->exists(),
                    'draft_updated_at' => $draftUpdatedAt,
                    'draft_updated_by' => $draftUpdatedBy,
                    'current_version' => $routine->form->currentVersion ? [
                        'id' => $routine->form->currentVersion->id,
                        'version_number' => $routine->form->currentVersion->version_number,
                        'published_at' => $routine->form->currentVersion->published_at,
                        'published_by' => $routine->form->currentVersion->publisher ? [
                            'id' => $routine->form->currentVersion->publisher->id,
                            'name' => $routine->form->currentVersion->publisher->name,
                        ] : null,
                    ] : null,
                    'last_execution' => $lastExecution,
                ],
            ],
        ];

        return response()->json($responseData);
    }

    /**
     * Get execution history for a specific asset
     */
    public function getAssetExecutionHistory(Request $request, Asset $asset)
    {
        $perPage = $request->input('per_page', 10);
        $page = $request->input('page', 1);
        $sort = $request->input('sort', 'started_at');
        $direction = $request->input('direction', 'desc');

        // Get executions for this asset
        $executionsQuery = RoutineExecution::query()
            ->whereHas('routine', function ($query) use ($asset) {
                $query->where('asset_id', $asset->id);
            })
            ->with(['routine', 'executor', 'formExecution.formVersion']);

        // Apply sorting
        switch ($sort) {
            case 'routine_name':
                $executionsQuery->join('routines', 'routine_executions.routine_id', '=', 'routines.id')
                    ->orderBy('routines.name', $direction)
                    ->select('routine_executions.*');
                break;
            case 'executor_name':
                $executionsQuery->join('users', 'routine_executions.executed_by', '=', 'users.id')
                    ->orderBy('users.name', $direction)
                    ->select('routine_executions.*');
                break;
            default:
                $executionsQuery->orderBy($sort, $direction);
        }

        // Paginate results
        $executions = $executionsQuery->paginate($perPage, ['*'], 'page', $page);

        // Transform execution data for frontend
        $executionData = $executions->map(function ($execution) {
            // Add safety checks for relationships
            $routineData = null;
            $executorData = null;
            $formVersionData = null;
            
            if ($execution->routine) {
                $routineData = [
                    'id' => $execution->routine->id,
                    'name' => $execution->routine->name,
                    'description' => $execution->routine->description,
                ];
            }
            
            if ($execution->executor) {
                $executorData = [
                    'id' => $execution->executor->id,
                    'name' => $execution->executor->name,
                ];
            }
            
            if ($execution->formExecution && $execution->formExecution->formVersion) {
                $formVersionData = [
                    'id' => $execution->formExecution->formVersion->id,
                    'version_number' => $execution->formExecution->formVersion->version_number,
                    'published_at' => $execution->formExecution->formVersion->published_at,
                ];
            }
            
            return [
                'id' => $execution->id,
                'routine' => $routineData,
                'executor' => $executorData,
                'form_version' => $formVersionData,
                'status' => $execution->status,
                'started_at' => $execution->started_at,
                'completed_at' => $execution->completed_at,
                'duration_minutes' => $execution->duration_minutes,
                'progress' => $execution->progress_percentage,
                'task_summary' => $execution->task_summary,
            ];
        });

        return response()->json([
            'executions' => [
                'data' => $executionData,
                'current_page' => $executions->currentPage(),
                'last_page' => $executions->lastPage(),
                'per_page' => $executions->perPage(),
                'total' => $executions->total(),
                'from' => $executions->firstItem(),
                'to' => $executions->lastItem(),
            ],
            'filters' => [
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }
}

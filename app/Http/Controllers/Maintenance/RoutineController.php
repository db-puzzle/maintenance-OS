<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\Maintenance\Routine;
use App\Models\Forms\Form;
use App\Models\Forms\FormTask;
use App\Models\AssetHierarchy\Asset;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Maintenance\RoutineExecution;
use App\Models\Forms\FormExecution;
use App\Models\Forms\FormResponse;
use Illuminate\Support\Facades\DB;

class RoutineController extends Controller
{
    public function index()
    {
        $routines = Routine::with(['assets', 'form', 'routineExecutions'])->get();
        
        return Inertia::render('Maintenance/Routines/Index', [
            'routines' => $routines
        ]);
    }
    
    public function create()
    {
        $assets = Asset::all();
        $availableForms = Form::whereDoesntHave('routine')
            ->where('is_active', true)
            ->get();
        
        return Inertia::render('Maintenance/Routines/Create', [
            'assets' => $assets,
            'availableForms' => $availableForms
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:0',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string',
            'asset_ids' => 'required|array|min:1',
            'asset_ids.*' => 'exists:assets,id'
        ]);

        $assetIds = $validated['asset_ids'];
        unset($validated['asset_ids']);

        $routine = Routine::create($validated);
        $routine->assets()->attach($assetIds);

        return redirect()->route('maintenance.routines.edit', $routine)
            ->with('success', 'Rotina criada com sucesso.');
    }

    public function show(Routine $routine)
    {
        $routine->load(['assets', 'form', 'routineExecutions']);
        
        return Inertia::render('Maintenance/Routines/Show', [
            'routine' => $routine
        ]);
    }
    
    public function edit(Routine $routine)
    {
        $routine->load(['assets', 'form']);
        
        $assets = Asset::all();
        $availableForms = Form::whereDoesntHave('routine')
            ->where('is_active', true)
            ->orWhere('id', $routine->form_id)
            ->get();
            
        return Inertia::render('Maintenance/Routines/Edit', [
            'routine' => $routine,
            'assets' => $assets,
            'availableForms' => $availableForms
        ]);
    }

    public function update(Request $request, Routine $routine)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:0',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string',
            'asset_ids' => 'required|array|min:1',
            'asset_ids.*' => 'exists:assets,id'
        ]);

        $assetIds = $validated['asset_ids'];
        unset($validated['asset_ids']);

        $routine->update($validated);
        $routine->assets()->sync($assetIds);

        return redirect()->back()
            ->with('success', 'Rotina atualizada com sucesso.');
    }

    public function destroy(Routine $routine)
    {
        // Verificar se existem execuções associadas
        if ($routine->routineExecutions()->count() > 0) {
            return redirect()->back()
                ->with('error', 'Não é possível excluir uma rotina com execuções associadas.');
        }

        $routine->delete();
        
        return redirect()->route('maintenance.routines.index')
            ->with('success', 'Rotina excluída com sucesso.');
    }

    public function createExecution(Routine $routine)
    {
        $execution = new RoutineExecution([
            'routine_id' => $routine->id,
            'status' => RoutineExecution::STATUS_PENDING
        ]);
        $execution->save();

        return redirect()->route('maintenance.executions.edit', $execution)
            ->with('success', 'Nova execução da rotina criada com sucesso.');
    }

    public function executions(Routine $routine)
    {
        $executions = $routine->routineExecutions()->with(['executor'])->get();
        
        return Inertia::render('Maintenance/Routines/Executions', [
            'routine' => $routine,
            'executions' => $executions
        ]);
    }

    public function formEditor(Routine $routine, Request $request)
    {
        $routine->load(['form.draftTasks.instructions', 'form.currentVersion.tasks.instructions', 'assets']);
        
        // Se não há asset especificado, pegar o primeiro asset da rotina
        $assetId = $request->get('asset');
        $asset = null;
        
        if ($assetId) {
            $asset = Asset::find($assetId);
        } else if ($routine->assets->count() > 0) {
            $asset = $routine->assets->first();
        }
        
        if (!$asset) {
            return redirect()->back()
                ->with('error', 'Não foi possível encontrar um ativo associado a esta rotina.');
        }

        // Get tasks - draft tasks if available, otherwise current version tasks
        $tasks = [];
        if ($routine->form->draftTasks->count() > 0) {
            $tasks = $routine->form->draftTasks;
        } elseif ($routine->form->currentVersion) {
            $tasks = $routine->form->currentVersion->tasks;
        }

        // Converter FormTasks para o formato usado no frontend
        $formattedTasks = $tasks->map(function ($task) {
            return [
                'id' => (string)$task->id,
                'type' => $this->mapTaskType($task->type),
                'description' => $task->description,
                'isRequired' => $task->is_required,
                'state' => 'viewing',
                'measurement' => $task->getMeasurementConfig(),
                'options' => $task->getOptions(),
                'codeReaderType' => $task->getCodeReaderType(),
                'instructionImages' => $task->instructions->where('type', 'image')->pluck('media_url')->toArray()
            ];
        });

        return Inertia::render('Routines/RoutineFormEditor', [
            'routine' => [
                'id' => $routine->id,
                'name' => $routine->name,
                'form' => [
                    'id' => $routine->form->id,
                    'tasks' => $formattedTasks,
                    'isDraft' => $routine->form->isDraft(),
                    'currentVersionId' => $routine->form->current_version_id
                ]
            ],
            'asset' => [
                'id' => $asset->id,
                'tag' => $asset->tag
            ]
        ]);
    }

    public function storeForm(Request $request, Routine $routine)
    {
        $validated = $request->validate([
            'tasks' => 'required|string' // JSON string of tasks
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
                ->with('error', 'Erro ao salvar formulário: ' . $e->getMessage());
        }
    }

    public function publishForm(Request $request, Routine $routine)
    {
        // Check if there are draft tasks to publish
        if (!$routine->form->draftTasks()->exists()) {
            return redirect()->back()
                ->with('error', 'Não há alterações para publicar.');
        }

        DB::beginTransaction();
        try {
            // Publish the form
            $version = $routine->form->publish(auth()->id());

            // Update routine's active version
            $routine->active_form_version_id = $version->id;
            $routine->save();

            DB::commit();

            return redirect()->back()
                ->with('success', 'Formulário publicado com sucesso! Versão ' . $version->getVersionLabel() . ' está agora ativa.');
        } catch (\Exception $e) {
            DB::rollback();
            return redirect()->back()
                ->with('error', 'Erro ao publicar formulário: ' . $e->getMessage());
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
            'file_upload' => 'file_upload'
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
            'configuration' => $configuration
        ]);

        // Criar instruções se existirem
        if (isset($taskData['instructionImages']) && is_array($taskData['instructionImages'])) {
            foreach ($taskData['instructionImages'] as $index => $imagePath) {
                $task->instructions()->create([
                    'position' => $index,
                    'type' => 'image',
                    'media_url' => $imagePath
                ]);
            }
        }
    }

    // ===== MÉTODOS PARA GERENCIAR ROTINAS NO CONTEXTO DE ATIVOS =====

    public function assetRoutines(Asset $asset)
    {
        $routines = $asset->routines()->with(['form', 'routineExecutions'])->get();
        
        return Inertia::render('asset-hierarchy/assets/routines', [
            'asset' => $asset,
            'routines' => $routines
        ]);
    }

    public function storeAssetRoutine(Request $request, Asset $asset)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:1',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string'
        ]);

        $routine = Routine::create($validated);
        $routine->assets()->attach($asset->id);
        
        // Create the form for the routine
        $form = Form::create([
            'name' => $routine->name . ' - Formulário',
            'description' => 'Formulário para a rotina ' . $routine->name,
            'is_active' => true,
            'created_by' => auth()->id()
        ]);
        
        $routine->form_id = $form->id;
        $routine->save();
        
        // Load the relationships - form is newly created so it won't have tasks yet
        $routine->load(['assets', 'form']);

        // Return to the same page with the new routine data
        return redirect()->route('asset-hierarchy.assets.show', ['asset' => $asset->id, 'tab' => 'rotinas'])
            ->with([
                'success' => 'Rotina criada com sucesso.',
                'newRoutineId' => $routine->id
            ]);
    }

    public function updateAssetRoutine(Request $request, Asset $asset, Routine $routine)
    {
        // Verificar se a rotina está associada ao ativo
        if (!$asset->routines()->where('routines.id', $routine->id)->exists()) {
            return redirect()->back()
                ->with('error', 'Esta rotina não está associada a este ativo.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:1',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string'
        ]);

        $routine->update($validated);
        
        return redirect()->back()
            ->with('success', 'Rotina atualizada com sucesso.');
    }

    public function destroyAssetRoutine(Asset $asset, Routine $routine)
    {
        // Verificar se a rotina está associada ao ativo
        if (!$asset->routines()->where('routines.id', $routine->id)->exists()) {
            return redirect()->back()
                ->with('error', 'Esta rotina não está associada a este ativo.');
        }

        $routineName = $routine->name;

        // Se a rotina está associada apenas a este ativo, excluir completamente
        if ($routine->assets()->count() === 1) {
            // Excluir execuções da rotina
            $routine->routineExecutions()->delete();
            
            // Excluir a rotina (o formulário será excluído automaticamente pelo model event)
            $routine->delete();
        } else {
            // Apenas desassociar do ativo
            $asset->routines()->detach($routine->id);
        }

        return redirect()->back()
            ->with('success', "Rotina '{$routineName}' removida do ativo com sucesso.");
    }

    public function storeAssetRoutineForm(Request $request, Asset $asset, Routine $routine)
    {
        // Verificar se a rotina está associada ao ativo
        if (!$asset->routines()->where('routines.id', $routine->id)->exists()) {
            return redirect()->back()
                ->with('error', 'Esta rotina não está associada a este ativo.');
        }

        $validated = $request->validate([
            'tasks' => 'required|string' // JSON string of tasks
        ]);

        $tasksData = json_decode($validated['tasks'], true);

        DB::beginTransaction();
        try {
            // Check if form exists
            if (!$routine->form) {
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
                ->with('error', 'Erro ao salvar formulário: ' . $e->getMessage());
        }
    }

    public function publishAssetRoutineForm(Request $request, Asset $asset, Routine $routine)
    {
        // Verificar se a rotina está associada ao ativo
        if (!$asset->routines()->where('routines.id', $routine->id)->exists()) {
            return redirect()->back()
                ->with('error', 'Esta rotina não está associada a este ativo.');
        }

        // Check if there are draft tasks to publish
        if (!$routine->form->draftTasks()->exists()) {
            return redirect()->back()
                ->with('error', 'Não há alterações para publicar.');
        }

        DB::beginTransaction();
        try {
            // Publish the form
            $version = $routine->form->publish(auth()->id());

            // Update routine's active version
            $routine->active_form_version_id = $version->id;
            $routine->save();

            DB::commit();

            return redirect()->back()
                ->with('success', 'Formulário publicado com sucesso! Versão ' . $version->getVersionLabel() . ' está agora ativa.');
        } catch (\Exception $e) {
            DB::rollback();
            return redirect()->back()
                ->with('error', 'Erro ao publicar formulário: ' . $e->getMessage());
        }
    }

    public function assetRoutineExecutions(Asset $asset, Routine $routine)
    {
        // Verificar se a rotina está associada ao ativo
        if (!$asset->routines()->where('routines.id', $routine->id)->exists()) {
            return redirect()->back()
                ->with('error', 'Esta rotina não está associada a este ativo.');
        }

        $executions = RoutineExecution::where('routine_id', $routine->id)
            ->with(['executedBy:id,name', 'formExecution.responses.task'])
            ->orderBy('executed_at', 'desc')
            ->paginate(15);

        return Inertia::render('asset-hierarchy/assets/routine-executions', [
            'asset' => $asset,
            'routine' => $routine->load('form'),
            'executions' => $executions
        ]);
    }

    public function storeAssetRoutineExecution(Request $request, Asset $asset, Routine $routine)
    {
        // Verificar se a rotina está associada ao ativo
        if (!$asset->routines()->where('routines.id', $routine->id)->exists()) {
            return redirect()->back()
                ->with('error', 'Esta rotina não está associada a este ativo.');
        }

        $validated = $request->validate([
            'responses' => 'required|array',
            'responses.*.task_id' => 'required|exists:form_tasks,id',
            'responses.*.value' => 'nullable',
            'responses.*.measurement' => 'nullable|array',
            'responses.*.measurement.value' => 'nullable|numeric',
            'responses.*.files' => 'nullable|array',
            'responses.*.files.*' => 'file|max:10240' // 10MB max per file
        ]);

        // Criar execução da rotina
        $routineExecution = RoutineExecution::create([
            'routine_id' => $routine->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
            'executed_by' => auth()->id(),
            'executed_at' => now()
        ]);

        // Criar execução do formulário
        $formExecution = FormExecution::create([
            'form_id' => $routine->form_id,
            'asset_id' => $asset->id,
            'routine_execution_id' => $routineExecution->id,
            'executed_by' => auth()->id(),
            'started_at' => now(),
            'completed_at' => now()
        ]);

        // Processar cada resposta
        foreach ($validated['responses'] as $response) {
            $formTask = FormTask::find($response['task_id']);
            
            $responseData = [
                'form_execution_id' => $formExecution->id,
                'form_task_id' => $response['task_id'],
                'type' => $formTask->type
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
                    $path = $file->store('form-responses/' . $formExecution->id, 'public');
                    
                    $formResponse->attachments()->create([
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                        'uploaded_by' => auth()->id()
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
        $routine->load(['form.draftTasks.instructions', 'form.currentVersion.tasks.instructions']);
        
        // Get tasks - draft tasks if available, otherwise current version tasks
        $tasks = [];
        if ($routine->form->draftTasks->count() > 0) {
            $tasks = $routine->form->draftTasks;
        } elseif ($routine->form->currentVersion) {
            $tasks = $routine->form->currentVersion->tasks;
        }

        // Transform tasks to frontend format
        $formattedTasks = $tasks->map(function ($task) {
            return [
                'id' => (string)$task->id,
                'type' => $this->mapTaskType($task->type),
                'description' => $task->description,
                'isRequired' => $task->is_required,
                'state' => 'viewing',
                'measurement' => $task->getMeasurementConfig(),
                'options' => $task->getOptions(),
                'codeReaderType' => $task->getCodeReaderType(),
                'instructionImages' => $task->instructions->where('type', 'image')->pluck('media_url')->toArray()
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
                    'has_draft_changes' => $routine->form->draftTasks()->exists()
                ]
            ]
        ]);
    }
} 
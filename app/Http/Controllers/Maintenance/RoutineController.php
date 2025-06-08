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
            'form_id' => 'nullable|exists:forms,id|unique:routines,form_id',
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
            'form_id' => 'nullable|exists:forms,id|unique:routines,form_id,' . $routine->id,
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
        $routine->load(['form.tasks', 'assets']);
        
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

        // Se a rotina não tem formulário, criar um novo
        if (!$routine->form) {
            $form = Form::create([
                'is_active' => true,
                'created_by' => auth()->id()
            ]);
            
            $routine->update(['form_id' => $form->id]);
            $routine->load('form.tasks');
        }

        // Converter FormTasks para o formato usado no frontend
        $tasks = $routine->form->tasks->map(function ($task) {
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
                    'tasks' => $tasks
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

        // Se a rotina já tem um formulário, atualizar
        if ($routine->form) {
            // Remover tarefas existentes
            $routine->form->tasks()->delete();
        } else {
            // Criar novo formulário
            $form = Form::create([
                'is_active' => true,
                'created_by' => auth()->id()
            ]);
            
            $routine->update(['form_id' => $form->id]);
            $routine->refresh();
        }

        // Criar novas tarefas
        foreach ($tasksData as $index => $taskData) {
            $this->createFormTask($routine->form, $taskData, $index);
        }

        return redirect()->back()
            ->with('success', 'Formulário salvo com sucesso.');
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

        $task = $form->tasks()->create([
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
        $routine->load('assets', 'form');

        return redirect()->back()
            ->with('success', 'Rotina criada com sucesso.')
            ->with('newRoutine', $routine->toArray());
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
            
            // Excluir formulário se existir
            if ($routine->form) {
                $routine->form->tasks()->delete();
                $routine->form->delete();
            }
            
            // Excluir a rotina
            $routine->delete();
        } else {
            // Apenas desassociar do ativo
            $asset->routines()->detach($routine->id);
        }

        return redirect()->back()
            ->with('success', "Rotina '{$routineName}' removida do ativo com sucesso.");
    }

    public function assetRoutineFormEditor(Asset $asset, Routine $routine, Request $request)
    {
        // Verificar se a rotina está associada ao ativo
        if (!$asset->routines()->where('routines.id', $routine->id)->exists()) {
            return redirect()->back()
                ->with('error', 'Esta rotina não está associada a este ativo.');
        }

        $routine->load(['form.tasks']);

        // Se a rotina não tem formulário, criar um novo
        if (!$routine->form) {
            $form = Form::create([
                'is_active' => true,
                'created_by' => auth()->id()
            ]);
            
            $routine->update(['form_id' => $form->id]);
            $routine->load('form.tasks');
        }

        // Converter FormTasks para o formato usado no frontend
        $tasks = $routine->form->tasks->map(function ($task) {
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

        return Inertia::render('routines/routine-form-editor', [
            'routine' => [
                'id' => $routine->id,
                'name' => $routine->name,
                'form' => [
                    'id' => $routine->form->id,
                    'tasks' => $tasks
                ]
            ],
            'asset' => [
                'id' => $asset->id,
                'tag' => $asset->tag
            ]
        ]);
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

        // Se a rotina já tem um formulário, atualizar
        if ($routine->form) {
            // Remover tarefas existentes
            $routine->form->tasks()->delete();
        } else {
            // Criar novo formulário
            $form = Form::create([
                'is_active' => true,
                'created_by' => auth()->id()
            ]);
            
            $routine->update(['form_id' => $form->id]);
            $routine->refresh();
        }

        // Criar novas tarefas
        foreach ($tasksData as $index => $taskData) {
            $this->createFormTask($routine->form, $taskData, $index);
        }

        return redirect()->back()
            ->with('success', 'Formulário salvo com sucesso.');
    }

    public function assetRoutineForm(Asset $asset, Routine $routine, Request $request)
    {
        // Verificar se a rotina está associada ao ativo
        if (!$asset->routines()->where('routines.id', $routine->id)->exists()) {
            return redirect()->back()
                ->with('error', 'Esta rotina não está associada a este ativo.');
        }

        $routine->load(['form.tasks.instructions']);

        if (!$routine->form) {
            return redirect()->back()
                ->with('error', 'Esta rotina não possui um formulário associado.');
        }

        // Determinar o modo (view ou fill)
        $mode = $request->get('mode', 'view');
        if (!in_array($mode, ['view', 'fill'])) {
            $mode = 'view';
        }

        // Converter FormTasks para o formato usado no frontend
        $tasks = $routine->form->tasks->map(function ($task) use ($mode) {
            return [
                'id' => (string)$task->id,
                'type' => $this->mapTaskType($task->type),
                'description' => $task->description,
                'isRequired' => $task->is_required,
                'state' => $mode === 'fill' ? 'responding' : 'viewing',
                'measurement' => $task->getMeasurementConfig(),
                'options' => $task->getOptions(),
                'codeReaderType' => $task->getCodeReaderType(),
                'instructionImages' => $task->instructions->where('type', 'image')->pluck('media_url')->toArray()
            ];
        });

        return Inertia::render('routines/routine-form', [
            'routine' => [
                'id' => $routine->id,
                'name' => $routine->name,
                'form' => [
                    'id' => $routine->form->id,
                    'tasks' => $tasks
                ]
            ],
            'asset' => [
                'id' => $asset->id,
                'tag' => $asset->tag
            ],
            'mode' => $mode
        ]);
    }

    public function assetRoutineFormView(Asset $asset, Routine $routine)
    {
        return $this->assetRoutineForm($asset, $routine, request()->merge(['mode' => 'view']));
    }

    public function assetRoutineFormFill(Asset $asset, Routine $routine)
    {
        return $this->assetRoutineForm($asset, $routine, request()->merge(['mode' => 'fill']));
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
} 
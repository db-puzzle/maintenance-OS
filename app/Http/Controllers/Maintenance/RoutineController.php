<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormTask;
use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
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
            'advance_generation_hours' => 'nullable|integer|min:0',
            'auto_approve_work_orders' => 'nullable|boolean',
            'default_priority' => 'nullable|in:emergency,urgent,high,normal,low',
        ]);
        
        // Check if user can manage the asset (which includes managing its routines)
        $asset = Asset::findOrFail($validated['asset_id']);
        $this->authorize('manage', $asset);
        
        // Force status to Inactive for new routines
        $validated['status'] = 'Inactive';
        
        // Set defaults
        $validated['advance_generation_hours'] = $validated['advance_generation_hours'] ?? 168;
        $validated['auto_approve_work_orders'] = $validated['auto_approve_work_orders'] ?? true;
        $validated['default_priority'] = $validated['default_priority'] ?? 'normal';

        $routine = Routine::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Rotina criada com sucesso.',
            'routine' => $routine->load(['asset', 'form']),
        ]);
    }

    public function update(Request $request, Routine $routine)
    {
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $routine->asset);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:0',
            'status' => 'required|in:Active,Inactive',
            'description' => 'nullable|string',
            'asset_id' => 'required|exists:assets,id',
            'advance_generation_hours' => 'nullable|integer|min:0',
            'auto_approve_work_orders' => 'nullable|boolean',
            'default_priority' => 'nullable|in:emergency,urgent,high,normal,low',
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
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $routine->asset);
        
        // Check if there are work orders associated
        if ($routine->workOrders()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Não é possível excluir uma rotina com ordens de serviço associadas.',
            ], 400);
        }

        $routine->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rotina excluída com sucesso.',
        ]);
    }

    public function storeForm(Request $request, Routine $routine)
    {
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $routine->asset);
        
        $validated = $request->validate([
            'tasks' => 'required|array',
            'tasks.*.type' => 'required|string',
            'tasks.*.description' => 'nullable|string',
            'tasks.*.isRequired' => 'nullable|boolean',
            'tasks.*.options' => 'nullable|array',
            'tasks.*.measurement' => 'nullable|array',
            'tasks.*.codeReaderType' => 'nullable|string',
            'tasks.*.instructionImages' => 'nullable|array',
        ]);

        DB::transaction(function () use ($validated, $routine) {
            $form = $routine->form;

            // Delete existing draft tasks
            $form->draftTasks()->delete();

            // Create new draft tasks
            foreach ($validated['tasks'] as $index => $taskData) {
                $this->createFormTask($form, $taskData, $index);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Formulário salvo com sucesso.',
        ]);
    }

    public function publishForm(Request $request, Routine $routine)
    {
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $routine->asset);
        
        try {
            DB::transaction(function () use ($routine) {
                $form = $routine->form;

                // Publish the form
                $version = $form->publish(auth()->id());

                // Update routine's active form version
                $routine->update([
                    'active_form_version_id' => $version->id,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Formulário publicado com sucesso.',
            ]);
        } catch (\Exception $e) {
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

        // Add specific configuration based on type
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

        // Create instructions if they exist
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

    // ===== METHODS FOR MANAGING ROUTINES IN THE CONTEXT OF ASSETS =====

    public function storeAssetRoutine(Request $request, Asset $asset)
    {
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $asset);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:1',
            'status' => 'nullable|in:Active,Inactive',
            'description' => 'nullable|string',
            'advance_generation_hours' => 'nullable|integer|min:0',
            'auto_approve_work_orders' => 'nullable|boolean',
            'default_priority' => 'nullable|in:emergency,urgent,high,normal,low',
        ]);

        // Force status to Inactive for new routines
        $validated['status'] = $validated['status'] ?? 'Inactive';
        
        // Set defaults
        $validated['advance_generation_hours'] = $validated['advance_generation_hours'] ?? 168;
        $validated['auto_approve_work_orders'] = $validated['auto_approve_work_orders'] ?? true;
        $validated['default_priority'] = $validated['default_priority'] ?? 'normal';

        $routine = $asset->routines()->create($validated);

        // Load relationships
        $routine->load(['asset', 'form']);

        return response()->json([
            'success' => true,
            'message' => 'Rotina criada com sucesso.',
            'routine' => $routine,
        ]);
    }

    public function updateAssetRoutine(Request $request, Asset $asset, Routine $routine)
    {
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $asset);
        
        // Verify routine belongs to asset
        if ($routine->asset_id !== $asset->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:1',
            'status' => 'nullable|in:Active,Inactive',
            'description' => 'nullable|string',
            'advance_generation_hours' => 'nullable|integer|min:0',
            'auto_approve_work_orders' => 'nullable|boolean',
            'default_priority' => 'nullable|in:emergency,urgent,high,normal,low',
        ]);

        $routine->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Rotina atualizada com sucesso.',
            'routine' => $routine->load(['asset', 'form']),
        ]);
    }

    public function destroyAssetRoutine(Asset $asset, Routine $routine)
    {
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $asset);
        
        // Verify routine belongs to asset
        if ($routine->asset_id !== $asset->id) {
            abort(404);
        }

        // Check if there are work orders associated
        if ($routine->workOrders()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Não é possível excluir uma rotina com ordens de serviço associadas.',
            ], 400);
        }

        $routine->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rotina excluída com sucesso.',
        ]);
    }

    public function storeAssetRoutineForm(Request $request, Asset $asset, Routine $routine)
    {
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $asset);
        
        // Verify routine belongs to asset
        if ($routine->asset_id !== $asset->id) {
            abort(404);
        }

        $validated = $request->validate([
            'tasks' => 'required|array',
            'tasks.*.type' => 'required|string',
            'tasks.*.description' => 'nullable|string',
            'tasks.*.isRequired' => 'nullable|boolean',
            'tasks.*.options' => 'nullable|array',
            'tasks.*.measurement' => 'nullable|array',
            'tasks.*.codeReaderType' => 'nullable|string',
            'tasks.*.instructionImages' => 'nullable|array',
        ]);

        DB::transaction(function () use ($validated, $routine) {
            $form = $routine->form;

            // Delete existing draft tasks
            $form->draftTasks()->delete();

            // Create new draft tasks
            foreach ($validated['tasks'] as $index => $taskData) {
                $this->createFormTask($form, $taskData, $index);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Formulário salvo com sucesso.',
        ]);
    }

    public function publishAssetRoutineForm(Request $request, Asset $asset, Routine $routine)
    {
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $asset);
        
        // Verify routine belongs to asset
        if ($routine->asset_id !== $asset->id) {
            abort(404);
        }

        try {
            DB::transaction(function () use ($routine) {
                $form = $routine->form;

                // Publish the form
                $version = $form->publish(auth()->id());

                // Update routine's active form version
                $routine->update([
                    'active_form_version_id' => $version->id,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Formulário publicado com sucesso.',
            ]);
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Erro ao publicar formulário: '.$e->getMessage());
        }
    }

    public function getRoutineWithFormData(Routine $routine)
    {
        // Check if user can execute routines for this asset
        $this->authorize('execute-routines', $routine->asset);
        
        $currentVersion = $routine->getFormVersionForExecution();
        $tasks = [];

        if ($currentVersion) {
            // Get tasks with instructions
            $tasks = $currentVersion->tasks()->with('instructions')->get()->map(function ($task) {
                return [
                    'id' => $task->id,
                    'type' => $this->mapTaskType($task->type),
                    'description' => $task->description,
                    'isRequired' => $task->is_required,
                    'instructionImages' => $task->instructions->map(function ($instruction) {
                        return $instruction->media_url;
                    })->toArray(),
                    'configuration' => $task->configuration,
                ];
            })->toArray();
        }

        return [
            'routine' => [
                'id' => $routine->id,
                'name' => $routine->name,
                'description' => $routine->description,
                'trigger_hours' => $routine->trigger_hours,
            ],
            'form' => [
                'id' => $routine->form->id,
                'name' => $routine->form->name,
                'currentVersionId' => $currentVersion?->id,
                'versionNumber' => $currentVersion?->version_number,
            ],
            'tasks' => $tasks,
        ];
    }

    public function getFormData(Routine $routine)
    {
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $routine->asset);
        
        $form = $routine->form;
        
        // Check if there are draft tasks or use current version
        if ($form->draftTasks()->exists()) {
            // Return draft tasks
            $tasks = $form->draftTasks()->with('instructions')->get();
        } elseif ($form->currentVersion) {
            // Return tasks from current version
            $tasks = $form->currentVersion->tasks()->with('instructions')->get();
        } else {
            $tasks = collect();
        }

        $formattedTasks = $tasks->map(function ($task) {
            $formatted = [
                'id' => $task->id,
                'type' => $this->mapTaskType($task->type),
                'description' => $task->description,
                'isRequired' => $task->is_required,
                'instructionImages' => $task->instructions->map(function ($instruction) {
                    return $instruction->media_url;
                })->toArray(),
            ];

            // Add configuration data based on type
            if ($task->type === 'measurement' && isset($task->configuration['measurement'])) {
                $formatted['measurement'] = $task->configuration['measurement'];
            } elseif (in_array($task->type, ['multiple_choice', 'multiple_select']) && isset($task->configuration['options'])) {
                $formatted['options'] = $task->configuration['options'];
            } elseif ($task->type === 'code_reader' && isset($task->configuration['codeReaderType'])) {
                $formatted['codeReaderType'] = $task->configuration['codeReaderType'];
            }

            return $formatted;
        })->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'form' => [
                    'id' => $form->id,
                    'name' => $form->name,
                    'currentVersionId' => $form->currentVersion?->id,
                    'versionNumber' => $form->currentVersion?->version_number,
                    'isDraft' => $form->isDraft(),
                ],
                'tasks' => $formattedTasks,
            ],
        ]);
    }

    public function getAssetWorkOrderHistory(Request $request, Asset $asset)
    {
        // Check if user can view the asset
        $this->authorize('view', $asset);
        
        $query = WorkOrder::where('asset_id', $asset->id)
            ->with(['type', 'execution', 'requestedBy'])
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->filled('routine_id')) {
            $query->where('source_type', 'routine')
                ->where('source_id', $request->routine_id);
        }

        if ($request->filled('category')) {
            $query->where('work_order_category', $request->category);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $workOrders = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $workOrders,
        ]);
    }
}

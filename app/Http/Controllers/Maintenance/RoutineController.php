<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormTask;
use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
use App\Services\WorkOrders\WorkOrderGenerationService;
use App\Services\WorkOrders\MaintenanceWorkOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RoutineController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_type' => 'required|in:runtime_hours,calendar_days',
            'trigger_runtime_hours' => 'required_if:trigger_type,runtime_hours|nullable|integer|min:1|max:10000',
            'trigger_calendar_days' => 'required_if:trigger_type,calendar_days|nullable|integer|min:1|max:365',
            'execution_mode' => 'required|in:automatic,manual',
            'description' => 'nullable|string',
            'asset_id' => 'required|exists:assets,id',
            'advance_generation_hours' => 'nullable|integer|min:1|max:168',
            'auto_approve_work_orders' => [
                'nullable',
                'boolean',
                function ($attribute, $value, $fail) use ($request) {
                    if ($value && !$request->user()->can('work-orders.approve')) {
                        $fail('Você não tem permissão para habilitar aprovação automática de ordens de serviço.');
                    }
                },
            ],
            'default_priority' => 'nullable|in:emergency,urgent,high,normal,low',
            'priority_score' => 'nullable|integer|min:0|max:100',
        ]);
        
        // Check if user can manage the asset (which includes managing its routines)
        $asset = Asset::findOrFail($validated['asset_id']);
        $this->authorize('manage', $asset);
        
        // Set defaults
        $validated['advance_generation_hours'] = $validated['advance_generation_hours'] ?? 24;
        $validated['auto_approve_work_orders'] = $validated['auto_approve_work_orders'] ?? false;
        $validated['default_priority'] = $validated['default_priority'] ?? 'normal';
        $validated['priority_score'] = $validated['priority_score'] ?? 50;
        $validated['is_active'] = true;
        $validated['created_by'] = auth()->id();

        $routine = Routine::create($validated);

        // For Inertia requests, redirect back to the asset page
        return redirect()->route('asset-hierarchy.assets.show', ['asset' => $asset->id, 'tab' => 'rotinas'])
            ->with('success', 'Rotina criada com sucesso.')
            ->with('newRoutineId', $routine->id);
    }

    public function update(Request $request, Routine $routine)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_type' => 'required|in:runtime_hours,calendar_days',
            'trigger_runtime_hours' => 'required_if:trigger_type,runtime_hours|nullable|integer|min:1|max:10000',
            'trigger_calendar_days' => 'required_if:trigger_type,calendar_days|nullable|integer|min:1|max:365',
            'execution_mode' => 'required|in:automatic,manual',
            'description' => 'nullable|string',
            'advance_generation_hours' => 'nullable|integer|min:1|max:168',
            'auto_approve_work_orders' => [
                'nullable',
                'boolean',
                function ($attribute, $value, $fail) use ($request) {
                    if ($value && !$request->user()->can('work-orders.approve')) {
                        $fail('Você não tem permissão para habilitar aprovação automática de ordens de serviço.');
                    }
                },
            ],
            'default_priority' => 'nullable|in:emergency,urgent,high,normal,low',
            'priority_score' => 'nullable|integer|min:0|max:100',
            'is_active' => 'nullable|boolean',
        ]);
        
        // Check if user can manage the asset (which includes managing its routines)
        $this->authorize('manage', $routine->asset);
        
        // Set defaults for nullable fields
        $validated['advance_generation_hours'] = $validated['advance_generation_hours'] ?? $routine->advance_generation_hours;
        $validated['priority_score'] = $validated['priority_score'] ?? $routine->priority_score;
        
        $routine->update($validated);
        
        return redirect()->route('asset-hierarchy.assets.show', ['asset' => $routine->asset_id, 'tab' => 'rotinas'])
            ->with('success', 'Rotina atualizada com sucesso.');
    }

    public function destroy(Routine $routine)
    {
        // Check if user can manage the asset
        $this->authorize('manage', $routine->asset);
        
        $assetId = $routine->asset->id;
        
        // Delete the routine (this will also delete the associated form)
        $routine->delete();

        // For Inertia requests, redirect back to the asset page
        return redirect()->route('asset-hierarchy.assets.show', ['asset' => $assetId, 'tab' => 'rotinas'])
            ->with('success', 'Rotina excluída com sucesso.');
    }

    public function storeForm(Request $request, Routine $routine)
    {
        // Check if user can manage the asset
        $this->authorize('manage', $routine->asset);
        
        // Parse tasks if they come as JSON string
        $tasksData = $request->input('tasks');
        if (is_string($tasksData)) {
            $tasksData = json_decode($tasksData, true);
            $request->merge(['tasks' => $tasksData]);
        }

        $validated = $request->validate([
            'tasks' => 'required|array',
            'tasks.*.type' => 'required|string|in:question,multiple_choice,multiple_select,measurement,photo,code_reader,file_upload',
            'tasks.*.description' => 'required|string',
            'tasks.*.isRequired' => 'required|boolean', // Frontend sends camelCase
            'tasks.*.measurement' => 'nullable|array',
            'tasks.*.options' => 'nullable|array',
            'tasks.*.instructions' => 'nullable|array',
            'tasks.*.instructionImages' => 'nullable|array',
            'tasks.*.codeReaderType' => 'nullable|string',
            'tasks.*.codeReaderInstructions' => 'nullable|string',
            'tasks.*.fileUploadInstructions' => 'nullable|string',
            'tasks.*.state' => 'nullable|string',
        ]);

        DB::transaction(function () use ($routine, $validated) {
            $form = $routine->form;
            
            // Check if we're editing a published form without existing draft tasks
            // This means we're creating a new version for the first time
            $isEditingPublishedForm = $form->current_version_id && !$form->draftTasks()->exists();
            
            // Delete existing draft tasks (if any)
            $form->draftTasks()->delete();

            // Create new draft tasks
            foreach ($validated['tasks'] as $index => $taskData) {
                $task = FormTask::create([
                    'form_id' => $routine->form_id,
                    'position' => $index + 1,
                    'type' => $taskData['type'],
                    'description' => $taskData['description'],
                    'is_required' => $taskData['isRequired'], // Map camelCase to snake_case
                    'configuration' => [
                        'measurement' => $taskData['measurement'] ?? null,
                        'options' => $taskData['options'] ?? null,
                        'codeReaderType' => $taskData['codeReaderType'] ?? null,
                        'codeReaderInstructions' => $taskData['codeReaderInstructions'] ?? null,
                        'fileUploadInstructions' => $taskData['fileUploadInstructions'] ?? null,
                    ],
                ]);

                // Add instructions if provided
                if (!empty($taskData['instructions'])) {
                    foreach ($taskData['instructions'] as $instructionIndex => $instruction) {
                        $task->instructions()->create([
                            'type' => $instruction['type'],
                            'content' => $instruction['content'],
                            'media_url' => $instruction['media_url'] ?? null,
                            'position' => $instructionIndex + 1,
                        ]);
                    }
                }

                // Add instruction images if provided (legacy support)
                if (!empty($taskData['instructionImages'])) {
                    foreach ($taskData['instructionImages'] as $instructionIndex => $imageUrl) {
                        $task->instructions()->create([
                            'type' => 'image',
                            'content' => 'Instruction image',
                            'media_url' => $imageUrl,
                            'position' => $instructionIndex + 1 + count($taskData['instructions'] ?? []),
                        ]);
                    }
                }
            }
        });

        return back()->with('success', 'Formulário salvo como rascunho.');
    }

    public function publishForm(Routine $routine)
    {
        // Check if user can manage the asset
        $this->authorize('manage', $routine->asset);
        
        try {
            // Eager load the instructions for draft tasks to avoid lazy loading error
            $routine->form->load('draftTasks.instructions');
            
            $version = $routine->form->publish(auth()->id());
            
            // Update routine to use the new version
            $routine->update(['active_form_version_id' => $version->id]);

            return back()->with('success', 'Formulário publicado com sucesso.');
        } catch (\Exception $e) {
            return back()->withErrors(['form' => $e->getMessage()]);
        }
    }

    public function getFormData(Routine $routine)
    {
        // Check if user can view the asset
        $this->authorize('view', $routine->asset);
        
        $form = $routine->form->load([
            'draftTasks' => function ($query) {
                $query->orderBy('position')
                    ->with(['instructions' => function ($q) {
                        $q->orderBy('position');
                    }]);
            },
            'currentVersion.tasks' => function ($query) {
                $query->orderBy('position')
                    ->with(['instructions' => function ($q) {
                        $q->orderBy('position');
                    }]);
            },
        ]);

        // Prepare tasks for frontend - use draft tasks if available, otherwise use published tasks
        $tasks = [];
        if ($form->draftTasks->count() > 0) {
            $tasks = $form->draftTasks->map(function ($task) {
                return [
                    'id' => $task->id,
                    'type' => $task->type,
                    'description' => $task->description,
                    'isRequired' => $task->is_required,
                    'position' => $task->position,
                    'measurement' => $task->configuration['measurement'] ?? null,
                    'options' => $task->configuration['options'] ?? [],
                    'instructions' => $task->instructions->map(function ($instruction) {
                        return [
                            'type' => $instruction->type,
                            'content' => $instruction->content,
                            'media_url' => $instruction->media_url,
                        ];
                    })->toArray(),
                    'instructionImages' => $task->instructions
                        ->where('type', 'image')
                        ->pluck('media_url')
                        ->toArray(),
                    'codeReaderType' => $task->configuration['codeReaderType'] ?? null,
                    'codeReaderInstructions' => $task->configuration['codeReaderInstructions'] ?? null,
                    'fileUploadInstructions' => $task->configuration['fileUploadInstructions'] ?? null,
                ];
            })->toArray();
        } elseif ($form->currentVersion && $form->currentVersion->tasks) {
            $tasks = $form->currentVersion->tasks->map(function ($task) {
                return [
                    'id' => $task->id,
                    'type' => $task->type,
                    'description' => $task->description,
                    'isRequired' => $task->is_required,
                    'position' => $task->position,
                    'measurement' => $task->configuration['measurement'] ?? null,
                    'options' => $task->configuration['options'] ?? [],
                    'instructions' => $task->instructions->map(function ($instruction) {
                        return [
                            'type' => $instruction->type,
                            'content' => $instruction->content,
                            'media_url' => $instruction->media_url,
                        ];
                    })->toArray(),
                    'instructionImages' => $task->instructions
                        ->where('type', 'image')
                        ->pluck('media_url')
                        ->toArray(),
                    'codeReaderType' => $task->configuration['codeReaderType'] ?? null,
                    'codeReaderInstructions' => $task->configuration['codeReaderInstructions'] ?? null,
                    'fileUploadInstructions' => $task->configuration['fileUploadInstructions'] ?? null,
                ];
            })->toArray();
        }

        // Return routine with form data in the format expected by frontend
        return response()->json([
            'routine' => [
                'id' => $routine->id,
                'name' => $routine->name,
                'form' => [
                    'id' => $form->id,
                    'tasks' => $tasks,
                    'has_draft_changes' => $form->draftTasks->count() > 0,
                    'isDraft' => $form->isDraft(),
                    'currentVersionId' => $form->current_version_id,
                    'current_version_id' => $form->current_version_id,
                    'current_version' => $form->currentVersion ? [
                        'id' => $form->currentVersion->id,
                        'version_number' => $form->currentVersion->version_number,
                        'published_at' => $form->currentVersion->published_at,
                    ] : null,
                ],
            ],
        ]);
    }

    public function viewPublishedVersion(Routine $routine)
    {
        // Check if user can view the asset
        $this->authorize('view', $routine->asset);
        
        $form = $routine->form;
        
        if (!$form->current_version_id) {
            abort(404, 'No published version found');
        }
        
        $currentVersion = $form->currentVersion->load([
            'tasks' => function ($query) {
                $query->orderBy('position')
                    ->with(['instructions' => function ($q) {
                        $q->orderBy('position');
                    }]);
            },
        ]);

        // Prepare tasks for frontend in read-only format
        $tasks = $currentVersion->tasks->map(function ($task) {
            return [
                'id' => (string) $task->id, // Convert to string for frontend
                'type' => $task->type,
                'description' => $task->description,
                'isRequired' => $task->is_required,
                'position' => $task->position,
                'measurement' => $task->configuration['measurement'] ?? null,
                'options' => $task->configuration['options'] ?? [],
                'instructions' => $task->instructions->map(function ($instruction) {
                    return [
                        'id' => (string) $instruction->id,
                        'type' => $instruction->type,
                        'content' => $instruction->content,
                        'imageUrl' => $instruction->type === 'image' ? $instruction->media_url : null,
                        'videoUrl' => $instruction->type === 'video' ? $instruction->media_url : null,
                        'caption' => $instruction->content,
                    ];
                })->toArray(),
                'instructionImages' => $task->instructions
                    ->where('type', 'image')
                    ->pluck('media_url')
                    ->toArray(),
                'codeReaderType' => $task->configuration['codeReaderType'] ?? null,
                'codeReaderInstructions' => $task->configuration['codeReaderInstructions'] ?? null,
                'fileUploadInstructions' => $task->configuration['fileUploadInstructions'] ?? null,
                'state' => 'Viewing', // Use proper TaskState enum value
            ];
        })->toArray();

        return Inertia::render('maintenance/routines/view-published-version', [
            'routine' => [
                'id' => $routine->id,
                'name' => $routine->name,
                'asset' => [
                    'id' => $routine->asset->id,
                    'tag' => $routine->asset->tag,
                ],
            ],
            'version' => [
                'id' => $currentVersion->id,
                'version_number' => $currentVersion->version_number,
                'published_at' => $currentVersion->published_at,
                'tasks' => $tasks,
            ],
        ]);
    }

    public function getVersionHistory(Routine $routine)
    {
        // Check if user can view the asset
        $this->authorize('view', $routine->asset);
        
        $form = $routine->form;
        
        if (!$form) {
            return response()->json(['versions' => []]);
        }
        
        // Get all published versions
        $versions = $form->versions()
            ->with('publishedBy')
            ->withCount('tasks')
            ->orderBy('version_number', 'desc')
            ->get()
            ->map(function ($version) use ($form) {
                return [
                    'id' => $version->id,
                    'version_number' => $version->version_number,
                    'published_at' => $version->published_at,
                    'published_by' => $version->publishedBy ? [
                        'id' => $version->publishedBy->id,
                        'name' => $version->publishedBy->name,
                    ] : null,
                    'tasks_count' => $version->tasks_count,
                    'is_current' => $version->id === $form->current_version_id,
                ];
            });
            
        return response()->json([
            'versions' => $versions,
            'current_version_id' => $form->current_version_id,
        ]);
    }

    public function viewSpecificVersion(Routine $routine, $versionId)
    {
        // Check if user can view the asset
        $this->authorize('view', $routine->asset);
        
        $form = $routine->form;
        
        if (!$form) {
            abort(404, 'Form not found');
        }
        
        $version = $form->versions()
            ->with(['tasks' => function ($query) {
                $query->orderBy('position')
                    ->with(['instructions' => function ($q) {
                        $q->orderBy('position');
                    }]);
            }])
            ->findOrFail($versionId);

        // Prepare tasks for frontend in read-only format
        $tasks = $version->tasks->map(function ($task) {
            return [
                'id' => (string) $task->id,
                'type' => $task->type,
                'description' => $task->description,
                'isRequired' => $task->is_required,
                'position' => $task->position,
                'measurement' => $task->configuration['measurement'] ?? null,
                'options' => $task->configuration['options'] ?? [],
                'instructions' => $task->instructions->map(function ($instruction) {
                    return [
                        'id' => (string) $instruction->id,
                        'type' => $instruction->type,
                        'content' => $instruction->content,
                        'imageUrl' => $instruction->type === 'image' ? $instruction->media_url : null,
                        'videoUrl' => $instruction->type === 'video' ? $instruction->media_url : null,
                        'caption' => $instruction->content,
                    ];
                })->toArray(),
                'instructionImages' => $task->instructions
                    ->where('type', 'image')
                    ->pluck('media_url')
                    ->toArray(),
                'codeReaderType' => $task->configuration['codeReaderType'] ?? null,
                'codeReaderInstructions' => $task->configuration['codeReaderInstructions'] ?? null,
                'fileUploadInstructions' => $task->configuration['fileUploadInstructions'] ?? null,
                'state' => 'Viewing',
            ];
        })->toArray();

        return Inertia::render('maintenance/routines/view-published-version', [
            'routine' => [
                'id' => $routine->id,
                'name' => $routine->name,
                'asset' => [
                    'id' => $routine->asset->id,
                    'tag' => $routine->asset->tag,
                ],
            ],
            'version' => [
                'id' => $version->id,
                'version_number' => $version->version_number,
                'published_at' => $version->published_at,
                'tasks' => $tasks,
                'is_current' => $version->id === $form->current_version_id,
            ],
        ]);
    }

    /**
     * Create work order from manual routine
     */
    public function createWorkOrder(Request $request, Asset $asset, Routine $routine)
    {
        // Verify the routine belongs to the asset
        if ($routine->asset_id !== $asset->id) {
            abort(404);
        }
        
        // Check if user can create work orders for this asset
        $this->authorize('manage', $asset);
        
        // Validate routine is in manual execution mode
        if ($routine->execution_mode !== 'manual') {
            return response()->json([
                'error' => 'Work orders are generated automatically for this routine'
            ], 422);
        }
        
        // Check if routine already has an open work order
        if ($routine->hasOpenWorkOrder()) {
            $openWorkOrder = $routine->getOpenWorkOrder();
            return response()->json([
                'error' => 'An active work order already exists for this routine',
                'work_order' => [
                    'id' => $openWorkOrder->id,
                    'work_order_number' => $openWorkOrder->work_order_number,
                    'status' => $openWorkOrder->status,
                ],
            ], 422);
        }
        
        try {
            // Generate the work order
            $workOrder = $routine->generateWorkOrder();
            
            // Apply auto-approval if configured and user has permission
            if ($routine->auto_approve_work_orders && auth()->user()->can('work-orders.approve')) {
                $workOrder->update([
                    'status' => WorkOrder::STATUS_APPROVED,
                    'approved_at' => now(),
                    'approved_by' => auth()->id(),
                ]);
                
                // Record status change
                $workOrder->statusHistory()->create([
                    'from_status' => WorkOrder::STATUS_REQUESTED,
                    'to_status' => WorkOrder::STATUS_APPROVED,
                    'changed_by' => auth()->id(),
                    'reason' => 'Auto-approved by routine configuration',
                    'changed_at' => now(),
                ]);
            }
            
            return response()->json([
                'success' => true,
                'work_order_id' => $workOrder->id,
                'work_order_number' => $workOrder->work_order_number,
                'redirect' => route('work-orders.show', $workOrder)
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
    
    /**
     * Generate work order from routine (alias for backward compatibility)
     */
    public function generateWorkOrder(Request $request, Routine $routine)
    {
        return $this->createWorkOrder($request, $routine->asset, $routine);
    }
}

<?php

namespace App\Http\Controllers\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\Form;
use App\Models\Forms\FormTask;
use App\Models\Forms\FormVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FormVersionController extends Controller
{
    /**
     * List all versions of a form
     */
    public function index(Form $form)
    {
        $versions = $form->versions()
            ->with(['publisher', 'tasks'])
            ->orderBy('version_number', 'desc')
            ->get();

        return response()->json([
            'versions' => $versions,
            'current_version_id' => $form->current_version_id,
            'has_draft_changes' => $form->isDraft(),
        ]);
    }

    /**
     * Show a specific version
     */
    public function show(Form $form, FormVersion $version)
    {
        // Ensure version belongs to form
        if ($version->form_id !== $form->id) {
            return response()->json(['error' => 'Version does not belong to this form'], 404);
        }

        $version->load(['tasks.instructions', 'publisher']);

        return response()->json([
            'version' => $version,
            'is_current' => $version->isCurrent(),
        ]);
    }

    /**
     * Publish the current draft as a new version
     */
    public function publish(Request $request, Form $form)
    {
        // Check if there are draft tasks to publish
        if (! $form->draftTasks()->exists()) {
            return response()->json([
                'error' => 'No draft changes to publish',
            ], 422);
        }

        // Validate that all draft tasks are valid
        $draftTasks = $form->draftTasks;
        foreach ($draftTasks as $task) {
            if (empty($task->description)) {
                return response()->json([
                    'error' => 'All tasks must have a description before publishing',
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            // Create new version
            $version = $form->publish(auth()->id());

            // Update routine's active version if this is the form's current version
            if ($form->routine) {
                $form->routine->active_form_version_id = $version->id;
                $form->routine->save();
            }

            DB::commit();

            $version->load(['tasks.instructions']);

            return response()->json([
                'success' => true,
                'message' => 'Form version published successfully',
                'version' => $version,
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json([
                'error' => 'Failed to publish version: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Compare two versions
     */
    public function compare(Form $form, $versionId1, $versionId2)
    {
        $version1 = $form->versions()->with('tasks')->find($versionId1);
        $version2 = $form->versions()->with('tasks')->find($versionId2);

        if (! $version1 || ! $version2) {
            return response()->json(['error' => 'One or both versions not found'], 404);
        }

        // Build comparison data
        $comparison = [
            'version1' => [
                'id' => $version1->id,
                'version_number' => $version1->version_number,
                'published_at' => $version1->published_at,
                'task_count' => $version1->tasks->count(),
            ],
            'version2' => [
                'id' => $version2->id,
                'version_number' => $version2->version_number,
                'published_at' => $version2->published_at,
                'task_count' => $version2->tasks->count(),
            ],
            'changes' => $this->compareVersionTasks($version1, $version2),
        ];

        return response()->json($comparison);
    }

    /**
     * Deactivate a version
     */
    public function deactivate(Form $form, FormVersion $version)
    {
        // Ensure version belongs to form
        if ($version->form_id !== $form->id) {
            return response()->json(['error' => 'Version does not belong to this form'], 404);
        }

        // Cannot deactivate current version
        if ($version->isCurrent()) {
            return response()->json(['error' => 'Cannot deactivate the current version'], 422);
        }

        // Check if version is in use by any executions
        if ($version->executions()->exists()) {
            return response()->json(['error' => 'Cannot deactivate a version with existing executions'], 422);
        }

        $version->deactivate();

        return response()->json([
            'success' => true,
            'message' => 'Version deactivated successfully',
        ]);
    }

    /**
     * Compare tasks between two versions
     */
    private function compareVersionTasks(FormVersion $v1, FormVersion $v2): array
    {
        $changes = [
            'added' => [],
            'removed' => [],
            'modified' => [],
        ];

        $v1Tasks = $v1->tasks->keyBy('position');
        $v2Tasks = $v2->tasks->keyBy('position');

        // Find added and modified tasks
        foreach ($v2Tasks as $position => $v2Task) {
            if (! $v1Tasks->has($position)) {
                $changes['added'][] = [
                    'position' => $position,
                    'task' => $v2Task->toArray(),
                ];
            } else {
                $v1Task = $v1Tasks[$position];
                if ($this->tasksDiffer($v1Task, $v2Task)) {
                    $changes['modified'][] = [
                        'position' => $position,
                        'old' => $v1Task->toArray(),
                        'new' => $v2Task->toArray(),
                    ];
                }
            }
        }

        // Find removed tasks
        foreach ($v1Tasks as $position => $v1Task) {
            if (! $v2Tasks->has($position)) {
                $changes['removed'][] = [
                    'position' => $position,
                    'task' => $v1Task->toArray(),
                ];
            }
        }

        return $changes;
    }

    /**
     * Check if two tasks differ
     */
    private function tasksDiffer(FormTask $t1, FormTask $t2): bool
    {
        return $t1->type !== $t2->type ||
               $t1->description !== $t2->description ||
               $t1->is_required !== $t2->is_required ||
               json_encode($t1->configuration) !== json_encode($t2->configuration);
    }
}

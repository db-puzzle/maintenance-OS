<?php

namespace App\Models\Forms;

use App\Models\Maintenance\Routine;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Form extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'current_version_id',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the routine that uses this form
     */
    public function routine(): HasOne
    {
        return $this->hasOne(Routine::class);
    }

    /**
     * Get the user who created this form
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all versions of this form
     */
    public function versions(): HasMany
    {
        return $this->hasMany(FormVersion::class)->orderBy('version_number', 'desc');
    }

    /**
     * Get the current published version
     */
    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(FormVersion::class, 'current_version_id');
    }

    /**
     * Get draft tasks (tasks not yet published)
     */
    public function draftTasks(): HasMany
    {
        // Draft tasks are temporarily stored with form_id in a separate relationship
        return $this->hasMany(FormTask::class, 'form_id')->orderBy('position');
    }

    /**
     * Check if form is in draft mode (no published version or has unpublished changes)
     */
    public function isDraft(): bool
    {
        return $this->current_version_id === null || $this->draftTasks()->exists();
    }

    /**
     * Get the next version number
     */
    public function getNextVersionNumber(): int
    {
        $maxVersion = $this->versions()->max('version_number');

        return $maxVersion ? $maxVersion + 1 : 1;
    }

    /**
     * Publish the current draft as a new version
     */
    public function publish(int $userId): FormVersion
    {
        $version = FormVersion::create([
            'form_id' => $this->id,
            'version_number' => $this->getNextVersionNumber(),
            'published_at' => now(),
            'published_by' => $userId,
            'is_active' => true,
        ]);

        // Copy draft tasks to the new version
        $draftTasks = $this->draftTasks;
        foreach ($draftTasks as $task) {
            // Create new task for the version
            $newTask = $task->replicate();
            $newTask->form_version_id = $version->id;
            $newTask->form_id = null; // Remove temporary form_id reference
            $newTask->save();

            // Copy task instructions
            foreach ($task->instructions as $instruction) {
                $newInstruction = $instruction->replicate();
                $newInstruction->form_task_id = $newTask->id;
                $newInstruction->save();
            }
        }

        // Delete draft tasks after publishing
        $this->draftTasks()->delete();

        // Update current version
        $this->current_version_id = $version->id;
        $this->save();

        return $version;
    }

    /**
     * Create draft tasks from the current published version
     * This is used when starting to edit a published form
     */
    public function createDraftFromCurrentVersion(): bool
    {
        // If there are already draft tasks, don't create new ones
        if ($this->draftTasks()->exists()) {
            return false;
        }

        // If there's no current version, nothing to copy
        if (! $this->currentVersion) {
            return false;
        }

        // Load current version tasks with instructions
        $this->currentVersion->load('tasks.instructions');

        // Copy each task from the current version as a draft
        foreach ($this->currentVersion->tasks as $versionTask) {
            // Create draft task
            $draftTask = $versionTask->replicate();
            $draftTask->form_version_id = null; // Remove version reference
            $draftTask->form_id = $this->id; // Set form reference for draft
            $draftTask->save();

            // Copy task instructions
            foreach ($versionTask->instructions as $instruction) {
                $newInstruction = $instruction->replicate();
                $newInstruction->form_task_id = $draftTask->id;
                $newInstruction->save();
            }
        }

        return true;
    }
}

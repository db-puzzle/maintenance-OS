<?php

namespace App\Models\Forms;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskResponse extends Model
{
    protected $fillable = [
        'form_execution_id',
        'task_snapshot',
        'response',
        'is_completed',
        'responded_at'
    ];

    protected $casts = [
        'task_snapshot' => 'array',
        'response' => 'array',
        'is_completed' => 'boolean',
        'responded_at' => 'datetime'
    ];

    /**
     * Get the form execution that owns this task response
     */
    public function formExecution(): BelongsTo
    {
        return $this->belongsTo(FormExecution::class);
    }

    /**
     * Get the attachments for this task response
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(ResponseAttachment::class);
    }

    /**
     * Set the response and mark as completed
     */
    public function complete(array $responseData): void
    {
        $this->update([
            'response' => $responseData,
            'is_completed' => true,
            'responded_at' => now()
        ]);
    }

    /**
     * Get the task type from the snapshot
     */
    public function getTaskType(): string
    {
        return $this->task_snapshot['type'] ?? '';
    }

    /**
     * Get the task description from the snapshot
     */
    public function getTaskDescription(): string
    {
        return $this->task_snapshot['description'] ?? '';
    }

    /**
     * Get the task configuration from the snapshot
     */
    public function getTaskConfiguration(): array
    {
        return $this->task_snapshot['configuration'] ?? [];
    }

    /**
     * Get the task instructions from the snapshot
     */
    public function getTaskInstructions(): array
    {
        return $this->task_snapshot['instructions'] ?? [];
    }

    /**
     * Check if this task is required
     */
    public function isRequired(): bool
    {
        return $this->task_snapshot['is_required'] ?? false;
    }

    /**
     * Check if this is a photo task
     */
    public function isPhotoTask(): bool
    {
        return $this->getTaskType() === FormTask::TYPE_PHOTO;
    }

    /**
     * Check if this is a file upload task
     */
    public function isFileUploadTask(): bool
    {
        return $this->getTaskType() === FormTask::TYPE_FILE_UPLOAD;
    }
} 
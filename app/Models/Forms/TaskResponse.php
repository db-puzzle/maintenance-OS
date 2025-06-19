<?php

namespace App\Models\Forms;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskResponse extends Model
{
    protected $fillable = [
        'form_execution_id',
        'form_task_id',
        'response',
        'is_completed',
        'responded_at',
    ];

    protected $casts = [
        'response' => 'array',
        'is_completed' => 'boolean',
        'responded_at' => 'datetime',
    ];

    /**
     * Get the form execution that owns this task response
     */
    public function formExecution(): BelongsTo
    {
        return $this->belongsTo(FormExecution::class);
    }

    /**
     * Get the form task this response is for
     */
    public function formTask(): BelongsTo
    {
        return $this->belongsTo(FormTask::class);
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
            'responded_at' => now(),
        ]);
    }

    /**
     * Get the task type from the related task
     */
    public function getTaskType(): string
    {
        return $this->formTask->type ?? '';
    }

    /**
     * Get the task description from the related task
     */
    public function getTaskDescription(): string
    {
        return $this->formTask->description ?? '';
    }

    /**
     * Get the task configuration from the related task
     */
    public function getTaskConfiguration(): array
    {
        return $this->formTask->configuration ?? [];
    }

    /**
     * Check if this task is required
     */
    public function isRequired(): bool
    {
        return $this->formTask->is_required ?? false;
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

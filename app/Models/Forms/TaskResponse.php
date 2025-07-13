<?php

namespace App\Models\Forms;

use App\Models\User;
use App\Models\WorkOrders\WorkOrderExecution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskResponse extends Model
{
    protected $fillable = [
        'form_task_id',
        'work_order_execution_id',
        'user_id',
        'response',
        'response_data',
        'completed_at',
    ];

    protected $casts = [
        'response_data' => 'array',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the work order execution that owns this task response
     */
    public function workOrderExecution(): BelongsTo
    {
        return $this->belongsTo(WorkOrderExecution::class);
    }

    /**
     * Get the form task this response is for
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(FormTask::class, 'form_task_id');
    }

    /**
     * Get the user who provided this response
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the attachments for this task response
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(ResponseAttachment::class);
    }

    /**
     * Get the task type from the related task
     */
    public function getTaskType(): string
    {
        return $this->task->type ?? '';
    }

    /**
     * Get the task description from the related task
     */
    public function getTaskDescription(): string
    {
        return $this->task->description ?? '';
    }

    /**
     * Get the task configuration from the related task
     */
    public function getTaskConfiguration(): array
    {
        return $this->task->configuration ?? [];
    }

    /**
     * Check if this task is required
     */
    public function isRequired(): bool
    {
        return $this->task->is_required ?? false;
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

    /**
     * Check if response is provided
     */
    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }
}

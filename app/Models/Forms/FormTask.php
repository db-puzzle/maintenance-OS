<?php

namespace App\Models\Forms;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormTask extends Model
{
    protected $fillable = [
        'form_version_id',
        'form_id',
        'position',
        'type',
        'description',
        'is_required',
        'configuration'
    ];

    protected $casts = [
        'position' => 'integer',
        'is_required' => 'boolean',
        'configuration' => 'array'
    ];

    const TYPE_QUESTION = 'question';
    const TYPE_MULTIPLE_CHOICE = 'multiple_choice';
    const TYPE_MULTIPLE_SELECT = 'multiple_select';
    const TYPE_MEASUREMENT = 'measurement';
    const TYPE_PHOTO = 'photo';
    const TYPE_CODE_READER = 'code_reader';
    const TYPE_FILE_UPLOAD = 'file_upload';

    /**
     * Prevent modifications to tasks in published versions
     */
    protected static function booted()
    {
        static::updating(function ($task) {
            if ($task->form_version_id !== null && !$task->isDirty('form_version_id')) {
                throw new \Exception('Tasks in published form versions are immutable and cannot be modified.');
            }
        });

        static::deleting(function ($task) {
            if ($task->form_version_id !== null) {
                throw new \Exception('Tasks in published form versions cannot be deleted.');
            }
        });
    }

    /**
     * Get the form version that owns this task
     */
    public function formVersion(): BelongsTo
    {
        return $this->belongsTo(FormVersion::class);
    }

    /**
     * Get the form that owns this draft task
     */
    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    /**
     * Get the instructions for this task
     */
    public function instructions(): HasMany
    {
        return $this->hasMany(TaskInstruction::class)->orderBy('position');
    }

    /**
     * Get the responses for this task
     */
    public function responses(): HasMany
    {
        return $this->hasMany(TaskResponse::class);
    }

    /**
     * Check if this task is in a draft (unpublished) state
     */
    public function isDraft(): bool
    {
        return $this->form_version_id === null;
    }

    /**
     * Get measurement configuration if applicable
     */
    public function getMeasurementConfig(): ?array
    {
        return $this->type === self::TYPE_MEASUREMENT 
            ? $this->configuration['measurement'] ?? null 
            : null;
    }

    /**
     * Get options for choice/select tasks
     */
    public function getOptions(): array
    {
        return in_array($this->type, [self::TYPE_MULTIPLE_CHOICE, self::TYPE_MULTIPLE_SELECT]) 
            ? $this->configuration['options'] ?? [] 
            : [];
    }

    /**
     * Get code reader type if applicable
     */
    public function getCodeReaderType(): ?string
    {
        return $this->type === self::TYPE_CODE_READER 
            ? $this->configuration['codeReaderType'] ?? null 
            : null;
    }
} 
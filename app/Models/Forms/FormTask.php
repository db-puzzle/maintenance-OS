<?php

namespace App\Models\Forms;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormTask extends Model
{
    protected $fillable = [
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
     * Get the form that owns this task
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
     * Create a snapshot of this task
     */
    public function toSnapshot(): array
    {
        return [
            'id' => $this->id,
            'position' => $this->position,
            'type' => $this->type,
            'description' => $this->description,
            'is_required' => $this->is_required,
            'configuration' => $this->configuration,
            'instructions' => $this->instructions->map(fn($instruction) => $instruction->toSnapshot())->toArray()
        ];
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
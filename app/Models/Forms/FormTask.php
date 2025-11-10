<?php

namespace App\Models\Forms;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormTask extends Model
{
    protected $fillable = [
        'form_id',
        'position',
        'type',
        'description',
        'is_required',
        'configuration',
    ];

    protected $casts = [
        'position' => 'integer',
        'is_required' => 'boolean',
        'configuration' => 'array',
    ];

    public const TYPE_QUESTION = 'question';

    public const TYPE_MULTIPLE_CHOICE = 'multiple_choice';

    public const TYPE_MULTIPLE_SELECT = 'multiple_select';

    public const TYPE_MEASUREMENT = 'measurement';

    public const TYPE_PHOTO = 'photo';

    public const TYPE_CODE_READER = 'code_reader';

    public const TYPE_FILE_UPLOAD = 'file_upload';

    /**
     * Get the form that owns this task.
     */
    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    /**
     * Get the instructions for this task.
     */
    public function instructions(): HasMany
    {
        return $this->hasMany(TaskInstruction::class)->orderBy('position');
    }

    /**
     * Get the responses for this task.
     */
    public function responses(): HasMany
    {
        return $this->hasMany(TaskResponse::class);
    }

    /**
     * Get measurement configuration if applicable.
     */
    public function getMeasurementConfig(): ?array
    {
        return $this->type === self::TYPE_MEASUREMENT
            ? $this->configuration['measurement'] ?? null
            : null;
    }

    /**
     * Get options for choice/select tasks.
     */
    public function getOptions(): array
    {
        return in_array($this->type, [self::TYPE_MULTIPLE_CHOICE, self::TYPE_MULTIPLE_SELECT])
            ? $this->configuration['options'] ?? []
            : [];
    }

    /**
     * Get code reader type if applicable.
     */
    public function getCodeReaderType(): ?string
    {
        return $this->type === self::TYPE_CODE_READER
            ? $this->configuration['codeReaderType'] ?? null
            : null;
    }
}

<?php

namespace App\Models\Forms;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TaskInstruction extends Model
{
    protected $fillable = [
        'form_task_id',
        'type',
        'content',
        'media_url',
        'caption',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    const TYPE_TEXT = 'text';

    const TYPE_IMAGE = 'image';

    const TYPE_VIDEO = 'video';

    /**
     * Get the task that owns this instruction
     */
    public function formTask(): BelongsTo
    {
        return $this->belongsTo(FormTask::class);
    }

    /**
     * Get the full URL for media
     */
    public function getMediaUrlFullAttribute(): ?string
    {
        if (! $this->media_url) {
            return null;
        }

        if (filter_var($this->media_url, FILTER_VALIDATE_URL)) {
            return $this->media_url;
        }

        return Storage::url($this->media_url);
    }

    /**
     * Check if this is a text instruction
     */
    public function isText(): bool
    {
        return $this->type === self::TYPE_TEXT;
    }

    /**
     * Check if this is an image instruction
     */
    public function isImage(): bool
    {
        return $this->type === self::TYPE_IMAGE;
    }

    /**
     * Check if this is a video instruction
     */
    public function isVideo(): bool
    {
        return $this->type === self::TYPE_VIDEO;
    }
}

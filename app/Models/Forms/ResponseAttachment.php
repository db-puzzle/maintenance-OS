<?php

namespace App\Models\Forms;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ResponseAttachment extends Model
{
    protected $fillable = [
        'task_response_id',
        'type',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'metadata'
    ];

    protected $casts = [
        'file_size' => 'integer',
        'metadata' => 'array'
    ];

    const TYPE_PHOTO = 'photo';
    const TYPE_FILE = 'file';

    /**
     * Get the task response that owns this attachment
     */
    public function taskResponse(): BelongsTo
    {
        return $this->belongsTo(TaskResponse::class);
    }

    /**
     * Get the URL for this attachment
     */
    public function getUrl(): string
    {
        return Storage::url($this->file_path);
    }

    /**
     * Delete the file from storage
     */
    public function deleteFile(): void
    {
        Storage::delete($this->file_path);
    }

    /**
     * Determine if this is a photo attachment
     */
    public function isPhoto(): bool
    {
        return $this->type === self::TYPE_PHOTO;
    }

    /**
     * Determine if this is a file attachment
     */
    public function isFile(): bool
    {
        return $this->type === self::TYPE_FILE;
    }

    /**
     * Boot model events
     */
    protected static function booted()
    {
        static::deleting(function ($attachment) {
            $attachment->deleteFile();
        });
    }
} 
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChunkedUpload extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'filename',
        'mime_type',
        'total_size',
        'total_chunks',
        'uploaded_chunks',
        'file_hash',
        'status',
        'model_type',
        'model_id',
        'collection',
        'metadata',
        'expires_at',
    ];

    protected $casts = [
        'uploaded_chunks' => 'array',
        'metadata' => 'array',
        'expires_at' => 'datetime',
        'total_size' => 'integer',
        'total_chunks' => 'integer',
        'model_id' => 'integer',
    ];

    /**
     * Get the user who owns the upload.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the upload is expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if all chunks have been uploaded.
     */
    public function isComplete(): bool
    {
        return count($this->uploaded_chunks) === $this->total_chunks;
    }

    /**
     * Get the progress percentage.
     */
    public function getProgressAttribute(): float
    {
        if ($this->total_chunks === 0) {
            return 0;
        }

        return round((count($this->uploaded_chunks) / $this->total_chunks) * 100, 2);
    }

    /**
     * Scope to get active uploads.
     */
    public function scopeActive($query)
    {
        return $query->where('expires_at', '>', now())
            ->where('status', '!=', 'completed')
            ->where('status', '!=', 'cancelled');
    }

    /**
     * Scope to get expired uploads.
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<=', now())
            ->where('status', '!=', 'completed');
    }
}

<?php

namespace App\Models\Forms;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormVersion extends Model
{
    protected $fillable = [
        'form_id',
        'version_number',
        'published_at',
        'published_by',
        'is_active',
    ];

    protected $casts = [
        'version_number' => 'integer',
        'published_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Prevent modifications to published versions
     */
    protected static function booted()
    {
        static::updating(function ($version) {
            throw new \Exception('Form versions are immutable and cannot be modified.');
        });
    }

    /**
     * Get the form this version belongs to
     */
    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    /**
     * Get the user who published this version
     */
    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    /**
     * Get the tasks in this version
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(FormTask::class)->orderBy('position');
    }

    /**
     * Get the executions using this version
     */
    public function executions(): HasMany
    {
        return $this->hasMany(FormExecution::class);
    }

    /**
     * Get a formatted version label
     */
    public function getVersionLabel(): string
    {
        return "v{$this->version_number}";
    }

    /**
     * Check if this version is the current version
     */
    public function isCurrent(): bool
    {
        return $this->form->current_version_id === $this->id;
    }

    /**
     * Deactivate this version
     */
    public function deactivate(): void
    {
        $this->is_active = false;
        $this->saveQuietly(); // Use saveQuietly to bypass the update protection for this specific case
    }
}

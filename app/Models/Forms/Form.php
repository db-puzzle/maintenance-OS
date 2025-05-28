<?php

namespace App\Models\Forms;

use App\Models\User;
use App\Models\Maintenance\Routine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Form extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'is_active',
        'created_by'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    /**
     * Get the routine that uses this form
     */
    public function routine(): HasOne
    {
        return $this->hasOne(Routine::class);
    }

    /**
     * Get the user who created this form
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the tasks associated with this form
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(FormTask::class)->orderBy('position');
    }

    /**
     * Get the executions of this form
     */
    public function executions(): HasMany
    {
        return $this->hasMany(FormExecution::class);
    }

    /**
     * Create a snapshot of the form and all its tasks
     */
    public function toSnapshot(): array
    {
        return [
            'id' => $this->id,
            'tasks' => $this->tasks->map(fn($task) => $task->toSnapshot())->toArray()
        ];
    }
} 
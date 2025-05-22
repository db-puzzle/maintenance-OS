<?php

namespace App\Models\Forms;

use App\Models\User;
use App\Models\Maintenance\RoutineExecution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormExecution extends Model
{
    protected $fillable = [
        'form_id',
        'user_id',
        'form_snapshot',
        'status',
        'started_at',
        'completed_at'
    ];

    protected $casts = [
        'form_snapshot' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime'
    ];

    const STATUS_PENDING = 'pending';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    /**
     * Get the form that this execution is for
     */
    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    /**
     * Get the user who is filling this form
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the task responses for this execution
     */
    public function taskResponses(): HasMany
    {
        return $this->hasMany(TaskResponse::class);
    }

    /**
     * Get the routine execution associated with this form execution
     */
    public function routineExecution(): HasOne
    {
        return $this->hasOne(RoutineExecution::class);
    }

    /**
     * Start this form execution
     */
    public function start(): void
    {
        $this->status = self::STATUS_IN_PROGRESS;
        $this->started_at = now();
        $this->save();
    }

    /**
     * Complete this form execution
     */
    public function complete(): void
    {
        $this->status = self::STATUS_COMPLETED;
        $this->completed_at = now();
        $this->save();
    }

    /**
     * Cancel this form execution
     */
    public function cancel(): void
    {
        $this->status = self::STATUS_CANCELLED;
        $this->save();
    }

    /**
     * Check if this execution is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Check if this execution is in progress
     */
    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    /**
     * Check if this execution is pending
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if this execution is cancelled
     */
    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /**
     * Get the progress percentage (completed tasks / total tasks)
     */
    public function getProgressPercentage(): int
    {
        $totalTasks = count($this->form_snapshot['tasks'] ?? []);
        
        if ($totalTasks === 0) {
            return 0;
        }
        
        $completedTasks = $this->taskResponses()->where('is_completed', true)->count();
        
        return (int) round(($completedTasks / $totalTasks) * 100);
    }
} 
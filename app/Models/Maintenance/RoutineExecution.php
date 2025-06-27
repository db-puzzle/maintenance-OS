<?php

namespace App\Models\Maintenance;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\FormExecution;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoutineExecution extends Model
{
    use HasFactory;

    protected $fillable = [
        'routine_id',
        'form_execution_id',
        'executed_by',
        'started_at',
        'completed_at',
        'status',
        'notes',
        'execution_data',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'execution_data' => 'array',
    ];

    const STATUS_PENDING = 'pending';

    const STATUS_IN_PROGRESS = 'in_progress';

    const STATUS_COMPLETED = 'completed';

    const STATUS_CANCELLED = 'cancelled';

    public function routine(): BelongsTo
    {
        return $this->belongsTo(Routine::class);
    }

    public function formExecution(): BelongsTo
    {
        return $this->belongsTo(FormExecution::class);
    }

    public function executor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executed_by');
    }

    public function start(): void
    {
        $this->status = self::STATUS_IN_PROGRESS;
        $this->started_at = now();
        $this->save();
    }

    public function complete(): void
    {
        $this->status = self::STATUS_COMPLETED;
        $this->completed_at = now();
        $this->save();
    }

    public function cancel(): void
    {
        $this->status = self::STATUS_CANCELLED;
        $this->save();
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /**
     * Scope to load all related data for detailed views
     */
    public function scopeWithFullDetails(Builder $query): Builder
    {
        return $query->with([
            'routine.form.currentVersion.tasks.instructions',
            'routine.assets',
            'formExecution.taskResponses.formTask',
            'formExecution.taskResponses.attachments',
            'formExecution.formVersion',
            'executor',
        ]);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeFilterByDateRange(Builder $query, $start, $end): Builder
    {
        return $query->whereBetween('started_at', [$start, $end]);
    }

    /**
     * Scope to filter by assets
     */
    public function scopeFilterByAssets(Builder $query, array $assetIds): Builder
    {
        return $query->whereHas('routine.assets', function ($q) use ($assetIds) {
            $q->whereIn('assets.id', $assetIds);
        });
    }

    /**
     * Scope to filter by routines
     */
    public function scopeFilterByRoutines(Builder $query, array $routineIds): Builder
    {
        return $query->whereIn('routine_id', $routineIds);
    }

    /**
     * Scope to filter by executors
     */
    public function scopeFilterByExecutors(Builder $query, array $executorIds): Builder
    {
        return $query->whereIn('executed_by', $executorIds);
    }

    /**
     * Scope to filter by status
     */
    public function scopeFilterByStatus(Builder $query, array $statuses): Builder
    {
        return $query->whereIn('status', $statuses);
    }

    /**
     * Scope to search in notes and executor name
     */
    public function scopeSearch(Builder $query, string $search): Builder
    {
        return $query->where(function ($q) use ($search) {
            $q->where('notes', 'LIKE', "%{$search}%")
                ->orWhereHas('executor', function ($subQ) use ($search) {
                    $subQ->where('name', 'LIKE', "%{$search}%");
                });
        });
    }

    /**
     * Get the duration in minutes
     */
    public function getDurationMinutesAttribute(): ?int
    {
        if (! $this->started_at || ! $this->completed_at) {
            return null;
        }

        return $this->started_at->diffInMinutes($this->completed_at);
    }

    /**
     * Get the progress percentage
     */
    public function getProgressPercentageAttribute(): int
    {
        if (! $this->formExecution) {
            return 0;
        }

        return $this->formExecution->getProgressPercentage();
    }

    /**
     * Get task summary statistics
     */
    public function getTaskSummaryAttribute(): array
    {
        if (! $this->formExecution) {
            return ['total' => 0, 'completed' => 0, 'with_issues' => 0];
        }

        $responses = $this->formExecution->taskResponses;
        $total = $responses->count();
        $completed = $responses->where('is_completed', true)->count();

        // Count tasks with issues (measurements outside range, etc.)
        $withIssues = $responses->filter(function ($response) {
            $task = $response->formTask;
            if (! $task || ! $response->is_completed) {
                return false;
            }

            // Check for measurement tasks outside range
            if ($task->type === 'measurement' && isset($response->response['value'])) {
                $config = $task->getMeasurementConfig();
                if ($config && isset($config['min']) && isset($config['max'])) {
                    $value = (float) $response->response['value'];

                    return $value < $config['min'] || $value > $config['max'];
                }
            }

            return false;
        })->count();

        return [
            'total' => $total,
            'completed' => $completed,
            'with_issues' => $withIssues,
        ];
    }

    /**
     * Get execution timeline events
     */
    public function getTimelineAttribute(): array
    {
        $timeline = [];

        // Start event
        if ($this->started_at) {
            $timeline[] = [
                'timestamp' => $this->started_at,
                'event' => 'execution_started',
                'description' => "Execution started by {$this->executor->name}",
                'user' => $this->executor->name,
            ];
        }

        // Task completion events
        if ($this->formExecution && $this->formExecution->taskResponses) {
            foreach ($this->formExecution->taskResponses as $response) {
                if ($response->is_completed && $response->responded_at) {
                    $timeline[] = [
                        'timestamp' => $response->responded_at,
                        'event' => 'task_completed',
                        'description' => "Task '{$response->formTask->description}' completed",
                        'task_id' => $response->formTask->id,
                        'task_type' => $response->formTask->type,
                    ];
                }
            }
        }

        // Completion event
        if ($this->completed_at) {
            $timeline[] = [
                'timestamp' => $this->completed_at,
                'event' => 'execution_completed',
                'description' => 'Execution completed',
            ];
        }

        // Sort by timestamp
        usort($timeline, function ($a, $b) {
            return $a['timestamp']->timestamp <=> $b['timestamp']->timestamp;
        });

        return $timeline;
    }

    /**
     * Check if execution is within normal duration
     */
    public function isWithinNormalDuration(): bool
    {
        if (! $this->duration_minutes) {
            return true; // Can't determine, assume OK
        }

        // Consider executions over 8 hours as potentially problematic
        return $this->duration_minutes <= 480;
    }

    /**
     * Get the primary asset tag for display
     */
    public function getPrimaryAssetTagAttribute(): ?string
    {
        $assets = $this->routine->assets ?? collect();

        return $assets->first()?->tag;
    }
}

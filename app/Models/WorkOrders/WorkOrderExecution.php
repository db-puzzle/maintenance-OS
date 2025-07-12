<?php

namespace App\Models\WorkOrders;

use App\Models\Forms\TaskResponse;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkOrderExecution extends Model
{
    protected $fillable = [
        'work_order_id', 'executed_by', 'status',
        'started_at', 'paused_at', 'resumed_at', 'completed_at',
        'total_pause_duration', 'work_performed', 'observations',
        'recommendations', 'follow_up_required',
        'safety_checks_completed', 'quality_checks_completed',
        'area_cleaned', 'tools_returned'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'paused_at' => 'datetime',
        'resumed_at' => 'datetime',
        'completed_at' => 'datetime',
        'follow_up_required' => 'boolean',
        'safety_checks_completed' => 'boolean',
        'quality_checks_completed' => 'boolean',
        'area_cleaned' => 'boolean',
        'tools_returned' => 'boolean',
    ];

    // Relationships
    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function executedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executed_by');
    }

    public function taskResponses(): HasMany
    {
        return $this->hasMany(TaskResponse::class, 'work_order_execution_id');
    }

    // Helper methods
    public function start(): void
    {
        $this->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        // Update work order status
        $this->workOrder->update([
            'status' => WorkOrder::STATUS_IN_PROGRESS,
            'actual_start_date' => now(),
        ]);
    }

    public function pause(): void
    {
        if ($this->status === 'in_progress' && !$this->paused_at) {
            $this->update([
                'status' => 'paused',
                'paused_at' => now(),
            ]);
        }
    }

    public function resume(): void
    {
        if ($this->status === 'paused' && $this->paused_at) {
            $pauseDuration = $this->paused_at->diffInMinutes(now());
            
            $this->update([
                'status' => 'in_progress',
                'resumed_at' => now(),
                'paused_at' => null,
                'total_pause_duration' => $this->total_pause_duration + $pauseDuration,
            ]);
        }
    }

    public function complete(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Calculate actual duration
        $actualMinutes = $this->started_at->diffInMinutes($this->completed_at) - $this->total_pause_duration;
        $actualHours = round($actualMinutes / 60, 2);

        // Update work order
        $this->workOrder->update([
            'status' => WorkOrder::STATUS_COMPLETED,
            'actual_end_date' => now(),
            'actual_hours' => $actualHours,
        ]);
    }

    public function getActualDurationAttribute(): ?float
    {
        if (!$this->started_at) {
            return null;
        }

        $endTime = $this->completed_at ?? now();
        $totalMinutes = $this->started_at->diffInMinutes($endTime) - $this->total_pause_duration;
        
        return round($totalMinutes / 60, 2); // Return hours
    }

    public function getCompletionPercentageAttribute(): int
    {
        $tasks = $this->workOrder->getTasks();
        
        if (empty($tasks)) {
            return $this->status === 'completed' ? 100 : 0;
        }

        $totalTasks = count($tasks);
        $completedTasks = $this->taskResponses()
            ->whereNotNull('response')
            ->count();

        return min(100, round(($completedTasks / $totalTasks) * 100));
    }

    public function canComplete(): bool
    {
        // Check if all required tasks have responses
        $tasks = $this->workOrder->getTasks();
        $requiredTaskIds = collect($tasks)
            ->where('is_required', true)
            ->pluck('id')
            ->toArray();

        if (empty($requiredTaskIds)) {
            return true;
        }

        $completedRequiredTasks = $this->taskResponses()
            ->whereIn('form_task_id', $requiredTaskIds)
            ->whereNotNull('response')
            ->count();

        return count($requiredTaskIds) === $completedRequiredTasks;
    }
}
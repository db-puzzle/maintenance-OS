<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManufacturingStepExecution extends Model
{
    use HasFactory;

    public const STATUSES = [
        'queued' => 'Queued',
        'in_progress' => 'In Progress',
        'on_hold' => 'On Hold',
        'completed' => 'Completed',
    ];

    public const QUALITY_RESULTS = [
        'passed' => 'Passed',
        'failed' => 'Failed',
    ];

    public const FAILURE_ACTIONS = [
        'scrap' => 'Scrap',
        'rework' => 'Rework',
    ];

    protected $fillable = [
        'manufacturing_step_id',
        'production_order_id',
        'part_number',
        'total_parts',
        'status',
        'started_at',
        'completed_at',
        'on_hold_at',
        'resumed_at',
        'total_hold_duration',
        'executed_by',
        'work_cell_id',
        'quality_result',
        'quality_notes',
        'failure_action',
        'form_execution_id',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'on_hold_at' => 'datetime',
        'resumed_at' => 'datetime',
        'total_hold_duration' => 'integer',
    ];

    /**
     * Get the manufacturing step.
     */
    public function manufacturingStep(): BelongsTo
    {
        return $this->belongsTo(ManufacturingStep::class);
    }

    /**
     * Get the production order.
     */
    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class);
    }

    /**
     * Get the user who executed the step.
     */
    public function executedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executed_by');
    }

    /**
     * Get the work cell.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Put execution on hold.
     */
    public function putOnHold(): void
    {
        if ($this->status !== 'in_progress') {
            throw new \Exception('Only in-progress executions can be put on hold');
        }

        $this->update([
            'status' => 'on_hold',
            'on_hold_at' => now(),
        ]);
    }

    /**
     * Resume execution from hold.
     */
    public function resume(): void
    {
        if ($this->status !== 'on_hold') {
            throw new \Exception('Only on-hold executions can be resumed');
        }

        $holdDuration = $this->on_hold_at->diffInMinutes(now());
        
        $this->update([
            'status' => 'in_progress',
            'resumed_at' => now(),
            'total_hold_duration' => $this->total_hold_duration + $holdDuration,
        ]);
    }

    /**
     * Complete the execution.
     */
    public function complete(array $data = []): void
    {
        if (!in_array($this->status, ['in_progress', 'on_hold'])) {
            throw new \Exception('Execution must be in progress or on hold to complete');
        }

        $updateData = [
            'status' => 'completed',
            'completed_at' => now(),
        ];

        if (isset($data['quality_result'])) {
            $updateData['quality_result'] = $data['quality_result'];
        }

        if (isset($data['quality_notes'])) {
            $updateData['quality_notes'] = $data['quality_notes'];
        }

        if (isset($data['failure_action'])) {
            $updateData['failure_action'] = $data['failure_action'];
        }

        $this->update($updateData);

        // Check if all executions for the step are completed
        $step = $this->manufacturingStep;
        $pendingExecutions = $step->executions()
            ->where('status', '!=', 'completed')
            ->count();

        if ($pendingExecutions === 0) {
            $step->complete();
        }
    }

    /**
     * Get the actual duration in minutes.
     */
    public function getActualDurationAttribute(): ?int
    {
        if (!$this->started_at || !$this->completed_at) {
            return null;
        }

        $totalMinutes = $this->started_at->diffInMinutes($this->completed_at);
        return $totalMinutes - $this->total_hold_duration;
    }

    /**
     * Get the cycle time per part.
     */
    public function getCycleTimePerPartAttribute(): ?float
    {
        if (!$this->actual_duration || !$this->total_parts) {
            return null;
        }

        return round($this->actual_duration / $this->total_parts, 2);
    }

    /**
     * Check if this is a quality check execution.
     */
    public function isQualityCheck(): bool
    {
        return $this->manufacturingStep->step_type === 'quality_check';
    }

    /**
     * Check if quality check passed.
     */
    public function qualityPassed(): bool
    {
        return $this->quality_result === 'passed';
    }

    /**
     * Scope for active executions.
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['queued', 'in_progress', 'on_hold']);
    }

    /**
     * Scope for completed executions.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for quality check executions.
     */
    public function scopeQualityChecks($query)
    {
        return $query->whereHas('manufacturingStep', function ($q) {
            $q->where('step_type', 'quality_check');
        });
    }

    /**
     * Scope for failed quality checks.
     */
    public function scopeFailedQualityChecks($query)
    {
        return $query->where('quality_result', 'failed');
    }
}
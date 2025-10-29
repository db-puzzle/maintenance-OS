<?php

namespace App\Models\Production;

use App\Models\User;
use App\Traits\HasMediaTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class ManufacturingStepExecution extends Model implements HasMedia
{
    use HasFactory;
    use HasMediaTrait;

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
        'manufacturing_order_id',
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
        // Progressive flow fields
        'quantity_completed',
        'quantity_scrapped',
        // New fields for enhanced tracking
        'production_notes',
        'scrap_reason',
        'time_spent_minutes',
        'photo_count',
        'last_photo_at',
        'hold_reason',
        'hold_notes',
        // State transition fields
        'force_started',
        'force_start_reason',
        'previous_state',
        'held_by',
        'held_at',
        'resumed_by',
        'quality_checked_by',
        'quality_checked_at',
        'quality_failure_reason',
        'quality_failure_action',
        'rework_step_id',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'on_hold_at' => 'datetime',
        'resumed_at' => 'datetime',
        'last_photo_at' => 'datetime',
        'held_at' => 'datetime',
        'quality_checked_at' => 'datetime',
        'total_hold_duration' => 'integer',
        'quantity_completed' => 'integer',
        'quantity_scrapped' => 'integer',
        'time_spent_minutes' => 'integer',
        'photo_count' => 'integer',
        'force_started' => 'boolean',
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
    public function putOnHold(string $reason, ?string $notes = null): void
    {
        if ($this->status !== 'in_progress') {
            throw new \Exception('Only in-progress executions can be put on hold');
        }

        $this->update([
            'status' => 'on_hold',
            'on_hold_at' => now(),
            'hold_reason' => $reason,
            'hold_notes' => $notes,
        ]);
    }

    /**
     * Resume execution from hold.
     */
    public function resume(?string $notes = null): void
    {
        if ($this->status !== 'on_hold') {
            throw new \Exception('Only on-hold executions can be resumed');
        }

        $holdDuration = $this->on_hold_at->diffInMinutes(now());

        $this->update([
            'status' => 'in_progress',
            'resumed_at' => now(),
            'total_hold_duration' => $this->total_hold_duration + $holdDuration,
            'hold_notes' => $notes ?? $this->hold_notes,
        ]);
    }

    /**
     * Complete the execution.
     */
    public function complete(array $data = []): void
    {
        if (! in_array($this->status, ['in_progress', 'on_hold'])) {
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
        if (! $this->started_at || ! $this->completed_at) {
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
        if (! $this->actual_duration || ! $this->total_parts) {
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

    /**
     * Report quantity progress for progressive flow.
     */
    public function reportQuantity(int $completed, int $scrapped = 0): void
    {
        $this->increment('quantity_completed', $completed);
        $this->increment('quantity_scrapped', $scrapped);

        // Update cumulative quantities on the step
        $this->manufacturingStep->updateCumulativeQuantities($completed, $scrapped);

        // Update order quantities
        $order = $this->manufacturingOrder;
        $order->increment('quantity_completed', $completed);
        if ($scrapped > 0) {
            $order->increment('quantity_scrapped', $scrapped);
        }

        // If this is a last step, propagate to parent order
        if ($this->manufacturingStep->isLastStep()) {
            // Get the service to handle parent order update
            $service = app(\App\Services\Production\ManufacturingOrderService::class);
            $service->handleChildOrderProgress($order, $completed);
        }
    }

    /**
     * Get the total quantity reported (completed + scrapped).
     */
    public function getTotalQuantityReportedAttribute(): int
    {
        return $this->quantity_completed + $this->quantity_scrapped;
    }

    /**
     * Register media collections.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('step_photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
            ->useDisk('public')
            ->singleFile(false); // Allow multiple files
    }

    /**
     * Custom media conversions for step photos.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        // Optimized display version (for laptop screen 1:1)
        $this->addMediaConversion('display')
            ->width(1920)
            ->height(1080)
            ->quality(85)
            ->optimize()
            ->nonQueued()
            ->performOnCollections('step_photos');
    }

    /**
     * Get step photos with metadata.
     */
    public function getStepPhotos()
    {
        return $this->getMedia('step_photos')->map(function ($media) {
            return [
                'id' => $media->id,
                'url' => $media->getUrl(),
                'display_url' => $media->getUrl('display'),
                'uploaded_by' => $media->getCustomProperty('uploaded_by'),
                'uploaded_at' => $media->getCustomProperty('uploaded_at'),
                'file_size' => $media->size,
                'mime_type' => $media->mime_type,
            ];
        });
    }

    /**
     * Check if can proceed to next step based on gate quantity.
     */
    public function canProceedToNextStep(): bool
    {
        $step = $this->manufacturingStep;
        $nextStep = $step->getNextStep();

        if (! $nextStep) {
            return false;
        }

        // Check gate quantity based on dependency configuration
        return $this->meetsGateRequirements($nextStep);
    }

    private function meetsGateRequirements($nextStep): bool
    {
        switch ($nextStep->dependency_start_condition) {
            case 'completed':
                return $this->status === 'completed';

            case 'quantity_based':
                return $this->quantity_completed >= $nextStep->dependency_minimum_quantity;

            case 'percentage_based':
                $percentComplete = ($this->quantity_completed / $this->manufacturingOrder->quantity) * 100;

                return $percentComplete >= $nextStep->dependency_minimum_percentage;

            case 'immediate':
                return $this->status !== 'pending';

            default:
                return false;
        }
    }
}

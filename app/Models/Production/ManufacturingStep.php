<?php

namespace App\Models\Production;

use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\ValidationException;

class ManufacturingStep extends Model
{
    use HasFactory;

    /**
     * Step Status Constants
     * 
     * State Transitions:
     * - pending: Initial state when step is created
     * - queued: Step is ready to execute (dependencies met, MO is released)
     * - in_progress: Step is currently being executed
     * - awaiting_quality: Step execution complete, waiting for quality check results
     * - completed: Step successfully finished (including passed quality checks)
     * - skipped: Step was bypassed (not executed)
     * - cancelled: Parent manufacturing order was cancelled
     * - on_hold: Temporarily paused (follows parent MO status)
     */
    public const STATUSES = [
        'pending' => 'Pending',
        'queued' => 'Queued',
        'in_progress' => 'In Progress',
        'on_hold' => 'On Hold',
        'awaiting_quality' => 'Awaiting Quality',
        'completed' => 'Completed',
        'skipped' => 'Skipped',
        'cancelled' => 'Cancelled',
    ];

    public const STEP_TYPES = [
        'standard' => 'Standard',
        'quality_check' => 'Quality Check',
        'rework' => 'Rework',
    ];

    public const QUALITY_CHECK_MODES = [
        'every_part' => 'Every Part',
        'entire_lot' => 'Entire Lot',
        'sampling' => 'Sampling',
    ];

    protected $fillable = [
        'manufacturing_route_id',
        'step_number',
        'step_type',
        'name',
        'description',
        'work_cell_id',
        'status',
        'form_id',
        'form_version_id',
        'setup_time_minutes',
        'cycle_time_minutes',
        'actual_start_time',
        'actual_end_time',
        'quality_result',
        'failure_action',
        'quality_check_mode',
        'sampling_size',
        'depends_on_step_id',
        'can_start_when_dependency',
    ];

    protected $casts = [
        'status' => 'string',
        'step_type' => 'string',
        'quality_result' => 'string',
        'failure_action' => 'string',
        'quality_check_mode' => 'string',
        'can_start_when_dependency' => 'string',
        'actual_start_time' => 'datetime',
        'actual_end_time' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($step) {
            // If this is not the first step and no dependency is set, auto-set to previous step
            if ($step->step_number > 1 && !$step->depends_on_step_id) {
                $previousStep = static::where('manufacturing_route_id', $step->manufacturing_route_id)
                    ->where('step_number', '<', $step->step_number)
                    ->orderBy('step_number', 'desc')
                    ->first();
                
                if ($previousStep) {
                    $step->depends_on_step_id = $previousStep->id;
                } else {
                    // If we can't find a previous step, throw validation error
                    throw ValidationException::withMessages([
                        'depends_on_step_id' => ['Steps after the first must have a dependency on a previous step.']
                    ]);
                }
            }
            
            // Ensure can_start_when_dependency is always 'completed' to enforce linear path
            if ($step->depends_on_step_id && !$step->can_start_when_dependency) {
                $step->can_start_when_dependency = 'completed';
            }
        });
    }

    /**
     * Get the manufacturing route.
     */
    public function manufacturingRoute(): BelongsTo
    {
        return $this->belongsTo(ManufacturingRoute::class);
    }

    /**
     * Get the work cell.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the form.
     */
    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    /**
     * Get the form version.
     */
    public function formVersion(): BelongsTo
    {
        return $this->belongsTo(FormVersion::class);
    }

    /**
     * Get the dependency step.
     */
    public function dependency(): BelongsTo
    {
        return $this->belongsTo(ManufacturingStep::class, 'depends_on_step_id');
    }

    /**
     * Get steps that depend on this step.
     */
    public function dependentSteps(): HasMany
    {
        return $this->hasMany(ManufacturingStep::class, 'depends_on_step_id');
    }

    /**
     * Get the executions for this step.
     */
    public function executions(): HasMany
    {
        return $this->hasMany(ManufacturingStepExecution::class);
    }

    /**
     * Check if the step can be started.
     */
    public function canStart(): bool
    {
        if (!$this->depends_on_step_id) {
            return true;
        }
        
        $dependency = $this->dependency;
        
        // Always require dependency to be completed (enforcing linear path)
        return $dependency->status === 'completed';
    }

    /**
     * Start execution of the step.
     */
    public function startExecution($partNumber = null, $totalParts = null): ManufacturingStepExecution
    {
        if (!$this->canStart()) {
            throw new \Exception('Step dependencies not met');
        }

        $this->update([
            'status' => 'in_progress',
            'actual_start_time' => now(),
        ]);

        return ManufacturingStepExecution::create([
            'manufacturing_step_id' => $this->id,
            'manufacturing_order_id' => $this->manufacturingRoute->manufacturing_order_id,
            'part_number' => $partNumber,
            'total_parts' => $totalParts,
            'status' => 'in_progress',
            'started_at' => now(),
            'work_cell_id' => $this->work_cell_id,
        ]);
    }

    /**
     * Create a rework step for quality failure.
     */
    public function createReworkStep(): ManufacturingStep
    {
        $route = $this->manufacturingRoute;
        $maxStepNumber = $route->steps()->max('step_number');
        
        return $route->steps()->create([
            'step_number' => $maxStepNumber + 1,
            'step_type' => 'rework',
            'name' => "Rework for {$this->name}",
            'description' => "Rework step for failed quality check on {$this->name}",
            'work_cell_id' => $this->work_cell_id,
            'setup_time_minutes' => 0,
            'cycle_time_minutes' => $this->cycle_time_minutes * 2, // Estimate
            'depends_on_step_id' => $this->id,
            'status' => 'pending',
        ]);
    }

    /**
     * Complete the step.
     */
    public function complete(): void
    {
        $this->update([
            'status' => 'completed',
            'actual_end_time' => now(),
        ]);

        // Check if production order should be updated
        $route = $this->manufacturingRoute;
        if ($route->allStepsCompleted()) {
            $order = $route->manufacturingOrder;
            $order->update([
                'status' => 'completed',
                'actual_end_date' => now(),
                'quantity_completed' => $order->quantity,
            ]);
            
            // Check parent order auto-completion
            if ($order->parent) {
                $order->parent->incrementCompletedChildren();
            }
        }
    }

    /**
     * Get the actual duration in minutes.
     */
    public function getActualDurationAttribute(): ?int
    {
        if (!$this->actual_start_time || !$this->actual_end_time) {
            return null;
        }

        return $this->actual_start_time->diffInMinutes($this->actual_end_time);
    }

    /**
     * Get the total estimated time for all parts.
     */
    public function getTotalEstimatedTimeAttribute(): int
    {
        $quantity = $this->manufacturingRoute->manufacturingOrder->quantity;
        return $this->setup_time_minutes + ($this->cycle_time_minutes * $quantity);
    }

    /**
     * Scope for pending steps.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for active steps.
     */
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['queued', 'in_progress', 'on_hold', 'awaiting_quality']);
    }

    /**
     * Scope for quality check steps.
     */
    public function scopeQualityChecks($query)
    {
        return $query->where('step_type', 'quality_check');
    }

    /**
     * Get estimated duration in minutes.
     */
    public function getEstimatedDuration(): int
    {
        return ($this->setup_time_minutes ?? 0) + ($this->cycle_time_minutes ?? 30);
    }

    /**
     * Get estimated remaining time in minutes.
     */
    public function getEstimatedRemainingTime(): int
    {
        if ($this->status !== 'in_progress' || !$this->actual_start_time) {
            return $this->getEstimatedDuration();
        }

        $elapsedMinutes = $this->actual_start_time->diffInMinutes(now());
        $estimatedDuration = $this->getEstimatedDuration();
        
        return max(0, $estimatedDuration - $elapsedMinutes);
    }

    /**
     * Get the current execution relationship.
     */
    public function currentExecution()
    {
        return $this->hasOne(ManufacturingStepExecution::class)
            ->where('status', 'in_progress')
            ->latest();
    }

    /**
     * Move step to queued status when MO is released.
     * Only moves pending steps that have their dependencies met.
     */
    public function moveToQueued(): bool
    {
        // Only pending steps can be queued
        if ($this->status !== 'pending') {
            return false;
        }

        // Check if dependencies are met
        if (!$this->canStart()) {
            return false;
        }

        $this->update(['status' => 'queued']);
        return true;
    }

    /**
     * Put step on hold.
     * Only active steps (in_progress, awaiting_quality) can be put on hold.
     */
    public function putOnHold(): bool
    {
        if (!in_array($this->status, ['in_progress', 'awaiting_quality'])) {
            return false;
        }

        $this->update(['status' => 'on_hold']);
        return true;
    }

    /**
     * Resume step from hold.
     * Returns to the previous state (in_progress or awaiting_quality).
     */
    public function resumeFromHold(): bool
    {
        if ($this->status !== 'on_hold') {
            return false;
        }

        // Determine the state to return to based on execution status
        $newStatus = 'in_progress';
        
        // If this is a quality check step with executions that have been completed
        // but no quality result, it should go to awaiting_quality
        if ($this->step_type === 'quality_check') {
            $hasCompletedExecution = $this->executions()
                ->where('status', 'completed')
                ->whereNull('quality_result')
                ->exists();
                
            if ($hasCompletedExecution) {
                $newStatus = 'awaiting_quality';
            }
        }

        $this->update(['status' => $newStatus]);
        return true;
    }

    /**
     * Cancel step when parent MO is cancelled.
     * Only non-completed steps can be cancelled.
     */
    public function cancel(): bool
    {
        if (in_array($this->status, ['completed', 'cancelled'])) {
            return false;
        }

        $this->update(['status' => 'cancelled']);
        return true;
    }

    /**
     * Move step to awaiting quality status.
     * Used when a quality check step completes execution but needs quality verification.
     */
    public function moveToAwaitingQuality(): bool
    {
        if ($this->step_type !== 'quality_check' || $this->status !== 'in_progress') {
            return false;
        }

        $this->update(['status' => 'awaiting_quality']);
        return true;
    }

    /**
     * Check if this step is the first step in the route.
     */
    public function isFirstStep(): bool
    {
        return $this->step_number === 1 || !$this->depends_on_step_id;
    }

    /**
     * Scope for steps that can be cancelled.
     */
    public function scopeCancellable($query)
    {
        return $query->whereNotIn('status', ['completed', 'cancelled']);
    }

}
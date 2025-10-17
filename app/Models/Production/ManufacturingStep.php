<?php

namespace App\Models\Production;

use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ManufacturingStep extends Model
{
    use HasFactory;

    /**
     * Get the factory name for the model.
     */
    protected static function newFactory()
    {
        return \Database\Factories\Production\RoutingStepFactory::new();
    }

    /**
     * Step Status Constants.
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

    public const STEP_START_CONDITIONS = [
        'completed' => 'Previous step must complete all units',      // Traditional batch processing
        'quantity_based' => 'Start after specific quantity',         // Progressive flow - quantity threshold
        'percentage_based' => 'Start after percentage complete',     // Progressive flow - percentage threshold
        'immediate' => 'Start as soon as previous step begins',      // Maximum progressive flow
    ];

    public const CHILD_ORDER_DEPENDENCY_TYPES = [
        'none' => 'No child order dependencies',
        'all_children_completed' => 'All child orders must be completed',
        'children_quantity' => 'Minimum quantity from child orders',
    ];

    protected $fillable = [
        'manufacturing_route_id',
        'display_order',
        'step_number', // For templates
        'is_template',
        'step_type',
        'name',
        'description',
        'work_cell_id',
        'status',
        'form_id',
        'form_version_id',
        'setup_time_minutes',
        'cycle_time_minutes',
        'use_workcell_throughput',
        'actual_start_time',
        'actual_end_time',
        'quality_result',
        'failure_action',
        'quality_check_mode',
        'sampling_size',
        'depends_on_step_id',
        'can_start_when_dependency',
        // Progressive flow fields
        'dependency_start_condition',
        'dependency_minimum_quantity',
        'dependency_minimum_percentage',
        'cumulative_quantity_completed',
        'cumulative_quantity_scrapped',
        // Child order dependency fields
        'child_order_dependency_type',
        'child_order_minimum_quantity',
        // Scheduling fields
        'scheduled_start',
        'scheduled_end',
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
        'is_template' => 'boolean',
        'use_workcell_throughput' => 'boolean',
        // Progressive flow casts
        'dependency_start_condition' => 'string',
        'dependency_minimum_percentage' => 'decimal:2',
        // Child order dependency casts
        'child_order_dependency_type' => 'string',
        'child_order_minimum_quantity' => 'decimal:2',
        // Scheduling casts
        'scheduled_start' => 'datetime',
        'scheduled_end' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($step) {
            // Handle template steps
            if ($step->relationLoaded('manufacturingRoute') && $step->manufacturingRoute && $step->manufacturingRoute->is_template) {
                $step->is_template = true;
                $step->status = null;
                $step->actual_start_time = null;
                $step->actual_end_time = null;
                $step->cumulative_quantity_completed = 0;
                $step->cumulative_quantity_scrapped = 0;
            } elseif ($step->manufacturing_route_id) {
                // Load the relationship only if needed and not already loaded
                $route = $step->manufacturingRoute()->first();
                if ($route && $route->is_template) {
                    $step->is_template = true;
                    $step->status = null;
                    $step->actual_start_time = null;
                    $step->actual_end_time = null;
                    $step->cumulative_quantity_completed = 0;
                    $step->cumulative_quantity_scrapped = 0;
                } else {
                    // Production steps
                    $step->is_template = false;
                    if (! $step->status) {
                        $step->status = 'pending';
                    }
                }
            } else {
                // Production steps
                $step->is_template = false;
                if (! $step->status) {
                    $step->status = 'pending';
                }
            }

            // Set default dependency start condition if not set
            if ($step->depends_on_step_id && ! $step->dependency_start_condition) {
                $step->dependency_start_condition = 'completed';
            }

            // Ensure can_start_when_dependency is set for backward compatibility
            if ($step->depends_on_step_id && ! $step->can_start_when_dependency) {
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
     * Get the production schedules for this step.
     */
    public function productionSchedules(): HasMany
    {
        return $this->hasMany(ProductionSchedule::class);
    }

    /**
     * Check if the step can be started.
     */
    public function canStart(): bool
    {
        // Check step dependencies first
        if (! $this->checkStepDependencies()) {
            return false;
        }

        // Then check child order dependencies
        if (! $this->checkChildOrderDependencies()) {
            return false;
        }

        return true;
    }

    /**
     * Check step dependencies.
     */
    protected function checkStepDependencies(): bool
    {
        // If no step dependency, can start
        if (! $this->depends_on_step_id) {
            return true;
        }

        $dependency = $this->dependency;

        switch ($this->dependency_start_condition) {
            case 'completed':
                return $dependency->status === 'completed';

            case 'quantity_based':
                return $dependency->cumulative_quantity_completed >= $this->dependency_minimum_quantity;

            case 'percentage_based':
                $targetQuantity = $dependency->manufacturingRoute->manufacturingOrder->quantity;
                if ($targetQuantity == 0) {
                    return true;
                }
                $completedPercentage = ($dependency->cumulative_quantity_completed / $targetQuantity) * 100;

                return $completedPercentage >= $this->dependency_minimum_percentage;

            case 'immediate':
                return in_array($dependency->status, ['in_progress', 'completed']);

            default:
                // Fallback to completed for backward compatibility
                return $dependency->status === 'completed';
        }
    }

    /**
     * Check child order dependencies.
     */
    protected function checkChildOrderDependencies(): bool
    {
        // If no child order dependency, can start
        if ($this->child_order_dependency_type === 'none') {
            return true;
        }

        // Check if manufacturingRoute is already loaded to avoid extra queries
        if ($this->relationLoaded('manufacturingRoute') && $this->manufacturingRoute) {
            $manufacturingOrder = $this->manufacturingRoute->manufacturingOrder;
        } else {
            // Use direct query to avoid lazy loading
            $manufacturingOrder = ManufacturingOrder::whereHas('manufacturingRoute', function ($query) {
                $query->where('id', $this->manufacturing_route_id);
            })->first();

            if (! $manufacturingOrder) {
                return true; // If no MO found, allow start
            }
        }

        // Check if MO has child orders
        if ($manufacturingOrder->child_orders_count === 0) {
            return true; // No children to wait for
        }

        switch ($this->child_order_dependency_type) {
            case 'all_children_completed':
                return $manufacturingOrder->completed_child_orders_count ===
                       $manufacturingOrder->child_orders_count;

            case 'children_quantity':
                // Check minimum quantity completed across ALL child orders
                $childOrders = $manufacturingOrder->children()
                    ->where('status', '!=', 'cancelled')
                    ->get();

                if ($childOrders->isEmpty()) {
                    return true;
                }

                // Find the minimum quantity completed among all child orders
                $minQuantityCompleted = $childOrders->min('quantity_completed');

                return $minQuantityCompleted >= $this->child_order_minimum_quantity;

            default:
                return true;
        }
    }

    /**
     * Start execution of the step.
     */
    public function startExecution($partNumber = null, $totalParts = null): ManufacturingStepExecution
    {
        if (! $this->canStart()) {
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
        $maxDisplayOrder = $route->steps()->max('display_order') ?? 0;

        return $route->steps()->create([
            'display_order' => $maxDisplayOrder + 10,
            'step_type' => 'rework',
            'name' => "Rework for {$this->name}",
            'description' => "Rework step for failed quality check on {$this->name}",
            'work_cell_id' => $this->work_cell_id,
            'setup_time_minutes' => 0,
            'cycle_time_minutes' => $this->cycle_time_minutes * 2, // Estimate
            'depends_on_step_id' => $this->id,
            'dependency_start_condition' => 'completed', // Rework always waits for full completion
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
        if (! $this->actual_start_time || ! $this->actual_end_time) {
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
        if ($this->status !== 'in_progress' || ! $this->actual_start_time) {
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
        if (! $this->canStart()) {
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
        if (! in_array($this->status, ['in_progress', 'awaiting_quality'])) {
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
        return is_null($this->depends_on_step_id);
    }

    /**
     * Scope for steps that can be cancelled.
     */
    public function scopeCancellable($query)
    {
        return $query->whereNotIn('status', ['completed', 'cancelled']);
    }

    /**
     * Get the next step in the production sequence.
     */
    public function getNextStep(): ?ManufacturingStep
    {
        // Use direct query to avoid lazy loading
        return static::where('manufacturing_route_id', $this->manufacturing_route_id)
            ->where('depends_on_step_id', $this->id)
            ->first();
    }

    /**
     * Get the previous step in the production sequence.
     */
    public function getPreviousStep(): ?ManufacturingStep
    {
        return $this->dependency;
    }

    /**
     * Check if the next step in sequence can start.
     */
    public function checkNextStepActivation(): void
    {
        $nextStep = $this->getNextStep();

        if ($nextStep && $nextStep->status === 'pending' && $nextStep->canStart()) {
            $nextStep->moveToQueued();
        }
    }

    /**
     * Get position in the production sequence.
     */
    public function getSequencePosition(): int
    {
        $position = 1;
        $currentStep = $this;

        while ($currentStep->depends_on_step_id) {
            $position++;
            $currentStep = $currentStep->dependency;
        }

        return $position;
    }

    /**
     * Check if this is the last step in the sequence.
     */
    public function isLastStep(): bool
    {
        return ! $this->dependentSteps()->exists();
    }

    /**
     * Update cumulative quantities from execution.
     */
    public function updateCumulativeQuantities(int $completed, int $scrapped = 0): void
    {
        $this->increment('cumulative_quantity_completed', $completed);
        if ($scrapped > 0) {
            $this->increment('cumulative_quantity_scrapped', $scrapped);
        }

        // Check if the next step can now be activated
        $this->checkNextStepActivation();
    }

    /**
     * Get step_number attribute (for backward compatibility).
     * For templates, returns the actual step_number.
     * For production steps, returns display_order.
     */
    public function getStepNumberAttribute()
    {
        if ($this->is_template) {
            return $this->attributes['step_number'] ?? $this->display_order;
        }

        return $this->display_order;
    }
}

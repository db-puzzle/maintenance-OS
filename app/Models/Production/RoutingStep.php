<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RoutingStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'production_routing_id',
        'step_number',
        'operation_code',
        'name',
        'description',
        'work_cell_id',
        'setup_time_minutes',
        'cycle_time_minutes',
        'tear_down_time_minutes',
        'labor_requirement',
        'skill_requirements',
        'tool_requirements',
        'work_instructions',
        'safety_notes',
        'quality_checkpoints',
        'attachments',
    ];

    protected $casts = [
        'skill_requirements' => 'array',
        'tool_requirements' => 'array',
        'quality_checkpoints' => 'array',
        'attachments' => 'array',
    ];

    /**
     * Get the production routing that owns the step.
     */
    public function productionRouting(): BelongsTo
    {
        return $this->belongsTo(ProductionRouting::class);
    }

    /**
     * Get the work cell for this step.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the production schedules for this step.
     */
    public function productionSchedules(): HasMany
    {
        return $this->hasMany(ProductionSchedule::class);
    }

    /**
     * Get the production executions for this step.
     */
    public function productionExecutions(): HasMany
    {
        return $this->hasMany(ProductionExecution::class);
    }

    /**
     * Get total time for this step.
     */
    public function getTotalTimeAttribute()
    {
        return $this->setup_time_minutes + 
               $this->cycle_time_minutes + 
               $this->tear_down_time_minutes;
    }

    /**
     * Get the display name for this step.
     */
    public function getDisplayNameAttribute()
    {
        return "{$this->step_number}. {$this->operation_code} - {$this->name}";
    }

    /**
     * Check if this step has all required resources.
     */
    public function hasRequiredResources()
    {
        // Check if work cell is assigned and active
        if (!$this->workCell || !$this->workCell->is_active) {
            return false;
        }

        // Additional resource checks could be added here
        // e.g., skill availability, tool availability

        return true;
    }

    /**
     * Calculate estimated completion time for a quantity.
     */
    public function calculateCompletionTime($quantity)
    {
        $totalMinutes = $this->setup_time_minutes + 
                       ($this->cycle_time_minutes * $quantity) + 
                       $this->tear_down_time_minutes;

        return [
            'total_minutes' => $totalMinutes,
            'hours' => floor($totalMinutes / 60),
            'minutes' => $totalMinutes % 60,
        ];
    }

    /**
     * Get the next step in the routing.
     */
    public function getNextStep()
    {
        return $this->productionRouting->steps()
            ->where('step_number', '>', $this->step_number)
            ->orderBy('step_number')
            ->first();
    }

    /**
     * Get the previous step in the routing.
     */
    public function getPreviousStep()
    {
        return $this->productionRouting->steps()
            ->where('step_number', '<', $this->step_number)
            ->orderBy('step_number', 'desc')
            ->first();
    }

    /**
     * Check if this is the first step.
     */
    public function isFirstStep()
    {
        return $this->step_number === 1;
    }

    /**
     * Check if this is the last step.
     */
    public function isLastStep()
    {
        $maxStepNumber = $this->productionRouting->steps()->max('step_number');
        return $this->step_number === $maxStepNumber;
    }

    /**
     * Scope for steps that can be scheduled.
     */
    public function scopeSchedulable($query)
    {
        return $query->whereHas('workCell', function ($q) {
            $q->where('is_active', true);
        });
    }
}
<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ManufacturingRoute extends Model
{
    use HasFactory;

    protected $fillable = [
        'manufacturing_order_id',
        'item_id',
        'route_template_id',
        'name',
        'description',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the production order that owns the route.
     */
    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class, 'manufacturing_order_id');
    }

    /**
     * Get the item for this route.
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Get the route template used.
     */
    public function routeTemplate(): BelongsTo
    {
        return $this->belongsTo(RouteTemplate::class);
    }

    /**
     * Get the manufacturing steps.
     */
    public function steps(): HasMany
    {
        return $this->hasMany(ManufacturingStep::class)->orderBy('step_number');
    }

    /**
     * Get the user who created the route.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Create route from template.
     */
    public function createFromTemplate(RouteTemplate $template): void
    {
        foreach ($template->steps as $templateStep) {
            $this->steps()->create([
                'step_number' => $templateStep->step_number,
                'step_type' => $templateStep->step_type,
                'name' => $templateStep->name,
                'description' => $templateStep->description,
                'work_cell_id' => $templateStep->work_cell_id,
                'form_id' => $templateStep->form_id,
                'setup_time_minutes' => $templateStep->setup_time_minutes,
                'cycle_time_minutes' => $templateStep->cycle_time_minutes,
                'quality_check_mode' => $templateStep->quality_check_mode,
                'sampling_size' => $templateStep->sampling_size,
                'status' => 'pending',
            ]);
        }
    }

    /**
     * Get total estimated time in minutes.
     */
    public function getTotalEstimatedTimeAttribute(): int
    {
        return $this->steps->sum(function ($step) {
            return $step->setup_time_minutes + 
                   ($step->cycle_time_minutes * $this->manufacturingOrder->quantity);
        });
    }

    /**
     * Get the current active step.
     */
    public function getCurrentActiveStep()
    {
        return $this->steps()
            ->whereIn('status', ['in_progress', 'on_hold'])
            ->orderBy('step_number')
            ->first();
    }

    /**
     * Get the next pending step.
     */
    public function getNextPendingStep()
    {
        return $this->steps()
            ->where('status', 'pending')
            ->orderBy('step_number')
            ->first();
    }

    /**
     * Check if all steps are completed.
     */
    public function allStepsCompleted(): bool
    {
        return $this->steps()
            ->whereNotIn('status', ['completed', 'skipped'])
            ->count() === 0;
    }

    /**
     * Get completion percentage.
     */
    public function getCompletionPercentageAttribute(): float
    {
        $totalSteps = $this->steps()->count();
        
        if ($totalSteps === 0) {
            return 0;
        }

        $completedSteps = $this->steps()
            ->whereIn('status', ['completed', 'skipped'])
            ->count();

        return round(($completedSteps / $totalSteps) * 100, 2);
    }

    /**
     * Scope for active routes.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
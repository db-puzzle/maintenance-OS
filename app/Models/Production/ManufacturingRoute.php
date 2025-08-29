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
        'route_template_id', // Deprecated, will be removed
        'template_source_id',
        'name',
        'description',
        'is_active',
        'is_template',
        'item_category_id',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_template' => 'boolean',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($route) {
            // Ensure consistency between is_template and manufacturing_order_id
            if ($route->is_template) {
                $route->manufacturing_order_id = null;
            }
        });
    }

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
     * Get the route template used (deprecated).
     */
    public function routeTemplate(): BelongsTo
    {
        return $this->belongsTo(RouteTemplate::class);
    }

    /**
     * Get the template source (new unified approach).
     */
    public function templateSource(): BelongsTo
    {
        return $this->belongsTo(ManufacturingRoute::class, 'template_source_id');
    }

    /**
     * Get routes derived from this template.
     */
    public function derivedRoutes(): HasMany
    {
        return $this->hasMany(ManufacturingRoute::class, 'template_source_id');
    }

    /**
     * Get the item category (for templates).
     */
    public function itemCategory(): BelongsTo
    {
        return $this->belongsTo(ItemCategory::class);
    }

    /**
     * Get the manufacturing steps.
     */
    public function steps(): HasMany
    {
        if ($this->is_template) {
            return $this->hasMany(ManufacturingStep::class)->orderBy('step_number');
        }

        return $this->hasMany(ManufacturingStep::class)->orderBy('display_order');
    }

    /**
     * Get the user who created the route.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Create route from template (unified approach).
     */
    public function createFromTemplate(ManufacturingRoute $template): void
    {
        if (! $template->is_template) {
            throw new \InvalidArgumentException('Source must be a template');
        }

        $stepMapping = [];

        foreach ($template->steps as $templateStep) {
            $newStep = $this->steps()->create([
                'display_order' => $templateStep->step_number * 10,
                'step_number' => $templateStep->step_number, // Keep for reference
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
                'is_template' => false,
            ]);

            $stepMapping[$templateStep->id] = $newStep;
        }

        // Set up dependencies based on step_number sequence
        $this->setupStepDependencies();
    }

    /**
     * Set up step dependencies based on sequential order.
     */
    protected function setupStepDependencies(): void
    {
        $steps = $this->steps()->orderBy('display_order')->get();
        $previousStep = null;

        foreach ($steps as $step) {
            if ($previousStep) {
                $step->update(['depends_on_step_id' => $previousStep->id]);
            }
            $previousStep = $step;
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
     * Steps are considered "done" if they are completed, skipped, or cancelled.
     */
    public function allStepsCompleted(): bool
    {
        return $this->steps()
            ->whereNotIn('status', ['completed', 'skipped', 'cancelled'])
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

    /**
     * Scope for templates.
     */
    public function scopeTemplates($query)
    {
        return $query->where('is_template', true);
    }

    /**
     * Scope for production routes.
     */
    public function scopeProduction($query)
    {
        return $query->where('is_template', false);
    }

    /**
     * Scope for templates compatible with a category.
     */
    public function scopeForCategory($query, ?int $categoryId)
    {
        if (! $categoryId) {
            return $query;
        }

        return $query->where(function ($q) use ($categoryId) {
            $q->whereNull('item_category_id')
                ->orWhere('item_category_id', $categoryId);
        });
    }
}

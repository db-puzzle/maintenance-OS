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

    /**
     * Get the factory name for the model.
     */
    protected static function newFactory()
    {
        return \Database\Factories\Production\ProductionRoutingFactory::new();
    }

    protected $fillable = [
        'manufacturing_order_id',
        'item_id',
        'name',
        'description',
        'is_active',
        'is_template',
        'item_category_id',
        'version',
        'is_latest_for_category',
        'template_metadata',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_template' => 'boolean',
        'is_latest_for_category' => 'boolean',
        'template_metadata' => 'array',
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
                // Templates should not have manufacturing_order_id or direct item_id
                $route->manufacturing_order_id = null;
                $route->item_id = null;
            } else {
                // Production routes must have manufacturing_order_id
                if (! $route->manufacturing_order_id) {
                    throw new \InvalidArgumentException('Production routes must be associated with a manufacturing order.');
                }

                // Automatically set item_id from manufacturing order if not already set
                if (! $route->item_id && $route->manufacturingOrder && $route->manufacturingOrder->item_id) {
                    $route->item_id = $route->manufacturingOrder->item_id;
                }
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
                'step_number' => $templateStep->step_number,
                'step_type' => $templateStep->step_type,
                'name' => $templateStep->name,
                'description' => $templateStep->description,
                'work_cell_id' => $templateStep->work_cell_id,
                'form_id' => $templateStep->form_id,
                'setup_time_minutes' => $templateStep->setup_time_minutes,
                'cycle_time_minutes' => $templateStep->cycle_time_minutes,
                'use_workcell_throughput' => $templateStep->use_workcell_throughput ?? false,
                'quality_check_mode' => $templateStep->quality_check_mode,
                'sampling_size' => $templateStep->sampling_size,
                'quality_specifications' => $templateStep->quality_specifications,
                'can_start_when_dependency' => $templateStep->can_start_when_dependency ?? 'completed',
                'status' => 'pending',
                'is_template' => false,
                // Progressive flow fields
                'dependency_start_condition' => $templateStep->dependency_start_condition ?? 'completed',
                'dependency_minimum_quantity' => $templateStep->dependency_minimum_quantity,
                'dependency_minimum_percentage' => $templateStep->dependency_minimum_percentage,
                // Child order dependency fields
                'child_order_dependency_type' => $templateStep->child_order_dependency_type ?? 'none',
                'child_order_minimum_quantity' => $templateStep->child_order_minimum_quantity,
            ]);

            $stepMapping[$templateStep->id] = $newStep;
        }

        // Set up dependencies based on step_number sequence
        $this->setupStepDependencies();
    }

    /**
     * Set up step dependencies based on sequential order.
     * Creates explicit dependency chain to support future reordering functionality.
     */
    public function setupStepDependencies(): void
    {
        $steps = $this->steps()->with('manufacturingRoute')->orderBy('step_number')->get();
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
        // If this is a template, we don't have a manufacturing order
        if ($this->is_template) {
            return $this->steps->sum(function ($step) {
                return $step->setup_time_minutes + $step->cycle_time_minutes;
            });
        }

        // Check if manufacturingOrder is loaded to avoid N+1 queries
        $quantity = 1;
        if ($this->relationLoaded('manufacturingOrder') && $this->manufacturingOrder) {
            $quantity = $this->manufacturingOrder->quantity ?? 1;
        } elseif ($this->manufacturing_order_id && ! $this->relationLoaded('manufacturingOrder')) {
            // If we have an order ID but relationship isn't loaded, load just the quantity
            $quantity = $this->manufacturingOrder()->value('quantity') ?? 1;
        }

        return $this->steps->sum(function ($step) use ($quantity) {
            return $step->setup_time_minutes +
                   ($step->cycle_time_minutes * $quantity);
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

    /**
     * Scope for templates with optimized eager loading for planning view.
     */
    public function scopeForPlanningTemplates($query)
    {
        return $query->templates()
            ->active()
            ->with([
                'steps' => function ($q) {
                    $q->select(
                        'id',
                        'manufacturing_route_id',
                        'name',
                        'work_cell_id',
                        'step_number',
                        'step_type',
                        'setup_time_seconds',
                        'cycle_time_seconds'
                    )
                        ->orderBy('step_number');
                },
                'createdBy:id,name',
                'itemCategory:id,name',
            ])
            ->select('id', 'name', 'description', 'item_category_id', 'created_by', 'created_at', 'updated_at');
    }

    /**
     * Scope to load route with optimized steps for execution.
     */
    public function scopeWithOptimizedSteps($query)
    {
        return $query->with(['steps' => function ($q) {
            $q->select(
                'id',
                'manufacturing_route_id',
                'name',
                'work_cell_id',
                'step_number',
                'step_type',
                'setup_time_seconds',
                'cycle_time_seconds',
                'child_order_dependency_type',
                'child_order_minimum_quantity',
                'status'
            )
                ->orderBy('step_number')
                ->with('workCell');
        }]);
    }
}

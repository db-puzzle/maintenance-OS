<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RouteTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'item_category',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the template steps.
     */
    public function steps(): HasMany
    {
        return $this->hasMany(RouteTemplateStep::class)->orderBy('step_number');
    }

    /**
     * Get the user who created the template.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get manufacturing routes created from this template.
     */
    public function manufacturingRoutes(): HasMany
    {
        return $this->hasMany(ManufacturingRoute::class);
    }

    /**
     * Clone this template with a new name.
     */
    public function duplicate(string $newName): RouteTemplate
    {
        $clone = $this->replicate();
        $clone->name = $newName;
        $clone->created_by = auth()->id();
        $clone->save();

        // Clone all steps
        foreach ($this->steps as $step) {
            $clonedStep = $step->replicate();
            $clonedStep->route_template_id = $clone->id;
            $clonedStep->save();
        }

        return $clone;
    }

    /**
     * Get total estimated time for the template.
     */
    public function getTotalEstimatedTimeAttribute(): int
    {
        return $this->steps->sum(function ($step) {
            return $step->setup_time_minutes + $step->cycle_time_minutes;
        });
    }

    /**
     * Check if template is compatible with an item.
     */
    public function isCompatibleWithItem(Item $item): bool
    {
        // If no category restriction, it's compatible with all items
        if (!$this->item_category) {
            return true;
        }

        return $item->category === $this->item_category;
    }

    /**
     * Scope for active templates.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for templates compatible with a category.
     */
    public function scopeForCategory($query, ?string $category)
    {
        if (!$category) {
            return $query;
        }

        return $query->where(function ($q) use ($category) {
            $q->whereNull('item_category')
              ->orWhere('item_category', $category);
        });
    }
}
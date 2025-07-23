<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionRouting extends Model
{
    use HasFactory;

    protected $fillable = [
        'bom_item_id',
        'routing_number',
        'name',
        'description',
        'routing_type',
        'parent_routing_id',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the BOM item that owns the routing.
     */
    public function bomItem(): BelongsTo
    {
        return $this->belongsTo(BomItem::class, 'bom_item_id');
    }

    /**
     * Get the parent routing (for inheritance).
     */
    public function parentRouting(): BelongsTo
    {
        return $this->belongsTo(ProductionRouting::class, 'parent_routing_id');
    }

    /**
     * Get the child routings that inherit from this routing.
     */
    public function childRoutings(): HasMany
    {
        return $this->hasMany(ProductionRouting::class, 'parent_routing_id');
    }

    /**
     * Get the routing steps.
     */
    public function steps(): HasMany
    {
        return $this->hasMany(RoutingStep::class)
            ->orderBy('step_number');
    }

    /**
     * Get the user who created the routing.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope for active routings.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for defined routings (not inherited).
     */
    public function scopeDefined($query)
    {
        return $query->where('routing_type', 'defined');
    }

    /**
     * Scope for inherited routings.
     */
    public function scopeInherited($query)
    {
        return $query->where('routing_type', 'inherited');
    }

    /**
     * Get all effective steps (including inherited).
     */
    public function getEffectiveSteps()
    {
        if ($this->routing_type === 'inherited' && $this->parentRouting) {
            return $this->parentRouting->getEffectiveSteps();
        }

        return $this->steps;
    }

    /**
     * Calculate total routing time.
     */
    public function getTotalTimeAttribute()
    {
        return $this->getEffectiveSteps()->sum(function ($step) {
            return $step->setup_time_minutes + 
                   $step->cycle_time_minutes + 
                   $step->tear_down_time_minutes;
        });
    }

    /**
     * Calculate total cycle time (excluding setup/teardown).
     */
    public function getTotalCycleTimeAttribute()
    {
        return $this->getEffectiveSteps()->sum('cycle_time_minutes');
    }

    /**
     * Get the critical path through the routing.
     */
    public function getCriticalPath()
    {
        // For linear routing, all steps are critical
        // This could be expanded for parallel operations
        return $this->getEffectiveSteps();
    }

    /**
     * Clone this routing for another BOM item.
     */
    public function cloneForItem(BomItem $item)
    {
        $newRouting = $this->replicate(['routing_number']);
        $newRouting->bom_item_id = $item->id;
        $newRouting->routing_number = $this->generateRoutingNumber($item);
        $newRouting->save();

        // Clone all steps
        foreach ($this->steps as $step) {
            $newStep = $step->replicate();
            $newStep->production_routing_id = $newRouting->id;
            $newStep->save();
        }

        return $newRouting;
    }

    /**
     * Generate a unique routing number.
     */
    protected function generateRoutingNumber(BomItem $item)
    {
        return 'RT-' . $item->item_number . '-' . time();
    }

    /**
     * Check if all required resources are available.
     */
    public function areResourcesAvailable()
    {
        foreach ($this->getEffectiveSteps() as $step) {
            if (!$step->workCell || !$step->workCell->is_active) {
                return false;
            }
        }

        return true;
    }
}
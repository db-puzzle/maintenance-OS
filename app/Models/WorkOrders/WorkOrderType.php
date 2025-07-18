<?php

namespace App\Models\WorkOrders;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderType extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'name',
        'code',
        'work_order_category_id',
        'description',
        'color',
        'icon',
        'default_priority',
        'requires_approval',
        'auto_approve_from_routine',
        'sla_hours',
        'is_active',
    ];

    protected $casts = [
        'requires_approval' => 'boolean',
        'auto_approve_from_routine' => 'boolean',
        'is_active' => 'boolean',
        'sla_hours' => 'integer',
    ];

    // Relationships
    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function workOrderCategory(): BelongsTo
    {
        return $this->belongsTo(WorkOrderCategory::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory($query, $category)
    {
        if (is_numeric($category)) {
            return $query->where('work_order_category_id', $category);
        }
        
        // For backwards compatibility, also check by category code
        return $query->whereHas('workOrderCategory', function($q) use ($category) {
            $q->where('code', $category);
        });
    }

    public function scopeForDiscipline($query, string $discipline)
    {
        return $query->whereHas('workOrderCategory', function($q) use ($discipline) {
            $q->where('discipline', $discipline);
        });
    }

    // Helper methods
    public function isPreventive(): bool
    {
        return $this->workOrderCategory?->isPreventive() ?? false;
    }

    public function isCorrective(): bool
    {
        return $this->workOrderCategory?->isCorrective() ?? false;
    }

    public function isInspection(): bool
    {
        return $this->workOrderCategory?->isInspection() ?? false;
    }

    public function isProject(): bool
    {
        return $this->workOrderCategory?->isProject() ?? false;
    }

    // Get the category code (for backwards compatibility)
    public function getCategoryCode(): ?string
    {
        return $this->workOrderCategory?->code;
    }

    // Get the discipline
    public function getDiscipline(): ?string
    {
        return $this->workOrderCategory?->discipline;
    }

    // Static helpers
    public static function preventive()
    {
        return static::whereHas('workOrderCategory', function($q) {
            $q->where('code', 'preventive');
        })->first();
    }
}
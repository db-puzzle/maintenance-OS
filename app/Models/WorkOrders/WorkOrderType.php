<?php

namespace App\Models\WorkOrders;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkOrderType extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'name',
        'code',
        'category',
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

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    // Helper methods
    public function isPreventive(): bool
    {
        return $this->category === 'preventive';
    }

    public function isCorrective(): bool
    {
        return $this->category === 'corrective';
    }

    public function isInspection(): bool
    {
        return $this->category === 'inspection';
    }

    public function isProject(): bool
    {
        return $this->category === 'project';
    }

    // Static helpers
    public static function preventive()
    {
        return static::where('code', 'pm_routine')->first();
    }
}
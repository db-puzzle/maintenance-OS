<?php

namespace App\Models\WorkOrders;

use Illuminate\Database\Eloquent\Model;

class WorkOrderDisciplineConfig extends Model
{
    protected $fillable = [
        'discipline',
        'allowed_categories',
        'allowed_sources',
        'requires_compliance_fields',
        'requires_calibration_tracking',
        'custom_fields',
    ];

    protected $casts = [
        'allowed_categories' => 'array',
        'allowed_sources' => 'array',
        'requires_compliance_fields' => 'boolean',
        'requires_calibration_tracking' => 'boolean',
        'custom_fields' => 'array',
    ];

    /**
     * Get configuration for a specific discipline
     */
    public static function forDiscipline(string $discipline): ?self
    {
        return static::where('discipline', $discipline)->first();
    }

    /**
     * Check if a category is allowed for this discipline
     */
    public function isCategoryAllowed(string $category): bool
    {
        return in_array($category, $this->allowed_categories ?? []);
    }

    /**
     * Check if a source type is allowed for this discipline
     */
    public function isSourceAllowed(string $source): bool
    {
        return in_array($source, $this->allowed_sources ?? []);
    }
} 
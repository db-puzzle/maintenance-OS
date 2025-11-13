<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Feature Model.
 *
 * Manages feature flags for the application.
 * Features can be global (enabled/disabled for all tenants) or plan-based.
 *
 * @property int $id
 * @property string $key Unique key for the feature
 * @property string $name Human-readable name
 * @property string|null $description Description of the feature
 * @property string|null $category Feature category
 * @property bool $is_global Whether this is a global feature
 * @property bool $is_enabled_globally Global enablement status
 * @property bool $requires_backend_validation Whether backend should validate
 * @property array|null $metadata Additional metadata
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class Feature extends Model
{
    use HasFactory;

    /**
     * Create a new factory instance for the model.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory<static>
     */
    protected static function newFactory()
    {
        return \Database\Factories\FeatureFactory::new();
    }

    /**
     * The connection name for the model.
     *
     * @var string|null
     */
    protected $connection = 'central';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'key',
        'name',
        'description',
        'category',
        'is_global',
        'is_enabled_globally',
        'requires_backend_validation',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'is_global' => 'boolean',
        'is_enabled_globally' => 'boolean',
        'requires_backend_validation' => 'boolean',
        'metadata' => 'array',
    ];

    /**
     * Get the plans that have access to this feature.
     */
    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'plan_features')
            ->withPivot('is_enabled', 'configuration')
            ->withTimestamps();
    }

    /**
     * Check if this feature is enabled for a specific plan.
     */
    public function isEnabledForPlan(Plan $plan): bool
    {
        // If this is a global feature, check global enablement
        if ($this->is_global) {
            return $this->is_enabled_globally;
        }

        // Check if the plan has this feature enabled
        $planFeature = $this->plans()
            ->where('plan_id', $plan->id)
            ->first();

        if (! $planFeature) {
            return false;
        }

        return $planFeature->pivot->is_enabled;
    }

    /**
     * Get feature configuration for a specific plan.
     */
    public function getConfigurationForPlan(Plan $plan): ?array
    {
        if ($this->is_global) {
            return $this->metadata;
        }

        $planFeature = $this->plans()
            ->where('plan_id', $plan->id)
            ->first();

        return $planFeature?->pivot->configuration;
    }

    /**
     * Scope to get only global features.
     */
    public function scopeGlobal($query)
    {
        return $query->where('is_global', true);
    }

    /**
     * Scope to get only plan-based features.
     */
    public function scopePlanBased($query)
    {
        return $query->where('is_global', false);
    }

    /**
     * Scope to filter by category.
     */
    public function scopeCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}

<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Plan model for subscription plans.
 */
class Plan extends Model
{
    use HasFactory;

    /**
     * Create a new factory instance for the model.
     *
     * @return \Illuminate\Database\Eloquent\Factories\Factory<static>
     */
    protected static function newFactory()
    {
        return \Database\Factories\PlanFactory::new();
    }

    /**
     * The connection name for the model.
     *
     * @var string|null
     */
    protected $connection = 'central';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'price',
        'trial_days',
        'features',
        'is_active',
        'sort_order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'price' => 'decimal:2',
        'features' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get the subscriptions for the plan.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Models\Central\Subscription>
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Get the feature flags associated with this plan.
     */
    public function featureFlags(): BelongsToMany
    {
        return $this->belongsToMany(Feature::class, 'plan_features')
            ->withPivot('is_enabled', 'configuration')
            ->withTimestamps();
    }

    /**
     * Check if the plan has a specific feature.
     *
     * This method checks both the old array-based features and the new feature flags system.
     */
    public function hasFeature(string $feature): bool
    {
        // Check old array-based features for backward compatibility
        if (in_array($feature, $this->features ?? [])) {
            return true;
        }

        // Check new feature flags system
        $featureFlag = Feature::where('key', $feature)->first();

        if (! $featureFlag) {
            return false;
        }

        return $featureFlag->isEnabledForPlan($this);
    }

    /**
     * Get enabled feature flags for this plan.
     */
    public function getEnabledFeatures(): array
    {
        $enabledFeatures = [];

        // Add old array-based features
        foreach ($this->features ?? [] as $feature) {
            $enabledFeatures[$feature] = true;
        }

        // Add new feature flags
        $featureFlags = $this->featureFlags()
            ->wherePivot('is_enabled', true)
            ->get();

        foreach ($featureFlags as $flag) {
            $enabledFeatures[$flag->key] = true;
        }

        // Check global features
        $globalFeatures = Feature::global()
            ->where('is_enabled_globally', true)
            ->get();

        foreach ($globalFeatures as $flag) {
            $enabledFeatures[$flag->key] = true;
        }

        return array_keys($enabledFeatures);
    }
}

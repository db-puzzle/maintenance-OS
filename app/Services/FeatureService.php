<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Central\Feature;
use App\Models\Central\Plan;
use Illuminate\Support\Facades\Cache;

/**
 * Feature Service.
 *
 * Centralized service for checking feature access across the application.
 * Handles both global features and plan-based features.
 */
class FeatureService
{
    /**
     * Cache duration for feature checks (in seconds).
     */
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * Check if a feature is enabled for the current tenant.
     *
     * @param string $featureKey The feature key to check
     * @param Account|null $account The account to check (defaults to current tenant)
     */
    public function isEnabled(string $featureKey, ?Account $account = null): bool
    {
        // Get the account (default to current tenant)
        $account = $account ?? tenant();

        if (! $account) {
            // No tenant context, check only global features
            return $this->isGlobalFeatureEnabled($featureKey);
        }

        // Cache key for this specific check
        $cacheKey = "feature_{$featureKey}_account_{$account->id}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($featureKey, $account) {
            return $this->checkFeatureAccess($featureKey, $account);
        });
    }

    /**
     * Check if multiple features are enabled.
     *
     * @return array<string, bool> Key-value pairs of feature keys and their enabled status
     */
    public function areEnabled(array $featureKeys, ?Account $account = null): array
    {
        $results = [];

        foreach ($featureKeys as $key) {
            $results[$key] = $this->isEnabled($key, $account);
        }

        return $results;
    }

    /**
     * Get all enabled features for an account.
     *
     * @return array Array of enabled feature keys
     */
    public function getEnabledFeatures(?Account $account = null): array
    {
        $account = $account ?? tenant();

        if (! $account) {
            return $this->getGlobalEnabledFeatures();
        }

        $cacheKey = "enabled_features_account_{$account->id}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($account) {
            $enabledFeatures = [];

            // Get global enabled features
            $globalFeatures = Feature::global()
                ->where('is_enabled_globally', true)
                ->pluck('key')
                ->toArray();

            $enabledFeatures = array_merge($enabledFeatures, $globalFeatures);

            // Get plan-based features
            // Use property access to get the relationship, not method call
            $subscription = $account->subscription;

            if ($subscription && $subscription->plan) {
                $planFeatures = $subscription->plan->getEnabledFeatures();
                $enabledFeatures = array_merge($enabledFeatures, $planFeatures);
            }

            return array_unique($enabledFeatures);
        });
    }

    /**
     * Clear the feature cache for an account.
     */
    public function clearCache(?Account $account = null): void
    {
        if ($account) {
            // Clear all feature caches for this account
            $features = Feature::pluck('key');

            foreach ($features as $key) {
                $cacheKey = "feature_{$key}_account_{$account->id}";
                Cache::forget($cacheKey);
            }

            Cache::forget("enabled_features_account_{$account->id}");
        } else {
            // Clear global feature caches
            $features = Feature::pluck('key');

            foreach ($features as $key) {
                Cache::forget("global_feature_{$key}");
            }

            Cache::forget('global_enabled_features');
        }
    }

    /**
     * Check if a global feature is enabled.
     */
    protected function isGlobalFeatureEnabled(string $featureKey): bool
    {
        $cacheKey = "global_feature_{$featureKey}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($featureKey) {
            $feature = Feature::where('key', $featureKey)
                ->where('is_global', true)
                ->first();

            if (! $feature) {
                return false;
            }

            return $feature->is_enabled_globally;
        });
    }

    /**
     * Get all globally enabled features.
     */
    protected function getGlobalEnabledFeatures(): array
    {
        return Cache::remember('global_enabled_features', self::CACHE_TTL, function () {
            return Feature::global()
                ->where('is_enabled_globally', true)
                ->pluck('key')
                ->toArray();
        });
    }

    /**
     * Perform the actual feature access check.
     */
    protected function checkFeatureAccess(string $featureKey, Account $account): bool
    {
        $feature = Feature::where('key', $featureKey)->first();

        if (! $feature) {
            // Feature doesn't exist, deny access
            return false;
        }

        // Check if it's a global feature
        if ($feature->is_global) {
            return $feature->is_enabled_globally;
        }

        // Get the account's subscription and plan
        // Use property access to get the relationship, not method call
        $subscription = $account->subscription;

        if (! $subscription || ! $subscription->plan) {
            // No active subscription, deny access to plan-based features
            return false;
        }

        // Check if the plan has this feature
        return $feature->isEnabledForPlan($subscription->plan);
    }

    /**
     * Throw an exception if the feature is not enabled.
     *
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function ensureEnabled(string $featureKey, ?Account $account = null): void
    {
        if (! $this->isEnabled($featureKey, $account)) {
            $feature = Feature::where('key', $featureKey)->first();
            $featureName = $feature ? $feature->name : $featureKey;

            abort(403, "The feature '{$featureName}' is not available on your current plan.");
        }
    }

    /**
     * Get feature configuration for the current account's plan.
     */
    public function getConfiguration(string $featureKey, ?Account $account = null): ?array
    {
        $account = $account ?? tenant();

        if (! $account) {
            return null;
        }

        $feature = Feature::where('key', $featureKey)->first();

        if (! $feature) {
            return null;
        }

        if ($feature->is_global) {
            return $feature->metadata;
        }

        // Use property access to get the relationship, not method call
        $subscription = $account->subscription;

        if (! $subscription || ! $subscription->plan) {
            return null;
        }

        return $feature->getConfigurationForPlan($subscription->plan);
    }
}

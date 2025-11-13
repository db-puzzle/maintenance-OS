<?php

use App\Models\Central\Feature;
use App\Models\Central\Plan;
use App\Services\FeatureService;
use Illuminate\Support\Facades\Cache;

/*
 * Feature Service Unit Tests.
 *
 * Tests the core functionality of the FeatureService class.
 * Uses CentralTestCase to test with central database only.
 */

beforeEach(function () {
    // Clear cache before each test
    Cache::flush();
});

it('checks if global feature is enabled', function () {
    $feature = Feature::factory()->create([
        'key' => 'test_global_feature',
        'is_global' => true,
        'is_enabled_globally' => true,
    ]);

    $service = app(FeatureService::class);

    expect($service->isEnabled('test_global_feature'))->toBeTrue();
});

it('checks if global feature is disabled', function () {
    $feature = Feature::factory()->create([
        'key' => 'test_global_feature',
        'is_global' => true,
        'is_enabled_globally' => false,
    ]);

    $service = app(FeatureService::class);

    expect($service->isEnabled('test_global_feature'))->toBeFalse();
});

it('checks if feature is enabled for a plan', function () {
    $plan = Plan::factory()->create();

    $feature = Feature::factory()->create([
        'key' => 'test_plan_feature',
        'is_global' => false,
    ]);

    $plan->featureFlags()->attach($feature->id, ['is_enabled' => true]);

    expect($feature->isEnabledForPlan($plan))->toBeTrue();
});

it('denies access to plan-based feature when plan does not have it', function () {
    $plan = Plan::factory()->create();

    $feature = Feature::factory()->create([
        'key' => 'test_plan_feature',
        'is_global' => false,
    ]);

    // Don't attach feature to plan

    expect($feature->isEnabledForPlan($plan))->toBeFalse();
});

it('denies access when feature does not exist', function () {
    $service = app(FeatureService::class);

    expect($service->isEnabled('non_existent_feature'))->toBeFalse();
});

it('returns all enabled features for a plan', function () {
    $plan = Plan::factory()->create();

    // Create global enabled feature
    $globalFeature = Feature::factory()->create([
        'key' => 'global_feature',
        'is_global' => true,
        'is_enabled_globally' => true,
    ]);

    // Create plan-based enabled feature
    $planFeature = Feature::factory()->create([
        'key' => 'plan_feature',
        'is_global' => false,
    ]);
    $plan->featureFlags()->attach($planFeature->id, ['is_enabled' => true]);

    // Create disabled feature
    $disabledFeature = Feature::factory()->create([
        'key' => 'disabled_feature',
        'is_global' => true,
        'is_enabled_globally' => false,
    ]);

    $enabledFeatures = $plan->getEnabledFeatures();

    expect($enabledFeatures)
        ->toContain('global_feature')
        ->toContain('plan_feature')
        ->not->toContain('disabled_feature');
});

it('caches feature checks for performance', function () {
    $feature = Feature::factory()->create([
        'key' => 'cached_feature',
        'is_global' => true,
        'is_enabled_globally' => true,
    ]);

    $service = app(FeatureService::class);

    // First call should query database
    $result1 = $service->isEnabled('cached_feature');

    // Second call should use cache
    $result2 = $service->isEnabled('cached_feature');

    expect($result1)->toBeTrue();
    expect($result2)->toBeTrue();

    // Verify cache exists
    expect(Cache::has('global_feature_cached_feature'))->toBeTrue();
});

it('clears global feature cache correctly', function () {
    $feature = Feature::factory()->create([
        'key' => 'test_feature',
        'is_global' => true,
        'is_enabled_globally' => true,
    ]);

    $service = app(FeatureService::class);

    // Prime cache
    $service->isEnabled('test_feature');

    // Verify cache exists
    expect(Cache::has('global_feature_test_feature'))->toBeTrue();

    // Clear cache
    $service->clearCache();

    // Cache should be cleared
    expect(Cache::has('global_feature_test_feature'))->toBeFalse();
});

it('throws exception when ensureEnabled fails', function () {
    $feature = Feature::factory()->create([
        'key' => 'disabled_feature',
        'is_global' => true,
        'is_enabled_globally' => false,
    ]);

    $service = app(FeatureService::class);

    $service->ensureEnabled('disabled_feature');
})->throws(\Symfony\Component\HttpKernel\Exception\HttpException::class);

it('checks multiple features at once', function () {
    Feature::factory()->create([
        'key' => 'feature1',
        'is_global' => true,
        'is_enabled_globally' => true,
    ]);

    Feature::factory()->create([
        'key' => 'feature2',
        'is_global' => true,
        'is_enabled_globally' => false,
    ]);

    $service = app(FeatureService::class);
    $results = $service->areEnabled(['feature1', 'feature2']);

    expect($results)->toBe([
        'feature1' => true,
        'feature2' => false,
    ]);
});

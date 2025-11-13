<?php

use App\Models\Central\Feature;
use App\Models\Central\Plan;
use App\Services\FeatureService;
use Illuminate\Support\Facades\Cache;

/*
 * Feature Flag Integration Tests
 *
 * Tests the feature flag system end-to-end including middleware,
 * route protection, and UI behavior.
 */

beforeEach(function () {
    // Clear cache before each test
    Cache::flush();
});

it('feature service returns correct enabled features list', function () {
    // Create some features
    Feature::factory()->create([
        'key' => 'enabled_feature',
        'is_global' => true,
        'is_enabled_globally' => true,
    ]);

    Feature::factory()->create([
        'key' => 'disabled_feature',
        'is_global' => true,
        'is_enabled_globally' => false,
    ]);

    $service = app(FeatureService::class);
    $enabledFeatures = $service->getEnabledFeatures();

    expect($enabledFeatures)
        ->toContain('enabled_feature')
        ->not->toContain('disabled_feature');
});

it('admin can toggle global features', function () {
    $admin = \App\Models\Central\AdminUser::factory()->create();

    $feature = Feature::factory()->create([
        'key' => 'test_feature',
        'is_global' => true,
        'is_enabled_globally' => false,
    ]);

    $this->actingAs($admin, 'admin')
        ->post(route('admin.features.toggle-global', $feature), [
            'is_enabled' => true,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($feature->fresh()->is_enabled_globally)->toBeTrue();
});

it('admin cannot toggle non-global features globally', function () {
    $admin = \App\Models\Central\AdminUser::factory()->create();

    $feature = Feature::factory()->create([
        'key' => 'test_feature',
        'is_global' => false,
    ]);

    $this->actingAs($admin, 'admin')
        ->post(route('admin.features.toggle-global', $feature), [
            'is_enabled' => true,
        ])
        ->assertRedirect()
        ->assertSessionHas('error');

    // Should not have changed
    expect($feature->fresh()->is_enabled_globally)->toBeFalse();
});

it('admin can update plan feature assignments', function () {
    $admin = \App\Models\Central\AdminUser::factory()->create();

    $plan1 = Plan::factory()->create();
    $plan2 = Plan::factory()->create();

    $feature = Feature::factory()->create([
        'key' => 'test_feature',
        'is_global' => false,
    ]);

    $this->actingAs($admin, 'admin')
        ->post(route('admin.features.plan-assignments', $feature), [
            'plans' => [
                ['plan_id' => $plan1->id, 'is_enabled' => true, 'configuration' => null],
                ['plan_id' => $plan2->id, 'is_enabled' => false, 'configuration' => null],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    // Verify assignments
    $plan1Feature = $plan1->featureFlags()->where('feature_id', $feature->id)->first();
    $plan2Feature = $plan2->featureFlags()->where('feature_id', $feature->id)->first();

    expect($plan1Feature->pivot->is_enabled)->toBeTrue();
    expect($plan2Feature->pivot->is_enabled)->toBeFalse();
});

it('cache is cleared after toggling feature', function () {
    $admin = \App\Models\Central\AdminUser::factory()->create();

    $feature = Feature::factory()->create([
        'key' => 'test_feature',
        'is_global' => true,
        'is_enabled_globally' => false,
    ]);

    // Prime the cache
    $service = app(FeatureService::class);
    $service->isEnabled('test_feature');

    // Toggle feature
    $this->actingAs($admin, 'admin')
        ->post(route('admin.features.toggle-global', $feature), [
            'is_enabled' => true,
        ]);

    // Cache should be cleared (or updated value should be returned)
    $isEnabled = $service->isEnabled('test_feature');
    expect($isEnabled)->toBeTrue();
});

it('admin can access features management page', function () {
    $admin = \App\Models\Central\AdminUser::factory()->create();

    Feature::factory()->count(3)->create();

    $this->actingAs($admin, 'admin')
        ->get(route('admin.features.index'))
        ->assertSuccessful()
        ->assertInertia(
            fn ($page) => $page->component('admin/features/index')
                ->has('features', 3)
                ->has('plans')
        );
});

it('admin can clear feature cache', function () {
    $admin = \App\Models\Central\AdminUser::factory()->create();

    $this->actingAs($admin, 'admin')
        ->post(route('admin.features.clear-cache'))
        ->assertRedirect()
        ->assertSessionHas('success');
});

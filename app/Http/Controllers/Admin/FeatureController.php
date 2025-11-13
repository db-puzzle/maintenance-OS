<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Central\Feature;
use App\Models\Central\Plan;
use App\Services\FeatureService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Feature Management Controller.
 *
 * Manages feature flags for the application.
 * Accessible only from the admin panel (central application).
 */
class FeatureController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(
        protected FeatureService $featureService
    ) {}

    /**
     * Display a listing of features.
     */
    public function index(): Response
    {
        $features = Feature::with(['plans' => function ($query) {
            $query->select('plans.id', 'plans.name');
        }])
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->map(function ($feature) {
                return [
                    'id' => $feature->id,
                    'key' => $feature->key,
                    'name' => $feature->name,
                    'description' => $feature->description,
                    'category' => $feature->category,
                    'is_global' => $feature->is_global,
                    'is_enabled_globally' => $feature->is_enabled_globally,
                    'requires_backend_validation' => $feature->requires_backend_validation,
                    'metadata' => $feature->metadata,
                    'plans' => $feature->plans->map(function ($plan) {
                        $pivot = $plan->pivot;

                        return [
                            'id' => $plan->id,
                            'name' => $plan->name,
                            'is_enabled' => $pivot->is_enabled,
                            'configuration' => $pivot->configuration,
                        ];
                    }),
                    'created_at' => $feature->created_at,
                    'updated_at' => $feature->updated_at,
                ];
            });

        $plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'description']);

        return Inertia::render('admin/features/index', [
            'features' => $features,
            'plans' => $plans,
        ]);
    }

    /**
     * Toggle a global feature on/off.
     */
    public function toggleGlobal(Request $request, Feature $feature): RedirectResponse
    {
        // Only allow toggling global features
        if (! $feature->is_global) {
            return back()->with('error', 'This feature is plan-based and cannot be toggled globally.');
        }

        $validated = $request->validate([
            'is_enabled' => 'required|boolean',
        ]);

        $feature->update([
            'is_enabled_globally' => $validated['is_enabled'],
        ]);

        // Clear feature cache
        $this->featureService->clearCache();

        $status = $validated['is_enabled'] ? 'enabled' : 'disabled';

        return back()->with('success', "Feature '{$feature->name}' has been {$status} globally.");
    }

    /**
     * Update a feature's plan assignments.
     */
    public function updatePlanAssignments(Request $request, Feature $feature): RedirectResponse
    {
        $validated = $request->validate([
            'plans' => 'required|array',
            'plans.*.plan_id' => 'required|exists:plans,id',
            'plans.*.is_enabled' => 'required|boolean',
            'plans.*.configuration' => 'nullable|array',
        ]);

        // Sync plan assignments
        $syncData = [];
        foreach ($validated['plans'] as $planData) {
            $syncData[$planData['plan_id']] = [
                'is_enabled' => $planData['is_enabled'],
                'configuration' => $planData['configuration'] ?? null,
            ];
        }

        $feature->plans()->sync($syncData);

        // Clear feature cache
        $this->featureService->clearCache();

        return back()->with('success', "Plan assignments updated for '{$feature->name}'.");
    }

    /**
     * Update a feature's details.
     */
    public function update(Request $request, Feature $feature): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
        ]);

        $feature->update($validated);

        return back()->with('success', "Feature '{$feature->name}' has been updated.");
    }

    /**
     * Clear all application caches.
     *
     * This clears feature cache plus all Laravel caches for a comprehensive reset.
     */
    public function clearCache(): RedirectResponse
    {
        try {
            // Clear feature-specific cache
            $this->featureService->clearCache();

            // Clear all application caches
            \Artisan::call('cache:clear');
            \Artisan::call('config:clear');
            \Artisan::call('route:clear');
            \Artisan::call('view:clear');
            \Artisan::call('event:clear');

            // Clear permission cache if the command exists
            try {
                \Artisan::call('permission:cache-reset');
            } catch (\Exception $e) {
                // Silently fail if permission:cache-reset doesn't exist
            }

            // Regenerate Ziggy routes
            try {
                \Artisan::call('ziggy:generate');
            } catch (\Exception $e) {
                // Silently fail if ziggy:generate doesn't exist or fails
            }

            // Run optimize:clear as a final cleanup
            \Artisan::call('optimize:clear');

            return back()->with('success', 'All application caches cleared successfully!');
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to clear caches. Check logs for details.');
        }
    }
}

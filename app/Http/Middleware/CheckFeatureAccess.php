<?php

namespace App\Http\Middleware;

use App\Services\FeatureService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Check Feature Access Middleware.
 *
 * Validates that the current tenant has access to a specific feature.
 * Usage: Route::get('/scheduler', ...)->middleware('feature:production_scheduler');
 */
class CheckFeatureAccess
{
    /**
     * Create a new middleware instance.
     */
    public function __construct(
        protected FeatureService $featureService
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response) $next
     * @param string $feature The feature key to check
     */
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        // Check if the feature is enabled for the current tenant
        if (! $this->featureService->isEnabled($feature)) {
            // If it's an AJAX/Inertia request, return JSON error
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                abort(403, 'This feature is not available on your current plan.');
            }

            // For regular requests, redirect to home with error message
            return redirect()
                ->route('home')
                ->with('error', 'This feature is not available on your current plan. Please upgrade to access it.');
        }

        return $next($request);
    }
}

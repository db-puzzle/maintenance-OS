<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Inject tenant information into views and Inertia responses.
 */
class InjectTenantInfo
{
    /**
     * Handle an incoming request.
     *
     * @param \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response) $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Share tenant info with all views
        if (tenant()) {
            // Share with Blade views
            view()->share('tenant', tenant());

            // Share with Inertia
            Inertia::share([
                'tenant' => [
                    'id' => tenant()->id,
                    'name' => tenant()->name,
                    'subdomain' => tenant()->subdomain,
                    'status' => tenant()->status,
                    'trial_ends_at' => tenant()->trial_ends_at?->toDateString(),
                ],
            ]);
        }

        return $next($request);
    }
}

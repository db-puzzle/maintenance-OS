<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensure the current tenant is active.
 */
class EnsureTenantIsActive
{
    /**
     * Handle an incoming request.
     *
     * @param \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response) $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Package has already initialized tenant!
        $tenant = tenant();

        if ($tenant && $tenant->status !== 'active') {
            // Check if it's a suspended tenant
            if ($tenant->status === 'suspended') {
                return response()->view('errors.tenant-suspended', [
                    'tenant' => $tenant,
                    'reason' => $tenant->suspension_reason,
                ], 403);
            }

            // Check if it's in maintenance mode
            if ($tenant->status === 'maintenance') {
                return response()->view('errors.tenant-maintenance', [
                    'tenant' => $tenant,
                ], 503);
            }

            // For any other non-active status
            return response()->view('errors.tenant-inactive', [
                'tenant' => $tenant,
            ], 403);
        }

        return $next($request);
    }
}

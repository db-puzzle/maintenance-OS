<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission, string $guard = null): Response
    {
        if (auth()->guest()) {
            abort(403, 'Unauthenticated.');
        }

        $permissions = is_array($permission)
            ? $permission
            : explode('|', $permission);

        foreach ($permissions as $perm) {
            if ($request->user()->can($perm)) {
                return $next($request);
            }
        }

        abort(403, 'You do not have permission to access this resource.');
    }
}
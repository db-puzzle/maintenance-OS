<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Define tenant middleware group with package middleware
        // NOTE: Do NOT include 'web' here - tenant routes will apply it separately
        // This ensures InitializeTenancyByDomain runs BEFORE StartSession
        $middleware->group('tenant', [
            \Stancl\Tenancy\Middleware\InitializeTenancyByDomain::class,
            \Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains::class,
            \App\Http\Middleware\EnsureTenantIsActive::class,
            \App\Http\Middleware\InjectTenantInfo::class,
            // Add ScopeSessions to tenant middleware to prevent session forgery
            // This middleware adds tenant_id to sessions and validates it on each request
            // Must run AFTER tenancy is initialized, so it's in the tenant group, not web
            // See: https://tenancyforlaravel.com/docs/v3/session-scoping/
            \Stancl\Tenancy\Middleware\ScopeSessions::class,
        ]);

        // Apply InitializeTenancyByDomain globally BEFORE web middleware for tenant domains
        $middleware->priority([
            \Stancl\Tenancy\Middleware\InitializeTenancyByDomain::class,
            \Illuminate\Session\Middleware\StartSession::class,
            // ... other middleware in default priority order
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {})->create();

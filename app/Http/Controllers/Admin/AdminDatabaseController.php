<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * Controller for managing tenant database operations in the admin portal.
 * Maximizes use of Laravel Tenancy package commands.
 */
class AdminDatabaseController extends Controller
{
    /**
     * Run migrations for a specific tenant.
     */
    public function migrate(Account $account): RedirectResponse
    {
        // Use package command
        Artisan::call('tenants:migrate', [
            '--tenants' => [$account->id],
        ]);

        return back()->with('success', 'Migrations run successfully');
    }

    /**
     * Seed database for a specific tenant.
     */
    public function seed(Account $account): RedirectResponse
    {
        // Use package command
        Artisan::call('tenants:seed', [
            '--tenants' => [$account->id],
        ]);

        return back()->with('success', 'Database seeded successfully');
    }

    /**
     * Refresh database for a specific tenant.
     */
    public function refresh(Request $request, Account $account): RedirectResponse
    {
        if (! $request->boolean('confirm')) {
            return back()->with('error', 'Please confirm database refresh');
        }

        // Use package command
        Artisan::call('tenants:migrate-fresh', [
            '--tenants' => [$account->id],
            '--seed' => true,
        ]);

        return back()->with('success', 'Database refreshed successfully');
    }

    /**
     * Clear cache for a specific tenant.
     */
    public function clearCache(Account $account): RedirectResponse
    {
        // Use package command to clear all caches
        Artisan::call('tenants:run', [
            'commandname' => 'cache:clear',
            '--tenants' => [$account->id],
        ]);

        Artisan::call('tenants:run', [
            'commandname' => 'config:clear',
            '--tenants' => [$account->id],
        ]);

        return back()->with('success', 'Cache cleared successfully');
    }

    /**
     * Optimize a specific tenant.
     */
    public function optimize(Account $account): RedirectResponse
    {
        // Use package command to optimize
        Artisan::call('tenants:run', [
            'commandname' => 'optimize',
            '--tenants' => [$account->id],
        ]);

        return back()->with('success', 'Tenant optimized successfully');
    }

    /**
     * Toggle maintenance mode for a specific tenant.
     */
    public function maintenanceMode(Request $request, Account $account): RedirectResponse
    {
        $command = $request->boolean('enable') ? 'down' : 'up';

        Artisan::call('tenants:run', [
            'commandname' => $command,
            '--tenants' => [$account->id],
        ]);

        return back()->with(
            'success',
            'Maintenance mode ' . ($request->boolean('enable') ? 'enabled' : 'disabled')
        );
    }

    /**
     * Get database statistics for a specific tenant.
     */
    public function stats(Account $account): JsonResponse
    {
        $stats = $account->getDatabaseStats();

        return response()->json($stats);
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\AdminTenantService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Controller for the admin dashboard.
 * Displays tenant statistics and recent activity.
 */
class AdminDashboardController extends Controller
{
    public function __construct(
        private AdminTenantService $tenantService
    ) {}

    /**
     * Display the admin dashboard.
     */
    public function index(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => $this->tenantService->getTenantStatistics(),
            'recentActivity' => $this->getRecentActivity(),
            'tenantHealth' => $this->tenantService->getTenantHealthOverview(5),
        ]);
    }

    /**
     * Get recent activity data.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function getRecentActivity(): array
    {
        // Cache recent activity for 60 seconds
        return Cache::remember('admin_recent_activity', 60, function () {
            return Account::query()
                ->select(['id', 'name', 'subdomain', 'created_at'])
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn ($account) => [
                    'id' => $account->id,
                    'type' => 'tenant_created',
                    'description' => "Tenant '{$account->name}' created",
                    'created_at' => $account->created_at->toIso8601String(),
                ])
                ->toArray();
        });
    }

    /**
     * Force refresh all dashboard data.
     */
    public function refresh(): RedirectResponse
    {
        // Clear all relevant caches
        $this->tenantService->clearAdminCaches();
        Cache::forget('admin_recent_activity');

        // Clear individual tenant stat caches for displayed tenants
        $this->tenantService->getTenantHealthOverview(5)->each(function ($tenant): void {
            Account::find($tenant['id'])?->clearStatsCache();
        });

        return redirect()->route('admin.dashboard')
            ->with('success', 'Dashboard data refreshed');
    }
}

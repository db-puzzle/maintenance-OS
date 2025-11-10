<?php

namespace App\Services;

use App\Models\Account;
use Illuminate\Support\Facades\Cache;

/**
 * Service for managing tenant operations in the admin portal.
 * Provides cached statistics and tenant health monitoring.
 */
class AdminTenantService
{
    /**
     * Get tenant statistics with caching.
     *
     * @return array<string, mixed>
     */
    public function getTenantStatistics(): array
    {
        // Use cache key with admin namespace
        $cacheKey = 'admin_tenants_statistics';

        return Cache::remember($cacheKey, 300, function () {
            $total = Account::count();
            $active = Account::where('status', 'active')->count();
            $suspended = Account::where('status', 'suspended')->count();
            $trial = Account::where('trial_ends_at', '>', now())->count();

            $byPlan = Account::query()
                ->join('subscriptions', 'accounts.id', '=', 'subscriptions.account_id')
                ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
                ->groupBy('plans.name')
                ->selectRaw('plans.name as plan, count(accounts.id) as count')
                ->pluck('count', 'plan')
                ->toArray();

            return [
                'total' => $total,
                'active' => $active,
                'suspended' => $suspended,
                'trial' => $trial,
                'by_plan' => $byPlan,
            ];
        });
    }

    /**
     * Get tenant health overview with caching.
     *
     * @param int $limit Number of tenants to include
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    public function getTenantHealthOverview(int $limit = 10)
    {
        $cacheKey = "admin_tenants_health_overview_{$limit}";

        return Cache::remember($cacheKey, 120, function () use ($limit) {
            return Account::query()
                ->where('status', 'active')
                ->with(['domains' => function ($query): void {
                    $query->select('tenant_id', 'domain');
                }])
                ->limit($limit)
                ->get(['id', 'name', 'subdomain', 'created_at', 'tenancy_db_name'])
                ->map(function ($tenant) {
                    try {
                        // Use cached stats from the model
                        $stats = $tenant->getDatabaseStats();
                        $databaseSize = $stats['database_size'] ?? 'N/A';
                        $userCount = $stats['user_count'] ?? 0;
                    } catch (\Exception $e) {
                        \Log::warning('Failed to get database stats for tenant', [
                            'tenant_id' => $tenant->id,
                            'error' => $e->getMessage(),
                        ]);
                        $databaseSize = 'N/A';
                        $userCount = 0;
                    }

                    return [
                        'id' => $tenant->id,
                        'name' => $tenant->name,
                        'subdomain' => $tenant->subdomain,
                        'domain' => $tenant->domains->first()?->domain,
                        'database_size' => $databaseSize,
                        'users' => $userCount,
                        'created' => $tenant->created_at->diffForHumans(),
                    ];
                });
        });
    }

    /**
     * Clear all admin caches.
     */
    public function clearAdminCaches(): void
    {
        // Clear all admin-related caches by pattern
        Cache::forget('admin_tenants_statistics');

        // Clear health overview caches for common limits
        foreach ([5, 10, 20, 50] as $limit) {
            Cache::forget("admin_tenants_health_overview_{$limit}");
        }
    }
}

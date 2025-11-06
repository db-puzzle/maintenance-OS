<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\AdminTenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Controller for system health monitoring.
 * Provides simple health checks while delegating detailed monitoring to Laravel Cloud.
 */
class SystemHealthController extends Controller
{
    public function __construct(
        private AdminTenantService $tenantService
    ) {}

    /**
     * Display system health overview.
     */
    public function index(): Response
    {
        // Simple health check - let Cloud handle detailed monitoring
        $health = [
            'tenants' => $this->tenantService->getTenantStatistics(),
            'databases' => $this->getSimpleDatabaseHealth(),
        ];

        return Inertia::render('admin/system-health', compact('health'));
    }

    /**
     * Get simple database health information.
     *
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    protected function getSimpleDatabaseHealth()
    {
        // Simple health check - detailed monitoring in Laravel Cloud
        return Cache::remember('simple_health', 60, function () {
            return Account::query()
                ->select(['id', 'name', 'subdomain', 'status'])
                ->where('status', 'active')
                ->limit(10)
                ->get()
                ->map(function ($tenant) {
                    return [
                        'tenant' => $tenant->name,
                        'subdomain' => $tenant->subdomain,
                        'status' => 'Check Cloud Dashboard for details',
                        'cloud_dashboard' => 'https://cloud.laravel.com',
                    ];
                });
        });
    }

    /**
     * Get detailed health for a specific tenant.
     */
    public function show(Account $account): JsonResponse
    {
        $detailedStats = Cache::remember("tenant_detailed_health_{$account->id}", 120, function () use ($account) {
            return $account->run(function () {
                return [
                    'tables' => DB::select("
                        SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
                        FROM pg_tables 
                        WHERE schemaname = 'public' 
                        ORDER BY pg_total_relation_size(tablename::regclass) DESC 
                        LIMIT 10
                    "),
                    'indexes' => DB::select("
                        SELECT indexname, tablename, pg_size_pretty(pg_relation_size(indexname::regclass)) as size
                        FROM pg_indexes 
                        WHERE schemaname = 'public' 
                        ORDER BY pg_relation_size(indexname::regclass) DESC 
                        LIMIT 10
                    "),
                    'connections' => DB::select('
                        SELECT pid, usename, application_name, client_addr, state
                        FROM pg_stat_activity 
                        WHERE datname = current_database()
                    '),
                ];
            });
        });

        return response()->json($detailedStats);
    }
}

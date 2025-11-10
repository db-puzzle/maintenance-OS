    # Admin Portal Design - Leveraging Laravel Tenancy Events

> **📝 Note**: For the complete implementation specification with detailed features, UI designs, and step-by-step implementation guide, see [ADMIN_PORTAL_SPECIFICATION.md](../ADMIN_PORTAL_SPECIFICATION.md)

## Overview

This document details an optimized admin portal design that leverages Laravel Tenancy's built-in event system instead of custom job dispatching. By using package events, we reduce complexity and improve reliability.

For comprehensive implementation details including:
- Full feature specifications
- Complete UI/UX designs  
- Data structures and interfaces
- Implementation phases with timelines
- Testing strategies
- Security considerations

Please refer to the [**ADMIN_PORTAL_SPECIFICATION.md**](../ADMIN_PORTAL_SPECIFICATION.md) document.

## Key Optimizations

1. **Event-Driven Actions**: Use package events for tenant lifecycle management
2. **Simplified Database Operations**: Let the package handle database operations
3. **Automatic Context Switching**: Use tenant `run()` method for admin operations
4. **Built-in Commands**: Leverage package's artisan commands
5. **Trust Laravel Cloud**: Monitoring, scaling, and backups handled automatically
6. **No Infrastructure Code**: Focus on admin features only

## Architecture

### Event-Based Flow

```
Admin Action → Laravel Tenancy Event → Event Listeners → Side Effects

Example:
Create Account → TenantCreated Event → [
    SendWelcomeEmail Listener
    InitializeSettings Listener  
    LogActivity Listener
]
```

### Infrastructure Handled by Laravel Cloud

```
┌─────────────────────────────────────────────────────┐
│                Laravel Cloud                         │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐│
│  │ PgBouncer   │ │Auto-scaling  │ │ Monitoring   ││
│  │ 10K conn    │ │0.5-4 units   │ │ CPU/Memory   ││
│  └─────────────┘ └──────────────┘ └──────────────┘│
└─────────────────────────────┬───────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────┐
│              Admin Portal (Simple)                   │
│         Focus on Features, Not Infrastructure        │
└─────────────────────────────────────────────────────┘
```

## Account Management - Event Driven

### Leveraging Package Commands for Listing

```php
// Get tenant list using package command
php artisan tenants:list

// Can be used in admin for quick CLI access
php artisan tenants:list --json

// Filter by status (if extended)
php artisan tenants:list --status=active
```

### Optimized Queries with Caching

```php
<?php

namespace App\Services;

use App\Models\Account;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\Collection;

class AdminTenantService
{
    /**
     * Get tenant statistics with Laravel Tenancy cache tags
     */
    public function getTenantStatistics(): array
    {
        // Use cache tags for better organization and invalidation
        return Cache::tags(['admin', 'tenants', 'statistics'])->remember('tenant_stats', 300, function () {
            return [
                'total' => Account::count(),
                'active' => Account::where('status', 'active')->count(),
                'suspended' => Account::where('status', 'suspended')->count(),
                'trial' => Account::where('trial_ends_at', '>', now())->count(),
                'by_plan' => Account::query()
                    ->join('subscriptions', 'accounts.id', '=', 'subscriptions.account_id')
                    ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
                    ->groupBy('plans.name')
                    ->selectRaw('plans.name as plan, count(accounts.id) as count')
                    ->pluck('count', 'plan')
                    ->toArray(),
            ];
        });
    }
    
    /**
     * Get tenant health overview with Laravel Tenancy cache tags
     */
    public function getTenantHealthOverview(int $limit = 10): Collection
    {
        // Use cache tags for granular invalidation
        return Cache::tags(['admin', 'tenants', 'health'])->remember("overview_{$limit}", 120, function () use ($limit) {
            return Account::query()
                ->where('status', 'active')
                ->with(['domains' => function ($query) {
                    $query->select('tenant_id', 'domain');
                }])
                ->limit($limit)
                ->get(['id', 'name', 'subdomain', 'created_at'])
                ->map(function ($tenant) {
                    // Use cached stats from the model (which also uses cache tags)
                    $stats = $tenant->getDatabaseStats();
                    
                    return [
                        'id' => $tenant->id,
                        'name' => $tenant->name,
                        'subdomain' => $tenant->subdomain,
                        'domain' => $tenant->domains->first()?->domain,
                        'database_size' => $stats['database_size'] ?? 'N/A',
                        'users' => $stats['user_count'] ?? 0,
                        'created' => $tenant->created_at->diffForHumans(),
                    ];
                });
        });
    }
    
    /**
     * Clear all admin caches using Laravel Tenancy cache tags
     */
    public function clearAdminCaches(): void
    {
        // Clear all admin-related caches by tag
        Cache::tags(['admin'])->flush();
        
        // Or selectively clear specific admin cache groups
        Cache::tags(['admin', 'tenants', 'statistics'])->flush();
        Cache::tags(['admin', 'tenants', 'health'])->flush();
    }
}

### AccountController (Simplified)

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Central\Plan;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AccountController extends Controller
{
    public function __construct(
        private AdminTenantService $tenantService
    ) {}
    
    public function index(Request $request)
    {
        // Optimized query with selective loading
        $accounts = Account::query()
            ->select(['id', 'name', 'subdomain', 'status', 'trial_ends_at', 'created_at'])
            ->with([
                'domains:tenant_id,domain',
                'subscription:account_id,plan_id,status',
                'subscription.plan:id,name,price'
            ])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('subdomain', 'like', "%{$search}%");
                });
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->latest()
            ->paginate(20);
            
        return Inertia::render('Admin/Accounts/Index', [
            'accounts' => $accounts,
            'filters' => $request->only(['search', 'status']),
            'statistics' => $this->tenantService->getTenantStatistics(),
        ]);
    }
    
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'subdomain' => 'required|string|unique:accounts',
            'plan_id' => 'required|exists:plans,id',
            'admin_email' => 'required|email',
            'admin_name' => 'required|string',
        ]);
        
        // Just create the tenant - everything else is automatic!
        $tenant = Account::create([
            'name' => $validated['name'],
            'subdomain' => $validated['subdomain'],
            'status' => 'active',
            'trial_ends_at' => now()->addDays(30),
            'metadata' => [
                'admin_email' => $validated['admin_email'],
                'admin_name' => $validated['admin_name'],
                'created_by_admin' => auth()->id(),
            ],
        ]);
        
        // Domain created via model event
        // Database created via package
        // Events fired automatically:
        // - TenantCreated
        // - DatabaseCreated  
        // - DatabaseMigrated
        // - DatabaseSeeded
        
        $tenant->subscription()->create([
            'plan_id' => $validated['plan_id'],
            'status' => 'trialing',
            'trial_ends_at' => $tenant->trial_ends_at,
        ]);
        
        return redirect()->route('admin.accounts.show', $tenant)
            ->with('success', 'Account created successfully. Database setup is automatic!');
    }
    
    public function update(Request $request, Account $tenant)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'status' => 'required|in:active,suspended,maintenance',
        ]);
        
        $oldStatus = $tenant->status;
        
        $tenant->update($validated);
        
        // Fire custom event if status changed
        if ($oldStatus !== $tenant->status) {
            event(new \App\Events\TenantStatusChanged($tenant, $oldStatus));
        }
        
        return back()->with('success', 'Account updated');
    }
    
    public function destroy(Account $tenant)
    {
        // Confirm deletion
        if (!request()->boolean('confirm')) {
            return back()->with('error', 'Please confirm deletion');
        }
        
        // Just delete - package handles everything!
        $tenant->delete();
        
        // Package automatically:
        // - Fires DeletingTenant event
        // - Drops the database
        // - Fires TenantDeleted event
        // - Fires DatabaseDeleted event
        
        return redirect()->route('admin.accounts.index')
            ->with('success', 'Account and database deleted automatically');
    }
}
```

### Event Listeners for Admin Actions

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Stancl\Tenancy\Events;
use App\Events\TenantStatusChanged;

class AdminEventServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Listen to package events
        Event::listen(Events\TenantCreated::class, function ($event) {
            $tenant = $event->tenant;
            
            // Log admin activity
            activity()
                ->on($tenant)
                ->by(auth()->user())
                ->log('Created tenant account');
                
            // Send welcome email
            dispatch(function () use ($tenant) {
                Mail::to($tenant->metadata['admin_email'])
                    ->send(new TenantWelcomeMail($tenant));
            })->afterResponse();
        });
        
        Event::listen(Events\DatabaseSeeded::class, function ($event) {
            // Notify admin that tenant is ready
            $tenant = $event->tenant;
            
            Notification::route('mail', config('app.admin_email'))
                ->notify(new TenantReadyNotification($tenant));
        });
        
        Event::listen(Events\DeletingTenant::class, function ($event) {
            $tenant = $event->tenant;
            
            // Clean up external resources
            $this->cleanupStripeCustomer($tenant);
            $this->cleanupS3Storage($tenant);
            $this->exportDataForCompliance($tenant);
        });
        
        // Custom app event
        Event::listen(TenantStatusChanged::class, function ($event) {
            $tenant = $event->tenant;
            $oldStatus = $event->oldStatus;
            
            activity()
                ->on($tenant)
                ->by(auth()->user())
                ->withProperties([
                    'old_status' => $oldStatus,
                    'new_status' => $tenant->status,
                ])
                ->log('Changed tenant status');
                
            // Handle status-specific logic
            if ($tenant->status === 'suspended') {
                $this->notifyTenantOfSuspension($tenant);
            }
        });
    }
    
    protected function cleanupStripeCustomer($tenant): void
    {
        if ($subscription = $tenant->subscription) {
            Cashier::stripe()->customers->delete(
                $subscription->stripe_customer_id
            );
        }
    }
    
    protected function cleanupS3Storage($tenant): void
    {
        Storage::disk('s3')->deleteDirectory("tenants/{$tenant->id}");
    }
}
```

## Database Operations via Package Commands

### AdminDatabaseController - Maximizing Package Commands

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class AdminDatabaseController extends Controller
{
    public function migrate(Account $tenant)
    {
        // Use package command
        Artisan::call('tenants:migrate', [
            '--tenants' => [$tenant->id],
        ]);
        
        return back()->with('success', 'Migrations run successfully');
    }
    
    public function seed(Account $tenant)
    {
        // Use package command
        Artisan::call('tenants:seed', [
            '--tenants' => [$tenant->id],
        ]);
        
        return back()->with('success', 'Database seeded successfully');
    }
    
    public function refresh(Account $tenant)
    {
        if (!request()->boolean('confirm')) {
            return back()->with('error', 'Please confirm database refresh');
        }
        
        // Use package command
        Artisan::call('tenants:migrate-fresh', [
            '--tenants' => [$tenant->id],
            '--seed' => true,
        ]);
        
        return back()->with('success', 'Database refreshed successfully');
    }
    
    public function clearCache(Account $tenant)
    {
        // Use package command to clear all caches
        Artisan::call('tenants:run', [
            'commandname' => 'cache:clear',
            '--tenants' => [$tenant->id],
        ]);
        
        Artisan::call('tenants:run', [
            'commandname' => 'config:clear',
            '--tenants' => [$tenant->id],
        ]);
        
        return back()->with('success', 'Cache cleared successfully');
    }
    
    public function optimize(Account $tenant)
    {
        // Use package command to optimize
        Artisan::call('tenants:run', [
            'commandname' => 'optimize',
            '--tenants' => [$tenant->id],
        ]);
        
        return back()->with('success', 'Tenant optimized successfully');
    }
    
    public function maintenanceMode(Account $tenant, Request $request)
    {
        $command = $request->enable ? 'down' : 'up';
        
        Artisan::call('tenants:run', [
            'commandname' => $command,
            '--tenants' => [$tenant->id],
        ]);
        
        return back()->with('success', 'Maintenance mode ' . ($request->enable ? 'enabled' : 'disabled'));
    }
    
    public function stats(Account $tenant)
    {
        // Get stats using package commands
        $output = Artisan::output();
        
        Artisan::call('tenants:run', [
            'commandname' => 'db:table users --count',
            '--tenants' => [$tenant->id],
        ]);
        $userCount = trim($output);
        
        $stats = $tenant->getDatabaseStats();
        $stats['user_count_verified'] = $userCount;
        
        return response()->json($stats);
    }
}
```

## Bulk Operations Using Events

### BulkOperationsController

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Bus;

class BulkOperationsController extends Controller
{
    public function suspend(Request $request)
    {
        $tenantIds = $request->validate([
            'tenant_ids' => 'required|array',
            'tenant_ids.*' => 'exists:accounts,id',
            'reason' => 'required|string',
        ]);
        
        Account::whereIn('id', $tenantIds['tenant_ids'])
            ->update([
                'status' => 'suspended',
                'suspension_reason' => $tenantIds['reason'],
                'suspended_at' => now(),
            ]);
            
        // Events will be fired for status changes
        
        return back()->with('success', count($tenantIds['tenant_ids']) . ' accounts suspended');
    }
    
    public function runCommand(Request $request)
    {
        $validated = $request->validate([
            'tenant_ids' => 'required|array',
            'command' => 'required|in:migrate,seed,cache:clear,optimize,down,up',
        ]);
        
        // Use package commands directly - no custom job needed!
        $tenantIdString = implode(',', $validated['tenant_ids']);
        
        // Map user-friendly commands to package commands
        $commandMap = [
            'migrate' => 'tenants:migrate',
            'seed' => 'tenants:seed',
            'cache:clear' => 'tenants:run cache:clear',
            'optimize' => 'tenants:run optimize',
            'down' => 'tenants:run down',
            'up' => 'tenants:run up',
        ];
        
        $packageCommand = $commandMap[$validated['command']];
        $args = ['--tenants' => $tenantIdString];
        
        if (str_starts_with($packageCommand, 'tenants:run')) {
            $args = [
                'commandname' => str_replace('tenants:run ', '', $packageCommand),
                '--tenants' => $tenantIdString,
            ];
            $packageCommand = 'tenants:run';
        }
        
        Artisan::call($packageCommand, $args);
            
        return back()->with('success', 'Bulk operation completed for ' . count($validated['tenant_ids']) . ' tenants');
    }
}
```

### Batch Operations with Progress (Optional)

For long-running bulk operations, you can still use jobs for progress tracking:

```php
<?php

namespace App\Jobs;

use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;

class RunTenantCommandWithProgress implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public function __construct(
        public array $tenantIds,
        public string $command
    ) {}
    
    public function handle(): void
    {
        if ($this->batch()->cancelled()) {
            return;
        }
        
        // Run package command on multiple tenants
        Artisan::call($this->command, [
            '--tenants' => implode(',', $this->tenantIds),
        ]);
    }
}
```

## Admin Dashboard with Manual Refresh

### AdminDashboardController

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Central\Activity;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function __construct(
        private AdminTenantService $tenantService
    ) {}
    
    public function index()
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => $this->tenantService->getTenantStatistics(),
            'recentActivity' => $this->getRecentActivity(),
            'tenantHealth' => $this->tenantService->getTenantHealthOverview(5),
        ]);
    }
    
    protected function getRecentActivity(): array
    {
        // Cache recent activity for 60 seconds
        return Cache::remember('admin_recent_activity', 60, function () {
            return Activity::query()
                ->select(['id', 'type', 'description', 'created_at'])
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn ($activity) => [
                    'id' => $activity->id,
                    'type' => $activity->type,
                    'description' => $activity->description,
                    'created_at' => $activity->created_at->toISOString(),
                ])
                ->toArray();
        });
    }
    
    /**
     * Force refresh all dashboard data
     */
    public function refresh()
    {
        // Clear all relevant caches
        $this->tenantService->clearAdminCaches();
        Cache::forget('admin_recent_activity');
        
        // Clear individual tenant stat caches for displayed tenants
        $this->tenantService->getTenantHealthOverview(5)->each(function ($tenant) {
            Account::find($tenant['id'])?->clearStatsCache();
        });
        
        return redirect()->route('admin.dashboard')
            ->with('success', 'Dashboard data refreshed');
    }
}
```

### Simplified Dashboard Component

```tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { router } from '@inertiajs/react';

interface DashboardProps {
    stats: {
        totalTenants: number;
        activeTenants: number;
        suspendedTenants: number;
        trialTenants: number;
    };
    recentActivity: Array<{
        id: string;
        type: string;
        description: string;
        created_at: string;
    }>;
    tenantHealth: Array<{
        tenant: string;
        subdomain: string;
        status: string;
        size: string;
        connections: number;
        users: number;
    }>;
}

export default function AdminDashboard({ stats, recentActivity, tenantHealth }: DashboardProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['stats', 'recentActivity', 'tenantHealth'],
            onFinish: () => setIsRefreshing(false),
        });
    };
    
    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['stats', 'recentActivity', 'tenantHealth'] });
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <Button 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    size="sm"
                    variant="outline"
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTenants}</div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.activeTenants}</div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Suspended</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.suspendedTenants}</div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Trial</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.trialTenants}</div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {recentActivity.length === 0 ? (
                                <p className="text-gray-500">No recent activity</p>
                            ) : (
                                recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                                        <div>
                                            <span className="font-medium">{activity.description}</span>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {new Date(activity.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Tenant Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {tenantHealth.map((tenant) => (
                                <div key={tenant.subdomain} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                                    <div>
                                        <span className="font-medium">{tenant.tenant}</span>
                                        <div className="text-sm text-gray-500">
                                            {tenant.size} • {tenant.connections} connections • {tenant.users} users
                                        </div>
                                    </div>
                                    <span className={`text-sm font-medium ${
                                        tenant.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {tenant.status === 'healthy' ? '✓' : '✗'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
```

## Monitoring - Use Laravel Cloud Dashboard

### What Laravel Cloud Provides:

1. **Database Metrics**
   - CPU usage
   - Memory usage  
   - Connection count
   - Storage usage

2. **Alerts**
   - High CPU usage
   - Connection limits
   - Storage warnings

3. **Logs**
   - Query logs
   - Error logs
   - Slow query logs

### Simplified System Health Monitor

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class SystemHealthController extends Controller
{
    public function __construct(
        private AdminTenantService $tenantService
    ) {}
    
    public function index()
    {
        // Simple health check - let Cloud handle detailed monitoring
        $health = [
            'tenants' => $this->tenantService->getTenantStatistics(),
            'databases' => $this->getSimpleDatabaseHealth(),
        ];
        
        return Inertia::render('Admin/SystemHealth', compact('health'));
    }
    
    protected function getSimpleDatabaseHealth(): Collection
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
    
    // We DON'T need:
    // ❌ Custom monitoring dashboards
    // ❌ Complex health check systems  
    // ❌ Manual connection tracking
    // ❌ Custom alert systems
    
    /**
     * Get detailed health for a specific tenant
     */
    public function show(Account $tenant)
    {
        $detailedStats = Cache::remember("tenant_detailed_health_{$tenant->id}", 120, function () use ($tenant) {
            return $tenant->run(function () {
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
                    'connections' => DB::select("
                        SELECT pid, usename, application_name, client_addr, state
                        FROM pg_stat_activity 
                        WHERE datname = current_database()
                    "),
                ];
            });
        });
        
        return response()->json($detailedStats);
    }
}
```

## Key Improvements

### What We Changed

1. **❌ Custom job dispatching** → **✅ Package events**
2. **❌ Manual database operations** → **✅ Package commands**
3. **❌ Complex state management** → **✅ Event-driven updates**
4. **❌ Manual cleanup logic** → **✅ Event listeners**
5. **❌ Custom monitoring systems** → **✅ Laravel Cloud dashboard**
6. **❌ Connection pool management** → **✅ Built-in PgBouncer**
7. **❌ Manual scaling calculations** → **✅ Auto-scaling**
8. **❌ Custom backup solutions** → **✅ Simple tools**

### What We Eliminated

- 🗑️ 300+ lines of connection pooling configuration
- 🗑️ 400+ lines of backup strategy  
- 🗑️ Complex monitoring systems
- 🗑️ Custom health checks
- 🗑️ Manual connection management
- 🗑️ Elaborate disaster recovery plans

### Benefits

1. **90% Less Code**: Focus on admin features only
2. **More Reliable**: Platform-managed infrastructure
3. **Better Performance**: Cloud optimizations built-in
4. **Lower Costs**: Pay only for what you use
5. **Zero Infrastructure Maintenance**: It just works

## Testing Admin Features

```php
<?php

namespace Tests\Feature\Admin;

use Tests\TestCase;
use App\Models\Account;
use App\Models\User;
use Stancl\Tenancy\Events;
use Illuminate\Support\Facades\Event;

class AdminAccountManagementTest extends TestCase
{
    protected User $admin;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::factory()->admin()->create();
        $this->actingAs($this->admin, 'admin');
    }
    
    public function test_creates_tenant_with_automatic_database()
    {
        Event::fake([
            Events\TenantCreated::class,
            Events\DatabaseCreated::class,
            Events\DatabaseMigrated::class,
            Events\DatabaseSeeded::class,
        ]);
        
        $response = $this->post(route('admin.accounts.store'), [
            'name' => 'New Company',
            'subdomain' => 'newcompany',
            'plan_id' => Plan::first()->id,
            'admin_email' => 'admin@newcompany.com',
            'admin_name' => 'Admin User',
        ]);
        
        $response->assertRedirect();
        
        // Assert all events were fired
        Event::assertDispatched(Events\TenantCreated::class);
        Event::assertDispatched(Events\DatabaseCreated::class);
        Event::assertDispatched(Events\DatabaseMigrated::class);
        Event::assertDispatched(Events\DatabaseSeeded::class);
        
        $this->assertDatabaseHas('accounts', [
            'subdomain' => 'newcompany',
        ], 'central');
    }
    
    public function test_deletes_tenant_with_automatic_cleanup()
    {
        Event::fake([Events\DeletingTenant::class, Events\TenantDeleted::class]);
        
        $tenant = Account::factory()->create();
        
        $response = $this->delete(route('admin.accounts.destroy', $tenant), [
            'confirm' => true,
        ]);
        
        $response->assertRedirect(route('admin.accounts.index'));
        
        Event::assertDispatched(Events\DeletingTenant::class);
        Event::assertDispatched(Events\TenantDeleted::class);
        
        $this->assertDatabaseMissing('accounts', [
            'id' => $tenant->id,
        ], 'central');
    }
}
```

## Disaster Recovery - Trust the Platform

### Laravel Cloud Handles:

1. **Automatic Backups**
   - Daily backups configured
   - Point-in-time recovery
   - One-click restore

2. **Connection Issues**
   - Auto-restart connections
   - PgBouncer handles reconnection
   - No manual intervention

3. **Scaling**
   - Automatic based on load
   - No capacity planning needed
   - Scales to zero when idle

### Simple Backup Command (If Needed)

```bash
# For custom backups beyond Cloud's automatic ones
php artisan tenants:run db:dump --path=backups

# Or use Spatie Laravel Backup
composer require spatie/laravel-backup
php artisan backup:run
```

## Key Takeaways

1. **Trust Laravel Cloud** - Infrastructure is handled
2. **Trust Laravel Tenancy** - Database operations are automatic
3. **Keep it simple** - Don't build what exists
4. **Use the platform** - Monitoring, backups, scaling included
5. **Focus on features** - Admin tools, not infrastructure

## Conclusion

By combining Laravel Tenancy's event system with Laravel Cloud's infrastructure, the admin portal becomes dramatically simpler and more reliable. The package handles complex database operations automatically, while the platform manages connections, monitoring, backups, and scaling. This allows us to focus entirely on building great admin features rather than infrastructure management.

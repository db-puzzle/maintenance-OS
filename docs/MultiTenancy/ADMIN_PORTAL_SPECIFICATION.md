# Admin Portal - Comprehensive Implementation Specification

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Dashboard](#dashboard)
4. [Tenant Management](#tenant-management)
5. [Plan & Subscription Management](#plan--subscription-management)
6. [Limits & Quotas](#limits--quotas)
7. [Database Operations](#database-operations)
8. [System Health & Monitoring](#system-health--monitoring)
9. [Activity Logging](#activity-logging)
10. [Frontend Components](#frontend-components)
11. [Implementation Phases](#implementation-phases)

---

## Overview

The Admin Portal is a centralized interface for system administrators to manage all aspects of the multi-tenant maintenance OS application. It runs on `admin.localhost` (or `admin.yourdomain.com` in production) and operates entirely on the central database.

### Key Features

- **Dashboard**: Real-time statistics and health overview
- **Tenant Management**: Full CRUD for tenant accounts
- **Subscription Management**: Plan switching, billing, and limits
- **Database Operations**: Migrations, seeding, cache clearing
- **Health Monitoring**: Database stats, connections, performance
- **Activity Logging**: Audit trail of all admin actions
- **Bulk Operations**: Manage multiple tenants simultaneously

### Technology Stack

- **Backend**: Laravel 12, Laravel Tenancy v3
- **Frontend**: React 19, Inertia.js v2, TypeScript
- **UI**: shadcn/ui, Tailwind CSS v4
- **Database**: Central PostgreSQL (for admin data)
- **Authentication**: Admin guard (separate from tenant users)

---

## Architecture

### Domain Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Domain Structure                         │
├─────────────────────────────────────────────────────────────┤
│  localhost                → Marketing/Registration Site      │
│  admin.localhost          → Admin Portal (This Document)     │
│  {subdomain}.localhost    → Tenant Applications             │
└─────────────────────────────────────────────────────────────┘
```

### Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Central Database                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐      │
│  │  accounts  │ │   plans    │ │ subscriptions      │      │
│  │  domains   │ │admin_users │ │ activity_log       │      │
│  └────────────┘ └────────────┘ └────────────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐            ┌───────▼────────┐
│ Tenant DB 1    │            │ Tenant DB 2    │
│ tenant_abc123  │            │ tenant_def456  │
│                │            │                │
│ • users        │            │ • users        │
│ • assets       │            │ • assets       │
│ • work_orders  │            │ • work_orders  │
└────────────────┘            └────────────────┘
```

### Request Flow

```
1. Admin logs in via admin.localhost
2. AdminAuthenticatedSessionController authenticates against admin_users table
3. AdminDashboardController fetches stats from central DB
4. For tenant-specific operations:
   a. Load Account model
   b. Use $account->run() to execute code in tenant context
   c. Return to central context
```

---

## Dashboard

### Current State

The dashboard controller exists but the frontend only shows a basic welcome screen. We need to enhance it to display:

1. **Key Statistics** (4 cards at top)
   - Total Tenants
   - Active Tenants
   - Suspended Tenants
   - Trial Tenants

2. **Recent Activity** (left panel)
   - Last 10 tenant creations
   - Status changes
   - Plan switches
   - Admin actions

3. **Tenant Health** (right panel)
   - Top 5 tenants by size
   - Database size
   - Connection count
   - User count
   - Creation date

4. **Quick Actions**
   - Create New Tenant
   - View All Tenants
   - System Health
   - Bulk Operations

### Data Structure

```typescript
interface DashboardProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        };
    };
    stats: {
        total: number;
        active: number;
        suspended: number;
        trial: number;
        by_plan: Record<string, number>;
    };
    recentActivity: Array<{
        id: string;
        type: string;
        description: string;
        created_at: string;
    }>;
    tenantHealth: Array<{
        id: string;
        name: string;
        subdomain: string;
        domain: string;
        database_size: string;
        connections?: number;
        users: number;
        created: string;
    }>;
}
```

### Backend Implementation

The backend is already implemented in:
- `app/Http/Controllers/Admin/AdminDashboardController.php`
- `app/Services/AdminTenantService.php`

### Frontend Implementation Needed

**File**: `resources/js/pages/admin/dashboard.tsx`

Features to add:
1. Display stats cards with proper styling
2. Show recent activity with relative timestamps
3. Display tenant health with database metrics
4. Add auto-refresh every 30 seconds
5. Manual refresh button
6. Quick action cards with navigation
7. Responsive grid layout

---

## Tenant Management

### Overview

Full CRUD interface for managing tenant accounts. Admins can create, view, edit, suspend, and delete tenants.

### Pages Required

#### 1. Tenant List (`/accounts`)

**File**: `resources/js/pages/admin/accounts/index.tsx`

**Features**:
- Paginated table of all tenants (20 per page)
- Search by name or subdomain (real-time with debounce)
- Filter by status (active, suspended, maintenance)
- Columns:
  - Name
  - Subdomain
  - Domain
  - Status (badge with color)
  - Plan
  - Users Count
  - Created Date
  - Actions (View, Edit, Delete)
- Bulk operations checkbox column
- Stats summary at top

**Data Structure**:
```typescript
interface AccountsIndexProps {
    accounts: PaginatedData<{
        id: string;
        name: string;
        subdomain: string;
        status: 'active' | 'suspended' | 'maintenance';
        trial_ends_at: string | null;
        created_at: string;
        domains: Array<{ domain: string }>;
        subscription: {
            plan: {
                name: string;
                price: string;
            };
            status: string;
        };
    }>;
    filters: {
        search?: string;
        status?: string;
    };
    statistics: {
        total: number;
        active: number;
        suspended: number;
        trial: number;
    };
}
```

#### 2. Create Tenant (`/accounts/create`)

**File**: `resources/js/pages/admin/accounts/create.tsx`

**Features**:
- Form with validation
- Fields:
  - Company Name (required)
  - Subdomain (required, unique, real-time availability check)
  - Plan Selection (dropdown with prices)
  - Admin Email (required, email validation)
  - Admin Name (required)
- Subdomain preview: `{subdomain}.localhost`
- Plan details (features, limits) displayed when selected
- Auto-database creation notice
- Submit creates tenant, database, and admin user

**Backend**: Already implemented in `AccountController@store`

#### 3. View Tenant (`/accounts/{id}`)

**File**: `resources/js/pages/admin/accounts/show.tsx`

**Features**:
- Tenant Information Card:
  - Name, Subdomain, Status
  - Created date, Trial end date
  - Domain(s)
- Subscription Details Card:
  - Current Plan
  - Status
  - Trial/Active dates
  - Price
  - Features and limits
- Database Statistics Card:
  - Database name
  - Size (formatted)
  - Connection count
  - Table count
  - User count
  - Work order count
  - Asset count
- Actions:
  - Edit Tenant
  - Switch Plan
  - Suspend/Activate
  - Database Operations dropdown
  - Delete Tenant (with confirmation)
- Activity Log (last 20 actions)

**Data Structure**:
```typescript
interface AccountShowProps {
    account: {
        id: string;
        name: string;
        subdomain: string;
        status: string;
        trial_ends_at: string | null;
        created_at: string;
        metadata: Record<string, any>;
        domains: Array<{ domain: string }>;
        subscription: {
            plan: {
                name: string;
                price: string;
                features: {
                    users: number;
                    assets: number;
                    work_orders: number;
                    storage: string;
                };
            };
            status: string;
            trial_ends_at: string | null;
            starts_at: string | null;
        };
    };
    stats: {
        database_size: string;
        connections: number;
        table_count: number;
        user_count: number;
        work_order_count: number;
        asset_count: number;
        created_at: string;
    };
}
```

#### 4. Edit Tenant (`/accounts/{id}/edit`)

**File**: `resources/js/pages/admin/accounts/edit.tsx`

**Features**:
- Edit form with current values pre-filled
- Fields:
  - Name (editable)
  - Status (active/suspended/maintenance)
  - Suspension Reason (required if suspended)
- Subdomain display (not editable - would require complex migration)
- Validation
- Save button
- Cancel button

**Backend**: Already implemented in `AccountController@update`

### Backend Implementation Status

✅ **Completed**:
- `AccountController@index` - List tenants with filtering/search
- `AccountController@create` - Show create form
- `AccountController@store` - Create new tenant
- `AccountController@show` - View tenant details
- `AccountController@edit` - Show edit form
- `AccountController@update` - Update tenant
- `AccountController@destroy` - Delete tenant

❌ **Frontend Missing**: All four page components need to be created

---

## Plan & Subscription Management

### Plan Structure

Plans are stored in the `plans` table in the central database:

```php
// Plan Model
{
    id: 1,
    name: 'Free',
    description: 'Perfect for individuals getting started',
    price: 0.00,
    trial_days: 0,
    features: {
        users: 2,
        assets: 25,
        work_orders: 100,
        storage: '1GB'
    },
    is_active: true,
    sort_order: 1
}
```

### Subscription Model

```php
// Subscription Model
{
    id: 1,
    account_id: 'uuid',
    plan_id: 1,
    status: 'active', // trialing, active, past_due, canceled, paused
    trial_ends_at: '2024-02-15',
    starts_at: '2024-01-15',
    ends_at: null,
    canceled_at: null,
    stripe_subscription_id: 'sub_xxx',
    stripe_customer_id: 'cus_xxx',
    metadata: {}
}
```

### Features to Implement

#### 1. Plan Switching Interface

**Location**: Within tenant show/edit page or separate `/accounts/{id}/subscription`

**Features**:
- Display current plan
- Show all available plans
- Highlight differences in features
- Immediate switch (no prorating needed for MVP)
- Confirmation dialog showing:
  - Current plan vs new plan
  - Feature changes
  - Price change
  - Effective date

**Backend Endpoint Needed**:
```php
// app/Http/Controllers/Admin/SubscriptionController.php

public function update(Request $request, Account $account)
{
    $validated = $request->validate([
        'plan_id' => 'required|exists:plans,id',
        'effective_immediately' => 'boolean',
    ]);
    
    $oldPlan = $account->subscription->plan;
    
    $account->subscription->update([
        'plan_id' => $validated['plan_id'],
        'updated_at' => now(),
    ]);
    
    event(new PlanChanged($account, $oldPlan, $newPlan));
    
    return back()->with('success', 'Plan updated successfully');
}
```

#### 2. Plan Management (Admin Only)

**Location**: `/admin/plans` (separate from tenant management)

**Features**:
- List all plans
- Create new plan
- Edit existing plan
- Deactivate plan (soft delete - don't delete plans with subscriptions)
- Reorder plans (sort_order)

**Pages Needed**:
- `resources/js/pages/admin/plans/index.tsx`
- `resources/js/pages/admin/plans/create.tsx`
- `resources/js/pages/admin/plans/edit.tsx`

---

## Limits & Quotas

### Understanding Limits

Limits are stored in the plan's `features` JSON field:

```json
{
    "users": 5,
    "assets": 100,
    "work_orders": 500,
    "storage": "10GB"
}
```

### Enforcement Locations

Limits should be enforced in **two places**:

1. **Tenant Application** (in tenant database context)
   - Check before creating new users/assets/work orders
   - Display usage vs limits in UI
   - Block creation when limit reached

2. **Admin Portal** (display only)
   - Show current usage vs plan limits
   - Alert when tenant is near limit
   - Suggest plan upgrade

### Implementation Needed

#### 1. Limit Checker Service (Tenant Context)

**File**: `app/Services/Tenant/LimitCheckerService.php`

```php
<?php

namespace App\Services\Tenant;

use App\Models\Account;
use App\Models\User;
use App\Models\Asset;
use App\Models\WorkOrder;

/**
 * Service to check if tenant has reached their plan limits.
 * Must be called within tenant context.
 */
class LimitCheckerService
{
    /**
     * Check if tenant can create more users.
     */
    public function canCreateUser(): bool
    {
        $account = $this->getCurrentTenantAccount();
        $limit = $account->subscription->plan->features['users'] ?? PHP_INT_MAX;
        $current = User::count();
        
        return $current < $limit;
    }
    
    /**
     * Check if tenant can create more assets.
     */
    public function canCreateAsset(): bool
    {
        $account = $this->getCurrentTenantAccount();
        $limit = $account->subscription->plan->features['assets'] ?? PHP_INT_MAX;
        $current = Asset::count();
        
        return $current < $limit;
    }
    
    /**
     * Get usage statistics for current tenant.
     */
    public function getUsageStats(): array
    {
        $account = $this->getCurrentTenantAccount();
        $features = $account->subscription->plan->features;
        
        return [
            'users' => [
                'current' => User::count(),
                'limit' => $features['users'] ?? null,
                'percentage' => $this->calculatePercentage(User::count(), $features['users'] ?? null),
            ],
            'assets' => [
                'current' => Asset::count(),
                'limit' => $features['assets'] ?? null,
                'percentage' => $this->calculatePercentage(Asset::count(), $features['assets'] ?? null),
            ],
            'work_orders' => [
                'current' => WorkOrder::count(),
                'limit' => $features['work_orders'] ?? null,
                'percentage' => $this->calculatePercentage(WorkOrder::count(), $features['work_orders'] ?? null),
            ],
        ];
    }
    
    /**
     * Get current tenant account from central DB.
     */
    protected function getCurrentTenantAccount(): Account
    {
        return Account::on('central')
            ->with('subscription.plan')
            ->find(tenant('id'));
    }
    
    /**
     * Calculate usage percentage.
     */
    protected function calculatePercentage(?int $current, ?int $limit): ?int
    {
        if ($limit === null || $limit === 0) {
            return null;
        }
        
        return (int) min(100, ($current / $limit) * 100);
    }
}
```

#### 2. Admin Display (Central Context)

In the tenant show page, display limits alongside usage:

```tsx
// Usage & Limits Card Component
interface UsageLimitsProps {
    stats: {
        user_count: number;
        asset_count: number;
        work_order_count: number;
    };
    limits: {
        users: number;
        assets: number;
        work_orders: number;
        storage: string;
    };
}

function UsageLimitsCard({ stats, limits }: UsageLimitsProps) {
    const items = [
        {
            label: 'Users',
            current: stats.user_count,
            limit: limits.users,
        },
        {
            label: 'Assets',
            current: stats.asset_count,
            limit: limits.assets,
        },
        {
            label: 'Work Orders',
            current: stats.work_order_count,
            limit: limits.work_orders,
        },
    ];
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Usage & Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {items.map(item => (
                    <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                            <span>{item.label}</span>
                            <span className="font-medium">
                                {item.current} / {item.limit}
                            </span>
                        </div>
                        <Progress 
                            value={(item.current / item.limit) * 100}
                            className={getProgressColor((item.current / item.limit) * 100)}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function getProgressColor(percentage: number): string {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
}
```

#### 3. Middleware for Limit Enforcement (Tenant App)

**File**: `app/Http/Middleware/CheckTenantLimits.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\Tenant\LimitCheckerService;

class CheckTenantLimits
{
    public function __construct(
        private LimitCheckerService $limitChecker
    ) {}
    
    public function handle(Request $request, Closure $next, string $resource)
    {
        // Only check on POST/PUT requests
        if (!in_array($request->method(), ['POST', 'PUT'])) {
            return $next($request);
        }
        
        $canCreate = match($resource) {
            'user' => $this->limitChecker->canCreateUser(),
            'asset' => $this->limitChecker->canCreateAsset(),
            'work_order' => $this->limitChecker->canCreateWorkOrder(),
            default => true,
        };
        
        if (!$canCreate) {
            return back()->with('error', 'You have reached your plan limit for ' . $resource . 's. Please upgrade your plan.');
        }
        
        return $next($request);
    }
}
```

Usage in routes:
```php
Route::post('/users', [UserController::class, 'store'])
    ->middleware('check.limits:user');
```

---

## Database Operations

### Available Operations

All database operations leverage Laravel Tenancy's built-in artisan commands.

#### 1. Run Migrations

**Controller Method**: `AdminDatabaseController@migrate`

**Action**: Runs pending migrations on tenant database

```bash
php artisan tenants:migrate --tenants={tenant-id}
```

#### 2. Seed Database

**Controller Method**: `AdminDatabaseController@seed`

**Action**: Seeds tenant database with default data

```bash
php artisan tenants:seed --tenants={tenant-id}
```

#### 3. Refresh Database

**Controller Method**: `AdminDatabaseController@refresh`

**Action**: Drops all tables, re-runs migrations, and seeds

⚠️ **DESTRUCTIVE** - Requires confirmation

```bash
php artisan tenants:migrate-fresh --seed --tenants={tenant-id}
```

#### 4. Clear Cache

**Controller Method**: `AdminDatabaseController@clearCache`

**Action**: Clears all caches for tenant

```bash
php artisan tenants:run cache:clear --tenants={tenant-id}
```

#### 5. Optimize

**Controller Method**: `AdminDatabaseController@optimize`

**Action**: Optimizes tenant application

```bash
php artisan tenants:run optimize --tenants={tenant-id}
```

#### 6. Maintenance Mode

**Controller Method**: `AdminDatabaseController@maintenanceMode`

**Action**: Enables/disables maintenance mode

```bash
php artisan tenants:run down --tenants={tenant-id}
php artisan tenants:run up --tenants={tenant-id}
```

### Frontend UI Needed

**Location**: Tenant show page or separate operations modal

**Component**: Database Operations Dropdown

```tsx
<DropdownMenu>
    <DropdownMenuTrigger asChild>
        <Button variant="outline">
            <Database className="mr-2 h-4 w-4" />
            Database Operations
        </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
        <DropdownMenuItem onClick={() => runOperation('migrate')}>
            Run Migrations
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runOperation('seed')}>
            Seed Database
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runOperation('clear-cache')}>
            Clear Cache
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runOperation('optimize')}>
            Optimize
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
            onClick={() => runOperation('refresh')}
            className="text-red-600"
        >
            Refresh Database (Destructive)
        </DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>
```

With confirmation dialog for destructive operations.

---

## System Health & Monitoring

### Health Dashboard

**Location**: `/admin/health`

**Purpose**: System-wide health overview

**Backend**: `SystemHealthController@index`

**Features**:
1. **Overall System Stats**
   - Total database size (all tenants)
   - Total connections across all databases
   - Average response time
   - Uptime

2. **Per-Tenant Health**
   - List of all active tenants
   - Database size
   - Connection count
   - Last activity
   - Health status (healthy/warning/critical)

3. **Alerts**
   - Tenants near storage limits
   - Tenants with high connection counts
   - Suspended tenants
   - Failed jobs

**Data Structure**:
```typescript
interface SystemHealthProps {
    health: {
        tenants: {
            total: number;
            active: number;
            suspended: number;
            trial: number;
        };
        databases: Array<{
            tenant: string;
            subdomain: string;
            status: 'healthy' | 'warning' | 'critical';
            size: string;
            connections: number;
            last_activity: string;
        }>;
        system: {
            total_size: string;
            total_connections: number;
            uptime: string;
        };
    };
}
```

### Tenant-Specific Health

**Location**: `/admin/accounts/{id}/health` or tab in show page

**Backend**: `SystemHealthController@show`

**Features**:
- Detailed database statistics
- Top 10 largest tables
- Top 10 largest indexes
- Current connections list
- Query performance (if available)
- Storage breakdown

---

## Activity Logging

### Purpose

Track all admin actions for audit and compliance.

### Implementation

Using Spatie's `laravel-activitylog` package (or custom solution):

```bash
composer require spatie/laravel-activitylog
```

### What to Log

1. **Tenant Operations**
   - Created tenant
   - Updated tenant
   - Suspended/activated tenant
   - Deleted tenant
   - Changed plan

2. **Database Operations**
   - Ran migrations
   - Seeded database
   - Refreshed database
   - Cleared cache

3. **Admin Actions**
   - Admin logged in
   - Admin logged out
   - Bulk operations executed

### Activity Model

```php
// app/Models/Central/Activity.php

class Activity extends Model
{
    protected $connection = 'central';
    
    protected $fillable = [
        'admin_user_id',
        'account_id',
        'type',
        'description',
        'properties',
        'ip_address',
    ];
    
    protected $casts = [
        'properties' => 'array',
    ];
}
```

### Usage

```php
// In controller
activity()
    ->on($tenant)
    ->by(auth()->user())
    ->withProperties([
        'old_plan' => $oldPlan->name,
        'new_plan' => $newPlan->name,
    ])
    ->log('Changed subscription plan');
```

### Activity Feed UI

Display on:
1. Dashboard (recent 10)
2. Tenant show page (tenant-specific)
3. Dedicated activity page (`/admin/activity`)

---

## Frontend Components

### Shared Components Needed

#### 1. Admin Layout

**File**: `resources/js/layouts/admin-layout.tsx`

```tsx
interface AdminLayoutProps {
    children: React.ReactNode;
    auth: {
        user: {
            name: string;
            email: string;
        };
    };
}

export default function AdminLayout({ children, auth }: AdminLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Navigation */}
            <nav className="border-b bg-white dark:bg-gray-800">
                {/* Logo, nav items, user menu */}
            </nav>
            
            {/* Sidebar (optional) */}
            <div className="flex">
                <aside className="w-64 border-r">
                    {/* Navigation links */}
                </aside>
                
                {/* Main content */}
                <main className="flex-1 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
```

#### 2. Stats Card

```tsx
interface StatsCardProps {
    title: string;
    value: number | string;
    icon?: React.ComponentType<{ className?: string }>;
    trend?: {
        value: number;
        direction: 'up' | 'down';
    };
    color?: 'default' | 'green' | 'red' | 'blue';
}
```

#### 3. Tenant Status Badge

```tsx
interface StatusBadgeProps {
    status: 'active' | 'suspended' | 'maintenance';
}

// Maps to colors: active=green, suspended=red, maintenance=yellow
```

#### 4. Confirmation Dialog

```tsx
interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void;
}
```

#### 5. Loading States

Use skeleton components from shadcn/ui for all loading states:
- Dashboard stats loading
- Table loading
- Card content loading

---

## Implementation Phases

### Phase 1: Dashboard Enhancement ✅ (1-2 days)

**Tasks**:
1. ✅ Update `dashboard.tsx` to use passed props
2. ✅ Add stats cards with proper styling
3. ✅ Implement recent activity section
4. ✅ Implement tenant health section
5. ✅ Add auto-refresh functionality
6. ✅ Add manual refresh button
7. ✅ Responsive design

**Files**:
- `resources/js/pages/admin/dashboard.tsx`

### Phase 2: Tenant List & Filtering (2-3 days)

**Tasks**:
1. Create `accounts/index.tsx`
2. Build paginated table
3. Implement search with debounce
4. Add status filters
5. Create status badges
6. Add action buttons
7. Implement bulk selection

**Files**:
- `resources/js/pages/admin/accounts/index.tsx`
- `resources/js/components/admin/tenant-table.tsx` (optional)

### Phase 3: Tenant CRUD Operations (3-4 days)

**Tasks**:
1. Create `accounts/create.tsx`
   - Form with validation
   - Subdomain availability check
   - Plan selection
2. Create `accounts/show.tsx`
   - Tenant info display
   - Database stats
   - Subscription details
   - Usage vs limits
3. Create `accounts/edit.tsx`
   - Edit form
   - Status management
4. Add delete confirmation

**Files**:
- `resources/js/pages/admin/accounts/create.tsx`
- `resources/js/pages/admin/accounts/show.tsx`
- `resources/js/pages/admin/accounts/edit.tsx`

### Phase 4: Database Operations UI (1-2 days)

**Tasks**:
1. Add database operations dropdown to tenant show page
2. Implement confirmation dialogs
3. Add operation feedback (success/error messages)
4. Add loading states during operations

**Files**:
- Update `resources/js/pages/admin/accounts/show.tsx`
- `resources/js/components/admin/database-operations.tsx`

### Phase 5: Plan & Subscription Management (3-4 days)

**Tasks**:
1. Create plan list page
2. Create plan create/edit forms
3. Add plan switching interface to tenant page
4. Implement plan comparison view
5. Add subscription history

**Files**:
- `resources/js/pages/admin/plans/index.tsx`
- `resources/js/pages/admin/plans/create.tsx`
- `resources/js/pages/admin/plans/edit.tsx`
- `app/Http/Controllers/Admin/PlanController.php`
- `app/Http/Controllers/Admin/SubscriptionController.php`

### Phase 6: Limits & Enforcement (2-3 days)

**Tasks**:
1. Create `LimitCheckerService` for tenant app
2. Add middleware for limit checking
3. Display usage vs limits in admin
4. Add alerts for tenants near limits
5. Test limit enforcement

**Files**:
- `app/Services/Tenant/LimitCheckerService.php`
- `app/Http/Middleware/CheckTenantLimits.php`
- Update tenant show page

### Phase 7: System Health & Monitoring (2-3 days)

**Tasks**:
1. Create health dashboard page
2. Implement health status indicators
3. Add per-tenant health view
4. Create alerts for issues

**Files**:
- `resources/js/pages/admin/health/index.tsx`
- `resources/js/pages/admin/health/show.tsx`
- Update `SystemHealthController`

### Phase 8: Activity Logging (1-2 days)

**Tasks**:
1. Set up activity logging package
2. Add logging to all admin actions
3. Create activity feed components
4. Add activity filtering/search

**Files**:
- `app/Models/Central/Activity.php`
- `resources/js/components/admin/activity-feed.tsx`
- Update all admin controllers

### Phase 9: Shared Components & Polish (2-3 days)

**Tasks**:
1. Create AdminLayout component
2. Extract reusable components
3. Add loading states everywhere
4. Implement error boundaries
5. Add animations/transitions
6. Test responsive design
7. Accessibility audit

**Files**:
- `resources/js/layouts/admin-layout.tsx`
- `resources/js/components/admin/*`

### Phase 10: Testing & Documentation (2-3 days)

**Tasks**:
1. Write feature tests for all admin operations
2. Test limit enforcement
3. Test bulk operations
4. Load testing
5. Update this documentation
6. Create user guide

---

## Security Considerations

### Authentication

- Admin users are stored separately in `admin_users` table
- Use `auth:admin` guard for all admin routes
- Separate sessions from tenant users
- Password requirements enforced

### Authorization

- All admin routes require authentication
- Consider role-based access (super admin vs regular admin)
- Log all sensitive operations
- Require confirmation for destructive actions

### Data Protection

- Never expose tenant database credentials in frontend
- Sanitize all user inputs
- Rate limit admin actions
- Implement CSRF protection

### Audit Trail

- Log all admin actions with IP address
- Track who created/modified/deleted tenants
- Record plan changes
- Monitor bulk operations

---

## Testing Strategy

### Unit Tests

- Plan limit calculations
- Subscription status checks
- Usage percentage calculations

### Feature Tests

```php
// tests/Feature/Admin/TenantManagementTest.php

public function test_admin_can_create_tenant()
{
    $admin = AdminUser::factory()->create();
    
    $this->actingAs($admin, 'admin')
        ->post(route('admin.accounts.store'), [
            'name' => 'Test Company',
            'subdomain' => 'testcompany',
            'plan_id' => Plan::first()->id,
            'admin_email' => 'admin@test.com',
            'admin_name' => 'Admin User',
        ])
        ->assertRedirect();
        
    $this->assertDatabaseHas('accounts', [
        'subdomain' => 'testcompany',
    ], 'central');
}

public function test_admin_can_switch_tenant_plan()
{
    // Test plan switching
}

public function test_limit_enforcement_blocks_creation()
{
    // Test that users can't exceed limits
}
```

### Browser Tests

Use Laravel Dusk for end-to-end testing:

```php
public function test_admin_dashboard_displays_stats()
{
    $this->browse(function (Browser $browser) {
        $browser->loginAs(AdminUser::first(), 'admin')
                ->visit('/admin')
                ->assertSee('Total Tenants')
                ->assertSee('Active')
                ->assertSee('Recent Activity');
    });
}
```

---

## Performance Optimization

### Caching Strategy

1. **Dashboard Stats**: Cache for 5 minutes
   ```php
   Cache::remember('admin_tenants_statistics', 300, fn() => ...);
   ```

2. **Tenant Health**: Cache for 2 minutes
   ```php
   Cache::remember("admin_tenants_health_overview_{$limit}", 120, fn() => ...);
   ```

3. **Individual Tenant Stats**: Cache for 1 minute
   ```php
   $tenant->getDatabaseStats(); // Uses internal caching
   ```

### Query Optimization

- Eager load relationships: `with(['domains', 'subscription.plan'])`
- Select only needed columns: `select(['id', 'name', 'subdomain'])`
- Paginate large result sets: `paginate(20)`
- Index frequently queried columns

### Database Considerations

- Keep central database queries fast
- Use connection pooling (handled by Laravel Cloud)
- Monitor slow queries
- Consider read replicas for reporting (future)

---

## Deployment Checklist

### Environment Configuration

```env
# Admin Settings
ADMIN_EMAIL=admin@yourapp.com
ADMIN_PASSWORD=secure-password

# Domain Settings
APP_DOMAIN=yourapp.com
CENTRAL_DOMAINS=yourapp.com

# Session/Cache
SESSION_DRIVER=redis
CACHE_DRIVER=redis
```

### Pre-Deployment

- [ ] Run migrations on central database
- [ ] Seed plans table
- [ ] Create initial admin user
- [ ] Test admin authentication
- [ ] Test tenant creation
- [ ] Verify DNS configuration for admin.yourapp.com
- [ ] Configure SSL for admin subdomain
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy

### Post-Deployment

- [ ] Verify admin portal is accessible
- [ ] Test creating a tenant
- [ ] Test database operations
- [ ] Verify plan switching works
- [ ] Check activity logging
- [ ] Monitor performance
- [ ] Review error logs

---

## Future Enhancements

### v2.0 Features

1. **Analytics Dashboard**
   - Revenue metrics
   - Growth charts
   - Churn analysis
   - Usage trends

2. **Automated Billing**
   - Stripe integration for automatic payments
   - Invoice generation
   - Payment failure handling
   - Automatic suspension for non-payment

3. **Advanced Monitoring**
   - Real-time performance metrics
   - Custom alerts
   - Query performance analysis
   - Resource usage predictions

4. **Bulk Operations Enhancements**
   - Background job processing with progress
   - Scheduled bulk operations
   - Bulk plan migrations
   - Bulk data exports

5. **Multi-Admin Support**
   - Role-based permissions (view-only, operator, super-admin)
   - Team management
   - Action approval workflows
   - Audit trail enhancements

6. **Tenant Self-Service**
   - Allow tenants to upgrade/downgrade their own plans
   - Usage dashboard for tenants
   - Billing portal for tenants
   - Self-service database backups

---

## Conclusion

This specification provides a comprehensive roadmap for implementing a fully-featured admin portal for the multi-tenant Maintenance OS application. By following this guide, you'll create a powerful, maintainable, and scalable admin interface that leverages Laravel Tenancy's built-in features while focusing on business-specific functionality.

The implementation is broken down into manageable phases, each building on the previous one, allowing for incremental development and testing. Start with Phase 1 (Dashboard Enhancement) to get immediate visible results, then proceed through the phases based on business priorities.

Remember to:
- Follow the project's coding standards
- Use TypeScript for all frontend code
- Leverage existing UI components
- Write tests for all new features
- Document as you build
- Get user feedback early and often


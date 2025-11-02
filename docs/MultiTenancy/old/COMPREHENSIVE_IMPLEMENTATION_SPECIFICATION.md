# Multi-Tenant Implementation Specification for Maintenance OS

## Executive Summary

This document outlines the comprehensive plan to convert the Maintenance OS from a single-tenant application to a multi-tenant SaaS platform using Laravel Tenancy (stancl/tenancy) v3. The implementation will use a multi-database approach with `Account` as the primary tenant model, ensuring complete data isolation between tenants.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technical Stack](#technical-stack)
3. [Database Architecture](#database-architecture)
4. [Account Model Design](#account-model-design)
5. [Authentication & Authorization](#authentication--authorization)
6. [Subscription & Billing System](#subscription--billing-system)
7. [File Storage Strategy](#file-storage-strategy)
8. [Queue Processing](#queue-processing)
9. [Implementation Phases](#implementation-phases)
10. [Deployment Strategy](#deployment-strategy)
11. [Testing Strategy](#testing-strategy)
12. [Security Considerations](#security-considerations)

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Load Balancer (Laravel Cloud)                  │
└─────────────────────┬───────────────────────┬───────────────────┘
                      │                       │
        ┌─────────────▼──────────┐ ┌─────────▼────────────┐
        │   Tenant Applications  │ │   Admin Portal       │
        │  (*.maintenance-os.com)│ │(admin.maintenance-os)│
        └─────────────┬──────────┘ └─────────┬────────────┘
                      │                       │
┌─────────────────────▼───────────────────────▼───────────────────┐
│                     Laravel Application Layer                    │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │  Tenancy    │ │  Controllers │ │     Services         │    │
│  │  Middleware │ │   & Routes   │ │  & Business Logic    │    │
│  └─────────────┘ └──────────────┘ └──────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                         Data Layer                               │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ Central DB  │ │  Tenant DBs  │ │   Redis Cache        │    │
│  │ (PostgreSQL)│ │ (PostgreSQL) │ │   (Per-tenant keys)  │    │
│  └─────────────┘ └──────────────┘ └──────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Domain Strategy

- **Tenant Access**: Subdomain-based (e.g., `acme.maintenance-os.com`)
- **Admin Portal**: `admin.maintenance-os.com`
- **Marketing/Landing**: `www.maintenance-os.com`
- **Staging Pattern**: `{tenant}.staging.maintenance-os.com`

## Technical Stack

### Core Dependencies

```json
{
  "require": {
    "php": "^8.4",
    "laravel/framework": "^12.0",
    "stancl/tenancy": "^3.8",
    "laravel/cashier": "^15.0",
    "stripe/stripe-php": "^13.0",
    "spatie/laravel-permission": "^6.0",
    "spatie/laravel-medialibrary": "^11.0",
    "inertiajs/inertia-laravel": "^2.0"
  }
}
```

## Database Architecture

### Central Database Schema

```sql
-- accounts table (tenants)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    database VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, suspended, terminated
    trial_ends_at TIMESTAMP,
    suspension_reason TEXT,
    suspended_at TIMESTAMP,
    termination_scheduled_at TIMESTAMP,
    terminated_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id),
    status VARCHAR(50) NOT NULL, -- active, past_due, canceled, trialing
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    canceled_at TIMESTAMP,
    grace_period_ends_at TIMESTAMP,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- plans table
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    interval VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    features JSONB NOT NULL,
    limits JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- plan_limits table (for flexible configuration)
CREATE TABLE plan_limits (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- users, assets, work_cells, etc
    limit_value INTEGER NOT NULL, -- -1 for unlimited
    metadata JSONB DEFAULT '{}',
    UNIQUE(plan_id, resource_type)
);

-- plan_features table
CREATE TABLE plan_features (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL, -- production_module, api_access, etc
    enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    UNIQUE(plan_id, feature_key)
);

-- account_users table (for tracking users across accounts)
CREATE TABLE account_users (
    id SERIAL PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(account_id, email)
);

-- system_admins table
CREATE TABLE system_admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '{}',
    two_factor_secret VARCHAR(255),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- account_activities table (audit log)
CREATE TABLE account_activities (
    id SERIAL PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES system_admins(id),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_accounts_subdomain ON accounts(subdomain);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_subscriptions_account ON subscriptions(account_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_account_activities_account ON account_activities(account_id);
CREATE INDEX idx_account_activities_created ON account_activities(created_at);
```

### Tenant Database Naming

- Pattern: `tenant_{account_id}_{subdomain}`
- Example: `tenant_550e8400e29b41d4_acme`

## Account Model Design

### Account Model (Tenant)

```php
<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Account extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;

    protected $table = 'accounts';
    
    protected $fillable = [
        'name',
        'subdomain',
        'status',
        'trial_ends_at',
        'suspension_reason',
        'suspended_at',
        'termination_scheduled_at',
        'terminated_at',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'trial_ends_at' => 'datetime',
        'suspended_at' => 'datetime',
        'termination_scheduled_at' => 'datetime',
        'terminated_at' => 'datetime',
    ];

    public static function getCustomColumns(): array
    {
        return [
            'id',
            'name',
            'subdomain',
            'status',
            'trial_ends_at',
            'suspension_reason',
            'suspended_at',
            'termination_scheduled_at',
            'terminated_at',
            'metadata',
        ];
    }

    public function getDatabaseName(): string
    {
        return 'tenant_' . $this->id . '_' . $this->subdomain;
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class);
    }

    public function users()
    {
        return $this->hasMany(AccountUser::class);
    }

    public function activities()
    {
        return $this->hasMany(AccountActivity::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    public function isOnTrial(): bool
    {
        return $this->trial_ends_at && $this->trial_ends_at->isFuture();
    }

    public function suspend(string $reason): void
    {
        $this->update([
            'status' => 'suspended',
            'suspension_reason' => $reason,
            'suspended_at' => now(),
        ]);
    }

    public function activate(): void
    {
        $this->update([
            'status' => 'active',
            'suspension_reason' => null,
            'suspended_at' => null,
        ]);
    }
}
```

### Tenancy Configuration

```php
// config/tenancy.php
return [
    'tenant_model' => \App\Models\Account::class,
    
    'central_domains' => [
        'maintenance-os.com',
        'www.maintenance-os.com',
        'admin.maintenance-os.com',
    ],

    'tenant_identification' => [
        'domain' => \Stancl\Tenancy\Resolvers\DomainTenantResolver::class,
    ],

    'database' => [
        'prefix' => 'tenant_',
        'suffix' => '',
        'managers' => [
            'pgsql' => [
                'driver' => 'pgsql',
                'host' => env('DB_HOST'),
                'port' => env('DB_PORT'),
                'database' => null,
                'username' => env('DB_USERNAME'),
                'password' => env('DB_PASSWORD'),
            ],
        ],
    ],

    'cache' => [
        'tag_base' => 'tenant',
    ],

    'filesystem' => [
        'suffix_base' => 'tenant',
        'disks' => [
            's3',
        ],
    ],

    'redis' => [
        'prefixed_connections' => [
            'default',
            'cache',
        ],
    ],

    'features' => [
        'universal_routes' => true,
        'database_creation' => true,
        'database_seeding' => true,
        'database_deletion' => true,
    ],

    'bootstrappers' => [
        \Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper::class,
        \Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper::class,
        \Stancl\Tenancy\Bootstrappers\FilesystemTenancyBootstrapper::class,
        \Stancl\Tenancy\Bootstrappers\QueueTenancyBootstrapper::class,
        \App\Tenancy\Bootstrappers\RedisTenancyBootstrapper::class,
        \App\Tenancy\Bootstrappers\MediaLibraryBootstrapper::class,
    ],

    'seeder_parameters' => [
        '--class' => 'TenantDatabaseSeeder',
        '--force' => true,
    ],
];
```

## Authentication & Authorization

### Modified User Model

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'timezone',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($user) {
            // Ensure first user is administrator (existing logic)
            if (static::count() === 0) {
                $user->assignRole('Administrator');
            }
        });
    }

    // Existing methods remain the same
}
```

### Authentication Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureTenantIsActive
{
    public function handle(Request $request, Closure $next)
    {
        $tenant = tenant();
        
        if (!$tenant || !$tenant->isActive()) {
            if ($tenant && $tenant->isSuspended()) {
                return redirect()->route('tenant.suspended');
            }
            
            abort(404);
        }

        return $next($request);
    }
}
```

### Read-Only Mode for Suspended Accounts

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnforceReadOnlyMode
{
    public function handle(Request $request, Closure $next)
    {
        $tenant = tenant();
        
        if ($tenant && $tenant->isSuspended()) {
            // Allow only GET requests
            if (!in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'])) {
                return redirect()->back()->with('error', 'Account is in read-only mode due to suspension.');
            }
        }

        return $next($request);
    }
}
```

## Subscription & Billing System

### Plan Configuration

```php
<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $connection = 'central';
    
    protected $fillable = [
        'name',
        'slug',
        'price',
        'currency',
        'interval',
        'features',
        'limits',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'features' => 'array',
        'limits' => 'array',
        'is_active' => 'boolean',
    ];

    public function planLimits()
    {
        return $this->hasMany(PlanLimit::class);
    }

    public function planFeatures()
    {
        return $this->hasMany(PlanFeature::class);
    }

    public function getLimit(string $resource): int
    {
        $limit = $this->planLimits()->where('resource_type', $resource)->first();
        
        return $limit ? $limit->limit_value : 0;
    }

    public function hasFeature(string $feature): bool
    {
        $feature = $this->planFeatures()->where('feature_key', $feature)->first();
        
        return $feature ? $feature->enabled : false;
    }
}
```

### Default Plans Seeder

```php
<?php

namespace Database\Seeders\Central;

use Illuminate\Database\Seeder;
use App\Models\Central\Plan;
use App\Models\Central\PlanLimit;
use App\Models\Central\PlanFeature;

class PlansSeeder extends Seeder
{
    public function run()
    {
        // Starter Plan
        $starter = Plan::create([
            'name' => 'Starter',
            'slug' => 'starter',
            'price' => 49.00,
            'currency' => 'USD',
            'interval' => 'monthly',
            'sort_order' => 1,
        ]);

        // Starter Limits
        $starterLimits = [
            'users' => 5,
            'assets' => 100,
            'work_orders' => 500,
            'work_cells' => 10,
            'teams' => 3,
            'storage_gb' => 10,
        ];

        foreach ($starterLimits as $resource => $limit) {
            PlanLimit::create([
                'plan_id' => $starter->id,
                'resource_type' => $resource,
                'limit_value' => $limit,
            ]);
        }

        // Starter Features
        $starterFeatures = [
            'work_orders_module' => true,
            'preventive_maintenance' => true,
            'asset_management' => true,
            'production_module' => false,
            'api_access' => false,
            'custom_forms' => false,
        ];

        foreach ($starterFeatures as $feature => $enabled) {
            PlanFeature::create([
                'plan_id' => $starter->id,
                'feature_key' => $feature,
                'enabled' => $enabled,
            ]);
        }

        // Professional Plan
        $professional = Plan::create([
            'name' => 'Professional',
            'slug' => 'professional',
            'price' => 149.00,
            'currency' => 'USD',
            'interval' => 'monthly',
            'sort_order' => 2,
        ]);

        // Professional Limits
        $professionalLimits = [
            'users' => 25,
            'assets' => 1000,
            'work_orders' => 5000,
            'work_cells' => 50,
            'teams' => 10,
            'storage_gb' => 100,
        ];

        foreach ($professionalLimits as $resource => $limit) {
            PlanLimit::create([
                'plan_id' => $professional->id,
                'resource_type' => $resource,
                'limit_value' => $limit,
            ]);
        }

        // Professional Features (all enabled)
        $allFeatures = [
            'work_orders_module',
            'preventive_maintenance',
            'asset_management',
            'production_module',
            'api_access',
            'custom_forms',
        ];

        foreach ($allFeatures as $feature) {
            PlanFeature::create([
                'plan_id' => $professional->id,
                'feature_key' => $feature,
                'enabled' => true,
            ]);
        }

        // Enterprise Plan
        $enterprise = Plan::create([
            'name' => 'Enterprise',
            'slug' => 'enterprise',
            'price' => 499.00,
            'currency' => 'USD',
            'interval' => 'monthly',
            'sort_order' => 3,
        ]);

        // Enterprise - Custom limits configured per account
        $enterpriseLimits = [
            'users' => -1, // -1 means custom/negotiated
            'assets' => -1,
            'work_orders' => -1,
            'work_cells' => -1,
            'teams' => -1,
            'storage_gb' => -1,
        ];

        foreach ($enterpriseLimits as $resource => $limit) {
            PlanLimit::create([
                'plan_id' => $enterprise->id,
                'resource_type' => $resource,
                'limit_value' => $limit,
            ]);
        }

        // Enterprise Features
        foreach ($allFeatures as $feature) {
            PlanFeature::create([
                'plan_id' => $enterprise->id,
                'feature_key' => $feature,
                'enabled' => true,
            ]);
        }

        // Add enterprise-only features
        PlanFeature::create([
            'plan_id' => $enterprise->id,
            'feature_key' => 'priority_support',
            'enabled' => true,
        ]);
    }
}
```

### Subscription Service

```php
<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Central\Plan;
use App\Models\Central\Subscription;
use Stripe\Stripe;
use Stripe\Customer;
use Stripe\Subscription as StripeSubscription;

class SubscriptionService
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    public function createTrialSubscription(Account $account, Plan $plan): Subscription
    {
        return Subscription::create([
            'account_id' => $account->id,
            'plan_id' => $plan->id,
            'status' => 'trialing',
            'current_period_start' => now(),
            'current_period_end' => now()->addDays(30),
        ]);
    }

    public function convertTrialToPaid(Account $account, string $paymentMethodId): Subscription
    {
        $subscription = $account->subscription;
        $plan = $subscription->plan;

        // Create Stripe customer
        $customer = Customer::create([
            'email' => $account->users()->first()->email,
            'name' => $account->name,
            'metadata' => [
                'account_id' => $account->id,
            ],
        ]);

        // Attach payment method
        $customer->sources->create(['source' => $paymentMethodId]);

        // Create Stripe subscription
        $stripeSubscription = StripeSubscription::create([
            'customer' => $customer->id,
            'items' => [
                ['price' => $plan->stripe_price_id],
            ],
            'metadata' => [
                'account_id' => $account->id,
            ],
        ]);

        // Update local subscription
        $subscription->update([
            'status' => 'active',
            'stripe_customer_id' => $customer->id,
            'stripe_subscription_id' => $stripeSubscription->id,
            'current_period_end' => now()->addMonth(),
        ]);

        return $subscription;
    }

    public function cancelSubscription(Account $account, bool $immediately = false): void
    {
        $subscription = $account->subscription;

        if ($subscription->stripe_subscription_id) {
            $stripeSubscription = StripeSubscription::retrieve($subscription->stripe_subscription_id);
            
            if ($immediately) {
                $stripeSubscription->cancel();
            } else {
                $stripeSubscription->cancel_at_period_end = true;
                $stripeSubscription->save();
            }
        }

        $subscription->update([
            'status' => 'canceled',
            'canceled_at' => now(),
            'grace_period_ends_at' => $immediately ? now() : $subscription->current_period_end,
        ]);
    }
}
```

### Resource Limit Enforcement

```php
<?php

namespace App\Services;

use App\Models\Account;

class LimitEnforcementService
{
    public function canAddResource(Account $account, string $resourceType): bool
    {
        $plan = $account->subscription->plan;
        $limit = $plan->getLimit($resourceType);
        
        // -1 means custom limit, check account metadata
        if ($limit === -1) {
            $limit = $account->metadata['custom_limits'][$resourceType] ?? PHP_INT_MAX;
        }
        
        $currentCount = $this->getCurrentResourceCount($account, $resourceType);
        
        return $currentCount < $limit;
    }

    private function getCurrentResourceCount(Account $account, string $resourceType): int
    {
        return match($resourceType) {
            'users' => \App\Models\User::count(),
            'assets' => \App\Models\AssetHierarchy\Asset::count(),
            'work_orders' => \App\Models\WorkOrders\WorkOrder::count(),
            'work_cells' => \App\Models\Production\WorkCell::count(),
            'teams' => \App\Models\Team::count(),
            default => 0,
        };
    }

    public function enforceStorageQuota(Account $account): bool
    {
        $plan = $account->subscription->plan;
        $limitGB = $plan->getLimit('storage_gb');
        
        if ($limitGB === -1) {
            $limitGB = $account->metadata['custom_limits']['storage_gb'] ?? PHP_INT_MAX;
        }
        
        $currentUsageBytes = $this->calculateStorageUsage($account);
        $currentUsageGB = $currentUsageBytes / (1024 * 1024 * 1024);
        
        return $currentUsageGB < $limitGB;
    }

    private function calculateStorageUsage(Account $account): int
    {
        // Calculate from S3 with tenant prefix
        $prefix = "tenants/{$account->id}/";
        
        // This would integrate with S3 SDK to calculate usage
        // For now, returning placeholder
        return 0;
    }
}
```

## File Storage Strategy

### Storage Configuration

```php
// config/filesystems.php
'disks' => [
    // ... existing disks ...
    
    's3-tenant' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION'),
        'bucket' => env('AWS_BUCKET'),
        'url' => env('AWS_URL'),
        'endpoint' => env('AWS_ENDPOINT'),
        'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
        'visibility' => 'private',
        'prefix' => 'tenants/' . (tenant() ? tenant()->id : 'system'),
    ],
],
```

### Media Library Bootstrapper

```php
<?php

namespace App\Tenancy\Bootstrappers;

use Stancl\Tenancy\Contracts\TenancyBootstrapper;
use Stancl\Tenancy\Contracts\Tenant;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MediaLibraryBootstrapper implements TenancyBootstrapper
{
    public function bootstrap(Tenant $tenant)
    {
        // Configure media library to use tenant-specific storage
        config([
            'media-library.disk_name' => 's3-tenant',
            'media-library.prefix' => "tenants/{$tenant->id}/media",
        ]);
    }

    public function revert()
    {
        // Reset to default configuration
        config([
            'media-library.disk_name' => config('media-library.disk_name'),
            'media-library.prefix' => config('media-library.prefix'),
        ]);
    }
}
```

### Secure File Access Controller

```php
<?php

namespace App\Http\Controllers;

use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SecureMediaController extends Controller
{
    public function show(Request $request, string $uuid): StreamedResponse
    {
        $media = Media::where('uuid', $uuid)->firstOrFail();
        
        // Verify user has access to this media
        $this->authorize('view', $media);
        
        $disk = Storage::disk('s3-tenant');
        $path = "tenants/" . tenant()->id . "/media/" . $media->id . "/" . $media->file_name;
        
        if (!$disk->exists($path)) {
            abort(404);
        }
        
        return response()->stream(function () use ($disk, $path) {
            echo $disk->get($path);
        }, 200, [
            'Content-Type' => $media->mime_type,
            'Content-Disposition' => 'inline; filename="' . $media->file_name . '"',
        ]);
    }
}
```

## Queue Processing

Based on [Laravel Cloud queue documentation](https://cloud.laravel.com/docs/queues), we'll use a shared queue worker with tenant context.

### Tenant-Aware Job Base Class

```php
<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Account;

abstract class TenantAwareJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $tenantId;

    public function __construct(string $tenantId)
    {
        $this->tenantId = $tenantId;
    }

    public function handle(): void
    {
        $tenant = Account::find($this->tenantId);
        
        if (!$tenant) {
            $this->fail(new \Exception("Tenant not found: {$this->tenantId}"));
            return;
        }

        // Check if account is terminated
        if ($tenant->status === 'terminated') {
            $this->delete();
            return;
        }

        // Initialize tenancy
        tenancy()->initialize($tenant);

        try {
            // Execute even for suspended accounts (per requirements)
            $this->handleTenantJob();
        } finally {
            tenancy()->end();
        }
    }

    abstract protected function handleTenantJob(): void;
}
```

### Example Tenant Job

```php
<?php

namespace App\Jobs;

use App\Models\WorkOrders\WorkOrder;

class ProcessWorkOrderJob extends TenantAwareJob
{
    private int $workOrderId;

    public function __construct(string $tenantId, int $workOrderId)
    {
        parent::__construct($tenantId);
        $this->workOrderId = $workOrderId;
    }

    protected function handleTenantJob(): void
    {
        $workOrder = WorkOrder::find($this->workOrderId);
        
        if (!$workOrder) {
            return;
        }

        // Process work order
        // This will run in the tenant's database context
    }
}
```

### Queue Configuration for Laravel Cloud

```php
// config/queue.php
'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 90,
        'block_for' => null,
        'after_commit' => false,
    ],
],

// For Laravel Cloud, configure a single queue worker in the dashboard:
// Command: php artisan queue:work
// Number of processes: 10 (adjust based on load)
```

## Implementation Phases

### Phase 1: Core Multi-Tenancy (Weeks 1-3)

1. **Week 1: Setup & Infrastructure**
   - Install and configure Laravel Tenancy package
   - Set up central database schema
   - Create Account model and migrations
   - Configure subdomain routing
   - Implement tenant identification middleware

2. **Week 2: Database Setup & Seeding**
   - Create tenant database creation scripts
   - Implement TenantDatabaseSeeder
   - Set up initial data (units of measure, roles, etc.)
   - Test database creation/deletion

3. **Week 3: Authentication & Authorization**
   - Modify authentication to be tenant-aware
   - Implement read-only mode for suspended accounts
   - Update existing authorization logic
   - Ensure administrator protection per tenant

### Phase 2: Subscription & Billing (Weeks 4-5)

4. **Week 4: Plan Management**
   - Create plan and limit management system
   - Implement subscription service
   - Set up Stripe integration
   - Create billing portal

5. **Week 5: Resource Limits**
   - Implement resource counting
   - Add limit enforcement middleware
   - Create upgrade/downgrade flows
   - Add storage quota tracking

### Phase 3: File Storage & Admin Portal (Weeks 6-7)

6. **Week 6: File Storage**
   - Configure S3 with tenant prefixes
   - Update Media Library integration
   - Implement secure file access
   - Add storage quota enforcement

7. **Week 7: Admin Portal**
   - Create admin.maintenance-os.com subdomain
   - Build account management interface
   - Implement subscription management
   - Add account activity logging

### Phase 4: Account Lifecycle (Week 8)

8. **Week 8: Onboarding & Termination**
   - Create self-service signup flow
   - Implement email verification
   - Add trial expiration handling
   - Build account termination process
   - Set up automated cleanup jobs

### Phase 5: Testing & Deployment (Weeks 9-10)

9. **Week 9: Testing**
   - Write comprehensive test suite
   - Perform load testing
   - Security audit
   - User acceptance testing

10. **Week 10: Deployment**
    - Deploy to Laravel Cloud
    - Configure production environment
    - Monitor initial accounts
    - Fine-tune performance

## Deployment Strategy

### Pre-Deployment Checklist

1. **Ensure all tests pass**
2. **Review environment configuration**
3. **Verify DNS wildcard setup**
4. **Prepare monitoring alerts**

### Deployment Steps

```bash
# 1. Deploy new code with tenancy package
php artisan down

# 2. Create central database
createdb maintenance_os_central -O postgres -E UTF8

# 3. Run central database migrations
php artisan migrate --path=database/migrations/central --database=central

# 4. Seed central database
php artisan db:seed --class=CentralDatabaseSeeder

# 5. Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# 6. Bring application back online
php artisan up
```

### Post-Deployment Verification

1. **Test account creation**
2. **Verify subdomain routing**
3. **Check file storage isolation**
4. **Confirm queue processing**
5. **Validate billing integration**

## Testing Strategy

### Unit Tests

```php
<?php

namespace Tests\Unit\Tenancy;

use Tests\TestCase;
use App\Models\Account;
use App\Models\User;

class TenantIsolationTest extends TestCase
{
    public function test_tenant_data_is_isolated()
    {
        // Create two tenants
        $tenant1 = Account::create([
            'name' => 'Tenant 1',
            'subdomain' => 'tenant1',
        ]);

        $tenant2 = Account::create([
            'name' => 'Tenant 2',
            'subdomain' => 'tenant2',
        ]);

        // Create user in tenant 1
        tenancy()->initialize($tenant1);
        $user1 = User::factory()->create(['email' => 'test@tenant1.com']);
        $userCount1 = User::count();
        tenancy()->end();

        // Create user in tenant 2
        tenancy()->initialize($tenant2);
        $user2 = User::factory()->create(['email' => 'test@tenant2.com']);
        $userCount2 = User::count();
        tenancy()->end();

        // Verify isolation
        $this->assertEquals(1, $userCount1);
        $this->assertEquals(1, $userCount2);

        // Verify data doesn't cross tenants
        tenancy()->initialize($tenant1);
        $this->assertNull(User::where('email', 'test@tenant2.com')->first());
        tenancy()->end();
    }
}
```

### Feature Tests

```php
<?php

namespace Tests\Feature\Tenancy;

use Tests\TestCase;
use App\Models\Account;
use App\Models\Central\Plan;

class SubscriptionTest extends TestCase
{
    public function test_trial_account_creation()
    {
        $plan = Plan::where('slug', 'professional')->first();

        $response = $this->post('/register', [
            'company_name' => 'Test Company',
            'subdomain' => 'testcompany',
            'admin_name' => 'Admin User',
            'admin_email' => 'admin@testcompany.com',
            'admin_password' => 'password',
            'admin_password_confirmation' => 'password',
            'plan_id' => $plan->id,
        ]);

        $response->assertRedirect();

        $account = Account::where('subdomain', 'testcompany')->first();
        $this->assertNotNull($account);
        $this->assertTrue($account->isOnTrial());
        $this->assertEquals(30, $account->trial_ends_at->diffInDays(now()));
    }

    public function test_resource_limits_enforced()
    {
        $account = Account::factory()->withPlan('starter')->create();
        
        tenancy()->initialize($account);

        // Create 5 users (starter limit)
        User::factory()->count(5)->create();

        // Attempt to create 6th user
        $response = $this->actingAs(User::first())
            ->post('/users', [
                'name' => 'Sixth User',
                'email' => 'sixth@example.com',
                'password' => 'password',
            ]);

        $response->assertSessionHas('error', 'User limit reached for your plan.');
        
        tenancy()->end();
    }
}
```

## Security Considerations

### 1. Data Isolation

- **Database-level isolation**: Each tenant has a completely separate database
- **Application-level checks**: Middleware ensures no cross-tenant access
- **Cache isolation**: Redis keys prefixed with tenant ID
- **File isolation**: S3 paths prefixed with tenant ID

### 2. Authentication Security

- **Subdomain validation**: Strict validation of tenant subdomains
- **Session isolation**: Sessions stored with tenant context
- **Password policies**: Enforced per tenant
- **Two-factor authentication**: Available for all accounts

### 3. API Security

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ValidateApiAccess
{
    public function handle(Request $request, Closure $next)
    {
        $tenant = tenant();
        
        // Check if tenant's plan includes API access
        if (!$tenant->subscription->plan->hasFeature('api_access')) {
            return response()->json([
                'error' => 'API access not available in your plan'
            ], 403);
        }

        // Validate API key is for current tenant
        $apiKey = $request->header('X-API-Key');
        if (!$this->isValidApiKeyForTenant($apiKey, $tenant)) {
            return response()->json([
                'error' => 'Invalid API key'
            ], 401);
        }

        return $next($request);
    }

    private function isValidApiKeyForTenant($apiKey, $tenant): bool
    {
        // Implement tenant-specific API key validation
        return true; // Placeholder
    }
}
```

### 4. Audit Logging

```php
<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Central\AccountActivity;

class AuditService
{
    public static function log(string $action, string $description, array $metadata = []): void
    {
        $tenant = tenant();
        
        if (!$tenant) {
            return;
        }

        AccountActivity::create([
            'account_id' => $tenant->id,
            'admin_id' => auth('admin')->id(),
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
```

## Monitoring & Maintenance

### Health Checks

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Account;

class TenantHealthCheck extends Command
{
    protected $signature = 'tenants:health-check';
    protected $description = 'Check health of all tenant databases';

    public function handle()
    {
        $accounts = Account::where('status', 'active')->get();

        foreach ($accounts as $account) {
            try {
                tenancy()->initialize($account);
                
                // Check database connection
                \DB::select('SELECT 1');
                
                // Check critical tables
                \App\Models\User::count();
                \App\Models\AssetHierarchy\Asset::count();
                
                $this->info("✓ {$account->subdomain}: Healthy");
                
                tenancy()->end();
            } catch (\Exception $e) {
                $this->error("✗ {$account->subdomain}: " . $e->getMessage());
                
                // Log to monitoring system
                \Log::channel('tenant-health')->error('Tenant health check failed', [
                    'account_id' => $account->id,
                    'subdomain' => $account->subdomain,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
```

### Automated Cleanup

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Account;
use App\Services\AccountService;

class CleanupExpiredAccounts extends Command
{
    protected $signature = 'accounts:cleanup-expired';
    protected $description = 'Clean up expired trial accounts and scheduled terminations';

    public function handle(AccountService $accountService)
    {
        // Handle expired trials
        $expiredTrials = Account::where('status', 'active')
            ->where('trial_ends_at', '<', now()->subDays(14))
            ->whereDoesntHave('subscription', function ($q) {
                $q->where('status', 'active');
            })
            ->get();

        foreach ($expiredTrials as $account) {
            $this->info("Terminating expired trial: {$account->subdomain}");
            $accountService->terminateAccount($account);
        }

        // Handle scheduled terminations
        $scheduledTerminations = Account::where('status', 'suspended')
            ->where('termination_scheduled_at', '<', now())
            ->get();

        foreach ($scheduledTerminations as $account) {
            $this->info("Processing scheduled termination: {$account->subdomain}");
            $accountService->terminateAccount($account);
        }
    }
}
```

## Conclusion

This comprehensive implementation specification provides a complete roadmap for converting the Maintenance OS to a multi-tenant SaaS platform. The plan ensures:

1. **Complete data isolation** between tenants
2. **Flexible subscription management** with customizable limits
3. **Secure file storage** with tenant isolation
4. **Robust account lifecycle management**
5. **Scalable architecture** suitable for growth

The phased approach allows for iterative development and testing, minimizing risk while ensuring all requirements are met. The use of Laravel Tenancy package provides a solid foundation while maintaining flexibility for custom requirements.

## Next Steps

1. **Review and approve** this specification
2. **Set up development environment** with Laravel Tenancy
3. **Begin Phase 1 implementation**
4. **Schedule regular review meetings** to track progress
5. **Prepare staging environment** for testing

This document will serve as the primary reference throughout the implementation process and should be updated as requirements evolve or clarifications are made.

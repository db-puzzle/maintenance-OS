# Multi-Tenant Implementation Specification - Optimized for Laravel Tenancy Package

## Executive Summary

This optimized implementation leverages Laravel Tenancy v3's built-in features to minimize custom code and maximize reliability. The package automatically handles database management, tenant context switching, cache/storage isolation, and queue processing, reducing complexity and potential bugs.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technical Stack](#technical-stack)
3. [Leveraging Built-in Features](#leveraging-built-in-features)
4. [Account Model Configuration](#account-model-configuration)
5. [Automatic Database Management](#automatic-database-management)
6. [Event-Driven Architecture](#event-driven-architecture)
7. [Simplified Queue Processing](#simplified-queue-processing)
8. [Built-in Storage & Cache Isolation](#built-in-storage--cache-isolation)
9. [Tenant Context Management](#tenant-context-management)
10. [Implementation Phases](#implementation-phases)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Laravel Tenancy Package                       │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ Auto DB Mgmt│ │Auto Bootstrap│ │ Built-in Middleware  │    │
│  │ • Create    │ │ • Database   │ │ • Domain Resolution  │    │
│  │ • Migrate   │ │ • Cache      │ │ • Context Switching  │    │
│  │ • Seed      │ │ • Filesystem │ │ • Access Prevention  │    │
│  │ • Delete    │ │ • Queue      │ │                      │    │
│  └─────────────┘ └──────────────┘ └──────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                     Application Layer                            │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │   Events    │ │  Controllers │ │     Services         │    │
│  │  Listeners  │ │   & Routes   │ │  (Minimal Custom)    │    │
│  └─────────────┘ └──────────────┘ └──────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Technical Stack

```json
{
  "require": {
    "php": "^8.4",
    "laravel/framework": "^12.0",
    "stancl/tenancy": "^3.8",  // Core package doing heavy lifting
    "laravel/cashier": "^15.0",
    "stripe/stripe-php": "^13.0",
    "spatie/laravel-permission": "^6.0",
    "spatie/laravel-medialibrary": "^11.0"
  }
}
```

## Leveraging Built-in Features

### What Laravel Tenancy Handles Automatically:

1. **Database Management**
   - Automatic database creation on tenant creation
   - Automatic migration execution  
   - Automatic seeding based on configuration
   - Automatic database deletion on tenant deletion
   - Connection switching via bootstrappers

2. **Context Isolation**
   - Cache key prefixing (PrefixCacheTenancyBootstrapper)
   - Filesystem path prefixing (FilesystemTenancyBootstrapper)
   - Redis key prefixing (RedisTenancyBootstrapper)
   - Queue tenant context (QueueTenancyBootstrapper)

3. **Request Lifecycle**
   - Subdomain/domain tenant identification
   - Automatic context initialization
   - Middleware-based access control
   - Automatic context cleanup

## Account Model Configuration

```php
<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class Account extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;
    
    protected $table = 'accounts';
    
    // Only define custom columns - package handles the rest
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
            'metadata',
        ];
    }
    
    protected $fillable = [
        'name',
        'subdomain',
        'status',
        'trial_ends_at',
        'suspension_reason', 
        'suspended_at',
        'metadata',
    ];
    
    protected $casts = [
        'metadata' => 'array',
        'trial_ends_at' => 'datetime',
        'suspended_at' => 'datetime',
    ];
    
    // Let the package handle database naming
    // Only override if you need custom logic
    public function database(): TenantDatabase
    {
        return new TenantDatabase($this, $this->id);
    }
    
    // Relationships
    public function subscription()
    {
        return $this->hasOne(Subscription::class);
    }
    
    // Monitoring method with Laravel Tenancy cache tags
    public function getDatabaseStats(): array
    {
        // Use Laravel Tenancy's cache tags for better organization
        return Cache::tags(['tenant', $this->id, 'stats'])->remember("database_stats", 60, function () {
            // Get formatted size and connections from central connection
            $stats = DB::connection('central')->selectOne("
                SELECT 
                    pg_size_pretty(pg_database_size(?)) as size,
                    (SELECT count(*) FROM pg_stat_activity WHERE datname = ?) as connections
            ", [$this->database_name, $this->database_name]);
            
            // Get tenant-specific stats with longer cache using tags
            $tenantStats = $this->run(function () {
                return Cache::tags(['tenant', tenant()->id, 'counts'])->remember("entity_counts", 300, function () {
                    return [
                        'table_count' => count(Schema::getAllTables()),
                        'user_count' => \App\Models\User::count(),
                        'work_order_count' => \App\Models\WorkOrder::count(),
                        'asset_count' => \App\Models\Asset::count(),
                    ];
                });
            });
            
            return [
                'database_size' => $stats->size,
                'connections' => $stats->connections,
                'created_at' => $this->created_at->diffForHumans(),
                ...$tenantStats,
            ];
        });
    }
    
    // Clear cache when needed - flush by tag
    public function clearStatsCache(): void
    {
        // Clear all cache entries for this tenant's stats
        Cache::tags(['tenant', $this->id, 'stats'])->flush();
        Cache::tags(['tenant', $this->id, 'counts'])->flush();
        
        // Or clear all cache for this tenant
        Cache::tags(['tenant', $this->id])->flush();
    }
}
```

## Automatic Database Management

### Configuration-Based Automation

```php
// config/tenancy.php
return [
    'tenant_model' => \App\Models\Account::class,
    
    // Package automatically creates/deletes databases!
    'database' => [
        'managers' => [
            'pgsql' => [
                'driver' => 'pgsql',
                'host' => env('DB_HOST'),
                'port' => env('DB_PORT'),
                'database' => null, // Package sets this
                'username' => env('DB_USERNAME'),
                'password' => env('DB_PASSWORD'),
            ],
        ],
        
        // Automatic tenant database naming
        'prefix' => 'tenant_',
        'suffix' => '',
    ],
    
    // Migration configuration - no need to move files!
    'migration_parameters' => [
        '--path' => [
            database_path('migrations/tenant'),
        ],
        '--seed' => true,
    ],
    
    // Seeder configuration
    'seeder_parameters' => [
        '--class' => 'TenantDatabaseSeeder',
    ],
    
    // Enable automatic features
    'features' => [
        'database_creation' => true,    // Auto create DB
        'database_seeding' => true,     // Auto seed DB  
        'database_deletion' => true,    // Auto delete DB
        'universal_routes' => true,     // Share routes between tenants
        'telescope' => false,
    ],
];
```

### No Custom Database Service Needed!

```php
// OLD WAY - Custom service with lots of code ❌
class TenantDatabaseService 
{
    public function createDatabase($tenant) { /* 50+ lines */ }
    public function runMigrations($tenant) { /* 30+ lines */ }
    public function seedDatabase($tenant) { /* 30+ lines */ }
    public function dropDatabase($tenant) { /* 40+ lines */ }
}

// NEW WAY - Let the package handle it ✅
// Just create the tenant, database operations are automatic!
$tenant = Account::create([
    'name' => 'Acme Corp',
    'subdomain' => 'acme',
]);
// Database created, migrated, and seeded automatically!
```

## Event-Driven Architecture

### Using Package Events Instead of Custom Jobs

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Stancl\Tenancy\Events;

class TenancyServiceProvider extends ServiceProvider  
{
    protected array $listen = [
        // Package events we can hook into
        Events\TenantCreated::class => [
            // Send welcome email
            \App\Listeners\SendTenantWelcomeEmail::class,
            // Initialize default settings
            \App\Listeners\InitializeTenantSettings::class,
        ],
        
        Events\DatabaseMigrated::class => [
            // Log migration completion
            \App\Listeners\LogDatabaseMigration::class,
        ],
        
        Events\DatabaseSeeded::class => [
            // Log seeding completion
            \App\Listeners\LogDatabaseSeeding::class,
        ],
        
        Events\DeletingTenant::class => [
            // Clean up external resources (S3, etc)
            \App\Listeners\CleanupTenantResources::class,
            // Cancel subscriptions
            \App\Listeners\CancelTenantSubscriptions::class,
        ],
        
        Events\TenantDeleted::class => [
            // Log deletion
            \App\Listeners\LogTenantDeletion::class,
        ],
        
        // Package provides many more events!
        Events\BootstrappingTenancy::class => [],
        Events\TenancyBootstrapped::class => [],
        Events\RevertingToCentralContext::class => [],
        Events\RevertedToCentralContext::class => [],
    ];
}
```

### Simple Event Listeners

```php
<?php

namespace App\Listeners;

use Stancl\Tenancy\Events\TenantCreated;
use App\Mail\WelcomeTenant;
use Illuminate\Support\Facades\Mail;

class SendTenantWelcomeEmail
{
    public function handle(TenantCreated $event): void
    {
        $tenant = $event->tenant;
        
        // Send email to admin
        Mail::to($tenant->metadata['admin_email'])
            ->send(new WelcomeTenant($tenant));
    }
}
```

## Simplified Queue Processing

### Using TenantAware Interface

```php
<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Stancl\Tenancy\Contracts\TenantAware;

// Just implement TenantAware - package handles context!
class ProcessWorkOrderJob implements ShouldQueue, TenantAware
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public ?string $tenantId = null; // Package sets this automatically
    public int $workOrderId;
    
    public function __construct(int $workOrderId)
    {
        $this->workOrderId = $workOrderId;
    }
    
    public function handle(): void
    {
        // Already in tenant context - just write business logic!
        $workOrder = WorkOrder::find($this->workOrderId);
        $workOrder->process();
    }
}

// Dispatch from tenant context - tenantId captured automatically
ProcessWorkOrderJob::dispatch($workOrderId);
```

### Central Context Job Execution

```php
// Run job for specific tenant from central context
use App\Models\Account;

$tenant = Account::find($tenantId);
$tenant->run(function () use ($workOrderId) {
    ProcessWorkOrderJob::dispatch($workOrderId);
});
```

## Built-in Storage & Cache Isolation

### Automatic Path Prefixing

```php
// config/tenancy.php
'filesystem' => [
    'suffix_base' => 'tenant',
    
    // These disks get automatic prefixing
    'disks' => [
        'local',
        'public',
        's3',
    ],
    
    // Automatic path isolation per tenant
    'root_override' => [
        'local' => '%storage_path%/app/tenants/%tenant%',
        'public' => '%storage_path%/app/public/tenants/%tenant%', 
        's3' => 'tenants/%tenant%',
    ],
],

// Usage - paths are automatically prefixed!
Storage::disk('s3')->put('file.jpg', $contents);
// Actual path: tenants/{tenant-id}/file.jpg
```

### Automatic Cache Prefixing

```php
// config/tenancy.php
'cache' => [
    'tag_base' => 'tenant',
    'ttl' => 3600, // Cache tenant lookup for 1 hour
],

'bootstrappers' => [
    // This bootstrapper handles cache prefixing automatically
    \Stancl\Tenancy\Bootstrappers\PrefixCacheTenancyBootstrapper::class,
],

// Usage - cache keys are automatically prefixed!
Cache::put('settings', $settings, 3600);
// Actual key: tenant_{tenant-id}_settings
```

## Leveraging Package Commands

### Built-in Commands for Operations

```bash
# Core tenant commands
php artisan tenants:list                    # List all tenants
php artisan tenants:migrate                 # Migrate all tenants
php artisan tenants:rollback                # Rollback migrations
php artisan tenants:seed                    # Seed tenant databases
php artisan tenants:migrate-fresh --seed    # Fresh migration with seeding

# Run any command on tenants
php artisan tenants:run cache:clear         # Clear cache for all tenants
php artisan tenants:run down                # Maintenance mode
php artisan tenants:run up                  # Exit maintenance mode
php artisan tenants:run optimize            # Optimize all tenants
php artisan tenants:run queue:restart       # Restart queues
php artisan tenants:run storage:link        # Create storage links

# Target specific tenants
php artisan tenants:run cache:clear --tenants=tenant-1,tenant-2
php artisan tenants:migrate --tenants=tenant-1

# Database operations
php artisan tenants:run db:show             # Show database info
php artisan tenants:run db:table users      # Show table info
php artisan tenants:run db:dump --path=backups  # Backup databases

# Custom app commands
php artisan tenants:run app:health-check    # Run custom health check
php artisan tenants:run app:process-reports # Run custom processing
```

### Creating Minimal Custom Commands

Instead of complex tenant-aware commands, create simple commands that run in tenant context:

```php
// Simple command that works with tenants:run
class HealthCheckCommand extends Command
{
    protected $signature = 'app:health-check';
    
    public function handle(): void
    {
        // Already in tenant context when run via tenants:run
        $this->info('Tenant: ' . tenant('id'));
        $this->info('Users: ' . User::count());
        $this->info('Status: Healthy');
    }
}

// Use it: php artisan tenants:run app:health-check
```

## Tenant Context Management

### Automatic Context in Controllers

```php
<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function index()
    {
        // Already in tenant context via middleware!
        // No need to switch contexts manually
        $workOrders = WorkOrder::paginate();
        
        return view('work-orders.index', compact('workOrders'));
    }
    
    public function store(Request $request)
    {
        // Creating in tenant database automatically
        $workOrder = WorkOrder::create($request->validated());
        
        // Dispatch job - tenant context captured
        ProcessWorkOrderJob::dispatch($workOrder->id);
        
        return redirect()->route('work-orders.show', $workOrder);
    }
}
```

### Manual Context Switching When Needed

```php
// From central context, run code for a tenant
$tenant = Account::find($tenantId);

// Option 1: Using run()
$result = $tenant->run(function () {
    return User::count();
});

// Option 2: Manual initialization
tenancy()->initialize($tenant);
$users = User::all();
tenancy()->end();

// Option 3: Using callback
Account::find($tenantId)->execute(function ($tenant) {
    // Code runs in tenant context
});
```

## Bootstrappers Configuration

```php
// config/tenancy.php
'bootstrappers' => [
    // Database connection switching
    \Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper::class,
    
    // Cache key prefixing
    \Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper::class,
    \Stancl\Tenancy\Bootstrappers\PrefixCacheTenancyBootstrapper::class,
    
    // Filesystem path prefixing
    \Stancl\Tenancy\Bootstrappers\FilesystemTenancyBootstrapper::class,
    
    // Queue context preservation
    \Stancl\Tenancy\Bootstrappers\QueueTenancyBootstrapper::class,
    
    // Redis key prefixing (built-in!)
    \Stancl\Tenancy\Bootstrappers\RedisTenancyBootstrapper::class,
],
```

## Middleware Configuration

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    // Package middleware for tenant identification
    $middleware->group('tenant', [
        // Identifies tenant from subdomain
        \Stancl\Tenancy\Middleware\InitializeTenancyByDomain::class,
        // Prevents access from central domains
        \Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains::class,
    ]);
    
    // Custom middleware for business logic only
    $middleware->append([
        \App\Http\Middleware\EnsureTenantIsActive::class,
        \App\Http\Middleware\CheckSubscriptionStatus::class,
    ]);
})
```

## Domain Validation - Trust the Package

### Simplified Domain Validation

Laravel Tenancy's middleware handles domain validation automatically. We only need minimal validation during registration:

```php
// Minimal validation - let the package handle the rest
$rules = [
    'subdomain' => [
        'required',
        'string',
        'min:3',
        'max:63',
        'not_in:www,admin,api,app,mail,ftp,blog,help,support', // Business rules only
        Rule::unique('domains', 'domain'), // Direct domains table check
    ],
];
```

### How It Works:

1. **Registration**: Basic validation for business rules
2. **Runtime**: `InitializeTenancyBySubdomain` middleware validates:
   - Domain exists in database
   - Domain is associated with active tenant
   - Returns 404 if invalid

### No Custom Validation Needed!

The package's middleware automatically:
- Extracts subdomain from request
- Validates against domains table
- Initializes tenant context
- Handles failures gracefully

Benefits:
- 90% less validation code
- Package handles edge cases
- Automatic 404 for invalid domains
- No race conditions

## Simplified Account Creation

```php
<?php

namespace App\Services;

use App\Models\Account;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AccountService
{
    public function createAccount(array $data): Account
    {
        
        return DB::transaction(function () use ($data) {
            // Create tenant - database operations happen automatically!
            $tenant = Account::create([
                'name' => $data['company_name'],
                'subdomain' => $data['subdomain'],
                'metadata' => [
                    'admin_email' => $data['admin_email'],
                    'admin_name' => $data['admin_name'],
                ],
            ]);
            
            // Domain created automatically via model event
            // Database created automatically by package
            // Migrations run automatically
            // Seeding happens automatically
            
            // Create subscription
            $tenant->subscription()->create([
                'plan_id' => $data['plan_id'],
                'trial_ends_at' => now()->addDays(30),
            ]);
            
            return $tenant;
        });
    }
}
```

## Implementation Phases (Simplified)

### Phase 1: Core Setup (Week 1)
- Install Laravel Tenancy package
- Configure tenant model and bootstrappers
- Set up central database
- Configure automatic features

### Phase 2: Event Listeners (Week 2)
- Create event listeners for tenant lifecycle
- Set up welcome emails via events
- Configure resource cleanup listeners
- Implement audit logging via events

### Phase 3: Routes & Middleware (Week 3)
- Configure subdomain routing
- Apply package middleware
- Create minimal custom middleware
- Test tenant isolation

### Phase 4: Testing (Week 4)
- Test automatic database operations
- Verify tenant isolation
- Test queue processing
- Load test with multiple tenants

## Key Advantages of This Approach

1. **Less Code**: Leveraging built-in features reduces codebase by ~60%
2. **More Reliable**: Package is battle-tested in production
3. **Easier Upgrades**: Less custom code to maintain
4. **Better Performance**: Package optimizations included
5. **Automatic Features**: Database, cache, storage handled automatically

## Migration from Custom Implementation

### Remove These Custom Components:
- ❌ TenantDatabaseService (150+ lines)
- ❌ CreateTenantDatabaseJob (50+ lines)
- ❌ Custom cache prefixing logic
- ❌ Manual context switching in jobs
- ❌ Custom storage path management
- ❌ Custom tenant commands (use tenants:run instead)
- ❌ Complex health check commands
- ❌ Custom backup scripts
- ❌ Custom domain validation rules
- ❌ DNS regex patterns and alpha_dash validation
- ❌ Complex closure validations
- ❌ Manual domain existence checks

### Keep Only:
- ✅ Business logic event listeners
- ✅ Custom middleware for business rules
- ✅ Subscription/billing logic
- ✅ Admin portal features
- ✅ Simple commands that work with tenants:run
- ✅ Reserved subdomain lists (business rules only)
- ✅ Basic length validation (min/max)
- ✅ Simple unique check against domains table

## Conclusion

By maximizing the use of Laravel Tenancy's built-in features, we achieve a cleaner, more maintainable implementation. The package handles the complex infrastructure automatically, allowing us to focus on business logic and user experience.

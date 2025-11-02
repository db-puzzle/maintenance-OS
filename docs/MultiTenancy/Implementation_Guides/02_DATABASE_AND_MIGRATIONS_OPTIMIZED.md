# Database and Migrations - Leveraging Laravel Tenancy Built-in Features

## Overview

This guide demonstrates how to use Laravel Tenancy's automatic database management features, eliminating hundreds of lines of custom code. The package handles database creation, migration, seeding, and deletion automatically through its event system.

## Table of Contents

1. [Automatic Database Management](#automatic-database-management)
2. [Migration Organization](#migration-organization) 
3. [Built-in Seeding](#built-in-seeding)
4. [Event-Driven Lifecycle](#event-driven-lifecycle)
5. [Monitoring Without Custom Code](#monitoring-without-custom-code)
6. [Backup Integration](#backup-integration)

## Automatic Database Management

### Configuration-Driven Approach - Trust Laravel Cloud

```env
# .env - Simple configuration
DB_HOST="your-cluster-pooler.us-east-2.pg.laravel.cloud"
DB_PORT="5432"
DB_DATABASE="maintenance_os_central"
DB_USERNAME="your-username"
DB_PASSWORD="your-password"
```

```php
// config/database.php - Standard Laravel config
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST'),
    'port' => env('DB_PORT'),
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
    'charset' => 'utf8',
    'sslmode' => 'require',
],
```

```php
// config/tenancy.php
return [
    'database' => [
        // Connection manager for tenant databases
        'managers' => [
            'pgsql' => [
                'driver' => 'pgsql',
                'host' => env('DB_HOST'),
                'port' => env('DB_PORT'),
                'username' => env('DB_USERNAME'),
                'password' => env('DB_PASSWORD'),
                'charset' => 'utf8',
                'sslmode' => 'require',
            ],
        ],
        
        // Automatic database naming
        'prefix' => 'tenant_',
        'suffix' => '',
        
        // Character limit for database names
        'charset_limit' => 63,
    ],
    
    // Enable automatic features - no custom code needed!
    'features' => [
        'database_creation' => true,
        'database_seeding' => true,
        'database_deletion' => true,
        'database_deletes_after_tenant_deletion' => true,
        'migrations_and_seeders_in_transaction' => true,
    ],
    
    // Automatic migration parameters
    'migration_parameters' => [
        '--force' => true,
        '--path' => 'database/migrations/tenant',
    ],
    
    // Automatic seeding parameters  
    'seeder_parameters' => [
        '--force' => true,
        '--class' => 'TenantDatabaseSeeder',
    ],
];
```

### No Custom Database Service Needed!

```php
// ❌ OLD WAY - Custom database service (200+ lines)
class TenantDatabaseService {
    public function createDatabase($tenant) { /* complex logic */ }
    public function runMigrations($tenant) { /* complex logic */ }
    public function seedDatabase($tenant) { /* complex logic */ }
    public function dropDatabase($tenant) { /* complex logic */ }
}

// ✅ NEW WAY - Just create the tenant!
$tenant = Account::create([
    'name' => 'Acme Corp',
    'subdomain' => 'acme',
]);
// Database created, migrated, and seeded automatically!
```

### Laravel Cloud Provides Automatically:

1. **Built-in PgBouncer** for PostgreSQL
   - 10,000 concurrent connections supported
   - Automatic connection pooling
   - No configuration needed

2. **Auto-scaling**
   - Serverless Postgres scales automatically
   - From 0.5 to 4 compute units
   - Handles 5-100 tenants easily

### What We DON'T Need:
- ❌ Custom connection pool management
- ❌ Manual PgBouncer configuration
- ❌ Connection limit calculations
- ❌ Custom pooling strategies
- ❌ Connection monitoring (Cloud handles it)

## Migration Organization

### Configuration-Based Migration Management

Laravel Tenancy allows you to configure migration paths in `config/tenancy.php` instead of physically moving files:

#### Option 1: Separate Directories (Recommended)

```
database/
├── migrations/
│   ├── central/          # Central database migrations
│   └── tenant/           # Tenant database migrations
└── seeders/
    ├── CentralDatabaseSeeder.php
    └── TenantDatabaseSeeder.php
```

```php
// config/tenancy.php
return [
    // Configure tenant migration paths
    'migration_parameters' => [
        '--path' => [
            database_path('migrations/tenant'),
        ],
        '--realpath' => true,
    ],
    
    // Central migrations use Laravel's default path
];
```

#### Option 2: Single Directory with Prefixes

```
database/
├── migrations/
│   ├── 2024_01_01_create_accounts_table.php          # Central
│   ├── 2024_01_01_tenant_create_users_table.php      # Tenant
│   └── 2024_01_02_tenant_create_work_orders_table.php # Tenant
```

```php
// config/tenancy.php
return [
    'migrations' => [
        // Package will only run migrations with this prefix for tenants
        'tenant_migrations_prefix' => 'tenant_',
    ],
];
```

### Central Migrations

```php
// database/migrations/central/2024_01_01_create_accounts_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'central'; // Important!
    
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('subdomain')->unique();
            $table->enum('status', ['active', 'suspended', 'terminated'])->default('active');
            $table->timestamp('trial_ends_at')->nullable();
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();
            
            $table->index('status');
            $table->index('subdomain');
        });
    }
    
    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
```

### Tenant Migrations (No Connection Needed!)

```php
// database/migrations/tenant/2024_01_01_create_users_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // No $connection property needed - package handles it!
    
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });
    }
    
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

## Built-in Seeding

### TenantDatabaseSeeder

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class TenantDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Package has already switched to tenant context!
        
        $this->call([
            TenantRolesSeeder::class,
            TenantSettingsSeeder::class,
            TenantDefaultDataSeeder::class,
        ]);
        
        // Create admin user from tenant metadata
        $this->createAdminUser();
    }
    
    protected function createAdminUser(): void
    {
        // Access current tenant via helper
        $tenant = tenant();
        
        \App\Models\User::create([
            'name' => $tenant->metadata['admin_name'] ?? 'Administrator',
            'email' => $tenant->metadata['admin_email'],
            'password' => bcrypt($tenant->metadata['admin_password'] ?? 'password'),
            'email_verified_at' => now(),
        ])->assignRole('administrator');
    }
}
```

### Conditional Seeding Based on Plan

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class TenantDefaultDataSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = tenant();
        $plan = $tenant->subscription->plan ?? null;
        
        // Seed based on plan features
        if ($plan?->hasFeature('demo_data')) {
            $this->call([
                DemoAssetsSeeder::class,
                DemoWorkOrdersSeeder::class,
            ]);
        }
        
        // Always seed these
        $this->call([
            UnitsOfMeasureSeeder::class,
            AssetTypesSeeder::class,
        ]);
    }
}
```

## Event-Driven Lifecycle

### Listen to Package Events

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Stancl\Tenancy\Events;

class EventServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Tenant created - send welcome email
        Event::listen(
            Events\TenantCreated::class,
            fn ($event) => $this->onTenantCreated($event)
        );
        
        // Database created - log it
        Event::listen(
            Events\DatabaseCreated::class,
            fn ($event) => logger()->info("Database created for tenant: {$event->tenant->id}")
        );
        
        // Database migrated - track version
        Event::listen(
            Events\DatabaseMigrated::class,
            fn ($event) => $this->trackMigrationVersion($event)
        );
        
        // Database seeded - notify admin
        Event::listen(
            Events\DatabaseSeeded::class,
            fn ($event) => $this->notifyAdminOfCompletion($event)
        );
        
        // Tenant deleting - cleanup resources
        Event::listen(
            Events\DeletingTenant::class,
            fn ($event) => $this->cleanupTenantResources($event)
        );
        
        // Database deleted - log it
        Event::listen(
            Events\DatabaseDeleted::class,
            fn ($event) => logger()->info("Database deleted for tenant: {$event->tenantId}")
        );
    }
    
    protected function onTenantCreated($event): void
    {
        $tenant = $event->tenant;
        
        // Send welcome email after database is ready
        dispatch(function () use ($tenant) {
            Mail::to($tenant->metadata['admin_email'])
                ->send(new WelcomeTenantMail($tenant));
        })->delay(now()->addMinutes(2));
    }
    
    protected function cleanupTenantResources($event): void
    {
        $tenant = $event->tenant;
        
        // Cleanup S3 files
        Storage::disk('s3')->deleteDirectory("tenants/{$tenant->id}");
        
        // Cancel subscriptions
        if ($tenant->subscription) {
            app(StripeService::class)->cancelSubscription($tenant->subscription);
        }
    }
}
```

### No Manual Database Operations!

```php
// Creating a tenant
$tenant = Account::create($data);
// ✅ Database created automatically
// ✅ Migrations run automatically  
// ✅ Seeding done automatically
// ✅ Events fired for custom logic

// Deleting a tenant
$tenant->delete();
// ✅ Database dropped automatically
// ✅ Cleanup events fired
// ✅ No orphaned data
```

## Monitoring Without Custom Code

### Simplified Stats Method on Account Model

```php
<?php

namespace App\Models;

// Add this method to the Account model
public function getDatabaseStats(): array
{
    // Cache stats for 60 seconds to reduce database load
    return Cache::remember("tenant_stats_{$this->id}", 60, function () {
        // Get formatted size directly from PostgreSQL
        $stats = DB::connection('central')->selectOne("
            SELECT 
                pg_size_pretty(pg_database_size(?)) as size,
                (SELECT count(*) FROM pg_stat_activity WHERE datname = ?) as connections
        ", [$this->database_name, $this->database_name]);
        
        // Get tenant-specific stats
        $tenantStats = $this->run(function () {
            return Cache::remember("tenant_counts_{$this->id}", 300, function () {
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

// Clear cache when tenant data changes
public function clearStatsCache(): void
{
    Cache::forget("tenant_stats_{$this->id}");
    Cache::forget("tenant_counts_{$this->id}");
}
```

### Health Checks Using Package Commands

```bash
# Check all tenant databases using package command
php artisan tenants:run db:show

# Check specific tenant
php artisan tenants:run db:show --tenants=tenant-id

# Run custom health check on all tenants
php artisan tenants:run app:health-check

# Get table info for all tenants
php artisan tenants:run db:table users
```

For custom health reporting, create a minimal command:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\WorkOrder;

class HealthCheckCommand extends Command
{
    protected $signature = 'app:health-check';
    protected $description = 'Check tenant health metrics';
    
    public function handle(): void
    {
        // This runs in tenant context via tenants:run
        $stats = [
            'users' => User::count(),
            'work_orders' => WorkOrder::count(),
            'last_activity' => User::latest()->first()?->updated_at,
        ];
        
        $this->info("Tenant: " . tenant('id'));
        $this->table(['Metric', 'Value'], collect($stats)->map(fn($v, $k) => [$k, $v]));
    }
}
```

## Backup Strategy - Use Existing Tools

### Laravel Cloud Backups (for supported databases)
- Automatic daily backups
- Built-in retention policies
- One-click restore

### For PostgreSQL - Use Simple Solutions

```bash
# Simple backup command using package
php artisan tenants:run db:dump --path=backups

# Or use Laravel Backup package
composer require spatie/laravel-backup
php artisan backup:run
```

### S3 Storage - Laravel's Built-in

```php
// config/filesystems.php
's3' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION'),
    'bucket' => env('AWS_BUCKET'),
    'path' => 'backups',
],
```

### Simple Backup Implementation

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use App\Models\Account;

class BackupTenants extends Command
{
    protected $signature = 'tenants:backup';
    protected $description = 'Backup all tenant databases';

    public function handle()
    {
        Account::all()->each(function ($tenant) {
            $tenant->run(function () use ($tenant) {
                $filename = "backup-{$tenant->id}-" . now()->format('Y-m-d') . ".sql";
                
                // Use Laravel's database dump
                $this->call('db:dump', [
                    '--path' => storage_path("backups/{$filename}")
                ]);
                
                // Upload to S3
                Storage::disk('s3')->put(
                    "tenants/{$tenant->id}/{$filename}",
                    file_get_contents(storage_path("backups/{$filename}"))
                );
                
                // Clean up local file
                unlink(storage_path("backups/{$filename}"));
            });
        });
        
        $this->info('All tenants backed up successfully!');
    }
}
```

### Schedule It

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    // Daily backups at 2 AM
    $schedule->command('tenants:backup')->dailyAt('02:00');
    
    // That's it! No complex scheduling logic needed
}
```

## Migration Commands

### Using Package Commands

```bash
# Migrate all tenants
php artisan tenants:migrate

# Migrate specific tenant
php artisan tenants:migrate --tenants=8b4f3d2a-5c6e-4f7a-8b9c-1d2e3f4a5b6c

# Rollback tenant migrations
php artisan tenants:rollback

# Fresh migration for all tenants
php artisan tenants:migrate-fresh

# Seed all tenants
php artisan tenants:seed

# List all tenants
php artisan tenants:list

# Run any artisan command on all tenants
php artisan tenants:run cache:clear
php artisan tenants:run queue:restart
php artisan tenants:run storage:link
php artisan tenants:run optimize

# Run maintenance mode on specific tenants
php artisan tenants:run down --tenants=tenant-id
php artisan tenants:run up --tenants=tenant-id

# Generate tenant-specific reports
php artisan tenants:run "db:table users --count"
php artisan tenants:run "db:table work_orders --count"

# Clear tenant caches
php artisan tenants:run cache:clear
php artisan tenants:run config:clear
php artisan tenants:run route:clear
php artisan tenants:run view:clear

# Run custom commands with parameters
php artisan tenants:run "app:process-work-orders --status=pending"
```

### Maintenance Mode Using Package Commands

```bash
# Put all tenants in maintenance mode
php artisan tenants:run down

# Put specific tenants in maintenance mode
php artisan tenants:run down --tenants=tenant-id-1,tenant-id-2

# Bring all tenants back online
php artisan tenants:run up

# Check maintenance status
php artisan tenants:run down:status
```

For account status updates (business logic), keep it simple:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Account;

class UpdateAccountStatus extends Command
{
    protected $signature = 'app:update-status {status} {--tenant=*}';
    
    public function handle(): void
    {
        $tenantIds = $this->option('tenant');
        $status = $this->argument('status');
        
        Account::when($tenantIds, fn($q) => $q->whereIn('id', $tenantIds))
            ->update(['status' => $status]);
            
        $count = $tenantIds ? count($tenantIds) : Account::count();
        $this->info("Updated {$count} tenant(s) to status: {$status}");
    }
}
```

## Testing

### Simple Database Tests

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Account;
use Stancl\Tenancy\Events;

class DatabaseManagementTest extends TestCase
{
    public function test_database_created_automatically()
    {
        Event::fake([Events\DatabaseCreated::class]);
        
        $tenant = Account::create([
            'name' => 'Test Corp',
            'subdomain' => 'test',
        ]);
        
        // Assert database was created
        Event::assertDispatched(Events\DatabaseCreated::class);
        
        // Verify we can use the database
        $tenant->run(function () {
            $this->assertTrue(Schema::hasTable('users'));
        });
    }
    
    public function test_database_deleted_automatically()
    {
        Event::fake([Events\DatabaseDeleted::class]);
        
        $tenant = Account::create([
            'name' => 'Delete Test',
            'subdomain' => 'deletetest',
        ]);
        
        $databaseName = $tenant->database_name;
        $tenant->delete();
        
        Event::assertDispatched(Events\DatabaseDeleted::class);
        
        // Verify database doesn't exist
        $exists = DB::connection('central')
            ->select("SELECT 1 FROM pg_database WHERE datname = ?", [$databaseName]);
        
        $this->assertEmpty($exists);
    }
}
```

## Key Advantages

### What We Eliminated

1. **❌ TenantDatabaseService class** (200+ lines)
2. **❌ Manual database creation/deletion**
3. **❌ Manual migration running**
4. **❌ Manual seeding logic**
5. **❌ Custom connection switching**
6. **❌ Manual transaction handling**

### What We Keep

1. **✅ Business-specific seeders**
2. **✅ Monitoring/stats (simplified)**
3. **✅ Backup logic (simplified)**
4. **✅ Event listeners for custom needs**

## Performance Optimization - Let the Platform Handle It

### Laravel Cloud Already Provides:

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

### Simple Performance Tips

```php
// config/tenancy.php
return [
    // Enable caching - that's all!
    'cache' => [
        'tenant_lookup' => true,
        'ttl' => 3600,
    ],
];
```

1. **Use Laravel's Query Cache**
   ```php
   $users = Cache::remember('users', 3600, function () {
       return User::all();
   });
   ```

2. **Use Eager Loading**
   ```php
   $tenants = Account::with('domains', 'subscription')->get();
   ```

3. **Index Your Databases**
   ```php
   Schema::table('work_orders', function ($table) {
       $table->index('status');
       $table->index('created_at');
   });
   ```

### We Don't Need:
- ❌ Custom monitoring dashboards
- ❌ Complex health check systems
- ❌ Manual connection tracking
- ❌ Custom alert systems

## Troubleshooting

### Common Issues

1. **Migration not found**: Check path in config
2. **Seeding fails**: Verify seeder class name
3. **Database not created**: Check features enabled in config

### Debug Helpers

```php
// Check if database exists
DB::connection('central')
    ->select("SELECT 1 FROM pg_database WHERE datname = ?", [$tenant->database_name]);

// List tenant tables
$tenant->run(function () {
    return Schema::getAllTables();
});
```

## Disaster Recovery - Simple Plan

### If Something Goes Wrong

1. **Tenant Can't Access Site**
   - Laravel Tenancy middleware returns 404 automatically
   - Check domains table
   - Check tenant status

2. **Database Connection Issues**
   - Laravel Cloud auto-restarts connections
   - PgBouncer handles reconnection
   - No manual intervention needed

3. **Need to Restore Backup**
   ```bash
   # Download from S3
   aws s3 cp s3://bucket/tenants/{id}/backup.sql backup.sql
   
   # Restore
   psql tenant_database < backup.sql
   ```

## Cost Optimization

### Laravel Cloud Pricing (Simplified)

- **Serverless Postgres**: $0.07-$0.56/hour based on usage
- **Scales to zero** when not in use
- **No need for complex calculations**

### Our Approach

1. Start with minimum (0.5 compute units)
2. Let it auto-scale
3. Monitor costs in Laravel Cloud dashboard
4. Adjust if needed

## Key Takeaways

1. **Trust Laravel Cloud** - It's built for this
2. **Trust Laravel Tenancy** - It handles the complexity
3. **Keep it simple** - Don't over-engineer
4. **Use existing tools** - Spatie/laravel-backup, etc.
5. **Monitor through the platform** - Don't build custom monitoring

## What We Eliminated

- 🗑️ 300+ lines of connection pooling configuration
- 🗑️ 400+ lines of backup strategy
- 🗑️ Complex monitoring systems
- 🗑️ Custom health checks
- 🗑️ Manual connection management
- 🗑️ Elaborate disaster recovery plans

## Result

- ✅ 90% less code
- ✅ Easier to maintain
- ✅ More reliable (platform-managed)
- ✅ Lower operational overhead
- ✅ Focus on business logic, not infrastructure

## Conclusion

By combining Laravel Tenancy's built-in database management with Laravel Cloud's infrastructure, we eliminate the need for complex custom implementations. The package handles database operations automatically, while the platform manages connections, scaling, and monitoring. This approach results in significantly less code and more reliable operations.

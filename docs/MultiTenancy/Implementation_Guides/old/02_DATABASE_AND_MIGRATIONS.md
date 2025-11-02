# Database and Migrations Implementation Guide

## Overview

This guide covers the implementation of multi-database architecture, tenant database creation, migrations management, and data seeding for the multi-tenant Maintenance OS.

## Table of Contents

1. [Database Architecture](#database-architecture)
2. [Central Database Setup](#central-database-setup)
3. [Tenant Database Management](#tenant-database-management)
4. [Migration Strategy](#migration-strategy)
5. [Data Seeding](#data-seeding)
6. [Database Lifecycle](#database-lifecycle)
7. [Performance Optimization](#performance-optimization)
8. [Backup and Recovery](#backup-and-recovery)

## Database Architecture

### Overview

```
┌─────────────────────────────────────────────┐
│          Central Database                    │
│  - accounts (tenants)                       │
│  - subscriptions                            │
│  - plans & features                         │
│  - domains                                  │
│  - system_admins                           │
│  - audit_logs                              │
└─────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐    ┌────▼────┐    ┌────▼────┐
│Tenant 1│    │Tenant 2 │    │Tenant N │
│Database│    │Database │    │Database │
└────────┘    └─────────┘    └─────────┘
```

### Database Naming Convention

```php
// Pattern: tenant_{uuid}_{subdomain}
// Example: tenant_550e8400e29b41d4_acme
public function getDatabaseName(): string
{
    return sprintf(
        'tenant_%s_%s',
        str_replace('-', '', $this->id),
        $this->subdomain
    );
}
```

## Central Database Setup

### Create Central Database

```bash
# Create central database
createdb maintenance_os_central -O postgres -E UTF8

# Connect to database
psql -d maintenance_os_central
```

### Central Database Migrations

Create migration files in `database/migrations/central/`:

#### 1. Create Accounts Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'central';

    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('subdomain', 63)->unique();
            $table->string('database')->unique();
            
            // Status management
            $table->enum('status', ['active', 'suspended', 'terminated'])
                  ->default('active')
                  ->index();
            
            // Trial management
            $table->timestamp('trial_ends_at')->nullable();
            
            // Suspension management
            $table->text('suspension_reason')->nullable();
            $table->timestamp('suspended_at')->nullable();
            
            // Termination management
            $table->timestamp('termination_scheduled_at')->nullable();
            $table->timestamp('terminated_at')->nullable();
            
            // Metadata
            $table->jsonb('metadata')->default('{}');
            $table->jsonb('settings')->default('{}');
            $table->jsonb('limits_override')->default('{}')->comment('Custom limits for enterprise accounts');
            
            $table->timestamps();
            
            // Indexes
            $table->index('status');
            $table->index('trial_ends_at');
            $table->index('termination_scheduled_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
```

#### 2. Create Plans and Features Tables

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'central';

    public function up(): void
    {
        // Plans table
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 50)->unique();
            $table->decimal('price', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('interval', ['monthly', 'yearly'])->default('monthly');
            $table->integer('trial_days')->default(30);
            $table->jsonb('features')->default('{}');
            $table->jsonb('limits')->default('{}');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index('slug');
            $table->index('is_active');
        });

        // Plan limits table (for flexible configuration)
        Schema::create('plan_limits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained()->onDelete('cascade');
            $table->string('resource_type', 50);
            $table->integer('limit_value')->comment('-1 for unlimited or custom');
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();
            
            $table->unique(['plan_id', 'resource_type']);
            $table->index('resource_type');
        });

        // Plan features table
        Schema::create('plan_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained()->onDelete('cascade');
            $table->string('feature_key', 100);
            $table->boolean('enabled')->default(true);
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();
            
            $table->unique(['plan_id', 'feature_key']);
            $table->index('feature_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('plan_limits');
        Schema::dropIfExists('plans');
    }
};
```

#### 3. Create Subscriptions Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'central';

    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->uuid('account_id');
            $table->foreignId('plan_id')->constrained();
            
            // Status
            $table->enum('status', [
                'trialing',
                'active',
                'past_due',
                'canceled',
                'paused'
            ])->index();
            
            // Billing periods
            $table->timestamp('current_period_start');
            $table->timestamp('current_period_end')->index();
            $table->timestamp('trial_ends_at')->nullable();
            
            // Cancellation
            $table->timestamp('canceled_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            
            // Grace period
            $table->timestamp('grace_period_ends_at')->nullable();
            
            // Stripe integration
            $table->string('stripe_subscription_id')->nullable()->unique();
            $table->string('stripe_customer_id')->nullable()->index();
            $table->string('stripe_status')->nullable();
            
            // Metadata
            $table->jsonb('metadata')->default('{}');
            
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('account_id')
                  ->references('id')
                  ->on('accounts')
                  ->onDelete('cascade');
                  
            // Indexes
            $table->index(['account_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
```

#### 4. Create Activity Logging Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'central';

    public function up(): void
    {
        Schema::create('account_activities', function (Blueprint $table) {
            $table->id();
            $table->uuid('account_id')->index();
            $table->unsignedBigInteger('admin_id')->nullable();
            $table->string('action', 100)->index();
            $table->text('description');
            $table->jsonb('metadata')->default('{}');
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
            
            $table->foreign('account_id')
                  ->references('id')
                  ->on('accounts')
                  ->onDelete('cascade');
                  
            $table->foreign('admin_id')
                  ->references('id')
                  ->on('system_admins')
                  ->onDelete('set null');
                  
            // Composite index for efficient queries
            $table->index(['account_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_activities');
    }
};
```

### Running Central Migrations

```bash
# Run central migrations
php artisan migrate --path=database/migrations/central --database=central

# Create custom command for central migrations
php artisan make:command MigrateCentralCommand
```

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class MigrateCentralCommand extends Command
{
    protected $signature = 'tenants:migrate:central {--fresh : Wipe the database}';
    protected $description = 'Run central database migrations';

    public function handle(): int
    {
        $this->info('Running central database migrations...');

        $command = $this->option('fresh') ? 'migrate:fresh' : 'migrate';

        Artisan::call($command, [
            '--database' => 'central',
            '--path' => 'database/migrations/central',
        ]);

        $this->info(Artisan::output());

        return Command::SUCCESS;
    }
}
```

## Tenant Database Management

### Tenant Database Service

```php
<?php

namespace App\Services\Tenancy;

use App\Models\Account;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class TenantDatabaseService
{
    /**
     * Create a new tenant database
     */
    public function createDatabase(Account $tenant): void
    {
        $databaseName = $tenant->getDatabaseName();

        try {
            // Create database
            DB::connection('central')->statement(
                "CREATE DATABASE \"{$databaseName}\" WITH OWNER = postgres ENCODING = 'UTF8'"
            );

            Log::info("Created database for tenant", [
                'tenant_id' => $tenant->id,
                'database' => $databaseName
            ]);

            // Update tenant record
            $tenant->update(['database' => $databaseName]);

        } catch (\Exception $e) {
            Log::error("Failed to create tenant database", [
                'tenant_id' => $tenant->id,
                'database' => $databaseName,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Run migrations for tenant
     */
    public function runMigrations(Account $tenant): void
    {
        tenancy()->initialize($tenant);

        try {
            Artisan::call('migrate', [
                '--database' => 'tenant',
                '--path' => 'database/migrations/tenant',
                '--force' => true,
            ]);

            Log::info("Ran migrations for tenant", [
                'tenant_id' => $tenant->id,
                'output' => Artisan::output()
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to run tenant migrations", [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage()
            ]);

            throw $e;
        } finally {
            tenancy()->end();
        }
    }

    /**
     * Seed tenant database
     */
    public function seedDatabase(Account $tenant): void
    {
        tenancy()->initialize($tenant);

        try {
            Artisan::call('db:seed', [
                '--database' => 'tenant',
                '--class' => 'TenantDatabaseSeeder',
                '--force' => true,
            ]);

            Log::info("Seeded database for tenant", [
                'tenant_id' => $tenant->id
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to seed tenant database", [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage()
            ]);

            throw $e;
        } finally {
            tenancy()->end();
        }
    }

    /**
     * Drop tenant database
     */
    public function dropDatabase(Account $tenant): void
    {
        $databaseName = $tenant->getDatabaseName();

        try {
            // Terminate active connections
            $this->terminateConnections($databaseName);

            // Drop database
            DB::connection('central')->statement(
                "DROP DATABASE IF EXISTS \"{$databaseName}\""
            );

            Log::info("Dropped database for tenant", [
                'tenant_id' => $tenant->id,
                'database' => $databaseName
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to drop tenant database", [
                'tenant_id' => $tenant->id,
                'database' => $databaseName,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Terminate active database connections
     */
    protected function terminateConnections(string $databaseName): void
    {
        DB::connection('central')->statement("
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '{$databaseName}'
            AND pid <> pg_backend_pid()
        ");
    }

    /**
     * Check if database exists
     */
    public function databaseExists(string $databaseName): bool
    {
        $result = DB::connection('central')->select("
            SELECT datname FROM pg_database WHERE datname = ?
        ", [$databaseName]);

        return count($result) > 0;
    }

    /**
     * Get database size
     */
    public function getDatabaseSize(Account $tenant): int
    {
        $databaseName = $tenant->getDatabaseName();

        $result = DB::connection('central')->select("
            SELECT pg_database_size(?) as size
        ", [$databaseName]);

        return $result[0]->size ?? 0;
    }

    /**
     * Get database statistics
     */
    public function getDatabaseStats(Account $tenant): array
    {
        tenancy()->initialize($tenant);

        try {
            $stats = [
                'size_bytes' => $this->getDatabaseSize($tenant),
                'size_formatted' => $this->formatBytes($this->getDatabaseSize($tenant)),
                'tables' => $this->getTableCount(),
                'records' => $this->getRecordCounts(),
            ];

            return $stats;

        } finally {
            tenancy()->end();
        }
    }

    protected function getTableCount(): int
    {
        $result = DB::connection('tenant')->select("
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
        ");

        return $result[0]->count ?? 0;
    }

    protected function getRecordCounts(): array
    {
        $tables = [
            'users' => 'Users',
            'assets' => 'Assets',
            'work_orders' => 'Work Orders',
            'manufacturing_orders' => 'Manufacturing Orders',
        ];

        $counts = [];

        foreach ($tables as $table => $label) {
            try {
                $count = DB::connection('tenant')->table($table)->count();
                $counts[$label] = $count;
            } catch (\Exception $e) {
                $counts[$label] = 0;
            }
        }

        return $counts;
    }

    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $factor = floor((strlen($bytes) - 1) / 3);

        return sprintf("%.2f %s", $bytes / pow(1024, $factor), $units[$factor]);
    }
}
```

### Database Creation Job

```php
<?php

namespace App\Jobs\Tenancy;

use App\Jobs\TenantAwareJob;
use App\Models\Account;
use App\Services\Tenancy\TenantDatabaseService;
use App\Services\AuditService;

class CreateTenantDatabaseJob extends TenantAwareJob
{
    protected TenantDatabaseService $databaseService;

    public function __construct(string $tenantId)
    {
        parent::__construct($tenantId);
        $this->databaseService = app(TenantDatabaseService::class);
    }

    protected function handleTenantJob(): void
    {
        $tenant = Account::find($this->tenantId);

        if (!$tenant) {
            return;
        }

        // Create database
        $this->databaseService->createDatabase($tenant);

        // Run migrations
        $this->databaseService->runMigrations($tenant);

        // Seed database
        $this->databaseService->seedDatabase($tenant);

        // Log activity
        AuditService::logTenantActivity($tenant, 'database_created', 'Tenant database created and initialized');

        // Notify tenant
        $tenant->notify(new TenantDatabaseReadyNotification());
    }
}
```

## Migration Strategy

### Organizing Migrations

```
database/
├── migrations/
│   ├── central/          # Central database migrations
│   │   ├── 2024_01_01_create_accounts_table.php
│   │   └── 2024_01_02_create_plans_table.php
│   └── tenant/           # Tenant database migrations
│       ├── 2024_01_01_create_users_table.php
│       └── 2024_01_02_create_assets_table.php
```

### Move Existing Migrations

```bash
# Create directories
mkdir -p database/migrations/tenant
mkdir -p database/migrations/central

# Move existing migrations to tenant directory
mv database/migrations/*.php database/migrations/tenant/
```

### Update Existing Migrations

Remove `protected $connection = 'xxx';` from existing migrations as they'll run in tenant context:

```php
// Before
class CreateUsersTable extends Migration
{
    protected $connection = 'pgsql'; // Remove this
    
    public function up()
    {
        // ...
    }
}

// After
class CreateUsersTable extends Migration
{
    public function up()
    {
        // Same implementation, no connection specified
    }
}
```

### Create Tenant Migration Command

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Account;

class MigrateTenantCommand extends Command
{
    protected $signature = 'tenants:migrate
                          {--tenant= : Specific tenant ID}
                          {--all : Migrate all tenants}
                          {--fresh : Wipe the database}';
    
    protected $description = 'Run migrations for tenant(s)';

    public function handle(): int
    {
        if ($this->option('all')) {
            return $this->migrateAllTenants();
        }

        if ($tenantId = $this->option('tenant')) {
            return $this->migrateTenant($tenantId);
        }

        $this->error('Please specify --tenant=ID or --all');
        return Command::FAILURE;
    }

    protected function migrateAllTenants(): int
    {
        $tenants = Account::where('status', '!=', 'terminated')->get();
        
        $bar = $this->output->createProgressBar($tenants->count());
        $bar->start();

        foreach ($tenants as $tenant) {
            $this->migrateTenant($tenant->id);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        return Command::SUCCESS;
    }

    protected function migrateTenant(string $tenantId): int
    {
        $tenant = Account::find($tenantId);

        if (!$tenant) {
            $this->error("Tenant not found: {$tenantId}");
            return Command::FAILURE;
        }

        $this->info("Migrating tenant: {$tenant->name} ({$tenant->subdomain})");

        tenancy()->initialize($tenant);

        try {
            $command = $this->option('fresh') ? 'migrate:fresh' : 'migrate';

            $this->call($command, [
                '--database' => 'tenant',
                '--path' => 'database/migrations/tenant',
                '--force' => true,
            ]);

        } catch (\Exception $e) {
            $this->error("Migration failed: " . $e->getMessage());
            return Command::FAILURE;
        } finally {
            tenancy()->end();
        }

        return Command::SUCCESS;
    }
}
```

### Version-Controlled Migrations

Track migration versions for better control:

```php
<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;

class TenantMigrationVersion extends Model
{
    protected $connection = 'central';
    
    protected $fillable = [
        'account_id',
        'version',
        'batch',
        'migrated_at',
    ];

    protected $casts = [
        'migrated_at' => 'datetime',
    ];
}
```

## Data Seeding

### Tenant Database Seeder

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class TenantDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            TenantRolesAndPermissionsSeeder::class,
            TenantUnitsOfMeasureSeeder::class,
            TenantAssetTypesSeeder::class,
            TenantWorkOrderCategoriesSeeder::class,
            TenantDefaultSettingsSeeder::class,
            TenantAdminUserSeeder::class,
        ]);
    }
}
```

### Roles and Permissions Seeder

```php
<?php

namespace Database\Seeders\Tenant;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class TenantRolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // Users
            'view users',
            'create users',
            'edit users',
            'delete users',
            'manage roles',
            
            // Assets
            'view assets',
            'create assets',
            'edit assets',
            'delete assets',
            
            // Work Orders
            'view work orders',
            'create work orders',
            'edit work orders',
            'delete work orders',
            'execute work orders',
            
            // Production
            'view production',
            'manage production',
            'execute production',
            
            // Settings
            'manage settings',
            'manage integrations',
            'view reports',
            'export data',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission, 'guard_name' => 'web']);
        }

        // Create roles
        $roles = [
            'Administrator' => Permission::all(),
            'Manager' => [
                'view users',
                'view assets',
                'create assets',
                'edit assets',
                'view work orders',
                'create work orders',
                'edit work orders',
                'execute work orders',
                'view production',
                'manage production',
                'view reports',
                'export data',
            ],
            'Technician' => [
                'view assets',
                'view work orders',
                'execute work orders',
                'view production',
                'execute production',
            ],
            'Viewer' => [
                'view assets',
                'view work orders',
                'view production',
                'view reports',
            ],
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            $role = Role::create(['name' => $roleName, 'guard_name' => 'web']);
            
            if ($rolePermissions instanceof \Illuminate\Database\Eloquent\Collection) {
                $role->givePermissionTo($rolePermissions);
            } else {
                $role->givePermissionTo($rolePermissions);
            }
        }
    }
}
```

### Units of Measure Seeder

```php
<?php

namespace Database\Seeders\Tenant;

use Illuminate\Database\Seeder;
use App\Models\Production\UnitOfMeasure;

class TenantUnitsOfMeasureSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            // Length
            ['code' => 'M', 'name' => 'Meter', 'category' => 'Length'],
            ['code' => 'CM', 'name' => 'Centimeter', 'category' => 'Length'],
            ['code' => 'MM', 'name' => 'Millimeter', 'category' => 'Length'],
            ['code' => 'KM', 'name' => 'Kilometer', 'category' => 'Length'],
            ['code' => 'IN', 'name' => 'Inch', 'category' => 'Length'],
            ['code' => 'FT', 'name' => 'Foot', 'category' => 'Length'],
            ['code' => 'YD', 'name' => 'Yard', 'category' => 'Length'],
            
            // Weight
            ['code' => 'KG', 'name' => 'Kilogram', 'category' => 'Weight'],
            ['code' => 'G', 'name' => 'Gram', 'category' => 'Weight'],
            ['code' => 'MG', 'name' => 'Milligram', 'category' => 'Weight'],
            ['code' => 'T', 'name' => 'Metric Ton', 'category' => 'Weight'],
            ['code' => 'LB', 'name' => 'Pound', 'category' => 'Weight'],
            ['code' => 'OZ', 'name' => 'Ounce', 'category' => 'Weight'],
            
            // Volume
            ['code' => 'L', 'name' => 'Liter', 'category' => 'Volume'],
            ['code' => 'ML', 'name' => 'Milliliter', 'category' => 'Volume'],
            ['code' => 'M3', 'name' => 'Cubic Meter', 'category' => 'Volume'],
            ['code' => 'GAL', 'name' => 'Gallon', 'category' => 'Volume'],
            ['code' => 'QT', 'name' => 'Quart', 'category' => 'Volume'],
            
            // Time
            ['code' => 'SEC', 'name' => 'Second', 'category' => 'Time'],
            ['code' => 'MIN', 'name' => 'Minute', 'category' => 'Time'],
            ['code' => 'HR', 'name' => 'Hour', 'category' => 'Time'],
            ['code' => 'DAY', 'name' => 'Day', 'category' => 'Time'],
            
            // Quantity
            ['code' => 'PC', 'name' => 'Piece', 'category' => 'Quantity'],
            ['code' => 'SET', 'name' => 'Set', 'category' => 'Quantity'],
            ['code' => 'PR', 'name' => 'Pair', 'category' => 'Quantity'],
            ['code' => 'DOZ', 'name' => 'Dozen', 'category' => 'Quantity'],
            ['code' => 'BOX', 'name' => 'Box', 'category' => 'Quantity'],
        ];

        foreach ($units as $unit) {
            UnitOfMeasure::create($unit);
        }
    }
}
```

### Admin User Seeder

```php
<?php

namespace Database\Seeders\Tenant;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class TenantAdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Get admin email from account creation data
        $tenant = tenant();
        $adminEmail = $tenant->metadata['admin_email'] ?? 'admin@' . $tenant->subdomain . '.com';
        $adminName = $tenant->metadata['admin_name'] ?? 'Administrator';

        // Create admin user
        $admin = User::create([
            'name' => $adminName,
            'email' => $adminEmail,
            'password' => Hash::make($tenant->metadata['admin_password'] ?? 'password'),
            'email_verified_at' => now(),
            'timezone' => $tenant->metadata['timezone'] ?? 'UTC',
        ]);

        // Assign administrator role
        $admin->assignRole('Administrator');

        // Clear sensitive data from metadata
        unset($tenant->metadata['admin_password']);
        $tenant->save();
    }
}
```

### Version-Controlled Seeding

```php
<?php

namespace App\Services\Tenancy;

use App\Models\Account;
use Illuminate\Support\Facades\DB;

class TenantSeederVersionService
{
    protected array $seeders = [
        'v1.0' => [
            TenantRolesAndPermissionsSeeder::class,
            TenantUnitsOfMeasureSeeder::class,
            TenantAssetTypesSeeder::class,
        ],
        'v1.1' => [
            TenantWorkOrderCategoriesSeeder::class,
        ],
        'v1.2' => [
            TenantFailureModesSeeder::class,
        ],
    ];

    public function getCurrentVersion(Account $tenant): ?string
    {
        return $tenant->metadata['seeder_version'] ?? null;
    }

    public function updateToLatestVersion(Account $tenant): void
    {
        $currentVersion = $this->getCurrentVersion($tenant);
        $latestVersion = array_key_last($this->seeders);

        if ($currentVersion === $latestVersion) {
            return;
        }

        tenancy()->initialize($tenant);

        try {
            DB::beginTransaction();

            foreach ($this->seeders as $version => $seeders) {
                if ($this->shouldRunVersion($version, $currentVersion)) {
                    foreach ($seeders as $seederClass) {
                        (new $seederClass)->run();
                    }
                }
            }

            $tenant->metadata = array_merge($tenant->metadata, [
                'seeder_version' => $latestVersion
            ]);
            $tenant->save();

            DB::commit();

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        } finally {
            tenancy()->end();
        }
    }

    protected function shouldRunVersion(string $version, ?string $currentVersion): bool
    {
        if (!$currentVersion) {
            return true;
        }

        return version_compare($version, $currentVersion, '>');
    }
}
```

## Database Lifecycle

### Account Creation Flow

```php
<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Domain;
use App\Services\Tenancy\TenantDatabaseService;
use Illuminate\Support\Facades\DB;

class AccountService
{
    protected TenantDatabaseService $databaseService;

    public function __construct(TenantDatabaseService $databaseService)
    {
        $this->databaseService = $databaseService;
    }

    public function createAccount(array $data): Account
    {
        DB::beginTransaction();

        try {
            // Create account
            $account = Account::create([
                'name' => $data['company_name'],
                'subdomain' => $data['subdomain'],
                'status' => 'active',
                'trial_ends_at' => now()->addDays(30),
                'metadata' => [
                    'admin_email' => $data['admin_email'],
                    'admin_name' => $data['admin_name'],
                    'admin_password' => $data['admin_password'],
                    'timezone' => $data['timezone'] ?? 'UTC',
                ],
            ]);

            // Create domain
            $account->domains()->create([
                'domain' => Domain::generateSubdomain($data['subdomain']),
                'is_primary' => true,
            ]);

            // Create subscription
            $account->subscriptions()->create([
                'plan_id' => $data['plan_id'],
                'status' => 'trialing',
                'current_period_start' => now(),
                'current_period_end' => now()->addDays(30),
                'trial_ends_at' => now()->addDays(30),
            ]);

            DB::commit();

            // Queue database creation
            CreateTenantDatabaseJob::dispatch($account->id);

            return $account;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
```

### Account Suspension

```php
<?php

namespace App\Services;

use App\Models\Account;
use App\Services\AuditService;

class AccountSuspensionService
{
    public function suspendAccount(Account $account, string $reason): void
    {
        DB::transaction(function () use ($account, $reason) {
            $account->update([
                'status' => 'suspended',
                'suspension_reason' => $reason,
                'suspended_at' => now(),
            ]);

            // Log activity
            AuditService::logTenantActivity(
                $account,
                'account_suspended',
                "Account suspended: {$reason}"
            );

            // Notify tenant
            $account->notify(new AccountSuspendedNotification($reason));
        });
    }

    public function reactivateAccount(Account $account): void
    {
        DB::transaction(function () use ($account) {
            $account->update([
                'status' => 'active',
                'suspension_reason' => null,
                'suspended_at' => null,
            ]);

            // Log activity
            AuditService::logTenantActivity(
                $account,
                'account_reactivated',
                'Account reactivated'
            );

            // Notify tenant
            $account->notify(new AccountReactivatedNotification());
        });
    }
}
```

### Account Termination

```php
<?php

namespace App\Services;

use App\Models\Account;
use App\Services\Tenancy\TenantDatabaseService;
use App\Services\StorageService;
use Illuminate\Support\Facades\DB;

class AccountTerminationService
{
    protected TenantDatabaseService $databaseService;
    protected StorageService $storageService;

    public function __construct(
        TenantDatabaseService $databaseService,
        StorageService $storageService
    ) {
        $this->databaseService = $databaseService;
        $this->storageService = $storageService;
    }

    public function scheduleTermination(Account $account): void
    {
        $account->update([
            'termination_scheduled_at' => now()->addDays(30),
        ]);

        // Schedule job
        TerminateAccountJob::dispatch($account->id)
            ->delay(now()->addDays(30));

        // Notify tenant
        $account->notify(new AccountTerminationScheduledNotification());
    }

    public function terminateAccount(Account $account): void
    {
        DB::transaction(function () use ($account) {
            // Update status
            $account->update([
                'status' => 'terminated',
                'terminated_at' => now(),
            ]);

            // Cancel subscriptions
            if ($account->subscription) {
                $account->subscription->update([
                    'status' => 'canceled',
                    'canceled_at' => now(),
                ]);
            }

            // Log activity
            AuditService::logTenantActivity(
                $account,
                'account_terminated',
                'Account terminated'
            );
        });

        // Drop database (outside transaction)
        try {
            $this->databaseService->dropDatabase($account);
        } catch (\Exception $e) {
            Log::error("Failed to drop database for terminated account", [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Clean up storage
        try {
            $this->storageService->deleteAccountStorage($account);
        } catch (\Exception $e) {
            Log::error("Failed to clean up storage for terminated account", [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function exportAccountData(Account $account): string
    {
        // Implementation for data export before termination
        // Returns path to exported data
    }
}
```

## Performance Optimization

### Database Connection Pooling

Configure PgBouncer for connection pooling:

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
# Central database
maintenance_os_central = host=localhost port=5432 dbname=maintenance_os_central

# Tenant database pool
tenant_* = host=localhost port=5432 auth_user=app_user

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600
```

### Query Optimization

```php
<?php

namespace App\Models\Traits;

trait OptimizedQueries
{
    /**
     * Cache heavy queries per tenant
     */
    public function scopeCachedCount($query, int $ttl = 300)
    {
        $key = 'tenant:' . tenant()->id . ':count:' . $this->getTable();
        
        return Cache::remember($key, $ttl, function () use ($query) {
            return $query->count();
        });
    }

    /**
     * Efficient existence check
     */
    public function scopeExistsOptimized($query)
    {
        return $query->select(DB::raw(1))->limit(1)->exists();
    }
}
```

### Index Management

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Account;
use Illuminate\Support\Facades\DB;

class OptimizeTenantDatabasesCommand extends Command
{
    protected $signature = 'tenants:optimize-databases';
    protected $description = 'Optimize tenant databases (vacuum, analyze, reindex)';

    public function handle(): int
    {
        $tenants = Account::where('status', 'active')->get();
        
        foreach ($tenants as $tenant) {
            $this->info("Optimizing database for: {$tenant->subdomain}");
            
            tenancy()->initialize($tenant);
            
            try {
                // Vacuum analyze
                DB::connection('tenant')->statement('VACUUM ANALYZE');
                
                // Reindex if needed
                if ($this->shouldReindex($tenant)) {
                    DB::connection('tenant')->statement('REINDEX DATABASE CONCURRENTLY ' . $tenant->getDatabaseName());
                }
                
                $this->info("✓ Optimization complete");
                
            } catch (\Exception $e) {
                $this->error("✗ Optimization failed: " . $e->getMessage());
            } finally {
                tenancy()->end();
            }
        }
        
        return Command::SUCCESS;
    }

    protected function shouldReindex(Account $tenant): bool
    {
        // Logic to determine if reindex is needed
        // Based on last reindex date, database size, etc.
        return false;
    }
}
```

## Backup and Recovery

### Automated Backup System

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Account;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class BackupTenantDatabasesCommand extends Command
{
    protected $signature = 'tenants:backup
                          {--tenant= : Specific tenant ID}
                          {--all : Backup all tenants}';
    
    protected $description = 'Backup tenant databases';

    public function handle(): int
    {
        if ($this->option('all')) {
            return $this->backupAllTenants();
        }

        if ($tenantId = $this->option('tenant')) {
            return $this->backupTenant($tenantId);
        }

        $this->error('Please specify --tenant=ID or --all');
        return Command::FAILURE;
    }

    protected function backupAllTenants(): int
    {
        $tenants = Account::where('status', '!=', 'terminated')->get();
        
        foreach ($tenants as $tenant) {
            $this->backupTenant($tenant->id);
        }

        return Command::SUCCESS;
    }

    protected function backupTenant(string $tenantId): int
    {
        $tenant = Account::find($tenantId);

        if (!$tenant) {
            $this->error("Tenant not found: {$tenantId}");
            return Command::FAILURE;
        }

        $this->info("Backing up: {$tenant->name}");

        try {
            $backupPath = $this->performBackup($tenant);
            $this->uploadToS3($tenant, $backupPath);
            $this->cleanupLocalBackup($backupPath);
            
            $this->info("✓ Backup complete");

        } catch (\Exception $e) {
            $this->error("✗ Backup failed: " . $e->getMessage());
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }

    protected function performBackup(Account $tenant): string
    {
        $database = $tenant->getDatabaseName();
        $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
        $filename = "{$database}_{$timestamp}.sql.gz";
        $path = storage_path("backups/{$filename}");

        // Ensure directory exists
        if (!file_exists(storage_path('backups'))) {
            mkdir(storage_path('backups'), 0755, true);
        }

        // Perform backup
        $command = sprintf(
            'PGPASSWORD=%s pg_dump -h %s -U %s -d %s | gzip > %s',
            escapeshellarg(config('database.connections.tenant.password')),
            escapeshellarg(config('database.connections.tenant.host')),
            escapeshellarg(config('database.connections.tenant.username')),
            escapeshellarg($database),
            escapeshellarg($path)
        );

        exec($command, $output, $exitCode);

        if ($exitCode !== 0) {
            throw new \Exception("pg_dump failed with exit code: {$exitCode}");
        }

        return $path;
    }

    protected function uploadToS3(Account $tenant, string $localPath): void
    {
        $s3Path = "backups/tenants/{$tenant->id}/" . basename($localPath);
        
        Storage::disk('s3')->putFileAs(
            dirname($s3Path),
            new \Illuminate\Http\File($localPath),
            basename($s3Path)
        );

        // Update tenant metadata
        $tenant->metadata = array_merge($tenant->metadata, [
            'last_backup' => [
                'date' => now()->toIso8601String(),
                'path' => $s3Path,
                'size' => filesize($localPath),
            ]
        ]);
        $tenant->save();
    }

    protected function cleanupLocalBackup(string $path): void
    {
        if (file_exists($path)) {
            unlink($path);
        }
    }
}
```

### Restore Process

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Account;
use App\Services\Tenancy\TenantDatabaseService;

class RestoreTenantDatabaseCommand extends Command
{
    protected $signature = 'tenants:restore
                          {tenant : Tenant ID}
                          {backup : Backup file path or S3 key}
                          {--force : Force restore without confirmation}';
    
    protected $description = 'Restore tenant database from backup';

    protected TenantDatabaseService $databaseService;

    public function __construct(TenantDatabaseService $databaseService)
    {
        parent::__construct();
        $this->databaseService = $databaseService;
    }

    public function handle(): int
    {
        $tenant = Account::find($this->argument('tenant'));

        if (!$tenant) {
            $this->error('Tenant not found');
            return Command::FAILURE;
        }

        if (!$this->option('force')) {
            if (!$this->confirm("This will overwrite the current database for {$tenant->name}. Continue?")) {
                return Command::SUCCESS;
            }
        }

        try {
            $this->info("Restoring database for: {$tenant->name}");

            // Download backup if from S3
            $backupPath = $this->prepareBackupFile($this->argument('backup'));

            // Drop existing database
            $this->databaseService->dropDatabase($tenant);

            // Create new database
            $this->databaseService->createDatabase($tenant);

            // Restore from backup
            $this->restoreDatabase($tenant, $backupPath);

            // Cleanup
            $this->cleanupBackupFile($backupPath);

            $this->info("✓ Restore complete");

        } catch (\Exception $e) {
            $this->error("✗ Restore failed: " . $e->getMessage());
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }

    protected function restoreDatabase(Account $tenant, string $backupPath): void
    {
        $database = $tenant->getDatabaseName();

        $command = sprintf(
            'PGPASSWORD=%s gunzip -c %s | psql -h %s -U %s -d %s',
            escapeshellarg(config('database.connections.tenant.password')),
            escapeshellarg($backupPath),
            escapeshellarg(config('database.connections.tenant.host')),
            escapeshellarg(config('database.connections.tenant.username')),
            escapeshellarg($database)
        );

        exec($command, $output, $exitCode);

        if ($exitCode !== 0) {
            throw new \Exception("psql restore failed with exit code: {$exitCode}");
        }
    }
}
```

## Monitoring

### Database Health Check

```php
<?php

namespace App\Services\Monitoring;

use App\Models\Account;
use Illuminate\Support\Facades\DB;

class DatabaseHealthService
{
    public function checkTenantHealth(Account $tenant): array
    {
        tenancy()->initialize($tenant);

        try {
            $health = [
                'status' => 'healthy',
                'database' => $tenant->getDatabaseName(),
                'connection' => $this->checkConnection(),
                'size' => $this->getDatabaseSize($tenant),
                'statistics' => $this->getDatabaseStats(),
                'slow_queries' => $this->getSlowQueries(),
                'lock_status' => $this->checkLocks(),
            ];

            if (!$health['connection']) {
                $health['status'] = 'unhealthy';
            }

            return $health;

        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
        } finally {
            tenancy()->end();
        }
    }

    protected function checkConnection(): bool
    {
        try {
            DB::connection('tenant')->getPdo();
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    protected function getDatabaseStats(): array
    {
        $stats = DB::connection('tenant')->select("
            SELECT
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10
        ");

        return $stats;
    }

    protected function getSlowQueries(): array
    {
        $queries = DB::connection('tenant')->select("
            SELECT
                query,
                calls,
                total_time,
                mean_time,
                max_time
            FROM pg_stat_statements
            WHERE mean_time > 100
            ORDER BY mean_time DESC
            LIMIT 10
        ");

        return $queries;
    }

    protected function checkLocks(): array
    {
        $locks = DB::connection('tenant')->select("
            SELECT
                pid,
                usename,
                application_name,
                client_addr,
                backend_start,
                state,
                wait_event_type,
                wait_event
            FROM pg_stat_activity
            WHERE wait_event IS NOT NULL
            AND state != 'idle'
        ");

        return $locks;
    }
}
```

This completes the comprehensive database and migrations implementation guide for the multi-tenant architecture.

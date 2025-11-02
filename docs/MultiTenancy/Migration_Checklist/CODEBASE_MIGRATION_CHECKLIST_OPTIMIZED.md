# Multi-Tenant Migration Checklist - Optimized Approach

## Overview

This checklist leverages Laravel Tenancy's built-in features to minimize custom code and complexity. By using the package's automatic functionality, we reduce the migration effort by approximately 60%.

## Pre-Migration Preparation

### 1. Environment Setup ✓

- [ ] **Install Laravel Tenancy Package**
  ```bash
  composer require stancl/tenancy
  php artisan vendor:publish --provider="Stancl\Tenancy\TenancyServiceProvider" --tag=config
  php artisan vendor:publish --provider="Stancl\Tenancy\TenancyServiceProvider" --tag=migrations
  ```

- [ ] **Update .env**
  ```env
  # Central domains (package will identify non-tenant domains)
  CENTRAL_DOMAINS="localhost,maintenance-os.com,www.maintenance-os.com,admin.maintenance-os.com"
  
  # Session configuration for subdomains
  SESSION_DOMAIN=.maintenance-os.com
  ```

### 2. Database Setup

- [ ] **Create Central Database**
  ```bash
  createdb maintenance_os_central -O postgres -E UTF8
  ```

- [ ] **Configure Connections in database.php**
  ```php
  'central' => [
      'driver' => 'pgsql',
      'host' => env('DB_HOST', '127.0.0.1'),
      'port' => env('DB_PORT', '5432'),
      'database' => 'maintenance_os_central',
      // ... standard config
  ],
  ```

## Core Implementation

### 3. Account Model (Minimal Setup)

- [ ] **Create Account Model**
  ```php
  use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
  use Stancl\Tenancy\Contracts\TenantWithDatabase;
  use Stancl\Tenancy\Database\Concerns\HasDatabase;
  use Stancl\Tenancy\Database\Concerns\HasDomains;
  
  class Account extends BaseTenant implements TenantWithDatabase
  {
      use HasDatabase, HasDomains;
      
      // Package handles everything else!
  }
  ```

### 4. Configure Package Features

- [ ] **Update config/tenancy.php**
  ```php
  return [
      'tenant_model' => \App\Models\Account::class,
      
      // Enable automatic features
      'features' => [
          'database_creation' => true,
          'database_seeding' => true,
          'database_deletion' => true,
          'universal_routes' => true,
      ],
      
      // Use built-in bootstrappers
      'bootstrappers' => [
          \Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper::class,
          \Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper::class,
          \Stancl\Tenancy\Bootstrappers\FilesystemTenancyBootstrapper::class,
          \Stancl\Tenancy\Bootstrappers\QueueTenancyBootstrapper::class,
          \Stancl\Tenancy\Bootstrappers\RedisTenancyBootstrapper::class,
      ],
  ];
  ```

### 5. Migration Organization (Configuration-Based)

- [ ] **Create Migration Directories (Optional)**
  ```bash
  mkdir -p database/migrations/central
  mkdir -p database/migrations/tenant
  ```

- [ ] **Configure Migration Paths in config/tenancy.php**
  ```php
  'migration_parameters' => [
      '--path' => [
          database_path('migrations/tenant'),
      ],
      '--realpath' => true,
  ],
  ```

- [ ] **Alternative: Use Prefix-Based Organization**
  ```php
  // Keep all migrations in one directory
  // Prefix tenant migrations with 'tenant_'
  'migrations' => [
      'tenant_migrations_prefix' => 'tenant_',
  ],
  ```

- [ ] **Remove Connection Properties from Tenant Migrations**
  - Remove any `protected $connection = 'xyz';` from migrations
  - Package handles connection switching automatically

### 6. Minimal Route Setup

- [ ] **Update bootstrap/app.php**
  ```php
  ->withMiddleware(function (Middleware $middleware) {
      $middleware->group('tenant', [
          'web',
          \Stancl\Tenancy\Middleware\InitializeTenancyByDomain::class,
          \Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains::class,
      ]);
  })
  ```

- [ ] **Create Route Files**
  ```bash
  touch routes/tenant.php  # Move all app routes here
  ```

### 7. Update Controllers (Minimal Changes)

- [ ] **Controllers Work Automatically**
  - No changes needed - package handles context
  - Remove any manual database switching
  - Remove tenant ID passing

### 8. Update Models (Remove Complexity)

For each model:
- [ ] Remove `protected $connection` properties
- [ ] Remove any tenant scoping logic
- [ ] Keep business logic only

### 9. Simplify Jobs

- [ ] **Update Jobs to Use TenantAware**
  ```php
  use Stancl\Tenancy\Contracts\TenantAware;
  
  class MyJob implements ShouldQueue, TenantAware
  {
      public ?string $tenantId = null; // Package sets this
      
      // No manual context switching needed!
  }
  ```

## Event-Driven Setup

### 10. Configure Event Listeners

- [ ] **Listen to Package Events**
  ```php
  // EventServiceProvider
  protected $listen = [
      \Stancl\Tenancy\Events\TenantCreated::class => [
          \App\Listeners\SendWelcomeEmail::class,
      ],
      \Stancl\Tenancy\Events\DatabaseSeeded::class => [
          \App\Listeners\NotifyTenantReady::class,
      ],
  ];
  ```

### 11. Remove Custom Infrastructure

- [ ] **Delete These Classes/Files:**
  - ❌ TenantDatabaseService
  - ❌ CreateTenantDatabaseJob
  - ❌ Custom tenant bootstrappers
  - ❌ Manual migration runners
  - ❌ All custom domain validation classes
  - ❌ DNS regex patterns and alpha_dash usage
  - ❌ Complex closure validations
  - ❌ Custom cache prefixing logic
  - ❌ Manual storage path management

## Testing Updates

### 12. Simplify Tests

- [ ] **Update TestCase.php**
  ```php
  protected function setUp(): void
  {
      parent::setUp();
      
      // Simple tenant setup
      $this->tenant = Account::create([
          'name' => 'Test Company',
          'subdomain' => 'test',
      ]);
  }
  ```

- [ ] **Use Package Test Helpers**
  ```php
  // Run in tenant context
  $this->tenant->run(function () {
      // Test code here
  });
  ```

## Data Seeding

### 13. Tenant Seeder (Automatic Context)

- [ ] **Create TenantDatabaseSeeder**
  ```php
  class TenantDatabaseSeeder extends Seeder
  {
      public function run(): void
      {
          // Already in tenant context!
          $this->call([
              RolesSeeder::class,
              DefaultDataSeeder::class,
          ]);
      }
  }
  ```

## Quick Implementation Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| Setup | Package installation, config | 2 hours |
| Models | Account model, remove complexity | 2 hours |
| Routes | Middleware, route files | 1 hour |
| Events | Event listeners setup | 2 hours |
| Cleanup | Remove custom code | 1 hour |
| Testing | Update tests | 2 hours |

**Total: ~10 hours** (vs 23 days for custom implementation)

## Package Commands Setup

### 14. Configure Command Usage

- [ ] **Remove Custom Tenant Commands**
  - Delete custom health check commands
  - Delete custom backup commands
  - Delete complex maintenance commands

- [ ] **Create Simple Commands for tenants:run**
  ```php
  // app/Console/Commands/HealthCheckCommand.php
  class HealthCheckCommand extends Command
  {
      protected $signature = 'app:health-check';
      
      public function handle(): void
      {
          $this->info('Tenant: ' . tenant('id'));
          $this->info('Users: ' . User::count());
      }
  }
  ```

- [ ] **Update Admin Controllers**
  ```php
  // Use package commands
  Artisan::call('tenants:migrate', ['--tenants' => $tenantIds]);
  Artisan::call('tenants:run', [
      'commandname' => 'cache:clear',
      '--tenants' => $tenantIds
  ]);
  ```

- [ ] **Document Available Commands**
  ```bash
  # Core operations
  php artisan tenants:list
  php artisan tenants:migrate
  php artisan tenants:seed
  php artisan tenants:migrate-fresh --seed
  
  # Run any command
  php artisan tenants:run cache:clear
  php artisan tenants:run down
  php artisan tenants:run optimize
  php artisan tenants:run db:dump --path=backups
  
  # Target specific tenants
  php artisan tenants:run command --tenants=id1,id2
  ```

## Performance Optimizations

### 15. Implement Caching Strategies

- [ ] **Add Caching to Tenant Stats with Laravel Tenancy Cache Tags**
  ```php
  // In Account model
  public function getDatabaseStats(): array
  {
      // Use cache tags for better organization
      return Cache::tags(['tenant', $this->id, 'stats'])
          ->remember('database_stats', 60, function () {
              // Stats calculation logic
          });
  }
  ```

- [ ] **Create Admin Service for Cached Queries with Tags**
  ```php
  // app/Services/AdminTenantService.php
  class AdminTenantService
  {
      public function getTenantStatistics(): array
      {
          return Cache::tags(['admin', 'tenants', 'statistics'])
              ->remember('tenant_stats', 300, function () {
                  // Optimized queries with selective loading
              });
      }
  }
  ```

- [ ] **Optimize Query Loading**
  ```php
  // Use selective column loading
  Account::query()
      ->select(['id', 'name', 'subdomain', 'status'])
      ->with(['domains:tenant_id,domain'])
      ->paginate();
  ```

- [ ] **Implement Cache Clearing with Tags**
  ```php
  public function clearStatsCache(): void
  {
      // Clear all cache entries for this tenant
      Cache::tags(['tenant', $this->id])->flush();
      
      // Or clear specific cache groups
      Cache::tags(['tenant', $this->id, 'stats'])->flush();
  }
  ```

## Verification Steps

### 16. Test Core Functionality

- [ ] **Create Test Tenant**
  ```php
  $tenant = Account::create([
      'name' => 'Test Corp',
      'subdomain' => 'test',
  ]);
  // Database created automatically!
  ```

- [ ] **Verify Automatic Features**
  - [ ] Database created
  - [ ] Migrations run
  - [ ] Seeding complete
  - [ ] Domain accessible

### 17. Production Readiness

- [ ] **Performance**
  - [ ] Enable tenant lookup caching in config/tenancy.php
  - [ ] Configure connection pooling
  - [ ] Implement cache warming for admin dashboard
  - [ ] Use chunk loading for large tenant lists
  
- [ ] **Monitoring**
  - [ ] Set up event logging
  - [ ] Configure error tracking
  - [ ] Monitor cache hit rates
  - [ ] Track query performance

## Common Issues & Solutions

### Issue: Tenant not found
**Solution**: Check domain in domains table, clear route cache

### Issue: Migration not running
**Solution**: Check migration path in config/tenancy.php

### Issue: Session not shared
**Solution**: Set SESSION_DOMAIN in .env

## Rollback Plan

Since this is a fresh system:
1. Drop central database
2. Revert to single-tenant branch
3. Remove tenancy package

## Success Metrics

- [ ] All tests passing
- [ ] Tenant creation < 5 seconds
- [ ] Zero custom database management code
- [ ] Events firing correctly
- [ ] Admin can manage tenants
- [ ] Package commands working for all operations
- [ ] No complex custom tenant commands
- [ ] tenants:run used for maintenance tasks

## Key Benefits

1. **80% Less Code**: Package handles infrastructure
2. **Faster Development**: 10 hours vs 23 days
3. **More Reliable**: Battle-tested package
4. **Easier Maintenance**: Less custom code
5. **Better Performance**: Package optimizations

## Next Steps

1. Deploy to staging
2. Create first production tenant
3. Monitor performance
4. Document admin procedures

---

This optimized approach leverages Laravel Tenancy's built-in features to create a robust multi-tenant system with minimal custom code.

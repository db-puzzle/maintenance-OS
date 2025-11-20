# Tenant Isolation in Scheduled Jobs - Production Module

## Overview

This document explains how the Production Module's scheduled jobs maintain **absolute tenant isolation** in our multi-tenant system.

## Critical Security Requirement

**TENANT DATA MUST NEVER BE ACCESSIBLE ACROSS TENANT BOUNDARIES**

When a scheduled job runs for Tenant A, it must have ZERO access to data from Tenant B, Tenant C, or any other tenant.

## Implementation: CheckPendingSteps Safety Net

### The Problem

The `CheckPendingStepsJob` needs to run periodically to check for pending manufacturing steps that can be queued. However:

- Manufacturing data is **tenant-specific** (exists in `tenant_<uuid>` databases)
- Scheduled jobs run in the **central context** by default (no tenant initialized)
- Running in central context would cause "table does not exist" errors
- We need to run this check **for each tenant independently**

### The Solution: `tenants:run` Command

We use Laravel Tenancy's `tenants:run` command which provides automatic tenant isolation.

#### File: `app/Console/Commands/Production/CheckPendingSteps.php`

```php
class CheckPendingSteps extends Command
{
    protected $signature = 'production:check-pending-steps';
    
    public function handle(): int
    {
        // SAFETY CHECK: Verify we're in a tenant context
        if (!tenancy()->initialized) {
            $this->error('This command must be run via "tenants:run"');
            return 1;
        }
        
        // Execute in current tenant's context
        $job = new CheckPendingStepsJob();
        $job->handle();
        
        return 0;
    }
}
```

#### File: `routes/console.php`

```php
// Runs the command FOR EACH TENANT with complete isolation
Schedule::command('tenants:run production:check-pending-steps')
    ->everyFiveMinutes()
    ->name('check-pending-steps')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/production-step-safety-net.log'));
```

## How Tenant Isolation Works

### Execution Flow

```
Every 5 minutes, the scheduler triggers:
│
├─ tenants:run production:check-pending-steps
│
├─ Laravel Tenancy Package:
│  ├─ Queries central DB for all active tenants
│  ├─ For EACH tenant:
│  │  ├─ Initialize tenant context
│  │  ├─ Switch database connection to tenant_<uuid>
│  │  ├─ Run: production:check-pending-steps
│  │  │  ├─ Verify tenant context is initialized
│  │  │  ├─ Execute CheckPendingStepsJob logic
│  │  │  ├─ All DB queries go to current tenant's database ONLY
│  │  │  └─ Complete execution
│  │  ├─ Revert tenant context
│  │  └─ Restore central database connection
│  └─ Move to next tenant
└─ Complete
```

### Database Isolation Guarantees

When `tenancy()->initialized` is true:

1. **Database Connection**: Points to `tenant_<uuid>` database
2. **All Eloquent Models**: Query only from current tenant's database
3. **DB Facade**: Queries only from current tenant's database
4. **No Cross-Access**: Physical impossibility to access other tenant data

### Example: 3 Tenants

```
Tenant A (ID: abc-123):
├─ Context initialized: tenant_abc-123
├─ Database connection: tenant_abc-123
├─ Query: ManufacturingStep::where('status', 'pending')->get()
│  └─ SQL: SELECT * FROM tenant_abc-123.manufacturing_steps WHERE status = 'pending'
├─ Only sees Tenant A's 15 pending steps
└─ Context reverted

Tenant B (ID: def-456):
├─ Context initialized: tenant_def-456
├─ Database connection: tenant_def-456
├─ Query: ManufacturingStep::where('status', 'pending')->get()
│  └─ SQL: SELECT * FROM tenant_def-456.manufacturing_steps WHERE status = 'pending'
├─ Only sees Tenant B's 8 pending steps (completely different data)
└─ Context reverted

Tenant C (ID: ghi-789):
├─ Context initialized: tenant_ghi-789
├─ Database connection: tenant_ghi-789
├─ Query: ManufacturingStep::where('status', 'pending')->get()
│  └─ SQL: SELECT * FROM tenant_ghi-789.manufacturing_steps WHERE status = 'pending'
├─ Only sees Tenant C's 23 pending steps (completely different data)
└─ Context reverted
```

## Safety Mechanisms

### 1. Context Verification

The command includes an explicit check:

```php
if (!tenancy()->initialized) {
    $this->error('ERROR: This command must be run in tenant context');
    return 1;
}
```

This prevents accidental execution outside tenant context.

### 2. Physical Database Separation

Each tenant has a completely separate PostgreSQL database:
- `tenant_abc-123` (Tenant A's database)
- `tenant_def-456` (Tenant B's database)
- `tenant_ghi-789` (Tenant C's database)

There is no way for queries in `tenant_abc-123` to access tables in `tenant_def-456`.

### 3. Laravel Tenancy Bootstrappers

The package's `DatabaseTenancyBootstrapper` automatically:
- Switches the default database connection
- Ensures all queries use the tenant connection
- Prevents accidental central database access

### 4. Automatic Context Management

The `tenants:run` command handles:
- Context initialization (no manual code needed)
- Context cleanup (prevents context leaks)
- Error isolation (errors in Tenant A don't affect Tenant B)

## Testing Tenant Isolation

### Manual Test 1: Reject Central Context

```bash
# This SHOULD fail with an error
php artisan production:check-pending-steps

# Expected output:
# ERROR: This command must be run in tenant context via "tenants:run"
```

### Manual Test 2: Run for All Tenants

```bash
# This SHOULD succeed and run for each tenant
php artisan tenants:run production:check-pending-steps

# Expected output:
# Tenant: acme-corp
# Processing tenant: Acme Corporation (ID: abc-123)
# Completed processing for tenant: Acme Corporation
# Tenant: widgets-inc
# Processing tenant: Widgets Inc (ID: def-456)
# Completed processing for tenant: Widgets Inc
```

### Manual Test 3: Run for Specific Tenant

```bash
# Run for a single tenant only
php artisan tenants:run production:check-pending-steps --tenants=abc-123

# Expected output:
# Tenant: acme-corp
# Processing tenant: Acme Corporation (ID: abc-123)
# Completed processing for tenant: Acme Corporation
```

## Other Scheduled Jobs

### Commands That Should Use `tenants:run`

Any scheduled command that accesses tenant-specific data should follow this pattern:

```php
// ✅ CORRECT: Runs for all tenants with isolation
Schedule::command('tenants:run work-orders:generate-from-routines')
    ->hourly();

// ❌ WRONG: Runs in central context, can't access tenant data
Schedule::command('work-orders:generate-from-routines')
    ->hourly();
```

### Commands That Should NOT Use `tenants:run`

Commands that manage central resources:

```php
// ✅ CORRECT: Central system maintenance
Schedule::command('backup:central-database')
    ->daily();

// ✅ CORRECT: System-wide cleanup
Schedule::command('cache:clear')
    ->weekly();
```

## Common Patterns

### Pattern 1: Tenant-Aware Command

```php
class TenantSpecificCommand extends Command
{
    public function handle(): int
    {
        // Verify tenant context
        if (!tenancy()->initialized) {
            $this->error('Must run via tenants:run');
            return 1;
        }
        
        // Your tenant-specific logic here
        // All queries automatically scoped to current tenant
        
        return 0;
    }
}

// Schedule it
Schedule::command('tenants:run app:tenant-command')
    ->daily();
```

### Pattern 2: Central Command That Affects All Tenants

```php
class ProcessAllTenantsCommand extends Command
{
    public function handle(): int
    {
        Account::all()->each(function ($tenant) {
            $tenant->run(function () {
                // Your logic here
                // Runs in isolated tenant context
            });
        });
        
        return 0;
    }
}

// Schedule it (NO tenants:run needed, command handles iteration)
Schedule::command('app:process-all-tenants')
    ->daily();
```

## Monitoring & Logging

### Log Output

The scheduled job logs to: `storage/logs/production-step-safety-net.log`

Each tenant's execution is logged separately:

```
[2025-11-05 12:00:00] Processing tenant: Acme Corporation (ID: abc-123)
[2025-11-05 12:00:02] Completed processing for tenant: Acme Corporation
[2025-11-05 12:00:02] Processing tenant: Widgets Inc (ID: def-456)
[2025-11-05 12:00:04] Completed processing for tenant: Widgets Inc
```

### Monitoring for Errors

If a tenant's execution fails:
- Only that tenant's execution fails
- Other tenants continue processing normally
- Error is logged with tenant context
- No data corruption across tenants

## Security Checklist

Before deploying any scheduled job that accesses tenant data:

- [ ] Does the command verify `tenancy()->initialized`?
- [ ] Is it scheduled with `tenants:run` prefix?
- [ ] Have you tested it manually with `tenants:run`?
- [ ] Have you verified it rejects central context execution?
- [ ] Does it log which tenant it's processing?
- [ ] Have you confirmed no hardcoded tenant IDs?
- [ ] Have you verified no cross-tenant queries?

## Summary

**Our tenant isolation is guaranteed by:**

1. ✅ Physical database separation (separate PostgreSQL databases)
2. ✅ Laravel Tenancy's `tenants:run` command (automatic context management)
3. ✅ Explicit context verification in commands
4. ✅ Automatic database connection switching
5. ✅ No shared data structures between tenant executions

**It is impossible for one tenant's scheduled job execution to access another tenant's data** when following this pattern.

## References

- Laravel Tenancy Documentation: https://tenancyforlaravel.com/
- Laravel Task Scheduling: https://laravel.com/docs/scheduling
- Multi-Tenancy Architecture: `/docs/MultiTenancy/QUEUE_ARCHITECTURE.md`











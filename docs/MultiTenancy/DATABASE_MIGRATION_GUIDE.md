# Database Migration and Seeding Guide

This guide provides step-by-step instructions for migrating and seeding both central and tenant databases in development and production environments.

## Table of Contents
- [Development Environment (Destructive)](#development-environment-destructive)
- [Production Environment (Non-Destructive)](#production-environment-non-destructive)
- [Troubleshooting](#troubleshooting)

---

## Development Environment (Destructive)

Use these commands when you want to **completely reset** your databases. This will **delete all data**.

### Prerequisites

1. Stop any running queue workers: `php artisan queue:restart`
2. Clear any cached data: `php artisan optimize:clear`

**Note:** No backup needed for development - you're intentionally wiping all data!

### Step 1: Fresh Migrate Central Database

This will drop all tables in the central database and recreate them:

```bash
php artisan migrate:fresh --database=central --path=database/migrations/central
```

**What this does:**
- Drops all tables in the central database
- Runs all migrations in `database/migrations/central/`
- Creates: tenants, domains, plans, subscriptions, admin_users, sessions, jobs, failed_jobs, cache, activity_log

### Step 2: Seed Central Database

This will populate the central database with initial data:

```bash
php artisan db:seed --class=CentralDatabaseSeeder --database=central
```

**What this does:**
- Creates the initial system administrator (via `AdminUserSeeder`)
- Creates subscription plans (via `CentralPlansSeeder`)

### Step 3: Delete All Tenant Databases

Since you want to start fresh in development, you need to delete all existing tenant databases:

```bash
# Option A: Using the built-in test cleanup command
php artisan test:clean-db --no-interaction

# Option B: Manual cleanup (PostgreSQL)
# This will drop all databases starting with 'tenant_'
psql -U your_db_user -d postgres -c "
SELECT 'DROP DATABASE IF EXISTS \"' || datname || '\";'
FROM pg_database
WHERE datname LIKE 'tenant_%'
AND datistemplate = false;
" | grep DROP | psql -U your_db_user -d postgres

# Option C: Delete tenant records (this will trigger database deletion via events)
php artisan tinker
>>> App\Models\Account::all()->each->delete();
>>> exit
```

### Step 4: (Optional) Create a Test Tenant

If you want to create a fresh tenant for testing:

```bash
php artisan tinker
```

Then in Tinker:

```php
use App\Models\Account;
use App\Models\Plan;

// Get a plan (or create one if seeding didn't run)
$plan = Plan::first();

// Create a test tenant
$tenant = Account::create([
    'name' => 'Test Company',
    'subdomain' => 'testcompany',
    'status' => 'active',
    'trial_ends_at' => now()->addDays(30),
    'metadata' => [
        'admin_email' => 'admin@test.com',
        'admin_name' => 'Test Admin',
        'admin_password' => bcrypt('password'),
    ],
]);

// Create subscription
$tenant->subscription()->create([
    'plan_id' => $plan->id,
    'status' => 'trialing',
    'trial_ends_at' => $tenant->trial_ends_at,
]);

echo "Tenant created: {$tenant->subdomain}\n";
exit
```

**What happens automatically:**
1. Domain is created (via Account model observer)
2. Tenant database is created (via `CreateDatabase` job)
3. Migrations are run (via `MigrateDatabase` job)
4. Database is seeded (via `CreateTenantAdmin` job)

The tenant database seeding includes:
- Permissions (via `TenantPermissionSeeder`)
- Roles (via `TenantRolesSeeder`)
- Settings (via `TenantSettingsSeeder`)
- Default data including units of measure (via `TenantDefaultDataSeeder`)
- Admin user from metadata

### Complete Development Reset (All-in-One)

```bash
#!/bin/bash
# Complete development database reset

echo "🔄 Starting complete database reset..."

# Clear caches
echo "📦 Clearing caches..."
php artisan optimize:clear

# Stop queue workers
echo "🛑 Restarting queue workers..."
php artisan queue:restart

# Fresh migrate central database
echo "🗄️  Resetting central database..."
php artisan migrate:fresh --database=central --path=database/migrations/central

# Seed central database
echo "🌱 Seeding central database..."
php artisan db:seed --class=CentralDatabaseSeeder --database=central

# Clean up all tenant databases
echo "🧹 Cleaning up tenant databases..."
php artisan test:clean-db --no-interaction

echo "✅ Database reset complete!"
echo "📝 You can now create test tenants via the application or Tinker"
```

Save this as `scripts/dev-reset-databases.sh` and run with `bash scripts/dev-reset-databases.sh`

---

## Production Environment (Non-Destructive)

Use these commands to safely update your production databases **without losing data**.

### Prerequisites

1. **CRITICAL:** Backup your databases first!
2. Enable maintenance mode: `php artisan down`
3. Stop queue workers gracefully: `php artisan queue:restart`

### Step 1: Backup Databases

```bash
# Backup central database
pg_dump -U your_db_user -d maintenance_os_central > backup_central_$(date +%Y%m%d_%H%M%S).sql

# Backup all tenant databases
for db in $(psql -U your_db_user -d postgres -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%'"); do
    pg_dump -U your_db_user -d $db > backup_${db}_$(date +%Y%m%d_%H%M%S).sql
done
```

### Step 2: Run Central Database Migrations

This will run any new migrations on the central database without dropping existing data:

```bash
php artisan migrate --database=central --path=database/migrations/central --force
```

**What this does:**
- Runs only new, pending migrations
- Preserves all existing data
- Updates the schema as needed
- `--force` flag is required in production (otherwise Laravel prompts for confirmation)

### Step 3: (Optional) Seed New Central Data

Only run this if you have new seeders that add data (not reset data):

```bash
php artisan db:seed --class=CentralDatabaseSeeder --database=central --force
```

**Note:** Most seeders use `firstOrCreate()` or similar methods to avoid duplicates, but verify your seeders are production-safe before running.

### Step 4: Run Tenant Database Migrations

This will migrate ALL tenant databases:

```bash
php artisan tenants:migrate --force
```

**What this does:**
- Runs pending migrations on ALL tenant databases
- Executes in parallel (faster)
- Preserves all existing tenant data
- `--force` flag is required in production

**Alternative:** Migrate a specific tenant:

```bash
# Get tenant ID first
php artisan tenants:list

# Then migrate specific tenant
php artisan tenants:run "App\Models\Account::find('tenant-uuid-here')" --artisan="migrate --force"
```

### Step 5: (Optional) Seed Tenant Databases

Only if you have new tenant data to seed:

```bash
php artisan tenants:seed --force
```

**Note:** This runs `TenantDatabaseSeeder` on all tenants. Ensure your seeders are idempotent (safe to run multiple times).

### Step 6: Clear Caches and Restart Services

```bash
# Clear application cache
php artisan cache:clear

# Clear config cache
php artisan config:cache

# Clear route cache
php artisan route:cache

# Clear view cache
php artisan view:cache

# Restart queue workers
php artisan queue:restart

# Bring application back online
php artisan up
```

### Complete Production Update (All-in-One)

```bash
#!/bin/bash
# Production database update script

set -e  # Exit on error

echo "🚀 Starting production database update..."

# Check if we're in production
if [ "$APP_ENV" != "production" ]; then
    echo "⚠️  Warning: APP_ENV is not 'production'"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Backup databases
echo "💾 Creating database backups..."
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump -U your_db_user -d maintenance_os_central > "backup_central_${timestamp}.sql"
echo "✅ Central database backed up"

# Enable maintenance mode
echo "🔧 Enabling maintenance mode..."
php artisan down --retry=60

# Restart queue workers
echo "🛑 Restarting queue workers..."
php artisan queue:restart

# Run central migrations
echo "🗄️  Running central database migrations..."
php artisan migrate --database=central --path=database/migrations/central --force

# Run tenant migrations
echo "🏢 Running tenant database migrations..."
php artisan tenants:migrate --force

# Clear and rebuild caches
echo "🧹 Clearing and rebuilding caches..."
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Disable maintenance mode
echo "✅ Disabling maintenance mode..."
php artisan up

echo "🎉 Production database update complete!"
echo "📊 Don't forget to monitor your application logs and queue workers"
```

Save this as `scripts/prod-update-databases.sh` and run with `bash scripts/prod-update-databases.sh`

---

## Migration Status and Verification

### Check Central Migration Status

```bash
php artisan migrate:status --database=central --path=database/migrations/central
```

### Check Tenant Migration Status

```bash
# All tenants
php artisan tenants:run migrate:status

# Specific tenant
php artisan tenants:run "App\Models\Account::where('subdomain', 'testcompany')->first()" --artisan="migrate:status"
```

### List All Tenants

```bash
php artisan tenants:list
```

---

## Understanding the Migration Structure

### Central Database Migrations

Location: `database/migrations/central/`

Tables created:
- `tenants` - Tenant accounts (accounts table)
- `domains` - Tenant subdomains
- `plans` - Subscription plans
- `subscriptions` - Tenant subscriptions
- `admin_users` - System administrators
- `sessions` - User sessions
- `jobs` - Queue jobs
- `failed_jobs` - Failed queue jobs
- `cache` - Cache storage
- `activity_log` - Activity logging

### Tenant Database Migrations

Location: `database/migrations/tenant/`

81 migration files including tables for:
- Users, teams, roles, permissions
- Assets, locations, asset hierarchies
- Work orders, maintenance routines
- Manufacturing orders, production data
- Items, BOMs, parts
- Skills, certifications
- Media library
- And more...

### Seeder Structure

**Central Seeders:**
- `CentralDatabaseSeeder` (main)
  - `AdminUserSeeder` - Creates system admin
  - `CentralPlansSeeder` - Creates subscription plans

**Tenant Seeders:**
- `TenantDatabaseSeeder` (main)
  - `TenantPermissionSeeder` - Creates permissions
  - `TenantRolesSeeder` - Creates roles
  - `TenantSettingsSeeder` - Creates settings
  - `TenantDefaultDataSeeder` - Creates default data (units of measure, etc.)
  - Creates admin user from tenant metadata

---

## Troubleshooting

### Issue: "Database already exists" error

```bash
# For PostgreSQL, manually drop and recreate
psql -U your_db_user -d postgres -c "DROP DATABASE IF EXISTS maintenance_os_central"
psql -U your_db_user -d postgres -c "CREATE DATABASE maintenance_os_central"
```

### Issue: Tenant database stuck/not deleting

```bash
# Terminate connections and drop manually
psql -U your_db_user -d postgres

SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname LIKE 'tenant_%' 
AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS "tenant_xxxxx";
```

### Issue: Migration already ran but not recorded

```bash
# Check migrations table
php artisan db --database=central
SELECT * FROM migrations;

# Manually mark as run (use with caution!)
INSERT INTO migrations (migration, batch) VALUES ('migration_file_name', 1);
```

### Issue: Seeder runs but creates duplicates

Check your seeder uses `firstOrCreate()`, `updateOrCreate()`, or proper uniqueness checks.

### Issue: Permission denied errors

Ensure your database user has proper permissions:

```sql
-- PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE maintenance_os_central TO your_db_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
```

---

## Important Notes

1. **Multi-Tenancy Context:** Laravel automatically switches database context when working with tenants. The package handles this via the `tenant()` helper.

2. **Queue Workers:** Always restart queue workers after migrations: `php artisan queue:restart`

3. **Production Safety:** The `--force` flag bypasses confirmation prompts. Only use in production deployment scripts.

4. **Tenant Creation:** When creating a tenant via `Account::create()`, the following happens automatically:
   - Domain creation (via observer)
   - Database creation (via `CreateDatabase` job)
   - Migration (via `MigrateDatabase` job)
   - Seeding (via `CreateTenantAdmin` job)

5. **Migration Paths:** Always specify `--path=database/migrations/central` for central migrations, otherwise Laravel runs tenant migrations on the central database!

6. **Testing:** The system includes `test:clean-db` command specifically for cleaning up test databases.

---

## Quick Reference

### Development Commands
```bash
# Reset everything
php artisan migrate:fresh --database=central --path=database/migrations/central
php artisan db:seed --class=CentralDatabaseSeeder --database=central
php artisan test:clean-db --no-interaction

# Check status
php artisan migrate:status --database=central --path=database/migrations/central
php artisan tenants:list
```

### Production Commands
```bash
# Safe updates
php artisan down
php artisan migrate --database=central --path=database/migrations/central --force
php artisan tenants:migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan up

# Check status
php artisan migrate:status --database=central --path=database/migrations/central
php artisan tenants:run migrate:status
```

---

## Related Documentation

- [Multi-Tenancy Implementation](./COMPREHENSIVE_IMPLEMENTATION_SPECIFICATION_OPTIMIZED.md)
- [Database Architecture](./Implementation_Guides/02_DATABASE_AND_MIGRATIONS_OPTIMIZED.md)
- [Queue Architecture](./QUEUE_ARCHITECTURE.md)


# Database Commands Quick Reference

Quick reference for common database migration and seeding commands. For detailed documentation, see `docs/MultiTenancy/DATABASE_MIGRATION_GUIDE.md`.

## 🛠️ Development (Destructive)

### Complete Reset (Recommended)
```bash
bash scripts/dev-reset-databases.sh
```

### Manual Step-by-Step
```bash
# 1. Reset central database
php artisan migrate:fresh --database=central --path=database/migrations/central

# 2. Seed central database
php artisan db:seed --class=CentralDatabaseSeeder --database=central

# 3. Delete all tenant databases
php artisan test:clean-db --no-interaction
```

## 🚀 Production (Non-Destructive)

### Complete Update (Recommended)
```bash
bash scripts/prod-update-databases.sh
```

### Manual Step-by-Step
```bash
# 1. Enable maintenance mode
php artisan down

# 2. Migrate central database
php artisan migrate --database=central --path=database/migrations/central --force

# 3. Migrate all tenant databases
php artisan tenants:migrate --force

# 4. Clear caches
php artisan optimize:clear
php artisan config:cache

# 5. Disable maintenance mode
php artisan up
```

## 📊 Status & Verification

```bash
# Check central migration status
php artisan migrate:status --database=central --path=database/migrations/central

# Check tenant migration status (all tenants)
php artisan tenants:run migrate:status

# List all tenants
php artisan tenants:list
```

## 🔍 Troubleshooting

```bash
# Clear all caches
php artisan optimize:clear

# Restart queue workers
php artisan queue:restart

# Check queue status
php artisan queue:monitor

# View recent logs
tail -f storage/logs/laravel.log
```

## 📝 Creating Test Tenants (Development)

```bash
php artisan tinker
```

Then:
```php
$tenant = App\Models\Account::create([
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

$tenant->subscription()->create([
    'plan_id' => App\Models\Plan::first()->id,
    'status' => 'trialing',
    'trial_ends_at' => $tenant->trial_ends_at,
]);

echo "✅ Tenant created: {$tenant->subdomain}\n";
exit
```

## 🎯 Common Tasks

### Reset Everything (Dev)
```bash
bash scripts/dev-reset-databases.sh
```

### Update Production Databases
```bash
bash scripts/prod-update-databases.sh
```

### Migrate Specific Tenant
```bash
# List tenants first
php artisan tenants:list

# Migrate specific tenant by ID
php artisan tenants:run "App\Models\Account::find('uuid-here')" --artisan="migrate --force"
```

### Seed Specific Tenant
```bash
php artisan tenants:run "App\Models\Account::where('subdomain', 'testcompany')->first()" --artisan="db:seed --class=TenantDatabaseSeeder --force"
```

## 🔗 Links

- Full Guide: `docs/MultiTenancy/DATABASE_MIGRATION_GUIDE.md`
- Dev Script: `scripts/dev-reset-databases.sh`
- Prod Script: `scripts/prod-update-databases.sh`


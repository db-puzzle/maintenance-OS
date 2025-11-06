# Redis Setup on Laravel Cloud for Multi-Tenancy

## Overview

This document provides step-by-step instructions for enabling Redis on Laravel Cloud to support automatic cache isolation in the multi-tenant application. Redis is required for `CacheTenancyBootstrapper` to function properly, as it's the only cache driver (besides Memcached) that supports cache tagging.

## Why Redis is Required

**Cache Tagging Support:**
- Laravel Tenancy's `CacheTenancyBootstrapper` uses cache tags for automatic tenant isolation
- Only Redis and Memcached support cache tagging in Laravel
- Array, Database, and File cache drivers do **NOT** support tagging

**Current Implementation:**
- ✅ Tests: Use manual key prefixing (works with array driver)
- ⚠️ Production: Requires Redis for automatic cache isolation via tags

## Laravel Cloud Redis Setup

### Step 1: Enable Redis in Laravel Cloud Dashboard

1. **Log in to Laravel Cloud Dashboard**
   - Navigate to: https://cloud.laravel.com
   - Select your project: `maintenance-OS`

2. **Enable Redis Cache**
   - Go to the "Cache" section
   - Click "Enable Redis"
   - Select cache configuration:
     - **Type:** Redis
     - **Memory:** Start with 256MB (can scale up later)
     - **Eviction Policy:** `allkeys-lru` (recommended)
   - Click "Save Configuration"

3. **Wait for Provisioning**
   - Laravel Cloud will provision a managed Redis instance
   - This typically takes 2-3 minutes
   - You'll receive a notification when complete

### Step 2: Configure Environment Variables

Laravel Cloud automatically injects Redis configuration into your environment. Verify the following variables are set:

```env
# Automatically set by Laravel Cloud
REDIS_CLIENT=phpredis
REDIS_HOST=your-redis-host.cache.laravel.cloud
REDIS_PASSWORD=auto-generated-secure-password
REDIS_PORT=6379

# Cache configuration
CACHE_STORE=redis
CACHE_PREFIX=maintenance_os_cache_
```

**Note:** You don't need to manually set these - Laravel Cloud handles it automatically when you enable Redis.

### Step 3: Update Cache Configuration (if needed)

Your `config/cache.php` is already configured correctly. The default store will automatically use Redis:

```php
// config/cache.php
'default' => env('CACHE_STORE', 'database'), // Will use 'redis' on Laravel Cloud

'stores' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => env('REDIS_CACHE_CONNECTION', 'cache'),
        'lock_connection' => env('REDIS_CACHE_LOCK_CONNECTION', 'default'),
    ],
],
```

### Step 4: Verify Redis is Working

After deploying, verify Redis is functioning:

```bash
# SSH into your Laravel Cloud environment (if available)
# Or use Laravel Cloud's web terminal

# Test Redis connection
php artisan tinker
>>> Cache::store('redis')->put('test_key', 'test_value', 60);
>>> Cache::store('redis')->get('test_key');
// Should return: "test_value"

# Test cache tagging (required for tenancy)
>>> Cache::tags(['test'])->put('tagged_key', 'tagged_value', 60);
>>> Cache::tags(['test'])->get('tagged_key');
// Should return: "tagged_value"

>>> exit
```

### Step 5: Enable CacheTenancyBootstrapper (Production Only)

Your `config/tenancy.php` already has `CacheTenancyBootstrapper` enabled:

```php
// config/tenancy.php
'bootstrappers' => [
    Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper::class,
    Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper::class,  // ✅ Enabled
    Stancl\Tenancy\Bootstrappers\FilesystemTenancyBootstrapper::class,
    Stancl\Tenancy\Bootstrappers\QueueTenancyBootstrapper::class,
    Stancl\Tenancy\Bootstrappers\RedisTenancyBootstrapper::class,
],

'cache' => [
    'tag_base' => 'tenant', // Cache keys auto-tagged with 'tenant{tenant_id}'
],
```

**Important:** This is already configured correctly. Once Redis is enabled on Laravel Cloud, cache isolation will work automatically - no code changes needed!

### Step 6: Deploy and Test

1. **Deploy to Laravel Cloud:**
   ```bash
   git add .
   git commit -m "Enable Redis cache for multi-tenancy"
   git push origin main
   ```

2. **Verify Automatic Cache Isolation:**
   
   After deployment, test that cache isolation works:
   
   ```bash
   # Via tinker on Laravel Cloud
   php artisan tinker
   
   # Create two test tenants
   >>> $tenant1 = \App\Models\Account::first();
   >>> $tenant2 = \App\Models\Account::skip(1)->first();
   
   # Test cache isolation
   >>> $tenant1->run(function() {
   ...     Cache::put('test_key', 'tenant_1_value', 60);
   ...     return Cache::get('test_key');
   ... });
   // Should return: "tenant_1_value"
   
   >>> $tenant2->run(function() {
   ...     Cache::put('test_key', 'tenant_2_value', 60);
   ...     return Cache::get('test_key');
   ... });
   // Should return: "tenant_2_value"
   
   >>> $tenant1->run(function() {
   ...     return Cache::get('test_key');
   ... });
   // Should return: "tenant_1_value" (isolated!)
   
   >>> exit
   ```

## Testing Configuration

### Local Development (Without Redis)

Your tests are configured to work without Redis using manual key prefixing:

```php
// tests/MultiTenancyTestCase.php
// CacheTenancyBootstrapper is disabled for tests
// Tests use manual prefixing: "tenant_{$tenantId}_key"
```

This allows tests to run locally without Redis while still verifying cache isolation logic.

### CI/CD Testing (Optional Redis)

If you want to test with Redis in CI/CD:

1. **GitHub Actions Example:**
   ```yaml
   services:
     redis:
       image: redis:7-alpine
       ports:
         - 6379:6379
       options: >-
         --health-cmd "redis-cli ping"
         --health-interval 10s
         --health-timeout 5s
         --health-retries 5
   ```

2. **Update Test Environment:**
   ```php
   // Can conditionally enable in tests if Redis is available
   if (extension_loaded('redis') && @fsockopen('127.0.0.1', 6379)) {
       config(['cache.default' => 'redis']);
   }
   ```

## Production Cache Configuration

### Cache Key Structure (Automatic with Redis)

When Redis is enabled, `CacheTenancyBootstrapper` automatically tags all cache operations:

```php
// Your code (no changes needed)
Cache::put('user_settings', $settings, 3600);

// Actual cache operation (automatic)
Cache::tags(['tenant' . $tenantId])->put('user_settings', $settings, 3600);
```

### Using Additional Tags

You can add more tags for better organization:

```php
// In your application code
Cache::tags(['stats', 'users'])->put('user_count', User::count(), 300);

// With CacheTenancyBootstrapper active, this becomes:
// Cache::tags(['tenant{id}', 'stats', 'users'])->put('user_count', ...)
```

### Clearing Cache Per Tenant

```php
// Clear all cache for a specific tenant
$tenant->run(function() {
    Cache::flush(); // Only clears this tenant's tagged cache
});

// Or from central context
tenancy()->initialize($tenant);
Cache::flush();
tenancy()->end();

// Clear specific cache groups
Cache::tags(['stats'])->flush(); // Clears stats for current tenant
```

## Performance Optimization

### Redis Configuration for Multi-Tenancy

Laravel Cloud's managed Redis is pre-configured optimally. However, if you need custom configuration:

```env
# Optional tuning (Laravel Cloud usually handles this)
REDIS_CLIENT=phpredis  # Faster than predis
REDIS_CACHE_CONNECTION=cache
```

### Memory Sizing Guidelines

**Starting Point:**
- **Small (< 10 tenants):** 256MB Redis
- **Medium (10-50 tenants):** 512MB Redis
- **Large (50-200 tenants):** 1GB Redis
- **Very Large (200+ tenants):** 2GB+ Redis

**Monitoring:**
- Laravel Cloud dashboard shows Redis memory usage
- Set up alerts for 80% memory usage
- Scale up as needed (zero downtime)

### Cache TTL Recommendations

```php
// Short-lived data (user sessions, temporary data)
Cache::put('temp_data', $data, 300); // 5 minutes

// Medium-lived data (user preferences, settings)
Cache::put('user_prefs', $prefs, 3600); // 1 hour

// Long-lived data (rarely changing, expensive to compute)
Cache::put('statistics', $stats, 86400); // 24 hours

// Very long-lived (static reference data)
Cache::remember('plans', 604800, fn() => Plan::all()); // 7 days
```

## Monitoring & Maintenance

### Laravel Cloud Dashboard

Monitor Redis through the Laravel Cloud dashboard:

1. **Metrics Available:**
   - Memory usage
   - Operations per second
   - Hit rate
   - Connection count
   - Network throughput

2. **Automatic Alerts:**
   - High memory usage (>80%)
   - High connection count
   - Cache evictions
   - Slow operations

### Clear All Cache (Emergency)

If needed, clear entire Redis cache:

```bash
# From Laravel Cloud terminal or local Artisan
php artisan cache:clear

# Or for all tenants
php artisan tenants:run cache:clear
```

## Migration Checklist

When deploying to Laravel Cloud with Redis:

- [ ] Redis enabled in Laravel Cloud dashboard
- [ ] CACHE_STORE=redis in environment
- [ ] Deploy latest code
- [ ] Verify cache isolation works (see Step 6 above)
- [ ] Monitor Redis memory usage for first few days
- [ ] Test cache clearing: `php artisan cache:clear`
- [ ] Test tenant cache isolation in production
- [ ] Set up memory usage alerts

## Rollback Plan

If Redis causes issues:

1. **Disable CacheTenancyBootstrapper temporarily:**
   ```php
   // config/tenancy.php
   'bootstrappers' => [
       DatabaseTenancyBootstrapper::class,
       // CacheTenancyBootstrapper::class,  // Disabled
       FilesystemTenancyBootstrapper::class,
       // ...
   ],
   ```

2. **Fall back to database cache:**
   ```env
   CACHE_STORE=database
   ```

3. **Update application code to use manual prefixing:**
   ```php
   // Use the pattern from tests
   $cacheKey = "tenant_{tenant()->id}_your_key";
   Cache::put($cacheKey, $value, $ttl);
   ```

## Cost Optimization

### Laravel Cloud Redis Pricing

- **256MB:** ~$15/month
- **512MB:** ~$30/month
- **1GB:** ~$60/month
- **2GB:** ~$120/month

**Optimization Tips:**
1. Use appropriate TTLs - don't cache data longer than needed
2. Clear old cache periodically
3. Monitor memory usage and scale only when needed
4. Use `remember()` instead of `rememberForever()`
5. Set eviction policy to `allkeys-lru` (removes least recently used items)

### Cache Warming Strategy

Warm critical cache after deployments:

```php
// artisan command: app/Console/Commands/WarmTenantCache.php
public function handle(): void
{
    Account::query()->where('status', 'active')->each(function ($tenant) {
        $tenant->run(function () {
            // Warm critical cache
            Cache::remember('roles', 3600, fn() => Role::all());
            Cache::remember('permissions', 3600, fn() => Permission::all());
            Cache::remember('settings', 3600, fn() => Setting::all());
        });
        
        $this->info("Warmed cache for tenant: {$tenant->name}");
    });
}
```

## Testing Redis Locally (Optional)

If you want to test Redis locally before deploying:

### Install Redis (macOS)

```bash
# Install via Homebrew
brew install redis

# Start Redis
brew services start redis

# Verify running
redis-cli ping
# Should return: PONG
```

### Update Local Environment

```env
# .env.local or .env
CACHE_STORE=redis
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

### Test Locally

```bash
# Run cache tests with Redis
php artisan test tests/Unit/MultiTenancy/Cache tests/Feature/MultiTenancy/Cache

# All tests should pass with automatic cache isolation
```

## Troubleshooting

### Issue: "This cache store does not support tagging"

**Cause:** Cache driver doesn't support tags (array, database, or file driver)

**Solution:** 
- Ensure `CACHE_STORE=redis` is set
- Verify Redis is running: `redis-cli ping`
- Check `config/cache.php` has Redis configured

### Issue: "Connection refused to Redis"

**Cause:** Redis server not running or unreachable

**Solution:**
- **Laravel Cloud:** Check dashboard - Redis should be "Running"
- **Local:** Start Redis: `brew services start redis` (macOS) or `sudo service redis-server start` (Linux)
- Verify connection: `redis-cli -h $REDIS_HOST -p $REDIS_PORT ping`

### Issue: High Memory Usage

**Cause:** Too much data cached or TTLs too long

**Solutions:**
1. Reduce cache TTLs
2. Clear old cache: `php artisan cache:clear`
3. Review what's being cached
4. Scale up Redis memory in Laravel Cloud
5. Implement cache warming only for critical data

### Issue: Cache Not Isolated Between Tenants

**Cause:** `CacheTenancyBootstrapper` not enabled or not working

**Solution:**
1. Verify bootstrapper is in config:
   ```bash
   php artisan tinker
   >>> config('tenancy.bootstrappers');
   # Should include CacheTenancyBootstrapper
   ```

2. Verify Redis supports tagging:
   ```bash
   php artisan tinker
   >>> Cache::tags(['test'])->put('key', 'value', 60);
   >>> Cache::tags(['test'])->get('key');
   # Should return: "value"
   ```

3. Check cache tag base is configured:
   ```bash
   php artisan tinker
   >>> config('tenancy.cache.tag_base');
   # Should return: "tenant"
   ```

## Best Practices

### 1. Cache Key Naming

```php
// Good - descriptive and scoped
Cache::remember('user_preferences_' . $userId, 3600, ...);
Cache::tags(['users', 'stats'])->remember('user_count', 300, ...);

// Avoid - too generic
Cache::remember('data', 3600, ...);
Cache::put('temp', $value, 60);
```

### 2. Appropriate TTLs

```php
// Very short (30 seconds - 5 minutes) - Frequently changing data
Cache::remember('recent_activity', 60, ...);

// Short (5 - 30 minutes) - Semi-dynamic data
Cache::remember('dashboard_stats', 300, ...);

// Medium (30 minutes - 2 hours) - Relatively stable data
Cache::remember('user_settings', 3600, ...);

// Long (2 - 24 hours) - Rarely changing data
Cache::remember('system_config', 43200, ...);

// Very long (1 - 7 days) - Static reference data
Cache::remember('all_roles', 604800, ...);
```

### 3. Cache Invalidation

```php
// When data changes, clear related cache
public function updateUserSettings($userId, $settings)
{
    // Update database
    User::find($userId)->update(['settings' => $settings]);
    
    // Clear cache
    Cache::forget('user_preferences_' . $userId);
    Cache::tags(['users', 'settings'])->flush();
}
```

### 4. Cache Warming

```php
// Warm cache after deployments or during low-traffic periods
public function warmCache()
{
    Cache::remember('roles', 3600, fn() => Role::all());
    Cache::remember('permissions', 3600, fn() => Permission::all());
    Cache::remember('active_plans', 3600, fn() => Plan::where('is_active', true)->get());
}
```

## Production Deployment Checklist

Before deploying to production with Redis:

- [ ] **Redis enabled** in Laravel Cloud dashboard
- [ ] **Environment verified** - CACHE_STORE=redis
- [ ] **Cache table migration** removed from critical path (optional with Redis)
- [ ] **Test cache isolation** in staging environment
- [ ] **Monitor memory usage** for first 48 hours
- [ ] **Set up alerts** for high memory usage (>80%)
- [ ] **Document cache keys** used in application
- [ ] **Plan for cache warming** post-deployment
- [ ] **Test cache clearing** works correctly
- [ ] **Verify tenant switching** maintains cache isolation

## Expected Behavior After Redis Setup

### Automatic Cache Isolation

```php
// Tenant 1 context
Cache::put('settings', ['theme' => 'dark'], 3600);

// Tenant 2 context (different tenant)
Cache::put('settings', ['theme' => 'light'], 3600);

// Each tenant gets their own value automatically!
// No manual prefixing needed - CacheTenancyBootstrapper handles it
```

### Cache Tags with Tenant Context

```php
// In tenant context
Cache::tags(['users'])->put('count', 100, 300);

// Actual cache operation (automatic):
// Cache::tags(['tenant{id}', 'users'])->put('count', 100, 300);

// Clearing is scoped to tenant
Cache::tags(['users'])->flush(); // Only clears this tenant's user cache
```

### Account Statistics Caching

Your `Account::getDatabaseStats()` will work seamlessly:

```php
// Current implementation uses manual prefixing (works with any driver)
$stats = $tenant->getDatabaseStats();

// With Redis, you could simplify to:
// Cache::tags(['stats'])->remember('database_stats', 60, ...)
// But current implementation is fine and works everywhere
```

## Summary

**Quick Setup:**
1. Enable Redis in Laravel Cloud dashboard (2 minutes)
2. Deploy your code (already configured correctly)
3. Verify it works (5 minutes of testing)
4. Done! Cache isolation is automatic

**What You Get:**
- ✅ Automatic cache isolation per tenant
- ✅ No code changes needed
- ✅ Better performance than database cache
- ✅ Cache tagging support for organization
- ✅ Managed by Laravel Cloud (no maintenance)

**Development vs Production:**
- **Development/Testing:** Manual key prefixing, array cache (tests pass)
- **Production:** Automatic isolation, Redis cache (CacheTenancyBootstrapper enabled)

The implementation already follows best practices and will work perfectly once Redis is enabled on Laravel Cloud!


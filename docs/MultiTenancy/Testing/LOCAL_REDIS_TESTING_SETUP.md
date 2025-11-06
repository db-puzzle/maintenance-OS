# Local Redis Setup for Multi-Tenancy Testing

## Overview

This guide provides options for setting up Redis locally to test cache tagging and tenant isolation. Cache isolation is a **critical security feature** that prevents data leakage between tenants, so testing it thoroughly is essential.

## Why Test Cache Isolation Locally?

**Security Risks Without Proper Cache Isolation:**
- ❌ Tenant A could access Tenant B's cached user data
- ❌ Session data could leak between tenants
- ❌ Cached permissions could be shared across tenants
- ❌ Business-sensitive cached data could be exposed

**With Redis + CacheTenancyBootstrapper:**
- ✅ Automatic cache tagging prevents cross-tenant access
- ✅ Each tenant's cache is completely isolated
- ✅ Cache::flush() only affects current tenant
- ✅ Zero chance of cache pollution

## Option 1: Homebrew (Recommended for macOS)

### Installation

```bash
# Install Redis via Homebrew
brew install redis

# Verify installation
redis-cli --version
# Should show: redis-cli 7.x.x
```

### Start Redis

```bash
# Option A: Start as a service (runs in background)
brew services start redis

# Option B: Start manually (foreground - useful for debugging)
redis-server /opt/homebrew/etc/redis.conf

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Configure for Testing

Update your `.env` or create `.env.testing`:

```env
# .env.testing
CACHE_STORE=redis
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0
```

### Stop Redis

```bash
# If started as service
brew services stop redis

# If started manually
# Press Ctrl+C in the terminal running redis-server
```

## Option 2: Docker (Cross-Platform)

### Using Docker Compose

Create a `docker-compose.test.yml` in your project root:

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  redis-test:
    image: redis:7-alpine
    container_name: maintenance-os-redis-test
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-test-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis-test-data:
    driver: local
```

### Start Redis

```bash
# Start Redis container
docker-compose -f docker-compose.test.yml up -d

# Verify running
docker ps | grep redis-test

# Test connection
docker exec -it maintenance-os-redis-test redis-cli ping
# Should return: PONG
```

### Configure for Testing

```env
# .env.testing
CACHE_STORE=redis
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0
```

### Stop Redis

```bash
# Stop container
docker-compose -f docker-compose.test.yml down

# Stop and remove data
docker-compose -f docker-compose.test.yml down -v
```

## Option 3: Laravel Sail (If Already Using Sail)

If you're using Laravel Sail, Redis is already available.

### Check sail configuration

```bash
# Check if Redis is in docker-compose.yml
cat docker-compose.yml | grep -A 5 redis
```

### If Redis not configured, add it:

```yaml
# docker-compose.yml (Sail's file)
services:
  redis:
    image: 'redis:alpine'
    ports:
      - '${FORWARD_REDIS_PORT:-6379}:6379'
    volumes:
      - 'sail-redis:/data'
    networks:
      - sail
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      retries: 3
      timeout: 5s
      
volumes:
  sail-redis:
    driver: local
```

### Start Sail with Redis

```bash
# Start Sail
./vendor/bin/sail up -d

# Test Redis
./vendor/bin/sail redis-cli ping
# Should return: PONG
```

## Option 4: Quick One-Line Redis (macOS)

For quick testing without installation:

```bash
# Run Redis in Docker without docker-compose
docker run --name redis-test -p 6379:6379 -d redis:7-alpine

# Test it
docker exec -it redis-test redis-cli ping

# Stop and remove
docker stop redis-test && docker rm redis-test
```

## Recommended Setup for This Project

I recommend **Option 1 (Homebrew)** for your macOS system:

```bash
# Install and start Redis
brew install redis
brew services start redis

# Verify it's running
redis-cli ping

# Create .env.testing with Redis config
cat > .env.testing << 'EOF'
APP_ENV=testing
APP_KEY=base64:57b17bnOWn1gGYxo2RJRO/p5wp2aVEHuikovTpXHiz4=
CACHE_STORE=redis
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
DB_CONNECTION=pgsql
DB_DATABASE=maintenance_os_test
QUEUE_CONNECTION=sync
MAIL_MAILER=array
EOF
```

## Update Tests to Use Redis When Available

I'll create an updated `MultiTenancyTestCase` that automatically uses Redis if available:

```php
// tests/MultiTenancyTestCase.php - Smart cache driver selection

protected function setUp(): void
{
    parent::setUp();
    
    // ... existing setup code ...
    
    // Use Redis if available, otherwise fall back to manual prefixing
    if ($this->isRedisAvailable()) {
        $this->useRedisCache();
    } else {
        $this->useArrayCacheWithManualPrefixing();
    }
}

protected function isRedisAvailable(): bool
{
    // Check if Redis extension is loaded
    if (!extension_loaded('redis')) {
        return false;
    }
    
    // Check if Redis server is reachable
    try {
        $redis = new \Redis();
        $connected = $redis->connect(
            env('REDIS_HOST', '127.0.0.1'),
            (int) env('REDIS_PORT', 6379),
            1 // 1 second timeout
        );
        $redis->close();
        return $connected;
    } catch (\Exception $e) {
        return false;
    }
}

protected function useRedisCache(): void
{
    config(['cache.default' => 'redis']);
    
    // Keep CacheTenancyBootstrapper enabled
    // No need to disable it - it will work with Redis
}

protected function useArrayCacheWithManualPrefixing(): void
{
    config(['cache.default' => 'array']);
    
    // Disable CacheTenancyBootstrapper (array driver doesn't support tags)
    $bootstrappers = config('tenancy.bootstrappers');
    $bootstrappers = array_filter($bootstrappers, function ($bootstrapper) {
        return $bootstrapper !== \Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper::class;
    });
    config(['tenancy.bootstrappers' => array_values($bootstrappers)]);
}
```

## Testing Security With Redis

Once Redis is running, you can test cache isolation thoroughly:

### Test 1: Basic Isolation

```bash
php artisan test tests/Unit/MultiTenancy/Cache --no-coverage

# With Redis, CacheTenancyBootstrapper will be active
# Tests will verify automatic tagging works
```

### Test 2: Security Test - Cross-Tenant Cache Access

Create a security-focused test:

```php
// tests/Feature/MultiTenancy/Security/CacheIsolationSecurityTest.php

public function test_tenant_cannot_access_another_tenants_cache(): void
{
    $tenant1 = $this->createAdditionalTenant();
    $tenant2 = $this->createAdditionalTenant();
    
    // Tenant 1 caches sensitive data
    $tenant1->run(function () {
        Cache::put('user_permissions', ['admin' => true], 3600);
        Cache::put('api_key', 'secret-key-tenant-1', 3600);
        Cache::put('customer_list', ['customer1', 'customer2'], 3600);
    });
    
    // Tenant 2 tries to access same keys
    $tenant2->run(function () {
        // Should NOT see tenant 1's data
        $this->assertNull(Cache::get('user_permissions'));
        $this->assertNull(Cache::get('api_key'));
        $this->assertNull(Cache::get('customer_list'));
        
        // Tenant 2 can only see their own data
        Cache::put('user_permissions', ['admin' => false], 3600);
        $this->assertEquals(['admin' => false], Cache::get('user_permissions'));
    });
    
    // Verify tenant 1's cache is still intact
    $tenant1->run(function () {
        $this->assertEquals(['admin' => true], Cache::get('user_permissions'));
        $this->assertEquals('secret-key-tenant-1', Cache::get('api_key'));
    });
    
    $this->cleanupAdditionalTenant($tenant1);
    $this->cleanupAdditionalTenant($tenant2);
}

public function test_cache_flush_does_not_affect_other_tenants(): void
{
    $tenant1 = $this->createAdditionalTenant();
    $tenant2 = $this->createAdditionalTenant();
    
    // Both tenants cache data
    $tenant1->run(function () {
        Cache::put('critical_data', 'tenant1_important', 3600);
    });
    
    $tenant2->run(function () {
        Cache::put('critical_data', 'tenant2_important', 3600);
    });
    
    // Tenant 1 flushes cache
    $tenant1->run(function () {
        Cache::flush(); // Should only clear tenant 1's cache
    });
    
    // Verify tenant 1's cache is cleared
    $tenant1->run(function () {
        $this->assertNull(Cache::get('critical_data'));
    });
    
    // CRITICAL: Tenant 2's cache should still exist
    $tenant2->run(function () {
        $this->assertEquals('tenant2_important', Cache::get('critical_data'));
    });
    
    $this->cleanupAdditionalTenant($tenant1);
    $this->cleanupAdditionalTenant($tenant2);
}
```

## Performance Testing With Redis

Test cache performance with real Redis:

```bash
# Run performance tests
php artisan test tests/Performance/MultiTenancy/CachePerformanceTest.php --no-coverage

# Expected improvements with Redis:
# - Faster cache operations (< 0.5s for 100 lookups vs < 1s)
# - Support for cache tags
# - Better concurrent access performance
```

## Continuous Integration Setup

### GitHub Actions with Redis

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: maintenance_os_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
          extensions: redis, pdo, pdo_pgsql
          
      - name: Install Dependencies
        run: composer install --no-interaction --prefer-dist
        
      - name: Run Multi-Tenancy Tests
        env:
          CACHE_STORE: redis
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: |
          php artisan test tests/Feature/MultiTenancy \
            tests/Unit/MultiTenancy \
            tests/Performance/MultiTenancy \
            --no-coverage
```

## Verification Checklist

After setting up Redis, verify everything works:

### 1. Check Redis Connection

```bash
redis-cli ping
# Expected: PONG

php artisan tinker
>>> Redis::connection()->ping();
# Expected: "+PONG"
>>> exit
```

### 2. Check PHP Redis Extension

```bash
php -m | grep redis
# Expected: redis

php -i | grep -A 3 "Redis Support"
# Should show redis extension details
```

### 3. Test Cache Tagging

```bash
php artisan tinker
>>> Cache::tags(['test'])->put('key', 'value', 60);
>>> Cache::tags(['test'])->get('key');
# Expected: "value"

>>> Cache::tags(['test'])->flush();
>>> Cache::tags(['test'])->get('key');
# Expected: null
>>> exit
```

### 4. Run Full Test Suite

```bash
# This should now work with Redis
php artisan test tests/Feature/MultiTenancy/Storage \
  tests/Unit/MultiTenancy/Cache \
  tests/Feature/MultiTenancy/Cache \
  tests/Performance/MultiTenancy \
  --no-coverage
  
# All 33 tests should pass
# Cache tests will now use CacheTenancyBootstrapper
```

## Updated Test Configuration

I'll create an updated `MultiTenancyTestCase` that automatically detects and uses Redis when available.


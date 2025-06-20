# Multi-Tenant Technical Architecture

## System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer (HAProxy/Nginx)             │
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
│  │  Middleware │ │  Controllers │ │     Services         │    │
│  │   Stack     │ │   & Routes   │ │  & Business Logic    │    │
│  └─────────────┘ └──────────────┘ └──────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                         Data Layer                               │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ Central DB  │ │  Tenant DBs  │ │   Redis Cache        │    │
│  │ (PostgreSQL)│ │ (PostgreSQL) │ │   (Clustered)        │    │
│  └─────────────┘ └──────────────┘ └──────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Database Architecture

### Central Database Schema

```sql
-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    plan_id INTEGER REFERENCES plans(id),
    trial_ends_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Domains table
CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    domain VARCHAR(255) UNIQUE NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id),
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    canceled_at TIMESTAMP,
    stripe_subscription_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'
);

-- Plans table
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    features JSONB NOT NULL,
    limits JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- System admins table
CREATE TABLE system_admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '{}',
    two_factor_secret VARCHAR(255),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    admin_id INTEGER REFERENCES system_admins(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_domains_tenant ON domains(tenant_id);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### Tenant Database Structure

Each tenant gets an isolated PostgreSQL database with the existing application schema. The database naming convention follows: `tenant_{uuid}`.

### Connection Management

```php
// Dynamic database connection configuration
class TenantDatabaseManager
{
    public function connect(Tenant $tenant): void
    {
        $config = [
            'driver' => 'pgsql',
            'host' => config('tenancy.db.host'),
            'port' => config('tenancy.db.port'),
            'database' => "tenant_{$tenant->uuid}",
            'username' => config('tenancy.db.username'),
            'password' => config('tenancy.db.password'),
            'charset' => 'utf8',
            'prefix' => '',
            'schema' => 'public',
            'sslmode' => 'prefer',
        ];

        config(['database.connections.tenant' => $config]);
        
        DB::purge('tenant');
        DB::reconnect('tenant');
        
        Schema::connection('tenant')->getConnection()->reconnect();
    }
}
```

## Middleware Architecture

### Middleware Stack Order

```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'web' => [
        // Standard Laravel middleware...
        \App\Http\Middleware\IdentifyTenant::class,
        \App\Http\Middleware\InitializeTenancy::class,
        \App\Http\Middleware\PreventAccessFromCentralDomains::class,
        \App\Http\Middleware\HandleInertiaRequests::class,
    ],
    
    'tenant' => [
        'auth:web',
        'verified',
        \App\Http\Middleware\EnsureValidSubscription::class,
        \App\Http\Middleware\EnforceTenantQuotas::class,
    ],
    
    'admin' => [
        'auth:admin',
        \App\Http\Middleware\RequireSystemAdmin::class,
        \App\Http\Middleware\LogAdminActivity::class,
    ],
];
```

### Key Middleware Components

```php
// IdentifyTenant Middleware
class IdentifyTenant
{
    public function handle($request, Closure $next)
    {
        $host = $request->getHost();
        $subdomain = explode('.', $host)[0];
        
        if ($subdomain === 'admin') {
            return $next($request);
        }
        
        $domain = Domain::where('domain', $host)->first();
        
        if (!$domain) {
            abort(404, 'Tenant not found');
        }
        
        $request->attributes->set('tenant', $domain->tenant);
        
        return $next($request);
    }
}
```

## Service Layer Architecture

### Core Services

```php
// TenantService
class TenantService
{
    public function create(array $data): Tenant
    {
        DB::beginTransaction();
        
        try {
            // Create tenant record
            $tenant = Tenant::create([
                'name' => $data['name'],
                'slug' => $data['slug'],
                'plan_id' => $data['plan_id'],
            ]);
            
            // Create database
            $this->createDatabase($tenant);
            
            // Run migrations
            $this->runMigrations($tenant);
            
            // Seed initial data
            $this->seedData($tenant);
            
            // Create domain
            $this->createDomain($tenant, $data['subdomain']);
            
            DB::commit();
            
            return $tenant;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->cleanup($tenant);
            throw $e;
        }
    }
}
```

### Repository Pattern Implementation

```php
// Base repository for tenant-scoped models
abstract class TenantRepository
{
    protected $model;
    
    public function __construct()
    {
        $this->model = $this->getModelClass();
    }
    
    protected function query()
    {
        return $this->model::on('tenant');
    }
    
    public function find($id)
    {
        return $this->query()->findOrFail($id);
    }
    
    public function create(array $data)
    {
        return $this->query()->create($data);
    }
    
    abstract protected function getModelClass(): string;
}
```

## Caching Strategy

### Cache Key Structure

```php
class TenantCacheManager
{
    private $tenant;
    
    public function __construct(Tenant $tenant)
    {
        $this->tenant = $tenant;
    }
    
    public function key(string $key): string
    {
        return "tenant:{$this->tenant->uuid}:{$key}";
    }
    
    public function tags(): array
    {
        return ["tenant:{$this->tenant->uuid}"];
    }
    
    public function remember(string $key, $ttl, Closure $callback)
    {
        return Cache::tags($this->tags())
            ->remember($this->key($key), $ttl, $callback);
    }
    
    public function flush(): void
    {
        Cache::tags($this->tags())->flush();
    }
}
```

### Redis Configuration

```php
// config/database.php
'redis' => [
    'client' => 'phpredis',
    
    'default' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD', null),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_DB', '0'),
    ],
    
    'cache' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD', null),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_CACHE_DB', '1'),
    ],
    
    'sessions' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD', null),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_SESSION_DB', '2'),
    ],
];
```

## Queue Architecture

### Queue Configuration

```php
// Queue job with tenant context
abstract class TenantAwareJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    protected $tenantId;
    
    public function __construct($tenantId)
    {
        $this->tenantId = $tenantId;
        $this->onQueue("tenant-{$tenantId}");
    }
    
    public function handle()
    {
        $tenant = Tenant::find($this->tenantId);
        
        tenancy()->initialize($tenant);
        
        $this->handleTenantJob();
        
        tenancy()->end();
    }
    
    abstract protected function handleTenantJob();
}
```

### Horizon Configuration

```php
// config/horizon.php
'defaults' => [
    'supervisor-tenant' => [
        'connection' => 'redis',
        'queue' => ['tenant-*'],
        'balance' => 'auto',
        'maxProcesses' => 10,
        'minProcesses' => 1,
        'balanceMaxShift' => 1,
        'balanceCooldown' => 3,
        'memory' => 128,
        'tries' => 3,
        'timeout' => 60,
        'nice' => 0,
    ],
],
```

## File Storage Architecture

### Storage Structure

```
storage/
├── app/
│   ├── central/           # Central system files
│   │   ├── logs/
│   │   └── temp/
│   └── tenants/          # Tenant-specific files
│       └── {tenant_uuid}/
│           ├── attachments/
│           ├── exports/
│           ├── imports/
│           └── temp/
└── logs/
    ├── central/          # System logs
    └── tenants/          # Tenant logs
        └── {tenant_uuid}/
```

### Filesystem Configuration

```php
// config/filesystems.php
'disks' => [
    'tenant' => [
        'driver' => 'local',
        'root' => storage_path('app/tenants/' . tenant('uuid')),
        'url' => env('APP_URL').'/storage',
        'visibility' => 'private',
    ],
    
    's3-tenant' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION'),
        'bucket' => env('AWS_BUCKET'),
        'url' => env('AWS_URL'),
        'path_prefix' => 'tenants/' . tenant('uuid'),
    ],
],
```

## Security Architecture

### Authentication Flow

```php
// Multi-guard authentication configuration
// config/auth.php
'guards' => [
    'web' => [
        'driver' => 'session',
        'provider' => 'users',
    ],
    
    'admin' => [
        'driver' => 'session',
        'provider' => 'admins',
    ],
],

'providers' => [
    'users' => [
        'driver' => 'eloquent',
        'model' => App\Models\User::class,
        'database' => 'tenant',
    ],
    
    'admins' => [
        'driver' => 'eloquent',
        'model' => App\Models\SystemAdmin::class,
        'database' => 'central',
    ],
],
```

### Request Validation

```php
// Tenant-aware validation
class TenantAwareRequest extends FormRequest
{
    protected function prepareForValidation()
    {
        $this->merge([
            'tenant_id' => tenant('id'),
        ]);
    }
    
    public function rules()
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                Rule::unique('users')->where(function ($query) {
                    return $query->where('tenant_id', tenant('id'));
                }),
            ],
        ];
    }
}
```

## Performance Optimization

### Database Connection Pooling

```yaml
# PgBouncer configuration
[databases]
central = host=127.0.0.1 port=5432 dbname=maintenance_os_central
tenant_pool = host=127.0.0.1 port=5432 auth_user=app_user

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600
```

### Query Optimization

```php
// Efficient tenant data loading
class OptimizedTenantQueries
{
    public function getDashboardData($tenantId)
    {
        return Cache::tags(["tenant:{$tenantId}"])
            ->remember("dashboard:{$tenantId}", 300, function () {
                return [
                    'assets' => Asset::count(),
                    'active_routines' => Routine::active()->count(),
                    'pending_executions' => RoutineExecution::pending()->count(),
                    'recent_activities' => $this->getRecentActivities(),
                ];
            });
    }
}
```

## Monitoring and Observability

### Logging Strategy

```php
// Tenant-aware logging
class TenantLogger
{
    public static function log($level, $message, array $context = [])
    {
        $context['tenant_id'] = tenant('id');
        $context['tenant_domain'] = tenant('domain');
        
        Log::channel('tenant')->{$level}($message, $context);
    }
}
```

### Metrics Collection

```php
// Prometheus metrics for multi-tenancy
class TenantMetrics
{
    public static function recordRequest($tenant, $duration, $status)
    {
        $metrics = app('prometheus');
        
        $metrics->getOrRegisterCounter(
            'tenant_requests_total',
            'Total requests per tenant',
            ['tenant_id', 'status']
        )->inc(['tenant_id' => $tenant->id, 'status' => $status]);
        
        $metrics->getOrRegisterHistogram(
            'tenant_request_duration_seconds',
            'Request duration per tenant',
            ['tenant_id'],
            [0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
        )->observe($duration, ['tenant_id' => $tenant->id]);
    }
}
```

## Deployment Architecture

### Container Configuration

```dockerfile
# Dockerfile for multi-tenant Laravel
FROM php:8.2-fpm

# Install dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libzip-dev \
    unzip \
    && docker-php-ext-install pdo pdo_pgsql zip

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Configure PHP
COPY php.ini /usr/local/etc/php/

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Application setup
WORKDIR /var/www
COPY . .
RUN composer install --no-dev --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data storage bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maintenance-os-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: maintenance-os
  template:
    metadata:
      labels:
        app: maintenance-os
    spec:
      containers:
      - name: app
        image: maintenance-os:latest
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: host
        - name: REDIS_HOST
          value: redis-service
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# Automated backup script

# Backup central database
pg_dump -h $CENTRAL_DB_HOST -U $DB_USER -d maintenance_os_central \
  -f /backups/central/central_$(date +%Y%m%d_%H%M%S).sql

# Backup each tenant database
psql -h $CENTRAL_DB_HOST -U $DB_USER -d maintenance_os_central \
  -t -c "SELECT uuid FROM tenants WHERE status = 'active'" | \
  while read tenant_id; do
    pg_dump -h $DB_HOST -U $DB_USER -d tenant_$tenant_id \
      -f /backups/tenants/$tenant_id/backup_$(date +%Y%m%d_%H%M%S).sql
  done

# Sync to S3
aws s3 sync /backups s3://$BACKUP_BUCKET/backups/
```

### Failover Configuration

```nginx
# Nginx configuration for automatic failover
upstream backend {
    server app1.maintenance-os.com:9000 weight=5;
    server app2.maintenance-os.com:9000 weight=5;
    server app3.maintenance-os.com:9000 backup;
}

server {
    listen 443 ssl;
    server_name *.maintenance-os.com;
    
    location / {
        proxy_pass http://backend;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}
``` 
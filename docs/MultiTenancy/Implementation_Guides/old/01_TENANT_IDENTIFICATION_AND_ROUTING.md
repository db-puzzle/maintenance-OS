# Tenant Identification and Routing Implementation Guide

## Overview

This guide provides detailed implementation steps for setting up tenant identification and routing using subdomains with Laravel Tenancy package.

## Table of Contents

1. [Package Installation](#package-installation)
2. [Configuration](#configuration)
3. [Domain Setup](#domain-setup)
4. [Middleware Implementation](#middleware-implementation)
5. [Route Configuration](#route-configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Package Installation

### Step 1: Install Laravel Tenancy

```bash
composer require stancl/tenancy
```

### Step 2: Publish Configuration

```bash
php artisan vendor:publish --provider="Stancl\Tenancy\TenancyServiceProvider" --tag=config
php artisan vendor:publish --provider="Stancl\Tenancy\TenancyServiceProvider" --tag=migrations
```

### Step 3: Configure Service Provider

```php
// bootstrap/providers.php
return [
    App\Providers\AppServiceProvider::class,
    App\Providers\TenancyServiceProvider::class, // Add this
];
```

## Configuration

### Update config/tenancy.php

```php
<?php

return [
    /**
     * Tenant Model
     */
    'tenant_model' => \App\Models\Account::class,

    /**
     * Tenant ID Generator
     */
    'id_generator' => Stancl\Tenancy\UUIDGenerator::class,

    /**
     * Central Domains
     */
    'central_domains' => [
        'maintenance-os.com',
        'www.maintenance-os.com',
        'admin.maintenance-os.com',
        'api.maintenance-os.com',
        // Add staging domains
        'staging.maintenance-os.com',
        'admin.staging.maintenance-os.com',
    ],

    /**
     * Tenant Identification
     */
    'identification' => [
        'resolvers' => [
            \Stancl\Tenancy\Resolvers\DomainTenantResolver::class,
        ],
    ],

    /**
     * Features
     */
    'features' => [
        'universal_routes' => true,
        'database_creation' => true,
        'database_seeding' => true,
        'database_deletion' => true,
        'cache_tenant_lookup' => true,
    ],

    /**
     * Bootstrappers
     */
    'bootstrappers' => [
        \Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper::class,
        \Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper::class,
        \Stancl\Tenancy\Bootstrappers\FilesystemTenancyBootstrapper::class,
        \Stancl\Tenancy\Bootstrappers\QueueTenancyBootstrapper::class,
        \App\Tenancy\Bootstrappers\RedisTenancyBootstrapper::class,
        \App\Tenancy\Bootstrappers\MediaLibraryBootstrapper::class,
    ],

    /**
     * Database
     */
    'database' => [
        'central_connection' => 'central',
        'tenant_connection' => 'tenant',
        
        'prefix' => 'tenant_',
        'suffix' => '',
        
        'managers' => [
            'pgsql' => [
                'driver' => 'pgsql',
                'host' => env('DB_HOST'),
                'port' => env('DB_PORT'),
                'database' => null,
                'username' => env('DB_USERNAME'),
                'password' => env('DB_PASSWORD'),
                'charset' => 'utf8',
                'prefix' => '',
                'prefix_indexes' => true,
                'schema' => 'public',
                'sslmode' => 'prefer',
            ],
        ],
    ],

    /**
     * Cache
     */
    'cache' => [
        'tag_base' => 'tenant',
        'tenant_lookup_cache_ttl' => 3600, // seconds
    ],

    /**
     * Filesystem
     */
    'filesystem' => [
        'suffix_base' => 'tenant',
        'disks' => [
            'local',
            'public',
            's3',
        ],
    ],

    /**
     * Redis
     */
    'redis' => [
        'prefixed_connections' => [
            'default',
            'cache',
            'queue',
        ],
        'prefix_base' => 'tenant',
    ],

    /**
     * Migration Parameters
     */
    'migration_parameters' => [
        '--force' => true,
        '--path' => [database_path('migrations/tenant')],
        '--schema-path' => database_path('schema/tenant-schema.sql'),
    ],

    /**
     * Seeder Parameters
     */
    'seeder_parameters' => [
        '--class' => 'TenantDatabaseSeeder',
        '--force' => true,
    ],
];
```

### Update config/database.php

```php
<?php

return [
    'default' => env('DB_CONNECTION', 'pgsql'),

    'connections' => [
        // Central database connection
        'central' => [
            'driver' => 'pgsql',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'maintenance_os_central'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'schema' => 'public',
            'sslmode' => 'prefer',
        ],

        // Tenant database connection (dynamically configured)
        'tenant' => [
            'driver' => 'pgsql',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => null, // Set dynamically
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'schema' => 'public',
            'sslmode' => 'prefer',
        ],

        // Default connection (used before tenant identification)
        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'maintenance_os'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'schema' => 'public',
            'sslmode' => 'prefer',
        ],
    ],
];
```

## Domain Setup

### Create Domain Model Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('domains', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->string('domain')->unique()->index();
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_fallback')->default(false);
            $table->boolean('is_verified')->default(true);
            $table->string('verification_token')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('accounts')
                ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('domains');
    }
};
```

### Domain Model

```php
<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Domain as BaseDomain;

class Domain extends BaseDomain
{
    protected $connection = 'central';
    
    protected $fillable = [
        'domain',
        'tenant_id',
        'is_primary',
        'is_fallback',
        'is_verified',
        'verification_token',
        'verified_at',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'is_fallback' => 'boolean',
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
    ];

    public function makePrimary(): void
    {
        // Remove primary from other domains
        static::where('tenant_id', $this->tenant_id)
            ->where('id', '!=', $this->id)
            ->update(['is_primary' => false]);

        // Make this primary
        $this->update(['is_primary' => true]);
    }

    public static function generateSubdomain(string $subdomain): string
    {
        $environment = app()->environment();
        $baseDomain = config('app.domain', 'maintenance-os.com');

        // Handle different environments
        return match($environment) {
            'production' => "{$subdomain}.{$baseDomain}",
            'staging' => "{$subdomain}.staging.{$baseDomain}",
            'local' => "{$subdomain}.{$baseDomain}.test",
            default => "{$subdomain}.{$baseDomain}",
        };
    }
}
```

## Middleware Implementation

### Create TenancyServiceProvider

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;
use App\Http\Middleware\EnsureTenantIsActive;
use App\Http\Middleware\EnforceReadOnlyMode;
use App\Http\Middleware\CheckSubscriptionStatus;

class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->mapTenantRoutes();
        $this->configureTenantMiddleware();
    }

    protected function mapTenantRoutes(): void
    {
        $this->app->booted(function () {
            // Configure tenant route middleware
            Route::middlewareGroup('tenant', [
                'web',
                InitializeTenancyByDomain::class,
                PreventAccessFromCentralDomains::class,
                EnsureTenantIsActive::class,
                EnforceReadOnlyMode::class,
                CheckSubscriptionStatus::class,
            ]);
        });
    }

    protected function configureTenantMiddleware(): void
    {
        // Configure middleware priority
        $this->app['router']->middlewarePriority = array_merge(
            [
                InitializeTenancyByDomain::class,
                PreventAccessFromCentralDomains::class,
            ],
            $this->app['router']->middlewarePriority
        );
    }
}
```

### EnsureTenantIsActive Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = tenant();

        if (!$tenant) {
            abort(404, 'Tenant not found');
        }

        // Check if tenant is active
        if ($tenant->status === 'terminated') {
            return response()->view('errors.tenant-terminated', [], 410);
        }

        // Allow access to suspension notice page
        if ($tenant->status === 'suspended' && !$request->routeIs('tenant.suspended')) {
            return redirect()->route('tenant.suspended');
        }

        return $next($request);
    }
}
```

### EnforceReadOnlyMode Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceReadOnlyMode
{
    /**
     * Routes that are always allowed in read-only mode
     */
    protected array $allowedRoutes = [
        'tenant.suspended',
        'billing.portal',
        'billing.reactivate',
        'logout',
    ];

    /**
     * HTTP methods allowed in read-only mode
     */
    protected array $readOnlyMethods = ['GET', 'HEAD', 'OPTIONS'];

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = tenant();

        // Skip if tenant is active
        if (!$tenant || $tenant->isActive()) {
            return $next($request);
        }

        // Allow certain routes even in read-only mode
        if ($request->routeIs($this->allowedRoutes)) {
            return $next($request);
        }

        // Check if tenant is suspended (read-only mode)
        if ($tenant->isSuspended()) {
            // Allow only read operations
            if (!in_array($request->method(), $this->readOnlyMethods)) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'Account is in read-only mode due to suspension.',
                        'error' => 'read_only_mode',
                    ], 403);
                }

                return redirect()
                    ->back()
                    ->with('error', 'Your account is in read-only mode. Please update your billing information to restore full access.');
            }
        }

        return $next($request);
    }
}
```

### CheckSubscriptionStatus Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscriptionStatus
{
    /**
     * Routes that don't require active subscription
     */
    protected array $exemptRoutes = [
        'billing.*',
        'tenant.suspended',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Skip for exempt routes
        if ($request->routeIs($this->exemptRoutes)) {
            return $next($request);
        }

        $tenant = tenant();
        
        if (!$tenant) {
            return $next($request);
        }

        // Check trial status
        if ($tenant->isOnTrial()) {
            $daysLeft = $tenant->trial_ends_at->diffInDays(now());
            
            // Add trial warning to session
            if ($daysLeft <= 7) {
                session()->flash('trial_warning', "Your trial expires in {$daysLeft} days. Please add payment information to continue.");
            }
        }

        // Check subscription
        $subscription = $tenant->subscription;
        
        if (!$subscription && !$tenant->isOnTrial()) {
            return redirect()->route('billing.subscribe');
        }

        // Check for past due subscription
        if ($subscription && $subscription->status === 'past_due') {
            session()->flash('billing_warning', 'Your subscription payment is past due. Please update your payment method.');
        }

        return $next($request);
    }
}
```

## Route Configuration

### Update bootstrap/app.php

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Central routes (admin portal, marketing)
            Route::middleware('web')
                ->domain('admin.' . config('app.domain'))
                ->namespace('App\Http\Controllers\Admin')
                ->group(base_path('routes/admin.php'));

            Route::middleware('web')
                ->domain('www.' . config('app.domain'))
                ->namespace('App\Http\Controllers\Marketing')
                ->group(base_path('routes/marketing.php'));

            // Tenant routes
            Route::middleware(['web', 'tenant'])
                ->group(base_path('routes/tenant.php'));
        }
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->group('tenant', [
            InitializeTenancyByDomain::class,
            PreventAccessFromCentralDomains::class,
            \App\Http\Middleware\EnsureTenantIsActive::class,
            \App\Http\Middleware\EnforceReadOnlyMode::class,
            \App\Http\Middleware\CheckSubscriptionStatus::class,
        ]);

        $middleware->alias([
            'tenant.active' => \App\Http\Middleware\EnsureTenantIsActive::class,
            'tenant.readonly' => \App\Http\Middleware\EnforceReadOnlyMode::class,
            'tenant.subscribed' => \App\Http\Middleware\CheckSubscriptionStatus::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
```

### Create Route Files

#### routes/tenant.php

```php
<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TenantSuspendedController;
use Illuminate\Support\Facades\Route;

// Tenant suspension page
Route::get('/account/suspended', [TenantSuspendedController::class, 'show'])
    ->name('tenant.suspended')
    ->middleware(['auth']);

// Auth routes
Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});

// Main application routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('home');
    
    // Include all existing routes here
    require __DIR__.'/tenant/assets.php';
    require __DIR__.'/tenant/work-orders.php';
    require __DIR__.'/tenant/production.php';
    require __DIR__.'/tenant/users.php';
    require __DIR__.'/tenant/settings.php';
});
```

#### routes/admin.php

```php
<?php

use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\PlanController;
use App\Http\Controllers\Admin\AuthController;
use Illuminate\Support\Facades\Route;

// Admin auth
Route::middleware('guest:admin')->group(function () {
    Route::get('login', [AuthController::class, 'showLogin'])->name('admin.login');
    Route::post('login', [AuthController::class, 'login']);
});

Route::middleware('auth:admin')->group(function () {
    Route::post('logout', [AuthController::class, 'logout'])->name('admin.logout');
    
    // Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('admin.dashboard');
    
    // Account management
    Route::resource('accounts', AccountController::class)->names('admin.accounts');
    Route::post('accounts/{account}/suspend', [AccountController::class, 'suspend'])->name('admin.accounts.suspend');
    Route::post('accounts/{account}/activate', [AccountController::class, 'activate'])->name('admin.accounts.activate');
    Route::post('accounts/{account}/terminate', [AccountController::class, 'terminate'])->name('admin.accounts.terminate');
    
    // Plan management
    Route::resource('plans', PlanController::class)->names('admin.plans');
    Route::post('plans/{plan}/limits', [PlanController::class, 'updateLimits'])->name('admin.plans.limits');
    Route::post('plans/{plan}/features', [PlanController::class, 'updateFeatures'])->name('admin.plans.features');
});
```

### Update Existing Models

Add central connection to models that need it:

```php
<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;

abstract class CentralModel extends Model
{
    protected $connection = 'central';
}
```

## Testing

### Feature Test for Tenant Identification

```php
<?php

namespace Tests\Feature\Tenancy;

use Tests\TestCase;
use App\Models\Account;
use App\Models\Domain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TenantIdentificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_is_identified_by_subdomain()
    {
        // Create tenant
        $tenant = Account::create([
            'name' => 'Test Company',
            'subdomain' => 'testcompany',
        ]);

        // Create domain
        $tenant->domains()->create([
            'domain' => 'testcompany.maintenance-os.test',
            'is_primary' => true,
        ]);

        // Visit tenant domain
        $response = $this->get('http://testcompany.maintenance-os.test/login');

        $response->assertStatus(200);
        $this->assertEquals($tenant->id, tenant()->id);
    }

    public function test_central_domain_prevents_tenant_access()
    {
        $response = $this->get('http://www.maintenance-os.test/login');
        
        $response->assertStatus(404);
        $this->assertNull(tenant());
    }

    public function test_unknown_subdomain_returns_404()
    {
        $response = $this->get('http://unknown.maintenance-os.test');
        
        $response->assertStatus(404);
    }

    public function test_suspended_tenant_shows_suspension_page()
    {
        // Create suspended tenant
        $tenant = Account::create([
            'name' => 'Suspended Company',
            'subdomain' => 'suspended',
            'status' => 'suspended',
            'suspension_reason' => 'Non-payment',
        ]);

        $tenant->domains()->create([
            'domain' => 'suspended.maintenance-os.test',
            'is_primary' => true,
        ]);

        // Create user
        tenancy()->initialize($tenant);
        $user = User::factory()->create();
        tenancy()->end();

        // Login and visit
        $response = $this->actingAs($user)
            ->get('http://suspended.maintenance-os.test/');

        $response->assertRedirect(route('tenant.suspended'));
    }

    public function test_read_only_mode_blocks_post_requests()
    {
        // Create suspended tenant
        $tenant = Account::create([
            'name' => 'ReadOnly Company',
            'subdomain' => 'readonly',
            'status' => 'suspended',
        ]);

        $tenant->domains()->create([
            'domain' => 'readonly.maintenance-os.test',
            'is_primary' => true,
        ]);

        // Create user
        tenancy()->initialize($tenant);
        $user = User::factory()->create();
        tenancy()->end();

        // Try to create something
        $response = $this->actingAs($user)
            ->post('http://readonly.maintenance-os.test/assets', [
                'name' => 'New Asset',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }
}
```

### Unit Test for Subdomain Validation

```php
<?php

namespace Tests\Unit\Tenancy;

use Tests\TestCase;
use App\Services\SubdomainValidator;

class SubdomainValidationTest extends TestCase
{
    protected SubdomainValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new SubdomainValidator();
    }

    public function test_valid_subdomains()
    {
        $validSubdomains = [
            'company',
            'my-company',
            'company123',
            'test-123',
            'a',
            'my-very-long-subdomain-name',
        ];

        foreach ($validSubdomains as $subdomain) {
            $this->assertTrue(
                $this->validator->isValid($subdomain),
                "Subdomain '{$subdomain}' should be valid"
            );
        }
    }

    public function test_invalid_subdomains()
    {
        $invalidSubdomains = [
            'www',
            'admin',
            'api',
            'mail',
            '-company',
            'company-',
            'com.pany',
            'company_name',
            'COMPANY',
            '',
            'a-very-long-subdomain-name-that-exceeds-the-maximum-length-allowed',
            'company@name',
            'company name',
            '123',
        ];

        foreach ($invalidSubdomains as $subdomain) {
            $this->assertFalse(
                $this->validator->isValid($subdomain),
                "Subdomain '{$subdomain}' should be invalid"
            );
        }
    }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Tenant Not Found

**Issue**: Getting "Tenant not found" error

**Solutions**:
- Verify domain exists in domains table
- Check if domain is marked as verified
- Ensure subdomain matches exactly (case-sensitive)
- Clear route and config caches

```bash
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

#### 2. Database Connection Issues

**Issue**: "Database does not exist" error

**Solutions**:
- Ensure tenant database was created
- Check database naming pattern matches
- Verify PostgreSQL user has CREATE DATABASE permission

```php
// Debug helper
dd(tenant()->getDatabaseName());
```

#### 3. Middleware Not Applied

**Issue**: Tenant routes accessible from central domain

**Solutions**:
- Verify middleware group is applied to routes
- Check middleware priority in kernel
- Ensure PreventAccessFromCentralDomains is included

#### 4. Session Bleeding

**Issue**: Sessions shared between tenants

**Solutions**:
- Configure separate session domains
- Use tenant-specific session prefixes

```php
// In session.php
'domain' => env('SESSION_DOMAIN', '.'.request()->getHost()),
'cookie' => env('SESSION_COOKIE', Str::slug(env('APP_NAME', 'laravel'), '_').'_'.tenant()?->id.'_session'),
```

#### 5. Cache Contamination

**Issue**: Cache data shared between tenants

**Solutions**:
- Ensure CacheTenancyBootstrapper is enabled
- Use cache tags for tenant data
- Clear cache when switching tenants

```php
// Always use tenant cache tags
Cache::tags(['tenant:'.tenant()->id])->remember($key, $ttl, $callback);
```

### Debug Commands

Create helpful artisan commands for debugging:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Account;

class DebugTenant extends Command
{
    protected $signature = 'tenant:debug {subdomain}';
    protected $description = 'Debug tenant configuration';

    public function handle()
    {
        $subdomain = $this->argument('subdomain');
        $domain = Domain::where('domain', 'LIKE', $subdomain.'%')->first();

        if (!$domain) {
            $this->error("Domain not found for subdomain: {$subdomain}");
            return;
        }

        $tenant = $domain->tenant;

        $this->info("Tenant Information:");
        $this->table(
            ['Property', 'Value'],
            [
                ['ID', $tenant->id],
                ['Name', $tenant->name],
                ['Subdomain', $tenant->subdomain],
                ['Database', $tenant->getDatabaseName()],
                ['Status', $tenant->status],
                ['Created', $tenant->created_at],
            ]
        );

        // Test database connection
        try {
            tenancy()->initialize($tenant);
            \DB::connection('tenant')->getPdo();
            $this->info("✓ Database connection successful");
            
            $userCount = \App\Models\User::count();
            $this->info("  Users: {$userCount}");
            
            tenancy()->end();
        } catch (\Exception $e) {
            $this->error("✗ Database connection failed: " . $e->getMessage());
        }
    }
}
```

## Security Considerations

### 1. Subdomain Validation

Always validate subdomains to prevent:
- SQL injection through subdomain
- XSS attacks
- Reserved subdomain usage

```php
<?php

namespace App\Services;

class SubdomainValidator
{
    protected array $reserved = [
        'www', 'admin', 'api', 'app', 'mail', 'ftp',
        'email', 'blog', 'help', 'support', 'dashboard',
        'account', 'accounts', 'billing', 'invoice',
        'login', 'register', 'signup', 'signin',
    ];

    public function isValid(string $subdomain): bool
    {
        // Length check
        if (strlen($subdomain) < 1 || strlen($subdomain) > 63) {
            return false;
        }

        // Format check
        if (!preg_match('/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/', $subdomain)) {
            return false;
        }

        // Reserved check
        if (in_array($subdomain, $this->reserved)) {
            return false;
        }

        return true;
    }

    public function isAvailable(string $subdomain): bool
    {
        if (!$this->isValid($subdomain)) {
            return false;
        }

        return !Domain::where('domain', 'LIKE', $subdomain.'%')->exists();
    }
}
```

### 2. Domain Verification

For custom domains (Phase 2):

```php
<?php

namespace App\Services;

class DomainVerificationService
{
    public function generateVerificationToken(): string
    {
        return 'maintenance-os-verify=' . Str::random(32);
    }

    public function verifyDomain(string $domain, string $token): bool
    {
        try {
            $records = dns_get_record($domain, DNS_TXT);
            
            foreach ($records as $record) {
                if (isset($record['txt']) && $record['txt'] === $token) {
                    return true;
                }
            }
            
            return false;
        } catch (\Exception $e) {
            return false;
        }
    }
}
```

### 3. Rate Limiting

Apply rate limiting per tenant:

```php
// In RouteServiceProvider
RateLimiter::for('tenant-api', function (Request $request) {
    $tenant = tenant();
    $limit = $tenant?->subscription?->plan?->getLimit('api_rate_limit') ?? 60;
    
    return Limit::perMinute($limit)->by($tenant?->id ?: $request->ip());
});
```

## Performance Optimization

### 1. Tenant Lookup Caching

```php
// In TenancyServiceProvider
Event::listen(TenantIdentified::class, function (TenantIdentified $event) {
    Cache::put(
        'tenant_lookup:'.$event->domain->domain,
        $event->tenant->id,
        now()->addHours(24)
    );
});
```

### 2. Database Connection Pooling

Configure PgBouncer for connection pooling:

```ini
[databases]
maintenance_os_pool = host=127.0.0.1 port=5432 auth_user=app_user

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

### 3. Eager Load Tenant Relationships

```php
// In Account model
protected $with = ['subscription', 'subscription.plan'];
```

This completes the detailed implementation guide for tenant identification and routing. The guide covers all aspects from installation to troubleshooting, with security and performance considerations.

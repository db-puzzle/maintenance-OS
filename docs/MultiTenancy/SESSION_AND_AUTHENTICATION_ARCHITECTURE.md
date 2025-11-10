# Session and Authentication Architecture - Multi-Tenant SaaS

## Executive Summary

This document clarifies the **session and authentication architecture** for our multi-tenant, multi-database SaaS application. It addresses common concerns about complexity and confirms that the standard Laravel Tenancy v3 pattern using **multi-guard authentication** is both simple and secure—requiring NO separate session controllers or complex custom logic.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Critical Concepts](#critical-concepts)
3. [Database Structure](#database-structure)
4. [Authentication Guards](#authentication-guards)
5. [Session Management](#session-management)
6. [Authentication Flows](#authentication-flows)
7. [Implementation Details](#implementation-details)
8. [Common Misconceptions](#common-misconceptions)
9. [Security Considerations](#security-considerations)
10. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### The Two-Database Pattern

Our application uses the **standard Laravel Tenancy multi-database pattern**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CENTRAL DATABASE                             │
│                  (maintenance_os_central)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐ │
│  │ admin_users  │  │ accounts │  │   domains  │  │ sessions │ │
│  │ (admins)     │  │(tenants) │  │            │  │ (central)│ │
│  └──────────────┘  └──────────┘  └────────────┘  └──────────┘ │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │    plans     │  │subscriptions │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Creates/Manages
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TENANT DATABASES                              │
│              (tenant_uuid for each tenant)                       │
│                                                                  │
│  ┌──────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐ │
│  │    users     │  │ work_orders│  │  assets  │  │ sessions │ │
│  │ (tenant)     │  │            │  │          │  │ (tenant) │ │
│  └──────────────┘  └────────────┘  └──────────┘  └──────────┘ │
│                                                                  │
│  + 77 more tenant-specific tables...                            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principle: Complete Separation

| Aspect | Central Application | Tenant Application |
|--------|--------------------|--------------------|
| **Domain** | `yourapp.com`, `admin.yourapp.com` | `acme.yourapp.com`, `contoso.yourapp.com` |
| **Database** | `maintenance_os_central` | `tenant_<uuid>` |
| **Users** | `admin_users` table | `users` table |
| **Sessions** | `sessions` table (central DB) | `sessions` table (tenant DB) |
| **Auth Guard** | `admin` | `web` (default) |
| **Purpose** | Signup, admin portal | Actual SaaS application |

---

## Critical Concepts

### 1. You Do NOT Need Separate Session Controllers

**Common Misconception**: "We need two session controllers for central and tenant."

**Reality**: Laravel's **multi-guard authentication system** handles everything with:
- ✅ ONE `AuthenticatedSessionController`
- ✅ Different routes (central vs tenant)
- ✅ Different auth guards (`admin` vs `web`)
- ✅ Automatic context switching via Laravel Tenancy middleware

### 2. Sessions Exist in BOTH Databases

The `sessions` table must exist in:

1. **Central Database**: For unauthenticated visitors (signup page) and admin users
2. **Each Tenant Database**: For tenant users working in their instance

This is **NOT duplication**—it's **isolation**. Each context needs its own sessions.

### 3. Laravel Tenancy Handles Context Switching

When a request comes to a tenant subdomain:
1. `InitializeTenancyByDomain` middleware identifies the tenant
2. Database connection switches to tenant DB automatically
3. Auth guard uses tenant DB for user lookup
4. Sessions are stored/retrieved from tenant DB
5. **No manual intervention needed**

---

## Database Structure

### Central Database Tables

Located in: `database/migrations/central/`

```php
// Tables needed in central database:
- admin_users              // System administrators
- accounts (tenants)       // Tenant records
- domains                  // Tenant domain mappings
- plans                    // Subscription plans
- subscriptions           // Tenant subscriptions
- sessions                // ← CRITICAL: Sessions for central app
- cache                   // Central cache (optional)
- jobs                    // Queue jobs (optional)
- failed_jobs             // Failed jobs (optional)
```

### Tenant Database Tables

Located in: `database/migrations/tenant/`

```php
// Tables needed in each tenant database:
- users                   // Tenant users
- sessions                // ← CRITICAL: Sessions for tenant app
- password_reset_tokens   // Password resets
- work_orders            // Business logic
- assets                 // Business logic
- items                  // Business logic
// ... + 77 more tables
```

### Critical: The Sessions Table Structure

**Same structure in BOTH databases:**

```php
Schema::create('sessions', function (Blueprint $table) {
    $table->string('id')->primary();                    // Session ID
    $table->foreignId('user_id')->nullable()->index();  // User reference
    $table->string('ip_address', 45)->nullable();       // IP address
    $table->text('user_agent')->nullable();             // Browser info
    $table->longText('payload');                        // Session data
    $table->integer('last_activity')->index();          // Timestamp
});
```

**Why the same structure?**
- Laravel expects this standard format
- Simplifies maintenance
- Allows code reuse

**Why in both databases?**
- Central sessions: For signup flow and admin portal
- Tenant sessions: Isolated per tenant, prevents data leakage

---

## Authentication Guards

### Configuration

```php
// config/auth.php

'defaults' => [
    'guard' => env('AUTH_GUARD', 'web'),  // Default for tenant routes
    'passwords' => env('AUTH_PASSWORD_BROKER', 'users'),
],

'guards' => [
    // Tenant authentication guard
    'web' => [
        'driver' => 'session',
        'provider' => 'users',  // Uses tenant DB users table
    ],

    // Central/Admin authentication guard  
    'admin' => [
        'driver' => 'session',
        'provider' => 'admin_users',  // Uses central DB admin_users table
    ],
],

'providers' => [
    'users' => [
        'driver' => 'eloquent',
        'model' => App\Models\User::class,  // Tenant user model
    ],

    'admin_users' => [
        'driver' => 'eloquent',
        'model' => App\Models\Central\AdminUser::class,  // Central admin model
    ],
],
```

### How Guards Work

```php
// Central routes (routes/central.php)
Route::middleware(['auth:admin'])->group(function () {
    // Uses 'admin' guard
    // Authenticates against admin_users table in central DB
    // Stores sessions in central DB sessions table
});

// Tenant routes (routes/tenant.php via routes/auth.php)
Route::middleware(['auth'])->group(function () {
    // Uses 'web' guard (default)
    // Authenticates against users table in tenant DB
    // Stores sessions in tenant DB sessions table
});
```

---

## Session Management

### Session Driver Configuration

```php
// config/session.php

'driver' => env('SESSION_DRIVER', 'database'),  // Use database driver

'connection' => env('SESSION_CONNECTION'),       // Let Laravel determine
                                                 // based on current context

'table' => env('SESSION_TABLE', 'sessions'),    // Standard table name
```

### How Session Storage Works

#### Central Application Sessions

```
User visits: yourapp.com/register
├─ No tenant context initialized
├─ Uses default database connection (central)
├─ Session stored in: maintenance_os_central.sessions
└─ No authentication required (public signup page)

Admin visits: admin.yourapp.com/login
├─ Central domain (no tenant context)
├─ Uses central database connection
├─ Authentication via 'admin' guard
├─ Session stored in: maintenance_os_central.sessions
└─ AdminUser retrieved from: maintenance_os_central.admin_users
```

#### Tenant Application Sessions

```
User visits: acme.yourapp.com/login
├─ Middleware: InitializeTenancyByDomain identifies 'acme'
├─ Switches database connection to: tenant_<acme-uuid>
├─ Authentication via 'web' guard (default)
├─ Session stored in: tenant_<acme-uuid>.sessions
└─ User retrieved from: tenant_<acme-uuid>.users
```

### Session Isolation Benefits

1. **Security**: Tenant A cannot access Tenant B's sessions
2. **Performance**: Each tenant's sessions are in their own DB
3. **Privacy**: No cross-tenant data visibility
4. **Scalability**: Sessions scale with tenant databases
5. **Simplicity**: Laravel handles everything automatically

---

## Authentication Flows

### Flow 1: New Tenant Signup (No Authentication)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Visit Central Domain                                │
└─────────────────────────────────────────────────────────────┘
User → GET https://yourapp.com/register
       ├─ No tenant context
       ├─ Database: maintenance_os_central
       ├─ Session: Stored in central DB sessions table
       └─ Authentication: NOT REQUIRED

┌─────────────────────────────────────────────────────────────┐
│ Step 2: Submit Registration Form                            │
└─────────────────────────────────────────────────────────────┘
User → POST https://yourapp.com/register
       ├─ Controller: TenantRegistrationController
       ├─ Creates: Account (tenant) record in central DB
       ├─ Package: Automatically creates tenant database
       ├─ Package: Runs tenant migrations (including sessions table)
       ├─ Package: Seeds tenant database (including admin user)
       └─ Redirects to: https://acme.yourapp.com

┌─────────────────────────────────────────────────────────────┐
│ Step 3: First Login on Tenant Domain                        │
└─────────────────────────────────────────────────────────────┘
User → GET https://acme.yourapp.com/login
       ├─ Middleware: InitializeTenancyByDomain
       ├─ Database: Switched to tenant_<uuid>
       ├─ Session: New session in tenant DB sessions table
       └─ Ready to authenticate as tenant user
```

**Key Points:**
- Signup uses central DB sessions (unauthenticated)
- After tenant creation, user switches to tenant domain
- New session created in tenant DB
- No session data carried over (intentional security feature)

### Flow 2: Admin Login (Central Authentication)

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Authentication Flow                                    │
└─────────────────────────────────────────────────────────────┘
Admin → GET https://admin.yourapp.com/login
        ├─ Route: routes/central.php
        ├─ Database: maintenance_os_central
        ├─ Session: central DB sessions table
        └─ Controller: AuthenticatedSessionController

Admin → POST https://admin.yourapp.com/login
        ├─ LoginRequest validates credentials
        ├─ Guard: 'admin'
        ├─ Authenticates against: admin_users table (central DB)
        ├─ Session: Stored in central DB sessions table
        └─ Redirect: /admin (central domain)

Admin → GET https://admin.yourapp.com/accounts
        ├─ Middleware: auth:admin
        ├─ Database: maintenance_os_central
        ├─ Session: Retrieved from central DB
        └─ Can manage all tenant accounts
```

**Key Points:**
- Admin never authenticates against tenant databases
- Admin session stays in central DB
- Admin can view tenant info but doesn't "log in" to tenant DBs
- Complete separation from tenant users

### Flow 3: Tenant User Login (Tenant Authentication)

```
┌─────────────────────────────────────────────────────────────┐
│ Tenant User Authentication Flow                             │
└─────────────────────────────────────────────────────────────┘
User → GET https://acme.yourapp.com/login
       ├─ Middleware: InitializeTenancyByDomain (identifies 'acme')
       ├─ Database: Switched to tenant_<acme-uuid>
       ├─ Session: tenant DB sessions table
       └─ Controller: AuthenticatedSessionController (same one!)

User → POST https://acme.yourapp.com/login
       ├─ LoginRequest validates credentials
       ├─ Guard: 'web' (default)
       ├─ Authenticates against: users table (tenant DB)
       ├─ Session: Stored in tenant DB sessions table
       └─ Redirect: /home (tenant domain)

User → GET https://acme.yourapp.com/work-orders
       ├─ Middleware: auth (uses 'web' guard)
       ├─ Database: tenant_<acme-uuid>
       ├─ Session: Retrieved from tenant DB
       └─ Sees only their tenant's work orders
```

**Key Points:**
- Same `AuthenticatedSessionController` as admin
- Different guard (`web` vs `admin`) handles the difference
- Tenant context already set by middleware
- Session isolated to tenant DB
- User can ONLY access their tenant's data

### Flow 4: Cross-Tenant Prevention

```
┌─────────────────────────────────────────────────────────────┐
│ What if user tries to access different tenant?              │
└─────────────────────────────────────────────────────────────┘
User logged in to: acme.yourapp.com
User tries to visit: contoso.yourapp.com

Request → GET https://contoso.yourapp.com/work-orders
          ├─ Middleware: InitializeTenancyByDomain
          ├─ Identifies tenant: 'contoso'
          ├─ Switches to: tenant_<contoso-uuid>
          ├─ Middleware: auth (checks session)
          ├─ Session lookup: tenant_<contoso-uuid>.sessions
          ├─ No session found (user's session is in acme DB)
          └─ Result: Redirected to login (401 Unauthorized)
```

**This is the CORRECT behavior:**
- Users cannot accidentally access other tenants
- Each tenant is completely isolated
- No session sharing between tenants
- Security enforced at database level

---

## Implementation Details

### Single Authentication Controller (Standard Laravel)

```php
// app/Http/Controllers/Auth/AuthenticatedSessionController.php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     * 
     * Works for BOTH central and tenant contexts.
     * The guard is determined by the route middleware.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle login request.
     * 
     * LoginRequest determines which guard to use based on context.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        // LoginRequest->authenticate() uses the correct guard
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()->intended(route('home', absolute: false));
    }

    /**
     * Logout user.
     * 
     * Works for both admin and tenant users.
     */
    public function destroy(Request $request): RedirectResponse
    {
        // Determine which guard to use
        $guard = $request->route()->getPrefix() === 'admin' ? 'admin' : 'web';
        
        Auth::guard($guard)->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
```

### Login Request with Guard Detection

```php
// app/Http/Requests/Auth/LoginRequest.php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine which guard to use based on route.
     */
    protected function getGuard(): string
    {
        // If route is prefixed with 'admin', use admin guard
        if (Str::startsWith($this->route()->getPrefix(), 'admin')) {
            return 'admin';
        }
        
        // Otherwise use default web guard
        return 'web';
    }

    /**
     * Attempt to authenticate the request's credentials.
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        // Use the appropriate guard
        $guard = $this->getGuard();

        if (! Auth::guard($guard)->attempt(
            $this->only('email', 'password'),
            $this->boolean('remember')
        )) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Get the rate limiting throttle key.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(
            Str::lower($this->string('email')) . '|' . $this->ip()
        );
    }
}
```

### Route Organization

```php
// routes/web.php
// Entry point for all routes

// Central domain routes (marketing, registration)
foreach (config('tenancy.central_domains') as $domain) {
    Route::domain($domain)->group(function () {
        Route::get('/', function () {
            return Inertia::render('welcome');
        })->name('welcome');

        // Registration (no auth required, uses central sessions)
        Route::get('/register', [TenantRegistrationController::class, 'create'])
            ->name('register');
        Route::post('/register', [TenantRegistrationController::class, 'store']);
    });
}

// Admin portal on admin subdomain
Route::domain('admin.' . config('app.domain'))
    ->middleware(['web'])
    ->group(function () {
        require __DIR__ . '/central.php';  // Admin routes
    });

// Tenant routes (all application functionality)
Route::middleware('tenant')->group(function () {
    // Home route (requires auth)
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/', fn() => Inertia::render('home'))->name('home');
    });

    // All tenant-specific routes
    require __DIR__ . '/tenant.php';
});
```

```php
// routes/central.php
// Admin portal routes

// Admin login (uses central DB)
Route::get('login', [AuthenticatedSessionController::class, 'create'])
    ->name('admin.login');
Route::post('login', [AuthenticatedSessionController::class, 'store']);
Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
    ->name('admin.logout');

// Protected admin routes
Route::middleware(['auth:admin'])->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])
        ->name('admin.dashboard');
    
    Route::resource('accounts', AccountController::class)
        ->names('admin.accounts');
    
    // ... more admin routes
});
```

```php
// routes/auth.php (included in tenant.php)
// Tenant authentication routes

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
```

### Model Organization

```php
// app/Models/User.php
// Tenant user model (uses tenant DB)

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    // This model ALWAYS uses tenant database connection
    // No special configuration needed - Laravel Tenancy handles it

    protected $fillable = [
        'name',
        'email',
        'password',
        'timezone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
```

```php
// app/Models/Central/AdminUser.php
// Admin user model (uses central DB)

namespace App\Models\Central;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class AdminUser extends Authenticatable
{
    use HasFactory, Notifiable;

    // CRITICAL: Explicitly use central connection
    protected $connection = 'central';
    
    protected $table = 'admin_users';

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
```

### Environment Configuration

```env
# .env

# Database - Central by default
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=maintenance_os_central
DB_USERNAME=postgres
DB_PASSWORD=secret

# Session configuration
SESSION_DRIVER=database
# Don't set SESSION_CONNECTION - let Laravel determine based on context

# Tenancy configuration
CENTRAL_DOMAINS=localhost,yourapp.com
```

---

## Common Misconceptions

### Misconception 1: "We need separate session controllers"

**Reality**: NO. Laravel's multi-guard system handles this with:
- One `AuthenticatedSessionController`
- Different routes (central vs tenant)
- Different guards (`admin` vs `web`)
- Automatic context detection

### Misconception 2: "Sessions should only be in one database"

**Reality**: NO. Sessions must be in BOTH:
- Central DB: For signup flow and admin portal
- Each tenant DB: For tenant users

This is **isolation**, not duplication.

### Misconception 3: "Laravel Tenancy automatically manages sessions"

**Reality**: PARTIAL. Laravel Tenancy:
- ✅ Provides `RedisTenancyBootstrapper` for Redis
- ✅ Provides `ScopeSessions` middleware for cookie-based
- ❌ Does NOT automatically create sessions tables
- ❌ Does NOT switch session storage for database driver

You must:
- Create sessions table in central DB
- Create sessions table in tenant DBs (already done)
- Configure session driver properly

### Misconception 4: "Central and tenant users could conflict"

**Reality**: NO. They are completely separate:
- Different databases
- Different tables (admin_users vs users)
- Different guards (admin vs web)
- Different session storage
- No possibility of conflict

### Misconception 5: "This architecture is overly complex"

**Reality**: NO. This is **standard Laravel + Tenancy**:
- Multi-guard auth: Standard Laravel feature
- Database sessions: Standard Laravel feature
- Context switching: Handled by Laravel Tenancy middleware
- **Complexity: Minimal** (handled by framework)

---

## Security Considerations

### 1. Session Isolation

**Requirement**: Tenant A cannot access Tenant B's sessions.

**Implementation**:
```
Tenant A sessions → tenant_<a-uuid>.sessions
Tenant B sessions → tenant_<b-uuid>.sessions
Admin sessions    → maintenance_os_central.sessions
```

**Result**: Physical database separation = impossible to access other sessions.

### 2. Cookie Domain Configuration

```php
// config/session.php

'domain' => env('SESSION_DOMAIN', null),

// For multi-tenancy:
// DON'T set a wildcard domain (.yourapp.com)
// This would share cookies across all subdomains

// DO leave as null or set per-domain
// Each subdomain gets its own cookie
```

### 3. CSRF Protection

```php
// Automatic in Laravel
// Each session has its own CSRF token
// Stored in session table (isolated per DB)
// Cannot be reused across tenants
```

### 4. Session Hijacking Prevention

**Built-in protections**:
- Session ID regeneration on login
- IP address tracking
- User agent tracking
- Last activity timestamp
- Automatic session expiration

### 5. Admin Impersonation (Future Feature)

If implementing admin impersonation:

```php
// DON'T: Share sessions
// DO: Create temporary tenant user session
// DO: Log impersonation actions
// DO: Provide easy way to exit impersonation
```

Laravel Tenancy provides `UserImpersonation` feature for this.

---

## Testing Strategy

### Test 1: Central Session Creation

```php
// tests/Feature/Auth/CentralSessionTest.php

use Tests\TestCase;

class CentralSessionTest extends TestCase
{
    public function test_signup_page_creates_central_session(): void
    {
        // Visit central domain
        $response = $this->get('/register');
        
        $response->assertOk();
        
        // Session should exist in central DB
        $this->assertDatabaseHas('sessions', [
            'user_id' => null,  // Not logged in
        ], 'central');
    }
}
```

### Test 2: Admin Authentication

```php
// tests/Feature/Auth/AdminAuthTest.php

use App\Models\Central\AdminUser;
use Tests\CentralTestCase;

class AdminAuthTest extends CentralTestCase
{
    public function test_admin_can_login(): void
    {
        $admin = AdminUser::factory()->create([
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->post('https://admin.localhost/login', [
            'email' => 'admin@test.com',
            'password' => 'password',
        ]);

        $response->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin, 'admin');
        
        // Session stored in central DB
        $this->assertDatabaseHas('sessions', [
            'user_id' => $admin->id,
        ], 'central');
    }
}
```

### Test 3: Tenant Session Isolation

```php
// tests/Feature/Auth/TenantSessionTest.php

use App\Models\Account;
use App\Models\User;
use Tests\TestCase;

class TenantSessionTest extends TestCase
{
    public function test_tenant_user_session_isolated(): void
    {
        $tenant = Account::factory()->create(['subdomain' => 'acme']);
        
        $tenant->run(function () {
            $user = User::factory()->create([
                'email' => 'user@acme.com',
                'password' => bcrypt('password'),
            ]);

            $response = $this->post('https://acme.localhost/login', [
                'email' => 'user@acme.com',
                'password' => 'password',
            ]);

            $response->assertRedirect('/home');
            $this->assertAuthenticatedAs($user, 'web');
            
            // Session stored in TENANT DB, not central
            $this->assertDatabaseHas('sessions', [
                'user_id' => $user->id,
            ]); // Uses current tenant connection
            
            // Session NOT in central DB
            $this->assertDatabaseMissing('sessions', [
                'user_id' => $user->id,
            ], 'central');
        });
    }
}
```

### Test 4: Cross-Tenant Prevention

```php
// tests/Feature/Auth/CrossTenantPreventionTest.php

use App\Models\Account;
use App\Models\User;
use Tests\TestCase;

class CrossTenantPreventionTest extends TestCase
{
    public function test_cannot_access_other_tenant_with_session(): void
    {
        $tenantA = Account::factory()->create(['subdomain' => 'acme']);
        $tenantB = Account::factory()->create(['subdomain' => 'contoso']);
        
        // Login to tenant A
        $tenantA->run(function () {
            $user = User::factory()->create(['email' => 'user@acme.com']);
            $this->actingAs($user);
        });
        
        // Try to access tenant B
        $response = $this->get('https://contoso.localhost/work-orders');
        
        // Should be redirected to login (not authenticated in tenant B)
        $response->assertRedirect('/login');
    }
}
```

---

## Migration Checklist

### Required Migrations

#### Central Database Migrations

Location: `database/migrations/central/`

```bash
# Must have these migrations:
✅ create_tenants_table.php (accounts)
✅ create_domains_table.php
✅ create_plans_table.php
✅ create_subscriptions_table.php
✅ create_admin_users_table.php
✅ create_sessions_table.php  # ← CRITICAL
✅ create_cache_table.php (optional but recommended)
✅ create_jobs_table.php (optional)
```

#### Tenant Database Migrations

Location: `database/migrations/tenant/`

```bash
# Must have these migrations:
✅ create_users_table.php (includes sessions table)
✅ create_password_reset_tokens_table.php
# ... + all business logic tables
```

### Creating the Missing Central Sessions Migration

```bash
# Step 1: Generate the migration
php artisan session:table

# Step 2: Move to central migrations
mv database/migrations/*_create_sessions_table.php \
   database/migrations/central/

# Step 3: Edit migration to specify connection
# Add this line inside the migration class:
# protected $connection = 'central';

# Step 4: Run central migrations
php artisan migrate --database=central --path=database/migrations/central
```

### Verifying Migration Success

```bash
# Check central database
psql -d maintenance_os_central -c "\dt"
# Should show: admin_users, accounts, domains, plans, subscriptions, sessions

# Check tenant database
php artisan tenants:run db:table sessions
# Should show sessions table in each tenant DB
```

---

## Troubleshooting

### Issue: "Undefined table: sessions"

**Cause**: Sessions table missing from central database

**Solution**:
```bash
php artisan session:table
mv database/migrations/*_create_sessions_table.php database/migrations/central/
php artisan migrate --database=central --path=database/migrations/central
```

### Issue: "Admin can't log in"

**Cause**: admin_users table or sessions table missing from central DB

**Solution**:
```bash
php artisan migrate --database=central --path=database/migrations/central
```

### Issue: "Tenant user can't log in"

**Cause**: users table or sessions table missing from tenant DB

**Solution**:
```bash
php artisan tenants:migrate
```

### Issue: "Session lost when switching tenants"

**Cause**: This is EXPECTED behavior (security feature)

**Solution**: No action needed. Users should authenticate to each tenant separately.

### Issue: "Admin session lost after timeout"

**Cause**: Session expired (check SESSION_LIFETIME in .env)

**Solution**:
```env
SESSION_LIFETIME=120  # 2 hours (default)
# Increase if needed for admin sessions
```

---

## Performance Considerations

### Session Storage Options

| Driver | Central App | Tenant App | Pros | Cons |
|--------|-------------|------------|------|------|
| **Database** | ✅ Recommended | ✅ Recommended | Simple, isolated | Slightly slower |
| **Redis** | ✅ Fast | ✅ Fast | Very fast | Requires Redis, needs prefixing |
| **File** | ❌ | ❌ | Simple | Not isolated, slow |
| **Cookie** | ❌ | ❌ | No DB needed | Security risk, size limits |

**Recommendation**: Use database sessions (current setup) until you have performance issues, then consider Redis.

### Database Session Performance

```php
// Sessions table is indexed properly
$table->string('id')->primary();           // Fast lookups
$table->foreignId('user_id')->index();     // Fast user queries
$table->integer('last_activity')->index(); // Fast cleanup

// Laravel automatically cleans old sessions
// config/session.php
'lottery' => [2, 100], // 2% chance to clean on each request
```

### Switching to Redis (Future)

```php
// config/tenancy.php
'bootstrappers' => [
    // ... other bootstrappers
    \Stancl\Tenancy\Bootstrappers\RedisTenancyBootstrapper::class,
],

'redis' => [
    'prefix_base' => 'tenant',  // Automatic prefixing per tenant
    'prefixed_connections' => [
        'default',
    ],
],

// config/session.php
'driver' => 'redis',
'connection' => 'default',
```

---

## Conclusion

### What We Learned

1. ✅ **Multi-guard authentication is STANDARD**: Not complex, built into Laravel
2. ✅ **One controller handles both contexts**: No separate session controllers needed
3. ✅ **Sessions in both databases is CORRECT**: Isolation, not duplication
4. ✅ **Laravel Tenancy handles context switching**: Automatic, reliable
5. ✅ **This is the recommended SaaS architecture**: Industry standard pattern

### What You Need

1. ✅ Sessions table in central DB (missing - needs to be created)
2. ✅ Sessions table in tenant DBs (already have)
3. ✅ Multi-guard configuration (already have)
4. ✅ Route organization (already have)
5. ✅ Middleware setup (already have)

### Next Steps

1. Create sessions migration in central database
2. Run central migrations
3. Test signup flow
4. Test admin login
5. Test tenant login
6. Verify session isolation

### Final Takeaway

**This architecture is NOT overly complex.** It's the standard Laravel multi-tenant pattern that:
- Uses built-in Laravel features (multi-guard auth)
- Leverages Laravel Tenancy middleware (automatic context switching)
- Provides complete isolation (security)
- Scales naturally (one DB per tenant)
- Requires minimal custom code (framework does the work)

**You were right to question the complexity**, but the good news is that Laravel and Laravel Tenancy have already solved this problem elegantly. We just need to add the missing sessions table to the central database, and everything will work perfectly.






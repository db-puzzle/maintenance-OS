# Permission System Specification

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Laravel Integration Strategy](#laravel-integration-strategy)
4. [Database Architecture](#database-architecture)
5. [Permission Model](#permission-model)
6. [Implementation with Laravel](#implementation-with-laravel)
7. [Security Considerations](#security-considerations)
8. [API Design](#api-design)

## Overview

This document outlines a comprehensive permission system for a maintenance management system that fully leverages Laravel's built-in authorization capabilities. The system provides granular access control at multiple levels while utilizing Laravel's Gates, Policies, and middleware system.

### Key Requirements
- First user to sign up becomes the Super Administrator
- Super Administrators can grant super administrator privileges to other users
- Permissions can be scoped to specific resources (e.g., create assets in Plant A but not Plant B)
- Role-based access control (RBAC) using Laravel's authorization features
- Permission inheritance and hierarchical structure
- Audit trail for permission changes using Laravel's events
- Performance-optimized using Laravel's caching system

### Laravel Features Utilized
- **Gates**: For simple, closure-based authorization
- **Policies**: For model-based authorization logic
- **Middleware**: For route-level permission checking
- **Events & Listeners**: For audit logging
- **Cache**: For permission caching
- **Eloquent Relationships**: For permission associations
- **Form Requests**: For authorization in request validation
- **Spatie Laravel-Permission Package**: For enhanced permission management

## Core Concepts

### 1. Users (Eloquent Model)
- Extends Laravel's default User model
- First user to sign up is automatically assigned "Super Administrator" role
- Utilizes Laravel's `HasRoles` trait (from Spatie package)
- Can have multiple roles and direct permissions

### 2. Roles (via Spatie Laravel-Permission)
- Leverages Spatie's Role model
- Hierarchical through custom implementation
- System-defined roles are seeded via Laravel seeders
- Custom roles created through the application

### 3. Permissions (via Spatie Laravel-Permission)
- Atomic units of access control
- Extended with custom scope attributes
- Cached using Laravel's cache system
- Synced with Laravel Gates automatically

### 4. Gates & Policies
- Gates for non-model actions (e.g., 'access-admin-panel')
- Policies for model-specific actions
- Automatic policy discovery via Laravel's conventions

### 5. Scopes (Custom Implementation)
- Extends Spatie's permission model with scope metadata
- Stored as JSON in permission's metadata column
- Evaluated through custom Gate callbacks

## Laravel Integration Strategy

### 1. Package Selection
We'll use **Spatie Laravel-Permission** package as the foundation because:
- Well-maintained and Laravel-optimized
- Provides roles and permissions out of the box
- Integrates seamlessly with Laravel's authorization
- Supports teams/tenants for future expansion
- Excellent performance with built-in caching

### 2. Extending Spatie's Models
```php
// app/Models/Permission.php
namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    protected $fillable = [
        'name',
        'guard_name',
        'resource',
        'action',
        'scope_type',
        'scope_context',
        'conditions'
    ];

    protected $casts = [
        'scope_context' => 'array',
        'conditions' => 'array'
    ];

    public function scopeForResource($query, $resource)
    {
        return $query->where('resource', $resource);
    }

    public function scopeForContext($query, $contextType, $contextId = null)
    {
        return $query->where('scope_type', $contextType)
                    ->when($contextId, function ($q) use ($contextId) {
                        return $q->whereJsonContains('scope_context->id', $contextId);
                    });
    }
}
```

### 3. Laravel Authorization Integration
```php
// app/Providers/AuthServiceProvider.php
public function boot()
{
    $this->registerPolicies();
    
    // Register dynamic gates from permissions
    Gate::before(function ($user, $ability) {
        // Super admin bypass
        if ($user->is_super_admin) {
            return true;
        }
    });
    
    // Register permission-based gates
    Permission::get()->each(function ($permission) {
        Gate::define($permission->name, function ($user, ...$args) use ($permission) {
            return app(PermissionService::class)->checkPermission($user, $permission, $args);
        });
    });
}
```

## Database Architecture

### Laravel Migration Files

```php
// database/migrations/2024_01_01_000001_add_permission_fields.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPermissionFields extends Migration
{
    public function up()
    {
        // Extend users table
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_super_admin')->default(false)->index();
        });
        
        // Extend Spatie's permissions table
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('resource', 100)->nullable()->index();
            $table->string('action', 50)->nullable()->index();
            $table->string('scope_type', 50)->default('global')->index();
            $table->json('scope_context')->nullable();
            $table->json('conditions')->nullable();
            $table->index(['resource', 'action', 'scope_type']);
        });
        
        // Extend Spatie's roles table for hierarchy
        Schema::table('roles', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_role_id')->nullable();
            $table->boolean('is_system')->default(false);
            $table->foreign('parent_role_id')->references('id')->on('roles');
        });
        
        // Super admin grants tracking
        Schema::create('super_admin_grants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('granted_to')->constrained('users');
            $table->foreignId('granted_by')->constrained('users');
            $table->timestamp('granted_at');
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users');
            $table->index(['granted_to', 'revoked_at']);
        });
    }
}
```

### Audit Logging via Laravel Events

```php
// database/migrations/2024_01_01_000002_create_permission_audit_log.php
Schema::create('permission_audit_logs', function (Blueprint $table) {
    $table->id();
    $table->string('event_type'); // Laravel event class name
    $table->morphs('auditable');  // Polymorphic relation
    $table->foreignId('user_id')->constrained();
    $table->json('old_values')->nullable();
    $table->json('new_values')->nullable();
    $table->string('ip_address', 45)->nullable();
    $table->string('user_agent')->nullable();
    $table->timestamps();
    $table->index(['auditable_type', 'auditable_id']);
    $table->index('created_at');
});
```

## Permission Model

### Laravel-Friendly Permission Structure

```php
// Permission naming convention following Laravel's policy methods
$permission = Permission::create([
    'name' => 'assets.create.plant.123', // dot notation for easy parsing
    'resource' => 'asset',
    'action' => 'create',
    'scope_type' => 'plant',
    'scope_context' => ['plant_id' => 123],
    'guard_name' => 'web'
]);

// Alternative: Using Laravel's ability syntax
$permission = Permission::create([
    'name' => 'create-asset-in-plant-123',
    'resource' => 'asset',
    'action' => 'create',
    'scope_type' => 'plant',
    'scope_context' => ['plant_id' => 123]
]);
```

### Policy-Based Permissions

```php
// app/Policies/AssetPolicy.php
namespace App\Policies;

use App\Models\User;
use App\Models\Asset;
use App\Models\Plant;

class AssetPolicy
{
    use HandlesAuthorization;
    
    public function before(User $user, $ability)
    {
        if ($user->is_super_admin) {
            return true;
        }
    }
    
    public function viewAny(User $user)
    {
        return $user->can('assets.viewAny');
    }
    
    public function view(User $user, Asset $asset)
    {
        return $user->can("assets.view.plant.{$asset->plant_id}")
            || $user->can('assets.view.global')
            || $user->id === $asset->created_by;
    }
    
    public function create(User $user, Plant $plant = null)
    {
        if ($plant) {
            return $user->can("assets.create.plant.{$plant->id}")
                || $user->can('assets.create.global');
        }
        
        return $user->can('assets.create.global');
    }
    
    public function update(User $user, Asset $asset)
    {
        return $user->can("assets.update.plant.{$asset->plant_id}")
            || $user->can('assets.update.global')
            || ($user->can('assets.update.owned') && $user->id === $asset->created_by);
    }
}
```

## Implementation with Laravel

### 1. Service Provider Setup

```php
// app/Providers/PermissionServiceProvider.php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Models\Permission as CustomPermission;
use App\Models\Role as CustomRole;

class PermissionServiceProvider extends ServiceProvider
{
    public function register()
    {
        // Use custom models
        $this->app->bind(Permission::class, CustomPermission::class);
        $this->app->bind(Role::class, CustomRole::class);
    }
    
    public function boot()
    {
        // Register permission check middleware
        $this->app['router']->aliasMiddleware('permission', \App\Http\Middleware\CheckPermission::class);
        
        // Register model observers for audit logging
        \App\Models\User::observe(\App\Observers\UserPermissionObserver::class);
        Role::observe(\App\Observers\RoleObserver::class);
        Permission::observe(\App\Observers\PermissionObserver::class);
    }
}
```

### 2. Middleware Implementation

```php
// app/Http/Middleware/CheckPermission.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckPermission
{
    public function handle(Request $request, Closure $next, $permission, $guard = null)
    {
        if (auth()->guest()) {
            abort(403);
        }

        $permissions = is_array($permission)
            ? $permission
            : explode('|', $permission);

        foreach ($permissions as $permission) {
            if ($request->user()->can($permission)) {
                return $next($request);
            }
        }

        abort(403);
    }
}
```

### 3. Form Request Authorization

```php
// app/Http/Requests/StoreAssetRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetRequest extends FormRequest
{
    public function authorize()
    {
        $plant = $this->route('plant');
        
        return $plant 
            ? $this->user()->can('create', [Asset::class, $plant])
            : $this->user()->can('create', Asset::class);
    }
    
    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'serial_number' => 'required|unique:assets',
            // ... other validation rules
        ];
    }
}
```

### 4. Controller Implementation

```php
// app/Http/Controllers/AssetController.php
namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Plant;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;

class AssetController extends Controller
{
    public function __construct()
    {
        // Use Laravel's built-in policy authorization
        $this->authorizeResource(Asset::class, 'asset');
    }
    
    public function index(Request $request)
    {
        // Automatically authorized by policy
        $assets = Asset::query()
            ->when(!$request->user()->can('assets.viewAny.global'), function ($query) use ($request) {
                // Scope to user's permitted plants
                $plantIds = $request->user()->getPermittedPlantIds('assets.viewAny');
                $query->whereIn('plant_id', $plantIds);
            })
            ->paginate();
            
        return view('assets.index', compact('assets'));
    }
    
    public function create(Plant $plant = null)
    {
        // Authorization handled by policy
        return view('assets.create', compact('plant'));
    }
    
    public function store(StoreAssetRequest $request)
    {
        // Authorization handled by FormRequest
        $asset = Asset::create($request->validated());
        
        return redirect()->route('assets.show', $asset)
            ->with('success', 'Asset created successfully');
    }
}
```

### 5. Blade Directives

```blade
{{-- resources/views/assets/index.blade.php --}}
@extends('layouts.app')

@section('content')
    <div class="container">
        @can('create', App\Models\Asset::class)
            <a href="{{ route('assets.create') }}" class="btn btn-primary">
                Create New Asset
            </a>
        @endcan
        
        @canany(['assets.create.global', 'assets.create.plant.' . $currentPlant->id])
            <a href="{{ route('assets.create', $currentPlant) }}" class="btn btn-secondary">
                Create Asset in {{ $currentPlant->name }}
            </a>
        @endcanany
        
        <table class="table">
            @foreach($assets as $asset)
                <tr>
                    <td>{{ $asset->name }}</td>
                    <td>
                        @can('view', $asset)
                            <a href="{{ route('assets.show', $asset) }}">View</a>
                        @endcan
                        
                        @can('update', $asset)
                            <a href="{{ route('assets.edit', $asset) }}">Edit</a>
                        @endcan
                        
                        @can('delete', $asset)
                            <form action="{{ route('assets.destroy', $asset) }}" method="POST">
                                @csrf
                                @method('DELETE')
                                <button type="submit">Delete</button>
                            </form>
                        @endcan
                    </td>
                </tr>
            @endforeach
        </table>
    </div>
@endsection
```

### 6. Event-Based Audit Logging

```php
// app/Observers/UserPermissionObserver.php
namespace App\Observers;

use App\Models\User;
use App\Events\PermissionChanged;

class UserPermissionObserver
{
    public function updated(User $user)
    {
        if ($user->wasChanged('is_super_admin')) {
            event(new PermissionChanged($user, 'super_admin_status_changed', [
                'old' => $user->getOriginal('is_super_admin'),
                'new' => $user->is_super_admin
            ]));
        }
    }
}

// app/Listeners/LogPermissionChange.php
namespace App\Listeners;

use App\Events\PermissionChanged;
use App\Models\PermissionAuditLog;

class LogPermissionChange
{
    public function handle(PermissionChanged $event)
    {
        PermissionAuditLog::create([
            'event_type' => get_class($event),
            'auditable_type' => get_class($event->model),
            'auditable_id' => $event->model->id,
            'user_id' => auth()->id() ?? $event->model->id,
            'old_values' => $event->oldValues,
            'new_values' => $event->newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }
}
```

### 7. Seeder for Default Roles

```php
// database/seeders/RolePermissionSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class RolePermissionSeeder extends Seeder
{
    public function run()
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        
        // Create permissions using Laravel conventions
        $permissions = [
            // Asset permissions
            ['name' => 'assets.viewAny', 'resource' => 'asset', 'action' => 'viewAny'],
            ['name' => 'assets.view', 'resource' => 'asset', 'action' => 'view'],
            ['name' => 'assets.create', 'resource' => 'asset', 'action' => 'create'],
            ['name' => 'assets.update', 'resource' => 'asset', 'action' => 'update'],
            ['name' => 'assets.delete', 'resource' => 'asset', 'action' => 'delete'],
            
            // Work order permissions
            ['name' => 'work-orders.viewAny', 'resource' => 'work_order', 'action' => 'viewAny'],
            ['name' => 'work-orders.view', 'resource' => 'work_order', 'action' => 'view'],
            ['name' => 'work-orders.create', 'resource' => 'work_order', 'action' => 'create'],
            ['name' => 'work-orders.update', 'resource' => 'work_order', 'action' => 'update'],
            ['name' => 'work-orders.delete', 'resource' => 'work_order', 'action' => 'delete'],
            
            // User management
            ['name' => 'users.manage', 'resource' => 'user', 'action' => 'manage'],
            ['name' => 'roles.manage', 'resource' => 'role', 'action' => 'manage'],
        ];
        
        foreach ($permissions as $permission) {
            Permission::create($permission);
        }
        
        // Create roles
        $adminRole = Role::create(['name' => 'administrator', 'is_system' => true]);
        $plantManagerRole = Role::create(['name' => 'plant_manager', 'is_system' => true]);
        $technicianRole = Role::create(['name' => 'technician', 'is_system' => true]);
        $viewerRole = Role::create(['name' => 'viewer', 'is_system' => true]);
        
        // Assign permissions to roles
        $adminRole->givePermissionTo(Permission::all());
        
        $plantManagerRole->givePermissionTo([
            'assets.viewAny', 'assets.view', 'assets.create', 'assets.update',
            'work-orders.viewAny', 'work-orders.view', 'work-orders.create', 'work-orders.update'
        ]);
        
        $technicianRole->givePermissionTo([
            'assets.view',
            'work-orders.view', 'work-orders.update'
        ]);
        
        $viewerRole->givePermissionTo([
            'assets.viewAny', 'assets.view',
            'work-orders.viewAny', 'work-orders.view'
        ]);
        
        // Make first user super admin if exists
        $firstUser = User::first();
        if ($firstUser && !$firstUser->is_super_admin) {
            $firstUser->update(['is_super_admin' => true]);
        }
    }
}
```

### 8. API Resources with Authorization

```php
// app/Http/Resources/AssetResource.php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'serial_number' => $this->serial_number,
            'plant_id' => $this->plant_id,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'can' => [
                'update' => $request->user()->can('update', $this->resource),
                'delete' => $request->user()->can('delete', $this->resource),
            ],
        ];
    }
}
```

## Security Considerations

### 1. Laravel Security Features
- **CSRF Protection**: Automatically enabled for all POST, PUT, PATCH, DELETE requests
- **SQL Injection Protection**: Using Eloquent ORM and query builder
- **XSS Protection**: Blade's automatic escaping
- **Mass Assignment Protection**: Using `$fillable` and `$guarded` properties

### 2. Permission Caching
```php
// config/permission.php
return [
    'cache' => [
        'expiration_time' => \DateInterval::createFromDateString('24 hours'),
        'key' => 'spatie.permission.cache',
        'model_key' => 'name',
        'store' => 'default',
    ],
];
```

### 3. Rate Limiting
```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        'throttle:api',
        // ... other middleware
    ],
];

// routes/api.php
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::post('/permissions/check', [PermissionController::class, 'check']);
});
```

## API Design

### Laravel API Routes

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    // Permission checking
    Route::post('/permissions/check', [PermissionController::class, 'check']);
    Route::post('/permissions/check-bulk', [PermissionController::class, 'checkBulk']);
    
    // User permissions
    Route::get('/users/{user}/permissions', [UserPermissionController::class, 'index']);
    Route::get('/users/{user}/effective-permissions', [UserPermissionController::class, 'effective']);
    
    // Super admin management
    Route::post('/users/{user}/grant-super-admin', [SuperAdminController::class, 'grant'])
        ->middleware('can:grant-super-admin');
    Route::post('/users/{user}/revoke-super-admin', [SuperAdminController::class, 'revoke'])
        ->middleware('can:revoke-super-admin');
    
    // Role management
    Route::apiResource('roles', RoleController::class)
        ->middleware('can:roles.manage');
    
    // Asset management with policy authorization
    Route::apiResource('assets', AssetController::class);
});
```

### API Controller Example

```php
// app/Http/Controllers/Api/PermissionController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Resources\PermissionCheckResource;

class PermissionController extends Controller
{
    public function check(Request $request)
    {
        $validated = $request->validate([
            'permission' => 'required|string',
            'resource_id' => 'sometimes|integer',
            'resource_type' => 'sometimes|string'
        ]);
        
        $user = $request->user();
        $allowed = false;
        $reason = '';
        
        if ($validated['resource_id'] ?? false) {
            $model = app($validated['resource_type'])->find($validated['resource_id']);
            $allowed = $user->can($validated['permission'], $model);
        } else {
            $allowed = $user->can($validated['permission']);
        }
        
        return response()->json([
            'allowed' => $allowed,
            'permission' => $validated['permission'],
            'user_id' => $user->id,
            'is_super_admin' => $user->is_super_admin
        ]);
    }
}
```

## Testing

### Laravel Test Examples

```php
// tests/Feature/PermissionTest.php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Asset;
use App\Models\Plant;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PermissionTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_first_user_becomes_super_admin()
    {
        $user = User::factory()->create();
        
        $this->assertTrue($user->is_super_admin);
    }
    
    public function test_super_admin_can_access_everything()
    {
        $superAdmin = User::factory()->create(['is_super_admin' => true]);
        $asset = Asset::factory()->create();
        
        $this->actingAs($superAdmin);
        
        $this->assertTrue($superAdmin->can('update', $asset));
        $this->assertTrue($superAdmin->can('delete', $asset));
        $this->assertTrue($superAdmin->can('assets.create'));
    }
    
    public function test_plant_scoped_permission()
    {
        $user = User::factory()->create(['is_super_admin' => false]);
        $plant1 = Plant::factory()->create();
        $plant2 = Plant::factory()->create();
        
        // Give permission for plant1 only
        $permission = Permission::create([
            'name' => "assets.create.plant.{$plant1->id}",
            'resource' => 'asset',
            'action' => 'create',
            'scope_type' => 'plant',
            'scope_context' => ['plant_id' => $plant1->id]
        ]);
        
        $user->givePermissionTo($permission);
        
        $this->actingAs($user);
        
        $this->assertTrue($user->can('create', [Asset::class, $plant1]));
        $this->assertFalse($user->can('create', [Asset::class, $plant2]));
    }
    
    public function test_api_permission_check()
    {
        $user = User::factory()->create(['is_super_admin' => false]);
        $user->givePermissionTo('assets.view');
        
        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/permissions/check', [
                'permission' => 'assets.view'
            ]);
        
        $response->assertOk()
            ->assertJson([
                'allowed' => true,
                'permission' => 'assets.view'
            ]);
    }
}
```

## Performance Optimizations

### 1. Laravel Query Optimization
```php
// Eager loading relationships
$users = User::with(['roles', 'permissions'])->get();

// Using Laravel's query builder for complex permission checks
$userPermissions = DB::table('model_has_permissions')
    ->join('permissions', 'model_has_permissions.permission_id', '=', 'permissions.id')
    ->where('model_has_permissions.model_id', $userId)
    ->where('model_has_permissions.model_type', User::class)
    ->select('permissions.*')
    ->get();
```

### 2. Laravel Caching
```php
// Using Laravel's cache tags for easy invalidation
Cache::tags(['permissions', "user.{$user->id}"])->remember(
    "user.{$user->id}.permissions",
    3600,
    function () use ($user) {
        return $user->getAllPermissions();
    }
);

// Clear cache when permissions change
Cache::tags(['permissions', "user.{$user->id}"])->flush();
```

### 3. Database Indexing via Migrations
```php
Schema::table('model_has_permissions', function (Blueprint $table) {
    $table->index(['model_id', 'model_type']);
});

Schema::table('model_has_roles', function (Blueprint $table) {
    $table->index(['model_id', 'model_type']);
});
```

## Future Enhancements

### 1. Laravel Sanctum Token Abilities
```php
// Integrate permissions with API token abilities
$token = $user->createToken('api-token', ['assets:read', 'assets:create']);
```

### 2. Laravel Horizon for Queue Management
```php
// Queue permission cache warming
dispatch(new WarmPermissionCache($user))->onQueue('permissions');
```

### 3. Laravel Nova Integration
- Custom permission management UI
- Role and permission assignment tools
- Audit log viewer

## Conclusion

This permission system fully leverages Laravel's built-in authorization capabilities while providing the flexibility and granularity required for a maintenance management system. By using Spatie's Laravel-Permission package as a foundation and extending it with custom scoping logic, we achieve a robust, performant, and Laravel-idiomatic solution that integrates seamlessly with Laravel's Gates, Policies, and middleware system. 
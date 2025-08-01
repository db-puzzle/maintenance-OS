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
9. [Testing](#testing)
10. [Performance Optimizations](#performance-optimizations)
11. [Custom Permission Management UI](#custom-permission-management-ui)
12. [Future Enhancements](#future-enhancements)
13. [Conclusion](#conclusion)

## Overview

This document outlines a comprehensive permission system for a maintenance management system that fully leverages Laravel's built-in authorization capabilities. The system provides granular access control at multiple levels while utilizing Laravel's Gates, Policies, and middleware system.

### Key Requirements
- First user to sign up becomes the Super Administrator
- Super Administrators can grant super administrator privileges to other users
- New users can only be added by invitation from system administrators
- Invitations are sent via email with secure, time-limited tokens
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
- **Laravel Notifications**: For invitation emails
- **Signed URLs**: For secure invitation links
- **Inertia.js**: For seamless React integration with Laravel backend

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

### 5. Scopes (Naming Convention)
- Scopes are encoded directly in the permission name (e.g., `assets.create.plant.123`)
- No additional metadata needed - the permission name contains all information
- Evaluated through simple string matching and hierarchy logic

### 6. User Invitations (Laravel Notifications & Signed URLs)
- Only system administrators can invite new users
- Invitations are sent via Laravel Notifications (email)
- Each invitation contains a signed URL with expiration
- Invitations can specify initial role assignment
- Audit trail for all invitations (sent, accepted, expired)
- Ability to revoke pending invitations

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
        'display_name',
        'description',
        'sort_order'
    ];

    /**
     * Parse the permission name to extract components
     * Example: 'assets.create.plant.123' => ['resource' => 'assets', 'action' => 'create', 'scope' => 'plant', 'scope_id' => '123']
     */
    public function parsePermission()
    {
        $parts = explode('.', $this->name);
        
        return [
            'resource' => $parts[0] ?? null,
            'action' => $parts[1] ?? null,
            'scope' => $parts[2] ?? null,
            'scope_id' => $parts[3] ?? null,
        ];
    }

    public function scopeForResource($query, $resource)
    {
        return $query->where('name', 'like', $resource . '.%');
    }

    public function scopeForAction($query, $resource, $action)
    {
        return $query->where('name', 'like', $resource . '.' . $action . '%');
    }
}
```

### 3. User Invitation Model
```php
// app/Models/UserInvitation.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserInvitation extends Model
{
    protected $fillable = [
        'email',
        'token',
        'invited_by',
        'initial_role',
        'initial_permissions',
        'expires_at',
        'accepted_at',
        'accepted_by',
        'revoked_at',
        'revoked_by',
        'revocation_reason'
    ];

    protected $casts = [
        'initial_permissions' => 'array',
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'revoked_at' => 'datetime'
    ];

    protected static function booted()
    {
        static::creating(function ($invitation) {
            $invitation->token = Str::random(64);
            $invitation->expires_at = Carbon::now()->addDays(7);
        });
    }

    public function invitedBy()
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function acceptedBy()
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    public function isValid()
    {
        return !$this->accepted_at 
            && !$this->revoked_at 
            && $this->expires_at->isFuture();
    }

    public function generateSignedUrl()
    {
        return URL::temporarySignedRoute(
            'invitations.accept',
            $this->expires_at,
            ['token' => $this->token]
        );
    }
}
```

### 4. Invitation Notification
```php
// app/Notifications/UserInvitation.php
namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\UserInvitation as InvitationModel;

class UserInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    protected $invitation;

    public function __construct(InvitationModel $invitation)
    {
        $this->invitation = $invitation;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('Invitation to join ' . config('app.name'))
            ->greeting('Hello!')
            ->line('You have been invited to join our maintenance management system by ' . $this->invitation->invitedBy->name . '.')
            ->action('Accept Invitation', $this->invitation->generateSignedUrl())
            ->line('This invitation will expire on ' . $this->invitation->expires_at->format('F j, Y at g:i A') . '.')
            ->line('If you did not expect to receive this invitation, you can safely ignore this email.');
    }
}
```

### 5. Laravel Authorization Integration
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
        Gate::define($permission->name, function ($user) use ($permission) {
            // Permission check is handled by Spatie package
            return $user->hasPermissionTo($permission->name);
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
            $table->string('display_name')->nullable();
            $table->string('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->index('name'); // For faster permission lookups
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
        
        // User invitations
        Schema::create('user_invitations', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('token', 64)->unique();
            $table->foreignId('invited_by')->constrained('users');
            $table->string('initial_role')->nullable();
            $table->json('initial_permissions')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by')->nullable()->constrained('users');
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users');
            $table->string('revocation_reason')->nullable();
            $table->timestamps();
            $table->index(['email', 'expires_at']);
            $table->index('expires_at');
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
// Permission naming convention following dot notation
$permission = Permission::create([
    'name' => 'assets.create.plant.123', // dot notation: resource.action.scope.id
    'display_name' => 'Create Assets in Plant Springfield',
    'description' => 'Allows creating new assets in the Springfield plant',
    'guard_name' => 'web'
]);

// Global permission (no scope)
$permission = Permission::create([
    'name' => 'assets.create',
    'display_name' => 'Create Assets (Global)',
    'description' => 'Allows creating assets in any location'
]);

// Ownership-based permission
$permission = Permission::create([
    'name' => 'assets.update.owned',
    'display_name' => 'Update Own Assets',
    'description' => 'Allows updating only assets created by the user'
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
        // Check hierarchical permissions: plant -> area -> sector -> asset
        return $user->can("assets.view.plant.{$asset->plant_id}")
            || $user->can("assets.view.area.{$asset->area_id}")
            || $user->can("assets.view.sector.{$asset->sector_id}")
            || $user->can("assets.view.{$asset->id}")
            || $user->can('assets.view')  // Global permission
            || ($user->can('assets.view.owned') && $user->id === $asset->created_by);
    }
    
    public function create(User $user, Plant $plant = null)
    {
        if ($plant) {
            return $user->can("assets.create.plant.{$plant->id}")
                || $user->can('assets.create');  // Global permission
        }
        
        return $user->can('assets.create');  // Global permission
    }
    
    public function update(User $user, Asset $asset)
    {
        // Check hierarchical permissions
        return $user->can("assets.update.plant.{$asset->plant_id}")
            || $user->can("assets.update.area.{$asset->area_id}")
            || $user->can("assets.update.sector.{$asset->sector_id}")
            || $user->can("assets.update.{$asset->id}")
            || $user->can('assets.update')  // Global permission
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

### 2. Permission Hierarchy Service

```php
// app/Services/PermissionHierarchyService.php
namespace App\Services;

use App\Models\User;
use App\Models\Asset;
use App\Models\Sector;
use App\Models\Area;

class PermissionHierarchyService
{
    /**
     * Check if user has permission considering hierarchy
     */
    public function checkHierarchicalPermission(User $user, string $basePermission, $model = null): bool
    {
        // Super admin always has access
        if ($user->is_super_admin) {
            return true;
        }

        // Check global permission first
        if ($user->can($basePermission)) {
            return true;
        }

        // If no model provided, only global permission matters
        if (!$model) {
            return false;
        }

        // Check model-specific permissions based on hierarchy
        return $this->checkModelPermissions($user, $basePermission, $model);
    }

    private function checkModelPermissions(User $user, string $basePermission, $model): bool
    {
        // For assets, check full hierarchy: asset -> sector -> area -> plant
        if ($model instanceof Asset) {
            return $user->can("{$basePermission}.{$model->id}")
                || $user->can("{$basePermission}.sector.{$model->sector_id}")
                || $user->can("{$basePermission}.area.{$model->area_id}")
                || $user->can("{$basePermission}.plant.{$model->plant_id}")
                || ($this->isOwnershipPermission($basePermission) && $model->created_by === $user->id);
        }

        // For sectors, check: sector -> area -> plant
        if ($model instanceof Sector) {
            return $user->can("{$basePermission}.{$model->id}")
                || $user->can("{$basePermission}.area.{$model->area_id}")
                || $user->can("{$basePermission}.plant.{$model->area->plant_id}");
        }

        // For areas, check: area -> plant
        if ($model instanceof Area) {
            return $user->can("{$basePermission}.{$model->id}")
                || $user->can("{$basePermission}.plant.{$model->plant_id}");
        }

        // For other models, just check specific permission
        return $user->can("{$basePermission}.{$model->id}");
    }

    private function isOwnershipPermission(string $permission): bool
    {
        return str_contains($permission, '.owned');
    }

    /**
     * Get all entities user has access to for a given permission
     */
    public function getAccessibleEntities(User $user, string $resource, string $action): array
    {
        $basePermission = "{$resource}.{$action}";
        
        // Super admin or global permission = access to all
        if ($user->is_super_admin || $user->can($basePermission)) {
            return ['all' => true];
        }

        $accessible = [
            'plants' => [],
            'areas' => [],
            'sectors' => [],
            'assets' => [],
            'owned_only' => false
        ];

        // Check all user permissions
        foreach ($user->getAllPermissions() as $permission) {
            if (!str_starts_with($permission->name, $basePermission)) {
                continue;
            }

            $parts = explode('.', $permission->name);
            
            // Handle ownership permission
            if (end($parts) === 'owned') {
                $accessible['owned_only'] = true;
                continue;
            }

            // Handle scoped permissions
            if (count($parts) >= 4) {
                $scope = $parts[2];
                $id = $parts[3];
                
                switch ($scope) {
                    case 'plant':
                        $accessible['plants'][] = $id;
                        break;
                    case 'area':
                        $accessible['areas'][] = $id;
                        break;
                    case 'sector':
                        $accessible['sectors'][] = $id;
                        break;
                    default:
                        $accessible['assets'][] = $id;
                }
            }
        }

        return $accessible;
    }
}
```

### 3. Inertia.js Middleware Configuration

```php
// app/Http/Middleware/HandleInertiaRequests.php
namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    public function version(Request $request)
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function share(Request $request)
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'is_super_admin' => $request->user()->is_super_admin,
                ] : null,
                'permissions' => $request->user() ? $request->user()->getAllPermissions()->pluck('name') : [],
                'roles' => $request->user() ? $request->user()->getRoleNames() : [],
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
            ],
        ]);
    }
}
```

### 3. Middleware Implementation

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

### 4. Disable Public Registration

```php
// app/Providers/RouteServiceProvider.php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
    public function boot()
    {
        // Disable registration routes except for first user
        Route::macro('authWithConditionalRegistration', function () {
            // Check if any users exist
            $hasUsers = \App\Models\User::exists();
            
            if (!$hasUsers) {
                // Allow registration for first user only
                Route::get('register', [RegisterController::class, 'showRegistrationForm'])->name('register');
                Route::post('register', [RegisterController::class, 'register']);
            }
            
            // Always allow login and other auth routes
            Route::get('login', [LoginController::class, 'showLoginForm'])->name('login');
            Route::post('login', [LoginController::class, 'login']);
            Route::post('logout', [LoginController::class, 'logout'])->name('logout');
            
            // Invitation routes (public)
            Route::get('invitations/{token}', [UserInvitationController::class, 'show'])->name('invitations.show');
            Route::post('invitations/{token}/accept', [UserInvitationController::class, 'accept'])->name('invitations.accept');
        });
    }
}

// routes/web.php
Route::authWithConditionalRegistration();

// routes/auth.php (Laravel Breeze/Jetstream)
// Comment out or remove the registration routes
// Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
// Route::post('/register', [RegisteredUserController::class, 'store']);
```

### 4. Form Request Authorization

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

### 5. Controller Implementation

```php
// app/Http/Controllers/AssetController.php
namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Plant;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use Inertia\Inertia;

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
        $hierarchyService = app(PermissionHierarchyService::class);
        $accessible = $hierarchyService->getAccessibleEntities($request->user(), 'assets', 'viewAny');
        
        $assets = Asset::query()
            ->when($accessible !== ['all' => true], function ($query) use ($accessible, $request) {
                $query->where(function ($q) use ($accessible, $request) {
                    // Add conditions based on accessible entities
                    if (!empty($accessible['plants'])) {
                        $q->orWhereIn('plant_id', $accessible['plants']);
                    }
                    if (!empty($accessible['areas'])) {
                        $q->orWhereIn('area_id', $accessible['areas']);
                    }
                    if (!empty($accessible['sectors'])) {
                        $q->orWhereIn('sector_id', $accessible['sectors']);
                    }
                    if (!empty($accessible['assets'])) {
                        $q->orWhereIn('id', $accessible['assets']);
                    }
                    if ($accessible['owned_only']) {
                        $q->orWhere('created_by', $request->user()->id);
                    }
                });
            })
            ->paginate();
            
        return Inertia::render('Assets/Index', [
            'assets' => $assets,
            'can' => [
                'createAsset' => $request->user()->can('create', Asset::class)
            ]
        ]);
    }
    
    public function create(Plant $plant = null)
    {
        // Authorization handled by policy
        return Inertia::render('Assets/Create', [
            'plant' => $plant,
            'plants' => $plant ? [$plant] : Plant::all()
        ]);
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

### 6. React Components with Inertia.js

```tsx
// resources/js/Pages/Assets/Index.tsx
import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface Asset {
    id: number;
    name: string;
    serial_number: string;
    plant_id: number;
    can: {
        view: boolean;
        update: boolean;
        delete: boolean;
    };
}

interface Props {
    assets: {
        data: Asset[];
        links: any;
    };
    can: {
        createAsset: boolean;
    };
}

export default function AssetsIndex({ assets, can }: Props) {
    const { auth } = usePage().props;
    const currentPlant = usePage().props.currentPlant;

    const handleDelete = (asset: Asset) => {
        if (confirm('Are you sure you want to delete this asset?')) {
            router.delete(route('assets.destroy', asset.id));
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl">Assets</h2>}
        >
            <div className="container mx-auto py-6">
                {can.createAsset && (
                    <Link
                        href={route('assets.create')}
                        className="btn btn-primary mb-4"
                    >
                        Create New Asset
                    </Link>
                )}
                
                {currentPlant && auth.permissions?.includes(`assets.create.plant.${currentPlant.id}`) && (
                    <Link
                        href={route('assets.create', { plant: currentPlant.id })}
                        className="btn btn-secondary mb-4 ml-2"
                    >
                        Create Asset in {currentPlant.name}
                    </Link>
                )}
                
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Serial Number</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.data.map((asset) => (
                            <tr key={asset.id}>
                                <td>{asset.name}</td>
                                <td>{asset.serial_number}</td>
                                <td className="space-x-2">
                                    {asset.can.view && (
                                        <Link
                                            href={route('assets.show', asset.id)}
                                            className="text-blue-600 hover:underline"
                                        >
                                            View
                                        </Link>
                                    )}
                                    
                                    {asset.can.update && (
                                        <Link
                                            href={route('assets.edit', asset.id)}
                                            className="text-green-600 hover:underline"
                                        >
                                            Edit
                                        </Link>
                                    )}
                                    
                                    {asset.can.delete && (
                                        <button
                                            onClick={() => handleDelete(asset)}
                                            className="text-red-600 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Pagination component would go here */}
            </div>
        </AuthenticatedLayout>
    );
}
```

```tsx
// resources/js/Hooks/usePermissions.ts
import { usePage } from '@inertiajs/react';

export function usePermissions() {
    const { auth } = usePage().props;
    
    const can = (permission: string, model?: any): boolean => {
        if (auth.user?.is_super_admin) {
            return true;
        }
        
        // Check direct permissions
        if (auth.permissions?.includes(permission)) {
            return true;
        }
        
        // Check scoped permissions if model provided
        if (model && model.id) {
            const scopedPermission = `${permission}.${model.constructor.name.toLowerCase()}.${model.id}`;
            return auth.permissions?.includes(scopedPermission) || false;
        }
        
        return false;
    };
    
    const canAny = (permissions: string[]): boolean => {
        return permissions.some(permission => can(permission));
    };
    
    return { can, canAny };
}
```

```tsx
// resources/js/Components/PermissionGuard.tsx
import React from 'react';
import { usePermissions } from '@/Hooks/usePermissions';

interface Props {
    permission: string | string[];
    fallback?: React.ReactNode;
    children: React.ReactNode;
}

export default function PermissionGuard({ permission, fallback = null, children }: Props) {
    const { can, canAny } = usePermissions();
    
    const hasPermission = Array.isArray(permission) 
        ? canAny(permission)
        : can(permission);
    
    return hasPermission ? <>{children}</> : <>{fallback}</>;
}

// Usage example:
// <PermissionGuard permission="assets.create">
//     <CreateAssetButton />
// </PermissionGuard>
```

### 6.1 Invitation Management React Components

```tsx
// resources/js/Pages/Invitations/Index.tsx
import React from 'react';
import { Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PermissionGuard from '@/Components/PermissionGuard';
import { format } from 'date-fns';

interface Invitation {
    id: number;
    email: string;
    invited_by: {
        id: number;
        name: string;
    };
    accepted_at: string | null;
    revoked_at: string | null;
    expires_at: string;
    is_valid: boolean;
    can: {
        revoke: boolean;
    };
}

interface Props {
    invitations: {
        data: Invitation[];
        links: any;
    };
}

export default function InvitationsIndex({ invitations }: Props) {
    const handleRevoke = (invitation: Invitation) => {
        if (confirm('Are you sure you want to revoke this invitation?')) {
            router.post(route('invitations.revoke', invitation.id));
        }
    };

    const handleResend = (invitation: Invitation) => {
        router.post(route('invitations.resend', invitation.id));
    };

    const getStatusBadge = (invitation: Invitation) => {
        if (invitation.accepted_at) {
            return <span className="badge badge-success">Accepted</span>;
        }
        if (invitation.revoked_at) {
            return <span className="badge badge-danger">Revoked</span>;
        }
        if (new Date(invitation.expires_at) < new Date()) {
            return <span className="badge badge-warning">Expired</span>;
        }
        return <span className="badge badge-info">Pending</span>;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl">User Invitations</h2>
                    <PermissionGuard permission="users.invite">
                        <Link
                            href={route('invitations.create')}
                            className="btn btn-primary"
                        >
                            Invite New User
                        </Link>
                    </PermissionGuard>
                </div>
            }
        >
            <div className="container mx-auto py-6">
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Invited By</th>
                            <th>Status</th>
                            <th>Expires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invitations.data.map((invitation) => (
                            <tr key={invitation.id}>
                                <td>{invitation.email}</td>
                                <td>{invitation.invited_by.name}</td>
                                <td>{getStatusBadge(invitation)}</td>
                                <td>{format(new Date(invitation.expires_at), 'MMM d, yyyy h:mm a')}</td>
                                <td className="space-x-2">
                                    {invitation.is_valid && (
                                        <>
                                            {invitation.can.revoke && (
                                                <button
                                                    onClick={() => handleRevoke(invitation)}
                                                    className="btn btn-sm btn-danger"
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                            
                                            <PermissionGuard permission="users.invite">
                                                <button
                                                    onClick={() => handleResend(invitation)}
                                                    className="btn btn-sm btn-secondary"
                                                >
                                                    Resend
                                                </button>
                                            </PermissionGuard>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Pagination links */}
            </div>
        </AuthenticatedLayout>
    );
}
```

```tsx
// resources/js/Pages/Invitations/Create.tsx
import React from 'react';
import { useForm, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { TextInput } from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import TextArea from '@/Components/TextArea';
import PrimaryButton from '@/Components/PrimaryButton';

interface Role {
    id: number;
    name: string;
}

interface Props {
    roles: Role[];
}

export default function InvitationsCreate({ roles }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        initial_role: '',
        message: ''
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('invitations.store'));
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl">Invite New User</h2>}
        >
            <div className="max-w-2xl mx-auto py-6">
                <div className="bg-white shadow-sm rounded-lg p-6">
                    <form onSubmit={submit}>
                        <div className="mb-4">
                            <InputLabel htmlFor="email" value="Email Address" />
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full"
                                autoComplete="email"
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                            <InputError message={errors.email} className="mt-2" />
                        </div>

                        <div className="mb-4">
                            <InputLabel htmlFor="initial_role" value="Initial Role (Optional)" />
                            <SelectInput
                                id="initial_role"
                                name="initial_role"
                                value={data.initial_role}
                                className="mt-1 block w-full"
                                onChange={(e) => setData('initial_role', e.target.value)}
                            >
                                <option value="">-- Select Role --</option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.name}>
                                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                    </option>
                                ))}
                            </SelectInput>
                            <InputError message={errors.initial_role} className="mt-2" />
                        </div>

                        <div className="mb-4">
                            <InputLabel htmlFor="message" value="Personal Message (Optional)" />
                            <TextArea
                                id="message"
                                name="message"
                                value={data.message}
                                className="mt-1 block w-full"
                                rows={3}
                                onChange={(e) => setData('message', e.target.value)}
                            />
                            <InputError message={errors.message} className="mt-2" />
                        </div>

                        <div className="flex items-center justify-end mt-6">
                            <Link
                                href={route('invitations.index')}
                                className="btn btn-secondary mr-3"
                            >
                                Cancel
                            </Link>
                            <PrimaryButton disabled={processing}>
                                Send Invitation
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

```tsx
// resources/js/Pages/Invitations/Accept.tsx
import React from 'react';
import { useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { TextInput } from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';

interface Props {
    invitation: {
        id: number;
        email: string;
        token: string;
        invited_by: {
            name: string;
        };
    };
}

export default function InvitationsAccept({ invitation }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        password: '',
        password_confirmation: ''
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('invitations.accept', invitation.token));
    };

    return (
        <GuestLayout>
            <div className="mb-4 text-sm text-gray-600">
                You have been invited by {invitation.invited_by.name} to join our system.
                Please complete your registration below.
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={invitation.email}
                        className="mt-1 block w-full bg-gray-100"
                        disabled
                    />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="name" value="Name" />
                    <TextInput
                        id="name"
                        type="text"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password_confirmation" value="Confirm Password" />
                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    <InputError message={errors.password_confirmation} className="mt-2" />
                </div>

                <div className="flex items-center justify-end mt-4">
                    <PrimaryButton className="ml-4" disabled={processing}>
                        Complete Registration
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
```

### 7. Event-Based Audit Logging

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

### 4. Database Indexing via Migrations
```php
Schema::table('model_has_permissions', function (Blueprint $table) {
    $table->index(['model_id', 'model_type']);
});

Schema::table('model_has_roles', function (Blueprint $table) {
    $table->index(['model_id', 'model_type']);
});
```

### 5. Invitation System Security
```php
// Token generation and security
- Uses cryptographically secure random tokens (64 characters)
- Tokens are unique and indexed for fast lookup
- Invitations expire after 7 days by default
- One-time use tokens (marked as accepted after use)

// Email verification
- Invitations serve as email verification
- Users created via invitation have email_verified_at set automatically

// Rate limiting for invitation endpoints
Route::middleware(['throttle:invitations'])->group(function () {
    Route::post('/invitations', [UserInvitationController::class, 'store']);
});

// config/rate_limiting.php
RateLimiter::for('invitations', function (Request $request) {
    return Limit::perMinute(5)->by($request->user()->id);
});

// Preventing invitation spam
- Validate that email doesn't already exist in users table
- Check for existing pending invitations
- Audit trail of who sent each invitation
- Ability to revoke pending invitations

// Secure invitation URLs
- Uses Laravel's signed URL feature
- URLs expire at the same time as the invitation
- Cannot be tampered with or extended
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
    
    // User invitation management
    Route::prefix('invitations')->group(function () {
        Route::get('/', [UserInvitationController::class, 'index'])
            ->middleware('can:users.invite');
        Route::post('/', [UserInvitationController::class, 'store'])
            ->middleware('can:users.invite');
        Route::get('/pending', [UserInvitationController::class, 'pending'])
            ->middleware('can:users.invite');
        Route::post('/{invitation}/revoke', [UserInvitationController::class, 'revoke'])
            ->middleware('can:revoke,invitation');
        Route::post('/{invitation}/resend', [UserInvitationController::class, 'resend'])
            ->middleware('can:users.invite');
    });
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
    
    public function test_only_administrators_can_invite_users()
    {
        $admin = User::factory()->create(['is_super_admin' => false]);
        $admin->givePermissionTo('users.invite');
        
        $regularUser = User::factory()->create(['is_super_admin' => false]);
        
        $this->actingAs($admin)
            ->post(route('invitations.store'), [
                'email' => 'newuser@example.com',
                'initial_role' => 'viewer'
            ])
            ->assertRedirect()
            ->assertSessionHas('success');
            
        $this->actingAs($regularUser)
            ->post(route('invitations.store'), [
                'email' => 'another@example.com'
            ])
            ->assertForbidden();
    }
    
    public function test_invitation_creates_user_with_correct_role()
    {
        $admin = User::factory()->create(['is_super_admin' => true]);
        
        // Create invitation
        $this->actingAs($admin);
        $invitation = UserInvitation::create([
            'email' => 'newuser@example.com',
            'invited_by' => $admin->id,
            'initial_role' => 'technician'
        ]);
        
        // Accept invitation
        $response = $this->post(route('invitations.accept', $invitation->token), [
            'name' => 'New User',
            'password' => 'password123',
            'password_confirmation' => 'password123'
        ]);
        
        $response->assertRedirect(route('home'));
        
        // Verify user was created with correct role
        $newUser = User::where('email', 'newuser@example.com')->first();
        $this->assertNotNull($newUser);
        $this->assertTrue($newUser->hasRole('technician'));
        $this->assertNotNull($invitation->fresh()->accepted_at);
    }
    
    public function test_expired_invitations_cannot_be_accepted()
    {
        $invitation = UserInvitation::create([
            'email' => 'expired@example.com',
            'invited_by' => 1,
            'expires_at' => Carbon::now()->subDay()
        ]);
        
        $response = $this->post(route('invitations.accept', $invitation->token), [
            'name' => 'Test User',
            'password' => 'password123',
            'password_confirmation' => 'password123'
        ]);
        
        $response->assertRedirect(route('login'))
            ->assertSessionHas('error');
        
        $this->assertFalse(User::where('email', 'expired@example.com')->exists());
    }
    
    public function test_public_registration_disabled_after_first_user()
    {
        // Ensure at least one user exists
        User::factory()->create();
        
        $response = $this->get('/register');
        $response->assertNotFound();
        
        $response = $this->post('/register', [
            'name' => 'Unauthorized User',
            'email' => 'unauthorized@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123'
        ]);
        $response->assertNotFound();
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

## Custom Permission Management UI

For the complete UI implementation for custom permission management, including the Permission Management Dashboard, Permission Creation/Edit Form, Role Management Component, Permission Matrix Component, and the Permission Audit Log System, please refer to:

**[Custom Permission Management UI Documentation](./CUSTOM_PERMISSION_MANAGEMENT_UI.md)**

This separate document provides detailed React/TypeScript implementations for all UI components, supporting services, and controllers needed for a comprehensive permission management interface.

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

### 4. Real-time Audit Log Monitoring
- WebSocket integration for live audit log updates
- Alert system for critical permission changes
- Dashboard for monitoring permission usage patterns

### 5. Advanced Analytics
- Permission usage statistics
- User activity heat maps
- Anomaly detection for unusual permission patterns

## Key Simplifications from JSON Approach

### What Changed
1. **Removed JSON columns** (`scope_context` and `conditions`) from the permissions table
2. **Permission names contain all scope information** - no need for separate metadata
3. **Simple string parsing** replaces complex JSON queries
4. **Hierarchical checking** is handled by a dedicated service class
5. **Better performance** with standard string indexes instead of JSON queries

### Benefits
- **Simpler database schema** - only standard columns, no JSON
- **Better query performance** - can use standard indexes on permission names
- **Easier to understand** - permission names are self-documenting
- **More maintainable** - all logic is in code, not in database JSON
- **Laravel-native** - works perfectly with Spatie package without complex extensions

### Migration Path
If you have an existing system using the JSON approach:
1. Create the new `PermissionHierarchyService`
2. Update your policies to use the hierarchy service
3. Migrate existing permissions by converting JSON data to structured permission names
4. Remove JSON columns from the database

## Conclusion

This simplified permission system fully leverages Laravel's built-in authorization capabilities while providing the flexibility and granularity required for a maintenance management system. By using Spatie's Laravel-Permission package with a clear naming convention instead of JSON metadata, we achieve a robust, performant, and Laravel-idiomatic solution.

The hierarchical permission structure is encoded directly in the permission names (e.g., `assets.create.plant.123`), making the system self-documenting and easy to understand. The `PermissionHierarchyService` handles the complexity of checking permissions through the hierarchy, while keeping the database schema simple and performant.

The system is built for modern frontend applications using React with Inertia.js, providing a seamless single-page application experience while maintaining Laravel's server-side rendering benefits. Permission checks are shared with the frontend through Inertia's middleware, enabling reactive UI components that respond to user permissions in real-time.

The invitation-only registration system ensures controlled user access, where only system administrators can add new users via secure, time-limited email invitations. This approach maintains system security while providing a smooth onboarding experience for authorized users. 
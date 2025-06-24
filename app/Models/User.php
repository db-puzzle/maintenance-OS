<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'timezone',
        'is_super_admin',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_super_admin' => 'boolean',
        ];
    }

    /**
     * Convert a datetime from user's timezone to UTC
     */
    public function convertToUTC($datetime): Carbon
    {
        return Carbon::parse($datetime, $this->timezone ?? 'UTC')->setTimezone('UTC');
    }

    /**
     * Convert a datetime from UTC to user's timezone
     */
    public function convertFromUTC($datetime): Carbon
    {
        return Carbon::parse($datetime, 'UTC')->setTimezone($this->timezone ?? 'UTC');
    }

    /**
     * Get the routine executions performed by this user
     */
    public function executedRoutines(): HasMany
    {
        return $this->hasMany(\App\Models\Maintenance\RoutineExecution::class, 'executed_by');
    }

    /**
     * Get the execution exports created by this user
     */
    public function executionExports(): HasMany
    {
        return $this->hasMany(\App\Models\Maintenance\ExecutionExport::class);
    }

    /**
     * Boot the model
     */
    protected static function booted()
    {
        static::creating(function ($user) {
            // First user automatically becomes super admin
            if (static::count() === 0) {
                $user->is_super_admin = true;
            }
        });

        static::created(function ($user) {
            // Log user creation
            if (auth()->check()) {
                \App\Services\AuditLogService::log(
                    'user.created',
                    'created',
                    $user,
                    [],
                    $user->toArray(),
                    ['created_by' => auth()->user()->name]
                );
            }
        });
    }

    /**
     * Super admin grants relationship
     */
    public function superAdminGrants()
    {
        return $this->hasMany(SuperAdminGrant::class, 'granted_to');
    }

    /**
     * Super admin grants given relationship
     */
    public function superAdminGrantsGiven()
    {
        return $this->hasMany(SuperAdminGrant::class, 'granted_by');
    }

    /**
     * User invitations sent relationship
     */
    public function invitationsSent()
    {
        return $this->hasMany(UserInvitation::class, 'invited_by');
    }

    /**
     * User invitation accepted relationship
     */
    public function invitationAccepted()
    {
        return $this->hasOne(UserInvitation::class, 'accepted_by');
    }

    /**
     * Check if user is super admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->is_super_admin;
    }

    /**
     * Grant super admin privileges
     */
    public function grantSuperAdmin(User $grantedBy, string $reason = null): SuperAdminGrant
    {
        $this->update(['is_super_admin' => true]);

        $grant = SuperAdminGrant::create([
            'granted_to' => $this->id,
            'granted_by' => $grantedBy->id,
            'granted_at' => now(),
            'reason' => $reason,
        ]);

        \App\Services\AuditLogService::log(
            'user.super_admin.granted',
            'granted',
            $this,
            ['is_super_admin' => false],
            ['is_super_admin' => true],
            [
                'granted_by' => $grantedBy->name,
                'reason' => $reason,
                'user' => $this->name
            ]
        );

        return $grant;
    }

    /**
     * Revoke super admin privileges
     */
    public function revokeSuperAdmin(User $revokedBy, string $reason = null): void
    {
        // Ensure we don't leave the system without any super admins
        $superAdminCount = static::where('is_super_admin', true)->count();
        if ($superAdminCount <= 1) {
            throw new \Exception('Cannot revoke super admin privileges. At least one super administrator must remain.');
        }

        $this->update(['is_super_admin' => false]);

        // Mark existing grants as revoked
        $this->superAdminGrants()
            ->whereNull('revoked_at')
            ->update([
                'revoked_at' => now(),
                'revoked_by' => $revokedBy->id,
                'revocation_reason' => $reason,
            ]);

        \App\Services\AuditLogService::log(
            'user.super_admin.revoked',
            'revoked',
            $this,
            ['is_super_admin' => true],
            ['is_super_admin' => false],
            [
                'revoked_by' => $revokedBy->name,
                'reason' => $reason,
                'user' => $this->name
            ]
        );
    }

    /**
     * Check if user can perform action considering super admin bypass
     */
    public function canAny(array $permissions): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        foreach ($permissions as $permission) {
            if ($this->can($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get all effective permissions including through roles
     */
    public function getAllEffectivePermissions()
    {
        if ($this->is_super_admin) {
            return \App\Models\Permission::all();
        }

        $permissions = $this->getDirectPermissions();
        
        foreach ($this->roles as $role) {
            $permissions = $permissions->merge($role->getAllEffectivePermissions());
        }

        return $permissions->unique('id');
    }

    /**
     * Check hierarchical permission with scope
     */
    public function hasHierarchicalPermission(string $permission, $model = null): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        $hierarchyService = app(\App\Services\PermissionHierarchyService::class);
        return $hierarchyService->checkHierarchicalPermission($this, $permission, $model);
    }

    /**
     * Override hasPermissionTo to include super admin bypass
     */
    public function hasPermissionTo($permission, $guardName = null): bool
    {
        if ($this->is_super_admin) {
            return true;
        }

        return parent::hasPermissionTo($permission, $guardName);
    }

    /**
     * Override hasRole to include super admin bypass for role checking
     */
    public function hasRole($roles, string $guard = null): bool 
    {
        if ($this->is_super_admin) {
            return true;
        }

        return parent::hasRole($roles, $guard);
    }

    /**
     * Get accessible entities for a permission
     */
    public function getAccessibleEntities(string $resource, string $action): array
    {
        if ($this->is_super_admin) {
            return ['all' => true];
        }

        $hierarchyService = app(\App\Services\PermissionHierarchyService::class);
        return $hierarchyService->getAccessibleEntities($this, $resource, $action);
    }
}

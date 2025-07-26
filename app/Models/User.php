<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Skill;
use App\Models\Certification;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, SoftDeletes;

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
     * Get the execution exports created by this user
     */
    public function executionExports(): HasMany
    {
        return $this->hasMany(\App\Models\Maintenance\ExecutionExport::class);
    }

    /**
     * Get work orders created by this user
     */
    public function createdWorkOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'created_by');
    }

    /**
     * Get work orders assigned to this user
     */
    public function assignedWorkOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'assigned_to');
    }

    /**
     * Get work orders approved by this user
     */
    public function approvedWorkOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'approved_by');
    }

    /**
     * Get the skills assigned to this user
     */
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'user_skills')
            ->withPivot('proficiency_level')
            ->withTimestamps();
    }

    /**
     * Get the certifications assigned to this user
     */
    public function certifications(): BelongsToMany
    {
        return $this->belongsToMany(Certification::class, 'user_certifications')
            ->withPivot('issued_at', 'expires_at', 'certificate_number')
            ->withTimestamps();
    }

    /**
     * Get work order executions performed by this user
     */
    public function workOrderExecutions(): HasMany
    {
        return $this->hasMany(WorkOrderExecution::class, 'executed_by');
    }

    /**
     * Get the work cells assigned to this user.
     * This is primarily for machine operators who are assigned to specific work cells.
     */
    public function assignedWorkCells()
    {
        return $this->belongsToMany(\App\Models\Production\WorkCell::class, 'user_work_cells')
            ->withTimestamps();
    }

    /**
     * Boot the model
     */
    protected static function booted()
    {
        static::creating(function ($user) {
            // First user automatically becomes administrator
            if (static::count() === 0) {
                // We'll assign the Administrator role after creation
            }
        });

        static::created(function ($user) {
            // First user gets Administrator role (excluding soft-deleted users)
            if (static::withoutTrashed()->count() === 1) {
                $adminRole = Role::getAdministratorRole();
                if ($adminRole) {
                    $user->assignRole($adminRole);
                }
            }
            
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
     * Check if user is administrator
     */
    public function isAdministrator(): bool
    {
        $adminRole = Role::getAdministratorRole();
        return $adminRole ? $this->hasRole($adminRole) : false;
    }

    /**
     * Grant administrator privileges
     */
    public function grantAdministrator(User $grantedBy, ?string $reason = null): void
    {
        $adminRole = Role::getAdministratorRole();
        if (!$adminRole) {
            throw new \Exception('Administrator role not found');
        }
        
        $this->assignRole($adminRole);

        \App\Services\AuditLogService::log(
            'user.administrator.granted',
            'granted',
            $this,
            ['is_administrator' => false],
            ['is_administrator' => true],
            [
                'granted_by' => $grantedBy->name,
                'reason' => $reason,
                'user' => $this->name
            ]
        );
    }

    /**
     * Revoke administrator privileges
     */
    public function revokeAdministrator(User $revokedBy, ?string $reason = null): void
    {
        // Check if this would leave the system without administrators
        $adminProtectionService = app(\App\Services\AdministratorProtectionService::class);
        $protectionCheck = $adminProtectionService->canPerformOperation($this, 'revokePermission');
        
        if (!$protectionCheck['allowed']) {
            throw new \Exception($protectionCheck['message']);
        }

        $adminRole = Role::getAdministratorRole();
        if ($adminRole) {
            $this->removeRole($adminRole);
        }

        \App\Services\AuditLogService::log(
            'user.administrator.revoked',
            'revoked',
            $this,
            ['is_administrator' => true],
            ['is_administrator' => false],
            [
                'revoked_by' => $revokedBy->name,
                'reason' => $reason,
                'user' => $this->name
            ]
        );
    }

    /**
     * Check if user can perform action considering administrator bypass
     * Override parent to add administrator bypass
     */
    public function can($ability, $arguments = []): bool
    {
        if ($this->isAdministrator()) {
            return true;
        }

        // Use parent's can method for normal permission checking
        return parent::can($ability, $arguments);
    }

    /**
     * Check if user can perform action considering administrator bypass
     * Override parent to add administrator bypass with wildcard permissions
     */
    public function canAny($abilities, $arguments = []): bool
    {
        if ($this->isAdministrator()) {
            return true;
        }

        // Use Laravel's default Gate functionality
        foreach ((array) $abilities as $ability) {
            if ($this->can($ability, $arguments)) {
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
        if ($this->isAdministrator()) {
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
        if ($this->isAdministrator()) {
            return true;
        }

        $hierarchyService = app(\App\Services\PermissionHierarchyService::class);
        return $hierarchyService->checkHierarchicalPermission($this, $permission, $model);
    }





    /**
     * Get accessible entities for a permission
     */
    public function getAccessibleEntities(string $resource, string $action): array
    {
        if ($this->isAdministrator()) {
            return ['all' => true];
        }

        $hierarchyService = app(\App\Services\PermissionHierarchyService::class);
        return $hierarchyService->getAccessibleEntities($this, $resource, $action);
    }

    /**
     * Check if user has invitation permission for an entity
     */
    public function canInviteToEntity(string $entityType, int $entityId): bool
    {
        if ($this->isAdministrator()) {
            return true;
        }

        return $this->hasPermissionTo("users.invite.{$entityType}.{$entityId}");
    }

    /**
     * Get all entities user can invite to
     */
    public function getInvitableEntities(): array
    {
        if ($this->isAdministrator()) {
            return ['all' => true];
        }

        $invitable = [
            'plants' => [],
            'areas' => [],
            'sectors' => []
        ];

        foreach ($this->getAllEffectivePermissions() as $permission) {
            if (str_starts_with($permission->name, 'users.invite.')) {
                $parsed = $permission->parsePermission();
                if ($parsed['scope'] && $parsed['scope_id']) {
                    $invitable[$parsed['scope'] . 's'][] = (int) $parsed['scope_id'];
                }
            }
        }

        return $invitable;
    }
}

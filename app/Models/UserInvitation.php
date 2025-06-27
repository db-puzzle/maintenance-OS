<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\URL;

class UserInvitation extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'email',
        'token',
        'invited_by',
        'initial_role',
        'initial_permissions',
        'message',
        'expires_at',
        'accepted_at',
        'accepted_by',
        'revoked_at',
        'revoked_by',
        'revocation_reason'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'initial_permissions' => 'array',
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'token',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        static::creating(function ($invitation) {
            // Generate secure token
            $invitation->token = $invitation->token ?: Str::random(64);
            
            // Set default expiration if not provided
            $invitation->expires_at = $invitation->expires_at ?: now()->addDays(7);
        });
    }

    /**
     * Get the user who sent the invitation.
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * Get the user who accepted the invitation.
     */
    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    /**
     * Get the user who revoked the invitation.
     */
    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }

    /**
     * Check if the invitation is valid.
     */
    public function isValid(): bool
    {
        return !$this->isExpired() 
            && !$this->isAccepted() 
            && !$this->isRevoked();
    }

    /**
     * Check if the invitation is expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the invitation was accepted.
     */
    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }

    /**
     * Check if the invitation was revoked.
     */
    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    /**
     * Mark the invitation as accepted.
     */
    public function markAsAccepted(User $user): void
    {
        $this->update([
            'accepted_at' => now(),
            'accepted_by' => $user->id,
        ]);
    }

    /**
     * Revoke the invitation.
     */
    public function revoke(User $revokedBy, string $reason = null): void
    {
        $this->update([
            'revoked_at' => now(),
            'revoked_by' => $revokedBy->id,
            'revocation_reason' => $reason,
        ]);
    }

    /**
     * Get the invitation URL.
     */
    public function getUrlAttribute(): string
    {
        return route('invitations.accept', ['token' => $this->token]);
    }

    /**
     * Get status of the invitation.
     */
    public function getStatusAttribute(): string
    {
        if ($this->isAccepted()) {
            return 'accepted';
        }
        
        if ($this->isRevoked()) {
            return 'revoked';
        }
        
        if ($this->isExpired()) {
            return 'expired';
        }
        
        return 'pending';
    }

    /**
     * Get status color for UI.
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'accepted' => 'success',
            'revoked' => 'danger',
            'expired' => 'warning',
            'pending' => 'info',
            default => 'secondary'
        };
    }

    /**
     * Scope a query to only include pending invitations.
     */
    public function scopePending($query)
    {
        return $query->whereNull('accepted_at')
                    ->whereNull('revoked_at')
                    ->where('expires_at', '>', now());
    }

    /**
     * Scope a query to only include expired invitations.
     */
    public function scopeExpired($query)
    {
        return $query->whereNull('accepted_at')
                    ->whereNull('revoked_at')
                    ->where('expires_at', '<=', now());
    }

    /**
     * V2: Get parsed initial permissions with entity scope
     */
    public function getParsedPermissionsAttribute(): array
    {
        if (!$this->initial_permissions) {
            return [];
        }

        $parsed = [];
        foreach ($this->initial_permissions as $permission) {
            $parts = explode('.', $permission);
            $resource = $parts[0] ?? '';
            $action = $parts[1] ?? '';
            $scope = $parts[2] ?? null;
            $entityId = $parts[3] ?? null;

            $parsed[] = [
                'permission' => $permission,
                'resource' => $resource,
                'action' => $action,
                'scope' => $scope,
                'entity_id' => $entityId,
                'is_scoped' => $scope && $entityId
            ];
        }

        return $parsed;
    }

    /**
     * V2: Get entities this invitation grants access to
     */
    public function getGrantedEntitiesAttribute(): array
    {
        $entities = [
            'plants' => [],
            'areas' => [],
            'sectors' => []
        ];

        foreach ($this->parsed_permissions as $perm) {
            if ($perm['is_scoped'] && in_array($perm['scope'], ['plant', 'area', 'sector'])) {
                $entities[$perm['scope'] . 's'][] = (int) $perm['entity_id'];
            }
        }

        // Remove duplicates
        foreach ($entities as $type => $ids) {
            $entities[$type] = array_unique($ids);
        }

        return $entities;
    }

    /**
     * V2: Check if invitation is within inviter's permission scope
     */
    public function isWithinInviterScope(): bool
    {
        if (!$this->inviter) {
            return false;
        }

        // Administrators can invite anywhere
        if ($this->inviter->isAdministrator()) {
            return true;
        }

        // Check each permission is within inviter's scope
        foreach ($this->initial_permissions as $permission) {
            if (!$this->inviter->hasPermissionTo($permission)) {
                // Check if inviter has invitation permission for the entity
                $parts = explode('.', $permission);
                if (count($parts) >= 4) {
                    $scope = $parts[2];
                    $entityId = $parts[3];
                    
                    if (!$this->inviter->canInviteToEntity($scope, $entityId)) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Generate signed URL for invitation
     */
    public function generateSignedUrl(): string
    {
        return URL::temporarySignedRoute(
            'invitations.accept',
            $this->expires_at,
            ['token' => $this->token]
        );
    }

    /**
     * Accept the invitation
     */
    public function accept(User $user): void
    {
        if (!$this->isValid()) {
            throw new \Exception('Invitation is not valid');
        }

        $this->update([
            'accepted_at' => now(),
            'accepted_by' => $user->id
        ]);

        // Assign initial role if specified
        if ($this->initial_role) {
            $role = Role::where('name', $this->initial_role)->first();
            if ($role) {
                $user->assignRole($role);
            }
        }

        // Assign initial permissions if specified
        if ($this->initial_permissions) {
            foreach ($this->initial_permissions as $permissionName) {
                $permission = Permission::where('name', $permissionName)->first();
                if ($permission) {
                    $user->givePermissionTo($permission);
                }
            }
        }

        \App\Services\AuditLogService::log(
            'invitation.accepted',
            'accepted',
            $this,
            [],
            ['accepted_by' => $user->id],
            [
                'email' => $this->email,
                'user' => $user->name,
                'invited_by' => $this->inviter->name
            ]
        );
    }

    /**
     * Get can attribute for authorization
     */
    public function getCanAttribute(): array
    {
        $user = auth()->user();
        
        return [
            'revoke' => $user && ($user->isAdministrator() || $user->can('invitations.revoke')),
            'resend' => $user && ($user->isAdministrator() || $user->can('users.invite')),
        ];
    }
}
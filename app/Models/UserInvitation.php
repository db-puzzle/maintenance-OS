<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\URL;

class UserInvitation extends Model
{
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

    /**
     * Invited by user relationship
     */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /**
     * Accepted by user relationship
     */
    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    /**
     * Revoked by user relationship
     */
    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }

    /**
     * Check if invitation is valid
     */
    public function isValid(): bool
    {
        return !$this->accepted_at 
            && !$this->revoked_at 
            && $this->expires_at->isFuture();
    }

    /**
     * Check if invitation is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if invitation is accepted
     */
    public function isAccepted(): bool
    {
        return !is_null($this->accepted_at);
    }

    /**
     * Check if invitation is revoked
     */
    public function isRevoked(): bool
    {
        return !is_null($this->revoked_at);
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
                'invited_by' => $this->invitedBy->name
            ]
        );
    }

    /**
     * Revoke the invitation
     */
    public function revoke(User $revokedBy, string $reason = null): void
    {
        if ($this->isAccepted()) {
            throw new \Exception('Cannot revoke accepted invitation');
        }

        $this->update([
            'revoked_at' => now(),
            'revoked_by' => $revokedBy->id,
            'revocation_reason' => $reason
        ]);

        \App\Services\AuditLogService::log(
            'invitation.revoked',
            'revoked',
            $this,
            ['revoked_at' => null],
            ['revoked_at' => now()],
            [
                'email' => $this->email,
                'revoked_by' => $revokedBy->name,
                'reason' => $reason
            ]
        );
    }

    /**
     * Scope for valid invitations
     */
    public function scopeValid($query)
    {
        return $query->whereNull('accepted_at')
                    ->whereNull('revoked_at')
                    ->where('expires_at', '>', now());
    }

    /**
     * Scope for expired invitations
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', now())
                    ->whereNull('accepted_at')
                    ->whereNull('revoked_at');
    }

    /**
     * Scope for pending invitations
     */
    public function scopePending($query)
    {
        return $query->whereNull('accepted_at')
                    ->whereNull('revoked_at');
    }

    /**
     * Get status attribute
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
     * Get can attribute for authorization
     */
    public function getCanAttribute(): array
    {
        $user = auth()->user();
        
        return [
            'revoke' => $user && ($user->is_super_admin || $user->can('invitations.revoke')),
            'resend' => $user && ($user->is_super_admin || $user->can('users.invite')),
        ];
    }
}
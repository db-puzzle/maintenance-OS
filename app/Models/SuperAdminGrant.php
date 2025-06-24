<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SuperAdminGrant extends Model
{
    protected $fillable = [
        'granted_to',
        'granted_by',
        'granted_at',
        'revoked_at',
        'revoked_by',
        'reason'
    ];

    protected $casts = [
        'granted_at' => 'datetime',
        'revoked_at' => 'datetime'
    ];

    /**
     * User who was granted super admin privileges
     */
    public function grantedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_to');
    }

    /**
     * User who granted the super admin privileges
     */
    public function grantedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by');
    }

    /**
     * User who revoked the super admin privileges
     */
    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }

    /**
     * Check if grant is currently active
     */
    public function isActive(): bool
    {
        return is_null($this->revoked_at);
    }

    /**
     * Scope for active grants
     */
    public function scopeActive($query)
    {
        return $query->whereNull('revoked_at');
    }

    /**
     * Scope for revoked grants
     */
    public function scopeRevoked($query)
    {
        return $query->whereNotNull('revoked_at');
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PermissionAuditLog extends Model
{
    protected $fillable = [
        'event_type',
        'event_action',
        'auditable_type',
        'auditable_id',
        'user_id',
        'impersonator_id',
        'old_values',
        'new_values',
        'metadata',
        'ip_address',
        'user_agent',
        'session_id'
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime'
    ];

    /**
     * Auditable relationship
     */
    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * User who performed the action
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * User who was impersonating (if applicable)
     */
    public function impersonator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'impersonator_id');
    }

    /**
     * Get changes array with old/new comparison
     */
    public function getChangesAttribute(): array
    {
        $changes = [];
        
        if ($this->old_values && $this->new_values) {
            $allKeys = array_unique(array_merge(
                array_keys($this->old_values),
                array_keys($this->new_values)
            ));
            
            foreach ($allKeys as $key) {
                $old = $this->old_values[$key] ?? null;
                $new = $this->new_values[$key] ?? null;
                
                if ($old !== $new) {
                    $changes[$key] = [
                        'old' => $old,
                        'new' => $new
                    ];
                }
            }
        }
        
        return $changes;
    }

    /**
     * Get human-readable description
     */
    public function getDescriptionAttribute(): string
    {
        $descriptions = [
            'permission.created' => 'Created permission "{name}"',
            'permission.updated' => 'Updated permission "{name}"',
            'permission.deleted' => 'Deleted permission "{name}"',
            'role.created' => 'Created role "{name}"',
            'role.updated' => 'Updated role "{name}"',
            'role.deleted' => 'Deleted role "{name}"',
            'role.permission.attached' => 'Assigned permission "{permission}" to role "{role}"',
            'role.permission.detached' => 'Removed permission "{permission}" from role "{role}"',
            'user.role.attached' => 'Assigned role "{role}" to user "{user}"',
            'user.role.detached' => 'Removed role "{role}" from user "{user}"',
            'user.permission.attached' => 'Assigned direct permission "{permission}" to user "{user}"',
            'user.permission.detached' => 'Removed direct permission "{permission}" from user "{user}"',
            'user.super_admin.granted' => 'Granted super admin privileges to user "{user}"',
            'user.super_admin.revoked' => 'Revoked super admin privileges from user "{user}"',
            'user.created' => 'Created user "{user}"',
            'user.updated' => 'Updated user "{user}"',
            'user.deleted' => 'Deleted user "{user}"',
            'invitation.sent' => 'Sent invitation to "{email}"',
            'invitation.accepted' => 'Invitation accepted by "{email}"',
            'invitation.revoked' => 'Revoked invitation for "{email}"'
        ];

        $template = $descriptions[$this->event_type] ?? $this->event_type;
        
        return $this->interpolateDescription($template);
    }

    /**
     * Interpolate description template with data
     */
    private function interpolateDescription(string $template): string
    {
        $data = array_merge(
            $this->old_values ?? [],
            $this->new_values ?? [],
            $this->metadata ?? []
        );
        
        return preg_replace_callback('/\{(\w+)\}/', function ($matches) use ($data) {
            return $data[$matches[1]] ?? $matches[0];
        }, $template);
    }

    /**
     * Scope for specific event types
     */
    public function scopeEventType($query, string $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope for specific user
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for date range
     */
    public function scopeDateRange($query, $from = null, $to = null)
    {
        if ($from) {
            $query->whereDate('created_at', '>=', $from);
        }
        
        if ($to) {
            $query->whereDate('created_at', '<=', $to);
        }
        
        return $query;
    }

    /**
     * Scope for search
     */
    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('event_type', 'like', "%{$search}%")
              ->orWhere('event_action', 'like', "%{$search}%")
              ->orWhereHas('user', function ($q) use ($search) {
                  $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
              });
        });
    }
}
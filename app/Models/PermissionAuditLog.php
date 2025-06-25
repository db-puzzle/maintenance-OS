<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PermissionAuditLog extends Model
{
    use HasFactory;

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
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * V2 Event types
     */
    const EVENT_TYPES = [
        // Permission events
        'permissions.generated' => 'Permissions Generated',
        'permissions.deleted' => 'Permissions Deleted',
        'permissions.granted' => 'Permission Granted',
        'permissions.revoked' => 'Permission Revoked',
        'permissions.cleanup' => 'Permissions Cleanup',
        'permissions.migrated' => 'Permissions Migrated to V2',
        
        // Role events
        'role.created' => 'Role Created',
        'role.updated' => 'Role Updated',
        'role.deleted' => 'Role Deleted',
        'role.assigned' => 'Role Assigned',
        'role.removed' => 'Role Removed',
        
        // User events
        'user.created' => 'User Created',
        'user.updated' => 'User Updated',
        'user.deleted' => 'User Deleted',
        'user.administrator.granted' => 'Administrator Role Granted',
        'user.administrator.revoked' => 'Administrator Role Revoked',
        
        // Entity events
        'plant.created' => 'Plant Created',
        'plant.updated' => 'Plant Updated',
        'plant.deleted' => 'Plant Deleted',
        'area.created' => 'Area Created',
        'area.updated' => 'Area Updated',
        'area.deleted' => 'Area Deleted',
        'sector.created' => 'Sector Created',
        'sector.updated' => 'Sector Updated',
        'sector.deleted' => 'Sector Deleted',
        'asset.created' => 'Asset Created',
        'asset.updated' => 'Asset Updated',
        'asset.deleted' => 'Asset Deleted',
        
        // Invitation events
        'invitation.sent' => 'Invitation Sent',
        'invitation.accepted' => 'Invitation Accepted',
        'invitation.revoked' => 'Invitation Revoked',
        'invitation.resent' => 'Invitation Resent',
    ];

    /**
     * Get the auditable model.
     */
    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the user who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the impersonator if action was performed while impersonating.
     */
    public function impersonator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'impersonator_id');
    }

    /**
     * Scope for event type
     */
    public function scopeEventType($query, string $type)
    {
        return $query->where('event_type', $type);
    }

    /**
     * Scope for event action
     */
    public function scopeEventAction($query, string $action)
    {
        return $query->where('event_action', $action);
    }

    /**
     * Scope for user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Get human-readable event description
     */
    public function getEventDescriptionAttribute(): string
    {
        return self::EVENT_TYPES[$this->event_type] ?? $this->event_type;
    }

    /**
     * Get changed fields from old and new values
     */
    public function getChangedFieldsAttribute(): array
    {
        if (!$this->old_values || !$this->new_values) {
            return [];
        }

        $changed = [];
        foreach ($this->new_values as $key => $newValue) {
            $oldValue = $this->old_values[$key] ?? null;
            if ($oldValue !== $newValue) {
                $changed[$key] = [
                    'old' => $oldValue,
                    'new' => $newValue
                ];
            }
        }

        return $changed;
    }

    /**
     * Check if this is a permission-related event
     */
    public function isPermissionEvent(): bool
    {
        return str_starts_with($this->event_type, 'permissions.');
    }

    /**
     * Check if this is an entity event
     */
    public function isEntityEvent(): bool
    {
        return in_array($this->event_type, [
            'plant.created', 'plant.updated', 'plant.deleted',
            'area.created', 'area.updated', 'area.deleted',
            'sector.created', 'sector.updated', 'sector.deleted',
            'asset.created', 'asset.updated', 'asset.deleted'
        ]);
    }

    /**
     * Get entity information from metadata
     */
    public function getEntityInfoAttribute(): ?array
    {
        if (!$this->isEntityEvent() && !$this->isPermissionEvent()) {
            return null;
        }

        return [
            'type' => $this->metadata['entity_type'] ?? null,
            'id' => $this->metadata['entity_id'] ?? null,
            'name' => $this->metadata['entity_name'] ?? null,
            'parent_type' => $this->metadata['parent_type'] ?? null,
            'parent_id' => $this->metadata['parent_id'] ?? null
        ];
    }

    /**
     * Format log entry for display
     */
    public function format(): string
    {
        $user = $this->user ? $this->user->name : 'System';
        $action = $this->event_description;
        
        if ($this->impersonator) {
            $user = "{$this->impersonator->name} (as {$user})";
        }

        $details = [];
        
        // Add entity info
        if ($entityInfo = $this->entity_info) {
            if ($entityInfo['name']) {
                $details[] = "{$entityInfo['type']}: {$entityInfo['name']}";
            }
        }

        // Add specific details based on event type
        if ($this->event_type === 'permissions.generated') {
            $count = $this->new_values['permissions_count'] ?? 0;
            $details[] = "{$count} permissions created";
        } elseif ($this->event_type === 'permissions.deleted') {
            $count = $this->old_values['permissions_count'] ?? 0;
            $details[] = "{$count} permissions deleted";
        }

        $detailString = !empty($details) ? ' (' . implode(', ', $details) . ')' : '';
        
        return "[{$this->created_at->toDateTimeString()}] {$user}: {$action}{$detailString}";
    }
}
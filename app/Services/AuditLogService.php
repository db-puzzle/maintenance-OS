<?php

namespace App\Services;

use App\Models\PermissionAuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    /**
     * Log an audit event
     */
    public static function log(
        string $eventType,
        string $eventAction,
        $auditable,
        array $oldValues = [],
        array $newValues = [],
        array $metadata = []
    ): PermissionAuditLog {
        return PermissionAuditLog::create([
            'event_type' => $eventType,
            'event_action' => $eventAction,
            'auditable_type' => get_class($auditable),
            'auditable_id' => $auditable->id,
            'user_id' => Auth::id(),
            'impersonator_id' => session('impersonator_id'),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => $metadata,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'session_id' => session()->getId()
        ]);
    }

    /**
     * Log permission-related changes
     */
    public static function logPermissionChange(
        string $action,
        $model,
        $permission,
        array $additionalData = []
    ): void {
        $eventType = match (true) {
            $model instanceof \App\Models\User && is_string($permission) => "user.permission.{$action}",
            $model instanceof \App\Models\User => "user.role.{$action}",
            $model instanceof \App\Models\Role => "role.permission.{$action}",
            default => "permission.{$action}"
        };

        $metadata = array_merge([
            'permission' => is_object($permission) ? $permission->name : $permission,
            'model_type' => get_class($model),
            'model_name' => $model->name ?? $model->email ?? 'Unknown'
        ], $additionalData);

        self::log($eventType, $action, $model, [], [], $metadata);
    }

    /**
     * Log user invitation events
     */
    public static function logInvitation(
        string $action,
        \App\Models\UserInvitation $invitation,
        array $additionalData = []
    ): void {
        $metadata = array_merge([
            'email' => $invitation->email,
            'invited_by' => $invitation->invitedBy->name,
            'initial_role' => $invitation->initial_role,
        ], $additionalData);

        self::log("invitation.{$action}", $action, $invitation, [], [], $metadata);
    }

    /**
     * Log super admin privilege changes
     */
    public static function logSuperAdminChange(
        string $action,
        \App\Models\User $user,
        \App\Models\User $actionBy,
        string $reason = null
    ): void {
        $metadata = [
            'user' => $user->name,
            'action_by' => $actionBy->name,
            'reason' => $reason,
        ];

        $oldValues = $action === 'granted' ? ['is_administrator' => false] : ['is_administrator' => true];
        $newValues = $action === 'granted' ? ['is_administrator' => true] : ['is_administrator' => false];

        self::log("user.super_admin.{$action}", $action, $user, $oldValues, $newValues, $metadata);
    }

    /**
     * Log role changes
     */
    public static function logRoleChange(
        string $action,
        \App\Models\Role $role,
        array $oldValues = [],
        array $newValues = [],
        array $additionalData = []
    ): void {
        $metadata = array_merge([
            'role' => $role->name,
            'is_system' => $role->is_system,
        ], $additionalData);

        self::log("role.{$action}", $action, $role, $oldValues, $newValues, $metadata);
    }

    /**
     * Log permission changes
     */
    public static function logPermissionDirectChange(
        string $action,
        \App\Models\Permission $permission,
        array $oldValues = [],
        array $newValues = [],
        array $additionalData = []
    ): void {
        $metadata = array_merge([
            'permission' => $permission->name,
            'resource' => $permission->resource,
            'action_type' => $permission->action,
        ], $additionalData);

        self::log("permission.{$action}", $action, $permission, $oldValues, $newValues, $metadata);
    }

    /**
     * Log user changes
     */
    public static function logUserChange(
        string $action,
        \App\Models\User $user,
        array $oldValues = [],
        array $newValues = [],
        array $additionalData = []
    ): void {
        $metadata = array_merge([
            'user' => $user->name,
            'email' => $user->email,
            'is_administrator' => $user->isAdministrator(),
        ], $additionalData);

        self::log("user.{$action}", $action, $user, $oldValues, $newValues, $metadata);
    }

    /**
     * Get audit statistics
     */
    public static function getStatistics(int $days = 30): array
    {
        $startDate = now()->subDays($days);

        return [
            'total_events' => PermissionAuditLog::where('created_at', '>=', $startDate)->count(),
            'user_changes' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->where('event_type', 'like', 'user.%')->count(),
            'permission_changes' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->where('event_type', 'like', 'permission.%')->count(),
            'role_changes' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->where('event_type', 'like', 'role.%')->count(),
            'invitation_events' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->where('event_type', 'like', 'invitation.%')->count(),
            'top_users' => PermissionAuditLog::where('created_at', '>=', $startDate)
                ->with('user:id,name')
                ->selectRaw('user_id, count(*) as count')
                ->groupBy('user_id')
                ->orderByDesc('count')
                ->limit(5)
                ->get(),
            'recent_events' => PermissionAuditLog::with(['user:id,name', 'auditable'])
                ->where('created_at', '>=', $startDate)
                ->latest()
                ->limit(10)
                ->get()
        ];
    }

    /**
     * Clean up old audit logs
     */
    public static function cleanup(int $keepDays = 365): int
    {
        $cutoffDate = now()->subDays($keepDays);
        
        return PermissionAuditLog::where('created_at', '<', $cutoffDate)->delete();
    }
}
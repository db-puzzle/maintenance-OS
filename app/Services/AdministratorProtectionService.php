<?php

namespace App\Services;

use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class AdministratorProtectionService
{
    /**
     * Check if the given user is the last administrator in the system
     * 
     * @param User $user The user to check
     * @param bool $includeSoftDeleted Whether to include soft-deleted users in the count
     * @return bool True if this is the last administrator
     */
    public function isLastAdministrator(User $user, bool $includeSoftDeleted = false): bool
    {
        // First check if the user is even an administrator
        if (!$user->hasRole('Administrator')) {
            return false;
        }

        // Get the administrator role
        $adminRole = Role::getAdministratorRole();
        if (!$adminRole) {
            // If no administrator role exists, this is a critical system error
            throw new \Exception('Administrator role not found in the system');
        }

        // Build the query for counting administrators
        $query = User::role('Administrator');
        
        if (!$includeSoftDeleted) {
            // Only count non-deleted administrators
            $query->whereNull('deleted_at');
        } else {
            // Include soft-deleted users
            $query->withTrashed();
        }
        
        // Exclude the current user from the count
        $query->where('id', '!=', $user->id);
        
        // Use lockForUpdate to prevent race conditions
        $otherAdminCount = $query->lockForUpdate()->count();
        
        return $otherAdminCount === 0;
    }

    /**
     * Check if an operation would leave the system without any administrators
     * 
     * @param User $user The user being affected
     * @param string $operation The operation being performed (delete, forceDelete, removeRole)
     * @return array ['allowed' => bool, 'message' => string]
     */
    public function canPerformOperation(User $user, string $operation): array
    {
        // Non-administrators can always be modified
        if (!$user->hasRole('Administrator')) {
            return [
                'allowed' => true,
                'message' => ''
            ];
        }

        // For force delete, we need to check if there are other active administrators
        // We should exclude the user being deleted from the count
        if ($operation === 'forceDelete') {
            // Count active administrators excluding the one being force deleted
            $activeAdminCount = User::role('Administrator')
                ->whereNull('deleted_at')
                ->where('id', '!=', $user->id)
                ->count();
            
            // If there are other active administrators, allow the force delete
            if ($activeAdminCount > 0) {
                return [
                    'allowed' => true,
                    'message' => ''
                ];
            }
            
            // Otherwise, this would leave the system without active administrators
            $message = $this->getProtectionMessage($user, $operation);
            return [
                'allowed' => false,
                'message' => $message
            ];
        } else {
            // For other operations (delete, removeRole), check normally
            $includeSoftDeleted = false;
            
            if ($this->isLastAdministrator($user, $includeSoftDeleted)) {
                $message = $this->getProtectionMessage($user, $operation);
                return [
                    'allowed' => false,
                    'message' => $message
                ];
            }
        }

        return [
            'allowed' => true,
            'message' => ''
        ];
    }

    /**
     * Get a descriptive error message for why the operation is not allowed
     * 
     * @param User $user The user being affected
     * @param string $operation The operation being attempted
     * @return string The error message
     */
    protected function getProtectionMessage(User $user, string $operation): string
    {
        $baseMessage = "Cannot {$operation} user '{$user->name}' (ID: {$user->id})";
        
        switch ($operation) {
            case 'delete':
                return $baseMessage . " because they are the last active administrator in the system. " .
                       "The system must always have at least one active administrator. " .
                       "Please assign the administrator role to another user before deleting this one.";
                
            case 'forceDelete':
                $softDeletedAdmins = User::onlyTrashed()
                    ->role('Administrator')
                    ->count();
                    
                if ($softDeletedAdmins > 0) {
                    return $baseMessage . " because they are the last administrator (including {$softDeletedAdmins} soft-deleted). " .
                           "The system must always have at least one administrator. " .
                           "Please restore and assign the administrator role to another user first.";
                } else {
                    return $baseMessage . " because they are the last administrator in the system. " .
                           "The system must always have at least one administrator. " .
                           "Please assign the administrator role to another user before permanently deleting this one.";
                }
                
            case 'removeRole':
                return "Cannot remove the Administrator role from user '{$user->name}' (ID: {$user->id}) " .
                       "because they are the last administrator in the system. " .
                       "The system must always have at least one active administrator. " .
                       "Please assign the administrator role to another user before removing it from this one.";
                
            case 'revokePermission':
                return "Cannot revoke administrator permissions from user '{$user->name}' (ID: {$user->id}) " .
                       "because they are the last administrator in the system. " .
                       "The system must always have at least one active administrator.";
                
            default:
                return $baseMessage . " because they are the last administrator in the system. " .
                       "The system must always have at least one active administrator.";
        }
    }

    /**
     * Get the count of active administrators
     * 
     * @param bool $excludeUser Optionally exclude a specific user from the count
     * @return int The count of active administrators
     */
    public function getActiveAdministratorCount(?User $excludeUser = null): int
    {
        $query = User::role('Administrator')
            ->whereNull('deleted_at');
            
        if ($excludeUser) {
            $query->where('id', '!=', $excludeUser->id);
        }
        
        return $query->count();
    }

    /**
     * Get all administrators including soft-deleted ones
     * 
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getAllAdministrators()
    {
        return User::withTrashed()
            ->role('Administrator')
            ->get();
    }

    /**
     * Ensure at least one administrator exists in the system
     * This is called during system initialization
     * 
     * @return bool True if at least one administrator exists
     */
    public function ensureAdministratorExists(): bool
    {
        $adminRole = Role::getAdministratorRole();
        
        if (!$adminRole) {
            return false;
        }
        
        // Check for any administrators (including soft-deleted)
        return User::withTrashed()
            ->role('Administrator')
            ->exists();
    }

    /**
     * Check if the system is in a critical state (no active administrators)
     * 
     * @return bool True if there are no active administrators
     */
    public function isInCriticalState(): bool
    {
        return $this->getActiveAdministratorCount() === 0;
    }

    /**
     * Attempt to recover from critical state by restoring a soft-deleted administrator
     * 
     * @return User|null The restored user or null if no soft-deleted administrators exist
     */
    public function attemptRecovery(): ?User
    {
        $deletedAdmin = User::onlyTrashed()
            ->role('Administrator')
            ->latest('deleted_at')
            ->first();
            
        if ($deletedAdmin) {
            DB::transaction(function () use ($deletedAdmin) {
                $deletedAdmin->restore();
                
                // Log the recovery
                app(AuditLogService::class)->logSimple('administrator.recovered', [
                    'recovered_user_id' => $deletedAdmin->id,
                    'reason' => 'System was in critical state with no active administrators'
                ]);
            });
            
            return $deletedAdmin;
        }
        
        return null;
    }
} 
<?php

namespace App\Policies\Production;

use App\Models\Production\ProductionExecution;
use App\Models\User;

class ProductionExecutionPolicy
{
    /**
     * Determine whether the user can view any production executions.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.executions.viewAny');
    }

    /**
     * Determine whether the user can view the production execution.
     */
    public function view(User $user, ProductionExecution $execution): bool
    {
        return $user->hasPermissionTo('production.executions.view');
    }

    /**
     * Determine whether the user can update the production execution.
     */
    public function update(User $user, ProductionExecution $execution): bool
    {
        // Cannot update completed or cancelled executions
        if ($execution->completed_at || $execution->cancelled_at) {
            return false;
        }

        // Operators can only update their own executions
        if ($user->hasRole('operator') && $execution->operator_id !== $user->id) {
            return false;
        }

        return $user->hasPermissionTo('production.executions.update');
    }

    /**
     * Determine whether the user can scan QR codes.
     */
    public function scan(User $user): bool
    {
        return $user->hasPermissionTo('production.executions.scan');
    }

    /**
     * Determine whether the user can complete the production execution.
     */
    public function complete(User $user, ProductionExecution $execution): bool
    {
        // Cannot complete already completed executions
        if ($execution->completed_at) {
            return false;
        }

        // Operators can only complete their own executions
        if ($user->hasRole('operator') && $execution->operator_id !== $user->id) {
            return false;
        }

        return $user->hasPermissionTo('production.executions.complete');
    }
} 
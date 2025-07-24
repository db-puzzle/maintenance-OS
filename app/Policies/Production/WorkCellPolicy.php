<?php

namespace App\Policies\Production;

use App\Models\Production\WorkCell;
use App\Models\User;

class WorkCellPolicy
{
    /**
     * Determine whether the user can view any work cells.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.workCells.viewAny');
    }

    /**
     * Determine whether the user can view the work cell.
     */
    public function view(User $user, WorkCell $workCell): bool
    {
        return $user->hasPermissionTo('production.workCells.view');
    }

    /**
     * Determine whether the user can create work cells.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('production.workCells.create');
    }

    /**
     * Determine whether the user can update the work cell.
     */
    public function update(User $user, WorkCell $workCell): bool
    {
        return $user->hasPermissionTo('production.workCells.update');
    }

    /**
     * Determine whether the user can delete the work cell.
     */
    public function delete(User $user, WorkCell $workCell): bool
    {
        // Cannot delete if work cell is assigned to routing steps
        if ($workCell->routingSteps()->exists()) {
            return false;
        }

        // Cannot delete if work cell has scheduled production
        if ($workCell->productionSchedules()->whereIn('status', ['scheduled', 'in_progress'])->exists()) {
            return false;
        }

        return $user->hasPermissionTo('production.workCells.delete');
    }
} 
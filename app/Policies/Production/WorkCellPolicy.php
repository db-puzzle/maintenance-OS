<?php

namespace App\Policies\Production;

use App\Models\Production\WorkCell;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class WorkCellPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any work cells.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.work-cells.viewAny');
    }

    /**
     * Determine whether the user can view the work cell.
     */
    public function view(User $user, WorkCell $workCell): bool
    {
        return $user->hasPermissionTo('production.work-cells.view');
    }

    /**
     * Determine whether the user can create work cells.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('production.work-cells.create');
    }

    /**
     * Determine whether the user can update the work cell.
     */
    public function update(User $user, WorkCell $workCell): bool
    {
        return $user->hasPermissionTo('production.work-cells.update');
    }

    /**
     * Determine whether the user can delete the work cell.
     */
    public function delete(User $user, WorkCell $workCell): bool
    {
        // Check dependencies before allowing deletion
        // The actual dependency validation happens in the controller
        return $user->hasPermissionTo('production.work-cells.delete');
    }

    /**
     * Determine whether the user can restore the work cell.
     */
    public function restore(User $user, WorkCell $workCell): bool
    {
        return $user->hasPermissionTo('production.work-cells.restore');
    }

    /**
     * Determine whether the user can permanently delete the work cell.
     */
    public function forceDelete(User $user, WorkCell $workCell): bool
    {
        return $user->hasPermissionTo('production.work-cells.forceDelete');
    }
} 
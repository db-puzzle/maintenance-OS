<?php

namespace App\Policies\Production;

use App\Models\Production\ProductionSchedule;
use App\Models\User;

class ProductionSchedulePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('production.schedule.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ProductionSchedule $productionSchedule): bool
    {
        return $user->can('production.schedule.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('production.schedule.edit');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ProductionSchedule $productionSchedule): bool
    {
        // Can't update schedules from published versions
        if ($productionSchedule->scheduleVersion->status === 'published') {
            return false;
        }

        return $user->can('production.schedule.edit');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ProductionSchedule $productionSchedule): bool
    {
        // Can't delete schedules from published versions
        if ($productionSchedule->scheduleVersion->status === 'published') {
            return false;
        }

        return $user->can('production.schedule.edit');
    }

    /**
     * Determine whether the user can lock/unlock the schedule.
     */
    public function toggleLock(User $user, ProductionSchedule $productionSchedule): bool
    {
        // Can't modify schedules from published versions
        if ($productionSchedule->scheduleVersion->status === 'published') {
            return false;
        }

        return $user->can('production.schedule.edit');
    }
}

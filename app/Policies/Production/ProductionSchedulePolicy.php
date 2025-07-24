<?php

namespace App\Policies\Production;

use App\Models\Production\ProductionSchedule;
use App\Models\User;

class ProductionSchedulePolicy
{
    /**
     * Determine whether the user can view any production schedules.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.schedules.viewAny');
    }

    /**
     * Determine whether the user can view the production schedule.
     */
    public function view(User $user, ProductionSchedule $schedule): bool
    {
        return $user->hasPermissionTo('production.schedules.view');
    }

    /**
     * Determine whether the user can update the production schedule.
     */
    public function update(User $user, ProductionSchedule $schedule): bool
    {
        // Cannot update completed or cancelled schedules
        if (in_array($schedule->status, ['completed', 'cancelled'])) {
            return false;
        }

        return $user->hasPermissionTo('production.schedules.update');
    }

    /**
     * Determine whether the user can start the production schedule.
     */
    public function start(User $user, ProductionSchedule $schedule): bool
    {
        // Can only start scheduled items
        if ($schedule->status !== 'scheduled') {
            return false;
        }

        return $user->hasPermissionTo('production.schedules.start');
    }

    /**
     * Determine whether the user can complete the production schedule.
     */
    public function complete(User $user, ProductionSchedule $schedule): bool
    {
        // Can only complete in-progress items
        if ($schedule->status !== 'in_progress') {
            return false;
        }

        return $user->hasPermissionTo('production.schedules.complete');
    }
} 
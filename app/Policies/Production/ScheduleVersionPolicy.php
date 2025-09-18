<?php

namespace App\Policies\Production;

use App\Models\Production\ScheduleVersion;
use App\Models\User;

class ScheduleVersionPolicy
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
    public function view(User $user, ScheduleVersion $scheduleVersion): bool
    {
        return $user->can('production.schedule.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('production.schedule.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ScheduleVersion $scheduleVersion): bool
    {
        // Can't update published schedules
        if ($scheduleVersion->status === 'published') {
            return false;
        }

        return $user->can('production.schedule.edit');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ScheduleVersion $scheduleVersion): bool
    {
        // Can't delete published schedules
        if ($scheduleVersion->status === 'published') {
            return false;
        }

        return $user->can('production.schedule.delete');
    }

    /**
     * Determine whether the user can publish the schedule.
     */
    public function publish(User $user, ScheduleVersion $scheduleVersion): bool
    {
        // Can't publish already published schedules
        if ($scheduleVersion->status === 'published') {
            return false;
        }

        return $user->can('production.schedule.publish');
    }

    /**
     * Determine whether the user can create a snapshot.
     */
    public function createSnapshot(User $user, ScheduleVersion $scheduleVersion): bool
    {
        return $user->can('production.schedule.edit');
    }

    /**
     * Determine whether the user can restore from a snapshot.
     */
    public function restoreFromSnapshot(User $user, ScheduleVersion $scheduleVersion): bool
    {
        return $user->can('production.schedule.create');
    }

    /**
     * Determine whether the user can run scheduling algorithms.
     */
    public function runScheduling(User $user, ScheduleVersion $scheduleVersion): bool
    {
        // Can't run scheduling on published versions
        if ($scheduleVersion->status === 'published') {
            return false;
        }

        // Can't run if already running
        if ($scheduleVersion->isScheduling()) {
            return false;
        }

        return $user->can('production.schedule.edit');
    }
}

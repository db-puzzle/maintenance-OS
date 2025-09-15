<?php

namespace App\Policies\Production;

use App\Models\Production\ScheduleVersion;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ScheduleVersionPolicy
{
    use HandlesAuthorization;

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
        // Can only update draft schedules
        if ($scheduleVersion->isPublished()) {
            return false;
        }

        return $user->can('production.schedule.edit');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ScheduleVersion $scheduleVersion): bool
    {
        // Can only delete draft schedules
        if ($scheduleVersion->isPublished()) {
            return false;
        }

        return $user->can('production.schedule.delete');
    }

    /**
     * Determine whether the user can publish the schedule.
     */
    public function publish(User $user, ScheduleVersion $scheduleVersion): bool
    {
        // Must be a draft schedule
        if ($scheduleVersion->isPublished()) {
            return false;
        }

        return $user->can('production.schedule.publish');
    }
}
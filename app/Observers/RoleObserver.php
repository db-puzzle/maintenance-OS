<?php

namespace App\Observers;

use App\Models\Role;

class RoleObserver
{
    /**
     * Handle the Role "created" event.
     */
    public function created(Role $role): void
    {
        // Clear the administrator role cache if a new administrator role is created
        if ($role->is_administrator) {
            cache()->forget('administrator_role_id');
            Role::clearAdministratorRoleCache();
        }
    }

    /**
     * Handle the Role "updated" event.
     */
    public function updated(Role $role): void
    {
        // Clear the administrator role cache if the administrator role is updated
        // or if the is_administrator flag changed
        if ($role->is_administrator || $role->wasChanged('is_administrator')) {
            cache()->forget('administrator_role_id');
            Role::clearAdministratorRoleCache();
        }
    }

    /**
     * Handle the Role "deleted" event.
     */
    public function deleted(Role $role): void
    {
        // Clear the administrator role cache if the administrator role is deleted
        if ($role->is_administrator) {
            cache()->forget('administrator_role_id');
            Role::clearAdministratorRoleCache();
        }
    }

    /**
     * Handle the Role "restored" event.
     */
    public function restored(Role $role): void
    {
        // Clear the administrator role cache if the administrator role is restored
        if ($role->is_administrator) {
            cache()->forget('administrator_role_id');
            Role::clearAdministratorRoleCache();
        }
    }

    /**
     * Handle the Role "force deleted" event.
     */
    public function forceDeleted(Role $role): void
    {
        // Clear the administrator role cache if the administrator role is force deleted
        if ($role->is_administrator) {
            cache()->forget('administrator_role_id');
            Role::clearAdministratorRoleCache();
        }
    }
}

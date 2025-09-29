<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;

class RolePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('roles.viewAny');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Role $role): bool
    {
        return $user->can('roles.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('roles.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Role $role): bool
    {
        // Administrator role cannot be modified
        if ($role->isAdministrator()) {
            return false;
        }

        return $user->can('roles.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Role $role): bool
    {
        // System roles and administrator role cannot be deleted
        if ($role->isSystem() || $role->isAdministrator()) {
            return false;
        }

        // Role with users cannot be deleted
        if ($role->users()->exists()) {
            return false;
        }

        return $user->can('roles.delete');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Role $role): bool
    {
        return $user->can('roles.delete');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Role $role): bool
    {
        return false; // Roles should never be permanently deleted
    }

    /**
     * Determine whether the user can assign the role to users.
     */
    public function assign(User $user, Role $role): bool
    {
        return $user->can('roles.assign');
    }

    /**
     * Determine whether the user can duplicate the role.
     */
    public function duplicate(User $user, Role $role): bool
    {
        return $user->can('roles.create');
    }
}

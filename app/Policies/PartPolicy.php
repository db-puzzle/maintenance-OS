<?php

namespace App\Policies;

use App\Models\Part;
use App\Models\User;

class PartPolicy
{
    /**
     * Determine whether the user can view any parts.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdministrator() || $user->can('parts.viewAny');
    }

    /**
     * Determine whether the user can view the part.
     */
    public function view(User $user, Part $part): bool
    {
        return $user->isAdministrator() || $user->can('parts.view');
    }

    /**
     * Determine whether the user can create parts.
     */
    public function create(User $user): bool
    {
        return $user->isAdministrator() || $user->can('parts.create');
    }

    /**
     * Determine whether the user can update the part.
     */
    public function update(User $user, Part $part): bool
    {
        return $user->isAdministrator() || $user->can('parts.update');
    }

    /**
     * Determine whether the user can delete the part.
     */
    public function delete(User $user, Part $part): bool
    {
        return $user->isAdministrator() || $user->can('parts.delete');
    }

    /**
     * Determine whether the user can import parts.
     */
    public function import(User $user): bool
    {
        return $user->isAdministrator() || $user->can('parts.import');
    }

    /**
     * Determine whether the user can export parts.
     */
    public function export(User $user): bool
    {
        return $user->isAdministrator() || $user->can('parts.export');
    }

    /**
     * Determine whether the user can manage part stock.
     */
    public function manageStock(User $user, Part $part): bool
    {
        return $user->isAdministrator() || $user->can('parts.manage-stock');
    }
}
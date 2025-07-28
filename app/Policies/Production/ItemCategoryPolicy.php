<?php

namespace App\Policies\Production;

use App\Models\Production\ItemCategory;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ItemCategoryPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('production.categories.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ItemCategory $itemCategory): bool
    {
        return $user->hasPermission('production.categories.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('production.categories.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ItemCategory $itemCategory): bool
    {
        return $user->hasPermission('production.categories.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ItemCategory $itemCategory): bool
    {
        // Check if category can be deleted (no items linked)
        if (!$itemCategory->canBeDeleted()) {
            return false;
        }

        return $user->hasPermission('production.categories.delete');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ItemCategory $itemCategory): bool
    {
        return $user->hasPermission('production.categories.restore');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ItemCategory $itemCategory): bool
    {
        return $user->hasPermission('production.categories.force-delete');
    }
} 
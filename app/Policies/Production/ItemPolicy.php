<?php

namespace App\Policies\Production;

use App\Models\Production\Item;
use App\Models\User;

class ItemPolicy
{
    /**
     * Determine whether the user can view any items.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.items.viewAny');
    }

    /**
     * Determine whether the user can view the item.
     */
    public function view(User $user, Item $item): bool
    {
        return $user->hasPermissionTo('production.items.view');
    }

    /**
     * Determine whether the user can create items.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('production.items.create');
    }

    /**
     * Determine whether the user can update the item.
     */
    public function update(User $user, Item $item): bool
    {
        return $user->hasPermissionTo('production.items.update');
    }

    /**
     * Determine whether the user can delete the item.
     */
    public function delete(User $user, Item $item): bool
    {
        return $user->hasPermissionTo('production.items.delete') && $item->canBeDeleted();
    }

    /**
     * Determine whether the user can manage BOMs for the item.
     */
    public function manageBom(User $user, Item $item): bool
    {
        return $user->hasPermissionTo('production.items.manage_bom') && $item->can_be_manufactured;
    }

    /**
     * Determine whether the user can import items.
     */
    public function import(User $user): bool
    {
        return $user->hasPermissionTo('production.items.import');
    }

    /**
     * Determine whether the user can export items.
     */
    public function export(User $user): bool
    {
        return $user->hasPermissionTo('production.items.export');
    }

    /**
     * Determine whether the user can manage images for the item.
     */
    public function manageImages(User $user, Item $item): bool
    {
        return $user->hasPermissionTo('production.items.images.manage');
    }
} 
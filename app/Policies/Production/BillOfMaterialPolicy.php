<?php

namespace App\Policies\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\User;

class BillOfMaterialPolicy
{
    /**
     * Determine whether the user can view any BOMs.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.bom.viewAny');
    }

    /**
     * Determine whether the user can view the BOM.
     */
    public function view(User $user, BillOfMaterial $billOfMaterial): bool
    {
        return $user->hasPermissionTo('production.bom.view');
    }

    /**
     * Determine whether the user can create BOMs.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('production.bom.create');
    }

    /**
     * Determine whether the user can update the BOM.
     */
    public function update(User $user, BillOfMaterial $billOfMaterial): bool
    {
        return $user->hasPermissionTo('production.bom.update');
    }

    /**
     * Determine whether the user can delete the BOM.
     */
    public function delete(User $user, BillOfMaterial $billOfMaterial): bool
    {
        // Cannot delete if BOM is used in production orders
        if ($billOfMaterial->manufacturingOrders()->exists()) {
            return false;
        }

        return $user->can('production.bom.delete');
    }

    /**
     * Determine whether the user can import BOMs.
     */
    public function import(User $user): bool
    {
        return $user->hasPermissionTo('production.bom.import');
    }

    /**
     * Determine whether the user can manage BOM items.
     */
    public function manageItems(User $user, BillOfMaterial $billOfMaterial): bool
    {
        return $user->hasPermissionTo('production.bom.manageItems');
    }
} 
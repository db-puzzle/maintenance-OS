<?php

namespace App\Policies\Production;

use App\Models\Production\ManufacturingOrderDependency;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ManufacturingOrderDependencyPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('production.orders.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ManufacturingOrderDependency $dependency): bool
    {
        return $user->hasPermission('production.orders.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('production.orders.configure_dependencies');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ManufacturingOrderDependency $dependency): bool
    {
        return $user->hasPermission('production.orders.configure_dependencies');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ManufacturingOrderDependency $dependency): bool
    {
        return $user->hasPermission('production.orders.configure_dependencies');
    }
}

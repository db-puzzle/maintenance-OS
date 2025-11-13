<?php

namespace App\Policies\Production;

use App\Models\Production\ManufacturingOrderFlow;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ManufacturingOrderFlowPolicy
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
    public function view(User $user, ManufacturingOrderFlow $flow): bool
    {
        return $user->hasPermission('production.orders.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Flows are created automatically by the system
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ManufacturingOrderFlow $flow): bool
    {
        // Flows are immutable once created
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ManufacturingOrderFlow $flow): bool
    {
        // Flows cannot be deleted
        return false;
    }
}

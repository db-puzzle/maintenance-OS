<?php

namespace App\Policies\Production;

use App\Models\Production\ManufacturingRoute;
use App\Models\User;

class ManufacturingRoutePolicy
{
    /**
     * Determine whether the user can view any production routings.
     */
    public function viewAny(User $user): bool
    {
        // Use routes namespace per seeded permissions
        return $user->hasPermissionTo('production.routes.create');
    }

    /**
     * Determine whether the user can view the production routing.
     */
    public function view(User $user, ManufacturingRoute $routing): bool
    {
        return $user->hasPermissionTo('production.routes.create');
    }

    /**
     * Determine whether the user can create production routings.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('production.routes.create');
    }

    /**
     * Determine whether the user can update the production routing.
     */
    public function update(User $user, ManufacturingRoute $routing): bool
    {
        return $user->hasPermissionTo('production.routes.create');
    }

    /**
     * Determine whether the user can delete the production routing.
     */
    public function delete(User $user, ManufacturingRoute $routing): bool
    {
        // Cannot delete if routing has executed steps
        if ($routing->steps()->whereNotIn('status', ['pending', 'cancelled'])->exists()) {
            return false;
        }

        return $user->hasPermissionTo('production.routes.create');
    }

    /**
     * Determine whether the user can manage routing steps.
     */
    public function manageSteps(User $user, ManufacturingRoute $routing): bool
    {
        return $user->hasPermissionTo('production.routes.create');
    }
} 
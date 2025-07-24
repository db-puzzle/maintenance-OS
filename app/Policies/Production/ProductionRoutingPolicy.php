<?php

namespace App\Policies\Production;

use App\Models\Production\ProductionRouting;
use App\Models\User;

class ProductionRoutingPolicy
{
    /**
     * Determine whether the user can view any production routings.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.routing.viewAny');
    }

    /**
     * Determine whether the user can view the production routing.
     */
    public function view(User $user, ProductionRouting $routing): bool
    {
        return $user->hasPermissionTo('production.routing.view');
    }

    /**
     * Determine whether the user can create production routings.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('production.routing.create');
    }

    /**
     * Determine whether the user can update the production routing.
     */
    public function update(User $user, ProductionRouting $routing): bool
    {
        return $user->hasPermissionTo('production.routing.update');
    }

    /**
     * Determine whether the user can delete the production routing.
     */
    public function delete(User $user, ProductionRouting $routing): bool
    {
        // Cannot delete if routing has production schedules
        if ($routing->steps()->has('productionSchedules')->exists()) {
            return false;
        }

        // Cannot delete if routing is inherited by others
        if ($routing->childRoutings()->exists()) {
            return false;
        }

        return $user->hasPermissionTo('production.routing.delete');
    }

    /**
     * Determine whether the user can manage routing steps.
     */
    public function manageSteps(User $user, ProductionRouting $routing): bool
    {
        // Cannot manage steps for inherited routing
        if ($routing->routing_type === 'inherited') {
            return false;
        }

        return $user->hasPermissionTo('production.routing.manageSteps');
    }
} 
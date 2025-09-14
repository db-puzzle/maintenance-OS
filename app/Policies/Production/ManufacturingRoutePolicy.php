<?php

namespace App\Policies\Production;

use App\Models\Production\ManufacturingRoute;
use App\Models\User;

class ManufacturingRoutePolicy
{
    /**
     * Determine whether the user can view any production routings.
     * When second parameter is true, this is for templates.
     */
    public function viewAny(User $user, bool $isTemplate = false): bool
    {
        if ($isTemplate) {
            return $user->hasPermissionTo('production.templates.view')
                || $user->hasPermissionTo('production.routes.create');
        }

        // Use routes namespace per seeded permissions
        return $user->hasPermissionTo('production.routes.create');
    }

    /**
     * Determine whether the user can view the production routing.
     */
    public function view(User $user, ManufacturingRoute $routing): bool
    {
        if ($routing->is_template) {
            return $user->hasPermissionTo('production.templates.view')
                || $user->hasPermissionTo('production.routes.create');
        }

        return $user->hasPermissionTo('production.routes.create');
    }

    /**
     * Determine whether the user can create production routings.
     * When second parameter is true, this is for templates.
     */
    public function create(User $user, bool $isTemplate = false): bool
    {
        if ($isTemplate) {
            return $user->hasPermissionTo('production.templates.create')
                || $user->hasPermissionTo('production.routes.create');
        }

        return $user->hasPermissionTo('production.routes.create');
    }

    /**
     * Determine whether the user can update the production routing.
     */
    public function update(User $user, ManufacturingRoute $routing): bool
    {
        if ($routing->is_template) {
            return $user->hasPermissionTo('production.templates.update')
                || $user->hasPermissionTo('production.routes.create');
        }

        return $user->hasPermissionTo('production.routes.create');
    }

    /**
     * Determine whether the user can delete the production routing.
     */
    public function delete(User $user, ManufacturingRoute $routing): bool
    {
        if ($routing->is_template) {
            // Note: We no longer check if template is in use since we don't track template usage
            return $user->hasPermissionTo('production.templates.delete')
                || $user->hasPermissionTo('production.routes.create');
        }

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
        if ($routing->is_template) {
            return $user->hasPermissionTo('production.templates.update')
                || $user->hasPermissionTo('production.routes.create');
        }

        return $user->hasPermissionTo('production.routes.create');
    }
}

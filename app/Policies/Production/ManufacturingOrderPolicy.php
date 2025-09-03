<?php

namespace App\Policies\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ManufacturingOrderPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('production.orders.viewAny');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        return $user->can('production.orders.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('production.orders.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        // Can't update if order is completed or cancelled
        if (in_array($manufacturingOrder->status, ['completed', 'cancelled'])) {
            return false;
        }

        return $user->can('production.orders.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        // Can only delete draft orders
        if ($manufacturingOrder->status !== 'draft') {
            return false;
        }

        // Can't delete if it has child orders
        if ($manufacturingOrder->children()->exists()) {
            return false;
        }

        return $user->can('production.orders.delete');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        return $user->can('production.orders.restore');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        return $user->can('production.orders.forceDelete');
    }

    /**
     * Determine whether the user can plan the order.
     */
    public function plan(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        // Can only plan draft orders
        if (!in_array($manufacturingOrder->status, ['draft'])) {
            return false;
        }

        return $user->can('production.orders.plan');
    }

    /**
     * Determine whether the user can release the order.
     */
    public function release(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        // Can only release draft or planned orders
        if (!in_array($manufacturingOrder->status, ['draft', 'planned'])) {
            return false;
        }

        // Must have a route configured
        if (!$manufacturingOrder->manufacturingRoute || $manufacturingOrder->manufacturingRoute->steps->count() === 0) {
            return false;
        }

        return $user->can('production.orders.release');
    }

    /**
     * Determine whether the user can cancel the order.
     */
    public function cancel(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        // Can't cancel if already completed or cancelled
        if (in_array($manufacturingOrder->status, ['completed', 'cancelled'])) {
            return false;
        }

        return $user->can('production.orders.cancel');
    }

    /**
     * Determine whether the user can complete the order.
     */
    public function complete(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        // Can only complete in-progress orders
        if ($manufacturingOrder->status !== 'in_progress') {
            return false;
        }

        return $user->can('production.orders.complete');
    }

    /**
     * Determine whether the user can apply templates.
     */
    public function applyTemplate(User $user, ManufacturingOrder $manufacturingOrder): bool
    {
        // Can only apply templates to draft or planned orders
        if (!in_array($manufacturingOrder->status, ['draft', 'planned'])) {
            return false;
        }

        return $user->can('production.routes.createFromTemplate');
    }
}

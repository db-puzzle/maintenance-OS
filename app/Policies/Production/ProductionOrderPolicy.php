<?php

namespace App\Policies\Production;

use App\Models\Production\ProductionOrder;
use App\Models\User;

class ProductionOrderPolicy
{
    /**
     * Determine whether the user can view any production orders.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.orders.viewAny');
    }

    /**
     * Determine whether the user can view the production order.
     */
    public function view(User $user, ProductionOrder $order): bool
    {
        return $user->hasPermissionTo('production.orders.view');
    }

    /**
     * Determine whether the user can create production orders.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('production.orders.create');
    }

    /**
     * Determine whether the user can update the production order.
     */
    public function update(User $user, ProductionOrder $order): bool
    {
        // Can only update draft or scheduled orders
        if (!in_array($order->status, ['draft', 'scheduled'])) {
            return false;
        }

        return $user->hasPermissionTo('production.orders.update');
    }

    /**
     * Determine whether the user can delete the production order.
     */
    public function delete(User $user, ProductionOrder $order): bool
    {
        // Can only delete draft or cancelled orders
        if (!in_array($order->status, ['draft', 'cancelled'])) {
            return false;
        }

        // Cannot delete if order has shipment items
        if ($order->shipmentItems()->exists()) {
            return false;
        }

        return $user->hasPermissionTo('production.orders.delete');
    }

    /**
     * Determine whether the user can schedule the production order.
     */
    public function schedule(User $user, ProductionOrder $order): bool
    {
        // Can only schedule draft orders
        if ($order->status !== 'draft') {
            return false;
        }

        return $user->hasPermissionTo('production.orders.schedule');
    }

    /**
     * Determine whether the user can release the production order.
     */
    public function release(User $user, ProductionOrder $order): bool
    {
        // Can only release scheduled orders
        if ($order->status !== 'scheduled') {
            return false;
        }

        return $user->hasPermissionTo('production.orders.release');
    }

    /**
     * Determine whether the user can cancel the production order.
     */
    public function cancel(User $user, ProductionOrder $order): bool
    {
        // Cannot cancel completed or already cancelled orders
        if (in_array($order->status, ['completed', 'cancelled'])) {
            return false;
        }

        return $user->hasPermissionTo('production.orders.cancel');
    }
} 
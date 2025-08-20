<?php

namespace App\Policies\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductionOrderPolicy
{
    use HandlesAuthorization;

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
    public function view(User $user, ManufacturingOrder $order): bool
    {
        if (!$user->hasPermissionTo('production.orders.view')) {
            return false;
        }

        // Check entity-scoped permissions
        if ($order->item && $order->item->sector) {
            $sector = $order->item->sector;
            $area = $sector->area;
            $plant = $area->plant;

            return $user->hasAnyPermission([
                "production.orders.view.plant.{$plant->id}",
                "production.orders.view.area.{$area->id}",
                "production.orders.view.sector.{$sector->id}",
            ]);
        }

        return true;
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
    public function update(User $user, ManufacturingOrder $order): bool
    {
        if (!$user->hasPermissionTo('production.orders.update')) {
            return false;
        }

        // Only draft and planned orders can be updated
        if (!in_array($order->status, ['draft', 'planned'])) {
            return false;
        }

        // Check entity-scoped permissions
        if ($order->item && $order->item->sector) {
            $sector = $order->item->sector;
            $area = $sector->area;
            $plant = $area->plant;

            return $user->hasAnyPermission([
                "production.orders.update.plant.{$plant->id}",
                "production.orders.update.area.{$area->id}",
                "production.orders.update.sector.{$sector->id}",
            ]);
        }

        return true;
    }

    /**
     * Determine whether the user can delete the production order.
     */
    public function delete(User $user, ManufacturingOrder $order): bool
    {
        if (!$user->hasPermissionTo('production.orders.delete')) {
            return false;
        }

        // Only draft orders can be deleted
        if ($order->status !== 'draft') {
            return false;
        }

        // Cannot delete if it has children
        if ($order->children()->exists()) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can release the production order.
     */
    public function release(User $user, ManufacturingOrder $order): bool
    {
        if (!$user->hasPermissionTo('production.orders.release')) {
            return false;
        }

        // Only draft and planned orders can be released
        if (!$order->canBeReleased()) {
            return false;
        }

        // Must have a manufacturing route
        if (!$order->manufacturingRoute) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can cancel the production order.
     */
    public function cancel(User $user, ManufacturingOrder $order): bool
    {
        if (!$user->hasPermissionTo('production.orders.cancel')) {
            return false;
        }

        return $order->canBeCancelled();
    }

    /**
     * Determine whether the user can report production on the order.
     */
    public function reportProduction(User $user, ManufacturingOrder $order): bool
    {
        if (!$user->hasPermissionTo('production.orders.reportProduction')) {
            return false;
        }

        // Check if order can receive production reports
        if (!$order->canReportProduction()) {
            return false;
        }

        // Check entity-scoped permissions
        if ($order->item && $order->item->sector) {
            $sector = $order->item->sector;
            $area = $sector->area;
            $plant = $area->plant;

            return $user->hasAnyPermission([
                "production.orders.reportProduction.plant.{$plant->id}",
                "production.orders.reportProduction.area.{$area->id}",
                "production.orders.reportProduction.sector.{$sector->id}",
            ]);
        }

        return true;
    }

    /**
     * Determine whether the user can configure dependencies for the order.
     */
    public function configureDependencies(User $user, ManufacturingOrder $order): bool
    {
        // Order must be in a state where dependencies can be configured
        if (!in_array($order->status, ['draft', 'planned', 'released'])) {
            return false;
        }

        // Must have children to configure dependencies
        if ($order->children()->count() === 0) {
            return false;
        }

        return $user->hasPermissionTo('production.orders.configure_dependencies');
    }
} 
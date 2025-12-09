<?php

namespace App\Policies\Production;

use App\Models\Production\Shipment;
use App\Models\User;

/**
 * Policy for Shipment authorization.
 *
 * Handles permissions for creating, viewing, and managing shipments.
 */
class ShipmentPolicy
{
    /**
     * Determine whether the user can view any shipments.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view_any_shipment');
    }

    /**
     * Determine whether the user can view the shipment.
     */
    public function view(User $user, Shipment $shipment): bool
    {
        return $user->can('view_shipment');
    }

    /**
     * Determine whether the user can create shipments.
     */
    public function create(User $user): bool
    {
        return $user->can('create_shipment');
    }

    /**
     * Determine whether the user can update the shipment.
     */
    public function update(User $user, Shipment $shipment): bool
    {
        return $user->can('update_shipment');
    }

    /**
     * Determine whether the user can delete the shipment.
     */
    public function delete(User $user, Shipment $shipment): bool
    {
        // Cannot delete shipped or received shipments
        if (in_array($shipment->status, ['shipped', 'in_transit', 'delivered', 'received'])) {
            return false;
        }

        return $user->can('delete_shipment');
    }

    /**
     * Determine whether the user can mark shipment as shipped.
     */
    public function markAsShipped(User $user, Shipment $shipment): bool
    {
        return $user->can('update_shipment') && $shipment->canShip();
    }

    /**
     * Determine whether the user can mark shipment as received.
     */
    public function markAsReceived(User $user, Shipment $shipment): bool
    {
        return $user->can('update_shipment') && $shipment->canReceive();
    }

    /**
     * Determine whether the user can generate packing list.
     */
    public function generatePackingList(User $user, Shipment $shipment): bool
    {
        return $user->can('view_shipment');
    }
}

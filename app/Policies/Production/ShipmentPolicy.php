<?php

namespace App\Policies\Production;

use App\Models\Production\Shipment;
use App\Models\User;

class ShipmentPolicy
{
    /**
     * Determine whether the user can view any shipments.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.shipments.viewAny');
    }

    /**
     * Determine whether the user can view the shipment.
     */
    public function view(User $user, Shipment $shipment): bool
    {
        return $user->hasPermissionTo('production.shipments.view');
    }

    /**
     * Determine whether the user can create shipments.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('production.shipments.create');
    }

    /**
     * Determine whether the user can update the shipment.
     */
    public function update(User $user, Shipment $shipment): bool
    {
        // Can only update draft or ready shipments
        if (!in_array($shipment->status, ['draft', 'ready'])) {
            return false;
        }

        return $user->hasPermissionTo('production.shipments.update');
    }

    /**
     * Determine whether the user can delete the shipment.
     */
    public function delete(User $user, Shipment $shipment): bool
    {
        // Can only delete draft or cancelled shipments
        if (!in_array($shipment->status, ['draft', 'cancelled'])) {
            return false;
        }

        return $user->hasPermissionTo('production.shipments.delete');
    }

    /**
     * Determine whether the user can mark shipment as ready.
     */
    public function markReady(User $user, Shipment $shipment): bool
    {
        // Can only mark draft shipments as ready
        if ($shipment->status !== 'draft') {
            return false;
        }

        return $user->hasPermissionTo('production.shipments.markReady');
    }

    /**
     * Determine whether the user can ship the shipment.
     */
    public function ship(User $user, Shipment $shipment): bool
    {
        // Can only ship ready shipments
        if ($shipment->status !== 'ready') {
            return false;
        }

        return $user->hasPermissionTo('production.shipments.ship');
    }

    /**
     * Determine whether the user can mark shipment as delivered.
     */
    public function deliver(User $user, Shipment $shipment): bool
    {
        // Can only mark in-transit shipments as delivered
        if ($shipment->status !== 'in_transit') {
            return false;
        }

        return $user->hasPermissionTo('production.shipments.deliver');
    }

    /**
     * Determine whether the user can upload photos.
     */
    public function uploadPhotos(User $user, Shipment $shipment): bool
    {
        return $user->hasPermissionTo('production.shipments.uploadPhotos');
    }
} 
<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use Illuminate\Auth\Access\HandlesAuthorization;

class WorkOrderPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any work orders.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('work-orders.view');
    }

    /**
     * Determine whether the user can view the work order.
     */
    public function view(User $user, WorkOrder $workOrder): bool
    {
        // Check if user has general permission
        if ($user->can('work-orders.view')) {
            return true;
        }

        // Check if user has plant-specific permission
        if ($workOrder->plant_id && $user->can("work-orders.view.plant.{$workOrder->plant_id}")) {
            return true;
        }

        // Check if user is assigned to the work order
        if ($workOrder->assigned_to === $user->id) {
            return true;
        }

        // Check if user created the work order
        if ($workOrder->created_by === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can create work orders.
     */
    public function create(User $user): bool
    {
        return $user->can('work-orders.create');
    }

    /**
     * Determine whether the user can update the work order.
     */
    public function update(User $user, WorkOrder $workOrder): bool
    {
        // Cannot update completed or cancelled work orders
        if (in_array($workOrder->status, ['completed', 'cancelled'])) {
            return false;
        }

        // Check if user has general permission
        if ($user->can('work-orders.update')) {
            return true;
        }

        // Check if user has plant-specific permission
        if ($workOrder->plant_id && $user->can("work-orders.update.plant.{$workOrder->plant_id}")) {
            return true;
        }

        // Assigned user can update certain fields
        if ($workOrder->assigned_to === $user->id && $workOrder->status === 'in_progress') {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the work order.
     */
    public function delete(User $user, WorkOrder $workOrder): bool
    {
        // Can only delete pending work orders
        if ($workOrder->status !== 'pending') {
            return false;
        }

        // Check if user has general permission
        if ($user->can('work-orders.delete')) {
            return true;
        }

        // Check if user has plant-specific permission
        if ($workOrder->plant_id && $user->can("work-orders.delete.plant.{$workOrder->plant_id}")) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can approve the work order.
     */
    public function approve(User $user, WorkOrder $workOrder): bool
    {
        // Can only approve pending work orders
        if ($workOrder->status !== 'pending') {
            return false;
        }

        // Check if user has general permission
        if ($user->can('work-orders.approve')) {
            return true;
        }

        // Check if user has plant-specific permission
        if ($workOrder->plant_id && $user->can("work-orders.approve.plant.{$workOrder->plant_id}")) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can start the work order.
     */
    public function start(User $user, WorkOrder $workOrder): bool
    {
        // Can only start approved work orders
        if ($workOrder->status !== 'approved') {
            return false;
        }

        // Must be assigned to start
        if ($workOrder->assigned_to !== $user->id) {
            // Unless user has execution permission
            if ($user->can('work-orders.execute')) {
                return true;
            }

            if ($workOrder->plant_id && $user->can("work-orders.execute.plant.{$workOrder->plant_id}")) {
                return true;
            }

            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can execute the work order.
     */
    public function execute(User $user, WorkOrder $workOrder): bool
    {
        // Must be in progress
        if ($workOrder->status !== 'in_progress') {
            return false;
        }

        // Check if user is the executor
        if ($workOrder->execution && $workOrder->execution->executed_by === $user->id) {
            return true;
        }

        // Check permissions
        if ($user->can('work-orders.execute')) {
            return true;
        }

        if ($workOrder->plant_id && $user->can("work-orders.execute.plant.{$workOrder->plant_id}")) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can complete the work order.
     */
    public function complete(User $user, WorkOrder $workOrder): bool
    {
        // Must be in progress
        if ($workOrder->status !== 'in_progress') {
            return false;
        }

        // Check if user is the executor
        if ($workOrder->execution && $workOrder->execution->executed_by === $user->id) {
            return true;
        }

        // Check permissions
        if ($user->can('work-orders.complete')) {
            return true;
        }

        if ($workOrder->plant_id && $user->can("work-orders.complete.plant.{$workOrder->plant_id}")) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can cancel the work order.
     */
    public function cancel(User $user, WorkOrder $workOrder): bool
    {
        // Cannot cancel completed work orders
        if ($workOrder->status === 'completed') {
            return false;
        }

        // Check permissions
        if ($user->can('work-orders.cancel')) {
            return true;
        }

        if ($workOrder->plant_id && $user->can("work-orders.cancel.plant.{$workOrder->plant_id}")) {
            return true;
        }

        // Creator can cancel pending work orders
        if ($workOrder->status === 'pending' && $workOrder->created_by === $user->id) {
            return true;
        }

        return false;
    }
}
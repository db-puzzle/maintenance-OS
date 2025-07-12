<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use Illuminate\Auth\Access\Response;

class WorkOrderPolicy
{
    /**
     * Determine whether the user can view any work orders.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('work-orders.view');
    }

    /**
     * Determine whether the user can view the work order.
     */
    public function view(User $user, WorkOrder $workOrder): bool
    {
        return $user->hasPermissionTo('work-orders.view');
    }

    /**
     * Determine whether the user can create work orders.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('work-orders.create');
    }

    /**
     * Determine whether the user can update the work order.
     */
    public function update(User $user, WorkOrder $workOrder): bool
    {
        if (!$user->hasPermissionTo('work-orders.update')) {
            return false;
        }

        // Only allow updates to certain statuses
        $editableStatuses = [
            WorkOrder::STATUS_REQUESTED,
            WorkOrder::STATUS_APPROVED,
            WorkOrder::STATUS_PLANNED,
        ];

        return in_array($workOrder->status, $editableStatuses);
    }

    /**
     * Determine whether the user can delete the work order.
     */
    public function delete(User $user, WorkOrder $workOrder): bool
    {
        if (!$user->hasPermissionTo('work-orders.delete')) {
            return false;
        }

        // Only allow deletion of requested or cancelled work orders
        return in_array($workOrder->status, [
            WorkOrder::STATUS_REQUESTED,
            WorkOrder::STATUS_CANCELLED,
        ]);
    }

    /**
     * Determine whether the user can approve work orders.
     */
    public function approve(User $user, WorkOrder $workOrder): bool
    {
        if (!$user->hasPermissionTo('work-orders.approve')) {
            return false;
        }

        return $workOrder->status === WorkOrder::STATUS_REQUESTED;
    }

    /**
     * Determine whether the user can plan work orders.
     */
    public function plan(User $user, WorkOrder $workOrder): bool
    {
        if (!$user->hasPermissionTo('work-orders.plan')) {
            return false;
        }

        return $workOrder->status === WorkOrder::STATUS_APPROVED;
    }

    /**
     * Determine whether the user can schedule work orders.
     */
    public function schedule(User $user, WorkOrder $workOrder): bool
    {
        if (!$user->hasPermissionTo('work-orders.schedule')) {
            return false;
        }

        return in_array($workOrder->status, [
            WorkOrder::STATUS_PLANNED,
            WorkOrder::STATUS_READY,
        ]);
    }

    /**
     * Determine whether the user can execute the work order.
     */
    public function execute(User $user, WorkOrder $workOrder): bool
    {
        if (!$user->hasPermissionTo('work-orders.execute')) {
            return false;
        }

        // Check if user is assigned to the work order
        if ($workOrder->assigned_technician_id && $workOrder->assigned_technician_id !== $user->id) {
            return false;
        }

        return in_array($workOrder->status, [
            WorkOrder::STATUS_SCHEDULED,
            WorkOrder::STATUS_IN_PROGRESS,
        ]);
    }

    /**
     * Determine whether the user can verify the work order.
     */
    public function verify(User $user, WorkOrder $workOrder): bool
    {
        if (!$user->hasPermissionTo('work-orders.verify')) {
            return false;
        }

        return $workOrder->status === WorkOrder::STATUS_COMPLETED;
    }

    /**
     * Determine whether the user can close the work order.
     */
    public function close(User $user, WorkOrder $workOrder): bool
    {
        if (!$user->hasPermissionTo('work-orders.close')) {
            return false;
        }

        return $workOrder->status === WorkOrder::STATUS_VERIFIED;
    }
}
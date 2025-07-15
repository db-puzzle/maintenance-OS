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
        if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.view.plant.{$workOrder->asset->plant_id}")) {
            return true;
        }

        // Check if user is assigned to the work order
        if ($workOrder->assigned_technician_id === $user->id) {
            return true;
        }

        // Check if user created the work order
        if ($workOrder->requested_by === $user->id) {
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
        // Cannot update closed, cancelled or rejected work orders
        if (in_array($workOrder->status, ['closed', 'cancelled', 'rejected'])) {
            return false;
        }

        // Check if user has general permission
        if ($user->can('work-orders.update')) {
            return true;
        }

        // Check if user has plant-specific permission
        if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.update.plant.{$workOrder->asset->plant_id}")) {
            return true;
        }

        // Assigned user can update certain fields when in progress
        if ($workOrder->assigned_technician_id === $user->id && $workOrder->status === 'in_progress') {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the work order.
     */
    public function delete(User $user, WorkOrder $workOrder): bool
    {
        // Can only delete requested work orders
        if ($workOrder->status !== 'requested') {
            return false;
        }

        // Check if user has general permission
        if ($user->can('work-orders.delete')) {
            return true;
        }

        // Check if user has plant-specific permission
        if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.delete.plant.{$workOrder->asset->plant_id}")) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can approve the work order.
     */
    public function approve(User $user, WorkOrder $workOrder): bool
    {
        // Can only approve requested work orders
        if ($workOrder->status !== 'requested') {
            return false;
        }

        // Check if user has general permission
        if ($user->can('work-orders.approve')) {
            return true;
        }

        // Check if user has plant-specific permission
        if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.approve.plant.{$workOrder->asset->plant_id}")) {
            return true;
        }

        // Check role-based approval limits
        if ($user->hasRole('Administrator')) {
            return true;
        }

        if ($user->hasRole('Plant Manager')) {
            // Check cost and priority limits
            $costLimit = 50000;
            $priorityLimit = ['emergency', 'urgent', 'high', 'normal', 'low'];
            
            if (($workOrder->estimated_total_cost ?? 0) <= $costLimit && 
                in_array($workOrder->priority, $priorityLimit)) {
                return true;
            }
        }

        if ($user->hasRole('Maintenance Supervisor')) {
            // Check cost and priority limits
            $costLimit = 5000;
            $priorityLimit = ['normal', 'low'];
            
            if (($workOrder->estimated_total_cost ?? 0) <= $costLimit && 
                in_array($workOrder->priority, $priorityLimit)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can plan the work order.
     */
    public function plan(User $user, WorkOrder $workOrder): bool
    {
        // Can only plan approved or already planned work orders
        if (!in_array($workOrder->status, ['approved', 'planned'])) {
            return false;
        }

        // Check if user has general permission
        if ($user->can('work-orders.plan')) {
            return true;
        }

        // Check if user has plant-specific permission
        if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.plan.plant.{$workOrder->asset->plant_id}")) {
            return true;
        }

        // Check role-based permissions
        if ($user->hasRole(['Administrator', 'Plant Manager', 'Maintenance Supervisor', 'Planner'])) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can start the work order.
     */
    public function start(User $user, WorkOrder $workOrder): bool
    {
        // Can only start scheduled work orders
        if ($workOrder->status !== 'scheduled') {
            return false;
        }

        // Must be assigned to start
        if ($workOrder->assigned_technician_id !== $user->id) {
            // Unless user has execution permission
            if ($user->can('work-orders.execute')) {
                return true;
            }

            if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.execute.plant.{$workOrder->asset->plant_id}")) {
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
        // Must be scheduled or in progress
        if (!in_array($workOrder->status, ['scheduled', 'in_progress'])) {
            return false;
        }

        // Check if user is the assigned technician
        if ($workOrder->assigned_technician_id === $user->id) {
            return true;
        }

        // Check if user is the executor
        if ($workOrder->execution && $workOrder->execution->executed_by === $user->id) {
            return true;
        }

        // Check permissions
        if ($user->can('work-orders.execute')) {
            return true;
        }

        if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.execute.plant.{$workOrder->asset->plant_id}")) {
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

        if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.complete.plant.{$workOrder->asset->plant_id}")) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can validate the work order.
     */
    public function validate(User $user, WorkOrder $workOrder): bool
    {
        // Can only validate completed work orders
        if ($workOrder->status !== 'completed') {
            return false;
        }

        // Check if user has general permission
        if ($user->can('work-orders.validate')) {
            return true;
        }

        // Check if user has plant-specific permission
        if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.validate.plant.{$workOrder->asset->plant_id}")) {
            return true;
        }

        // Check role-based permissions
        if ($user->hasRole(['Administrator', 'Maintenance Supervisor', 'Plant Manager', 'Validator'])) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can cancel the work order.
     */
    public function cancel(User $user, WorkOrder $workOrder): bool
    {
        // Cannot cancel closed or already cancelled work orders
        if (in_array($workOrder->status, ['closed', 'cancelled'])) {
            return false;
        }

        // Check permissions
        if ($user->can('work-orders.cancel')) {
            return true;
        }

        if ($workOrder->asset && $workOrder->asset->plant_id && $user->can("work-orders.cancel.plant.{$workOrder->asset->plant_id}")) {
            return true;
        }

        // Creator can cancel requested work orders
        if ($workOrder->status === 'requested' && $workOrder->requested_by === $user->id) {
            return true;
        }

        return false;
    }
}
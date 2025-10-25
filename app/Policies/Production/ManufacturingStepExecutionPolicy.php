<?php

namespace App\Policies\Production;

use App\Models\Production\ManufacturingStepExecution;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ManufacturingStepExecutionPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the step execution.
     */
    public function view(User $user, ManufacturingStepExecution $execution): bool
    {
        return $user->hasPermissionTo('production.steps.view');
    }

    /**
     * Determine whether the user can update the step execution (report progress).
     */
    public function update(User $user, ManufacturingStepExecution $execution): bool
    {
        if (! $user->hasPermissionTo('production.steps.execute')) {
            return false;
        }

        // Cannot update completed executions
        if ($execution->status === 'completed') {
            return false;
        }

        // Technicians can only update executions in their assigned work cells
        if ($user->hasRole('Technician')) {
            $assignedWorkCells = $user->assignedWorkCells()->pluck('id');

            if (! $assignedWorkCells->contains($execution->work_cell_id)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Determine whether the user can take photos for step execution.
     */
    public function takePhotos(User $user, ManufacturingStepExecution $execution): bool
    {
        if (! $user->hasPermissionTo('production.steps.photos')) {
            return false;
        }

        // Must be able to update the execution
        return $this->update($user, $execution);
    }

    /**
     * Determine whether the user can delete photos from step execution.
     */
    public function deletePhotos(User $user, ManufacturingStepExecution $execution): bool
    {
        if (! $user->hasPermissionTo('production.steps.photos')) {
            return false;
        }

        // Cannot delete photos from completed executions
        if ($execution->status === 'completed') {
            return false;
        }

        // Only the user who uploaded the photo or managers can delete
        if ($user->hasRole(['production-manager', 'production-supervisor'])) {
            return true;
        }

        // Regular operators can only delete if they're still working on the execution
        return $this->update($user, $execution);
    }

    /**
     * Determine whether the user can report production on the step execution.
     */
    public function reportProduction(User $user, ManufacturingStepExecution $execution): bool
    {
        return $this->update($user, $execution);
    }
}

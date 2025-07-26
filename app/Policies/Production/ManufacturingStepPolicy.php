<?php

namespace App\Policies\Production;

use App\Models\Production\ManufacturingStep;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ManufacturingStepPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any manufacturing steps.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.steps.viewAny');
    }

    /**
     * Determine whether the user can view the manufacturing step.
     */
    public function view(User $user, ManufacturingStep $step): bool
    {
        return $user->hasPermissionTo('production.steps.view');
    }

    /**
     * Determine whether the user can update the manufacturing step.
     */
    public function update(User $user, ManufacturingStep $step): bool
    {
        if (!$user->hasPermissionTo('production.steps.update')) {
            return false;
        }

        // Cannot update completed or skipped steps
        if (in_array($step->status, ['completed', 'skipped'])) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can execute the manufacturing step.
     */
    public function execute(User $user, ManufacturingStep $step): bool
    {
        if (!$user->hasPermissionTo('production.steps.execute')) {
            return false;
        }

        // Machine operators can only execute steps in their assigned work cells
        if ($user->hasRole('machine-operator')) {
            $assignedWorkCells = $user->assignedWorkCells()->pluck('id');
            
            if (!$assignedWorkCells->contains($step->work_cell_id)) {
                return false;
            }
        }

        // Step must be executable
        if (!$step->canStart()) {
            return false;
        }

        // Cannot execute completed or skipped steps
        if (in_array($step->status, ['completed', 'skipped'])) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can execute quality checks.
     */
    public function executeQualityCheck(User $user, ManufacturingStep $step): bool
    {
        if (!$user->hasPermissionTo('production.steps.executeQualityCheck')) {
            return false;
        }

        // Must be a quality check step
        if ($step->step_type !== 'quality_check') {
            return false;
        }

        // Step must be executable
        if (!$step->canStart()) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can handle rework.
     */
    public function handleRework(User $user, ManufacturingStep $step): bool
    {
        if (!$user->hasPermissionTo('production.steps.handleRework')) {
            return false;
        }

        // Must be a rework step
        if ($step->step_type !== 'rework') {
            return false;
        }

        return true;
    }
}
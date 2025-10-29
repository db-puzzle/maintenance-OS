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
        if (! $user->hasPermissionTo('production.steps.update')) {
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
        if (! $user->hasPermissionTo('production.steps.execute')) {
            return false;
        }

        // Technicians can only execute steps in their assigned work cells
        if ($user->hasRole('Technician')) {
            $assignedWorkCells = $user->assignedWorkCells()->pluck('id');

            if (! $assignedWorkCells->contains($step->work_cell_id)) {
                return false;
            }
        }

        // Step must be executable
        if (! $step->canStart()) {
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
        if (! $user->hasPermissionTo('production.quality.executeCheck')) {
            return false;
        }

        // Must be a quality check step
        if ($step->step_type !== 'quality_check') {
            return false;
        }

        // Step must be executable
        if (! $step->canStart()) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can handle rework.
     */
    public function handleRework(User $user, ManufacturingStep $step): bool
    {
        if (! $user->hasPermissionTo('production.quality.initiateRework')) {
            return false;
        }

        // Must be a rework step
        if ($step->step_type !== 'rework') {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can execute in a specific work cell.
     * This is used when starting an execution for a step.
     */
    public function executeInWorkCell(User $user, ManufacturingStep $step, $workCell): bool
    {
        if (! $user->hasPermissionTo('production.steps.execute')) {
            return false;
        }

        // Technicians can only execute steps in their assigned work cells
        if ($user->hasRole('Technician')) {
            $assignedWorkCells = $user->assignedWorkCells()->pluck('id');

            if (! $assignedWorkCells->contains($step->work_cell_id)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Determine whether the user can force start a step.
     */
    public function forceStart(User $user, ManufacturingStep $step): bool
    {
        return $user->hasPermissionTo('production.steps.force_start');
    }

    /**
     * Determine whether the user can skip a step.
     */
    public function skip(User $user, ManufacturingStep $step): bool
    {
        return $user->hasPermissionTo('production.steps.skip');
    }

    /**
     * Determine whether the user can put a step on hold.
     */
    public function putOnHold(User $user, ManufacturingStep $step): bool
    {
        return $user->hasPermissionTo('production.steps.hold');
    }

    /**
     * Determine whether the user can resume a step from hold.
     */
    public function resume(User $user, ManufacturingStep $step): bool
    {
        return $user->hasPermissionTo('production.steps.resume');
    }

    /**
     * Determine whether the user can record quality results.
     */
    public function recordQuality(User $user, ManufacturingStep $step): bool
    {
        return $user->hasPermissionTo('production.quality.record');
    }

    /**
     * Determine whether the user can cancel a step.
     */
    public function cancel(User $user, ManufacturingStep $step): bool
    {
        return $user->hasPermissionTo('production.steps.cancel') &&
               ! in_array($step->status, ['completed', 'cancelled']);
    }
}

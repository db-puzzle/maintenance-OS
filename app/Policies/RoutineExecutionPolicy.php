<?php

namespace App\Policies;

use App\Models\Maintenance\RoutineExecution;
use App\Models\User;

class RoutineExecutionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // For now, allow all authenticated users to view execution history
        // In a real app, you'd check for specific permissions
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, RoutineExecution $routineExecution): bool
    {
        // Users can view executions they performed or if they have general view permission
        return $user->id === $routineExecution->executed_by || $this->viewAny($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, RoutineExecution $routineExecution): bool
    {
        // Only the executor can update their own executions, and only if not completed
        return $user->id === $routineExecution->executed_by && 
               !$routineExecution->isCompleted();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, RoutineExecution $routineExecution): bool
    {
        // Only allow deletion of pending/cancelled executions by the executor or admins
        return ($user->id === $routineExecution->executed_by || $this->isAdmin($user)) &&
               in_array($routineExecution->status, [
                   RoutineExecution::STATUS_PENDING,
                   RoutineExecution::STATUS_CANCELLED
               ]);
    }

    /**
     * Determine whether the user can export the model.
     */
    public function export(User $user, RoutineExecution $routineExecution): bool
    {
        // Users can export executions they can view
        return $this->view($user, $routineExecution);
    }

    /**
     * Determine whether the user can export multiple models.
     */
    public function exportBatch(User $user): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Check if user is admin (placeholder implementation)
     */
    private function isAdmin(User $user): bool
    {
        // In a real implementation, check user roles/permissions
        // For now, return false as we don't have a role system implemented
        return false;
    }
}
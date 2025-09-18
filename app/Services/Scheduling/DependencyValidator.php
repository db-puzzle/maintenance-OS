<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingStep;
use Carbon\Carbon;
use DateTime;

class DependencyValidator
{
    /**
     * Check if all dependencies are met for a step.
     */
    public function canStart(
        ManufacturingStep $step,
        DateTime $proposedStart,
        array $scheduledSteps
    ): bool {
        // If no dependency, can start anytime
        if (!$step->dependency_id) {
            return true;
        }

        // Check if dependency is scheduled
        if (!isset($scheduledSteps[$step->dependency_id])) {
            return false;
        }

        $dependencySchedule = $scheduledSteps[$step->dependency_id];
        
        // Proposed start must be after dependency end
        return Carbon::instance($proposedStart)->gte(
            Carbon::instance($dependencySchedule->scheduledEnd)
        );
    }

    /**
     * Get earliest possible start time based on dependencies.
     */
    public function getEarliestStartTime(
        ManufacturingStep $step,
        array $scheduledSteps
    ): DateTime {
        // If no dependency, can start now
        if (!$step->dependency_id) {
            return Carbon::now()->toDateTime();
        }

        // If dependency not scheduled yet, can't determine
        if (!isset($scheduledSteps[$step->dependency_id])) {
            // This shouldn't happen in proper scheduling order
            return Carbon::now()->toDateTime();
        }

        $dependencySchedule = $scheduledSteps[$step->dependency_id];
        
        // Can start immediately after dependency ends
        return $dependencySchedule->scheduledEnd;
    }

    /**
     * Get all steps that depend on a given step.
     */
    public function getDependentSteps(
        ManufacturingStep $step,
        array $allSteps
    ): array {
        $dependents = [];
        
        foreach ($allSteps as $otherStep) {
            if ($otherStep->dependency_id === $step->id) {
                $dependents[] = $otherStep;
            }
        }
        
        return $dependents;
    }

    /**
     * Check if moving a step would violate any dependencies.
     */
    public function canReschedule(
        ManufacturingStep $step,
        DateTime $newStart,
        DateTime $newEnd,
        array $scheduledSteps
    ): bool {
        // Check if new start respects dependency
        if ($step->dependency_id && isset($scheduledSteps[$step->dependency_id])) {
            $dependencyEnd = $scheduledSteps[$step->dependency_id]->scheduledEnd;
            if (Carbon::instance($newStart)->lt(Carbon::instance($dependencyEnd))) {
                return false;
            }
        }

        // Check if new end would violate any dependent steps
        $currentSchedule = $scheduledSteps[$step->id] ?? null;
        if ($currentSchedule) {
            foreach ($scheduledSteps as $otherSchedule) {
                $otherStep = ManufacturingStep::find($otherSchedule->stepId);
                if ($otherStep && $otherStep->dependency_id === $step->id) {
                    if (Carbon::instance($otherSchedule->scheduledStart)->lt(Carbon::instance($newEnd))) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Get the dependency chain for a step (all steps it depends on).
     */
    public function getDependencyChain(ManufacturingStep $step): array
    {
        $chain = [];
        $current = $step;
        
        while ($current->dependency_id) {
            $dependency = ManufacturingStep::find($current->dependency_id);
            if (!$dependency || in_array($dependency->id, array_column($chain, 'id'))) {
                // Prevent infinite loops
                break;
            }
            $chain[] = $dependency;
            $current = $dependency;
        }
        
        return array_reverse($chain);
    }

    /**
     * Sort steps by dependency order.
     */
    public function sortByDependencies(array $steps): array
    {
        $sorted = [];
        $visited = [];
        $visiting = [];

        foreach ($steps as $step) {
            if (!isset($visited[$step->id])) {
                $this->topologicalSort($step, $steps, $sorted, $visited, $visiting);
            }
        }

        return $sorted;
    }

    /**
     * Topological sort helper for dependency ordering.
     */
    private function topologicalSort(
        ManufacturingStep $step,
        array $allSteps,
        array &$sorted,
        array &$visited,
        array &$visiting
    ): void {
        if (isset($visiting[$step->id])) {
            // Circular dependency detected
            throw new \RuntimeException("Circular dependency detected for step {$step->id}");
        }

        if (isset($visited[$step->id])) {
            return;
        }

        $visiting[$step->id] = true;

        // Visit dependencies first
        if ($step->dependency_id) {
            $dependency = null;
            foreach ($allSteps as $s) {
                if ($s->id === $step->dependency_id) {
                    $dependency = $s;
                    break;
                }
            }
            if ($dependency) {
                $this->topologicalSort($dependency, $allSteps, $sorted, $visited, $visiting);
            }
        }

        unset($visiting[$step->id]);
        $visited[$step->id] = true;
        $sorted[] = $step;
    }
}

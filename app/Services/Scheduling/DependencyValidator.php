<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingStep;
use Carbon\Carbon;
use DateTime;

class DependencyValidator
{
    protected OrderFamilyService $familyService;

    public function __construct(OrderFamilyService $familyService)
    {
        $this->familyService = $familyService;
    }

    /**
     * Check if all dependencies are met for a step.
     */
    public function canStart(
        ManufacturingStep $step,
        DateTime $proposedStart,
        array $scheduledSteps
    ): bool {
        // Check step dependencies first
        if (! $this->checkStepDependencies($step, $proposedStart, $scheduledSteps)) {
            return false;
        }

        // Then check child order dependencies
        return $this->checkChildOrderDependencies($step, $proposedStart);
    }

    /**
     * Check step dependencies based on gate configuration.
     */
    protected function checkStepDependencies(
        ManufacturingStep $step,
        DateTime $proposedStart,
        array $scheduledSteps
    ): bool {
        // If no dependency, can start
        if (! $step->depends_on_step_id) {
            return true;
        }

        // Check if dependency is scheduled
        if (! isset($scheduledSteps[$step->depends_on_step_id])) {
            return false;
        }

        $dependencySchedule = $scheduledSteps[$step->depends_on_step_id];
        $dependencyStep = ManufacturingStep::find($step->depends_on_step_id);

        if (! $dependencyStep) {
            return false;
        }

        // Check based on dependency start condition
        switch ($step->dependency_start_condition) {
            case 'immediate':
                // Can start as soon as dependency starts
                return Carbon::instance($proposedStart)->gte(
                    Carbon::instance($dependencySchedule->scheduledStart)
                );

            case 'quantity_based':
                // For scheduling, assume dependency will complete required quantity
                // Actual runtime will check real quantities
                return Carbon::instance($proposedStart)->gte(
                    $this->calculateQuantityBasedStart($step, $dependencyStep, $dependencySchedule)
                );

            case 'percentage_based':
                // For scheduling, calculate when percentage would be met
                return Carbon::instance($proposedStart)->gte(
                    $this->calculatePercentageBasedStart($step, $dependencyStep, $dependencySchedule)
                );

            case 'completed':
            default:
                // Must wait for full completion
                return Carbon::instance($proposedStart)->gte(
                    Carbon::instance($dependencySchedule->scheduledEnd)
                );
        }
    }

    /**
     * Check child order dependencies.
     */
    protected function checkChildOrderDependencies(
        ManufacturingStep $step,
        DateTime $proposedStart
    ): bool {
        // Get the manufacturing order for this step
        $order = $step->manufacturingRoute->manufacturingOrder ?? null;
        if (! $order) {
            return true;
        }

        // Check child order dependency type
        switch ($step->child_order_dependency_type) {
            case 'none':
                return true;

            case 'all_children_completed':
                // For scheduling, we assume children will be scheduled before parent
                // This will be enforced by the family-based scheduling
                return true;

            case 'children_quantity':
                // For scheduling, assume children will produce required quantity
                return true;

            default:
                return true;
        }
    }

    /**
     * Get earliest possible start time based on dependencies with gate support.
     */
    public function getEarliestStartTime(
        ManufacturingStep $step,
        array $scheduledSteps
    ): DateTime {
        $earliestStart = Carbon::now()->toDateTime();

        // Check step dependencies
        if ($step->depends_on_step_id) {
            $stepStart = $this->getEarliestStartFromStepDependency($step, $scheduledSteps);
            if ($stepStart && Carbon::instance($stepStart)->gt($earliestStart)) {
                $earliestStart = $stepStart;
            }
        }

        // Check child order dependencies
        $childOrderStart = $this->getEarliestStartFromChildOrders($step);
        if ($childOrderStart && Carbon::instance($childOrderStart)->gt($earliestStart)) {
            $earliestStart = $childOrderStart;
        }

        return $earliestStart;
    }

    /**
     * Get earliest start time based on step dependency and gate configuration.
     */
    protected function getEarliestStartFromStepDependency(
        ManufacturingStep $step,
        array $scheduledSteps
    ): ?DateTime {
        if (! $step->depends_on_step_id || ! isset($scheduledSteps[$step->depends_on_step_id])) {
            return null;
        }

        $dependencySchedule = $scheduledSteps[$step->depends_on_step_id];
        $dependencyStep = ManufacturingStep::find($step->depends_on_step_id);

        if (! $dependencyStep) {
            return null;
        }

        switch ($step->dependency_start_condition) {
            case 'immediate':
                return $dependencySchedule->scheduledStart;

            case 'quantity_based':
                return $this->calculateQuantityBasedStart($step, $dependencyStep, $dependencySchedule);

            case 'percentage_based':
                return $this->calculatePercentageBasedStart($step, $dependencyStep, $dependencySchedule);

            case 'completed':
            default:
                return $dependencySchedule->scheduledEnd;
        }
    }

    /**
     * Calculate start time for quantity-based dependency.
     */
    protected function calculateQuantityBasedStart(
        ManufacturingStep $step,
        ManufacturingStep $dependencyStep,
        StepScheduleData $dependencySchedule
    ): DateTime {
        if (! $step->dependency_minimum_quantity || $step->dependency_minimum_quantity <= 0) {
            return $dependencySchedule->scheduledStart;
        }

        // Get the order quantity
        $order = $dependencyStep->manufacturingRoute->manufacturingOrder;
        if (! $order || $order->quantity <= 0) {
            return $dependencySchedule->scheduledEnd;
        }

        // Calculate what percentage of time is needed to produce the minimum quantity
        $percentageNeeded = min(100, ($step->dependency_minimum_quantity / $order->quantity) * 100);

        // Calculate the time offset
        $totalDuration = Carbon::instance($dependencySchedule->scheduledEnd)
            ->diffInMinutes(Carbon::instance($dependencySchedule->scheduledStart));

        $offsetMinutes = ($totalDuration * $percentageNeeded) / 100;

        return Carbon::instance($dependencySchedule->scheduledStart)
            ->addMinutes($offsetMinutes)
            ->toDateTime();
    }

    /**
     * Calculate start time for percentage-based dependency.
     */
    protected function calculatePercentageBasedStart(
        ManufacturingStep $step,
        ManufacturingStep $dependencyStep,
        StepScheduleData $dependencySchedule
    ): DateTime {
        $percentage = $step->dependency_minimum_percentage ?? 100;
        if ($percentage <= 0) {
            return $dependencySchedule->scheduledStart;
        }
        if ($percentage >= 100) {
            return $dependencySchedule->scheduledEnd;
        }

        // Calculate the time offset based on percentage
        $totalDuration = Carbon::instance($dependencySchedule->scheduledEnd)
            ->diffInMinutes(Carbon::instance($dependencySchedule->scheduledStart));

        $offsetMinutes = ($totalDuration * $percentage) / 100;

        return Carbon::instance($dependencySchedule->scheduledStart)
            ->addMinutes($offsetMinutes)
            ->toDateTime();
    }

    /**
     * Get earliest start time based on child order dependencies.
     */
    protected function getEarliestStartFromChildOrders(ManufacturingStep $step): ?DateTime
    {
        // This will be properly implemented when we have access to scheduled child orders
        // For now, return null to indicate no constraint
        return null;
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
        if ($step->depends_on_step_id && isset($scheduledSteps[$step->depends_on_step_id])) {
            $dependencyEnd = $scheduledSteps[$step->depends_on_step_id]->scheduledEnd;
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
            if (! $dependency || in_array($dependency->id, array_column($chain, 'id'))) {
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
            if (! isset($visited[$step->id])) {
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
        if ($step->depends_on_step_id) {
            $dependency = null;
            foreach ($allSteps as $s) {
                if ($s->id === $step->depends_on_step_id) {
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

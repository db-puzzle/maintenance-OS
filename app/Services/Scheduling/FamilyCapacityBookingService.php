<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingStep;
use App\Services\Scheduling\Exceptions\SchedulingValidationException;
use Carbon\Carbon;
use DateTime;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FamilyCapacityBookingService
{
    protected CapacityChecker $capacityChecker;
    protected OrderFamilyService $familyService;

    public function __construct(
        CapacityChecker $capacityChecker,
        OrderFamilyService $familyService
    ) {
        $this->capacityChecker = $capacityChecker;
        $this->familyService = $familyService;
    }

    /**
     * Reserve capacity for an entire family of orders.
     * Returns scheduled steps if successful, null if unable to schedule entire family.
     */
    public function reserveFamilyCapacity(
        Collection $familyMembers,
        DateTime $startDate,
        array $existingSchedules = []
    ): ?array {
        \Log::info('FamilyCapacityBookingService::reserveFamilyCapacity - Start', [
            'family_members_count' => $familyMembers->count(),
            'family_orders' => $familyMembers->pluck('order_number')->toArray(),
            'start_date' => $startDate->format('Y-m-d H:i:s'),
            'existing_schedules_count' => count($existingSchedules),
        ]);

        DB::beginTransaction();

        try {
            $scheduledSteps = [];
            $failedValidation = [];

            // First, validate all steps have required time parameters
            $validationResult = $this->validateFamilyTimeParameters($familyMembers);
            if (! $validationResult['valid']) {
                \Log::error('FamilyCapacityBookingService::reserveFamilyCapacity - Validation failed', [
                    'errors' => $validationResult['errors'],
                ]);
                DB::rollback();
                throw new SchedulingValidationException(
                    'Missing production time parameters',
                    $validationResult['errors']
                );
            }

            // Sort family members by hierarchy level (children first)
            $sortedMembers = $familyMembers->sortBy(function ($order) {
                return -$this->familyService->getHierarchyLevel($order); // Negative for descending
            });

            // Schedule each order in the family
            foreach ($sortedMembers as $order) {
                if (! $order->manufacturingRoute) {
                    continue;
                }

                // Sort steps by dependencies to ensure dependent steps are scheduled after their dependencies
                $steps = $order->manufacturingRoute->steps->sortBy(function ($step) {
                    // Steps without dependencies come first (display_order 0)
                    // Steps with dependencies come later based on their display order
                    return $step->depends_on_step_id ? 1000 + $step->display_order : $step->display_order;
                });

                foreach ($steps as $step) {
                    // Skip if already scheduled and locked
                    if (isset($existingSchedules[$step->id]) && $existingSchedules[$step->id]->isLocked) {
                        $scheduledSteps[$step->id] = $existingSchedules[$step->id];
                        continue;
                    }

                    // Calculate duration
                    $duration = $this->calculateStepDuration($step);

                    // Find earliest start considering dependencies
                    $earliestStart = $this->calculateEarliestStart(
                        $step,
                        $scheduledSteps,
                        $startDate
                    );

                    \Log::debug("Scheduling step {$step->id}", [
                        'depends_on_step_id' => $step->depends_on_step_id,
                        'dependency_start_condition' => $step->dependency_start_condition,
                        'calculated_earliest_start' => $earliestStart,
                    ]);

                    // Find available slot
                    $slot = $this->capacityChecker->findNextAvailableSlot(
                        $step->workCell,
                        $duration,
                        $earliestStart
                    );

                    if (! $slot) {
                        // Cannot find slot for this step - fail entire family
                        \Log::error('FamilyCapacityBookingService::reserveFamilyCapacity - No slot found for step', [
                            'step_id' => $step->id,
                            'step_name' => $step->name,
                            'order_number' => $order->order_number,
                            'work_cell' => $step->workCell?->name,
                            'duration_minutes' => $duration,
                            'earliest_start' => $earliestStart->format('Y-m-d H:i:s'),
                        ]);
                        
                        DB::rollback();

                        return null;
                    }

                    // Create schedule data
                    $stepData = new StepScheduleData;
                    $stepData->stepId = $step->id;
                    $stepData->workCellId = $step->work_cell_id;
                    $stepData->scheduledStart = $slot;
                    $stepData->scheduledEnd = Carbon::instance($slot)
                        ->addMinutes($duration)
                        ->toDateTime();

                    $scheduledSteps[$step->id] = $stepData;
                }
            }

            // If we made it here, all steps were successfully scheduled
            DB::commit();

            \Log::info('FamilyCapacityBookingService::reserveFamilyCapacity - Success', [
                'scheduled_steps_count' => count($scheduledSteps),
                'family_orders' => $familyMembers->pluck('order_number')->toArray(),
            ]);

            return $scheduledSteps;
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }

    /**
     * Validate that all steps in a family have required time parameters.
     */
    public function validateFamilyTimeParameters(Collection $familyMembers): array
    {
        $errors = [];
        $valid = true;

        foreach ($familyMembers as $order) {
            if (! $order->manufacturingRoute) {
                continue;
            }

            foreach ($order->manufacturingRoute->steps as $step) {
                $hasStepTime = ($step->setup_time_seconds ?? 0) + ($step->cycle_time_seconds ?? 0) > 0;
                $hasWorkCellRate = false;

                // Check if work cell has capacity settings
                if ($step->workCell) {
                    // Check for work cell item rates or constraints
                    $hasWorkCellRate = $step->workCell->itemRates()
                        ->where('item_id', $order->item_id)
                        ->exists();
                }

                if (! $hasStepTime && ! $hasWorkCellRate) {
                    $valid = false;
                    $errors[] = [
                        'order' => $order->order_number,
                        'step' => $step->name,
                        'step_id' => $step->id,
                        'work_cell' => $step->workCell ? $step->workCell->name : 'Not assigned',
                        'work_cell_id' => $step->work_cell_id,
                        'message' => 'Step has no production time settings and work cell has no capacity settings',
                        'links' => [
                            'edit_step' => null, // Routes not available in test environment
                            'edit_work_cell' => null,
                        ],
                    ];
                }
            }
        }

        return [
            'valid' => $valid,
            'errors' => $errors,
        ];
    }

    /**
     * Calculate step duration considering route times and work cell rates.
     */
    protected function calculateStepDuration(ManufacturingStep $step): int
    {
        // Check if step explicitly uses work cell throughput
        if ($step->use_workcell_throughput) {
            // Use work cell rates
            if ($step->workCell && $step->manufacturingRoute) {
                $order = $step->manufacturingRoute->manufacturingOrder;
                if ($order) {
                    $itemRate = $step->workCell->itemRates()
                        ->where('item_id', $order->item_id)
                        ->first();

                    if ($itemRate && $itemRate->cycle_time_seconds > 0) {
                        // Calculate total time: setup + (cycle time * quantity)
                        $totalSeconds = $itemRate->setup_time_seconds + ($itemRate->cycle_time_seconds * $order->quantity);
                        
                        // Convert to minutes for compatibility
                        return (int) ceil($totalSeconds / 60);
                    }
                }
            }
            throw new \RuntimeException("Work cell rates not available for step {$step->id}");
        }

        // Use step-specific times (in seconds)
        $routeTimeSeconds = ($step->setup_time_seconds ?? 0) + ($step->cycle_time_seconds ?? 0);
        if ($routeTimeSeconds > 0) {
            // Convert seconds to minutes for compatibility with current system
            return (int) ceil($routeTimeSeconds / 60);
        }

        // If no times specified, throw error
        throw new \RuntimeException("No time parameters available for step {$step->id}");
    }

    /**
     * Calculate earliest start for a step considering all dependencies.
     */
    protected function calculateEarliestStart(
        ManufacturingStep $step,
        array $scheduledSteps,
        DateTime $baseStartDate
    ): DateTime {
        $earliestStart = $baseStartDate;

        // Check step dependencies
        if ($step->depends_on_step_id && isset($scheduledSteps[$step->depends_on_step_id])) {
            $dependencySchedule = $scheduledSteps[$step->depends_on_step_id];

            switch ($step->dependency_start_condition) {
                case 'immediate':
                    $depStart = $dependencySchedule->scheduledStart;
                    break;

                case 'quantity_based':
                    $depStart = $this->calculateQuantityBasedStart($step, $dependencySchedule);
                    break;

                case 'percentage_based':
                    $depStart = $this->calculatePercentageBasedStart($step, $dependencySchedule);
                    \Log::debug("Calculating percentage-based start for step {$step->id}", [
                        'dependency_minimum_percentage' => $step->dependency_minimum_percentage,
                        'dependency_start' => $dependencySchedule->scheduledStart,
                        'dependency_end' => $dependencySchedule->scheduledEnd,
                        'calculated_start' => $depStart,
                    ]);
                    break;

                case 'completed':
                default:
                    $depStart = $dependencySchedule->scheduledEnd;
                    break;
            }

            if (Carbon::instance($depStart)->gt($earliestStart)) {
                $earliestStart = $depStart;
            }
        }

        // Check child order dependencies
        $childOrderStart = $this->calculateChildOrderDependencyStart($step, $scheduledSteps);
        if ($childOrderStart && Carbon::instance($childOrderStart)->gt($earliestStart)) {
            $earliestStart = $childOrderStart;
        }

        return $earliestStart;
    }

    /**
     * Calculate start time based on quantity gate.
     */
    protected function calculateQuantityBasedStart(
        ManufacturingStep $step,
        StepScheduleData $dependencySchedule
    ): DateTime {
        if (! $step->dependency_minimum_quantity) {
            return $dependencySchedule->scheduledStart;
        }

        // Estimate when the quantity will be produced
        $totalDuration = Carbon::instance($dependencySchedule->scheduledEnd)
            ->diffInMinutes($dependencySchedule->scheduledStart);

        $dependencyStep = ManufacturingStep::find($step->depends_on_step_id);
        if ($dependencyStep && $dependencyStep->manufacturingRoute) {
            $order = $dependencyStep->manufacturingRoute->manufacturingOrder;
            if ($order && $order->quantity > 0) {
                $percentageNeeded = min(100, ($step->dependency_minimum_quantity / $order->quantity) * 100);
                $offsetMinutes = ($totalDuration * $percentageNeeded) / 100;

                return Carbon::instance($dependencySchedule->scheduledStart)
                    ->addMinutes($offsetMinutes)
                    ->toDateTime();
            }
        }

        return $dependencySchedule->scheduledEnd;
    }

    /**
     * Calculate start time based on percentage gate.
     */
    protected function calculatePercentageBasedStart(
        ManufacturingStep $step,
        StepScheduleData $dependencySchedule
    ): DateTime {
        $percentage = $step->dependency_minimum_percentage ?? 100;

        if ($percentage <= 0) {
            return $dependencySchedule->scheduledStart;
        }
        if ($percentage >= 100) {
            return $dependencySchedule->scheduledEnd;
        }

        // Get the dependency step to access its production info
        $dependencyStep = ManufacturingStep::find($step->depends_on_step_id);
        if (! $dependencyStep || ! $dependencyStep->manufacturingRoute) {
            return $dependencySchedule->scheduledEnd;
        }

        $order = $dependencyStep->manufacturingRoute->manufacturingOrder;
        if (! $order || $order->quantity <= 0) {
            return $dependencySchedule->scheduledEnd;
        }

        // Calculate when the percentage of quantity will be completed
        $totalQuantity = $order->quantity;
        $quantityAtPercentage = ($totalQuantity * $percentage) / 100;

        // Get the production rate (convert from seconds)
        $setupTimeMinutes = ($dependencyStep->setup_time_seconds ?? 0) / 60;
        $cycleTimeMinutes = ($dependencyStep->cycle_time_seconds ?? 0) / 60;

        if ($dependencyStep->use_workcell_throughput && $dependencyStep->workCell) {
            // Use work cell throughput rate
            $itemRate = $dependencyStep->workCell->itemRates()
                ->where('item_id', $order->item_id)
                ->first();

            if ($itemRate && $itemRate->cycle_time_seconds > 0) {
                $unitsPerMinute = 60 / $itemRate->cycle_time_seconds; // Convert cycle time to units per minute
                $setupTimeMinutes = ($itemRate->setup_time_seconds ?? 0) / 60;
            } else {
                // No rate available, use total duration
                return $dependencySchedule->scheduledEnd;
            }
        } elseif ($cycleTimeMinutes > 0) {
            // Use route step cycle time (time per unit)
            $unitsPerMinute = 1 / $cycleTimeMinutes;
        } else {
            return $dependencySchedule->scheduledEnd;
        }

        // Time to produce the required quantity = setup time + (quantity / rate)
        $minutesToProduceQuantity = $setupTimeMinutes + ($quantityAtPercentage / $unitsPerMinute);

        \Log::debug('Percentage calculation details', [
            'total_quantity' => $totalQuantity,
            'quantity_at_percentage' => $quantityAtPercentage,
            'percentage' => $percentage,
            'units_per_minute' => $unitsPerMinute,
            'setup_time' => $setupTime,
            'minutes_to_produce' => $minutesToProduceQuantity,
            'dependency_start' => $dependencySchedule->scheduledStart,
        ]);

        return Carbon::instance($dependencySchedule->scheduledStart)
            ->addMinutes($minutesToProduceQuantity)
            ->toDateTime();
    }

    /**
     * Calculate start time based on child order dependencies.
     */
    protected function calculateChildOrderDependencyStart(
        ManufacturingStep $step,
        array $scheduledSteps
    ): ?DateTime {
        if ($step->child_order_dependency_type === 'none') {
            return null;
        }

        $order = $step->manufacturingRoute->manufacturingOrder ?? null;
        if (! $order || $order->children->isEmpty()) {
            return null;
        }

        // Find latest end time of all child order steps
        $latestChildEnd = null;

        foreach ($order->children as $childOrder) {
            if (! $childOrder->manufacturingRoute) {
                continue;
            }

            foreach ($childOrder->manufacturingRoute->steps as $childStep) {
                if (isset($scheduledSteps[$childStep->id])) {
                    $childEnd = $scheduledSteps[$childStep->id]->scheduledEnd;
                    if (! $latestChildEnd || Carbon::instance($childEnd)->gt($latestChildEnd)) {
                        $latestChildEnd = $childEnd;
                    }
                }
            }
        }

        return $latestChildEnd;
    }

    /**
     * Check if a family can be scheduled without conflicts.
     */
    public function canScheduleFamily(
        Collection $familyMembers,
        DateTime $startDate,
        array $existingSchedules = []
    ): bool {
        try {
            $result = $this->reserveFamilyCapacity($familyMembers, $startDate, $existingSchedules);

            return $result !== null;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get capacity requirements for a family.
     */
    public function getFamilyCapacityRequirements(Collection $familyMembers): array
    {
        $requirements = [];

        foreach ($familyMembers as $order) {
            if (! $order->manufacturingRoute) {
                continue;
            }

            foreach ($order->manufacturingRoute->steps as $step) {
                if (! $step->work_cell_id) {
                    continue;
                }

                if (! isset($requirements[$step->work_cell_id])) {
                    $requirements[$step->work_cell_id] = [
                        'work_cell' => $step->workCell,
                        'total_minutes' => 0,
                        'step_count' => 0,
                        'orders' => [],
                    ];
                }

                $duration = $this->calculateStepDuration($step);
                $requirements[$step->work_cell_id]['total_minutes'] += $duration;
                $requirements[$step->work_cell_id]['step_count']++;
                $requirements[$step->work_cell_id]['orders'][] = $order->order_number;
            }
        }

        return $requirements;
    }
}

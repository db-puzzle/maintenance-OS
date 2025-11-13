<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingStep;
use App\Models\Production\ProductionSchedule;
use App\Services\Scheduling\Exceptions\SchedulingValidationException;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

abstract class BaseScheduler
{
    protected CapacityChecker $capacityChecker;
    protected DependencyValidator $dependencyValidator;
    protected ConflictDetector $conflictDetector;
    protected OrderFamilyService $familyService;
    protected FamilyCapacityBookingService $familyCapacityService;

    public function __construct(
        CapacityChecker $capacityChecker,
        DependencyValidator $dependencyValidator,
        ConflictDetector $conflictDetector,
        OrderFamilyService $familyService,
        FamilyCapacityBookingService $familyCapacityService
    ) {
        $this->capacityChecker = $capacityChecker;
        $this->dependencyValidator = $dependencyValidator;
        $this->conflictDetector = $conflictDetector;
        $this->familyService = $familyService;
        $this->familyCapacityService = $familyCapacityService;
    }

    /**
     * Schedule manufacturing orders.
     */
    abstract public function schedule(SchedulingRequest $request): SchedulingResult;

    /**
     * Process orders by families for HDG scheduling.
     */
    protected function scheduleByFamilies(
        Collection $orders,
        SchedulingRequest $request
    ): SchedulingResult {
        $result = new SchedulingResult;
        $scheduledSteps = [];
        $totalSteps = 0;
        $processedSteps = 0;
        $nextFamilyStart = $request->scheduleStartDate ?? now();

        Log::info('BaseScheduler::scheduleByFamilies - Start', [
            'order_count' => $orders->count(),
            'start_date' => $nextFamilyStart instanceof Carbon ? $nextFamilyStart->format('Y-m-d H:i:s') : $nextFamilyStart,
        ]);

        try {
            // Group orders by families
            $families = $this->familyService->groupOrdersByFamily($orders);

            Log::info('BaseScheduler::scheduleByFamilies - Grouped into families', [
                'family_count' => $families->count(),
                'families' => $families->map(function ($family) {
                    return [
                        'top_parent' => $family['top_parent']->order_number,
                        'member_count' => $family['members']->count(),
                        'total_steps' => $family['total_steps'],
                        'priority' => $family['priority'],
                    ];
                })->toArray(),
            ]);

            // Count total steps across all families
            foreach ($families as $family) {
                $totalSteps += $family['total_steps'];
            }

            // Schedule each family
            foreach ($families as $familyIndex => $family) {
                $familyStartTime = microtime(true);

                $familyNumber = $familyIndex + 1;
                $this->reportProgress(
                    $processedSteps,
                    $totalSteps,
                    "Scheduling family {$family['top_parent']->order_number} ({$familyNumber} of {$families->count()})"
                );

                try {
                    // Validate and schedule the entire family
                    // Use the calculated start time for this family to ensure no overlap
                    $familySchedule = $this->familyCapacityService->reserveFamilyCapacity(
                        $family['members'],
                        $nextFamilyStart,
                        $scheduledSteps
                    );

                    if ($familySchedule === null) {
                        // Could not schedule this family
                        Log::warning('BaseScheduler::scheduleByFamilies - Family scheduling returned null', [
                            'family' => $family['top_parent']->order_number,
                            'family_members' => $family['members']->pluck('order_number')->toArray(),
                            'family_steps' => $family['total_steps'],
                        ]);

                        $result->alerts[] = [
                            'type' => 'family_scheduling_failed',
                            'severity' => 'error',
                            'message' => "Could not find capacity to schedule family {$family['top_parent']->order_number}",
                            'family' => $family['top_parent']->order_number,
                            'orders' => $family['members']->pluck('order_number')->toArray(),
                        ];

                        // Skip this family and continue with next
                        $processedSteps += $family['total_steps'];
                        continue;
                    }

                    // Merge family schedule into overall schedule
                    Log::info('BaseScheduler::scheduleByFamilies - Family scheduled successfully', [
                        'family' => $family['top_parent']->order_number,
                        'scheduled_steps_in_family' => count($familySchedule),
                        'total_scheduled_so_far' => count($scheduledSteps) + count($familySchedule),
                    ]);

                    $scheduledSteps = array_merge($scheduledSteps, $familySchedule);
                    $processedSteps += $family['total_steps'];

                    // Calculate the latest end time from this family for the next family's start
                    $latestEnd = null;
                    foreach ($familySchedule as $step) {
                        if ($latestEnd === null || Carbon::instance($step->scheduledEnd)->gt($latestEnd)) {
                            $latestEnd = Carbon::instance($step->scheduledEnd);
                        }
                    }

                    // Next family should start after this family completes
                    if ($latestEnd !== null) {
                        $nextFamilyStart = $latestEnd->toDateTime();
                    }
                } catch (SchedulingValidationException $e) {
                    // Production time validation failed
                    $result->alerts[] = [
                        'type' => 'validation_error',
                        'severity' => 'error',
                        'message' => $e->getMessage(),
                        'family' => $family['top_parent']->order_number,
                        'validation_errors' => $e->getValidationErrors(),
                    ];
                    $result->success = false;

                    return $result;
                } catch (\Exception $e) {
                    $result->alerts[] = [
                        'type' => 'family_error',
                        'severity' => 'error',
                        'message' => 'Error scheduling family: ' . $e->getMessage(),
                        'family' => $family['top_parent']->order_number,
                    ];

                    // Continue with next family
                    $processedSteps += $family['total_steps'];
                    continue;
                }

                $familyExecutionTime = microtime(true) - $familyStartTime;
                Log::info('Family scheduled', [
                    'family' => $family['top_parent']->order_number,
                    'orders' => $family['total_orders'],
                    'steps' => $family['total_steps'],
                    'execution_time' => $familyExecutionTime,
                ]);
            }

            // Log final results
            Log::info('BaseScheduler::scheduleByFamilies - Completed scheduling', [
                'total_scheduled_steps' => count($scheduledSteps),
                'families_processed' => $families->count(),
                'has_scheduled_steps' => ! empty($scheduledSteps),
            ]);

            $result->success = ! empty($scheduledSteps);
            $result->scheduledSteps = array_values($scheduledSteps);
            $result->metrics = $this->calculateMetrics($scheduledSteps);
            $result->metrics['families_processed'] = $families->count();
        } catch (\Exception $e) {
            $result->success = false;
            $result->alerts[] = [
                'type' => 'scheduler_error',
                'severity' => 'error',
                'message' => 'Scheduler error: ' . $e->getMessage(),
            ];
        }

        return $result;
    }

    /**
     * Count total steps in orders.
     */
    protected function countTotalSteps(Collection $orders): int
    {
        $count = 0;
        foreach ($orders as $order) {
            $count += $order->manufacturingRoute?->steps->count() ?? 0;
        }

        return $count;
    }

    /**
     * Check if a step is locked.
     */
    protected function isStepLocked(ManufacturingStep $step): bool
    {
        // Check if there's an existing locked schedule for this step
        $existingSchedule = ProductionSchedule::where('manufacturing_step_id', $step->id)
            ->where('is_locked', true)
            ->first();

        return $existingSchedule !== null;
    }

    /**
     * Get locked schedule data for a step.
     */
    protected function getLockedSchedule(ManufacturingStep $step): ?StepScheduleData
    {
        $existingSchedule = ProductionSchedule::where('manufacturing_step_id', $step->id)
            ->where('is_locked', true)
            ->first();

        if (! $existingSchedule) {
            return null;
        }

        $data = new StepScheduleData;
        $data->stepId = $step->id;
        $data->workCellId = $existingSchedule->work_cell_id;
        $data->scheduledStart = $existingSchedule->scheduled_start;
        $data->scheduledEnd = $existingSchedule->scheduled_end;
        $data->isLocked = true;

        return $data;
    }

    /**
     * Create alerts from conflicts.
     */
    protected function createAlerts(array $conflicts, ManufacturingStep $step): array
    {
        $alerts = [];

        foreach ($conflicts as $conflict) {
            $alerts[] = $this->conflictDetector->createAlert($conflict, $step);
        }

        return $alerts;
    }

    /**
     * Calculate metrics for the schedule.
     */
    protected function calculateMetrics(array $scheduledSteps): array
    {
        $metrics = [
            'total_steps' => count($scheduledSteps),
            'makespan_minutes' => 0,
            'conflicts' => 0,
            'utilization_by_workcell' => [],
        ];

        if (empty($scheduledSteps)) {
            return $metrics;
        }

        // Find earliest start and latest end
        $earliestStart = null;
        $latestEnd = null;

        foreach ($scheduledSteps as $schedule) {
            if (! $earliestStart || $schedule->scheduledStart < $earliestStart) {
                $earliestStart = $schedule->scheduledStart;
            }
            if (! $latestEnd || $schedule->scheduledEnd > $latestEnd) {
                $latestEnd = $schedule->scheduledEnd;
            }

            // Count conflicts
            if (! empty($schedule->conflicts)) {
                $metrics['conflicts'] += count($schedule->conflicts);
            }

            // Track utilization by work cell
            if (! isset($metrics['utilization_by_workcell'][$schedule->workCellId])) {
                $metrics['utilization_by_workcell'][$schedule->workCellId] = 0;
            }

            $step = ManufacturingStep::find($schedule->stepId);
            if ($step) {
                $metrics['utilization_by_workcell'][$schedule->workCellId] +=
                    $step->total_duration_minutes;
            }
        }

        // Calculate makespan
        if ($earliestStart && $latestEnd) {
            $metrics['makespan_minutes'] =
                $earliestStart->diff($latestEnd)->days * 24 * 60 +
                $earliestStart->diff($latestEnd)->h * 60 +
                $earliestStart->diff($latestEnd)->i;
        }

        return $metrics;
    }

    /**
     * Report progress during scheduling.
     */
    protected function reportProgress(
        int $current,
        int $total,
        string $message = ''
    ): void {
        $percentage = $total > 0 ? round(($current / $total) * 100, 2) : 0;

        Log::info("Scheduling progress: {$percentage}% - {$message}");

        // TODO: Broadcast progress event
        // This will be implemented when we create the broadcasting events
    }

    /**
     * Log scheduling performance.
     */
    protected function logPerformance(
        string $algorithm,
        int $orderCount,
        int $stepCount,
        float $executionTime
    ): void {
        Log::info('Scheduling completed', [
            'algorithm' => $algorithm,
            'orders' => $orderCount,
            'steps' => $stepCount,
            'execution_time' => $executionTime,
            'steps_per_second' => $executionTime > 0 ? $stepCount / $executionTime : 0,
        ]);
    }
}

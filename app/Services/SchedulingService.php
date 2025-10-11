<?php

namespace App\Services;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\ScheduleVersion;
use App\Services\Scheduling\ASAPScheduler;
use App\Services\Scheduling\BalancedLoadingScheduler;
use App\Services\Scheduling\BaseScheduler;
use App\Services\Scheduling\CapacityChecker;
use App\Services\Scheduling\ConflictDetector;
use App\Services\Scheduling\DependencyValidator;
use App\Services\Scheduling\DueDateBackwardScheduler;
use App\Services\Scheduling\FamilyCapacityBookingService;
use App\Services\Scheduling\OrderFamilyService;
use App\Services\Scheduling\SchedulingResult;
use App\Services\Scheduling\StepScheduleData;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SchedulingService
{
    protected CapacityChecker $capacityChecker;
    protected DependencyValidator $dependencyValidator;
    protected ConflictDetector $conflictDetector;
    protected OrderFamilyService $familyService;
    protected FamilyCapacityBookingService $familyCapacityService;

    public function __construct()
    {
        $this->familyService = new OrderFamilyService;
        $this->capacityChecker = new CapacityChecker;
        $this->dependencyValidator = new DependencyValidator($this->familyService);
        $this->conflictDetector = new ConflictDetector($this->familyService);
        $this->familyCapacityService = new FamilyCapacityBookingService(
            $this->capacityChecker,
            $this->familyService
        );
    }

    /**
     * Get the available scheduling algorithms.
     */
    public function getAvailableAlgorithms(): array
    {
        return [
            'asap' => 'ASAP (As Soon As Possible)',
            'due_date' => 'Due Date Backward Pass',
            'balanced' => 'Balanced Loading',
        ];
    }

    /**
     * Create a scheduling algorithm instance.
     */
    public function createAlgorithm(string $type): BaseScheduler
    {
        return match ($type) {
            'asap' => new ASAPScheduler(
                $this->capacityChecker,
                $this->dependencyValidator,
                $this->conflictDetector,
                $this->familyService,
                $this->familyCapacityService
            ),
            'due_date' => new DueDateBackwardScheduler(
                $this->capacityChecker,
                $this->dependencyValidator,
                $this->conflictDetector,
                $this->familyService,
                $this->familyCapacityService
            ),
            'balanced' => new BalancedLoadingScheduler(
                $this->capacityChecker,
                $this->dependencyValidator,
                $this->conflictDetector,
                $this->familyService,
                $this->familyCapacityService
            ),
            default => throw new \InvalidArgumentException("Unknown algorithm type: {$type}"),
        };
    }

    /**
     * Clear existing schedules for a version.
     */
    public function clearSchedules(ScheduleVersion $version): void
    {
        DB::transaction(function () use ($version) {
            // Delete all schedules for this version
            $version->productionSchedules()->delete();

            // Delete all alerts for this version
            $version->alerts()->delete();

            // Reset scheduling status
            $version->update([
                'scheduling_status' => 'idle',
                'scheduling_error' => null,
            ]);
        });
    }

    /**
     * Save scheduling results.
     */
    public function saveSchedulingResults(
        ScheduleVersion $version,
        SchedulingResult $result
    ): void {
        DB::transaction(function () use ($version, $result) {
            // Clear existing schedules and alerts
            $version->productionSchedules()->delete();
            $version->alerts()->delete();

            // Save new schedules
            foreach ($result->scheduledSteps as $stepData) {
                ProductionSchedule::create([
                    'manufacturing_step_id' => $stepData->stepId,
                    'scheduled_start' => $stepData->scheduledStart,
                    'scheduled_end' => $stepData->scheduledEnd,
                    'work_cell_id' => $stepData->workCellId,
                    'is_locked' => $stepData->isLocked,
                    'schedule_version_id' => $version->id,
                    'conflicts' => $stepData->conflicts,
                ]);
            }

            // Save alerts
            foreach ($result->alerts as $alert) {
                // Alert is already an array from ConflictDetector::createAlert()
                $alert['schedule_version_id'] = $version->id;
                $version->alerts()->create($alert);
            }

            // Update version with metrics
            $version->markSchedulingCompleted(
                $result->metrics,
                $result->executionTime
            );
        });
    }

    /**
     * Get orders that need scheduling.
     */
    public function getOrdersForScheduling(
        array $filters = [],
        ?array $orderIds = null
    ): Collection {
        $query = ManufacturingOrder::with([
            'manufacturingRoute.steps.workCell',
            'manufacturingRoute.steps.dependency',
            'manufacturingRoute.steps.manufacturingRoute.manufacturingOrder',
            'item',
            'children',
        ])
            ->whereIn('status', ['planned', 'released'])
            ->whereHas('manufacturingRoute')
            ->whereHas('manufacturingRoute.steps');

        if ($orderIds !== null) {
            $query->whereIn('id', $orderIds);
        }

        if (! empty($filters['plant_id'])) {
            $query->whereHas('manufacturingRoute.steps.workCell', function ($q) use ($filters) {
                $q->where('plant_id', $filters['plant_id']);
            });
        }

        if (! empty($filters['area_id'])) {
            $query->whereHas('manufacturingRoute.steps.workCell', function ($q) use ($filters) {
                $q->where('area_id', $filters['area_id']);
            });
        }

        // Optional date filtering - if requested_date is null, include the order
        if (! empty($filters['start_date']) && ! empty($filters['end_date'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereNull('requested_date')
                    ->orWhereBetween('requested_date', [$filters['start_date'], $filters['end_date']]);
            });
        } elseif (! empty($filters['start_date'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereNull('requested_date')
                    ->orWhere('requested_date', '>=', $filters['start_date']);
            });
        } elseif (! empty($filters['end_date'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereNull('requested_date')
                    ->orWhere('requested_date', '<=', $filters['end_date']);
            });
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('item', function ($q2) use ($search) {
                        $q2->where('name', 'like', "%{$search}%")
                            ->orWhere('item_code', 'like', "%{$search}%");
                    });
            });
        }

        return $query->orderBy('priority', 'desc')
            ->orderBy('requested_date')
            ->get();
    }

    /**
     * Calculate scheduling metrics.
     */
    public function calculateMetrics(
        Collection $schedules,
        Collection $orders
    ): array {
        $metrics = [
            'total_orders' => $orders->count(),
            'total_steps' => 0,
            'scheduled_steps' => $schedules->count(),
            'makespan_minutes' => 0,
            'average_utilization' => 0,
            'late_orders' => 0,
            'conflict_count' => 0,
        ];

        // Count total steps
        foreach ($orders as $order) {
            $metrics['total_steps'] += $order->manufacturingRoute?->steps->count() ?? 0;
        }

        if ($schedules->isEmpty()) {
            return $metrics;
        }

        // Calculate makespan
        $earliestStart = $schedules->min('scheduled_start');
        $latestEnd = $schedules->max('scheduled_end');
        if ($earliestStart && $latestEnd) {
            $metrics['makespan_minutes'] = Carbon::parse($earliestStart)
                ->diffInMinutes(Carbon::parse($latestEnd));
        }

        // Count conflicts
        $metrics['conflict_count'] = $schedules
            ->filter(fn ($schedule) => ! empty($schedule->conflicts))
            ->count();

        // Calculate late orders
        $orderCompletions = [];
        foreach ($schedules as $schedule) {
            $orderId = $schedule->manufacturingStep
                ->manufacturingRoute
                ->manufacturing_order_id;

            if (! isset($orderCompletions[$orderId])) {
                $orderCompletions[$orderId] = $schedule->scheduled_end;
            } else {
                $orderCompletions[$orderId] = max(
                    $orderCompletions[$orderId],
                    $schedule->scheduled_end
                );
            }
        }

        foreach ($orders as $order) {
            if (isset($orderCompletions[$order->id])) {
                $completionDate = Carbon::parse($orderCompletions[$order->id]);
                if ($completionDate->isAfter($order->requested_date)) {
                    $metrics['late_orders']++;
                }
            }
        }

        return $metrics;
    }

    /**
     * Get active manufacturing orders for scheduling.
     * Alias for getOrdersForScheduling for backward compatibility.
     */
    public function getActiveManufacturingOrders(array $filters = []): Collection
    {
        return $this->getOrdersForScheduling($filters);
    }

    /**
     * Create a new schedule version.
     */
    public function createScheduleVersion($user): ScheduleVersion
    {
        return ScheduleVersion::create([
            'version_number' => ScheduleVersion::getNextVersionNumber(),
            'status' => 'draft',
            'created_by' => $user->id,
        ]);
    }

    /**
     * Reschedule a single step.
     */
    public function rescheduleStep(
        ProductionSchedule $schedule,
        Carbon $newStart,
        Carbon $newEnd,
        $user
    ): bool {
        // Check if the new time slot is available
        $isAvailable = $this->capacityChecker->isAvailable(
            $schedule->workCell,
            $newStart->toDateTime(),
            $newEnd->toDateTime(),
            $schedule->id
        );

        if (! $isAvailable) {
            return false;
        }

        // Check if dependencies are still satisfied
        if (! $this->dependencyValidator->canReschedule(
            $schedule->manufacturingStep,
            $newStart->toDateTime(),
            $newEnd->toDateTime(),
            $this->getScheduledStepsArray($schedule->scheduleVersion)
        )) {
            return false;
        }

        // Update the schedule
        $schedule->update([
            'scheduled_start' => $newStart,
            'scheduled_end' => $newEnd,
        ]);

        return true;
    }

    /**
     * Validate an entire schedule version.
     */
    public function validateSchedule(ScheduleVersion $version): void
    {
        // Clear existing alerts
        $version->alerts()->delete();

        $schedules = $version->productionSchedules()
            ->with('manufacturingStep.manufacturingRoute.manufacturingOrder')
            ->get();

        $scheduledSteps = $this->getScheduledStepsArray($version);
        $alerts = [];

        foreach ($schedules as $schedule) {
            $stepData = new StepScheduleData;
            $stepData->stepId = $schedule->manufacturing_step_id;
            $stepData->workCellId = $schedule->work_cell_id;
            $stepData->scheduledStart = $schedule->scheduled_start;
            $stepData->scheduledEnd = $schedule->scheduled_end;

            // Check for conflicts
            $conflicts = $this->conflictDetector->detectConflicts($stepData, $scheduledSteps);

            foreach ($conflicts as $conflict) {
                $alert = $this->conflictDetector->createAlert(
                    $conflict,
                    $schedule->manufacturingStep
                );
                $alerts[] = $alert;
            }

            // Check for late delivery
            $order = $schedule->manufacturingStep->manufacturingRoute->manufacturingOrder;
            if ($order->requested_date &&
                $schedule->manufacturingStep->display_order ===
                $schedule->manufacturingStep->manufacturingRoute->steps->count()) {
                $deliveryConflict = $this->conflictDetector->checkDeliveryConflict(
                    $order,
                    $schedule->scheduled_end
                );

                if ($deliveryConflict) {
                    $alert = $this->conflictDetector->createAlert(
                        $deliveryConflict,
                        $schedule->manufacturingStep,
                        'late_delivery'
                    );
                    $alerts[] = $alert;
                }
            }
        }

        // Save alerts
        foreach ($alerts as $alert) {
            $version->alerts()->create($alert->toArray());
        }
    }

    /**
     * Get scheduled steps as array format for validators.
     */
    private function getScheduledStepsArray(ScheduleVersion $version): array
    {
        $scheduledSteps = [];
        $schedules = $version->productionSchedules()->get();

        foreach ($schedules as $schedule) {
            $stepData = new StepScheduleData;
            $stepData->stepId = $schedule->manufacturing_step_id;
            $stepData->workCellId = $schedule->work_cell_id;
            $stepData->scheduledStart = $schedule->scheduled_start;
            $stepData->scheduledEnd = $schedule->scheduled_end;
            $stepData->isLocked = $schedule->is_locked;

            $scheduledSteps[$schedule->manufacturing_step_id] = $stepData;
        }

        return $scheduledSteps;
    }
}

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
            'manufacturingRoute' => function ($q) {
                $q->with(['steps' => function ($sq) {
                    $sq->with(['workCell', 'dependency']);
                }]);
            },
            'item',
            'children',
            'parent',
        ])
            ->whereIn('status', ['planned', 'released']);

        // Remove the route filter to show all orders
        // $query->whereHas('manufacturingRoute')
        //     ->whereHas('manufacturingRoute.steps');

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
     * Validate orders for scheduling.
     */
    public function validateOrdersForScheduling(
        Collection $orders,
        bool $checkDependencies = true,
        bool $checkTimeParameters = true
    ): array {
        $validationResult = [
            'valid' => true,
            'errors' => [],
            'warnings' => [],
        ];

        // Check time parameters if requested
        if ($checkTimeParameters) {
            foreach ($orders as $order) {
                if (! $order->manufacturingRoute) {
                    $validationResult['errors'][] = [
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'issue' => 'missing_route',
                        'message' => "Order {$order->order_number} has no manufacturing route defined",
                    ];
                    $validationResult['valid'] = false;
                    continue;
                }

                foreach ($order->manufacturingRoute->steps as $step) {
                    // Check if step has time parameters
                    $hasRouteTime = $step->setup_time_minutes !== null && $step->cycle_time_minutes !== null;
                    $hasCellCapacity = false;

                    if ($step->workCell && ! $hasRouteTime) {
                        // Check if work cell has capacity settings for this item
                        $itemRate = $step->workCell->itemRates()
                            ->where('item_id', $order->item_id)
                            ->first();
                        $hasCellCapacity = $itemRate && $itemRate->units_per_hour > 0;
                    }

                    if (! $hasRouteTime && ! $hasCellCapacity) {
                        $validationResult['errors'][] = [
                            'step_id' => $step->id,
                            'order_number' => $order->order_number,
                            'step_name' => $step->name,
                            'issue' => 'missing_time_parameters',
                            'message' => "Step '{$step->name}' in order {$order->order_number} has no time parameters",
                            'editLinks' => [
                                'edit_step' => route('production.routes.steps.edit', $step->id),
                                'edit_work_cell' => $step->workCell ? route('production.work-cells.edit', $step->workCell->id) : null,
                            ],
                        ];
                        $validationResult['valid'] = false;
                    }
                }
            }
        }

        // Check dependencies if requested
        if ($checkDependencies) {
            // Group orders by family
            $families = $this->familyService->groupOrdersByFamily($orders);

            foreach ($families as $family) {
                // Check for cross-family dependencies
                $dependencyErrors = $this->familyService->validateFamilyDependencies($family['members']);

                foreach ($dependencyErrors as $error) {
                    $validationResult['errors'][] = [
                        'type' => 'cross_family_dependency',
                        'message' => $error,
                        'family' => $family['top_parent']->order_number,
                    ];
                    $validationResult['valid'] = false;
                }

                // Check gate configurations
                foreach ($family['members'] as $order) {
                    if (! $order->manufacturingRoute) {
                        continue;
                    }

                    foreach ($order->manufacturingRoute->steps as $step) {
                        if ($step->depends_on_step_id) {
                            // Validate gate configuration
                            if (! in_array($step->dependency_start_condition, ['immediate', 'quantity_based', 'percentage_based', 'completed'])) {
                                $validationResult['warnings'][] = [
                                    'step_id' => $step->id,
                                    'message' => "Step '{$step->name}' has invalid gate configuration, defaulting to 'completed'",
                                ];
                            }

                            if ($step->dependency_start_condition === 'quantity_based' && ! $step->dependency_minimum_quantity) {
                                $validationResult['warnings'][] = [
                                    'step_id' => $step->id,
                                    'message' => "Step '{$step->name}' has quantity-based gate but no minimum quantity set",
                                ];
                            }

                            if ($step->dependency_start_condition === 'percentage_based' && ! $step->dependency_minimum_percentage) {
                                $validationResult['warnings'][] = [
                                    'step_id' => $step->id,
                                    'message' => "Step '{$step->name}' has percentage-based gate but no minimum percentage set",
                                ];
                            }
                        }
                    }
                }
            }
        }

        return $validationResult;
    }

    /**
     * Calculate metrics for a completed schedule.
     */
    public function calculateScheduleMetrics(ScheduleVersion $version): array
    {
        $schedules = $version->productionSchedules;

        if ($schedules->isEmpty()) {
            return [
                'total_steps' => 0,
                'families_processed' => 0,
                'average_utilization' => 0,
                'makespan' => 0,
                'on_time_rate' => 0,
            ];
        }

        // Get unique order IDs
        $orderIds = $schedules->pluck('manufacturingStep.manufacturingRoute.manufacturing_order_id')->unique();
        $orders = ManufacturingOrder::whereIn('id', $orderIds)->get();

        // Count families
        $families = $this->familyService->groupOrdersByFamily($orders);

        // Calculate makespan
        $start = Carbon::parse($schedules->min('scheduled_start'));
        $end = Carbon::parse($schedules->max('scheduled_end'));
        $makespan = $end->diffInMinutes($start);

        // Calculate utilization by work cell
        $workCellUtilizations = [];
        foreach ($schedules->groupBy('work_cell_id') as $workCellId => $cellSchedules) {
            $totalScheduledMinutes = $cellSchedules->sum(function ($schedule) {
                $start = Carbon::parse($schedule->scheduled_start);
                $end = Carbon::parse($schedule->scheduled_end);

                return $end->diffInMinutes($start);
            });

            $workCellUtilizations[] = $makespan > 0 ? ($totalScheduledMinutes / $makespan) * 100 : 0;
        }

        // Calculate on-time rate
        $onTimeCount = 0;
        foreach ($orders as $order) {
            if ($order->requested_date) {
                $orderSchedules = $schedules->filter(function ($schedule) use ($order) {
                    return $schedule->manufacturingStep->manufacturingRoute->manufacturing_order_id === $order->id;
                });

                if ($orderSchedules->isNotEmpty()) {
                    $orderEnd = Carbon::parse($orderSchedules->max('scheduled_end'));
                    $requestedDate = Carbon::parse($order->requested_date);

                    if ($orderEnd->lte($requestedDate)) {
                        $onTimeCount++;
                    }
                }
            }
        }

        $onTimeRate = $orders->count() > 0 ? ($onTimeCount / $orders->count()) * 100 : 0;

        return [
            'total_steps' => $schedules->count(),
            'families_processed' => $families->count(),
            'average_utilization' => ! empty($workCellUtilizations) ? round(array_sum($workCellUtilizations) / count($workCellUtilizations), 2) : 0,
            'makespan' => $makespan,
            'on_time_rate' => round($onTimeRate, 2),
        ];
    }

    /**
     * Get orders with detailed time parameter status.
     */
    public function getOrdersWithTimeParameterStatus($orders)
    {
        $result = [];

        foreach ($orders as $order) {
            $orderData = [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'item' => $order->item ? [
                    'id' => $order->item->id,
                    'item_number' => $order->item->item_number,
                    'name' => $order->item->name,
                    'primary_image_url' => $order->item->primary_image_url,
                    'primary_image_thumbnail_url' => $order->item->primary_image_thumbnail_url,
                    'media' => $order->item->media ? $order->item->media->map(function ($media) {
                        return [
                            'id' => $media->id,
                            'url' => $media->getUrl(),
                            'thumbnail_url' => $media->getUrl('thumb'),
                        ];
                    })->toArray() : [],
                ] : null,
                'quantity' => $order->quantity,
                'status' => $order->status,
                'parent_id' => $order->parent_id,
                'has_route' => $order->manufacturingRoute !== null,
                'time_parameter_status' => 'valid', // valid, partial, missing
                'steps' => [],
                'issues' => [],
                'children' => [], // Will be populated later
            ];

            if (! $order->manufacturingRoute) {
                $orderData['time_parameter_status'] = 'missing';
                $orderData['issues'][] = [
                    'type' => 'missing_route',
                    'message' => 'No manufacturing route defined',
                ];
            } else {
                $hasAllTimes = true;
                $hasAnyTimes = false;

                foreach ($order->manufacturingRoute->steps as $step) {
                    $stepData = [
                        'id' => $step->id,
                        'name' => $step->name,
                        'work_cell_id' => $step->work_cell_id,
                        'work_cell' => $step->workCell,
                        'has_step_time' => ($step->setup_time_minutes !== null && $step->cycle_time_minutes !== null),
                        'setup_time_minutes' => $step->setup_time_minutes,
                        'cycle_time_minutes' => $step->cycle_time_minutes,
                        'has_work_cell_rate' => false,
                        'work_cell_rate' => null,
                        'effective_time_source' => null, // 'step' or 'work_cell'
                        'effective_setup_time' => null,
                        'effective_cycle_time' => null,
                        'effective_total_time' => null,
                    ];

                    // Check for work cell item rate
                    if ($step->workCell) {
                        $itemRate = $step->workCell->itemRates->where('item_id', $order->item_id)->first();
                        if ($itemRate) {
                            $stepData['has_work_cell_rate'] = true;
                            $stepData['work_cell_rate'] = [
                                'id' => $itemRate->id,
                                'setup_time_minutes' => $itemRate->setup_time_minutes,
                                'production_rate_per_hour' => $itemRate->production_rate_per_hour,
                                'unit_of_measure' => $itemRate->unit_of_measure,
                                'cycle_time_minutes' => $itemRate->production_rate_per_hour > 0
                                    ? (60 / $itemRate->production_rate_per_hour)
                                    : null,
                            ];
                        }
                    }

                    // Determine effective time source
                    if ($stepData['has_step_time']) {
                        $stepData['effective_time_source'] = 'step';
                        $stepData['effective_setup_time'] = $step->setup_time_minutes;
                        $stepData['effective_cycle_time'] = $step->cycle_time_minutes;
                        $hasAnyTimes = true;
                    } elseif ($stepData['has_work_cell_rate']) {
                        $stepData['effective_time_source'] = 'work_cell';
                        $stepData['effective_setup_time'] = $stepData['work_cell_rate']['setup_time_minutes'];
                        $stepData['effective_cycle_time'] = $stepData['work_cell_rate']['cycle_time_minutes'];
                        $hasAnyTimes = true;
                    } else {
                        $hasAllTimes = false;
                        $orderData['issues'][] = [
                            'type' => 'missing_time',
                            'step_id' => $step->id,
                            'step_name' => $step->name,
                            'message' => "Step '{$step->name}' has no time parameters configured",
                        ];
                    }

                    // Calculate total time for the order quantity
                    if ($stepData['effective_setup_time'] !== null && $stepData['effective_cycle_time'] !== null) {
                        $stepData['effective_total_time'] = $stepData['effective_setup_time'] +
                            ($stepData['effective_cycle_time'] * $order->quantity);
                    }

                    $orderData['steps'][] = $stepData;
                }

                if (! $hasAllTimes) {
                    $orderData['time_parameter_status'] = $hasAnyTimes ? 'partial' : 'missing';
                }
            }

            $result[] = $orderData;
        }

        // Build hierarchical structure
        $hierarchicalResult = $this->buildHierarchicalStructure($result);

        return $hierarchicalResult;
    }

    /**
     * Build hierarchical structure from flat order list.
     */
    private function buildHierarchicalStructure($orders)
    {
        $orderMap = [];
        $rootOrders = [];

        // First pass: create a map of all orders by ID
        foreach ($orders as $order) {
            $orderMap[$order['id']] = $order;
        }

        // Second pass: build parent-child relationships
        foreach ($orders as $order) {
            if ($order['parent_id'] && isset($orderMap[$order['parent_id']])) {
                // Add as child to parent
                $orderMap[$order['parent_id']]['children'][] = &$orderMap[$order['id']];
            } else {
                // No parent or parent not in list, add to root
                $rootOrders[] = &$orderMap[$order['id']];
            }
        }

        return $rootOrders;
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

<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Jobs\Production\ScheduleProductionJob;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\ScheduleVersion;
use App\Models\Production\WorkCell;
use App\Services\ScheduleAlertService;
use App\Services\Scheduling\OrderFamilyService;
use App\Services\Scheduling\SchedulingRequest;
use App\Services\SchedulingService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SchedulingController extends Controller
{
    protected SchedulingService $schedulingService;
    protected ScheduleAlertService $alertService;
    protected OrderFamilyService $familyService;

    public function __construct(
        SchedulingService $schedulingService,
        ScheduleAlertService $alertService,
        OrderFamilyService $familyService
    ) {
        $this->schedulingService = $schedulingService;
        $this->alertService = $alertService;
        $this->familyService = $familyService;
    }

    /**
     * Display the scheduling interface v2 (Bryntum-style).
     */
    public function indexV2(Request $request)
    {
        // Use the same logic as index but return a different view
        return $this->prepareSchedulerData($request, 'production/scheduler/index');
    }

    /**
     * Display the scheduler setup page.
     */
    public function setup(Request $request)
    {
        $this->authorize('viewAny', ScheduleVersion::class);

        // Get current or create new draft version
        $currentVersion = ScheduleVersion::draft()
            ->latest()
            ->first();

        if (! $currentVersion) {
            $currentVersion = $this->schedulingService->createScheduleVersion($request->user());
        }

        // Get published version
        $publishedVersion = ScheduleVersion::published()
            ->latest()
            ->first();

        // Remove balanced loading from algorithms
        $algorithms = $this->schedulingService->getAvailableAlgorithms();
        unset($algorithms['balanced']);

        // Transform algorithms to array format for the UI
        $algorithmsArray = [];
        foreach ($algorithms as $key => $label) {
            $algorithmsArray[] = ['value' => $key, 'label' => $label];
        }

        // Get active orders
        $filters = $request->only(['plant_id', 'area_id', 'start_date', 'end_date', 'search']);
        $filters['start_date'] = $filters['start_date'] ?? now()->format('Y-m-d');
        $filters['end_date'] = $filters['end_date'] ?? now()->addMonths(3)->format('Y-m-d');

        $orders = $this->schedulingService->getActiveManufacturingOrders($filters);

        // Map orders for Inertia response
        $mappedOrders = $orders->map(function ($order) {
            $routeData = null;
            if ($order->manufacturingRoute) {
                $routeData = [
                    'id' => $order->manufacturingRoute->id,
                    'name' => $order->manufacturingRoute->name,
                    'steps' => $order->manufacturingRoute->steps->map(function ($step) {
                        return [
                            'id' => $step->id,
                            'name' => $step->name,
                            'sequence_number' => $step->sequence_number,
                            'work_cell_id' => $step->work_cell_id,
                        ];
                    })->toArray(),
                ];
            }

            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'priority' => $order->priority,
                'quantity' => $order->quantity,
                'due_date' => $order->due_date?->format('Y-m-d'),
                'release_date' => $order->release_date?->format('Y-m-d'),
                'requested_date' => $order->requested_date,
                'parent_id' => $order->parent_id,
                'item' => $order->item ? [
                    'id' => $order->item->id,
                    'name' => $order->item->name,
                    'code' => $order->item->code,
                    'description' => $order->item->description,
                ] : null,
                'manufacturingRoute' => $routeData,
                'has_time_parameters' => $order->manufacturingRoute?->steps()
                    ->where(function ($query) {
                        $query->whereNotNull('setup_time_minutes')
                            ->orWhereNotNull('cycle_time_minutes');
                    })
                    ->exists() ?? false,
            ];
        })->values();

        // Get work cells
        $workCells = WorkCell::with(['area', 'plant'])
            ->get()
            ->map(function ($cell) {
                return [
                    'id' => $cell->id,
                    'name' => $cell->name,
                    'code' => $cell->code ?? $cell->name,
                    'work_center_area_id' => $cell->area_id,
                ];
            });

        return Inertia::render('production/scheduler/setup', [
            'currentVersion' => $currentVersion,
            'publishedVersion' => $publishedVersion,
            'orders' => $mappedOrders,
            'workCells' => $workCells,
            'filters' => $filters,
            'algorithms' => $algorithmsArray,
            'defaultStartDate' => $filters['start_date'],
            'activeScheduleVersion' => $currentVersion,
        ]);
    }

    /**
     * Display the HDG scheduling interface.
     *
     * @deprecated This method is no longer used. The route now redirects to indexV2.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ScheduleVersion::class);

        // Get current or create new draft version
        $currentVersion = ScheduleVersion::draft()
            ->latest()
            ->first();

        if (! $currentVersion) {
            $currentVersion = $this->schedulingService->createScheduleVersion($request->user());
        }

        // Remove balanced loading from algorithms
        $algorithms = $this->schedulingService->getAvailableAlgorithms();
        unset($algorithms['balanced']);

        // Transform algorithms to array format for the UI
        $algorithmsArray = [];
        foreach ($algorithms as $key => $label) {
            $algorithmsArray[] = ['value' => $key, 'label' => $label];
        }

        // Get active orders
        $orders = $this->schedulingService->getActiveManufacturingOrders([
            'start_date' => now()->format('Y-m-d'),
            'end_date' => now()->addMonths(3)->format('Y-m-d'),
        ]);

        // Map orders for Inertia response
        $mappedOrders = $orders->map(function ($order) {
            $routeData = null;
            if ($order->manufacturingRoute) {
                $routeData = [
                    'id' => $order->manufacturingRoute->id,
                    'name' => $order->manufacturingRoute->name,
                    'steps' => $order->manufacturingRoute->steps->map(function ($step) {
                        return [
                            'id' => $step->id,
                            'name' => $step->name,
                            'sequence_number' => $step->sequence_number,
                            'work_cell_id' => $step->work_cell_id,
                        ];
                    })->toArray(),
                ];
            }

            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'priority' => $order->priority,
                'quantity' => $order->quantity,
                'requested_date' => $order->requested_date,
                'parent_id' => $order->parent_id,
                'item' => $order->item,
                'manufacturingRoute' => $routeData,
            ];
        });

        return Inertia::render('production/scheduler/index', [
            'algorithms' => $algorithmsArray,
            'defaultStartDate' => now()->format('Y-m-d'),
            'activeScheduleVersion' => $currentVersion,
            'currentVersion' => $currentVersion,
            'orders' => $mappedOrders,
            'workCells' => WorkCell::all(),
            'filters' => [
                'start_date' => now()->format('Y-m-d'),
                'end_date' => now()->addMonths(3)->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * Prepare scheduler data for both v1 and v2 interfaces.
     */
    private function prepareSchedulerData(Request $request, string $viewName)
    {
        $this->authorize('viewAny', ScheduleVersion::class);

        // Get current or create new draft version
        $currentVersion = ScheduleVersion::draft()
            ->latest()
            ->first();

        if (! $currentVersion) {
            $currentVersion = $this->schedulingService->createScheduleVersion($request->user());
        }

        // Get published version for comparison
        $publishedVersion = ScheduleVersion::latestPublished();

        // Get filters
        $filters = $request->only(['plant_id', 'area_id', 'start_date', 'end_date', 'search']);

        // Set default date range
        if (empty($filters['start_date'])) {
            $filters['start_date'] = now()->format('Y-m-d');
        }
        if (empty($filters['end_date'])) {
            $filters['end_date'] = now()->addDays(365)->format('Y-m-d'); // Show 1 year ahead by default
        }

        // Get manufacturing orders (already returns a Collection)
        $orders = $this->schedulingService->getActiveManufacturingOrders($filters);

        // Get schedules for current version
        $schedules = $currentVersion->productionSchedules()
            ->with([
                'manufacturingStep.manufacturingRoute.manufacturingOrder.item',
                'manufacturingStep.dependency',
                'workCell',
                'lockedBy',
            ])
            ->get();

        // Get alerts
        $alerts = $this->alertService->getAlertsForVersion($currentVersion);
        $alertStats = $this->alertService->getAlertStatistics($currentVersion);

        // Get work cells for resource view
        $workCells = WorkCell::with(['area.sector.plant'])
            ->when(! empty($filters['plant_id']), function ($query) use ($filters) {
                $query->whereHas('area.sector.plant', function ($q) use ($filters) {
                    $q->where('id', $filters['plant_id']);
                });
            })
            ->when(! empty($filters['area_id']), function ($query) use ($filters) {
                $query->where('area_id', $filters['area_id']);
            })
            ->get();

        // Remove balanced loading from algorithms
        $algorithms = $this->schedulingService->getAvailableAlgorithms();
        unset($algorithms['balanced']);

        // Transform algorithms to array format for the UI
        $algorithmsArray = [];
        foreach ($algorithms as $key => $label) {
            $algorithmsArray[] = ['value' => $key, 'label' => $label];
        }

        // Map orders with manufacturing route details
        $mappedOrders = $orders->map(function ($order) {
            $routeData = null;
            if ($order->manufacturingRoute) {
                $routeData = [
                    'id' => $order->manufacturingRoute->id,
                    'name' => $order->manufacturingRoute->name,
                    'steps' => $order->manufacturingRoute->steps->map(function ($step) {
                        return [
                            'id' => $step->id,
                            'name' => $step->name,
                            'sequence_number' => $step->sequence_number,
                            'work_cell_id' => $step->work_cell_id,
                        ];
                    })->toArray(),
                ];
            }

            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'priority' => $order->priority,
                'quantity' => $order->quantity,
                'requested_date' => $order->requested_date,
                'parent_id' => $order->parent_id,
                'item' => $order->item,
                'manufacturingRoute' => $routeData,
            ];
        });

        return Inertia::render($viewName, [
            'currentVersion' => $currentVersion,
            'publishedVersion' => $publishedVersion,
            'orders' => $mappedOrders,
            'schedules' => $schedules,
            'alerts' => $alerts,
            'alertStats' => $alertStats,
            'workCells' => $workCells,
            'filters' => $filters,
            'schedulingAlgorithms' => $algorithms,
            'algorithms' => $algorithmsArray,
            'defaultStartDate' => now()->format('Y-m-d'),
            'activeScheduleVersion' => $currentVersion,
        ]);
    }

    /**
     * Run the scheduling algorithm.
     */
    public function runScheduler(Request $request)
    {
        \Log::info('SchedulingController::runScheduler - Start', [
            'request_data' => $request->all(),
            'user_id' => auth()->id(),
        ]);

        try {
            $request->validate([
                'version_id' => 'required|exists:schedule_versions,id',
                'algorithm' => 'required|in:asap,due_date',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'manufacturing_order_ids' => 'nullable|array',
                'manufacturing_order_ids.*' => 'exists:manufacturing_orders,id',
                'respect_locked_schedules' => 'boolean',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('SchedulingController::runScheduler - Validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all(),
            ]);
            throw $e;
        }

        $version = ScheduleVersion::findOrFail($request->version_id);
        \Log::info('SchedulingController::runScheduler - Found version', [
            'version_id' => $version->id,
            'version_number' => $version->version_number,
            'status' => $version->status,
            'scheduling_status' => $version->scheduling_status,
        ]);

        $this->authorize('runScheduling', $version);

        // Check if already scheduling
        if ($version->isScheduling()) {
            \Log::warning('SchedulingController::runScheduler - Version already scheduling', [
                'version_id' => $version->id,
                'scheduling_status' => $version->scheduling_status,
            ]);

            return back()->withErrors([
                'message' => 'A scheduling job is already running for this version',
            ]);
        }

        // Get orders to schedule
        $filters = [
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
        ];

        \Log::info('SchedulingController::runScheduler - Filters', [
            'filters' => $filters,
            'has_specific_order_ids' => ! empty($request->manufacturing_order_ids),
            'specific_order_ids' => $request->manufacturing_order_ids ?? [],
        ]);

        // If specific order IDs provided, use those; otherwise get all active orders
        if (! empty($request->manufacturing_order_ids)) {
            $orderIds = $request->manufacturing_order_ids;
            \Log::info('SchedulingController::runScheduler - Using specific order IDs', [
                'order_ids' => $orderIds,
                'count' => count($orderIds),
            ]);
        } else {
            $orders = $this->schedulingService->getOrdersForScheduling($filters);
            $orderIds = $orders->pluck('id')->toArray();
            \Log::info('SchedulingController::runScheduler - Got orders from service', [
                'order_count' => $orders->count(),
                'order_ids' => $orderIds,
            ]);
        }

        if (empty($orderIds)) {
            // Get more detailed info for debugging
            $totalOrders = ManufacturingOrder::whereIn('status', ['planned', 'released'])->count();
            $ordersWithRoutes = ManufacturingOrder::whereIn('status', ['planned', 'released'])
                ->whereHas('manufacturingRoute')
                ->whereHas('manufacturingRoute.steps')
                ->count();

            $message = 'No manufacturing orders found to schedule. ';
            if ($totalOrders === 0) {
                $message .= 'There are no orders in "Planned" or "Released" status.';
            } elseif ($ordersWithRoutes === 0) {
                $message .= 'Found ' . $totalOrders . ' orders but none have manufacturing routes with steps defined.';
            } else {
                $message .= 'Found ' . $ordersWithRoutes . ' orders with routes, but none match the selected date range (' . $request->start_date . ' to ' . $request->end_date . ').';
            }

            return back()->withErrors([
                'message' => $message,
            ]);
        }

        // Create scheduling request
        $schedulingRequest = new SchedulingRequest([
            'manufacturingOrderIds' => $orderIds,
            'algorithmType' => $request->algorithm,
            'scheduleVersionId' => $version->id,
            'scheduleStartDate' => $request->start_date,
            'scheduleEndDate' => $request->end_date,
        ]);

        \Log::info('SchedulingController::runScheduler - Created scheduling request', [
            'order_count' => count($orderIds),
            'algorithm' => $request->algorithm,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
        ]);

        // Generate a unique job ID for tracking
        $jobId = uniqid('scheduling_', true);

        // Mark version as queued with the job ID
        $version->update([
            'scheduling_status' => 'queued',
            'scheduling_job_id' => $jobId,
        ]);

        \Log::info('SchedulingController::runScheduler - Updated version status', [
            'version_id' => $version->id,
            'job_id' => $jobId,
            'scheduling_status' => 'queued',
        ]);

        // Create and dispatch the job with the job ID
        $job = new ScheduleProductionJob($schedulingRequest, $version, $jobId);
        dispatch($job)->onQueue('scheduling');

        \Log::info('SchedulingController::runScheduler - Job dispatched successfully', [
            'job_id' => $jobId,
            'version_id' => $version->id,
            'queue' => 'scheduling',
        ]);

        // Return the job data for the frontend to handle
        return back()->with('schedulingJob', [
            'job_id' => $jobId,
            'websocket_channel' => "scheduling.{$version->id}",
            'version_id' => $version->id,
            'message' => 'Scheduling job queued successfully',
        ]);
    }

    /**
     * Get scheduling progress/status.
     */
    public function getSchedulingProgress(ScheduleVersion $version)
    {
        $this->authorize('view', $version);

        $response = [
            'status' => $version->scheduling_status,
            'job_id' => $version->scheduling_job_id,
            'algorithm' => $version->last_algorithm_used,
            'last_scheduled_at' => $version->last_scheduled_at,
            'execution_time' => $version->algorithm_execution_time,
            'metrics' => $version->algorithm_metrics,
            'error' => $version->scheduling_error,
            'message' => null,
        ];

        // Add descriptive message based on status
        switch ($version->scheduling_status) {
            case 'queued':
                $response['message'] = 'Scheduling job is queued and will start soon...';
                break;
            case 'running':
                $response['message'] = 'Scheduling is in progress...';
                break;
            case 'completed':
                $response['message'] = 'Scheduling completed successfully!';
                break;
            case 'failed':
                // Enhance error message with more context
                if ($version->scheduling_error) {
                    // Check for specific error patterns
                    if (str_contains($version->scheduling_error, 'Missing production time parameters')) {
                        $response['message'] = 'Cannot schedule: Some manufacturing steps are missing time parameters. Please set up cycle times and setup times for all steps, or configure work cell production rates.';
                    } elseif (str_contains($version->scheduling_error, 'timeout')) {
                        $response['message'] = 'Scheduling took too long to complete. Try scheduling fewer orders or use a simpler algorithm.';
                    } elseif (str_contains($version->scheduling_error, 'memory')) {
                        $response['message'] = 'Not enough resources to complete scheduling. Try scheduling fewer orders.';
                    } else {
                        $response['message'] = $version->scheduling_error;
                    }
                } else {
                    $response['message'] = 'Scheduling failed. Please check the logs for more details.';
                }

                // If we have alerts, include the most recent critical ones
                $criticalAlerts = $version->alerts()
                    ->where('severity', 'error')
                    ->orderBy('created_at', 'desc')
                    ->limit(3)
                    ->get();

                if ($criticalAlerts->isNotEmpty()) {
                    $response['errorDetails'] = [
                        'message' => $response['message'],
                        'alerts' => $criticalAlerts->map(function ($alert) {
                            return [
                                'type' => $alert->type,
                                'message' => $alert->message,
                                'context' => $alert->context,
                            ];
                        })->toArray(),
                    ];
                }
                break;
        }

        return response()->json($response);
    }

    /**
     * Update a single schedule (drag and drop).
     */
    public function updateSchedule(Request $request, ProductionSchedule $schedule)
    {
        $this->authorize('update', $schedule);

        $request->validate([
            'scheduled_start' => 'required|date',
            'scheduled_end' => 'required|date|after:scheduled_start',
        ]);

        $success = $this->schedulingService->rescheduleStep(
            $schedule,
            \Carbon\Carbon::parse($request->scheduled_start),
            \Carbon\Carbon::parse($request->scheduled_end),
            $request->user()
        );

        if (! $success) {
            return response()->json([
                'message' => 'Time slot conflicts with another scheduled task',
            ], 422);
        }

        // Re-validate the schedule
        $this->schedulingService->validateSchedule($schedule->scheduleVersion);

        return response()->json([
            'schedule' => $schedule->fresh()->load([
                'manufacturingStep.manufacturingRoute.manufacturingOrder',
                'workCell',
                'lockedBy',
            ]),
            'message' => 'Schedule updated successfully',
        ]);
    }

    /**
     * Toggle lock status of a schedule.
     */
    public function toggleLock(Request $request, ProductionSchedule $schedule)
    {
        $this->authorize('toggleLock', $schedule);

        if ($schedule->is_locked) {
            $schedule->unlock();
            $message = 'Schedule unlocked';
        } else {
            $schedule->lock($request->user());
            $message = 'Schedule locked';
        }

        return response()->json([
            'schedule' => $schedule->fresh()->load('lockedBy'),
            'message' => $message,
        ]);
    }

    /**
     * Create a new schedule version.
     */
    public function createVersion(Request $request)
    {
        $this->authorize('create', ScheduleVersion::class);

        $version = $this->schedulingService->createScheduleVersion($request->user());

        // Determine which scheduler interface to redirect to based on the referrer
        $referrer = $request->headers->get('referer');
        $route = 'production.scheduler.index';

        if ($referrer && str_contains($referrer, 'scheduler/v2')) {
            $route = 'production.scheduler.index';
        }

        return redirect()->route($route)
            ->with('success', 'New schedule version created');
    }

    /**
     * Publish a schedule version.
     */
    public function publishVersion(Request $request, ScheduleVersion $version)
    {
        $this->authorize('publish', $version);

        // Check for critical alerts
        if ($this->alertService->hasCriticalAlerts($version)) {
            return response()->json([
                'message' => 'Cannot publish schedule with unresolved critical alerts',
            ], 422);
        }

        $version->publish($request->user());

        // Update manufacturing orders with new scheduled dates
        $schedules = $version->productionSchedules()
            ->with('manufacturingStep.manufacturingRoute.manufacturingOrder')
            ->get();

        foreach ($schedules->groupBy('manufacturingStep.manufacturingRoute.manufacturing_order_id') as $orderId => $orderSchedules) {
            $order = ManufacturingOrder::find($orderId);
            if ($order) {
                $order->update([
                    'planned_start_date' => $orderSchedules->min('scheduled_start'),
                    'planned_end_date' => $orderSchedules->max('scheduled_end'),
                    'status' => $order->status === 'draft' ? 'scheduled' : $order->status,
                ]);
            }
        }

        return response()->json([
            'version' => $version->fresh(),
            'message' => 'Schedule published successfully',
        ]);
    }

    /**
     * Get schedule alerts.
     */
    public function getAlerts(Request $request, ScheduleVersion $version)
    {
        $this->authorize('view', $version);

        $filters = $request->only(['type', 'severity', 'resolved']);
        $alerts = $this->alertService->getAlertsForVersion($version, $filters);

        // Group alerts by order or work cell if requested
        if ($request->group_by === 'order') {
            $alerts = $this->alertService->groupAlertsByOrder($alerts);
        } elseif ($request->group_by === 'work_cell') {
            $alerts = $this->alertService->groupAlertsByWorkCell($alerts);
        }

        return response()->json([
            'alerts' => $alerts,
            'stats' => $this->alertService->getAlertStatistics($version),
        ]);
    }

    /**
     * Resolve an alert.
     */
    public function resolveAlert(Request $request, ScheduleVersion $version, $alertId)
    {
        $this->authorize('update', $version);

        $alert = $version->alerts()->findOrFail($alertId);
        $this->alertService->resolveAlert($alert);

        return response()->json([
            'alert' => $alert->fresh(),
            'message' => 'Alert resolved',
        ]);
    }

    /**
     * Create a snapshot of the current schedule.
     */
    public function createSnapshot(Request $request, ScheduleVersion $version)
    {
        $this->authorize('createSnapshot', $version);

        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $snapshot = $version->createSnapshot($request->user(), $request->reason);

        return response()->json([
            'snapshot' => $snapshot,
            'message' => 'Snapshot created successfully',
        ]);
    }

    /**
     * Get snapshots for a version.
     */
    public function getSnapshots(ScheduleVersion $version)
    {
        $this->authorize('view', $version);

        $snapshots = $version->snapshots()
            ->with('createdBy')
            ->latest()
            ->get();

        return response()->json([
            'snapshots' => $snapshots,
        ]);
    }

    /**
     * Restore from a snapshot.
     */
    public function restoreSnapshot(Request $request, ScheduleVersion $version, $snapshotId)
    {
        $this->authorize('restoreFromSnapshot', $version);

        $snapshot = $version->snapshots()->findOrFail($snapshotId);
        $newVersion = $snapshot->restore($request->user());

        return response()->json([
            'version' => $newVersion,
            'message' => 'Schedule restored from snapshot',
        ]);
    }

    /**
     * Validate orders for scheduling.
     */
    public function validateOrders(Request $request)
    {
        \Log::info('SchedulingController::validateOrders - Start', [
            'request_data' => $request->all(),
        ]);

        try {
            $validated = $request->validate([
                'manufacturing_order_ids' => 'required|array',
                'manufacturing_order_ids.*' => 'exists:manufacturing_orders,id',
                'check_dependencies' => 'boolean',
                'check_time_parameters' => 'boolean',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('SchedulingController::validateOrders - Validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all(),
            ]);
            throw $e;
        }

        \Log::info('SchedulingController::validateOrders - Validation passed', [
            'order_ids' => $validated['manufacturing_order_ids'],
            'order_count' => count($validated['manufacturing_order_ids']),
            'check_dependencies' => $validated['check_dependencies'] ?? true,
            'check_time_parameters' => $validated['check_time_parameters'] ?? true,
        ]);

        $orders = ManufacturingOrder::whereIn('id', $validated['manufacturing_order_ids'])
            ->with(['manufacturingRoute.steps.workCell', 'children', 'parent'])
            ->get();

        \Log::info('SchedulingController::validateOrders - Found orders', [
            'found_count' => $orders->count(),
            'orders' => $orders->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'has_route' => $order->manufacturingRoute !== null,
                    'step_count' => $order->manufacturingRoute ? $order->manufacturingRoute->steps->count() : 0,
                ];
            })->toArray(),
        ]);

        $validationResult = $this->schedulingService->validateOrdersForScheduling(
            $orders,
            $validated['check_dependencies'] ?? true,
            $validated['check_time_parameters'] ?? true
        );

        \Log::info('SchedulingController::validateOrders - Validation result', [
            'valid' => $validationResult['valid'],
            'issue_count' => count($validationResult['issues'] ?? []),
            'issues' => $validationResult['issues'] ?? [],
        ]);

        return back()->with([
            'validation' => $validationResult,
            'showValidationModal' => ! $validationResult['valid'],
        ]);
    }

    /**
     * Get family information for selected orders.
     */
    public function getFamilies(Request $request)
    {
        $orderIds = $request->input('order_ids', []);

        if (empty($orderIds)) {
            return response()->json(['families' => []]);
        }

        $orders = ManufacturingOrder::whereIn('id', $orderIds)
            ->with(['manufacturingRoute.steps', 'children', 'parent'])
            ->get();

        $families = $this->familyService->groupOrdersByFamily($orders);

        // Transform the families data for frontend consumption
        $transformedFamilies = $families->map(function ($family) {
            return [
                'top_parent' => [
                    'id' => $family['top_parent']->id,
                    'order_number' => $family['top_parent']->order_number,
                    'priority' => $family['priority'],
                ],
                'members' => $family['members']->map(function ($member) {
                    return [
                        'id' => $member->id,
                        'order_number' => $member->order_number,
                        'parent_id' => $member->parent_id,
                        'quantity' => $member->quantity,
                        'status' => $member->status,
                        'has_route' => $member->manufacturingRoute !== null,
                        'step_count' => $member->manufacturingRoute ? $member->manufacturingRoute->steps->count() : 0,
                    ];
                }),
                'total_steps' => $family['total_steps'],
                'total_orders' => $family['total_orders'],
                'priority' => $family['priority'],
                'has_dependencies' => $this->familyService->hasExternalDependencies($family['members']),
            ];
        });

        return response()->json(['families' => $transformedFamilies]);
    }

    /**
     * Get results for a completed schedule.
     */
    public function results($versionId)
    {
        $version = ScheduleVersion::with([
            'productionSchedules.manufacturingStep.manufacturingRoute.manufacturingOrder',
            'productionSchedules.workCell',
            'alerts',
        ])->findOrFail($versionId);

        $this->authorize('view', $version);

        // Calculate metrics if not already present
        $metrics = $version->algorithm_metrics ?? $this->schedulingService->calculateScheduleMetrics($version);

        // Group scheduled steps by family
        $families = $this->groupScheduledStepsByFamily($version);

        return Inertia::render('production/scheduler/results', [
            'version' => $version,
            'metrics' => $metrics,
            'families' => $families,
            'alerts' => $version->alerts,
        ]);
    }

    /**
     * Group scheduled steps by family for results display.
     */
    private function groupScheduledStepsByFamily(ScheduleVersion $version)
    {
        $schedules = $version->productionSchedules()
            ->with('manufacturingStep.manufacturingRoute.manufacturingOrder')
            ->get();

        $orderIds = $schedules->pluck('manufacturingStep.manufacturingRoute.manufacturing_order_id')->unique();
        $orders = ManufacturingOrder::whereIn('id', $orderIds)->get();

        $families = $this->familyService->groupOrdersByFamily($orders);

        return $families->map(function ($family) use ($schedules) {
            $familyOrderIds = $family['members']->pluck('id');
            $familySchedules = $schedules->filter(function ($schedule) use ($familyOrderIds) {
                return $familyOrderIds->contains($schedule->manufacturingStep->manufacturingRoute->manufacturing_order_id);
            });

            return [
                'top_parent' => $family['top_parent']->order_number,
                'priority' => $family['priority'],
                'orders' => $family['members']->map(function ($order) use ($familySchedules) {
                    $orderSchedules = $familySchedules->filter(function ($schedule) use ($order) {
                        return $schedule->manufacturingStep->manufacturingRoute->manufacturing_order_id === $order->id;
                    });

                    return [
                        'order_number' => $order->order_number,
                        'schedules' => $orderSchedules->map(function ($schedule) {
                            return [
                                'id' => $schedule->id,
                                'step_name' => $schedule->manufacturingStep->name,
                                'work_cell' => $schedule->workCell->name,
                                'scheduled_start' => $schedule->scheduled_start,
                                'scheduled_end' => $schedule->scheduled_end,
                                'is_locked' => $schedule->is_locked,
                                'conflicts' => $schedule->conflicts,
                            ];
                        }),
                    ];
                }),
                'metrics' => [
                    'start_date' => $familySchedules->min('scheduled_start'),
                    'end_date' => $familySchedules->max('scheduled_end'),
                    'total_duration' => $this->calculateFamilyDuration($familySchedules),
                    'utilization' => $this->calculateFamilyUtilization($familySchedules),
                ],
            ];
        });
    }

    /**
     * Calculate total duration for a family.
     */
    private function calculateFamilyDuration($schedules)
    {
        if ($schedules->isEmpty()) {
            return 0;
        }

        $start = \Carbon\Carbon::parse($schedules->min('scheduled_start'));
        $end = \Carbon\Carbon::parse($schedules->max('scheduled_end'));

        return $end->diffInMinutes($start);
    }

    /**
     * Calculate utilization percentage for a family.
     */
    private function calculateFamilyUtilization($schedules)
    {
        if ($schedules->isEmpty()) {
            return 0;
        }

        $totalScheduledMinutes = $schedules->sum(function ($schedule) {
            $start = \Carbon\Carbon::parse($schedule->scheduled_start);
            $end = \Carbon\Carbon::parse($schedule->scheduled_end);

            return $end->diffInMinutes($start);
        });

        $totalAvailableMinutes = $this->calculateFamilyDuration($schedules);

        return $totalAvailableMinutes > 0
            ? round(($totalScheduledMinutes / $totalAvailableMinutes) * 100, 2)
            : 0;
    }

    /**
     * Prepare scheduling page with time parameter validation.
     */
    public function prepareScheduling(Request $request)
    {
        $algorithms = [
            ['value' => 'asap', 'label' => 'ASAP (As Soon As Possible)'],
            ['value' => 'due_date', 'label' => 'Due Date (Backward Scheduling)'],
        ];

        // Get current or create new draft version
        $currentVersion = ScheduleVersion::draft()
            ->latest()
            ->first();

        if (! $currentVersion) {
            $currentVersion = $this->schedulingService->createScheduleVersion($request->user());
        }

        return Inertia::render('Production/Scheduler/Prepare', [
            'algorithms' => $algorithms,
            'currentVersion' => $currentVersion,
            'workCells' => WorkCell::with(['itemRates.item'])->get(),
            'defaultStartDate' => now()->format('Y-m-d'),
        ]);
    }

    /**
     * Validate time parameters for selected orders.
     */
    public function validateTimeParameters(Request $request)
    {
        $request->validate([
            'manufacturing_order_ids' => 'required|array',
            'manufacturing_order_ids.*' => 'exists:manufacturing_orders,id',
        ]);

        $orders = ManufacturingOrder::whereIn('id', $request->manufacturing_order_ids)
            ->with([
                'manufacturingRoute.steps.workCell.itemRates' => function ($query) use ($request) {
                    // Load item rates for the orders' items
                    $itemIds = ManufacturingOrder::whereIn('id', $request->manufacturing_order_ids)
                        ->pluck('item_id');
                    $query->whereIn('item_id', $itemIds);
                },
                'item.media',
                'parent',
                'children' => function ($query) use ($request) {
                    // Only load children that are also in the selected order list
                    $query->whereIn('id', $request->manufacturing_order_ids);
                },
            ])
            ->get();

        $timeParameterStatus = $this->schedulingService->getOrdersWithTimeParameterStatus($orders);

        return response()->json($timeParameterStatus);
    }

    /**
     * Update manufacturing step time parameters.
     */
    public function updateStepTime(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step->manufacturingRoute->manufacturingOrder);

        $validated = $request->validate([
            'setup_time_minutes' => 'required|integer|min:0',
            'cycle_time_minutes' => 'required|numeric|min:0',
        ]);

        $step->update($validated);

        return back()->with('success', 'Step time parameters updated successfully');
    }

    /**
     * Update or create work cell item rate.
     */
    public function updateWorkCellRate(Request $request, WorkCell $workCell)
    {
        $this->authorize('update', $workCell);

        $validated = $request->validate([
            'item_id' => 'required|exists:items,id',
            'setup_time_minutes' => 'required|integer|min:0',
            'production_rate_per_hour' => 'required|numeric|min:0.001',
            'unit_of_measure' => 'required|string|max:50',
            'notes' => 'nullable|string|max:500',
        ]);

        $workCell->itemRates()->updateOrCreate(
            ['item_id' => $validated['item_id']],
            $validated
        );

        return back()->with('success', 'Work cell production rate updated successfully');
    }
}

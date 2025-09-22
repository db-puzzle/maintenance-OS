<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Jobs\Production\ScheduleProductionJob;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\ScheduleVersion;
use App\Models\Production\WorkCell;
use App\Services\ScheduleAlertService;
use App\Services\Scheduling\SchedulingRequest;
use App\Services\SchedulingService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SchedulingController extends Controller
{
    protected SchedulingService $schedulingService;
    protected ScheduleAlertService $alertService;

    public function __construct(
        SchedulingService $schedulingService,
        ScheduleAlertService $alertService
    ) {
        $this->schedulingService = $schedulingService;
        $this->alertService = $alertService;
    }

    /**
     * Display the scheduling interface v2 (Bryntum-style).
     */
    public function indexV2(Request $request)
    {
        // Use the same logic as index but return a different view
        return $this->prepareSchedulerData($request, 'production/scheduler-v2/index');
    }

    /**
     * Display the scheduling interface.
     */
    public function index(Request $request)
    {
        return $this->prepareSchedulerData($request, 'production/scheduler/index');
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

        return Inertia::render($viewName, [
            'currentVersion' => $currentVersion,
            'publishedVersion' => $publishedVersion,
            'orders' => $orders,
            'schedules' => $schedules,
            'alerts' => $alerts,
            'alertStats' => $alertStats,
            'workCells' => $workCells,
            'filters' => $filters,
            'schedulingAlgorithms' => $this->schedulingService->getAvailableAlgorithms(),
        ]);
    }

    /**
     * Run the scheduling algorithm.
     */
    public function runScheduler(Request $request)
    {
        $request->validate([
            'version_id' => 'required|exists:schedule_versions,id',
            'algorithm' => 'required|in:asap,due_date,balanced',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'manufacturing_order_ids' => 'nullable|array',
            'manufacturing_order_ids.*' => 'exists:manufacturing_orders,id',
        ]);

        $version = ScheduleVersion::findOrFail($request->version_id);
        $this->authorize('runScheduling', $version);

        // Check if already scheduling
        if ($version->isScheduling()) {
            return back()->withErrors([
                'message' => 'A scheduling job is already running for this version',
            ]);
        }

        // Get orders to schedule
        $filters = [
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
        ];

        // If specific order IDs provided, use those; otherwise get all active orders
        if (! empty($request->manufacturing_order_ids)) {
            $orderIds = $request->manufacturing_order_ids;
        } else {
            $orders = $this->schedulingService->getOrdersForScheduling($filters);
            $orderIds = $orders->pluck('id')->toArray();
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

        // Generate a unique job ID for tracking
        $jobId = uniqid('scheduling_', true);

        // Mark version as queued with the job ID
        $version->update([
            'scheduling_status' => 'queued',
            'scheduling_job_id' => $jobId,
        ]);

        // Create and dispatch the job with the job ID
        $job = new ScheduleProductionJob($schedulingRequest, $version, $jobId);
        dispatch($job)->onQueue('scheduling');

        return back()->with('flash', [
            'data' => [
                'job_id' => $jobId,
                'message' => 'Scheduling job queued successfully',
                'channel' => "scheduling.{$version->id}",
            ],
        ]);
    }

    /**
     * Get scheduling progress/status.
     */
    public function getSchedulingProgress(ScheduleVersion $version)
    {
        $this->authorize('view', $version);

        return response()->json([
            'status' => $version->scheduling_status,
            'job_id' => $version->scheduling_job_id,
            'algorithm' => $version->last_algorithm_used,
            'last_scheduled_at' => $version->last_scheduled_at,
            'execution_time' => $version->algorithm_execution_time,
            'metrics' => $version->algorithm_metrics,
            'error' => $version->scheduling_error,
        ]);
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

        return response()->json([
            'version' => $version,
            'message' => 'New schedule version created',
        ]);
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
}

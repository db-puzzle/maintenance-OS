<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Jobs\Production\RunSchedulerJob;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\ScheduleAlert;
use App\Models\Production\ScheduleSnapshot;
use App\Models\Production\ScheduleVersion;
use App\Models\Production\WorkCell;
use App\Services\Production\SchedulingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SchedulerController extends Controller
{
    protected $schedulingService;

    public function __construct(SchedulingService $schedulingService)
    {
        $this->schedulingService = $schedulingService;
    }

    /**
     * Display the scheduler interface.
     */
    public function index()
    {
        $this->authorize('viewAny', ScheduleVersion::class);

        return Inertia::render('production/scheduler/index', [
            'can' => [
                'create' => auth()->user()->can('create', ScheduleVersion::class),
                'publish' => auth()->user()->can('publish', ScheduleVersion::class),
            ],
        ]);
    }

    /**
     * Get list of schedule versions.
     */
    public function versions(Request $request)
    {
        $this->authorize('viewAny', ScheduleVersion::class);

        $versions = ScheduleVersion::with(['creator', 'publisher'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($versions);
    }

    /**
     * Create a new schedule version.
     */
    public function createVersion(Request $request)
    {
        $this->authorize('create', ScheduleVersion::class);

        $validated = $request->validate([
            'copy_from_version_id' => 'nullable|exists:schedule_versions,id',
        ]);

        $version = DB::transaction(function () use ($validated) {
            $version = ScheduleVersion::create([
                'version_number' => ScheduleVersion::getNextVersionNumber(),
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);

            // If copying from another version, duplicate its schedules
            if (!empty($validated['copy_from_version_id'])) {
                $sourceVersion = ScheduleVersion::findOrFail($validated['copy_from_version_id']);
                $this->schedulingService->copySchedules($sourceVersion, $version);
            }

            return $version;
        });

        return response()->json([
            'version' => $version->load(['creator']),
            'message' => 'Schedule version created successfully',
        ]);
    }

    /**
     * Show a specific schedule version.
     */
    public function show(ScheduleVersion $version)
    {
        $this->authorize('view', $version);

        return response()->json([
            'version' => $version->load(['creator', 'publisher', 'alerts', 'snapshots']),
        ]);
    }

    /**
     * Delete a schedule version.
     */
    public function destroy(ScheduleVersion $version)
    {
        $this->authorize('delete', $version);

        if ($version->isPublished()) {
            return response()->json([
                'message' => 'Cannot delete a published schedule version',
            ], 422);
        }

        $version->delete();

        return response()->json([
            'message' => 'Schedule version deleted successfully',
        ]);
    }

    /**
     * Get schedule data for a version.
     */
    public function getScheduleData(ScheduleVersion $version, Request $request)
    {
        $this->authorize('view', $version);

        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'work_cells' => 'nullable|array',
            'work_cells.*' => 'exists:work_cells,id',
        ]);

        $schedules = $this->schedulingService->getScheduleData(
            $version,
            $validated['start_date'] ?? now()->startOfDay(),
            $validated['end_date'] ?? now()->addDays(30)->endOfDay(),
            $validated['work_cells'] ?? []
        );

        return response()->json($schedules);
    }

    /**
     * Get manufacturing orders for scheduling.
     */
    public function getManufacturingOrders(Request $request)
    {
        $this->authorize('viewAny', ManufacturingOrder::class);

        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'status' => 'nullable|array',
            'status.*' => 'in:planned,released,in_progress',
            'plant_id' => 'nullable|exists:plants,id',
            'area_id' => 'nullable|exists:areas,id',
            'limit' => 'nullable|integer|min:1|max:1000',
        ]);

        $orders = ManufacturingOrder::schedulable()
            ->with([
                'item',
                'manufacturingRoute.steps.workCell',
                'parent',
                'children',
            ])
            ->when($validated['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%")
                        ->orWhereHas('item', function ($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            })
            ->when($validated['status'] ?? null, function ($query, $statuses) {
                $query->whereIn('status', $statuses);
            })
            ->limit($validated['limit'] ?? 1000)
            ->get();

        return response()->json($orders);
    }

    /**
     * Get work cells.
     */
    public function getWorkCells(Request $request)
    {
        $this->authorize('viewAny', WorkCell::class);

        $workCells = WorkCell::with(['plant', 'area', 'sector', 'shift'])
            ->where('is_active', true)
            ->get();

        return response()->json($workCells);
    }

    /**
     * Get work cell availability.
     */
    public function getWorkCellAvailability(WorkCell $workCell, Request $request)
    {
        $this->authorize('view', $workCell);

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);

        $availability = $this->schedulingService->getWorkCellAvailability(
            $workCell,
            $validated['start_date'],
            $validated['end_date']
        );

        return response()->json($availability);
    }

    /**
     * Run the scheduler.
     */
    public function schedule(ScheduleVersion $version, Request $request)
    {
        $this->authorize('update', $version);

        if ($version->isPublished()) {
            return response()->json([
                'message' => 'Cannot modify a published schedule',
            ], 422);
        }

        $validated = $request->validate([
            'algorithm' => 'required|in:asap,jit,critical_path,priority,forward,backward',
            'manufacturing_order_ids' => 'nullable|array',
            'manufacturing_order_ids.*' => 'exists:manufacturing_orders,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        // Dispatch the scheduling job
        RunSchedulerJob::dispatch($version, $validated);

        return response()->json([
            'message' => 'Scheduling job has been queued',
        ]);
    }

    /**
     * Publish a schedule version.
     */
    public function publish(ScheduleVersion $version)
    {
        $this->authorize('publish', $version);

        if ($version->isPublished()) {
            return response()->json([
                'message' => 'This schedule is already published',
            ], 422);
        }

        // Check for unresolved errors
        $errorCount = $version->alerts()
            ->where('severity', 'error')
            ->where('resolved', false)
            ->count();

        if ($errorCount > 0) {
            return response()->json([
                'message' => "Cannot publish schedule with {$errorCount} unresolved errors",
            ], 422);
        }

        DB::transaction(function () use ($version) {
            // Unpublish any currently published version
            ScheduleVersion::where('status', 'published')
                ->update(['status' => 'draft']);

            // Publish this version
            $version->publish(auth()->user());

            // Create a snapshot of the published state
            ScheduleSnapshot::createFromVersion($version, auth()->user(), 'Published version');
        });

        return response()->json([
            'message' => 'Schedule published successfully',
            'version' => $version->fresh(['publisher']),
        ]);
    }

    /**
     * Create a snapshot of the current schedule.
     */
    public function createSnapshot(ScheduleVersion $version, Request $request)
    {
        $this->authorize('update', $version);

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $snapshot = ScheduleSnapshot::createFromVersion(
            $version,
            auth()->user(),
            $validated['reason'] ?? null
        );

        return response()->json([
            'message' => 'Snapshot created successfully',
            'snapshot' => $snapshot,
        ]);
    }

    /**
     * Update an individual schedule.
     */
    public function updateSchedule(ProductionSchedule $schedule, Request $request)
    {
        $this->authorize('update', $schedule);

        if ($schedule->scheduleVersion->isPublished()) {
            return response()->json([
                'message' => 'Cannot modify a published schedule',
            ], 422);
        }

        $validated = $request->validate([
            'scheduled_start' => 'required|date',
            'scheduled_end' => 'required|date|after:scheduled_start',
            'work_cell_id' => 'required|exists:work_cells,id',
        ]);

        DB::transaction(function () use ($schedule, $validated) {
            $schedule->update($validated);

            // Update capacity booking
            if ($schedule->capacityBooking) {
                $schedule->capacityBooking->update([
                    'start_time' => $validated['scheduled_start'],
                    'end_time' => $validated['scheduled_end'],
                    'work_cell_id' => $validated['work_cell_id'],
                ]);
            }

            // Re-validate the schedule
            $this->schedulingService->validateSchedule($schedule->scheduleVersion);
        });

        return response()->json([
            'message' => 'Schedule updated successfully',
            'schedule' => $schedule->fresh(['manufacturingStep', 'workCell']),
        ]);
    }

    /**
     * Lock a schedule.
     */
    public function lockSchedule(ProductionSchedule $schedule)
    {
        $this->authorize('update', $schedule);

        if ($schedule->scheduleVersion->isPublished()) {
            return response()->json([
                'message' => 'Cannot modify a published schedule',
            ], 422);
        }

        $schedule->lock(auth()->user());

        return response()->json([
            'message' => 'Schedule locked successfully',
            'schedule' => $schedule->fresh(['lockedBy']),
        ]);
    }

    /**
     * Unlock a schedule.
     */
    public function unlockSchedule(ProductionSchedule $schedule)
    {
        $this->authorize('update', $schedule);

        if ($schedule->scheduleVersion->isPublished()) {
            return response()->json([
                'message' => 'Cannot modify a published schedule',
            ], 422);
        }

        $schedule->unlock();

        return response()->json([
            'message' => 'Schedule unlocked successfully',
            'schedule' => $schedule,
        ]);
    }

    /**
     * Get alerts for a schedule version.
     */
    public function getAlerts(ScheduleVersion $version)
    {
        $this->authorize('view', $version);

        $alerts = $version->alerts()
            ->with(['manufacturingOrder', 'manufacturingStep', 'workCell'])
            ->orderBy('severity', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($alerts);
    }

    /**
     * Resolve an alert.
     */
    public function resolveAlert(ScheduleAlert $alert)
    {
        $this->authorize('update', $alert->scheduleVersion);

        $alert->resolve();

        return response()->json([
            'message' => 'Alert resolved successfully',
            'alert' => $alert,
        ]);
    }
}
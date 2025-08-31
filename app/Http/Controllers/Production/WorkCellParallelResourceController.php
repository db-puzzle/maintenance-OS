<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\WorkCell;
use App\Models\Production\WorkCellParallelResource;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkCellParallelResourceController extends Controller
{
    /**
     * Display a listing of parallel resources for a work cell.
     */
    public function index(Request $request, WorkCell $workCell)
    {
        $this->authorize('view', $workCell);

        $query = $workCell->parallelResources()
            ->with('shift');

        // Apply date range filter
        if ($startDate = $request->input('start_date')) {
            $query->where('resource_date', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->where('resource_date', '<=', $endDate);
        }

        // Apply shift filter
        if ($shiftId = $request->input('shift_id')) {
            if ($shiftId === 'general') {
                $query->whereNull('shift_id');
            } else {
                $query->where('shift_id', $shiftId);
            }
        }

        $resources = $query->orderBy('resource_date', 'asc')
            ->orderBy('shift_id', 'asc')
            ->paginate($request->input('per_page', 20));

        return response()->json($resources);
    }

    /**
     * Store or update parallel resources.
     */
    public function store(Request $request, WorkCell $workCell)
    {
        $this->authorize('update', $workCell);

        $validated = $request->validate([
            'resource_date' => 'required|date',
            'shift_id' => 'nullable|exists:shifts,id',
            'available_count' => 'required|integer|min:0|max:' . $workCell->max_parallel_executions,
            'notes' => 'nullable|string|max:500',
        ]);

        $resource = DB::transaction(function () use ($validated, $workCell) {
            return WorkCellParallelResource::updateOrCreate(
                [
                    'work_cell_id' => $workCell->id,
                    'resource_date' => $validated['resource_date'],
                    'shift_id' => $validated['shift_id'],
                ],
                [
                    'available_count' => $validated['available_count'],
                    'notes' => $validated['notes'] ?? null,
                ]
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Recursos paralelos atualizados com sucesso.',
            'resource' => $resource->load('shift'),
        ]);
    }

    /**
     * Bulk update parallel resources.
     */
    public function bulkUpdate(Request $request, WorkCell $workCell)
    {
        $this->authorize('update', $workCell);

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'shift_id' => 'nullable|exists:shifts,id',
            'available_count' => 'required|integer|min:0|max:' . $workCell->max_parallel_executions,
            'notes' => 'nullable|string|max:500',
            'weekdays' => 'array',
            'weekdays.*' => 'integer|between:0,6', // 0 = Sunday, 6 = Saturday
        ]);

        $resources = DB::transaction(function () use ($validated, $workCell) {
            $startDate = Carbon::parse($validated['start_date']);
            $endDate = Carbon::parse($validated['end_date']);
            $weekdays = $validated['weekdays'] ?? range(0, 6); // All days if not specified
            $createdResources = [];

            for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
                // Skip if not in selected weekdays
                if (!in_array($date->dayOfWeek, $weekdays)) {
                    continue;
                }

                $resource = WorkCellParallelResource::updateOrCreate(
                    [
                        'work_cell_id' => $workCell->id,
                        'resource_date' => $date->format('Y-m-d'),
                        'shift_id' => $validated['shift_id'],
                    ],
                    [
                        'available_count' => $validated['available_count'],
                        'notes' => $validated['notes'] ?? null,
                    ]
                );

                $createdResources[] = $resource;
            }

            return $createdResources;
        });

        return response()->json([
            'success' => true,
            'message' => count($resources) . ' recursos paralelos atualizados com sucesso.',
            'count' => count($resources),
        ]);
    }

    /**
     * Delete a parallel resource entry.
     */
    public function destroy(WorkCell $workCell, WorkCellParallelResource $parallelResource)
    {
        $this->authorize('update', $workCell);

        // Ensure the resource belongs to the work cell
        if ($parallelResource->work_cell_id !== $workCell->id) {
            abort(404);
        }

        DB::transaction(function () use ($parallelResource) {
            $parallelResource->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Recurso paralelo removido com sucesso.',
        ]);
    }

    /**
     * Get available parallel resources for a specific date range.
     */
    public function availability(Request $request, WorkCell $workCell)
    {
        $this->authorize('view', $workCell);

        $validated = $request->validate([
            'date' => 'required|date',
            'shift_id' => 'nullable|exists:shifts,id',
        ]);

        $date = Carbon::parse($validated['date']);
        $shiftId = $validated['shift_id'] ?? null;

        $availableCount = $workCell->getAvailableParallelResources($date, $shiftId);

        // Get current bookings for the date
        $bookedSlots = $workCell->capacityBookings()
            ->active()
            ->onDate($date)
            ->when($shiftId, function ($query) use ($shiftId, $date) {
                // Filter by shift time range if shift is specified
                $shift = \App\Models\AssetHierarchy\Shift::find($shiftId);
                if ($shift) {
                    $weekday = strtolower($date->format('l'));
                    $shiftTimes = $shift->getShiftTimesForDateInUTC($date->format('Y-m-d'), $weekday);
                    
                    if (!empty($shiftTimes)) {
                        $startTime = $shiftTimes[0]['start']->format('H:i:s');
                        $endTime = end($shiftTimes)['end']->format('H:i:s');
                        
                        return $query->overlappingTime($startTime, $endTime);
                    }
                }
            })
            ->distinct('parallel_slot')
            ->count('parallel_slot');

        $availableSlots = $availableCount - $bookedSlots;

        return response()->json([
            'date' => $date->format('Y-m-d'),
            'shift_id' => $shiftId,
            'max_parallel_executions' => $workCell->max_parallel_executions,
            'available_resources' => $availableCount,
            'booked_slots' => $bookedSlots,
            'available_slots' => max(0, $availableSlots),
        ]);
    }
}

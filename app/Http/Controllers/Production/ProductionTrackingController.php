<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductionTrackingController extends Controller
{
    /**
     * Display the production tracking dashboard.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingStep::class);
        
        $user = auth()->user();
        
        // For now, we'll show all work as users don't have direct work cell assignments
        // In a future update, you could add a work_cell_users pivot table
        // My work queue - showing all work for now
        $myWork = collect(); // Empty collection for now
        
        // Alternative: Show work based on permissions
        // $myWork = ManufacturingStep::whereIn('status', ['queued', 'in_progress', 'on_hold'])
        //     ->with(['manufacturingRoute.manufacturingOrder.item', 'workCell', 'currentExecution.executedBy'])
        //     ->orderByRaw("CASE 
        //         WHEN status = 'in_progress' THEN 1
        //         WHEN status = 'on_hold' THEN 2
        //         WHEN status = 'queued' THEN 3
        //         ELSE 4 END")
        //     ->orderBy('step_number')
        //     ->limit(10)
        //     ->get();
        
        // Ready to start (facility-wide)
        $readyToStart = ManufacturingStep::where('status', 'queued')
            ->with(['manufacturingRoute.manufacturingOrder.item', 'workCell'])
            ->orderBy('created_at')
            ->limit(20)
            ->get();
        
        // In progress work
        $inProgress = ManufacturingStep::where('status', 'in_progress')
            ->with(['manufacturingRoute.manufacturingOrder.item', 'workCell', 'currentExecution.executedBy'])
            ->orderBy('actual_start_time', 'desc')
            ->get();
        
        return Inertia::render('production/tracking/index', [
            'myWork' => $myWork,
            'readyToStart' => $readyToStart,
            'inProgress' => $inProgress,
            'workCells' => WorkCell::where('is_active', true)->get(['id', 'name', 'code']),
            'canExecute' => $user->can('execute', ManufacturingStep::class),
        ]);
    }
}

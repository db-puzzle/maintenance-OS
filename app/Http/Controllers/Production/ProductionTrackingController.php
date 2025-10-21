<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\WorkCell;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductionTrackingController extends Controller
{
    /**
     * Display the production tracking dashboard with KPIs and overview.
     */
    public function dashboard(Request $request)
    {
        $this->authorize('viewAny', ManufacturingStep::class);
        
        // Calculate KPIs
        $today = now()->startOfDay();
        
        $stats = [
            'inProduction' => ManufacturingOrder::whereIn('status', ['in_production', 'scheduled'])->count(),
            'completedToday' => ManufacturingOrder::where('status', 'completed')
                ->whereDate('actual_end_date', $today)
                ->count(),
            'defectRate' => 2.3, // This would come from quality data
            'efficiency' => 87, // This would be calculated from actual vs planned times
        ];
        
        // Get work cells with their current status
        $workCells = WorkCell::where('is_active', true)
            ->with(['currentManufacturingSteps' => function ($query) {
                $query->where('status', 'in_progress')
                    ->with(['manufacturingRoute.manufacturingOrder.item', 'currentExecution.executedBy']);
            }])
            ->get()
            ->map(function ($workCell) {
                $currentStep = $workCell->currentManufacturingSteps->first();
                return [
                    'id' => $workCell->id,
                    'name' => $workCell->name,
                    'code' => $workCell->code,
                    'currentOrder' => $currentStep ? $currentStep->manufacturingRoute->manufacturingOrder : null,
                    'operator' => $currentStep && $currentStep->currentExecution ? 
                        ['name' => $currentStep->currentExecution->executedBy->name ?? 'Unknown'] : null,
                    'efficiency' => rand(75, 95), // This would be calculated from real data
                ];
            });
        
        // Get active orders
        $activeOrders = ManufacturingOrder::whereIn('status', ['in_production', 'scheduled'])
            ->with(['item', 'manufacturingRoutes.manufacturingSteps'])
            ->orderBy('priority', 'desc')
            ->orderBy('requested_date')
            ->limit(10)
            ->get()
            ->map(function ($order) {
                $totalSteps = $order->manufacturingRoutes->sum(fn($route) => $route->manufacturingSteps->count());
                $completedSteps = $order->manufacturingRoutes->sum(fn($route) => 
                    $route->manufacturingSteps->where('status', 'completed')->count()
                );
                
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'item' => $order->item,
                    'quantity' => $order->quantity,
                    'quantity_completed' => $order->quantity_completed,
                    'unit_of_measure' => $order->unit_of_measure,
                    'priority' => $order->priority,
                    'status' => $order->status,
                    'progress' => $totalSteps > 0 ? round(($completedSteps / $totalSteps) * 100) : 0,
                ];
            });
        
        return Inertia::render('production/tracking/dashboard', [
            'stats' => $stats,
            'workCells' => $workCells,
            'activeOrders' => $activeOrders,
        ]);
    }
    
    /**
     * Display the production tracking list view.
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
            'workCells' => WorkCell::where('is_active', true)->get(['id', 'name']),
            'canExecute' => $user->can('execute', ManufacturingStep::class),
        ]);
    }
}

<?php

namespace App\Http\Controllers\WorkOrders;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use App\Services\WorkOrders\WorkOrderSchedulingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkOrderSchedulingController extends Controller
{
    private WorkOrderSchedulingService $schedulingService;
    
    public function __construct(WorkOrderSchedulingService $schedulingService)
    {
        $this->schedulingService = $schedulingService;
    }
    
    public function index(Request $request)
    {
        $startDate = Carbon::parse($request->get('start_date', now()->startOfWeek()));
        $endDate = Carbon::parse($request->get('end_date', now()->endOfWeek()));
        
        $filters = $request->only(['technician_id', 'asset_id', 'status']);
        
        $calendar = $this->schedulingService->getSchedulingCalendar($startDate, $endDate, $filters);
        
        // Get unscheduled work orders
        $unscheduledWorkOrders = WorkOrder::with(['asset', 'type'])
            ->whereIn('status', [
                WorkOrder::STATUS_APPROVED,
                WorkOrder::STATUS_PLANNED,
                WorkOrder::STATUS_READY,
            ])
            ->whereNull('scheduled_start_date')
            ->orderBy('priority_score', 'desc')
            ->get();
            
        // Get technicians for filter
        $technicians = User::whereHas('permissions', function ($query) {
            $query->where('name', 'execute_work_orders');
        })->get();
        
        return Inertia::render('WorkOrders/Scheduling/Index', [
            'calendar' => $calendar,
            'unscheduledWorkOrders' => $unscheduledWorkOrders,
            'technicians' => $technicians,
            'filters' => $filters,
            'dateRange' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }
    
    public function schedule(Request $request, WorkOrder $workOrder)
    {
        $validated = $request->validate([
            'scheduled_start_date' => 'required|date',
            'scheduled_end_date' => 'required|date|after:scheduled_start_date',
            'assigned_technician_id' => 'nullable|exists:users,id',
            'assigned_team_id' => 'nullable|exists:teams,id',
        ]);
        
        // Check if work order can be scheduled
        if (!in_array($workOrder->status, [WorkOrder::STATUS_APPROVED, WorkOrder::STATUS_PLANNED, WorkOrder::STATUS_READY])) {
            return back()->with('error', 'Work order cannot be scheduled in current status.');
        }
        
        // Check technician availability if assigned
        if ($validated['assigned_technician_id']) {
            $availability = $this->schedulingService->checkTechnicianAvailability(
                $validated['assigned_technician_id'],
                Carbon::parse($validated['scheduled_start_date']),
                Carbon::parse($validated['scheduled_end_date'])
            );
            
            if (!$availability['available']) {
                return back()->with('error', 'Technician is not available during the selected time period.');
            }
        }
        
        $workOrder->update($validated);
        
        // Transition to scheduled status if ready
        if ($workOrder->status === WorkOrder::STATUS_READY) {
            $workOrder->transitionTo(WorkOrder::STATUS_SCHEDULED, auth()->user(), 'Scheduled');
        }
        
        return back()->with('success', 'Work order scheduled successfully.');
    }
    
    public function batchSchedule(Request $request)
    {
        $validated = $request->validate([
            'schedules' => 'required|array',
            'schedules.*.work_order_id' => 'required|exists:work_orders,id',
            'schedules.*.start_date' => 'required|date',
            'schedules.*.end_date' => 'required|date|after:schedules.*.start_date',
            'schedules.*.technician_id' => 'nullable|exists:users,id',
            'schedules.*.team_id' => 'nullable|exists:teams,id',
        ]);
        
        $scheduled = $this->schedulingService->scheduleBatch($validated['schedules'], auth()->user());
        
        return back()->with('success', "Successfully scheduled {$scheduled->count()} work orders.");
    }
    
    public function technicianWorkload(Request $request)
    {
        $validated = $request->validate([
            'technician_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);
        
        $workload = $this->schedulingService->getTechnicianWorkload(
            $validated['technician_id'],
            Carbon::parse($validated['start_date']),
            Carbon::parse($validated['end_date'])
        );
        
        return response()->json($workload);
    }
    
    public function optimizeSchedule(Request $request)
    {
        $validated = $request->validate([
            'work_order_ids' => 'required|array',
            'work_order_ids.*' => 'exists:work_orders,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);
        
        $workOrders = WorkOrder::whereIn('id', $validated['work_order_ids'])->get();
        
        $technicians = User::whereHas('permissions', function ($query) {
            $query->where('name', 'execute_work_orders');
        })->get()->toArray();
        
        $optimization = $this->schedulingService->optimizeSchedule(
            $workOrders,
            $technicians,
            Carbon::parse($validated['start_date']),
            Carbon::parse($validated['end_date'])
        );
        
        return Inertia::render('WorkOrders/Scheduling/Optimize', [
            'optimization' => $optimization,
            'workOrders' => $workOrders,
            'dateRange' => [
                'start' => $validated['start_date'],
                'end' => $validated['end_date'],
            ],
        ]);
    }
}
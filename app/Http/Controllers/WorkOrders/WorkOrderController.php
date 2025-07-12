<?php

namespace App\Http\Controllers\WorkOrders;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkOrders\CreateWorkOrderRequest;
use App\Http\Requests\WorkOrders\UpdateWorkOrderRequest;
use App\Http\Resources\WorkOrderResource;
use App\Models\WorkOrders\WorkOrder;
use App\Services\WorkOrders\WorkOrderGenerationService;
use App\Services\WorkOrders\WorkOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class WorkOrderController extends Controller
{
    public function __construct(
        private WorkOrderService $service,
        private WorkOrderGenerationService $generationService
    ) {
    }

    /**
     * Display a listing of work orders
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', WorkOrder::class);
        
        $query = WorkOrder::with(['asset', 'type', 'assignedTechnician', 'execution']);
        
        // Filters
        if ($request->has('category')) {
            $query->byCategory($request->category);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('asset_id')) {
            $query->forAsset($request->asset_id);
        }
        
        if ($request->has('assigned_to')) {
            $query->where('assigned_technician_id', $request->assigned_to);
        }
        
        if ($request->boolean('overdue')) {
            $query->overdue();
        }
        
        // Date filters
        if ($request->has('scheduled_from') && $request->has('scheduled_to')) {
            $query->scheduledBetween($request->scheduled_from, $request->scheduled_to);
        }
        
        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('work_order_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        
        // Sorting
        $sortBy = $request->get('sort_by', 'priority_score');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortBy, $sortDirection);
        
        $workOrders = $query->paginate($request->get('per_page', 20));
        
        if ($request->wantsJson()) {
            return WorkOrderResource::collection($workOrders);
        }
        
        return Inertia::render('WorkOrders/Index', [
            'workOrders' => WorkOrderResource::collection($workOrders),
            'filters' => $request->only(['category', 'status', 'asset_id', 'assigned_to', 'overdue', 'search']),
        ]);
    }

    /**
     * Show the form for creating a new work order
     */
    public function create()
    {
        Gate::authorize('create', WorkOrder::class);
        
        return Inertia::render('WorkOrders/Create');
    }

    /**
     * Store a newly created work order
     */
    public function store(CreateWorkOrderRequest $request)
    {
        Gate::authorize('create', WorkOrder::class);
        
        $data = $request->validated();
        $data['requested_by'] = auth()->id();
        
        $workOrder = $this->service->create($data);
        
        if ($request->wantsJson()) {
            return new WorkOrderResource($workOrder->load(['asset', 'type']));
        }
        
        return redirect()->route('work-orders.show', $workOrder)
            ->with('success', 'Work order created successfully.');
    }

    /**
     * Display the specified work order
     */
    public function show(WorkOrder $workOrder)
    {
        Gate::authorize('view', $workOrder);
        
        $workOrder->load([
            'asset.plant',
            'asset.area', 
            'asset.sector',
            'type',
            'form',
            'formVersion.tasks',
            'execution.taskResponses',
            'parts',
            'statusHistory.changedBy',
            'relatedWorkOrders',
            'relatedTo',
            'requestedBy',
            'assignedTechnician',
            'failureAnalysis',
        ]);
        
        if (request()->wantsJson()) {
            return new WorkOrderResource($workOrder);
        }
        
        return Inertia::render('WorkOrders/Show', [
            'workOrder' => new WorkOrderResource($workOrder),
            'statistics' => $this->service->getStatistics($workOrder),
        ]);
    }

    /**
     * Show the form for editing the specified work order
     */
    public function edit(WorkOrder $workOrder)
    {
        Gate::authorize('update', $workOrder);
        
        $workOrder->load(['asset', 'type', 'form']);
        
        return Inertia::render('WorkOrders/Edit', [
            'workOrder' => new WorkOrderResource($workOrder),
        ]);
    }

    /**
     * Update the specified work order
     */
    public function update(UpdateWorkOrderRequest $request, WorkOrder $workOrder)
    {
        Gate::authorize('update', $workOrder);
        
        $workOrder = $this->service->update($workOrder, $request->validated());
        
        if ($request->wantsJson()) {
            return new WorkOrderResource($workOrder);
        }
        
        return redirect()->route('work-orders.show', $workOrder)
            ->with('success', 'Work order updated successfully.');
    }

    /**
     * Remove the specified work order
     */
    public function destroy(WorkOrder $workOrder)
    {
        Gate::authorize('delete', $workOrder);
        
        if (!in_array($workOrder->status, [WorkOrder::STATUS_REQUESTED, WorkOrder::STATUS_CANCELLED])) {
            abort(422, 'Only requested or cancelled work orders can be deleted');
        }
        
        $workOrder->delete();
        
        if (request()->wantsJson()) {
            return response()->noContent();
        }
        
        return redirect()->route('work-orders.index')
            ->with('success', 'Work order deleted successfully.');
    }

    /**
     * Status transition methods
     */
    public function approve(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('approve', $workOrder);
        
        try {
            $this->service->approve($workOrder, auth()->user(), $request->reason);
            
            if ($request->wantsJson()) {
                return new WorkOrderResource($workOrder->fresh());
            }
            
            return back()->with('success', 'Work order approved successfully.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return back()->with('error', $e->getMessage());
        }
    }

    public function reject(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('approve', $workOrder);
        
        $request->validate(['reason' => 'required|string']);
        
        try {
            $this->service->reject($workOrder, auth()->user(), $request->reason);
            
            if ($request->wantsJson()) {
                return new WorkOrderResource($workOrder->fresh());
            }
            
            return back()->with('success', 'Work order rejected.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return back()->with('error', $e->getMessage());
        }
    }

    public function plan(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('plan', $workOrder);
        
        $validated = $request->validate([
            'estimated_hours' => 'nullable|numeric|min:0',
            'estimated_parts_cost' => 'nullable|numeric|min:0',
            'estimated_labor_cost' => 'nullable|numeric|min:0',
            'required_skills' => 'nullable|array',
            'required_certifications' => 'nullable|array',
            'safety_requirements' => 'nullable|array',
            'downtime_required' => 'nullable|boolean',
        ]);
        
        try {
            $workOrder = $this->service->plan($workOrder, auth()->user(), $validated);
            
            if ($request->wantsJson()) {
                return new WorkOrderResource($workOrder);
            }
            
            return back()->with('success', 'Work order planned successfully.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return back()->with('error', $e->getMessage());
        }
    }

    public function schedule(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('schedule', $workOrder);
        
        $validated = $request->validate([
            'scheduled_start_date' => 'required|date|after:now',
            'scheduled_end_date' => 'required|date|after:scheduled_start_date',
            'assigned_technician_id' => 'required|exists:users,id',
            'assigned_team_id' => 'nullable|exists:teams,id',
        ]);
        
        try {
            $workOrder = $this->service->schedule($workOrder, auth()->user(), $validated);
            
            if ($request->wantsJson()) {
                return new WorkOrderResource($workOrder);
            }
            
            return back()->with('success', 'Work order scheduled successfully.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return back()->with('error', $e->getMessage());
        }
    }

    public function hold(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('update', $workOrder);
        
        $request->validate(['reason' => 'required|string']);
        
        try {
            $this->service->putOnHold($workOrder, auth()->user(), $request->reason);
            
            if ($request->wantsJson()) {
                return new WorkOrderResource($workOrder->fresh());
            }
            
            return back()->with('success', 'Work order put on hold.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return back()->with('error', $e->getMessage());
        }
    }

    public function resume(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('update', $workOrder);
        
        $request->validate(['to_status' => 'required|string']);
        
        try {
            $this->service->resume($workOrder, auth()->user(), $request->to_status);
            
            if ($request->wantsJson()) {
                return new WorkOrderResource($workOrder->fresh());
            }
            
            return back()->with('success', 'Work order resumed.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return back()->with('error', $e->getMessage());
        }
    }

    public function verify(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('verify', $workOrder);
        
        try {
            $this->service->verify($workOrder, auth()->user(), $request->notes);
            
            if ($request->wantsJson()) {
                return new WorkOrderResource($workOrder->fresh());
            }
            
            return back()->with('success', 'Work order verified successfully.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return back()->with('error', $e->getMessage());
        }
    }

    public function close(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('close', $workOrder);
        
        try {
            $this->service->close($workOrder, auth()->user(), $request->notes);
            
            if ($request->wantsJson()) {
                return new WorkOrderResource($workOrder->fresh());
            }
            
            return back()->with('success', 'Work order closed successfully.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Get work order history
     */
    public function history(WorkOrder $workOrder)
    {
        Gate::authorize('view', $workOrder);
        
        $history = $workOrder->statusHistory()
            ->with('changedBy')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json(['data' => $history]);
    }

    /**
     * Preview upcoming work orders
     */
    public function previewUpcoming(Request $request)
    {
        Gate::authorize('viewAny', WorkOrder::class);
        
        $days = $request->get('days', 30);
        $upcoming = $this->generationService->previewUpcomingWorkOrders($days);
        
        return response()->json(['data' => $upcoming]);
    }

    /**
     * Create follow-up work order
     */
    public function createFollowUp(Request $request, WorkOrder $workOrder)
    {
        Gate::authorize('create', WorkOrder::class);
        
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'work_order_type_id' => 'required|exists:work_order_types,id',
            'priority' => 'required|in:emergency,urgent,high,normal,low',
        ]);
        
        $data = array_merge($validated, [
            'work_order_category' => 'corrective',
            'asset_id' => $workOrder->asset_id,
            'related_work_order_id' => $workOrder->id,
            'relationship_type' => 'follow_up',
            'requested_by' => auth()->id(),
            'source_type' => 'work_order',
            'source_id' => $workOrder->id,
        ]);
        
        $followUpWorkOrder = $this->service->create($data);
        
        if ($request->wantsJson()) {
            return new WorkOrderResource($followUpWorkOrder);
        }
        
        return redirect()->route('work-orders.show', $followUpWorkOrder)
            ->with('success', 'Follow-up work order created successfully.');
    }
}
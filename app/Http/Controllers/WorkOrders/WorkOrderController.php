<?php

namespace App\Http\Controllers\WorkOrders;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\Forms\Form;
use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkOrderController extends Controller
{
    /**
     * Display a listing of work orders
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', WorkOrder::class);

        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');
        $status = $request->input('status');
        $category = $request->input('category');
        $priority = $request->input('priority');
        $assignedTo = $request->input('assigned_to');
        $plantId = $request->input('plant_id');
        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');

        $query = WorkOrder::with([
            'type',
            'asset.plant',
            'asset.area',
            'asset.sector',
            'assignedTechnician',
            'requestedBy',
        ]);

        // Apply filters
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('work_order_number', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('asset', function ($q) use ($search) {
                        $q->where('tag', 'like', "%{$search}%");
                    });
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($category) {
            $query->where('work_order_category', $category);
        }

        if ($priority) {
            $query->where('priority', $priority);
        }

        if ($assignedTo) {
            $query->where('assigned_technician_id', $assignedTo);
        }

        if ($plantId) {
            $query->whereHas('asset', function ($q) use ($plantId) {
                $q->where('plant_id', $plantId);
            });
        }

        // Apply sorting
        if ($sort === 'type') {
            $query->join('work_order_types', 'work_orders.work_order_type_id', '=', 'work_order_types.id')
                ->orderBy('work_order_types.name', $direction)
                ->select('work_orders.*');
        } elseif ($sort === 'assigned_to') {
            $query->leftJoin('users', 'work_orders.assigned_to', '=', 'users.id')
                ->orderBy('users.name', $direction)
                ->select('work_orders.*');
        } else {
            $query->orderBy($sort, $direction);
        }

        $workOrders = $query->paginate($perPage);

        // Get filter options
        $statuses = [
            'pending' => 'Pendente',
            'approved' => 'Aprovada',
            'rejected' => 'Rejeitada',
            'in_progress' => 'Em Andamento',
            'completed' => 'Concluída',
            'cancelled' => 'Cancelada',
        ];

        $priorities = [
            'critical' => 'Crítica',
            'high' => 'Alta',
            'medium' => 'Média',
            'low' => 'Baixa',
        ];

        $categories = [
            'preventive' => 'Preventiva',
            'corrective' => 'Corretiva',
            'inspection' => 'Inspeção',
            'project' => 'Projeto',
        ];

        $users = User::orderBy('name')->get(['id', 'name']);
        $plants = Plant::orderBy('name')->get(['id', 'name']);

        // Calculate stats
        $stats = [
            'open' => WorkOrder::whereIn('status', ['requested', 'approved', 'planned', 'scheduled'])->count(),
            'in_progress' => WorkOrder::where('status', 'in_progress')->count(),
            'overdue' => WorkOrder::where('status', '!=', 'completed')
                ->where('status', '!=', 'verified')
                ->where('status', '!=', 'closed')
                ->where('status', '!=', 'cancelled')
                ->where('requested_due_date', '<', now())
                ->count(),
            'completed_this_month' => WorkOrder::where('status', 'completed')
                ->whereMonth('actual_end_date', now()->month)
                ->whereYear('actual_end_date', now()->year)
                ->count(),
        ];

        // Get work order types
        $workOrderTypes = WorkOrderType::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('work-orders/index', [
            'workOrders' => [
                'data' => $workOrders->items(),
                'meta' => [
                    'current_page' => $workOrders->currentPage(),
                    'last_page' => $workOrders->lastPage(),
                    'per_page' => $workOrders->perPage(),
                    'total' => $workOrders->total(),
                    'from' => $workOrders->firstItem(),
                    'to' => $workOrders->lastItem(),
                ],
            ],
            'stats' => $stats,
            'workOrderTypes' => $workOrderTypes,
            'plants' => $plants,
            'canCreate' => auth()->user()->can('create', WorkOrder::class),
        ]);
    }

    /**
     * Show the form for creating a new work order
     */
    public function create()
    {
        $this->authorize('create', WorkOrder::class);

        $workOrderTypes = WorkOrderType::active()->orderBy('name')->get();
        $assets = Asset::with(['plant', 'area', 'sector'])->orderBy('tag')->get();
        $plants = Plant::orderBy('name')->get();
        $areas = Area::with('plant')->orderBy('name')->get();
        $sectors = Sector::with('area')->orderBy('name')->get();
        $forms = Form::where('is_active', true)->orderBy('name')->get();
        $users = User::orderBy('name')->get(['id', 'name']);

        // Transform workOrderTypes to include only necessary fields
        $workOrderTypesFormatted = $workOrderTypes->map(function ($type) {
            return [
                'id' => $type->id,
                'name' => $type->name,
                'category' => $type->category,
                'icon' => $type->icon, // Keep as string, will be handled on frontend
            ];
        });

        return Inertia::render('work-orders/create', [
            'workOrderTypes' => $workOrderTypesFormatted,
            'assets' => $assets,
            'plants' => $plants,
            'areas' => $areas,
            'sectors' => $sectors,
            'forms' => $forms,
            'users' => $users,
            'priorities' => [
                'critical' => 'Crítica',
                'high' => 'Alta',
                'medium' => 'Média',
                'low' => 'Baixa',
            ],
        ]);
    }

    /**
     * Store a newly created work order
     */
    public function store(Request $request)
    {
        $this->authorize('create', WorkOrder::class);

        try {
            $validated = $request->validate([
                'work_order_type_id' => 'required|exists:work_order_types,id',
                'work_order_category' => 'required|in:corrective,preventive,inspection,project',
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'priority' => 'required|in:emergency,urgent,high,normal,low',
                'priority_score' => 'required|integer|min:0|max:100',
                'asset_id' => 'required|exists:assets,id',
                'form_id' => 'nullable|exists:forms,id',
                'requested_due_date' => 'nullable|date',
                'downtime_required' => 'boolean',
                'source_type' => 'required|in:manual,routine,sensor,inspection_finding',
                'external_reference' => 'nullable|string|max:255',
                'warranty_claim' => 'boolean',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
            ]);

            // Add the requesting user
            $validated['requested_by'] = auth()->id();
            
            // Remove fields that aren't in the work_orders table
            $workOrderData = collect($validated)->except(['tags'])->toArray();

            $workOrder = WorkOrder::create($workOrderData);

            // Handle tags if provided
            if (!empty($validated['tags'])) {
                // TODO: Implement tag handling if needed
            }

            return redirect()->route('work-orders.show', $workOrder)
                ->with('success', 'Ordem de serviço criada com sucesso.');
                
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw $e;
        }
    }

    /**
     * Display the specified work order
     */
    public function show(WorkOrder $workOrder)
    {
        $this->authorize('view', $workOrder);

        $workOrder->load([
            'type',
            'asset.plant',
            'asset.area',
            'asset.sector',
            'form.formVersion',
            'assignedTechnician',
            'requestedBy',
            'approvedBy',
            'execution.executedBy',
            'execution.taskResponses.formTask',
            'statusHistory.changedBy',
            'parts',
            'failureAnalysis.failureMode',
            'failureAnalysis.rootCause',
            'failureAnalysis.immediateCause',
            'failureAnalysis.analyzedBy',
        ]);

        $users = User::orderBy('name')->get(['id', 'name']);

        return Inertia::render('work-orders/show', [
            'workOrder' => $workOrder,
            'users' => $users,
            'canEdit' => auth()->user()->can('update', $workOrder),
            'canDelete' => auth()->user()->can('delete', $workOrder),
            'canApprove' => auth()->user()->can('approve', $workOrder),
            'canStart' => auth()->user()->can('start', $workOrder),
            'canComplete' => auth()->user()->can('complete', $workOrder),
        ]);
    }

    /**
     * Show the form for editing the work order
     */
    public function edit(WorkOrder $workOrder)
    {
        $this->authorize('update', $workOrder);

        $workOrderTypes = WorkOrderType::active()->orderBy('name')->get();
        $assets = Asset::with(['plant', 'area', 'sector'])->orderBy('tag')->get();
        $plants = Plant::orderBy('name')->get();
        $areas = Area::with('plant')->orderBy('name')->get();
        $sectors = Sector::with('area')->orderBy('name')->get();
        $forms = Form::where('is_active', true)->orderBy('name')->get();
        $users = User::orderBy('name')->get(['id', 'name']);

        return Inertia::render('work-orders/edit', [
            'workOrder' => $workOrder->load(['type', 'asset.plant', 'asset.area', 'asset.sector', 'form', 'assignedTechnician']),
            'workOrderTypes' => $workOrderTypes,
            'assets' => $assets,
            'plants' => $plants,
            'areas' => $areas,
            'sectors' => $sectors,
            'forms' => $forms,
            'users' => $users,
            'priorities' => [
                'critical' => 'Crítica',
                'high' => 'Alta',
                'medium' => 'Média',
                'low' => 'Baixa',
            ],
        ]);
    }

    /**
     * Update the specified work order
     */
    public function update(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('update', $workOrder);

        $validated = $request->validate([
            'work_order_type_id' => 'required|exists:work_order_types,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:critical,high,medium,low',
            'asset_id' => 'nullable|exists:assets,id',
            'plant_id' => 'required|exists:plants,id',
            'form_id' => 'nullable|exists:forms,id',
            'assigned_to' => 'nullable|exists:users,id',
            'scheduled_start_date' => 'nullable|date',
            'scheduled_end_date' => 'nullable|date|after_or_equal:scheduled_start_date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'estimated_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $workOrder->update($validated);

        return redirect()->route('work-orders.show', $workOrder)
            ->with('success', 'Ordem de serviço atualizada com sucesso.');
    }

    /**
     * Remove the specified work order
     */
    public function destroy(WorkOrder $workOrder)
    {
        $this->authorize('delete', $workOrder);

        $workOrder->delete();

        return redirect()->route('work-orders.index')
            ->with('success', 'Ordem de serviço excluída com sucesso.');
    }

    /**
     * Approve the work order
     */
    public function approve(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('approve', $workOrder);

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $success = $workOrder->transitionTo(WorkOrder::STATUS_APPROVED, auth()->user(), $validated['notes'] ?? null);

        if (!$success) {
            return back()->with('error', 'Não foi possível aprovar a ordem de serviço. Status inválido.');
        }

        return back()->with('success', 'Ordem de serviço aprovada com sucesso.');
    }

    /**
     * Reject the work order
     */
    public function reject(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('approve', $workOrder);

        $validated = $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        $success = $workOrder->transitionTo(WorkOrder::STATUS_REJECTED, auth()->user(), $validated['rejection_reason']);

        if (!$success) {
            return back()->with('error', 'Não foi possível rejeitar a ordem de serviço. Status inválido.');
        }

        return back()->with('success', 'Ordem de serviço rejeitada.');
    }

    /**
     * Cancel the work order
     */
    public function cancel(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('cancel', $workOrder);

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $success = $workOrder->transitionTo(WorkOrder::STATUS_CANCELLED, auth()->user(), $validated['notes'] ?? null);

        if (!$success) {
            return back()->with('error', 'Não foi possível cancelar a ordem de serviço. Status inválido.');
        }

        return back()->with('success', 'Ordem de serviço cancelada com sucesso.');
    }
}
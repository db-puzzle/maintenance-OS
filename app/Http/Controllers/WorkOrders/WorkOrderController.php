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
use App\Models\WorkOrders\WorkOrderCategory;
use App\Services\WorkOrders\MaintenanceWorkOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Models\WorkOrders\WorkOrderPart;
use App\Models\Team;
use App\Models\Part; 
use App\Models\Skill;
use App\Models\Certification;
use App\Http\Requests\WorkOrders\StoreWorkOrderRequest;
use App\Http\Requests\WorkOrders\UpdateWorkOrderRequest;
use App\Http\Requests\WorkOrders\ApproveWorkOrderRequest;
use App\Http\Requests\WorkOrders\RejectWorkOrderRequest;
use App\Http\Requests\WorkOrders\PlanWorkOrderRequest;
use Carbon\Carbon;

class WorkOrderController extends Controller
{
    protected MaintenanceWorkOrderService $maintenanceService;
    
    public function __construct(MaintenanceWorkOrderService $maintenanceService)
    {
        $this->maintenanceService = $maintenanceService;
    }
    
    /**
     * Display a listing of work orders
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', WorkOrder::class);

        // Determine discipline from route prefix
        $discipline = str_contains($request->route()->getPrefix(), 'quality') ? 'quality' : 'maintenance';
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');
        $status = $request->input('status', 'open'); // Default to 'open' filter
        $category = $request->input('category');

        $sort = $request->input('sort', 'work_order_number');
        $direction = $request->input('direction', 'desc');

        $query = WorkOrder::where('discipline', $discipline)
            ->with([
                'type',
                'workOrderCategory',
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

        if ($status === 'open') {
            // Special filter for all open orders (exclude cancelled and closed)
            $query->whereNotIn('status', [WorkOrder::STATUS_CANCELLED, WorkOrder::STATUS_CLOSED]);
        } elseif ($status !== 'All') {
            // Apply specific status filter only if not 'All'
            $query->where('status', $status);
        }
        // If status is 'All', no filter is applied (show all statuses)

        if ($category) {
            // Support both category code and category ID
            if (is_numeric($category)) {
                $query->where('work_order_category_id', $category);
            } else {
                $query->whereHas('workOrderCategory', function ($q) use ($category) {
                    $q->where('code', $category);
                });
            }
        }



        // Apply sorting
        if ($sort === 'asset') {
            $query->leftJoin('assets', 'work_orders.asset_id', '=', 'assets.id')
                ->orderBy('assets.tag', $direction)
                ->select('work_orders.*');
        } elseif ($sort === 'technician') {
            $query->leftJoin('users', 'work_orders.assigned_technician_id', '=', 'users.id')
                ->orderBy('users.name', $direction)
                ->select('work_orders.*');
        } else {
            $query->orderBy($sort, $direction);
        }

        $workOrdersPaginated = $query->paginate($perPage)->withQueryString();
        
        // Transform paginated data to match React component expectations
        $workOrders = [
            'data' => $workOrdersPaginated->items(),
            'current_page' => $workOrdersPaginated->currentPage(),
            'last_page' => $workOrdersPaginated->lastPage(),
            'per_page' => $workOrdersPaginated->perPage(),
            'total' => $workOrdersPaginated->total(),
            'from' => $workOrdersPaginated->firstItem(),
            'to' => $workOrdersPaginated->lastItem(),
        ];

        return Inertia::render('work-orders/index', [
            'workOrders' => $workOrders,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'discipline' => $discipline,
            'canCreate' => auth()->user()->can('create', WorkOrder::class),
        ]);
    }

    /**
     * Show the form for creating a new work order
     */
    public function create(Request $request)
    {
        $this->authorize('create', WorkOrder::class);

        // Determine discipline from route prefix
        $discipline = str_contains($request->route()->getPrefix(), 'quality') ? 'quality' : 'maintenance';
        $source = $request->input('source', 'manual');
        $sourceId = $request->input('source_id');
        
        // Get data based on discipline
        if ($discipline === 'maintenance') {
            $plants = Plant::orderBy('name')->get();
            $areas = Area::with('plant')->orderBy('name')->get();
            $sectors = Sector::with('area')->orderBy('name')->get();
            $assets = Asset::with(['plant', 'area', 'sector'])->orderBy('tag')->get();
        } else {
            $plants = [];
            $areas = [];
            $sectors = [];
            $assets = [];
            // For quality discipline, we would load instruments instead
        }
        
        $categories = WorkOrderCategory::forDiscipline($discipline)
            ->active()
            ->ordered()
            ->get();
        $workOrderTypes = WorkOrderType::active()
            ->with('workOrderCategory')
            ->orderBy('name')
            ->get();
        $forms = Form::where('is_active', true)->orderBy('name')->get();
        $teams = Team::where('is_active', true)->orderBy('name')->get();
        $technicians = User::whereHas('roles', function ($q) {
            $q->whereIn('name', ['Technician', 'Maintenance Supervisor']);
        })->orderBy('name')->get();
        $skills = Skill::orderBy('name')->get();
        $certifications = Certification::where('active', true)->orderBy('name')->get();

        return Inertia::render('work-orders/create', [
            'plants' => $plants,
            'areas' => $areas,
            'sectors' => $sectors,
            'assets' => $assets,
            'categories' => $categories,
            'workOrderTypes' => $workOrderTypes,
            'forms' => $forms,
            'teams' => $teams,
            'technicians' => $technicians,
            'skills' => $skills,
            'certifications' => $certifications,
            'source' => $source,
            'sourceId' => $sourceId,
            'discipline' => $discipline,
        ]);
    }

    /**
     * Open the work order creation page
     */
    public function createNew(Request $request)
    {
        $this->authorize('create', WorkOrder::class);
        
        // Determine discipline from route prefix
        $discipline = str_contains($request->route()->getPrefix(), 'quality') ? 'quality' : 'maintenance';
        
        // Redirect to the show page with the "new" parameter
        return redirect()->route("{$discipline}.work-orders.show", ['workOrder' => 'new']);
    }

    /**
     * Store a newly created work order
     */
    public function store(StoreWorkOrderRequest $request)
    {
        // Determine discipline from route prefix
        $discipline = str_contains($request->route()->getPrefix(), 'quality') ? 'quality' : 'maintenance';
        
        $service = match($discipline) {
            'maintenance' => $this->maintenanceService,
            // 'quality' => $this->qualityService, // Future implementation
            default => throw new \InvalidArgumentException('Invalid discipline')
        };
        
        $workOrder = $service->create($request->validated());
        
        return redirect()->route("{$discipline}.work-orders.show", $workOrder)
            ->with('success', 'Ordem de serviço criada com sucesso.');
    }

    /**
     * Display the specified work order
     */
    public function show($workOrder)
    {
        // Determine discipline from route prefix
        $discipline = str_contains(request()->route()->getPrefix(), 'quality') ? 'quality' : 'maintenance';
        
        // Check if we're creating a new work order
        if ($workOrder === 'new') {
            $this->authorize('create', WorkOrder::class);
            
            // Get the pre-selected asset if provided
            $preselectedAssetId = request()->query('asset_id');
            $preselectedAsset = null;
            
            // Get data based on discipline
            if ($discipline === 'maintenance') {
                $plants = Plant::orderBy('name')->get();
                $areas = Area::with('plant')->orderBy('name')->get();
                $sectors = Sector::with('area')->orderBy('name')->get();
                $assets = Asset::with(['plant', 'area', 'sector', 'assetType'])
                    ->orderBy('tag')
                    ->get()
                    ->map(function ($asset) {
                        return [
                            'id' => $asset->id,
                            'tag' => $asset->tag,
                            'name' => $asset->description ?: ($asset->assetType ? $asset->assetType->name : ''),
                            'plant_id' => $asset->plant_id,
                            'area_id' => $asset->area_id,
                            'sector_id' => $asset->sector_id,
                        ];
                    });
                    
                // If we have a preselected asset, find it
                if ($preselectedAssetId) {
                    $preselectedAsset = $assets->firstWhere('id', (int)$preselectedAssetId);
                }
            } else {
                $plants = [];
                $areas = [];
                $sectors = [];
                $assets = [];
                // For quality discipline, we would load instruments instead
            }
            
            $categories = WorkOrderCategory::forDiscipline($discipline)
                ->active()
                ->ordered()
                ->get();
            $workOrderTypes = WorkOrderType::active()
                ->with('workOrderCategory')
                ->orderBy('name')
                ->get();
            $forms = Form::where('is_active', true)->orderBy('name')->get();
            
            return Inertia::render('work-orders/show', [
                'workOrder' => null,
                'categories' => $categories,
                'workOrderTypes' => $workOrderTypes,
                'plants' => $plants,
                'areas' => $areas,
                'sectors' => $sectors,
                'assets' => $assets,
                'forms' => $forms,
                'discipline' => $discipline,
                'isCreating' => true,
                'canEdit' => true,
                'canDelete' => false,
                'canApprove' => false,
                'canPlan' => false,
                'canExecute' => false,
                'canValidate' => false,
                'canStart' => false,
                'canComplete' => false,
                'preselectedAssetId' => $preselectedAssetId,
                'preselectedAsset' => $preselectedAsset,
            ]);
        }
        
        // Otherwise, it's an existing work order
        $workOrder = WorkOrder::findOrFail($workOrder);
        $this->authorize('view', $workOrder);

        $workOrder->load([
            'type',
            'asset.plant',
            'asset.area',
            'asset.sector',
            'form.currentVersion',
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

        // Get data for planning tab
        $technicians = User::whereHas('roles', function ($query) {
            $query->whereIn('name', ['Technician', 'Maintenance Supervisor']);
        })->orderBy('name')->get(['id', 'name', 'email']);

        $teams = Team::where('is_active', true)->orderBy('name')->get();

        $parts = Part::select('id', 'part_number', 'name', 'unit_cost', 'available_quantity')
            ->where('active', true)
            ->orderBy('part_number')
            ->get();

        $skills = Skill::orderBy('name')->get(['id', 'name', 'category', 'description']);
        $certifications = Certification::where('active', true)->orderBy('name')->get(['id', 'name', 'issuing_organization', 'validity_period_days', 'description', 'active']);

        // Get user's approval threshold
        $approvalThreshold = null;
        if (auth()->user()->can('approve', $workOrder)) {
            $approvalThreshold = [
                'maxCost' => $this->getUserApprovalCostLimit(auth()->user()),
                'maxPriorityScore' => $this->getUserApprovalPriorityLimit(auth()->user()),
            ];
        }

        // Get data for WorkOrderFormComponent
        $categories = WorkOrderCategory::forDiscipline($workOrder->discipline)
            ->active()
            ->ordered()
            ->get();
        $workOrderTypes = WorkOrderType::active()
            ->with('workOrderCategory')
            ->orderBy('name')
            ->get();
        $assets = Asset::with(['plant', 'area', 'sector', 'assetType'])
            ->orderBy('tag')
            ->get()
            ->map(function ($asset) {
                return [
                    'id' => $asset->id,
                    'tag' => $asset->tag,
                    'name' => $asset->description ?: ($asset->assetType ? $asset->assetType->name : ''),
                    'plant_id' => $asset->plant_id,
                    'area_id' => $asset->area_id,
                    'sector_id' => $asset->sector_id,
                ];
            });
        $plants = Plant::orderBy('name')->get();
        $areas = Area::with('plant')->orderBy('name')->get();
        $sectors = Sector::with('area')->orderBy('name')->get();
        $forms = Form::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('work-orders/show', [
            'workOrder' => $workOrder,
            'users' => $users,
            'discipline' => $workOrder->discipline,
            'isCreating' => false,
            'canEdit' => auth()->user()->can('update', $workOrder),
            'canDelete' => auth()->user()->can('delete', $workOrder),
            'canApprove' => auth()->user()->can('approve', $workOrder),
            'canPlan' => auth()->user()->can('plan', $workOrder),
            'canExecute' => auth()->user()->can('execute', $workOrder),
            'canValidate' => auth()->user()->can('validate', $workOrder),
            'canStart' => auth()->user()->can('start', $workOrder),
            'canComplete' => auth()->user()->can('complete', $workOrder),
            'approvalThreshold' => $approvalThreshold,
            'technicians' => $technicians,
            'teams' => $teams,
            'parts' => $parts,
            'skills' => $skills,
            'certifications' => $certifications,
            // Additional data for WorkOrderFormComponent
            'categories' => $categories,
            'workOrderTypes' => $workOrderTypes,
            'assets' => $assets,
            'plants' => $plants,
            'areas' => $areas,
            'sectors' => $sectors,
            'forms' => $forms,
        ]);
    }

    /**
     * Show the form for editing the work order
     */
    public function edit(WorkOrder $workOrder)
    {
        $this->authorize('update', $workOrder);

        $workOrderTypes = WorkOrderType::active()->orderBy('name')->get();
        $assets = Asset::with(['plant', 'area', 'sector', 'assetType'])
            ->orderBy('tag')
            ->get()
            ->map(function ($asset) {
                return [
                    'id' => $asset->id,
                    'tag' => $asset->tag,
                    'name' => $asset->description ?: ($asset->assetType ? $asset->assetType->name : ''),
                    'plant_id' => $asset->plant_id,
                    'area_id' => $asset->area_id,
                    'sector_id' => $asset->sector_id,
                ];
            });
        $plants = Plant::orderBy('name')->get();
        $areas = Area::with('plant')->orderBy('name')->get();
        $sectors = Sector::with('area')->orderBy('name')->get();
        $forms = Form::where('is_active', true)->orderBy('name')->get();
        $users = User::orderBy('name')->get(['id', 'name']);

        return Inertia::render('work-orders/create', [
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
    public function update(UpdateWorkOrderRequest $request, WorkOrder $workOrder)
    {
        $this->authorize('update', $workOrder);

        $validated = $request->validated();

        $workOrder->update($validated);

        return redirect()->route("{$workOrder->discipline}.work-orders.show", $workOrder)
            ->with('success', 'Ordem de serviço atualizada com sucesso.');
    }

    /**
     * Remove the specified work order
     */
    public function destroy(WorkOrder $workOrder)
    {
        $this->authorize('delete', $workOrder);

        $discipline = $workOrder->discipline;
        $workOrder->delete();

        return redirect()->route("{$discipline}.work-orders.index")
            ->with('success', 'Ordem de serviço excluída com sucesso.');
    }

    /**
     * Approve the work order
     */
    public function approve(ApproveWorkOrderRequest $request, WorkOrder $workOrder)
    {
        $validated = $request->validated();

        // Use reason field if provided, otherwise fall back to notes for backward compatibility
        $reason = $validated['reason'] ?? $validated['notes'] ?? null;

        $success = $workOrder->transitionTo(WorkOrder::STATUS_APPROVED, auth()->user(), $reason);

        if (!$success) {
            return back()->with('error', 'Não foi possível aprovar a ordem de serviço. Status inválido.');
        }

        return back()->with('success', 'Ordem de serviço aprovada com sucesso.');
    }

    /**
     * Reject the work order
     */
    public function reject(RejectWorkOrderRequest $request, WorkOrder $workOrder)
    {
        $validated = $request->validated();

        // Use reason field if provided, otherwise fall back to rejection_reason or notes for backward compatibility
        $reason = $validated['reason'] ?? $validated['rejection_reason'] ?? $validated['notes'] ?? null;
        
        if (!$reason) {
            return back()->with('error', 'A razão da rejeição é obrigatória.');
        }

        $success = $workOrder->transitionTo(WorkOrder::STATUS_REJECTED, auth()->user(), $reason);

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

    /**
     * Show the approval form for the work order
     */
    public function showApproval(WorkOrder $workOrder)
    {
        $this->authorize('approve', $workOrder);

        $workOrder->load([
            'type',
            'asset.plant',
            'asset.area',
            'asset.sector',
            'requestedBy',
        ]);

        // Get user's approval threshold based on role
        $user = auth()->user();
        $approvalThreshold = [
            'maxCost' => $this->getUserApprovalCostLimit($user),
                            'maxPriorityScore' => $this->getUserApprovalPriorityLimit($user),
        ];

        return Inertia::render('work-orders/approve', [
            'workOrder' => $workOrder,
            'canApprove' => $user->can('approve', $workOrder),
            'approvalThreshold' => $approvalThreshold,
        ]);
    }

    /**
     * Show the planning form for the work order
     */
    public function showPlanning(WorkOrder $workOrder)
    {
        $this->authorize('plan', $workOrder);

        if (!in_array($workOrder->status, [WorkOrder::STATUS_APPROVED, WorkOrder::STATUS_PLANNED])) {
            return redirect()->route("{$workOrder->discipline}.work-orders.show", $workOrder)
                ->with('error', 'Esta ordem de serviço não está em status apropriado para planejamento.');
        }

        $workOrder->load([
            'type',
            'asset.plant',
            'asset.area',
            'asset.sector',
            'parts',
            'assignedTechnician',
            'assignedTeam',
        ]);

        // Get available technicians with required skills
        $technicians = User::whereHas('roles', function ($query) {
            $query->where('name', 'technician');
        })->get();

        // Get teams
        $teams = Team::active()->get();

        // Get available parts
        $parts = Part::select('id', 'part_number', 'name', 'unit_cost', 'available_quantity')
            ->where('active', true)
            ->get();

        // Get skills and certifications lists
        $skills = Skill::pluck('name')->toArray();
        $certifications = Certification::pluck('name')->toArray();

        return Inertia::render('work-orders/planning', [
            'workOrder' => $workOrder,
            'technicians' => $technicians,
            'teams' => $teams,
            'parts' => $parts,
            'skills' => $skills,
            'certifications' => $certifications,
            'canPlan' => auth()->user()->can('plan', $workOrder),
        ]);
    }

    /**
     * Save planning data for the work order
     */
    public function savePlanning(PlanWorkOrderRequest $request, WorkOrder $workOrder)
    {
        $validated = $request->validated();

        DB::transaction(function () use ($workOrder, $validated) {
            // Update work order planning fields
            $workOrder->update([
                'estimated_hours' => $validated['estimated_hours'] ?? null,
                'estimated_labor_cost' => $validated['estimated_labor_cost'] ?? null,
                'estimated_parts_cost' => $this->calculatePartsCost($validated['parts'] ?? []),
                'estimated_total_cost' => ($validated['estimated_labor_cost'] ?? 0) + $this->calculatePartsCost($validated['parts'] ?? []),
                'downtime_required' => $validated['downtime_required'] ?? false,
                'other_requirements' => $validated['other_requirements'] ?? [],
                'number_of_people' => $validated['number_of_people'] ?? 1,
                'required_skills' => $validated['required_skills'] ?? [],
                'required_certifications' => $validated['required_certifications'] ?? [],
                'scheduled_start_date' => $validated['scheduled_start_date'] ?? null,
                'scheduled_end_date' => $validated['scheduled_end_date'] ?? null,
                'assigned_team_id' => $validated['assigned_team_id'] ?? null,
                'assigned_technician_id' => $validated['assigned_technician_id'] ?? null,
                'planned_by' => auth()->id(),
                'planned_at' => now(),
            ]);

            // Update or create parts
            if (isset($validated['parts'])) {
                // Remove existing parts
                $workOrder->parts()->delete();

                // Add new parts
                foreach ($validated['parts'] as $part) {
                    $workOrder->parts()->create([
                        'part_id' => $part['part_id'] ?? null,
                        'part_number' => $part['part_number'] ?? null,
                        'part_name' => $part['part_name'],
                        'estimated_quantity' => $part['estimated_quantity'],
                        'unit_cost' => $part['unit_cost'],
                        'total_cost' => $part['estimated_quantity'] * $part['unit_cost'],
                        'status' => WorkOrderPart::STATUS_PLANNED,
                    ]);
                }
            }

            // Update status to planned if not already
            if ($workOrder->status === WorkOrder::STATUS_APPROVED) {
                $workOrder->transitionTo(WorkOrder::STATUS_PLANNED, auth()->user());
            }
        });

        return redirect()->route("{$workOrder->discipline}.work-orders.planning", $workOrder)
            ->with('success', 'Planejamento salvo com sucesso.');
    }

    /**
     * Complete planning and transition to ready to schedule
     */
    public function completePlanning(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('plan', $workOrder);

        // Validate that all required planning fields are filled
        if (!$workOrder->estimated_hours || !$workOrder->scheduled_start_date || !$workOrder->scheduled_end_date) {
            return back()->with('error', 'Por favor, preencha todos os campos obrigatórios do planejamento.');
        }

        $success = $workOrder->transitionTo(WorkOrder::STATUS_SCHEDULED, auth()->user());

        if (!$success) {
            return back()->with('error', 'Não foi possível concluir o planejamento. Status inválido.');
        }

        return redirect()->route("{$workOrder->discipline}.work-orders.show", $workOrder)
            ->with('success', 'Planejamento concluído. Ordem de serviço agendada.');
    }

    /**
     * Get user's approval cost limit based on role
     */
    private function getUserApprovalCostLimit($user)
    {
        if ($user->hasRole('Administrator')) {
            return PHP_INT_MAX;
        } elseif ($user->hasRole('Plant Manager')) {
            return 50000;
        } elseif ($user->hasRole('Maintenance Supervisor')) {
            return 5000;
        }
        return 0;
    }

    /**
     * Get user's approval priority score limit based on role
     */
    private function getUserApprovalPriorityLimit($user)
    {
        if ($user->hasRole('Administrator')) {
            return 100; // Can approve any priority
        } elseif ($user->hasRole('Plant Manager')) {
            return 80; // High priority and below
        } elseif ($user->hasRole('Maintenance Supervisor')) {
            return 60; // Normal priority and below
        }
        return 40; // Low priority only
    }

    /**
     * Calculate total cost of parts
     */
    private function calculatePartsCost($parts)
    {
        return collect($parts)->sum(function ($part) {
            return ($part['estimated_quantity'] ?? 0) * ($part['unit_cost'] ?? 0);
        });
    }


}
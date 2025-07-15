<?php

namespace App\Http\Controllers\WorkOrders;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkOrders\PlanWorkOrderRequest;
use App\Models\Certification;
use App\Models\Part;
use App\Models\Skill;
use App\Models\Team;
use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderPart;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WorkOrderPlanningController extends Controller
{
    /**
     * Show the planning form for the work order
     */
    public function show(WorkOrder $workOrder)
    {
        $this->authorize('plan', $workOrder);

        if (!in_array($workOrder->status, [WorkOrder::STATUS_APPROVED, WorkOrder::STATUS_PLANNED])) {
            return redirect()->route('maintenance.work-orders.show', $workOrder)
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
            $query->whereIn('name', ['Technician', 'Maintenance Supervisor']);
        })->orderBy('name')->get(['id', 'name', 'email']);

        // Get teams
        $teams = Team::where('is_active', true)->orderBy('name')->get();

        // Get available parts
        $parts = Part::select('id', 'part_number', 'name', 'unit_cost', 'available_quantity')
            ->where('active', true)
            ->orderBy('part_number')
            ->get();

        // Get skills and certifications lists
        $skills = Skill::where('active', true)->pluck('name')->toArray();
        $certifications = Certification::where('active', true)->pluck('name')->toArray();

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
     * Store planning data for the work order (initial save)
     */
    public function store(PlanWorkOrderRequest $request, WorkOrder $workOrder)
    {
        return $this->savePlanning($request, $workOrder);
    }

    /**
     * Update planning data for the work order
     */
    public function update(PlanWorkOrderRequest $request, WorkOrder $workOrder)
    {
        return $this->savePlanning($request, $workOrder);
    }

    /**
     * Save planning data (used by both store and update)
     */
    private function savePlanning(PlanWorkOrderRequest $request, WorkOrder $workOrder)
    {
        $validated = $request->validated();

        DB::transaction(function () use ($workOrder, $validated) {
            // Calculate labor cost if hours and rate are provided
            $laborCost = null;
            if (isset($validated['estimated_hours']) && isset($validated['labor_cost_per_hour'])) {
                $laborCost = $validated['estimated_hours'] * $validated['labor_cost_per_hour'];
            }

            // Calculate parts cost
            $partsCost = $this->calculatePartsCost($validated['parts'] ?? []);

            // Update work order planning fields
            $workOrder->update([
                'estimated_hours' => $validated['estimated_hours'] ?? $workOrder->estimated_hours,
                'estimated_labor_cost' => $laborCost ?? $workOrder->estimated_labor_cost,
                'estimated_parts_cost' => $partsCost,
                'estimated_total_cost' => ($laborCost ?? $workOrder->estimated_labor_cost ?? 0) + $partsCost,
                'downtime_required' => $validated['downtime_required'] ?? false,
                'safety_requirements' => $validated['safety_requirements'] ?? [],
                'required_skills' => $validated['required_skills'] ?? [],
                'required_certifications' => $validated['required_certifications'] ?? [],
                'scheduled_start_date' => $validated['scheduled_start_date'] ?? $workOrder->scheduled_start_date,
                'scheduled_end_date' => $validated['scheduled_end_date'] ?? $workOrder->scheduled_end_date,
                'assigned_team_id' => $validated['assigned_team_id'] ?? $workOrder->assigned_team_id,
                'assigned_technician_id' => $validated['assigned_technician_id'] ?? $workOrder->assigned_technician_id,
                'planned_by' => auth()->id(),
                'planned_at' => now(),
            ]);

            // Update or create parts
            if (isset($validated['parts'])) {
                $this->updateParts($workOrder, $validated['parts']);
            }

            // Update status to planned if not already
            if ($workOrder->status === WorkOrder::STATUS_APPROVED) {
                $workOrder->transitionTo(WorkOrder::STATUS_PLANNED, auth()->user(), 'Planejamento iniciado');
            }
        });

        return redirect()->route('maintenance.work-orders.planning', $workOrder)
            ->with('success', 'Planejamento salvo com sucesso.');
    }

    /**
     * Complete planning and transition to ready to schedule
     */
    public function complete(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('plan', $workOrder);

        // Validate that all required planning fields are filled
        if (!$workOrder->estimated_hours || !$workOrder->scheduled_start_date || !$workOrder->scheduled_end_date) {
            return back()->with('error', 'Por favor, preencha todos os campos obrigatórios do planejamento.');
        }

        // Validate that at least one technician or team is assigned
        if (!$workOrder->assigned_technician_id && !$workOrder->assigned_team_id) {
            return back()->with('error', 'Por favor, atribua um técnico ou equipe para executar o trabalho.');
        }

        $success = $workOrder->transitionTo(WorkOrder::STATUS_READY_TO_SCHEDULE, auth()->user(), 'Planejamento concluído');

        if (!$success) {
            return back()->with('error', 'Não foi possível concluir o planejamento. Status inválido.');
        }

        return redirect()->route('maintenance.work-orders.show', $workOrder)
            ->with('success', 'Planejamento concluído. Ordem de serviço pronta para agendamento.');
    }

    /**
     * Update parts for the work order
     */
    private function updateParts(WorkOrder $workOrder, array $partsData)
    {
        $existingIds = [];

        foreach ($partsData as $partData) {
            if (isset($partData['id']) && !str_starts_with($partData['id'], 'new-')) {
                // Update existing part
                $part = WorkOrderPart::find($partData['id']);
                if ($part && $part->work_order_id === $workOrder->id) {
                    $part->update([
                        'part_id' => $partData['part_id'] ?? null,
                        'part_number' => $partData['part_number'] ?? null,
                        'part_name' => $partData['part_name'],
                        'estimated_quantity' => $partData['estimated_quantity'],
                        'unit_cost' => $partData['unit_cost'],
                        'total_cost' => $partData['estimated_quantity'] * $partData['unit_cost'],
                    ]);
                    $existingIds[] = $part->id;
                }
            } else {
                // Create new part
                $part = WorkOrderPart::create([
                    'work_order_id' => $workOrder->id,
                    'part_id' => $partData['part_id'] ?? null,
                    'part_number' => $partData['part_number'] ?? null,
                    'part_name' => $partData['part_name'],
                    'estimated_quantity' => $partData['estimated_quantity'],
                    'unit_cost' => $partData['unit_cost'],
                    'total_cost' => $partData['estimated_quantity'] * $partData['unit_cost'],
                    'status' => WorkOrderPart::STATUS_PLANNED,
                ]);
                $existingIds[] = $part->id;
            }
        }

        // Delete removed parts (only planned status)
        $workOrder->parts()
            ->whereNotIn('id', $existingIds)
            ->where('status', WorkOrderPart::STATUS_PLANNED)
            ->delete();
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
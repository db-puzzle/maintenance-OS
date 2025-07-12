<?php

namespace App\Http\Controllers\WorkOrders;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderPart;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkOrderPlanningController extends Controller
{
    public function edit(WorkOrder $workOrder)
    {
        // Check if work order can be planned
        if (!in_array($workOrder->status, [WorkOrder::STATUS_APPROVED, WorkOrder::STATUS_PLANNED])) {
            return redirect()->route('work-orders.show', $workOrder)
                ->with('error', 'Work order must be approved to plan.');
        }
        
        $workOrder->load([
            'asset',
            'type',
            'form',
            'formVersion.tasks',
            'parts',
        ]);
        
        // Get available technicians
        $technicians = User::whereHas('permissions', function ($query) {
            $query->where('name', 'execute_work_orders');
        })->get();
        
        return Inertia::render('WorkOrders/Planning/Edit', [
            'workOrder' => $workOrder,
            'technicians' => $technicians,
        ]);
    }
    
    public function update(Request $request, WorkOrder $workOrder)
    {
        // Check if work order can be planned
        if (!in_array($workOrder->status, [WorkOrder::STATUS_APPROVED, WorkOrder::STATUS_PLANNED])) {
            return back()->with('error', 'Work order must be approved to plan.');
        }
        
        $validated = $request->validate([
            'estimated_hours' => 'required|numeric|min:0',
            'estimated_parts_cost' => 'required|numeric|min:0',
            'estimated_labor_cost' => 'required|numeric|min:0',
            'downtime_required' => 'boolean',
            'safety_requirements' => 'nullable|array',
            'required_skills' => 'nullable|array',
            'required_certifications' => 'nullable|array',
            'scheduled_start_date' => 'nullable|date',
            'scheduled_end_date' => 'nullable|date|after:scheduled_start_date',
            'assigned_technician_id' => 'nullable|exists:users,id',
            'assigned_team_id' => 'nullable|exists:teams,id',
            'parts' => 'nullable|array',
            'parts.*.id' => 'nullable|exists:work_order_parts,id',
            'parts.*.part_name' => 'required|string',
            'parts.*.part_number' => 'nullable|string',
            'parts.*.estimated_quantity' => 'required|numeric|min:0',
            'parts.*.unit_cost' => 'required|numeric|min:0',
        ]);
        
        // Update work order
        $workOrder->update(array_merge($validated, [
            'estimated_total_cost' => $validated['estimated_parts_cost'] + $validated['estimated_labor_cost'],
            'planned_by' => auth()->id(),
            'planned_at' => now(),
        ]));
        
        // Update parts
        if (isset($validated['parts'])) {
            $this->updateParts($workOrder, $validated['parts']);
        }
        
        // Transition to planned status if not already
        if ($workOrder->status === WorkOrder::STATUS_APPROVED) {
            $workOrder->transitionTo(WorkOrder::STATUS_PLANNED, auth()->user(), 'Planning completed');
        }
        
        // If scheduled, transition to ready
        if ($workOrder->scheduled_start_date && $workOrder->status === WorkOrder::STATUS_PLANNED) {
            $workOrder->transitionTo(WorkOrder::STATUS_READY, auth()->user(), 'Ready to schedule');
        }
        
        return redirect()->route('work-orders.show', $workOrder)
            ->with('success', 'Work order planning updated successfully.');
    }
    
    private function updateParts(WorkOrder $workOrder, array $partsData)
    {
        $existingIds = [];
        
        foreach ($partsData as $partData) {
            if (isset($partData['id'])) {
                // Update existing part
                $part = WorkOrderPart::find($partData['id']);
                if ($part && $part->work_order_id === $workOrder->id) {
                    $part->update([
                        'part_name' => $partData['part_name'],
                        'part_number' => $partData['part_number'] ?? null,
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
                    'part_name' => $partData['part_name'],
                    'part_number' => $partData['part_number'] ?? null,
                    'estimated_quantity' => $partData['estimated_quantity'],
                    'unit_cost' => $partData['unit_cost'],
                    'total_cost' => $partData['estimated_quantity'] * $partData['unit_cost'],
                    'status' => 'planned',
                ]);
                $existingIds[] = $part->id;
            }
        }
        
        // Delete removed parts
        $workOrder->parts()
            ->whereNotIn('id', $existingIds)
            ->where('status', 'planned')
            ->delete();
    }
}
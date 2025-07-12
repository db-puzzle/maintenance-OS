<?php

namespace App\Services\WorkOrders;

use App\Models\WorkOrders\WorkOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WorkOrderService
{
    /**
     * Create a new work order
     */
    public function create(array $data): WorkOrder
    {
        return DB::transaction(function () use ($data) {
            $workOrder = WorkOrder::create($data);
            
            // Log the creation
            Log::info('Work order created', [
                'work_order_id' => $workOrder->id,
                'work_order_number' => $workOrder->work_order_number,
                'created_by' => $data['requested_by'] ?? auth()->id(),
            ]);
            
            // Record initial status in history
            $workOrder->statusHistory()->create([
                'from_status' => null,
                'to_status' => $workOrder->status,
                'changed_by' => $data['requested_by'] ?? auth()->id(),
                'reason' => 'Work order created',
            ]);
            
            return $workOrder;
        });
    }
    
    /**
     * Update a work order
     */
    public function update(WorkOrder $workOrder, array $data): WorkOrder
    {
        $workOrder->update($data);
        
        Log::info('Work order updated', [
            'work_order_id' => $workOrder->id,
            'updated_by' => auth()->id(),
        ]);
        
        return $workOrder;
    }
    
    /**
     * Transition work order status
     */
    public function transitionStatus(WorkOrder $workOrder, string $newStatus, User $user, ?string $reason = null): bool
    {
        if (!$workOrder->canTransitionTo($newStatus)) {
            throw new \Exception("Cannot transition from {$workOrder->status} to {$newStatus}");
        }
        
        return $workOrder->transitionTo($newStatus, $user, $reason);
    }
    
    /**
     * Approve a work order
     */
    public function approve(WorkOrder $workOrder, User $user, ?string $reason = null): bool
    {
        return $this->transitionStatus($workOrder, WorkOrder::STATUS_APPROVED, $user, $reason);
    }
    
    /**
     * Reject a work order
     */
    public function reject(WorkOrder $workOrder, User $user, string $reason): bool
    {
        return $this->transitionStatus($workOrder, WorkOrder::STATUS_REJECTED, $user, $reason);
    }
    
    /**
     * Plan a work order
     */
    public function plan(WorkOrder $workOrder, User $user, array $planningData): WorkOrder
    {
        return DB::transaction(function () use ($workOrder, $user, $planningData) {
            // Update planning fields
            $workOrder->update([
                'estimated_hours' => $planningData['estimated_hours'] ?? null,
                'estimated_parts_cost' => $planningData['estimated_parts_cost'] ?? null,
                'estimated_labor_cost' => $planningData['estimated_labor_cost'] ?? null,
                'required_skills' => $planningData['required_skills'] ?? null,
                'required_certifications' => $planningData['required_certifications'] ?? null,
                'safety_requirements' => $planningData['safety_requirements'] ?? null,
                'downtime_required' => $planningData['downtime_required'] ?? false,
            ]);
            
            // Calculate total estimated cost
            $workOrder->update([
                'estimated_total_cost' => 
                    ($workOrder->estimated_parts_cost ?? 0) + 
                    ($workOrder->estimated_labor_cost ?? 0)
            ]);
            
            // Transition to planned status
            $this->transitionStatus($workOrder, WorkOrder::STATUS_PLANNED, $user);
            
            return $workOrder;
        });
    }
    
    /**
     * Schedule a work order
     */
    public function schedule(WorkOrder $workOrder, User $user, array $scheduleData): WorkOrder
    {
        return DB::transaction(function () use ($workOrder, $user, $scheduleData) {
            // Update scheduling fields
            $workOrder->update([
                'scheduled_start_date' => $scheduleData['scheduled_start_date'],
                'scheduled_end_date' => $scheduleData['scheduled_end_date'],
                'assigned_technician_id' => $scheduleData['assigned_technician_id'] ?? null,
                'assigned_team_id' => $scheduleData['assigned_team_id'] ?? null,
            ]);
            
            // Transition to scheduled status
            $this->transitionStatus($workOrder, WorkOrder::STATUS_SCHEDULED, $user);
            
            // TODO: Send notification to assigned technician
            
            return $workOrder;
        });
    }
    
    /**
     * Put work order on hold
     */
    public function putOnHold(WorkOrder $workOrder, User $user, string $reason): bool
    {
        return $this->transitionStatus($workOrder, WorkOrder::STATUS_ON_HOLD, $user, $reason);
    }
    
    /**
     * Resume work order from hold
     */
    public function resume(WorkOrder $workOrder, User $user, string $toStatus): bool
    {
        if ($workOrder->status !== WorkOrder::STATUS_ON_HOLD) {
            throw new \Exception('Work order is not on hold');
        }
        
        return $this->transitionStatus($workOrder, $toStatus, $user, 'Resumed from hold');
    }
    
    /**
     * Verify completed work order
     */
    public function verify(WorkOrder $workOrder, User $user, ?string $notes = null): bool
    {
        return $this->transitionStatus($workOrder, WorkOrder::STATUS_VERIFIED, $user, $notes);
    }
    
    /**
     * Close work order
     */
    public function close(WorkOrder $workOrder, User $user, ?string $notes = null): bool
    {
        return $this->transitionStatus($workOrder, WorkOrder::STATUS_CLOSED, $user, $notes);
    }
    
    /**
     * Cancel work order
     */
    public function cancel(WorkOrder $workOrder, User $user, string $reason): bool
    {
        return $this->transitionStatus($workOrder, WorkOrder::STATUS_CANCELLED, $user, $reason);
    }
    
    /**
     * Calculate and update priority score
     */
    public function updatePriorityScore(WorkOrder $workOrder): void
    {
        $score = $workOrder->calculatePriorityScore();
        $workOrder->update(['priority_score' => $score]);
    }
    
    /**
     * Get work order statistics
     */
    public function getStatistics(WorkOrder $workOrder): array
    {
        return [
            'status' => $workOrder->status,
            'age_days' => $workOrder->created_at->diffInDays(now()),
            'overdue' => $workOrder->requested_due_date && $workOrder->requested_due_date->isPast(),
            'days_overdue' => $workOrder->requested_due_date 
                ? max(0, $workOrder->requested_due_date->diffInDays(now(), false))
                : 0,
            'estimated_vs_actual' => [
                'hours' => [
                    'estimated' => $workOrder->estimated_hours,
                    'actual' => $workOrder->actual_hours,
                    'variance' => $workOrder->actual_hours 
                        ? round((($workOrder->actual_hours - $workOrder->estimated_hours) / $workOrder->estimated_hours) * 100, 2)
                        : null,
                ],
                'cost' => [
                    'estimated' => $workOrder->estimated_total_cost,
                    'actual' => $workOrder->actual_total_cost,
                    'variance' => $workOrder->actual_total_cost 
                        ? round((($workOrder->actual_total_cost - $workOrder->estimated_total_cost) / $workOrder->estimated_total_cost) * 100, 2)
                        : null,
                ],
            ],
            'completion_percentage' => $workOrder->execution?->completion_percentage ?? 0,
        ];
    }
}
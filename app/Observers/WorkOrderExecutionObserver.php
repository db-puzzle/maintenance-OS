<?php

namespace App\Observers;

use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderExecution;
use Illuminate\Support\Facades\Log;

class WorkOrderExecutionObserver
{
    /**
     * Handle the WorkOrderExecution "created" event.
     */
    public function created(WorkOrderExecution $execution): void
    {
        // Update work order actual start date when execution starts
        if ($execution->started_at && !$execution->workOrder->actual_start_date) {
            $execution->workOrder->update([
                'actual_start_date' => $execution->started_at,
            ]);
        }
    }

    /**
     * Handle the WorkOrderExecution "updated" event.
     */
    public function updated(WorkOrderExecution $execution): void
    {
        // Handle completion
        if ($execution->isDirty('status') && $execution->status === 'completed') {
            $this->handleCompletion($execution);
        }
    }

    /**
     * Handle work order execution completion
     */
    protected function handleCompletion(WorkOrderExecution $execution): void
    {
        $workOrder = $execution->workOrder;
        
        // Update work order with actual values
        $workOrder->update([
            'actual_end_date' => $execution->completed_at ?? now(),
            'actual_hours' => $this->calculateActualHours($execution),
            'status' => 'completed',
        ]);
        
        // If this work order came from a routine, update routine tracking
        if ($workOrder->source_type === 'routine' && $workOrder->source_id) {
            $this->updateRoutineTracking($workOrder);
        }
        
        // Check for follow-up requirements
        if ($execution->follow_up_required) {
            $this->logFollowUpRequired($execution);
        }
    }
    
    /**
     * Calculate actual hours from execution time tracking
     */
    protected function calculateActualHours(WorkOrderExecution $execution): float
    {
        if (!$execution->started_at || !$execution->completed_at) {
            return 0;
        }
        
        $totalMinutes = $execution->started_at->diffInMinutes($execution->completed_at);
        $totalMinutes -= $execution->total_pause_duration ?? 0;
        
        return round($totalMinutes / 60, 2);
    }
    
    /**
     * Update routine tracking after work order completion
     */
    protected function updateRoutineTracking(WorkOrder $workOrder): void
    {
        $routine = Routine::find($workOrder->source_id);
        
        if (!$routine) {
            Log::warning("Routine not found for work order completion tracking", [
                'work_order_id' => $workOrder->id,
                'source_id' => $workOrder->source_id,
            ]);
            return;
        }
        
        $updateData = [
            'last_execution_completed_at' => now(),
        ];
        
        // Only update runtime hours for runtime-based routines
        if ($routine->trigger_type === 'runtime_hours') {
            $currentRuntime = $routine->asset->current_runtime_hours ?? 0;
            $updateData['last_execution_runtime_hours'] = $currentRuntime;
            
            Log::info("Updated runtime tracking for routine", [
                'routine_id' => $routine->id,
                'routine_name' => $routine->name,
                'current_runtime' => $currentRuntime,
                'work_order_number' => $workOrder->work_order_number,
            ]);
        }
        
        // Track the form version used
        if ($workOrder->form_version_id) {
            $updateData['last_execution_form_version_id'] = $workOrder->form_version_id;
        }
        
        $routine->update($updateData);
        
        Log::info("Updated routine tracking after work order completion", [
            'routine_id' => $routine->id,
            'routine_name' => $routine->name,
            'work_order_number' => $workOrder->work_order_number,
            'trigger_type' => $routine->trigger_type,
        ]);
    }
    
    /**
     * Log when follow-up is required
     */
    protected function logFollowUpRequired(WorkOrderExecution $execution): void
    {
        Log::info("Follow-up required for completed work order", [
            'work_order_id' => $execution->work_order_id,
            'work_order_number' => $execution->workOrder->work_order_number,
            'executed_by' => $execution->executed_by,
            'observations' => $execution->observations,
            'recommendations' => $execution->recommendations,
        ]);
    }
} 
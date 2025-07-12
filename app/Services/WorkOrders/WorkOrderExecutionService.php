<?php

namespace App\Services\WorkOrders;

use App\Models\Forms\FormTask;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderExecution;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WorkOrderExecutionService
{
    /**
     * Start execution of a work order
     */
    public function startExecution(WorkOrder $workOrder, User $technician): WorkOrderExecution
    {
        return DB::transaction(function () use ($workOrder, $technician) {
            // Create or get execution
            $execution = $workOrder->execution ?? $workOrder->execution()->create([
                'executed_by' => $technician->id,
                'status' => 'assigned',
            ]);
            
            // Start execution
            $execution->start();
            
            Log::info('Work order execution started', [
                'work_order_id' => $workOrder->id,
                'technician_id' => $technician->id,
                'started_at' => $execution->started_at,
            ]);
            
            return $execution;
        });
    }
    
    /**
     * Submit a task response
     */
    public function submitTaskResponse(
        WorkOrderExecution $execution,
        int $taskId,
        $response,
        array $responseData = null
    ): void {
        $execution->taskResponses()->updateOrCreate(
            ['form_task_id' => $taskId],
            [
                'user_id' => auth()->id(),
                'response' => $response,
                'response_data' => $responseData,
            ]
        );
        
        Log::info('Task response submitted', [
            'work_order_execution_id' => $execution->id,
            'task_id' => $taskId,
            'user_id' => auth()->id(),
        ]);
    }
    
    /**
     * Complete the work order execution
     */
    public function completeExecution(WorkOrderExecution $execution, array $completionData): void
    {
        DB::transaction(function () use ($execution, $completionData) {
            // Validate all required tasks are completed
            if (!$execution->canComplete()) {
                throw new \Exception('Not all required tasks have been completed');
            }
            
            // Update execution data
            $execution->update([
                'work_performed' => $completionData['work_performed'] ?? null,
                'observations' => $completionData['observations'] ?? null,
                'recommendations' => $completionData['recommendations'] ?? null,
                'follow_up_required' => $completionData['follow_up_required'] ?? false,
                'safety_checks_completed' => $completionData['safety_checks_completed'] ?? false,
                'quality_checks_completed' => $completionData['quality_checks_completed'] ?? false,
                'area_cleaned' => $completionData['area_cleaned'] ?? false,
                'tools_returned' => $completionData['tools_returned'] ?? false,
            ]);
            
            // Complete execution
            $execution->complete();
            
            // Create follow-up work order if needed
            if ($execution->follow_up_required && !empty($completionData['follow_up_description'])) {
                $this->createFollowUpWorkOrder($execution, $completionData['follow_up_description']);
            }
            
            Log::info('Work order execution completed', [
                'work_order_id' => $execution->work_order_id,
                'completed_at' => $execution->completed_at,
                'follow_up_required' => $execution->follow_up_required,
            ]);
        });
    }
    
    /**
     * Pause the execution
     */
    public function pauseExecution(WorkOrderExecution $execution): void
    {
        $execution->pause();
        
        Log::info('Work order execution paused', [
            'work_order_id' => $execution->work_order_id,
            'paused_at' => $execution->paused_at,
        ]);
    }
    
    /**
     * Resume the execution
     */
    public function resumeExecution(WorkOrderExecution $execution): void
    {
        $execution->resume();
        
        Log::info('Work order execution resumed', [
            'work_order_id' => $execution->work_order_id,
            'resumed_at' => $execution->resumed_at,
        ]);
    }
    
    /**
     * Create a follow-up work order
     */
    private function createFollowUpWorkOrder(WorkOrderExecution $execution, string $description): WorkOrder
    {
        $originalWorkOrder = $execution->workOrder;
        
        $followUpWorkOrder = WorkOrder::create([
            'title' => 'Follow-up: ' . $originalWorkOrder->title,
            'description' => $description,
            'work_order_type_id' => $originalWorkOrder->work_order_type_id,
            'work_order_category' => 'corrective',
            'priority' => 'normal',
            'asset_id' => $originalWorkOrder->asset_id,
            'related_work_order_id' => $originalWorkOrder->id,
            'relationship_type' => 'follow_up',
            'requested_by' => auth()->id(),
            'source_type' => 'work_order',
            'source_id' => $originalWorkOrder->id,
        ]);
        
        Log::info('Follow-up work order created', [
            'original_work_order_id' => $originalWorkOrder->id,
            'follow_up_work_order_id' => $followUpWorkOrder->id,
        ]);
        
        return $followUpWorkOrder;
    }
    
    /**
     * Get execution statistics
     */
    public function getExecutionStats(WorkOrderExecution $execution): array
    {
        $tasks = $execution->workOrder->getTasks();
        $responses = $execution->taskResponses;
        
        $totalTasks = count($tasks);
        $completedTasks = $responses->count();
        $requiredTasks = collect($tasks)->where('is_required', true)->count();
        $completedRequiredTasks = $responses->whereIn('form_task_id', 
            collect($tasks)->where('is_required', true)->pluck('id')
        )->count();
        
        return [
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'required_tasks' => $requiredTasks,
            'completed_required_tasks' => $completedRequiredTasks,
            'completion_percentage' => $execution->completion_percentage,
            'actual_duration' => $execution->actual_duration,
            'status' => $execution->status,
        ];
    }
}
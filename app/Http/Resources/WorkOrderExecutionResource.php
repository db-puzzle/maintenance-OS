<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkOrderExecutionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'work_order_id' => $this->work_order_id,
            'executed_by' => $this->executed_by,
            'status' => $this->status,
            
            // Timing
            'started_at' => $this->started_at?->format('Y-m-d H:i:s'),
            'paused_at' => $this->paused_at?->format('Y-m-d H:i:s'),
            'resumed_at' => $this->resumed_at?->format('Y-m-d H:i:s'),
            'completed_at' => $this->completed_at?->format('Y-m-d H:i:s'),
            'total_pause_duration' => $this->total_pause_duration,
            'actual_duration' => $this->actual_duration,
            
            // Work details
            'work_performed' => $this->work_performed,
            'observations' => $this->observations,
            'recommendations' => $this->recommendations,
            'follow_up_required' => $this->follow_up_required,
            
            // Completion checklist
            'safety_checks_completed' => $this->safety_checks_completed,
            'quality_checks_completed' => $this->quality_checks_completed,
            'area_cleaned' => $this->area_cleaned,
            'tools_returned' => $this->tools_returned,
            
            // Computed attributes
            'completion_percentage' => $this->completion_percentage,
            'can_complete' => $this->when($request->has('include_completion_status'), function () {
                return $this->canComplete();
            }),
            
            // Relationships
            'work_order' => $this->whenLoaded('workOrder', function () {
                return new WorkOrderResource($this->workOrder);
            }),
            'executed_by_user' => $this->whenLoaded('executedBy', function () {
                return [
                    'id' => $this->executedBy->id,
                    'name' => $this->executedBy->name,
                ];
            }),
            'task_responses' => $this->whenLoaded('taskResponses', function () {
                return $this->taskResponses->map(function ($response) {
                    return [
                        'id' => $response->id,
                        'form_task_id' => $response->form_task_id,
                        'response' => $response->response,
                        'response_data' => $response->response_data,
                        'user_id' => $response->user_id,
                        'created_at' => $response->created_at->format('Y-m-d H:i:s'),
                        'updated_at' => $response->updated_at->format('Y-m-d H:i:s'),
                        'task' => $response->task ? [
                            'id' => $response->task->id,
                            'type' => $response->task->type,
                            'description' => $response->task->description,
                            'is_required' => $response->task->is_required,
                        ] : null,
                    ];
                });
            }),
            
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
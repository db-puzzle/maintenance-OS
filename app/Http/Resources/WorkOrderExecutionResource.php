<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkOrderExecutionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'work_order_id' => $this->work_order_id,
            'executed_by' => $this->executed_by,
            'status' => $this->status,
            'started_at' => $this->started_at?->format('Y-m-d H:i:s'),
            'paused_at' => $this->paused_at?->format('Y-m-d H:i:s'),
            'resumed_at' => $this->resumed_at?->format('Y-m-d H:i:s'),
            'completed_at' => $this->completed_at?->format('Y-m-d H:i:s'),
            'total_pause_duration' => $this->total_pause_duration,
            'actual_duration' => $this->actual_duration,
            'work_performed' => $this->work_performed,
            'observations' => $this->observations,
            'recommendations' => $this->recommendations,
            'follow_up_required' => $this->follow_up_required,
            'safety_checks_completed' => $this->safety_checks_completed,
            'quality_checks_completed' => $this->quality_checks_completed,
            'area_cleaned' => $this->area_cleaned,
            'tools_returned' => $this->tools_returned,
            'completion_percentage' => $this->completion_percentage,
            'can_complete' => $this->when($request->has('include_completion_status'), function () {
                return $this->canComplete();
            }),
            'work_order' => $this->whenLoaded('workOrder', function () {
                return new WorkOrderResource($this->workOrder);
            }),
            'executed_by_user' => $this->whenLoaded('executedBy', function () {
                return [
                    'id' => $this->executedBy->id,
                    'name' => $this->executedBy->name,
                ];
            }),
            'task_responses' => $this->whenLoaded('taskResponses'),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
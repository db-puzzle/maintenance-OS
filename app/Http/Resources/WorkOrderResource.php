<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkOrderResource extends JsonResource
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
            'work_order_number' => $this->work_order_number,
            'title' => $this->title,
            'description' => $this->description,
            'work_order_type_id' => $this->work_order_type_id,
            'work_order_category' => $this->work_order_category,
            'priority' => $this->priority,
            'priority_score' => $this->priority_score,
            'status' => $this->status,
            
            // Asset
            'asset_id' => $this->asset_id,
            'asset' => $this->whenLoaded('asset', function () {
                return [
                    'id' => $this->asset->id,
                    'tag' => $this->asset->tag,
                    'description' => $this->asset->description,
                    'plant' => $this->asset->plant?->name,
                    'area' => $this->asset->area?->name,
                    'sector' => $this->asset->sector?->name,
                ];
            }),
            
            // Type
            'type' => $this->whenLoaded('type'),
            
            // Form
            'form_id' => $this->form_id,
            'form' => $this->whenLoaded('form'),
            'form_version' => $this->whenLoaded('formVersion'),
            'custom_tasks' => $this->custom_tasks,
            
            // Planning
            'estimated_hours' => $this->estimated_hours,
            'estimated_parts_cost' => $this->estimated_parts_cost,
            'estimated_labor_cost' => $this->estimated_labor_cost,
            'estimated_total_cost' => $this->estimated_total_cost,
            'downtime_required' => $this->downtime_required,
            'safety_requirements' => $this->safety_requirements,
            
            // Scheduling
            'requested_due_date' => $this->requested_due_date?->format('Y-m-d H:i:s'),
            'scheduled_start_date' => $this->scheduled_start_date?->format('Y-m-d H:i:s'),
            'scheduled_end_date' => $this->scheduled_end_date?->format('Y-m-d H:i:s'),
            
            // Assignment
            'assigned_team_id' => $this->assigned_team_id,
            'assigned_technician_id' => $this->assigned_technician_id,
            'assigned_technician' => $this->whenLoaded('assignedTechnician', function () {
                return [
                    'id' => $this->assignedTechnician->id,
                    'name' => $this->assignedTechnician->name,
                ];
            }),
            'required_skills' => $this->required_skills,
            'required_certifications' => $this->required_certifications,
            
            // Execution
            'actual_start_date' => $this->actual_start_date?->format('Y-m-d H:i:s'),
            'actual_end_date' => $this->actual_end_date?->format('Y-m-d H:i:s'),
            'actual_hours' => $this->actual_hours,
            'actual_parts_cost' => $this->actual_parts_cost,
            'actual_labor_cost' => $this->actual_labor_cost,
            'actual_total_cost' => $this->actual_total_cost,
            
            // Execution details
            'execution' => $this->whenLoaded('execution', function () {
                return new WorkOrderExecutionResource($this->execution);
            }),
            
            // Source
            'source_type' => $this->source_type,
            'source_id' => $this->source_id,
            
            // Relationships
            'related_work_order_id' => $this->related_work_order_id,
            'relationship_type' => $this->relationship_type,
            'related_work_orders' => $this->whenLoaded('relatedWorkOrders'),
            'related_to' => $this->whenLoaded('relatedTo'),
            
            // People
            'requested_by' => $this->requested_by,
            'approved_by' => $this->approved_by,
            'planned_by' => $this->planned_by,
            'verified_by' => $this->verified_by,
            'closed_by' => $this->closed_by,
            
            // Timestamps
            'requested_at' => $this->requested_at?->format('Y-m-d H:i:s'),
            'approved_at' => $this->approved_at?->format('Y-m-d H:i:s'),
            'planned_at' => $this->planned_at?->format('Y-m-d H:i:s'),
            'verified_at' => $this->verified_at?->format('Y-m-d H:i:s'),
            'closed_at' => $this->closed_at?->format('Y-m-d H:i:s'),
            
            // Metadata
            'external_reference' => $this->external_reference,
            'warranty_claim' => $this->warranty_claim,
            'attachments' => $this->attachments,
            'tags' => $this->tags,
            
            // Related data
            'parts' => $this->whenLoaded('parts'),
            'status_history' => $this->whenLoaded('statusHistory'),
            'failure_analysis' => $this->whenLoaded('failureAnalysis'),
            
            // Computed attributes
            'is_overdue' => $this->requested_due_date && $this->requested_due_date->isPast() && !in_array($this->status, ['completed', 'verified', 'closed', 'cancelled']),
            'can_transition_to' => $this->when($request->has('include_transitions'), function () {
                return array_values(\App\Models\WorkOrders\WorkOrder::STATUS_TRANSITIONS[$this->status] ?? []);
            }),
            
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
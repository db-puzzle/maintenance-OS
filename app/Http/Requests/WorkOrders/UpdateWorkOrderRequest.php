<?php

namespace App\Http\Requests\WorkOrders;

use App\Models\WorkOrders\WorkOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled in controller
    }

    public function rules(): array
    {
        $workOrder = $this->route('work_order');
        
        // Only allow certain fields to be updated based on status
        $allowedFields = $this->getAllowedFieldsByStatus($workOrder);
        
        $rules = [];
        
        if (in_array('title', $allowedFields)) {
            $rules['title'] = 'sometimes|required|string|max:255';
        }
        
        if (in_array('description', $allowedFields)) {
            $rules['description'] = 'nullable|string';
        }
        
        if (in_array('priority', $allowedFields)) {
            $rules['priority'] = 'sometimes|required|in:emergency,urgent,high,normal,low';
        }
        
        if (in_array('requested_due_date', $allowedFields)) {
            $rules['requested_due_date'] = 'nullable|date|after:today';
        }
        
        if (in_array('custom_tasks', $allowedFields)) {
            $rules['custom_tasks'] = 'nullable|array';
            $rules['custom_tasks.*.description'] = 'required_with:custom_tasks|string';
            $rules['custom_tasks.*.type'] = 'required_with:custom_tasks|string';
            $rules['custom_tasks.*.is_required'] = 'required_with:custom_tasks|boolean';
        }
        
        if (in_array('external_reference', $allowedFields)) {
            $rules['external_reference'] = 'nullable|string|max:255';
        }
        
        return $rules;
    }

    protected function getAllowedFieldsByStatus(WorkOrder $workOrder): array
    {
        switch ($workOrder->status) {
            case WorkOrder::STATUS_REQUESTED:
                return ['title', 'description', 'priority', 'requested_due_date', 'custom_tasks', 'external_reference'];
            case WorkOrder::STATUS_APPROVED:
            case WorkOrder::STATUS_PLANNED:
                return ['priority', 'requested_due_date', 'external_reference'];
            default:
                return ['external_reference']; // Very limited updates once work has started
        }
    }

    public function messages(): array
    {
        return [
            'requested_due_date.after' => 'The due date must be in the future.',
        ];
    }
}
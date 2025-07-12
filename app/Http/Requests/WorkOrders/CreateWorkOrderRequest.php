<?php

namespace App\Http\Requests\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;

class CreateWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled in controller
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'work_order_type_id' => 'required|exists:work_order_types,id',
            'priority' => 'required|in:emergency,urgent,high,normal,low',
            'asset_id' => 'required|exists:assets,id',
            'form_id' => 'nullable|exists:forms,id',
            'custom_tasks' => 'nullable|array',
            'custom_tasks.*.description' => 'required_with:custom_tasks|string',
            'custom_tasks.*.type' => 'required_with:custom_tasks|string',
            'custom_tasks.*.is_required' => 'required_with:custom_tasks|boolean',
            'requested_due_date' => 'nullable|date|after:today',
            'estimated_hours' => 'nullable|numeric|min:0|max:999.99',
            'estimated_parts_cost' => 'nullable|numeric|min:0|max:999999.99',
            'estimated_labor_cost' => 'nullable|numeric|min:0|max:999999.99',
            'downtime_required' => 'boolean',
            'safety_requirements' => 'nullable|array',
            'safety_requirements.*' => 'string',
            'external_reference' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'work_order_type_id.required' => 'Please select a work order type.',
            'work_order_type_id.exists' => 'The selected work order type is invalid.',
            'asset_id.required' => 'Please select an asset.',
            'asset_id.exists' => 'The selected asset is invalid.',
            'form_id.exists' => 'The selected form is invalid.',
            'requested_due_date.after' => 'The due date must be in the future.',
        ];
    }

    protected function prepareForValidation()
    {
        // Set default values
        $this->merge([
            'downtime_required' => $this->downtime_required ?? false,
        ]);
    }
}
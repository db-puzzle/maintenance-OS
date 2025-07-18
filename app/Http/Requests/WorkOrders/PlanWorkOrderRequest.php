<?php

namespace App\Http\Requests\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\WorkOrders\WorkOrder;

class PlanWorkOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $workOrder = $this->route('workOrder');
        return $this->user()->can('plan', $workOrder) && 
               in_array($workOrder->status, [WorkOrder::STATUS_APPROVED, WorkOrder::STATUS_PLANNED]);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'estimated_hours' => 'nullable|numeric|min:0.5|max:999',
            'labor_cost_per_hour' => 'nullable|numeric|min:0|max:9999',
            'estimated_labor_cost' => 'nullable|numeric|min:0',
            'downtime_required' => 'boolean',
            
            'safety_requirements' => 'nullable|array|max:10',
            'safety_requirements.*' => 'string|max:255',
            
            'required_skills' => 'nullable|array|max:10',
            'required_skills.*' => 'string|max:100',
            
            'required_certifications' => 'nullable|array|max:10',
            'required_certifications.*' => 'string|max:100',
            
            'parts' => 'nullable|array|max:50',
            'parts.*.part_id' => 'nullable|exists:parts,id',
            'parts.*.part_number' => 'nullable|string|max:50',
            'parts.*.part_name' => 'required|string|max:255',
            'parts.*.estimated_quantity' => 'required|integer|min:1|max:9999',
            'parts.*.unit_cost' => 'required|numeric|min:0|max:999999',
            
            'scheduled_start_date' => 'nullable|date|after_or_equal:today',
            'scheduled_end_date' => 'nullable|date|after:scheduled_start_date',
            
            'assigned_team_id' => 'nullable|exists:teams,id',
            'assigned_technician_id' => 'nullable|exists:users,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'estimated_hours.min' => 'O tempo estimado deve ser pelo menos 0.5 horas.',
            'estimated_hours.max' => 'O tempo estimado não pode exceder 999 horas.',
            
            'safety_requirements.max' => 'Você pode adicionar no máximo 10 requisitos de segurança.',
            'required_skills.max' => 'Você pode adicionar no máximo 10 habilidades.',
            'required_certifications.max' => 'Você pode adicionar no máximo 10 certificações.',
            
            'parts.max' => 'Você pode adicionar no máximo 50 peças.',
            'parts.*.part_name.required' => 'O nome da peça é obrigatório.',
            'parts.*.estimated_quantity.required' => 'A quantidade é obrigatória.',
            'parts.*.estimated_quantity.min' => 'A quantidade deve ser pelo menos 1.',
            'parts.*.unit_cost.required' => 'O custo unitário é obrigatório.',
            
            'scheduled_start_date.after_or_equal' => 'A data de início deve ser hoje ou futura.',
            'scheduled_end_date.after' => 'A data de término deve ser após a data de início.',
            
            'assigned_team_id.exists' => 'A equipe selecionada não existe.',
            'assigned_technician_id.exists' => 'O técnico selecionado não existe.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null for nullable fields
        $nullableFields = [
            'estimated_hours', 'labor_cost_per_hour', 'scheduled_start_date', 
            'scheduled_end_date', 'assigned_team_id', 'assigned_technician_id'
        ];

        foreach ($nullableFields as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $this->merge([$field => null]);
            }
        }

        // Ensure boolean value for downtime_required
        if ($this->has('downtime_required')) {
            $this->merge([
                'downtime_required' => filter_var($this->input('downtime_required'), FILTER_VALIDATE_BOOLEAN)
            ]);
        }
    }
} 
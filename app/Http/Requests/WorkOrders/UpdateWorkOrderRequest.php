<?php

namespace App\Http\Requests\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('work_order'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $workOrder = $this->route('work_order');
        
        // Only allow certain fields to be updated based on status
        $rules = [];
        
        if (in_array($workOrder->status, ['pending', 'approved'])) {
            $rules = [
                'work_order_type_id' => 'sometimes|exists:work_order_types,id',
                'title' => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'priority' => 'sometimes|in:critical,high,medium,low',
                'asset_id' => 'nullable|exists:assets,id',
                'plant_id' => 'sometimes|exists:plants,id',
                'form_id' => 'nullable|exists:forms,id',
                'assigned_to' => 'nullable|exists:users,id',
                'scheduled_start_date' => 'nullable|date',
                'scheduled_end_date' => 'nullable|date|after_or_equal:scheduled_start_date',
                'estimated_hours' => 'nullable|numeric|min:0|max:9999',
                'estimated_cost' => 'nullable|numeric|min:0|max:999999.99',
                'notes' => 'nullable|string|max:5000',
            ];
        } elseif ($workOrder->status === 'in_progress') {
            // Limited updates during execution
            $rules = [
                'notes' => 'nullable|string|max:5000',
                'estimated_hours' => 'nullable|numeric|min:0|max:9999',
            ];
        }
        
        return $rules;
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'work_order_type_id' => 'tipo de ordem',
            'title' => 'título',
            'description' => 'descrição',
            'priority' => 'prioridade',
            'asset_id' => 'ativo',
            'plant_id' => 'planta',
            'form_id' => 'formulário',
            'assigned_to' => 'responsável',
            'scheduled_start_date' => 'data de início programada',
            'scheduled_end_date' => 'data de término programada',
            'estimated_hours' => 'horas estimadas',
            'estimated_cost' => 'custo estimado',
            'notes' => 'observações',
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'scheduled_end_date.after_or_equal' => 'A data de término deve ser posterior ou igual à data de início.',
        ];
    }
}
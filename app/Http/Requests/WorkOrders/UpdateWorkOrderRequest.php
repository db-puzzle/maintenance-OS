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
        return $this->user()->can('update', $this->route('workOrder'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $workOrder = $this->route('workOrder');
        
        // Only allow certain fields to be updated based on status
        $rules = [];
        
        if ($workOrder->status === 'requested') {
            $rules = [
                'work_order_type_id' => 'sometimes|exists:work_order_types,id',
                'work_order_category_id' => 'sometimes|exists:work_order_categories,id',
                'title' => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'priority' => 'sometimes|in:emergency,urgent,high,normal,low',
                'priority_score' => 'sometimes|integer|min:0|max:100',
                'asset_id' => 'nullable|exists:assets,id',
                'plant_id' => 'sometimes|exists:plants,id',
                'area_id' => 'sometimes|exists:areas,id',
                'sector_id' => 'nullable|exists:sectors,id',
                'form_id' => 'nullable|exists:forms,id',
                'assigned_to' => 'nullable|exists:users,id',
                'requested_due_date' => 'nullable|date',
                'scheduled_start_date' => 'nullable|date',
                'scheduled_end_date' => 'nullable|date|after_or_equal:scheduled_start_date',
                'estimated_hours' => 'nullable|numeric|min:0|max:9999',
                'estimated_cost' => 'nullable|numeric|min:0|max:999999.99',
                'downtime_required' => 'sometimes|boolean',
                'external_reference' => 'nullable|string|max:255',
                'warranty_claim' => 'sometimes|boolean',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'notes' => 'nullable|string|max:5000',
            ];
        } elseif ($workOrder->status === 'in_progress') {
            // Limited updates during execution
            $rules = [
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
            'work_order_category_id' => 'categoria',
            'title' => 'título',
            'description' => 'descrição',
            'priority' => 'prioridade',
            'priority_score' => 'pontuação de prioridade',
            'asset_id' => 'ativo',
            'plant_id' => 'planta',
            'area_id' => 'área',
            'sector_id' => 'setor',
            'form_id' => 'formulário',
            'assigned_to' => 'responsável',
            'requested_due_date' => 'data de vencimento solicitada',
            'scheduled_start_date' => 'data de início programada',
            'scheduled_end_date' => 'data de término programada',
            'estimated_hours' => 'horas estimadas',
            'estimated_cost' => 'custo estimado',
            'downtime_required' => 'parada requerida',
            'external_reference' => 'referência externa',
            'warranty_claim' => 'garantia',
            'tags' => 'etiquetas',
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'scheduled_end_date.after_or_equal' => 'A data de término deve ser posterior ou igual à data de início.',
            'priority_score.min' => 'A pontuação de prioridade deve ser no mínimo 0.',
            'priority_score.max' => 'A pontuação de prioridade deve ser no máximo 100.',
        ];
    }
}
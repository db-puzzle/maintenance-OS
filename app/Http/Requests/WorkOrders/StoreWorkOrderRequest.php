<?php

namespace App\Http\Requests\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('work-orders.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Determine discipline from route prefix
        $discipline = str_contains($this->route()->getPrefix(), 'quality') ? 'quality' : 'maintenance';
        
        $rules = [
            'source_type' => ['required', 'string'],
            'source_id' => 'nullable|integer',
            'work_order_type_id' => 'required|exists:work_order_types,id',
            'work_order_category_id' => 'required|exists:work_order_categories,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority_score' => 'required|integer|min:0|max:100',
            'form_id' => 'nullable|exists:forms,id',
            'form_version_id' => 'nullable|exists:form_versions,id',
            'custom_tasks' => 'nullable|array',
            'requested_due_date' => 'nullable|date',
            'scheduled_start_date' => 'nullable|date',
            'scheduled_end_date' => 'nullable|date|after_or_equal:scheduled_start_date',
            'assigned_team_id' => 'nullable|exists:teams,id',
            'assigned_technician_id' => 'nullable|exists:users,id',
            'required_skills' => 'nullable|array',
            'required_certifications' => 'nullable|array',
            'estimated_hours' => 'nullable|numeric|min:0|max:9999',
            'estimated_parts_cost' => 'nullable|numeric|min:0|max:999999.99',
            'estimated_labor_cost' => 'nullable|numeric|min:0|max:999999.99',
            'downtime_required' => 'nullable|boolean',
            'safety_requirements' => 'nullable|array',
            'external_reference' => 'nullable|string|max:255',
            'warranty_claim' => 'nullable|boolean',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
        ];
        
        // Discipline-specific validation
        if ($discipline === 'maintenance') {
            $rules['asset_id'] = 'required|exists:assets,id';
            
            $rules['work_order_category_id'] = ['required', Rule::exists('work_order_categories', 'id')->where('discipline', 'maintenance')];
            
            $rules['source_type'] = ['required', Rule::in(['manual', 'routine', 'sensor', 'inspection'])];
            
            if ($this->input('source_type') === 'routine') {
                $rules['source_id'] = 'required|exists:routines,id';
            }
        } elseif ($discipline === 'quality') {
            $rules['work_order_category_id'] = ['required', Rule::exists('work_order_categories', 'id')->where('discipline', 'quality')];
            
            $rules['source_type'] = ['required', Rule::in(['manual', 'calibration_schedule', 'quality_alert', 'audit', 'complaint'])];
            
            // Check if it's a calibration category
            $categoryId = $this->input('work_order_category_id');
            
            if ($categoryId && \App\Models\WorkOrders\WorkOrderCategory::find($categoryId)?->code === 'calibration') {
                $rules['instrument_id'] = 'required|exists:instruments,id';
                $rules['calibration_due_date'] = 'required|date';
            }
            
            // Quality-specific fields
            $rules['certificate_number'] = 'nullable|string|max:100';
            $rules['compliance_standard'] = 'nullable|string|max:100';
            $rules['tolerance_specs'] = 'nullable|array';
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
            'asset_id' => 'ativo',
            'instrument_id' => 'instrumento',
            'form_id' => 'formulário',
            'source_type' => 'tipo de origem',
            'source_id' => 'origem',
            'assigned_team_id' => 'equipe',
            'assigned_technician_id' => 'técnico responsável',
            'scheduled_start_date' => 'data de início programada',
            'scheduled_end_date' => 'data de término programada',
            'estimated_hours' => 'horas estimadas',
            'estimated_parts_cost' => 'custo estimado de peças',
            'estimated_labor_cost' => 'custo estimado de mão de obra',
            'requested_due_date' => 'prazo solicitado',
            'priority_score' => 'pontuação de prioridade',
            'downtime_required' => 'parada necessária',
            'safety_requirements' => 'requisitos de segurança',
            'external_reference' => 'referência externa',
            'warranty_claim' => 'garantia',
            'tags' => 'etiquetas',
            'calibration_due_date' => 'data de calibração',
            'certificate_number' => 'número do certificado',
            'compliance_standard' => 'padrão de conformidade',
            'tolerance_specs' => 'especificações de tolerância',
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'scheduled_end_date.after_or_equal' => 'A data de término deve ser posterior ou igual à data de início.',
            'asset_id.required' => 'O ativo é obrigatório para ordens de manutenção.',
            'instrument_id.required' => 'O instrumento é obrigatório para ordens de calibração.',
            'source_id.required' => 'A origem é obrigatória quando o tipo de origem é :source_type.',
        ];
    }
    
    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Determine discipline from route prefix
        $discipline = str_contains($this->route()->getPrefix(), 'quality') ? 'quality' : 'maintenance';
        
        $this->merge([
            'discipline' => $discipline,
            'requested_by' => $this->user()->id,
        ]);
    }
} 
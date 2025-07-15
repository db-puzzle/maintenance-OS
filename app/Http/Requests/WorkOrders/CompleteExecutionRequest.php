<?php

namespace App\Http\Requests\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;

class CompleteExecutionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('complete', $this->route('workOrder'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'work_performed' => 'required|string|max:5000',
            'observations' => 'nullable|string|max:5000',
            'recommendations' => 'nullable|string|max:5000',
            'follow_up_required' => 'required|boolean',
            'safety_checks_completed' => 'required|boolean',
            'quality_checks_completed' => 'required|boolean',
            'tools_returned' => 'required|boolean',
            'area_cleaned' => 'required|boolean',
            'actual_hours' => 'nullable|numeric|min:0|max:9999',
            'actual_cost' => 'nullable|numeric|min:0|max:999999.99',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'work_performed' => 'trabalho realizado',
            'observations' => 'observações',
            'recommendations' => 'recomendações',
            'follow_up_required' => 'acompanhamento necessário',
            'safety_checks_completed' => 'verificações de segurança',
            'quality_checks_completed' => 'verificações de qualidade',
            'tools_returned' => 'ferramentas devolvidas',
            'area_cleaned' => 'área limpa',
            'actual_hours' => 'horas reais',
            'actual_cost' => 'custo real',
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'work_performed.required' => 'Você deve descrever o trabalho realizado.',
            'follow_up_required.required' => 'Você deve indicar se é necessário acompanhamento.',
            'safety_checks_completed.required' => 'Você deve confirmar que as verificações de segurança foram concluídas.',
            'quality_checks_completed.required' => 'Você deve confirmar que as verificações de qualidade foram concluídas.',
            'tools_returned.required' => 'Você deve confirmar que as ferramentas foram devolvidas.',
            'area_cleaned.required' => 'Você deve confirmar que a área foi limpa.',
        ];
    }
} 
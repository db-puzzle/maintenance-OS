<?php

namespace App\Http\Requests\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;

class RejectWorkOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('approve', $this->route('workOrder'));
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'rejection_reason' => 'required|string|min:10|max:1000',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'rejection_reason.required' => 'O motivo da rejeição é obrigatório.',
            'rejection_reason.min' => 'O motivo da rejeição deve ter pelo menos 10 caracteres.',
            'rejection_reason.max' => 'O motivo da rejeição não pode ter mais de 1000 caracteres.',
        ];
    }
} 
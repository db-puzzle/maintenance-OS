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
            'reason' => 'required_without_all:rejection_reason,notes|string|min:10|max:1000',
            'rejection_reason' => 'required_without_all:reason,notes|string|min:10|max:1000', // Kept for backward compatibility
            'notes' => 'required_without_all:reason,rejection_reason|string|min:10|max:1000', // Kept for backward compatibility
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'reason.required_without_all' => 'A razão da rejeição é obrigatória.',
            'reason.min' => 'A razão da rejeição deve ter pelo menos 10 caracteres.',
            'reason.max' => 'A razão da rejeição não pode ter mais de 1000 caracteres.',
            'rejection_reason.required_without_all' => 'A razão da rejeição é obrigatória.',
            'rejection_reason.min' => 'A razão da rejeição deve ter pelo menos 10 caracteres.',
            'rejection_reason.max' => 'A razão da rejeição não pode ter mais de 1000 caracteres.',
            'notes.required_without_all' => 'A razão da rejeição é obrigatória.',
            'notes.min' => 'A razão da rejeição deve ter pelo menos 10 caracteres.',
            'notes.max' => 'A razão da rejeição não pode ter mais de 1000 caracteres.',
        ];
    }
} 
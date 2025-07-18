<?php

namespace App\Http\Requests\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;

class ApproveWorkOrderRequest extends FormRequest
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
            'reason' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000', // Kept for backward compatibility
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'reason.max' => 'A razão não pode ter mais de 1000 caracteres.',
            'notes.max' => 'As notas não podem ter mais de 1000 caracteres.',
        ];
    }
} 
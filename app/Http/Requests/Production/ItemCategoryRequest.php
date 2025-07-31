<?php

namespace App\Http\Requests\Production;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ItemCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization is handled in the controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $category = $this->route('category');
        
        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('item_categories')->ignore($category?->id),
            ],
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nome',
            'description' => 'descrição',
            'is_active' => 'ativo',
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'O nome da categoria é obrigatório.',
            'name.unique' => 'Já existe uma categoria com este nome.',
            'name.max' => 'O nome não pode ter mais de 100 caracteres.',
            'is_active.boolean' => 'O campo ativo deve ser verdadeiro ou falso.',
        ];
    }
}
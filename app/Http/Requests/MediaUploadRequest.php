<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MediaUploadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization is handled in controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:51200', // 50MB
                'mimes:jpg,jpeg,png,webp,heic,pdf,xlsx,xls,csv,doc,docx',
            ],
            'model_type' => 'required|string|in:item,work_order,work_order_execution,user,qr_tag_template',
            'model_id' => 'required',
            'collection' => 'required|string',
            'caption' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:255',
            'is_primary' => 'boolean',
            'check_duplicates' => 'boolean',
            'allow_duplicates' => 'boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.max' => 'The file size must not exceed 50MB.',
            'file.mimes' => 'The file must be an image, PDF, or document.',
            'model_type.in' => 'The selected model type is invalid.',
        ];
    }
}

import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

type FormDataType = Record<string, string | number | boolean | File | null | undefined>;

export interface UseEntityFormConfig<TFormData extends FormDataType> {
    initialData: TFormData;
    entity?: Record<string, unknown>;
    mode?: 'create' | 'edit';
    transformEntityToForm?: (entity: Record<string, unknown>) => Partial<TFormData>;
}

export function useEntityForm<TFormData extends FormDataType>({
    initialData,
    entity,
    mode = 'create',
    transformEntityToForm,
}: UseEntityFormConfig<TFormData>) {
    const isEditMode = mode === 'edit' && entity;

    const form = useForm<TFormData>(initialData);

    // Update form data when entity changes (for edit mode)
    useEffect(() => {
        if (isEditMode && entity) {
            if (transformEntityToForm) {
                // Use custom transform function if provided
                const transformedData = transformEntityToForm(entity);
                Object.entries(transformedData).forEach(([key, value]) => {
                    form.setData(key as keyof TFormData, value);
                });
            } else {
                // Default: map entity fields to form fields
                Object.keys(initialData).forEach((key) => {
                    if (entity[key] !== undefined && entity[key] !== null) {
                        const value = entity[key];
                        // Only assign if the value is a valid form data type
                        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof File) {
                            form.setData(key as keyof TFormData, value as TFormData[keyof TFormData]);
                        }
                    }
                });
            }
        } else if (!isEditMode) {
            // Reset to initial data for create mode
            form.reset();
        }
    }, [entity, isEditMode, mode]);

    return {
        ...form,
        isEditMode,
    };
}

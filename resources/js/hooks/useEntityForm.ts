import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export interface UseEntityFormConfig<TFormData> {
    initialData: TFormData;
    entity?: any;
    mode?: 'create' | 'edit';
    transformEntityToForm?: (entity: any) => Partial<TFormData>;
}

export function useEntityForm<TFormData extends Record<string, any>>({
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
                    if (entity[key] !== undefined) {
                        form.setData(key as keyof TFormData, entity[key]);
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

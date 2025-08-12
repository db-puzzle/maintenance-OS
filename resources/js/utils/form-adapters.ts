/**
 * Utility functions to adapt Inertia.js form objects to match component expectations
 */

type FormValue = string | number | boolean | File | null | undefined;

// Match Inertia's actual type structure
type setDataByObject<TForm> = (data: TForm) => void;
type setDataByMethod<TForm> = (data: (previousData: TForm) => TForm) => void;
type setDataByKeyValuePair<TForm> = <K extends keyof TForm>(key: K, value: TForm[K]) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InertiaFormSetData<T extends Record<string, any>> =
    setDataByObject<T> &
    setDataByMethod<T> &
    setDataByKeyValuePair<T>;

interface ComponentFormSetData {
    (key: string, value: FormValue): void;
    <K extends string>(key: K, value: FormValue): void;
    (values: Record<string, FormValue>): void;
    <T extends Record<string, FormValue>>(values: T | ((prev: T) => T)): void;
}

/**
 * Creates an adapter that converts Inertia's setData to the overloaded signature expected by components
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSetDataAdapter<T extends Record<string, any>>(
    inertiaSetData: InertiaFormSetData<T>
): ComponentFormSetData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function adaptedSetData(...args: any[]) {
        if (args.length === 2) {
            // Single key-value update
            const [key, value] = args;
            inertiaSetData(key as keyof T, value as T[keyof T]);
        } else if (args.length === 1) {
            const arg = args[0];
            if (typeof arg === 'function') {
                // Functional update - wrap to ensure proper typing
                inertiaSetData((prev: T) => {
                    const result = arg(prev);
                    // Ensure we return a complete object, not a partial
                    return { ...prev, ...result } as T;
                });
            } else {
                // Object update - ensure we pass complete object
                inertiaSetData((prev: T) => ({ ...prev, ...arg } as T));
            }
        }
    } as ComponentFormSetData;
}

/**
 * Creates a form adapter object that matches the InertiaForm interface expected by TextInput
 * This adapter is flexible and can work with any form structure
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createFormAdapter<T extends Record<string, any>>(form: {
    data: T;
    setData: InertiaFormSetData<T>;
    errors: Partial<Record<keyof T, string>>;
    clearErrors: (...fields: (keyof T)[]) => void;
}) {
    return {
        data: form.data as Record<string, FormValue>,
        setData: createSetDataAdapter(form.setData),
        errors: form.errors as Partial<Record<string, string>>,
        clearErrors: (...fields: string[]) => form.clearErrors(...(fields as (keyof T)[]))
    };
}

/**
 * Helper type to extract form data type from useForm return value
 */
export type ExtractFormData<T> = T extends { data: infer D } ? D : never;

import { forwardRef } from 'react';
import { Input } from './ui/input';

type FormValue = string | number | boolean | File | null | undefined;

interface FormObject {
    data: Record<string, FormValue>;
    setData?: {
        (key: string, value: FormValue): void;
        <K extends string>(key: K, value: FormValue): void;
        (values: Record<string, FormValue>): void;
        <T extends Record<string, FormValue>>(values: T | ((prev: T) => T)): void;
    };
    errors?: Partial<Record<string, string>>;
    clearErrors?: (...fields: string[]) => void;
    processBlur?: (name: string, value: string) => void;
}

interface SmartInputProps {
    form: FormObject;
    name: string;
    placeholder?: string;
    type?: string;
    className?: string;
    disabled?: boolean;
    view?: boolean;
    min?: string | number;
    max?: string | number;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    validateInput?: (value: string) => boolean;
    hasError?: boolean;
}

const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
    ({ form, name, placeholder, type = 'text', className, disabled = false, view = false, min, max, onBlur, validateInput, hasError = false }, ref) => {
        const { data, setData, errors, clearErrors } = form;
        return (
            <Input
                ref={ref}
                id={name}
                type={type}
                min={min}
                max={max}
                variant={hasError ? 'destructive' : 'default'}
                value={String(data?.[name] || '')}
                onChange={(e) => {
                    // Prevent changes in view mode
                    if (view) return;

                    const newValue = e.target.value;

                    // If validation function is provided, validate before setting
                    if (validateInput && !validateInput(newValue)) {
                        return;
                    }

                    // Convert numeric values if the field type is number
                    if (type === 'number' && newValue !== '') {
                        const numValue = parseFloat(newValue);
                        if (!isNaN(numValue)) {
                            setData?.(name, numValue);
                            return;
                        }
                    }

                    setData?.(name, newValue);
                }}
                onBlur={(e) => {
                    if (form.processBlur) {
                        form.processBlur(name, e.target.value);
                    }
                    if (onBlur) {
                        onBlur(e);
                    }
                }}
                onFocus={() => {
                    if (errors?.[name] && clearErrors) {
                        clearErrors(name);
                    }
                }}
                placeholder={placeholder}
                className={className}
                disabled={disabled || view}
            />
        );
    },
);

SmartInput.displayName = 'SmartInput';

export default SmartInput;

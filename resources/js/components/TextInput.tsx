import InputError from '@/components/input-error';
import SmartInput from '@/components/smart-input';
import { Label } from '@/components/ui/label';
import { forwardRef } from 'react';

type FormValue = string | number | boolean | File | null | undefined;

interface InertiaForm {
    data: Record<string, FormValue>;
    errors: Partial<Record<string, string>>;
    validateInput?: (value: string) => boolean;
    setData?: {
        (key: string, value: FormValue): void;
        <K extends string>(key: K, value: FormValue): void;
        (values: Record<string, FormValue>): void;
        <T extends Record<string, FormValue>>(values: T | ((prev: T) => T)): void;
    };
    clearErrors?: (...fields: string[]) => void;
    processBlur?: (name: string, value: string) => void;
}

interface TextInputProps {
    form: InertiaForm;
    name: string;
    label: string;
    placeholder: string;
    required?: boolean;
    disabled?: boolean;
    view?: boolean;
    type?: string;
    min?: string | number;
    max?: string | number;
    helperText?: string;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    validateInput?: (value: string) => boolean;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    ({ form, name, label, placeholder, required = false, disabled = false, view = false, type, min, max, helperText, onBlur, validateInput }, ref) => {
        const value = form.data?.[name];
        const hasValue = value !== null && value !== undefined && value !== '';

        return (
            <div className="grid gap-2">
                <Label htmlFor={name}>
                    {label}
                    {required && <span className="text-destructive"> *</span>}
                </Label>
                <div className="bg-background">
                    {view ? (
                        <div className="rounded-md border bg-muted/20 p-2 text-sm">
                            {hasValue ? String(value) : placeholder}
                        </div>
                    ) : (
                        <SmartInput
                            ref={ref}
                            form={form}
                            name={name}
                            placeholder={placeholder}
                            type={type}
                            min={min}
                            max={max}
                            disabled={disabled}
                            view={view}
                            onBlur={onBlur}
                            validateInput={validateInput || form.validateInput}
                            hasError={!!form.errors?.[name]}
                        />
                    )}
                </div>
                {helperText && (
                    <p className="text-sm text-muted-foreground">{helperText}</p>
                )}
                <InputError message={form.errors?.[name]} />
            </div>
        );
    },
);

TextInput.displayName = 'TextInput';

export { TextInput };

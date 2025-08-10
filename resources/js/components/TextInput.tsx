import InputError from '@/components/input-error';
import SmartInput from '@/components/smart-input';
import { Label } from '@/components/ui/label';
import { forwardRef } from 'react';

interface InertiaForm {
    data: Record<string, string | number | boolean | null | undefined>;
    errors: Record<string, string>;
    validateInput?: (value: string) => boolean;
    setData?: (key: string, value: string | number | boolean | null | undefined) => void;
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
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    validateInput?: (value: string) => boolean;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    ({ form, name, label, placeholder, required = false, disabled = false, view = false, onBlur, validateInput }, ref) => {
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
                            disabled={disabled}
                            view={view}
                            onBlur={onBlur}
                            validateInput={validateInput || form.validateInput}
                        />
                    )}
                </div>
                <InputError message={form.errors?.[name]} />
            </div>
        );
    },
);

TextInput.displayName = 'TextInput';

export { TextInput };

import InputError from '@/components/input-error';
import SmartInput from '@/components/smart-input';
import { Label } from '@/components/ui/label';

interface FormData {
    [key: string]: any;
}

interface TextInputProps<T extends FormData> {
    form: {
        data: T;
        setData: (name: keyof T, value: any) => void;
        errors: Partial<Record<keyof T, string>>;
        clearErrors: (...fields: (keyof T)[]) => void;
        validateInput?: (value: string) => boolean;
        processBlur?: (name: keyof T, value: string) => void;
    };
    name: keyof T;
    label: string;
    placeholder: string;
    required?: boolean;
    disabled?: boolean;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    validateInput?: (value: string) => boolean;
}

export default function TextInput<T extends FormData>({
    form,
    name,
    label,
    placeholder,
    required = false,
    disabled = false,
    onBlur,
    validateInput,
}: TextInputProps<T>) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={String(name)}>
                {label}
                {required && <span className="text-destructive"> *</span>}
            </Label>
            <div className="bg-background">
                <SmartInput<T>
                    form={form}
                    name={name}
                    placeholder={placeholder}
                    disabled={disabled}
                    onBlur={onBlur}
                    validateInput={validateInput || form.validateInput}
                />
            </div>
            <InputError message={form.errors[name]} />
        </div>
    );
}

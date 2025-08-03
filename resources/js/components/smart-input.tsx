import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
interface SmartInputProps {
    form: {
        data: Record<string, string | number | boolean | File | null | undefined>;
        setData: (name: string, value: string | number | boolean | File | null | undefined) => void;
        errors: Partial<Record<string, string>>;
        clearErrors: (...fields: string[]) => void;
        validateInput?: (value: string) => boolean;
        processBlur?: (name: string, value: string) => void;
    };
    name: string;
    placeholder?: string;
    type?: string;
    className?: string;
    disabled?: boolean;
    view?: boolean;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    validateInput?: (value: string) => boolean;
}
const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
    ({ form, name, placeholder, type = 'text', className, disabled = false, view = false, onBlur, validateInput }, ref) => {
        const { data, setData, errors, clearErrors } = form;
        return (
            <Input
                ref={ref}
                id={name}
                type={type}
                value={String(data[name] || '')}
                onChange={(e) => {
                    // Prevent changes in view mode
                    if (view) return;
                    const value = e.target.value;
                    // Se há uma função de validação, verificar se o valor é válido
                    if (validateInput && !validateInput(value)) {
                        return;
                    }
                    setData(name, value);
                    if (value) {
                        clearErrors(name);
                    }
                }}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={view}
                className={cn('w-full', errors[name] && 'border-destructive', view && 'text-foreground cursor-default opacity-100', className)}
            />
        );
    },
);
SmartInput.displayName = 'SmartInput';
export default SmartInput;

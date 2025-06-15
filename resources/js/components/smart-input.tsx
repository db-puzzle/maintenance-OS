import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface SmartInputProps {
    form: {
        data: Record<string, any>;
        setData: (name: string, value: any) => void;
        errors: Partial<Record<string, string>>;
        clearErrors: (...fields: string[]) => void;
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
    ({
        form,
        name,
        placeholder,
        type = 'text',
        className,
        disabled = false,
        view = false,
        onBlur,
        validateInput,
    }, ref) => {
        const { data, setData, errors, clearErrors } = form;

        return (
            <Input
                ref={ref}
                id={name}
                type={type}
                value={data[name]}
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
                className={cn(
                    'w-full',
                    errors[name] && 'border-destructive',
                    view && 'cursor-default opacity-100 text-foreground',
                    className
                )}
            />
        );
    }
);

SmartInput.displayName = 'SmartInput';

export default SmartInput;

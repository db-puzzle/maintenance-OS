import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SmartInputProps<T extends Record<string, any>> {
    form: {
        data: T;
        setData: (name: keyof T, value: any) => void;
        errors: Partial<Record<keyof T, string>>;
        clearErrors: (...fields: (keyof T)[]) => void;
    };
    name: keyof T;
    placeholder?: string;
    type?: string;
    className?: string;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    validateInput?: (value: string) => boolean;
}

export default function SmartInput<T extends Record<string, any>>({
    form,
    name,
    placeholder,
    type = "text",
    className,
    onBlur,
    validateInput
}: SmartInputProps<T>) {
    const { data, setData, errors, clearErrors } = form;

    return (
        <Input
            id={name as string}
            type={type}
            value={data[name]}
            onChange={(e) => {
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
            className={cn(
                "w-full",
                errors[name] && "border-destructive",
                className
            )}
        />
    );
} 
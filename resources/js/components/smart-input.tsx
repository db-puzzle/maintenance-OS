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
}

export default function SmartInput<T extends Record<string, any>>({
    form,
    name,
    placeholder,
    type = "text",
    className,
}: SmartInputProps<T>) {
    const { data, setData, errors, clearErrors } = form;

    return (
        <Input
            id={name as string}
            type={type}
            value={data[name]}
            onChange={(e) => {
                setData(name, e.target.value);
                if (e.target.value) {
                    clearErrors(name);
                }
            }}
            placeholder={placeholder}
            className={cn(
                "w-full",
                errors[name] && "border-destructive",
                className
            )}
        />
    );
} 
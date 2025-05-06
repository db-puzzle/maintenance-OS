import { Input } from "@/components/ui/input";
import InputError from "@/components/input-error";
import { Label } from "@/components/ui/label";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormData {
    [key: string]: any;
}

interface TaskDescriptionInputProps<T extends FormData> {
    mode: 'view' | 'edit';
    icon: LucideIcon;
    form?: {
        data: T;
        setData: (name: keyof T, value: any) => void;
        errors: Partial<Record<keyof T, string>>;
        clearErrors: (...fields: (keyof T)[]) => void;
    };
    name?: keyof T;
    value?: string;
    placeholder?: string;
    required?: boolean;
}

export default function TaskDescriptionInput<T extends FormData>({
    mode,
    icon: Icon,
    form,
    name,
    value: propValue,
    placeholder,
    required = false
}: TaskDescriptionInputProps<T>) {
    const baseClasses = "flex items-center gap-2";
    const textClasses = "text-lg font-semibold flex-1 leading-none";

    if (mode === 'view') {
        return (
            <div className={baseClasses}>
                <Icon className="h-5 w-5 text-muted-foreground" />
                <Label className={cn(textClasses, !propValue && "text-muted-foreground")}>
                    {propValue || 'Clique em Editar para configurar a tarefa'}
                </Label>
            </div>
        );
    }

    if (!form || !name) return null;

    const { data, setData, errors, clearErrors } = form;
    const value = data[name] ?? '';

    return (
        <div className="flex-1 mr-4">
            <div className={baseClasses}>
                <Icon className="h-6 w-6 text-muted-foreground" />
                <div className={cn(
                    "flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs",
                    "focus-within:ring-ring/50 focus-within:ring-[3px] focus-within:border-ring",
                    errors[name] && "border-destructive"
                )}>
                    <Input
                        id={name as string}
                        type="text"
                        value={value}
                        onChange={(e) => {
                            setData(name, e.target.value);
                            if (e.target.value) {
                                clearErrors(name);
                            }
                        }}
                        placeholder={placeholder}
                        className={cn(
                            "border-none shadow-none px-0 py-0",
                            "!text-lg !font-semibold !leading-none",
                            "focus-visible:ring-0"
                        )}
                        required={required}
                    />
                    <InputError message={errors[name]} className="absolute" />
                </div>
            </div>
        </div>
    );
} 
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea, TextareaProps as BaseTextareaProps } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface TextAreaProps extends Omit<BaseTextareaProps, 'form' | 'name' | 'onChange'> {
    form: {
        data: Record<string, unknown>;
        setData: (key: string, value: unknown) => void;
        errors: Partial<Record<string, string>>;
        clearErrors: (...fields: string[]) => void;
    };
    name: string;
    label?: string;
    required?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ form, name, label, required, className, ...props }, ref) => {
        const error = form.errors[name];
        const value = form.data[name] as string;

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            form.setData(name, e.target.value);
            if (error) {
                form.clearErrors(name);
            }
        };

        return (
            <div className="space-y-2">
                {label && (
                    <Label htmlFor={name}>
                        {label}
                        {required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                )}
                <Textarea
                    ref={ref}
                    id={name}
                    name={name}
                    value={value || ''}
                    onChange={handleChange}
                    className={cn(error && 'border-destructive', className)}
                    {...props}
                />
                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
            </div>
        );
    }
);

TextArea.displayName = 'TextArea';

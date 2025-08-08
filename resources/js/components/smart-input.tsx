import { forwardRef, HTMLProps } from 'react';
import { Input } from './ui/input';

interface SmartInputProps {
    form: any; // Accept any form object to avoid type conflicts
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
                            setData(name, numValue);
                            return;
                        }
                    }

                    setData(name, newValue);
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
                    if (errors?.[name]) {
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

<<<<<<< Current (Your changes)
>>>>>>> Incoming (Background Agent changes)
=======
>>>>>>> Incoming (Background Agent changes)
export default SmartInput;

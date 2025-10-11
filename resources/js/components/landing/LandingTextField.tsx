import { useId, forwardRef } from 'react';
import clsx from 'clsx';

const formClasses =
    'block w-full appearance-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-blue-500 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:ring-blue-400';

function Label({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <label
            htmlFor={id}
            className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
            {children}
        </label>
    );
}

interface TextFieldProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'id'> {
    label?: string;
    error?: string;
}

export const LandingTextField = forwardRef<HTMLInputElement, TextFieldProps>(
    ({ label, type = 'text', className, error, ...props }, ref) => {
        const id = useId();

        return (
            <div className={className}>
                {label && <Label id={id}>{label}</Label>}
                <input
                    ref={ref}
                    id={id}
                    type={type}
                    {...props}
                    className={clsx(formClasses, error && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                />
                {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
        );
    }
);

LandingTextField.displayName = 'LandingTextField';

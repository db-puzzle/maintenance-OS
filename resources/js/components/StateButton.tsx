import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import React from 'react';
interface StateButtonProps {
    icon: LucideIcon;
    title: string;
    description: string;
    selected: boolean;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    iconSize?: 'sm' | 'md';
    variant?: 'default' | 'green' | 'red';
    greyOutWhenDisabled?: boolean;
}
const StateButton: React.FC<StateButtonProps> = ({
    icon: Icon,
    title,
    description,
    selected,
    onClick,
    disabled = false,
    className,
    iconSize = 'sm',
    variant = 'default',
    greyOutWhenDisabled = true
}) => {
    const iconClasses = iconSize === 'sm' ? 'h-4 w-4 mt-1.5' : 'h-5 w-5 mt-0.5';
    const getVariantClasses = () => {
        switch (variant) {
            case 'green':
                return selected
                    ? 'border-green-600 dark:border-green-500 ring-green-600/10 dark:ring-green-500/20 bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-200'
                    : 'border-input hover:bg-green-100/50 dark:hover:bg-green-950/30 hover:border-green-500 dark:hover:border-green-600';
            case 'red':
                return selected
                    ? 'border-red-500 dark:border-red-500 ring-red-500/10 dark:ring-red-500/20 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200'
                    : 'border-input hover:bg-red-50/50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-600';
            default:
                return selected
                    ? 'border-ring dark:border-slate-600 ring-ring/10 dark:ring-slate-500/20 bg-input-focus dark:bg-slate-800/50'
                    : 'border-input hover:bg-muted/50 dark:hover:bg-slate-800/30';
        }
    };
    const getIconClasses = () => {
        if (!selected) return cn(iconClasses, 'flex-shrink-0 self-start text-muted-foreground');
        switch (variant) {
            case 'green':
                return cn(iconClasses, 'flex-shrink-0 self-start text-green-700 dark:text-green-400');
            case 'red':
                return cn(iconClasses, 'flex-shrink-0 self-start text-red-600 dark:text-red-400');
            default:
                return cn(iconClasses, 'flex-shrink-0 self-start text-foreground');
        }
    };
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'grid h-auto w-full grid-cols-[auto_1fr] gap-3 rounded-md border px-3 py-3 text-left transition-[color,box-shadow,border-color,background-color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
                greyOutWhenDisabled && 'disabled:opacity-50',
                getVariantClasses(),
                className
            )}
        >
            <Icon className={getIconClasses()} />
            <div className="space-y-1">
                <div className="text-sm font-medium">{title}</div>
                <div className="text-sm text-muted-foreground">
                    {description}
                </div>
            </div>
        </button>
    );
};
export default StateButton; 
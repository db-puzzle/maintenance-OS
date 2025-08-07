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
    variant = 'default'
}) => {
    const iconClasses = iconSize === 'sm' ? 'h-4 w-4 mt-1.5' : 'h-5 w-5 mt-0.5';
    const getVariantClasses = () => {
        switch (variant) {
            case 'green':
                return selected
                    ? 'border-green-600 ring-green-600/10 bg-green-50 text-green-800'
                    : 'border-input hover:bg-green-100/50 hover:border-green-500';
            case 'red':
                return selected
                    ? 'border-red-500 ring-red-500/10 bg-red-50 text-red-900'
                    : 'border-input hover:bg-red-50/50 hover:border-red-300';
            default:
                return selected
                    ? 'border-ring ring-ring/10 bg-input-focus'
                    : 'border-input hover:bg-muted/50';
        }
    };
    const getIconClasses = () => {
        if (!selected) return cn(iconClasses, 'flex-shrink-0 self-start');
        switch (variant) {
            case 'green':
                return cn(iconClasses, 'flex-shrink-0 self-start text-green-700');
            case 'red':
                return cn(iconClasses, 'flex-shrink-0 self-start text-red-600');
            default:
                return cn(iconClasses, 'flex-shrink-0 self-start');
        }
    };
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'grid h-auto w-full grid-cols-[auto_1fr] gap-3 rounded-md border px-3 py-3 text-left transition-[color,box-shadow,border-color,background-color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
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
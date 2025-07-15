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
}

const StateButton: React.FC<StateButtonProps> = ({
    icon: Icon,
    title,
    description,
    selected,
    onClick,
    disabled = false,
    className,
    iconSize = 'sm'
}) => {
    const iconClasses = iconSize === 'sm' ? 'h-4 w-4 mt-1.5' : 'h-5 w-5 mt-0.5';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'grid h-auto w-full grid-cols-[auto_1fr] gap-3 rounded-md border px-3 py-3 text-left transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                selected
                    ? 'border-ring ring-ring/10 bg-input-focus'
                    : 'border-input hover:bg-muted/50',
                className
            )}
        >
            <Icon className={cn(iconClasses, 'flex-shrink-0 self-start')} />
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
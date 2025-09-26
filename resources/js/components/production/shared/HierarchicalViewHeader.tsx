import React from 'react';
import { Button } from '@/components/ui/button';
import { ImageDisplayToggleButton } from '@/components/ImageDisplayToggleButton';
import { cn } from '@/lib/utils';

export interface HierarchicalViewHeaderProps {
    // Title and subtitle
    title: string;
    subtitle?: React.ReactNode;
    badge?: React.ReactNode;

    // Level controls
    maxDepth: number;
    currentLevel: number;
    onLevelChange: (level: number) => void;
    showLevelControls?: boolean;

    // Image toggle
    showImages: boolean;
    onToggleImages: (show: boolean) => void;
    showImageToggle?: boolean;

    // Compact mode
    compact?: boolean;

    // Additional actions
    actions?: React.ReactNode;

    // Styling
    className?: string;
}

export function HierarchicalViewHeader({
    title,
    subtitle,
    badge,
    maxDepth,
    currentLevel,
    onLevelChange,
    showLevelControls = true,
    showImages,
    onToggleImages,
    showImageToggle = true,
    compact = false,
    actions,
    className,
}: HierarchicalViewHeaderProps) {
    return (
        <div className={cn(
            "flex items-center gap-4",
            compact ? "py-1" : "pt-4",
            className
        )}>
            {/* Controls section - now first */}
            <div className="flex gap-2">
                {/* Level controls */}
                {showLevelControls && maxDepth > 0 && (
                    <div className={cn(
                        "flex items-center gap-1 rounded-md",
                        compact ? "px-1" : "px-2"
                    )}>
                        <span className={cn(
                            "text-muted-foreground mr-1",
                            compact ? "text-xs" : "text-sm"
                        )}>Níveis:</span>
                        {Array.from({ length: maxDepth }, (_, i) => i + 1).map((level) => {
                            const isActive = level <= currentLevel;
                            return (
                                <Button
                                    key={level}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onLevelChange(level)}
                                    className={cn(
                                        "p-0 border transition-colors",
                                        compact ? "h-6 w-6 text-xs" : "h-7 w-7 text-xs",
                                        isActive
                                            ? 'bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100 hover:text-blue-600 hover:border-blue-400 dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90'
                                            : 'border hover:bg-blue-50/50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-accent dark:hover:text-accent-foreground'
                                    )}
                                    title={`Expandir até nível ${level}`}
                                >
                                    {level}
                                </Button>
                            );
                        })}
                    </div>
                )}

                {/* Image toggle */}
                {showImageToggle && (
                    <ImageDisplayToggleButton
                        showImages={showImages}
                        onToggle={onToggleImages}
                        compact={true}
                    />
                )}

                {/* Additional actions */}
                {actions}
            </div>

            {/* Title section - now after controls */}
            <div className="flex flex-wrap items-baseline gap-3">
                <div className="flex flex-wrap items-baseline">
                    {subtitle && !compact && (
                        <p className="mt-1 ml-2 truncate text-sm text-gray-500">
                            {subtitle}
                        </p>
                    )}
                    <h3 className={cn(
                        "text-gray-900",
                        compact ? "text-sm font-medium" : "mt-2 ml-2 text-base font-semibold"
                    )}>
                        {title}
                    </h3>
                </div>
                {badge}
            </div>
        </div>
    );
}

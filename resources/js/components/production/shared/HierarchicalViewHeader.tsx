import React from 'react';
import { Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    actions,
    className,
}: HierarchicalViewHeaderProps) {
    return (
        <div className={cn("pt-4 flex justify-between items-center", className)}>
            {/* Title section */}
            <div className="flex flex-wrap items-baseline gap-3">
                <div className="flex flex-wrap items-baseline">
                    {subtitle && (
                        <p className="mt-1 ml-2 truncate text-sm text-gray-500">
                            {subtitle}
                        </p>
                    )}
                    <h3 className="mt-2 ml-2 text-base font-semibold text-gray-900">
                        {title}
                    </h3>
                </div>
                {badge}
            </div>

            {/* Controls section */}
            <div className="flex gap-2">
                {/* Level controls */}
                {showLevelControls && maxDepth > 0 && (
                    <div className="flex items-center gap-1 rounded-md px-2">
                        <span className="text-sm text-muted-foreground mr-1">Níveis:</span>
                        {Array.from({ length: maxDepth }, (_, i) => i + 1).map((level) => {
                            const isActive = level <= currentLevel;
                            return (
                                <Button
                                    key={level}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onLevelChange(level)}
                                    className={cn(
                                        "h-7 w-7 p-0 text-xs border transition-colors",
                                        isActive
                                            ? 'bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100 hover:border-blue-400'
                                            : 'border hover:bg-blue-50/50 hover:text-blue-500 hover:border-blue-200'
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleImages(!showImages)}
                        className={showImages ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : ''}
                    >
                        <Image className="h-4 w-4 mr-2" />
                        {showImages ? 'Ocultar Imagens' : 'Mostrar Imagens'}
                    </Button>
                )}

                {/* Additional actions */}
                {actions}
            </div>
        </div>
    );
}

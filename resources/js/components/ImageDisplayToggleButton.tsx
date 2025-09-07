import React from 'react';
import { Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageDisplayToggleButtonProps {
    showImages: boolean;
    onToggle: (show: boolean) => void;
    size?: 'default' | 'sm' | 'lg' | 'icon';
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    className?: string;
    compact?: boolean; // New prop for compact sizing to match level switches
}

export function ImageDisplayToggleButton({
    showImages,
    onToggle,
    size = 'icon',
    variant = 'outline',
    className,
    compact = false
}: ImageDisplayToggleButtonProps) {
    return (
        <Button
            variant={compact ? 'ghost' : variant}
            size={compact ? 'sm' : size}
            onClick={() => onToggle(!showImages)}
            className={cn(
                // Apply compact styling when compact prop is true
                compact && 'p-0 border transition-colors h-7 w-7 text-xs',
                showImages
                    ? 'bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100 hover:text-blue-600 hover:border-blue-400 dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90'
                    : 'border hover:bg-blue-50/50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-accent dark:hover:text-accent-foreground',
                className
            )}
        >
            <Image className="h-4 w-4" />
        </Button>
    );
}

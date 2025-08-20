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
}

export function ImageDisplayToggleButton({
    showImages,
    onToggle,
    size = 'sm',
    variant = 'outline',
    className
}: ImageDisplayToggleButtonProps) {
    // Adjust width based on size
    const widthClass = size === 'default' ? 'w-[145px]' : 'w-[135px]';

    return (
        <Button
            variant={variant}
            size={size}
            onClick={() => onToggle(!showImages)}
            className={cn(
                widthClass,
                'flex items-center justify-start', // Fixed width with flex layout
                showImages
                    ? 'bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100 hover:text-blue-600 hover:border-blue-400 dark:bg-primary dark:text-primary-foreground dark:border-primary dark:hover:bg-primary/90'
                    : 'border hover:bg-blue-50/50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-accent dark:hover:text-accent-foreground',
                className
            )}
        >
            <Image className="h-4 w-4 shrink-0" />
            <span className="ml-2">{showImages ? 'Imagens ON' : 'Imagens OFF'}</span>
        </Button>
    );
}

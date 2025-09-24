import React from 'react';
import { Media, getBestImageUrl, isImage, getFileIcon, formatFileSize } from '@/utils/media';
import { cn } from '@/lib/utils';
import { FileIcon, Download } from 'lucide-react';
import * as Icons from 'lucide-react';

interface MediaDisplayProps {
    media: Media;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showInfo?: boolean;
    onClick?: () => void;
}

export function MediaDisplay({ media, className, size = 'md', showInfo = false, onClick }: MediaDisplayProps) {
    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-32 h-32',
        lg: 'w-full h-64'
    };

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (!isImage(media)) {
            // For non-images, trigger download
            window.open(`/api/media/${media.id}/download`, '_blank');
        }
    };

    if (isImage(media)) {
        return (
            <div className={cn('relative group cursor-pointer overflow-hidden rounded-lg', sizeClasses[size], className)} onClick={handleClick}>
                <img
                    src={getBestImageUrl(media, size === 'sm' ? 'thumb' : 'preview')}
                    alt={media.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                />
                {showInfo && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs">
                        <div className="truncate">{media.file_name}</div>
                        <div>{formatFileSize(media.size)}</div>
                    </div>
                )}
            </div>
        );
    }

    // For documents and other files
    const iconName = getFileIcon(media);
    const IconComponent = Icons[iconName as keyof typeof Icons] || FileIcon;

    return (
        <div
            className={cn(
                'relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center p-4',
                sizeClasses[size],
                className
            )}
            onClick={handleClick}
        >
            <IconComponent className="w-8 h-8 text-gray-600 dark:text-gray-400 mb-2" />
            {showInfo && (
                <>
                    <div className="text-xs text-center truncate w-full">{media.file_name}</div>
                    <div className="text-xs text-gray-500">{formatFileSize(media.size)}</div>
                </>
            )}
            <Download className="absolute top-2 right-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}

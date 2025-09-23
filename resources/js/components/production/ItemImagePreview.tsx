import React from 'react';
import { Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ImageWithBlurEffect } from './ImageWithBlurEffect';
interface ItemImagePreviewProps {
    primaryImageUrl?: string;
    primaryImageData?: { url: string; blurhash?: string | null };
    imageCount: number;
    className?: string;
    onClick?: (e?: React.MouseEvent) => void;
}
export function ItemImagePreview({
    primaryImageUrl,
    primaryImageData,
    imageCount,
    className,
    onClick
}: ItemImagePreviewProps) {
    return (
        <div
            className={cn(
                "relative aspect-square rounded-lg overflow-hidden group",
                className
            )}
        >
            {(primaryImageData?.url || primaryImageUrl) ? (
                <>
                    <ImageWithBlurEffect
                        src={primaryImageData?.url || primaryImageUrl || ''}
                        alt="Prévia do item"
                        containerClassName="w-full h-full"
                        className="group-hover:scale-105 transition-transform"
                        onClick={onClick}
                        blurhash={primaryImageData?.blurhash || undefined}
                    />
                    {imageCount > 1 && (
                        <Badge
                            variant="secondary"
                            className="absolute top-2 right-2 z-20"
                        >
                            {imageCount} imagens
                        </Badge>
                    )}
                </>
            ) : (
                <div
                    className="relative h-full w-full bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    onClick={onClick}
                >
                    <Camera className="h-8 w-8 mb-2" />
                    <span className="text-sm">Sem imagem</span>
                </div>
            )}
        </div>
    );
}
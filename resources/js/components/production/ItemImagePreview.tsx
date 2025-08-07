import React from 'react';
import { Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ImageWithBlurEffect } from './ImageWithBlurEffect';
interface ItemImagePreviewProps {
    primaryImageUrl?: string;
    imageCount: number;
    className?: string;
    onClick?: (e?: React.MouseEvent) => void;
}
export function ItemImagePreview({
    primaryImageUrl,
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
            {primaryImageUrl ? (
                <>
                    <ImageWithBlurEffect
                        src={primaryImageUrl}
                        alt="Prévia do item"
                        containerClassName="w-full h-full"
                        className="group-hover:scale-105 transition-transform"
                        onClick={onClick}
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
                    className="relative h-full w-full bg-gray-100 flex flex-col items-center justify-center text-gray-400 cursor-pointer"
                    onClick={onClick}
                >
                    <Camera className="h-8 w-8 mb-2" />
                    <span className="text-sm">Sem imagem</span>
                </div>
            )}
        </div>
    );
}
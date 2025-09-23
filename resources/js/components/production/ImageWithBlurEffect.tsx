import React from 'react';
import { cn } from '@/lib/utils';
import { ProgressiveImage } from '@/components/media';

interface ImageWithBlurEffectProps {
    src: string;
    alt?: string;
    className?: string;
    containerClassName?: string;
    onClick?: (e?: React.MouseEvent) => void;
    blurhash?: string;
}
export function ImageWithBlurEffect({
    src,
    alt = '',
    className = '',
    containerClassName = '',
    onClick,
    blurhash,
}: ImageWithBlurEffectProps) {
    // If we have a blurhash, use the ProgressiveImage component
    if (blurhash) {
        return (
            <div className={containerClassName} onClick={onClick}>
                <ProgressiveImage
                    src={src}
                    alt={alt}
                    blurhash={blurhash}
                    className={cn("w-full h-full object-contain", className)}
                />
            </div>
        );
    }

    // Fallback to the original blur effect implementation
    return (
        <div className={cn("relative overflow-hidden", containerClassName)}>
            {/* Background with edge blend effect */}
            <div className="absolute inset-0 bg-gray-100">
                {/* Outer glow effect using a larger blurred version */}
                <div className="absolute inset-0 overflow-hidden">
                    <img
                        src={src}
                        alt=""
                        className="absolute -inset-8 w-[calc(100%+4rem)] h-[calc(100%+4rem)] object-cover opacity-30"
                        style={{
                            filter: 'blur(40px) saturate(1.5)',
                            transform: 'scale(1.2)',
                        }}
                    />
                </div>
                {/* Inner gradient overlay for smooth transition */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(circle at center, transparent 40%, rgba(249, 250, 251, 0.6) 70%, rgba(249, 250, 251, 0.9) 100%)'
                    }}
                />
            </div>
            {/* Main image */}
            <img
                src={src}
                alt={alt}
                className={cn("relative z-10 w-full h-full object-contain", onClick && "cursor-pointer", className)}
                onClick={onClick}
            />
        </div>
    );
}
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Blurhash } from 'react-blurhash';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

interface ProgressiveImageProps {
    src: string;
    srcSet?: string;
    sizes?: string;
    alt: string;
    blurhash?: string;
    dominantColor?: string;
    aspectRatio?: number;
    priority?: boolean;
    onLoad?: () => void;
    className?: string;
    containerClassName?: string;
}

export function ProgressiveImage({
    src,
    srcSet,
    sizes,
    alt,
    blurhash,
    dominantColor,
    aspectRatio,
    priority = false,
    onLoad,
    className,
    containerClassName,
}: ProgressiveImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Intersection observer for lazy loading
    const { ref: inViewRef, inView } = useInView({
        triggerOnce: true,
        rootMargin: '50px',
        skip: priority,
    });

    // Preload for priority images
    useEffect(() => {
        if (priority && src) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            if (srcSet) link.imageSrcset = srcSet;
            if (sizes) link.imageSizes = sizes;
            document.head.appendChild(link);

            return () => {
                document.head.removeChild(link);
            };
        }
    }, [src, srcSet, sizes, priority]);

    // Load image when in view or priority
    const shouldLoad = priority || inView;

    useEffect(() => {
        if (!shouldLoad || !src) return;

        const img = new Image();
        if (srcSet) img.srcset = srcSet;
        if (sizes) img.sizes = sizes;

        const handleLoad = () => {
            setIsLoaded(true);
            setError(false);
            onLoad?.();

            // Report performance metrics
            if (window.performance && performance.mark) {
                performance.mark(`image-loaded-${src}`);
                performance.measure(
                    `image-load-time-${src}`,
                    'navigationStart',
                    `image-loaded-${src}`
                );
            }
        };

        const handleError = () => {
            setError(true);
            console.error(`Failed to load image: ${src}`);
        };

        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleError);
        img.src = src;

        return () => {
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
        };
    }, [shouldLoad, src, srcSet, sizes, onLoad]);

    // Generate placeholder styles
    const placeholderStyles = useMemo(() => ({
        backgroundColor: dominantColor || '#f3f4f6',
        aspectRatio: aspectRatio || 'auto',
    }), [dominantColor, aspectRatio]);

    return (
        <div
            ref={inViewRef}
            className={cn('relative overflow-hidden', containerClassName)}
            style={placeholderStyles}
        >
            <AnimatePresence>
                {/* BlurHash placeholder */}
                {blurhash && !isLoaded && !error && (
                    <motion.div
                        key="blurhash"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0"
                    >
                        <Blurhash
                            hash={blurhash}
                            width="100%"
                            height="100%"
                            resolutionX={32}
                            resolutionY={32}
                            punch={1}
                        />
                    </motion.div>
                )}

                {/* Loading skeleton */}
                {!blurhash && !isLoaded && !error && (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700"
                    />
                )}

                {/* Error state */}
                {error && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
                    >
                        <div className="text-center text-gray-500">
                            <ImageOff className="w-12 h-12 mx-auto mb-2" />
                            <p className="text-sm">Failed to load image</p>
                        </div>
                    </motion.div>
                )}

                {/* Actual image */}
                {shouldLoad && !error && (
                    <motion.img
                        key="image"
                        ref={imgRef}
                        src={src}
                        srcSet={srcSet}
                        sizes={sizes}
                        alt={alt}
                        loading={priority ? 'eager' : 'lazy'}
                        decoding={priority ? 'sync' : 'async'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isLoaded ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        className={cn('w-full h-full object-cover', className)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

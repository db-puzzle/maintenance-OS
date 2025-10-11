import React, { useRef, useEffect, useCallback, ReactNode } from 'react';
import { useScrollSync } from '../../contexts/ScrollSyncContext';
import { cn } from '@/lib/utils';

interface ScrollContainerProps {
    id: string;
    axis: 'x' | 'y' | 'xy';
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onContainerRef?: (container: HTMLElement | null) => void;
}

export const ScrollContainer: React.FC<ScrollContainerProps> = ({
    id,
    axis,
    children,
    className,
    style,
    onContainerRef,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const { registerScrollContainer, unregisterScrollContainer, syncScroll } = useScrollSync();
    const lastScrollTime = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (ref.current) {
            registerScrollContainer(id, ref.current);
            if (onContainerRef) {
                onContainerRef(ref.current);
            }
        }
        return () => {
            unregisterScrollContainer(id);
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
            if (onContainerRef) {
                onContainerRef(null);
            }
        };
    }, [id, registerScrollContainer, unregisterScrollContainer, onContainerRef]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        const now = Date.now();

        // Throttle scroll events to 16ms (60fps)
        if (now - lastScrollTime.current < 16) {
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
            scrollTimeout.current = setTimeout(() => {
                if (axis.includes('x')) {
                    syncScroll(id, 'x', element.scrollLeft);
                }
                if (axis.includes('y')) {
                    syncScroll(id, 'y', element.scrollTop);
                }
            }, 16);
            return;
        }

        lastScrollTime.current = now;

        if (axis.includes('x')) {
            syncScroll(id, 'x', element.scrollLeft);
        }
        if (axis.includes('y')) {
            syncScroll(id, 'y', element.scrollTop);
        }
    }, [id, axis, syncScroll]);

    // Determine overflow settings based on axis
    const overflowX = axis.includes('x') ? 'auto' : 'hidden';
    const overflowY = axis.includes('y') ? 'auto' : 'hidden';

    return (
        <div
            ref={ref}
            onScroll={handleScroll}
            className={cn("scroll-container", className)}
            style={{
                ...style,
                overflowX,
                overflowY,
            }}
        >
            {children}
        </div>
    );
};


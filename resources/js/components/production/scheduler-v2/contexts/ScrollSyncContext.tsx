import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

interface ScrollPosition {
    x: number;
    y: {
        gantt: number;
        scheduler: number;
    };
}

interface ScrollSyncContextValue {
    registerScrollContainer: (id: string, element: HTMLElement) => void;
    unregisterScrollContainer: (id: string) => void;
    syncScroll: (source: string, axis: 'x' | 'y', value: number) => void;
    getScrollPosition: () => ScrollPosition;
}

const ScrollSyncContext = createContext<ScrollSyncContextValue | null>(null);

export const useScrollSync = () => {
    const context = useContext(ScrollSyncContext);
    if (!context) {
        throw new Error('useScrollSync must be used within a ScrollSyncProvider');
    }
    return context;
};

interface ScrollSyncProviderProps {
    children: ReactNode;
}

export const ScrollSyncProvider: React.FC<ScrollSyncProviderProps> = ({ children }) => {
    const scrollContainers = useRef<Map<string, HTMLElement>>(new Map());
    const scrollPosition = useRef<ScrollPosition>({
        x: 0,
        y: { gantt: 0, scheduler: 0 },
    });
    const isUpdating = useRef(false);

    const registerScrollContainer = useCallback((id: string, element: HTMLElement) => {
        scrollContainers.current.set(id, element);
    }, []);

    const unregisterScrollContainer = useCallback((id: string) => {
        scrollContainers.current.delete(id);
    }, []);

    const syncScroll = useCallback((source: string, axis: 'x' | 'y', value: number) => {
        if (isUpdating.current) return;

        isUpdating.current = true;

        try {
            if (axis === 'x') {
                // Horizontal scroll syncs between timelines
                scrollPosition.current.x = value;

                // Update gantt timeline
                if (source !== 'gantt-timeline') {
                    const ganttTimeline = scrollContainers.current.get('gantt-timeline');
                    if (ganttTimeline) {
                        ganttTimeline.scrollLeft = value;
                    }
                }

                // Update scheduler timeline
                if (source !== 'scheduler-timeline') {
                    const schedulerTimeline = scrollContainers.current.get('scheduler-timeline');
                    if (schedulerTimeline) {
                        schedulerTimeline.scrollLeft = value;
                    }
                }
            } else if (axis === 'y') {
                // Vertical scroll syncs within each view
                if (source === 'gantt-grid' || source === 'gantt-timeline') {
                    scrollPosition.current.y.gantt = value;

                    // Sync gantt grid and timeline vertical scroll
                    if (source !== 'gantt-grid') {
                        const ganttGrid = scrollContainers.current.get('gantt-grid');
                        if (ganttGrid) {
                            ganttGrid.scrollTop = value;
                        }
                    }
                    if (source !== 'gantt-timeline') {
                        const ganttTimeline = scrollContainers.current.get('gantt-timeline');
                        if (ganttTimeline) {
                            ganttTimeline.scrollTop = value;
                        }
                    }
                } else if (source === 'scheduler-grid' || source === 'scheduler-timeline') {
                    scrollPosition.current.y.scheduler = value;

                    // Sync scheduler grid and timeline vertical scroll
                    if (source !== 'scheduler-grid') {
                        const schedulerGrid = scrollContainers.current.get('scheduler-grid');
                        if (schedulerGrid) {
                            schedulerGrid.scrollTop = value;
                        }
                    }
                    if (source !== 'scheduler-timeline') {
                        const schedulerTimeline = scrollContainers.current.get('scheduler-timeline');
                        if (schedulerTimeline) {
                            schedulerTimeline.scrollTop = value;
                        }
                    }
                }
            }
        } finally {
            // Use requestAnimationFrame to ensure the update is complete before allowing new updates
            requestAnimationFrame(() => {
                isUpdating.current = false;
            });
        }
    }, []);

    const getScrollPosition = useCallback(() => {
        return { ...scrollPosition.current };
    }, []);

    const value: ScrollSyncContextValue = {
        registerScrollContainer,
        unregisterScrollContainer,
        syncScroll,
        getScrollPosition,
    };

    return (
        <ScrollSyncContext.Provider value={value}>
            {children}
        </ScrollSyncContext.Provider>
    );
};


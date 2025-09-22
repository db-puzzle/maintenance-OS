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

interface ScrollSyncProviderProps {
    children: ReactNode;
}

export const ScrollSyncProvider: React.FC<ScrollSyncProviderProps> = ({ children }) => {
    const scrollContainers = useRef<Map<string, HTMLElement>>(new Map());
    const scrollPosition = useRef<ScrollPosition>({
        x: 0,
        y: { gantt: 0, scheduler: 0 }
    });
    const isSyncing = useRef<Set<string>>(new Set());

    const registerScrollContainer = useCallback((id: string, element: HTMLElement) => {
        scrollContainers.current.set(id, element);
    }, []);

    const unregisterScrollContainer = useCallback((id: string) => {
        scrollContainers.current.delete(id);
    }, []);

    const syncScroll = useCallback((source: string, axis: 'x' | 'y', value: number) => {
        // Prevent recursive syncing
        if (isSyncing.current.has(source)) return;

        isSyncing.current.add(source);

        requestAnimationFrame(() => {
            const containers = scrollContainers.current;

            if (axis === 'x') {
                // Horizontal scroll - sync between timelines only
                scrollPosition.current.x = value;

                if (source !== 'gantt-timeline') {
                    const ganttTimeline = containers.get('gantt-timeline');
                    if (ganttTimeline) ganttTimeline.scrollLeft = value;
                }

                if (source !== 'scheduler-timeline') {
                    const schedulerTimeline = containers.get('scheduler-timeline');
                    if (schedulerTimeline) schedulerTimeline.scrollLeft = value;
                }
            } else if (axis === 'y') {
                // Vertical scroll - sync within each view
                if (source === 'gantt-grid' || source === 'gantt-timeline') {
                    scrollPosition.current.y.gantt = value;

                    if (source !== 'gantt-grid') {
                        const ganttGrid = containers.get('gantt-grid');
                        if (ganttGrid) ganttGrid.scrollTop = value;
                    }

                    if (source !== 'gantt-timeline') {
                        const ganttTimeline = containers.get('gantt-timeline');
                        if (ganttTimeline) ganttTimeline.scrollTop = value;
                    }
                } else if (source === 'scheduler-grid' || source === 'scheduler-timeline') {
                    scrollPosition.current.y.scheduler = value;

                    if (source !== 'scheduler-grid') {
                        const schedulerGrid = containers.get('scheduler-grid');
                        if (schedulerGrid) schedulerGrid.scrollTop = value;
                    }

                    if (source !== 'scheduler-timeline') {
                        const schedulerTimeline = containers.get('scheduler-timeline');
                        if (schedulerTimeline) schedulerTimeline.scrollTop = value;
                    }
                }
            }

            isSyncing.current.delete(source);
        });
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

export const useScrollSync = () => {
    const context = useContext(ScrollSyncContext);
    if (!context) {
        throw new Error('useScrollSync must be used within a ScrollSyncProvider');
    }
    return context;
};
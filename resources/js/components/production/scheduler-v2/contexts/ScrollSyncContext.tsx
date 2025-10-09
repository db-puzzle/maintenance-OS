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
        // Create a unique key for this sync operation to prevent recursion per axis
        const syncKey = `${source}-${axis}`;

        // Prevent recursive syncing
        if (isSyncing.current.has(syncKey)) {
            return;
        }

        isSyncing.current.add(syncKey);

        requestAnimationFrame(() => {
            const containers = scrollContainers.current;

            if (axis === 'x') {
                // Horizontal scroll - sync between timelines only
                // Grid panels should NOT participate in horizontal sync

                // Only timeline panels can sync horizontally
                if (source === 'gantt-timeline' || source === 'scheduler-timeline') {
                    scrollPosition.current.x = value;

                    if (source === 'gantt-timeline') {
                        const schedulerTimeline = containers.get('scheduler-timeline');
                        if (schedulerTimeline && Math.abs(schedulerTimeline.scrollLeft - value) > 1) {
                            isSyncing.current.add('scheduler-timeline-x');
                            schedulerTimeline.scrollLeft = value;
                            // Clear the sync flag after a short delay
                            setTimeout(() => {
                                isSyncing.current.delete('scheduler-timeline-x');
                            }, 50);
                        }
                    } else if (source === 'scheduler-timeline') {
                        const ganttTimeline = containers.get('gantt-timeline');
                        if (ganttTimeline && Math.abs(ganttTimeline.scrollLeft - value) > 1) {
                            isSyncing.current.add('gantt-timeline-x');
                            ganttTimeline.scrollLeft = value;
                            // Clear the sync flag after a short delay
                            setTimeout(() => {
                                isSyncing.current.delete('gantt-timeline-x');
                            }, 50);
                        }
                    }
                }
            } else if (axis === 'y') {
                // Vertical scroll - sync within each view

                if (source === 'gantt-grid' || source === 'gantt-timeline') {
                    scrollPosition.current.y.gantt = value;

                    if (source !== 'gantt-grid') {
                        const ganttGrid = containers.get('gantt-grid');
                        if (ganttGrid && Math.abs(ganttGrid.scrollTop - value) > 1) {
                            isSyncing.current.add('gantt-grid-y');
                            ganttGrid.scrollTop = value;
                            // Clear the sync flag after a short delay
                            setTimeout(() => {
                                isSyncing.current.delete('gantt-grid-y');
                            }, 50);
                        }
                    }

                    if (source !== 'gantt-timeline') {
                        const ganttTimeline = containers.get('gantt-timeline');
                        if (ganttTimeline && Math.abs(ganttTimeline.scrollTop - value) > 1) {
                            isSyncing.current.add('gantt-timeline-y');
                            ganttTimeline.scrollTop = value;
                            // Clear the sync flag after a short delay
                            setTimeout(() => {
                                isSyncing.current.delete('gantt-timeline-y');
                            }, 50);
                        }
                    }
                } else if (source === 'scheduler-grid' || source === 'scheduler-timeline') {
                    scrollPosition.current.y.scheduler = value;

                    if (source !== 'scheduler-grid') {
                        const schedulerGrid = containers.get('scheduler-grid');
                        if (schedulerGrid && Math.abs(schedulerGrid.scrollTop - value) > 1) {
                            isSyncing.current.add('scheduler-grid-y');
                            schedulerGrid.scrollTop = value;
                            // Clear the sync flag after a short delay
                            setTimeout(() => {
                                isSyncing.current.delete('scheduler-grid-y');
                            }, 50);
                        }
                    }

                    if (source !== 'scheduler-timeline') {
                        const schedulerTimeline = containers.get('scheduler-timeline');
                        if (schedulerTimeline && Math.abs(schedulerTimeline.scrollTop - value) > 1) {
                            isSyncing.current.add('scheduler-timeline-y');
                            schedulerTimeline.scrollTop = value;
                            // Clear the sync flag after a short delay
                            setTimeout(() => {
                                isSyncing.current.delete('scheduler-timeline-y');
                            }, 50);
                        }
                    }
                }
            }

            isSyncing.current.delete(syncKey);
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
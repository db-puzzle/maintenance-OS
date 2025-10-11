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
                // Horizontal scroll - sync between timelines and their headers
                // Grid panels should NOT participate in horizontal sync

                scrollPosition.current.x = value;

                // Sync between gantt timeline and its header
                if (source === 'gantt-timeline' || source === 'gantt-timeline-header') {
                    const ganttTimeline = containers.get('gantt-timeline');
                    const ganttHeader = containers.get('gantt-timeline-header');

                    if (source === 'gantt-timeline' && ganttHeader && Math.abs(ganttHeader.scrollLeft - value) > 1) {
                        isSyncing.current.add('gantt-timeline-header-x');
                        ganttHeader.scrollLeft = value;
                        setTimeout(() => isSyncing.current.delete('gantt-timeline-header-x'), 50);
                    } else if (source === 'gantt-timeline-header' && ganttTimeline && Math.abs(ganttTimeline.scrollLeft - value) > 1) {
                        isSyncing.current.add('gantt-timeline-x');
                        ganttTimeline.scrollLeft = value;
                        setTimeout(() => isSyncing.current.delete('gantt-timeline-x'), 50);
                    }

                    // Also sync with scheduler timeline and its header
                    const schedulerTimeline = containers.get('scheduler-timeline');
                    const schedulerHeader = containers.get('scheduler-timeline-header');

                    if (schedulerTimeline && Math.abs(schedulerTimeline.scrollLeft - value) > 1) {
                        isSyncing.current.add('scheduler-timeline-x');
                        schedulerTimeline.scrollLeft = value;
                        setTimeout(() => isSyncing.current.delete('scheduler-timeline-x'), 50);
                    }
                    if (schedulerHeader && Math.abs(schedulerHeader.scrollLeft - value) > 1) {
                        isSyncing.current.add('scheduler-timeline-header-x');
                        schedulerHeader.scrollLeft = value;
                        setTimeout(() => isSyncing.current.delete('scheduler-timeline-header-x'), 50);
                    }
                }

                // Sync between scheduler timeline and its header
                else if (source === 'scheduler-timeline' || source === 'scheduler-timeline-header') {
                    const schedulerTimeline = containers.get('scheduler-timeline');
                    const schedulerHeader = containers.get('scheduler-timeline-header');

                    if (source === 'scheduler-timeline' && schedulerHeader && Math.abs(schedulerHeader.scrollLeft - value) > 1) {
                        isSyncing.current.add('scheduler-timeline-header-x');
                        schedulerHeader.scrollLeft = value;
                        setTimeout(() => isSyncing.current.delete('scheduler-timeline-header-x'), 50);
                    } else if (source === 'scheduler-timeline-header' && schedulerTimeline && Math.abs(schedulerTimeline.scrollLeft - value) > 1) {
                        isSyncing.current.add('scheduler-timeline-x');
                        schedulerTimeline.scrollLeft = value;
                        setTimeout(() => isSyncing.current.delete('scheduler-timeline-x'), 50);
                    }

                    // Also sync with gantt timeline and its header
                    const ganttTimeline = containers.get('gantt-timeline');
                    const ganttHeader = containers.get('gantt-timeline-header');

                    if (ganttTimeline && Math.abs(ganttTimeline.scrollLeft - value) > 1) {
                        isSyncing.current.add('gantt-timeline-x');
                        ganttTimeline.scrollLeft = value;
                        setTimeout(() => isSyncing.current.delete('gantt-timeline-x'), 50);
                    }
                    if (ganttHeader && Math.abs(ganttHeader.scrollLeft - value) > 1) {
                        isSyncing.current.add('gantt-timeline-header-x');
                        ganttHeader.scrollLeft = value;
                        setTimeout(() => isSyncing.current.delete('gantt-timeline-header-x'), 50);
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
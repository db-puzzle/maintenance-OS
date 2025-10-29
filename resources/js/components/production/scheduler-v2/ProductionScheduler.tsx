import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ImperativePanelGroupHandle } from '@/components/ui/resizable';
import { ScrollSyncProvider } from './contexts/ScrollSyncContext';
import { Toolbar } from './components/Toolbar/Toolbar';
import { GanttView } from './components/GanttView/GanttView';
import { SchedulerView } from './components/SchedulerView/SchedulerView';
import { useSchedulerState } from './hooks/useSchedulerState';
import { ScheduleVersion } from '@/types/scheduler';
import { WorkCell } from '@/types/production';
import { ZoomLevel, getDefaultZoomLevel, getZoomLevelById, getNextZoomLevel } from './utils/zoomConfig';
import { calculateTimelineLayout } from './utils/timelineCalculations';
import { SchedulerOrder, AlertStats, SchedulerFilters } from './types';

interface Props {
    steps: SchedulerOrder[]; // Manufacturing orders with steps
    workCells: WorkCell[];
    currentVersion: ScheduleVersion;
    publishedVersion?: ScheduleVersion;
    alertStats: AlertStats;
    schedulingAlgorithms: Record<string, string>;
    filters: SchedulerFilters;
    onUpdate: (schedule: { version_id: number; changes: Array<{ step_id: number; start: string; end: string }> }) => void;
    onOrderToggle: (orderId: number) => void;
    onOpenOrderSelection: () => void;
}

export const ProductionScheduler: React.FC<Props> = ({
    steps: orders,
    workCells,
    currentVersion,
    publishedVersion,
    alertStats,
    schedulingAlgorithms,
    filters,
    onUpdate,
    onOrderToggle,
    onOpenOrderSelection,
}) => {
    // Load zoom level from localStorage or use default
    const [currentZoomLevel, setCurrentZoomLevel] = useState<ZoomLevel>(() => {
        const savedZoomId = localStorage.getItem('scheduler-zoom-level');
        if (savedZoomId) {
            const savedLevel = getZoomLevelById(savedZoomId);
            if (savedLevel) return savedLevel;
        }
        return getDefaultZoomLevel();
    });

    // Load show dependencies preference from localStorage
    const [showDependencies, setShowDependencies] = useState<boolean>(() => {
        const saved = localStorage.getItem('scheduler-show-dependencies');
        return saved === 'true'; // Default to false if not set
    });

    const [viewConfig, setViewConfig] = useState({
        startDate: new Date(filters.start_date),
        endDate: new Date(filters.end_date),
    });
    const [leftPanelSize, setLeftPanelSize] = useState(30); // Shared panel width percentage
    const ganttPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const schedulerPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);

    // Refs to store scroll positions for zoom center maintenance
    const ganttScrollRef = useRef<{ container: HTMLElement | null; centerDate: Date | null }>({
        container: null,
        centerDate: null
    });
    const schedulerScrollRef = useRef<{ container: HTMLElement | null; centerDate: Date | null }>({
        container: null,
        centerDate: null
    });

    // Save zoom level to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('scheduler-zoom-level', currentZoomLevel.id);
    }, [currentZoomLevel]);

    // Save show dependencies preference to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('scheduler-show-dependencies', showDependencies.toString());
    }, [showDependencies]);

    const schedulerState = useSchedulerState({
        orders,
        workCells,
        viewConfig,
        zoomLevel: currentZoomLevel,
    });

    // Helper to calculate the center date based on scroll position
    const calculateCenterDate = useCallback((scrollContainer: HTMLElement, layout: { getDateForPosition: (x: number) => Date }) => {
        const scrollLeft = scrollContainer.scrollLeft;
        const containerWidth = scrollContainer.clientWidth;
        const centerX = scrollLeft + containerWidth / 2;
        return layout.getDateForPosition(centerX);
    }, []);

    // Helper to scroll to maintain center date after zoom
    const maintainZoomCenter = useCallback((scrollContainer: HTMLElement, centerDate: Date, newLayout: { getPositionForDate: (date: Date) => number }) => {
        const centerX = newLayout.getPositionForDate(centerDate);
        const containerWidth = scrollContainer.clientWidth;
        const newScrollLeft = centerX - containerWidth / 2;
        scrollContainer.scrollLeft = Math.max(0, newScrollLeft);
    }, []);

    // Restore center position after zoom level changes
    useEffect(() => {
        // Small delay to ensure DOM has updated with new zoom level
        const timer = setTimeout(() => {
            if (ganttScrollRef.current.container && ganttScrollRef.current.centerDate) {
                const layout = calculateTimelineLayout({
                    startDate: viewConfig.startDate,
                    endDate: viewConfig.endDate,
                    zoomLevel: currentZoomLevel,
                    containerWidth: ganttScrollRef.current.container.clientWidth
                });
                maintainZoomCenter(ganttScrollRef.current.container, ganttScrollRef.current.centerDate, layout);
                ganttScrollRef.current.centerDate = null; // Reset after use
            }

            if (schedulerScrollRef.current.container && schedulerScrollRef.current.centerDate) {
                const layout = calculateTimelineLayout({
                    startDate: viewConfig.startDate,
                    endDate: viewConfig.endDate,
                    zoomLevel: currentZoomLevel,
                    containerWidth: schedulerScrollRef.current.container.clientWidth
                });
                maintainZoomCenter(schedulerScrollRef.current.container, schedulerScrollRef.current.centerDate, layout);
                schedulerScrollRef.current.centerDate = null; // Reset after use
            }
        }, 50); // Small delay to ensure render is complete

        return () => clearTimeout(timer);
    }, [currentZoomLevel, viewConfig, maintainZoomCenter]);

    const handleZoomChange = useCallback((newZoomLevel: ZoomLevel) => {
        // Store current center positions before zoom
        if (ganttScrollRef.current.container) {
            const layout = calculateTimelineLayout({
                startDate: viewConfig.startDate,
                endDate: viewConfig.endDate,
                zoomLevel: currentZoomLevel,
                containerWidth: ganttScrollRef.current.container.clientWidth
            });
            ganttScrollRef.current.centerDate = calculateCenterDate(ganttScrollRef.current.container, layout);
        }

        if (schedulerScrollRef.current.container) {
            const layout = calculateTimelineLayout({
                startDate: viewConfig.startDate,
                endDate: viewConfig.endDate,
                zoomLevel: currentZoomLevel,
                containerWidth: schedulerScrollRef.current.container.clientWidth
            });
            schedulerScrollRef.current.centerDate = calculateCenterDate(schedulerScrollRef.current.container, layout);
        }

        // Update zoom level
        setCurrentZoomLevel(newZoomLevel);
    }, [currentZoomLevel, viewConfig, calculateCenterDate]);

    const handleZoomIn = useCallback(() => {
        const nextLevel = getNextZoomLevel(currentZoomLevel.id, 'in');
        if (nextLevel) {
            handleZoomChange(nextLevel);
        }
    }, [currentZoomLevel, handleZoomChange]);

    const handleZoomOut = useCallback(() => {
        const nextLevel = getNextZoomLevel(currentZoomLevel.id, 'out');
        if (nextLevel) {
            handleZoomChange(nextLevel);
        }
    }, [currentZoomLevel, handleZoomChange]);

    const handleZoomFit = useCallback(() => {
        handleZoomChange(getDefaultZoomLevel());
    }, [handleZoomChange]);

    const handleZoomLevelChange = useCallback((levelId: string) => {
        const level = getZoomLevelById(levelId);
        if (level) {
            handleZoomChange(level);
        }
    }, [handleZoomChange]);

    // Keyboard shortcuts for zoom control
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if Cmd/Ctrl is pressed
            if (e.metaKey || e.ctrlKey) {
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    handleZoomIn();
                } else if (e.key === '-' || e.key === '_') {
                    e.preventDefault();
                    handleZoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    handleZoomFit();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleZoomIn, handleZoomOut, handleZoomFit]);

    const handleStepUpdate = useCallback((stepId: string, updates: { start?: Date; end?: Date }) => {
        // Handle step updates
        onUpdate({ id: stepId, ...updates });
    }, [onUpdate]);

    const handleAllocationUpdate = useCallback((allocationId: string, updates: { quantity?: number; start?: Date; end?: Date }) => {
        // Handle work cell allocation updates
        onUpdate({ id: allocationId, ...updates });
    }, [onUpdate]);

    const handleLeftPanelResize = useCallback((size: number, source: 'gantt' | 'scheduler') => {
        setLeftPanelSize(size);

        // Synchronize the other panel
        const layout = [size, 100 - size];
        if (source === 'gantt' && schedulerPanelGroupRef.current) {
            schedulerPanelGroupRef.current.setLayout(layout);
        } else if (source === 'scheduler' && ganttPanelGroupRef.current) {
            ganttPanelGroupRef.current.setLayout(layout);
        }
    }, []);

    const handleToggleDependencies = useCallback(() => {
        setShowDependencies(prev => !prev);
    }, []);

    return (
        <ScrollSyncProvider>
            <div className="production-scheduler flex flex-col h-full bg-background">
                <Toolbar
                    currentVersion={currentVersion}
                    publishedVersion={publishedVersion}
                    schedulingAlgorithms={schedulingAlgorithms}
                    alertStats={alertStats}
                    zoomLevel={currentZoomLevel}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onZoomFit={handleZoomFit}
                    onZoomLevelChange={handleZoomLevelChange}
                    viewConfig={viewConfig}
                    onViewConfigChange={setViewConfig}
                    showDependencies={showDependencies}
                    onToggleDependencies={handleToggleDependencies}
                    onOpenOrderSelection={onOpenOrderSelection}
                />

                <div className="flex-1 flex flex-col min-h-0">
                    <ResizablePanelGroup direction="vertical" className="h-full">
                        {/* Gantt View */}
                        <ResizablePanel defaultSize={60} minSize={30}>
                            <GanttView
                                orders={schedulerState.visibleOrders}
                                viewConfig={viewConfig}
                                zoomLevel={currentZoomLevel}
                                onStepUpdate={handleStepUpdate}
                                onOrderToggle={onOrderToggle}
                                leftPanelSize={leftPanelSize}
                                onLeftPanelResize={(size) => handleLeftPanelResize(size, 'gantt')}
                                panelGroupRef={ganttPanelGroupRef}
                                showDependencies={showDependencies}
                                onScrollContainerRef={(container) => {
                                    ganttScrollRef.current.container = container;
                                }}
                            />
                        </ResizablePanel>

                        <ResizableHandle />

                        {/* Scheduler View */}
                        <ResizablePanel defaultSize={40} minSize={20}>
                            <SchedulerView
                                workCells={schedulerState.workCells}
                                allocations={schedulerState.allocations}
                                viewConfig={viewConfig}
                                zoomLevel={currentZoomLevel}
                                onAllocationUpdate={handleAllocationUpdate}
                                leftPanelSize={leftPanelSize}
                                onLeftPanelResize={(size) => handleLeftPanelResize(size, 'scheduler')}
                                panelGroupRef={schedulerPanelGroupRef}
                                onScrollContainerRef={(container) => {
                                    schedulerScrollRef.current.container = container;
                                }}
                            />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
        </ScrollSyncProvider>
    );
};


import React, { useState, useCallback, useRef } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ImperativePanelGroupHandle } from '@/components/ui/resizable';
import { ScrollSyncProvider } from './contexts/ScrollSyncContext';
import { Toolbar } from './components/Toolbar/Toolbar';
import { GanttView } from './components/GanttView/GanttView';
import { SchedulerView } from './components/SchedulerView/SchedulerView';
import { useSchedulerState } from './hooks/useSchedulerState';
import { ScheduleVersion, ScheduleAlert } from '@/types/scheduler';
import { WorkCell } from '@/types/production';

interface Props {
    steps: any[]; // Manufacturing orders with steps
    workCells: WorkCell[];
    currentVersion: ScheduleVersion;
    publishedVersion?: ScheduleVersion;
    alerts: ScheduleAlert[];
    alertStats: any;
    schedulingAlgorithms: Record<string, string>;
    filters: any;
    onUpdate: (schedule: any) => void;
    onOrderToggle: (orderId: number) => void;
}

export const ProductionScheduler: React.FC<Props> = ({
    steps: orders,
    workCells,
    currentVersion,
    publishedVersion,
    alerts,
    alertStats,
    schedulingAlgorithms,
    filters,
    onUpdate,
    onOrderToggle,
}) => {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [viewConfig, setViewConfig] = useState({
        startDate: new Date(filters.start_date),
        endDate: new Date(filters.end_date),
    });
    const [leftPanelSize, setLeftPanelSize] = useState(30); // Shared panel width percentage
    const ganttPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const schedulerPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);

    const schedulerState = useSchedulerState({
        orders,
        workCells,
        viewConfig,
        zoomLevel,
    });

    const handleZoomIn = useCallback(() => {
        setZoomLevel(prev => Math.min(prev * 1.2, 3));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
    }, []);

    const handleZoomFit = useCallback(() => {
        setZoomLevel(1);
    }, []);

    const handleStepUpdate = useCallback((stepId: string, updates: any) => {
        // Handle step updates
        onUpdate({ id: stepId, ...updates });
    }, [onUpdate]);

    const handleAllocationUpdate = useCallback((allocationId: string, updates: any) => {
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

    return (
        <ScrollSyncProvider>
            <div className="production-scheduler flex flex-col h-full bg-background">
                <Toolbar
                    currentVersion={currentVersion}
                    publishedVersion={publishedVersion}
                    schedulingAlgorithms={schedulingAlgorithms}
                    alertStats={alertStats}
                    zoomLevel={zoomLevel}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onZoomFit={handleZoomFit}
                    viewConfig={viewConfig}
                    onViewConfigChange={setViewConfig}
                />

                <div className="flex-1 flex flex-col min-h-0">
                    <ResizablePanelGroup direction="vertical" className="h-full">
                        {/* Gantt View */}
                        <ResizablePanel defaultSize={60} minSize={30}>
                            <GanttView
                                orders={schedulerState.visibleOrders}
                                viewConfig={viewConfig}
                                zoomLevel={zoomLevel}
                                onStepUpdate={handleStepUpdate}
                                onOrderToggle={onOrderToggle}
                                leftPanelSize={leftPanelSize}
                                onLeftPanelResize={(size) => handleLeftPanelResize(size, 'gantt')}
                                panelGroupRef={ganttPanelGroupRef}
                            />
                        </ResizablePanel>

                        <ResizableHandle />

                        {/* Scheduler View */}
                        <ResizablePanel defaultSize={40} minSize={20}>
                            <SchedulerView
                                workCells={schedulerState.workCells}
                                allocations={schedulerState.allocations}
                                viewConfig={viewConfig}
                                zoomLevel={zoomLevel}
                                onAllocationUpdate={handleAllocationUpdate}
                                leftPanelSize={leftPanelSize}
                                onLeftPanelResize={(size) => handleLeftPanelResize(size, 'scheduler')}
                                panelGroupRef={schedulerPanelGroupRef}
                            />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
        </ScrollSyncProvider>
    );
};


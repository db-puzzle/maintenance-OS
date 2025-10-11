import React from 'react';
import { SchedulerGrid } from './SchedulerGrid/SchedulerGrid';
import { SchedulerTimeline } from './SchedulerTimeline/SchedulerTimeline';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ImperativePanelGroupHandle } from '@/components/ui/resizable';

import { ZoomLevel } from '../../utils/zoomConfig';

interface SchedulerViewProps {
    workCells: any[];
    allocations: any[];
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: ZoomLevel;
    onAllocationUpdate: (allocationId: string, updates: any) => void;
    leftPanelSize: number;
    onLeftPanelResize: (size: number) => void;
    panelGroupRef: React.RefObject<ImperativePanelGroupHandle | null>;
    onScrollContainerRef?: (container: HTMLElement | null) => void;
}

export const SchedulerView: React.FC<SchedulerViewProps> = ({
    workCells,
    allocations,
    viewConfig,
    zoomLevel,
    onAllocationUpdate,
    leftPanelSize,
    onLeftPanelResize,
    panelGroupRef,
    onScrollContainerRef,
}) => {
    return (
        <ResizablePanelGroup
            ref={panelGroupRef}
            direction="horizontal"
            className="h-full"
            onLayout={(sizes) => {
                if (sizes.length > 0 && Math.abs(sizes[0] - leftPanelSize) > 0.1) {
                    onLeftPanelResize(sizes[0]);
                }
            }}
        >
            {/* Left Panel - Resource Grid */}
            <ResizablePanel
                defaultSize={leftPanelSize}
                minSize={20}
                maxSize={50}
            >
                <SchedulerGrid workCells={workCells} />
            </ResizablePanel>

            <ResizableHandle />

            {/* Right Panel - Resource Timeline */}
            <ResizablePanel defaultSize={100 - leftPanelSize}>
                <SchedulerTimeline
                    workCells={workCells}
                    allocations={allocations}
                    viewConfig={viewConfig}
                    zoomLevel={zoomLevel}
                    onAllocationUpdate={onAllocationUpdate}
                    onScrollContainerRef={onScrollContainerRef}
                />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};


import React from 'react';
import { SchedulerGrid } from './SchedulerGrid/SchedulerGrid';
import { SchedulerTimeline } from './SchedulerTimeline/SchedulerTimeline';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ImperativePanelGroupHandle } from '@/components/ui/resizable';

import { ZoomLevel } from '../../utils/zoomConfig';

interface WorkCell {
    id: number;
    name: string;
    cell_type: string;
    has_finite_capacity: boolean;
    current_utilization?: number;
    scheduled_steps?: Allocation[];
}

interface Allocation {
    id: string;
    is_locked?: boolean;
    planned_start_date: string;
    planned_end_date: string;
}

interface AllocationUpdate {
    scheduled_start?: string;
    scheduled_end?: string;
    workcell_id?: number;
}

interface SchedulerViewProps {
    workCells: WorkCell[];
    allocations: Allocation[];
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: ZoomLevel;
    onAllocationUpdate: (allocationId: string, updates: AllocationUpdate) => void;
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


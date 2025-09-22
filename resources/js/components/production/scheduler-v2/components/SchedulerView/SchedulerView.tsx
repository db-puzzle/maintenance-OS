import React from 'react';
import { SchedulerGrid } from './SchedulerGrid/SchedulerGrid';
import { SchedulerTimeline } from './SchedulerTimeline/SchedulerTimeline';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

interface SchedulerViewProps {
    workCells: any[];
    allocations: any[];
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: number;
    onAllocationUpdate: (allocationId: string, updates: any) => void;
}

export const SchedulerView: React.FC<SchedulerViewProps> = ({
    workCells,
    allocations,
    viewConfig,
    zoomLevel,
    onAllocationUpdate,
}) => {
    return (
        <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Resource Grid */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <SchedulerGrid workCells={workCells} />
            </ResizablePanel>

            <ResizableHandle />

            {/* Right Panel - Resource Timeline */}
            <ResizablePanel defaultSize={70}>
                <SchedulerTimeline
                    workCells={workCells}
                    allocations={allocations}
                    viewConfig={viewConfig}
                    zoomLevel={zoomLevel}
                    onAllocationUpdate={onAllocationUpdate}
                />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};


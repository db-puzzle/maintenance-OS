import React, { useState, useCallback } from 'react';
import { ScrollContainer } from '../../shared/ScrollContainer';
import { TimeAxis } from '../../GanttView/GanttTimeline/TimeAxis';
import { AllocationBar } from './AllocationBar';
import { CapacityIndicator } from './CapacityIndicator';
import { calculateTimelineLayout } from '../../../utils/timelineCalculations';
import { cn } from '@/lib/utils';

interface SchedulerTimelineProps {
    workCells: any[];
    allocations: any[];
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: number;
    onAllocationUpdate: (allocationId: string, updates: any) => void;
}

export const SchedulerTimeline: React.FC<SchedulerTimelineProps> = ({
    workCells,
    allocations,
    viewConfig,
    zoomLevel,
    onAllocationUpdate,
}) => {
    const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null);
    const [draggedAllocation, setDraggedAllocation] = useState<any>(null);

    // Calculate timeline dimensions and layout
    const timelineLayout = calculateTimelineLayout({
        startDate: viewConfig.startDate,
        endDate: viewConfig.endDate,
        zoomLevel,
        containerWidth: 1000, // Will be updated on mount
    });

    const rowHeight = 45;
    const timelineHeight = workCells.length * rowHeight;

    // Handle allocation drag
    const handleAllocationDragStart = (e: React.MouseEvent, allocation: any, workCellId: number) => {
        if (allocation.is_locked) return;

        setDraggedAllocation({
            ...allocation,
            originalWorkCellId: workCellId,
            initialX: e.clientX,
            initialY: e.clientY,
            offsetX: 0,
            offsetY: 0,
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggedAllocation) return;

        const offsetX = e.clientX - draggedAllocation.initialX;
        const offsetY = e.clientY - draggedAllocation.initialY;
        setDraggedAllocation(prev => ({ ...prev!, offsetX, offsetY }));
    }, [draggedAllocation]);

    const handleMouseUp = useCallback(() => {
        if (!draggedAllocation) return;

        // Calculate new work cell based on Y position
        const rowIndex = Math.floor((draggedAllocation.initialY + draggedAllocation.offsetY) / rowHeight);
        const newWorkCellId = workCells[Math.max(0, Math.min(rowIndex, workCells.length - 1))]?.id;

        // Calculate new dates based on X position
        const pixelsPerDay = timelineLayout.pixelsPerDay;
        const daysMoved = draggedAllocation.offsetX / pixelsPerDay;

        const newStartDate = new Date(draggedAllocation.planned_start_date);
        newStartDate.setDate(newStartDate.getDate() + daysMoved);

        const newEndDate = new Date(draggedAllocation.planned_end_date);
        newEndDate.setDate(newEndDate.getDate() + daysMoved);

        // Update the allocation
        onAllocationUpdate(draggedAllocation.id, {
            work_cell_id: newWorkCellId,
            scheduled_start: newStartDate.toISOString(),
            scheduled_end: newEndDate.toISOString(),
        });

        setDraggedAllocation(null);
    }, [draggedAllocation, workCells, timelineLayout, onAllocationUpdate]);

    React.useEffect(() => {
        if (draggedAllocation) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [draggedAllocation, handleMouseMove, handleMouseUp]);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Time axis header (reuse from Gantt) */}
            <TimeAxis
                startDate={viewConfig.startDate}
                endDate={viewConfig.endDate}
                zoomLevel={zoomLevel}
                width={timelineLayout.totalWidth}
            />

            {/* Resource timeline */}
            <ScrollContainer
                id="scheduler-timeline"
                axis="xy"
                className="flex-1 relative"
            >
                <div
                    className="relative"
                    style={{
                        width: timelineLayout.totalWidth,
                        height: timelineHeight,
                    }}
                >
                    {/* Vertical grid lines for days */}
                    {(() => {
                        const dayCount = Math.ceil(
                            (viewConfig.endDate.getTime() - viewConfig.startDate.getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return Array.from({ length: dayCount + 1 }, (_, i) => {
                            const x = i * timelineLayout.pixelsPerDay;
                            return (
                                <div
                                    key={`day-line-${i}`}
                                    className="absolute top-0 bottom-0 border-l border-muted"
                                    style={{ left: x }}
                                />
                            );
                        });
                    })()}

                    {/* Render work cell rows */}
                    {workCells.map((workCell, index) => {
                        const y = index * rowHeight;
                        const cellAllocations = allocations.filter(a => a.work_cell_id === workCell.id);

                        return (
                            <div
                                key={workCell.id}
                                className={cn(
                                    "absolute left-0 right-0 border-b",
                                    index % 2 === 0 ? "bg-background" : "bg-muted/20"
                                )}
                                style={{
                                    top: `${y}px`,
                                    height: `${rowHeight}px`,
                                }}
                            >
                                {/* Capacity indicator for finite capacity cells */}
                                {workCell.has_finite_capacity && (
                                    <CapacityIndicator
                                        workCell={workCell}
                                        allocations={cellAllocations}
                                        layout={timelineLayout}
                                        height={rowHeight}
                                    />
                                )}

                                {/* Render allocations */}
                                {cellAllocations.map((allocation) => {
                                    const isDragging = draggedAllocation?.id === allocation.id;
                                    const x = timelineLayout.getPositionForDate(new Date(allocation.planned_start_date));
                                    const width = timelineLayout.getPositionForDate(new Date(allocation.planned_end_date)) - x;

                                    return (
                                        <AllocationBar
                                            key={allocation.id}
                                            allocation={allocation}
                                            x={x + (isDragging ? draggedAllocation.offsetX : 0)}
                                            y={8 + (isDragging ? draggedAllocation.offsetY : 0)}
                                            width={width}
                                            height={rowHeight - 16}
                                            isSelected={selectedAllocationId === allocation.id}
                                            isDragging={isDragging}
                                            onSelect={() => setSelectedAllocationId(allocation.id)}
                                            onDragStart={(e) => handleAllocationDragStart(e, allocation, workCell.id)}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* Drop indicator when dragging */}
                    {draggedAllocation && (
                        <div
                            className="absolute border-2 border-primary border-dashed rounded pointer-events-none"
                            style={{
                                left: `${timelineLayout.getPositionForDate(new Date(draggedAllocation.planned_start_date)) + draggedAllocation.offsetX}px`,
                                top: `${Math.floor((draggedAllocation.initialY + draggedAllocation.offsetY) / rowHeight) * rowHeight + 8}px`,
                                width: `${timelineLayout.getPositionForDate(new Date(draggedAllocation.planned_end_date)) -
                                    timelineLayout.getPositionForDate(new Date(draggedAllocation.planned_start_date))}px`,
                                height: `${rowHeight - 16}px`,
                            }}
                        />
                    )}
                </div>
            </ScrollContainer>
        </div>
    );
};


import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollContainer } from '../../shared/ScrollContainer';
import { TimeAxis } from './TimeAxis';
import { StepBar } from './StepBar';
import { Dependencies } from './Dependencies';
import { NonWorkingTime } from './NonWorkingTime';
import { calculateTimelineLayout } from '../../../utils/timelineCalculations';
import { cn } from '@/lib/utils';
import { ZoomLevel } from '../../../utils/zoomConfig';

interface Step {
    id: string;
    planned_start_date: string;
    planned_end_date: string;
    is_locked?: boolean;
}

interface Order {
    id: string;
    steps?: Step[];
    children?: Order[];
}

interface Task {
    type: string;
    id: string;
    level?: number;
    data?: Order | Step;
}

interface StepUpdate {
    planned_start_date?: string;
    planned_end_date?: string;
    scheduled_start?: string;
    scheduled_end?: string;
}

interface DraggedStep extends Step {
    initialX: number;
    offsetX: number;
}

interface GanttTimelineProps {
    tasks: Task[];
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: ZoomLevel;
    timelineWidth: number;
    onStepUpdate: (stepId: string, updates: StepUpdate) => void;
    showDependencies: boolean;
    onScrollContainerRef?: (container: HTMLElement | null) => void;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
    tasks,
    viewConfig,
    zoomLevel,
    timelineWidth,
    onStepUpdate,
    showDependencies,
    onScrollContainerRef,
}) => {
    const _canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [draggedStep, setDraggedStep] = useState<DraggedStep | null>(null);

    // Calculate timeline dimensions and layout
    const timelineLayout = calculateTimelineLayout({
        startDate: viewConfig.startDate,
        endDate: viewConfig.endDate,
        zoomLevel,
        containerWidth: timelineWidth,
    });

    // Tasks are already flattened in GanttView, so we can use them directly
    const rows = useMemo(() => {
        return tasks.map((task, _index) => ({
            type: task.type,
            data: task,
            level: task.level || 0,
            id: task.type === 'order' ? `order-${task.id}` : `step-${task.id}`,
            orderId: (task as any).orderId || (task.type === 'step' ? (task as any).parentId : task.id),
        }));
    }, [tasks]);
    const rowHeight = 45;
    const timelineHeight = rows.length * rowHeight;

    // Handle step drag
    const handleStepDragStart = (e: React.MouseEvent, step: Step) => {
        if (step.is_locked) return;

        setDraggedStep({
            ...step,
            initialX: e.clientX,
            offsetX: 0,
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggedStep) return;

        const offsetX = e.clientX - draggedStep.initialX;
        setDraggedStep(prev => ({ ...prev!, offsetX }));
    }, [draggedStep]);

    const handleMouseUp = useCallback(() => {
        if (!draggedStep) return;

        // Calculate new dates based on drag offset
        const pixelsPerDay = timelineLayout.pixelsPerDay;
        const daysMoved = draggedStep.offsetX / pixelsPerDay;

        const newStartDate = new Date(draggedStep.planned_start_date);
        newStartDate.setDate(newStartDate.getDate() + daysMoved);

        const newEndDate = new Date(draggedStep.planned_end_date);
        newEndDate.setDate(newEndDate.getDate() + daysMoved);

        // Update the step
        onStepUpdate(draggedStep.id, {
            scheduled_start: newStartDate.toISOString(),
            scheduled_end: newEndDate.toISOString(),
        });

        setDraggedStep(null);
    }, [draggedStep, timelineLayout, onStepUpdate]);

    useEffect(() => {
        if (draggedStep) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [draggedStep, handleMouseMove, handleMouseUp]);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Time axis header with horizontal scroll sync */}
            <div className="h-[60px] border-b bg-muted/50 sticky top-0 z-20 overflow-hidden">
                <ScrollContainer
                    id="gantt-timeline-header"
                    axis="x"
                    className="h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    <TimeAxis
                        startDate={viewConfig.startDate}
                        endDate={viewConfig.endDate}
                        zoomLevel={zoomLevel}
                        width={timelineLayout.totalWidth}
                    />
                </ScrollContainer>
            </div>

            {/* Timeline content */}
            <ScrollContainer
                id="gantt-timeline"
                axis="xy"
                className="flex-1 relative"
                onContainerRef={onScrollContainerRef}
            >
                <div
                    className="relative"
                    style={{
                        width: timelineLayout.totalWidth,
                        height: timelineHeight,
                    }}
                >
                    {/* Non-working time overlay */}
                    <NonWorkingTime
                        startDate={viewConfig.startDate}
                        endDate={viewConfig.endDate}
                        layout={timelineLayout}
                        height={timelineHeight}
                    />

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

                    {/* Row dividers */}
                    {rows.map((_, index) => (
                        <div
                            key={`row-divider-${index}`}
                            className="absolute left-0 right-0 border-b"
                            style={{
                                top: (index + 1) * rowHeight - 1,
                            }}
                        />
                    ))}

                    {/* Render rows */}
                    {rows.map((row, index) => {
                        const y = index * rowHeight;

                        if (row.type === 'order') {
                            // Render order summary bar
                            const order = row.data;

                            // Calculate span including child orders
                            const getAllDatesFromOrder = (order: Order): { starts: Date[], ends: Date[] } => {
                                const dates = { starts: [] as Date[], ends: [] as Date[] };

                                // Add dates from direct steps
                                if (order.steps && order.steps.length > 0) {
                                    order.steps.forEach((step: Step) => {
                                        dates.starts.push(new Date(step.planned_start_date));
                                        dates.ends.push(new Date(step.planned_end_date));
                                    });
                                }

                                // Add dates from child orders recursively
                                if (order.children && order.children.length > 0) {
                                    order.children.forEach((child: Order) => {
                                        const childDates = getAllDatesFromOrder(child);
                                        dates.starts.push(...childDates.starts);
                                        dates.ends.push(...childDates.ends);
                                    });
                                }

                                return dates;
                            };

                            const allDates = getAllDatesFromOrder(order);

                            // Skip if no dates found
                            if (allDates.starts.length === 0) return null;

                            const earliestStart = new Date(Math.min(...allDates.starts.map(d => d.getTime())));
                            const latestEnd = new Date(Math.max(...allDates.ends.map(d => d.getTime())));

                            // Debug width calculation
                            const startX = timelineLayout.getPositionForDate(earliestStart);
                            const endX = timelineLayout.getPositionForDate(latestEnd);
                            const barWidth = endX - startX;


                            return (
                                <div
                                    key={row.id}
                                    className={cn(
                                        "absolute flex items-center"
                                    )}
                                    style={{
                                        top: y,
                                        height: rowHeight,
                                        left: startX,
                                        width: barWidth,
                                    }}
                                >
                                    <div className={cn(
                                        "h-8 rounded px-2 flex items-center w-full",
                                        order.level === 0 ? "bg-blue-500 text-white" : "bg-blue-200"
                                    )}>
                                        <span className="text-xs font-medium truncate">
                                            {(order.data as any)?.order_number || ''}
                                        </span>
                                    </div>
                                </div>
                            );
                        } else if (row.type === 'step') {
                            // Render step bar
                            const step = row.data as any;
                            const isDragging = draggedStep?.id === step.id;

                            if (!step.planned_start_date || !step.planned_end_date) {
                                return null;
                            }

                            return (
                                <StepBar
                                    key={row.id}
                                    step={{
                                        name: (step as any).name || '',
                                        status: (step as any).status || 'pending',
                                        is_locked: step.is_locked || false,
                                        percent_complete: (step as any).percent_complete || 0,
                                    }}
                                    x={timelineLayout.getPositionForDate(new Date(step.planned_start_date)) +
                                        (isDragging && draggedStep ? draggedStep.offsetX : 0)}
                                    y={y}
                                    width={timelineLayout.getPositionForDate(new Date(step.planned_end_date)) -
                                        timelineLayout.getPositionForDate(new Date(step.planned_start_date))}
                                    height={rowHeight}
                                    isSelected={selectedStepId === step.id}
                                    isDragging={isDragging}
                                    onSelect={() => setSelectedStepId(step.id)}
                                    onDragStart={(e) => handleStepDragStart(e, {
                                        id: step.id,
                                        planned_start_date: step.planned_start_date,
                                        planned_end_date: step.planned_end_date,
                                        is_locked: step.is_locked || false,
                                    })}
                                />
                            );
                        }

                        return null;
                    })}

                    {/* Dependencies */}
                    {showDependencies && (
                        <>
                            <Dependencies
                                steps={rows.filter(r => r.type === 'step').map(r => ({
                                    id: (r.data as any).id,
                                    planned_start_date: (r.data as any).planned_start_date || '',
                                    planned_end_date: (r.data as any).planned_end_date || '',
                                }))}
                                rows={rows}
                                rowHeight={rowHeight}
                                layout={timelineLayout}
                            />
                        </>
                    )}
                </div>
            </ScrollContainer>
        </div>
    );
};


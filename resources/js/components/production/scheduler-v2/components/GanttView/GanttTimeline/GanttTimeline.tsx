import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ScrollContainer } from '../../shared/ScrollContainer';
import { TimeAxis } from './TimeAxis';
import { StepBar } from './StepBar';
import { Dependencies } from './Dependencies';
import { NonWorkingTime } from './NonWorkingTime';
import { calculateTimelineLayout } from '../../../utils/timelineCalculations';
import { cn } from '@/lib/utils';

interface GanttTimelineProps {
    orders: any[];
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: number;
    onStepUpdate: (stepId: string, updates: any) => void;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
    orders,
    viewConfig,
    zoomLevel,
    onStepUpdate,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [draggedStep, setDraggedStep] = useState<any>(null);
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

    // Calculate timeline dimensions and layout
    const timelineLayout = calculateTimelineLayout({
        startDate: viewConfig.startDate,
        endDate: viewConfig.endDate,
        zoomLevel,
        containerWidth: 1000, // Will be updated on mount
    });

    // Flatten orders and steps for rendering
    const flattenedRows = useCallback(() => {
        const rows: any[] = [];

        const processOrder = (order: any, level: number = 0) => {
            rows.push({
                type: 'order',
                data: order,
                level,
                id: `order-${order.id}`,
            });

            if (expandedOrders.has(order.id)) {
                // Add steps
                order.steps?.forEach((step: any) => {
                    rows.push({
                        type: 'step',
                        data: step,
                        level: level + 1,
                        id: `step-${step.id}`,
                        orderId: order.id,
                    });
                });

                // Add child orders
                order.children?.forEach((child: any) => {
                    processOrder(child, level + 1);
                });
            }
        };

        orders.forEach(order => processOrder(order));
        return rows;
    }, [orders, expandedOrders]);

    const rows = flattenedRows();
    const rowHeight = 45;
    const timelineHeight = rows.length * rowHeight;

    // Handle step drag
    const handleStepDragStart = (e: React.MouseEvent, step: any) => {
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
            {/* Time axis header */}
            <TimeAxis
                startDate={viewConfig.startDate}
                endDate={viewConfig.endDate}
                zoomLevel={zoomLevel}
                width={timelineLayout.totalWidth}
            />

            {/* Timeline content */}
            <ScrollContainer
                id="gantt-timeline"
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
                    {/* Non-working time overlay */}
                    <NonWorkingTime
                        startDate={viewConfig.startDate}
                        endDate={viewConfig.endDate}
                        layout={timelineLayout}
                        height={timelineHeight}
                    />

                    {/* Render rows */}
                    {rows.map((row, index) => {
                        const y = index * rowHeight;

                        if (row.type === 'order') {
                            // Render order summary bar
                            const order = row.data;
                            const steps = order.steps || [];
                            if (steps.length === 0) return null;

                            const earliestStart = new Date(Math.min(...steps.map((s: any) =>
                                new Date(s.planned_start_date).getTime()
                            )));
                            const latestEnd = new Date(Math.max(...steps.map((s: any) =>
                                new Date(s.planned_end_date).getTime()
                            )));

                            return (
                                <div
                                    key={row.id}
                                    className={cn(
                                        "absolute flex items-center",
                                        "cursor-pointer"
                                    )}
                                    style={{
                                        top: y,
                                        height: rowHeight,
                                        left: timelineLayout.getPositionForDate(earliestStart),
                                        width: timelineLayout.getPositionForDate(latestEnd) -
                                            timelineLayout.getPositionForDate(earliestStart),
                                    }}
                                    onClick={() => setExpandedOrders(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(order.id)) {
                                            newSet.delete(order.id);
                                        } else {
                                            newSet.add(order.id);
                                        }
                                        return newSet;
                                    })}
                                >
                                    <div className="h-8 bg-blue-200 rounded px-2 flex items-center">
                                        <span className="text-xs font-medium truncate">
                                            {order.order_number}
                                        </span>
                                    </div>
                                </div>
                            );
                        } else if (row.type === 'step') {
                            // Render step bar
                            const step = row.data;
                            const isDragging = draggedStep?.id === step.id;

                            return (
                                <StepBar
                                    key={row.id}
                                    step={step}
                                    x={timelineLayout.getPositionForDate(new Date(step.planned_start_date)) +
                                        (isDragging ? draggedStep.offsetX : 0)}
                                    y={y}
                                    width={timelineLayout.getPositionForDate(new Date(step.planned_end_date)) -
                                        timelineLayout.getPositionForDate(new Date(step.planned_start_date))}
                                    height={rowHeight}
                                    isSelected={selectedStepId === step.id}
                                    isDragging={isDragging}
                                    onSelect={() => setSelectedStepId(step.id)}
                                    onDragStart={(e) => handleStepDragStart(e, step)}
                                />
                            );
                        }

                        return null;
                    })}

                    {/* Dependencies */}
                    <Dependencies
                        steps={rows.filter(r => r.type === 'step').map(r => r.data)}
                        rows={rows}
                        rowHeight={rowHeight}
                        layout={timelineLayout}
                    />
                </div>
            </ScrollContainer>
        </div>
    );
};


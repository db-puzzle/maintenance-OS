import React, { useMemo } from 'react';
import { ScrollContainer } from '../shared/ScrollContainer';
import { GanttGrid } from './GanttGrid/GanttGrid';
import { GanttTimeline } from './GanttTimeline/GanttTimeline';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ImperativePanelGroupHandle } from '@/components/ui/resizable';

interface GanttViewProps {
    orders: any[]; // Manufacturing orders with steps
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: number;
    onStepUpdate: (stepId: string, updates: any) => void;
    onOrderToggle: (orderId: number) => void;
    leftPanelSize: number;
    onLeftPanelResize: (size: number) => void;
    panelGroupRef: React.RefObject<ImperativePanelGroupHandle | null>;
}

export const GanttView: React.FC<GanttViewProps> = ({
    orders,
    viewConfig,
    zoomLevel,
    onStepUpdate,
    onOrderToggle,
    leftPanelSize,
    onLeftPanelResize,
    panelGroupRef,
}) => {
    // Flatten orders and their steps for display
    const visibleTasks = useMemo(() => {
        const tasks: any[] = [];

        const processOrder = (order: any, parentLevel: number = 0) => {
            // Add the order itself as a parent task
            tasks.push({
                ...order,
                isParent: true,
                level: parentLevel,
                type: 'order',
                hasChildren: !!(order.children?.length || order.steps?.length),
            });

            // Process child orders first (if any)
            if (order.expanded !== false && order.children) {
                order.children.forEach((childOrder: any) => {
                    processOrder(childOrder, parentLevel + 1);
                });
            }

            // Then add steps if order is expanded
            if (order.expanded !== false && order.steps) {
                order.steps.forEach((step: any) => {
                    tasks.push({
                        ...step,
                        parentId: order.id,
                        orderId: order.id,
                        level: parentLevel + 1,
                        type: 'step',
                    });
                });
            }
        };

        orders.forEach(order => processOrder(order, 0));

        return tasks;
    }, [orders]);

    // Calculate timeline width based on date range and zoom
    const timelineWidth = useMemo(() => {
        const daysDiff = Math.ceil(
            (viewConfig.endDate.getTime() - viewConfig.startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return daysDiff * 40 * zoomLevel; // 40px per day at zoom level 1
    }, [viewConfig, zoomLevel]);

    return (
        <ResizablePanelGroup
            ref={panelGroupRef}
            direction="horizontal"
            className="h-full gantt-view bg-background border-b"
            onLayout={(sizes) => {
                if (sizes.length > 0 && Math.abs(sizes[0] - leftPanelSize) > 0.1) {
                    onLeftPanelResize(sizes[0]);
                }
            }}
        >
            {/* Left Panel - Task Grid */}
            <ResizablePanel
                defaultSize={leftPanelSize}
                minSize={20}
                maxSize={50}
            >
                <GanttGrid
                    tasks={visibleTasks}
                    onTaskToggle={(taskId) => {
                        // Handle expand/collapse
                        // taskId is a string, but order.id is a number
                        const numericId = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;

                        // Search for order recursively in the hierarchy
                        const findOrder = (orderList: any[]): any => {
                            for (const order of orderList) {
                                if (order.id === numericId) {
                                    return order;
                                }
                                if (order.children) {
                                    const found = findOrder(order.children);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };

                        const order = findOrder(orders);
                        if (order) {
                            onOrderToggle(numericId);
                        }
                    }}
                />
            </ResizablePanel>

            <ResizableHandle />

            {/* Right Panel - Timeline */}
            <ResizablePanel defaultSize={100 - leftPanelSize}>
                <GanttTimeline
                    tasks={visibleTasks}
                    viewConfig={viewConfig}
                    zoomLevel={zoomLevel}
                    timelineWidth={timelineWidth}
                    onStepUpdate={onStepUpdate}
                />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};

import React, { useMemo } from 'react';
import { GanttGrid } from './GanttGrid/GanttGrid';
import { GanttTimeline } from './GanttTimeline/GanttTimeline';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ImperativePanelGroupHandle } from '@/components/ui/resizable';
import { ZoomLevel } from '../../utils/zoomConfig';

interface Step {
    id: string;
    planned_start_date: string;
    planned_end_date: string;
}

interface Order {
    id: number;
    expanded?: boolean;
    children?: Order[];
    steps?: Step[];
}

interface Task {
    id: string | number;
    isParent?: boolean;
    level: number;
    type: 'order' | 'step';
    hasChildren?: boolean;
    parentId?: number;
    orderId?: number;
    expanded?: boolean;
    children?: Order[];
    steps?: Step[];
    planned_start_date?: string;
    planned_end_date?: string;
}

interface StepUpdate {
    planned_start_date?: string;
    planned_end_date?: string;
}

interface GanttViewProps {
    orders: Order[]; // Manufacturing orders with steps
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: ZoomLevel;
    onStepUpdate: (stepId: string, updates: StepUpdate) => void;
    onOrderToggle: (orderId: number) => void;
    leftPanelSize: number;
    onLeftPanelResize: (size: number) => void;
    panelGroupRef: React.RefObject<ImperativePanelGroupHandle | null>;
    showDependencies: boolean;
    onScrollContainerRef?: (container: HTMLElement | null) => void;
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
    showDependencies,
    onScrollContainerRef,
}) => {
    // Flatten orders and their steps for display
    const visibleTasks = useMemo(() => {
        const tasks: Task[] = [];

        const processOrder = (order: Order, parentLevel: number = 0) => {
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
                order.children.forEach((childOrder: Order) => {
                    processOrder(childOrder, parentLevel + 1);
                });
            }

            // Then add steps if order is expanded
            if (order.expanded !== false && order.steps) {
                order.steps.forEach((step: Step) => {
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
        // Use pixelsPerDay from zoom level's time scale conversion
        let pixelsPerDay: number;
        switch (zoomLevel.timeScale) {
            case 'hour':
                pixelsPerDay = zoomLevel.pixelsPerUnit * 24;
                break;
            case '4hour':
                pixelsPerDay = (zoomLevel.pixelsPerUnit / 4) * 24;
                break;
            case 'day':
                pixelsPerDay = zoomLevel.pixelsPerUnit;
                break;
            case '3day':
                pixelsPerDay = zoomLevel.pixelsPerUnit / 3;
                break;
            case 'week':
                pixelsPerDay = zoomLevel.pixelsPerUnit / 7;
                break;
            case '2week':
                pixelsPerDay = zoomLevel.pixelsPerUnit / 14;
                break;
            case 'month':
                pixelsPerDay = zoomLevel.pixelsPerUnit / 30;
                break;
            case 'quarter':
                pixelsPerDay = zoomLevel.pixelsPerUnit / 91;
                break;
            default:
                pixelsPerDay = 100;
        }
        return Math.max(daysDiff * pixelsPerDay, 1000); // Minimum width of 1000px
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
                    tasks={visibleTasks as any}
                    onTaskToggle={(taskId) => {
                        // Handle expand/collapse
                        // taskId is a string, but order.id is a number
                        const numericId = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;

                        // Search for order recursively in the hierarchy
                        const findOrder = (orderList: Order[]): Order | null => {
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
                    tasks={visibleTasks as any}
                    viewConfig={viewConfig}
                    zoomLevel={zoomLevel}
                    timelineWidth={timelineWidth}
                    onStepUpdate={onStepUpdate}
                    showDependencies={showDependencies}
                    onScrollContainerRef={onScrollContainerRef}
                />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};

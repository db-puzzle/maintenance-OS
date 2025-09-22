import React, { useMemo } from 'react';
import { ScrollContainer } from '../shared/ScrollContainer';
import { GanttGrid } from './GanttGrid/GanttGrid';
import { GanttTimeline } from './GanttTimeline/GanttTimeline';
import { cn } from '@/lib/utils';

interface GanttViewProps {
    orders: any[]; // Manufacturing orders with steps
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: number;
    onStepUpdate: (stepId: string, updates: any) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({
    orders,
    viewConfig,
    zoomLevel,
    onStepUpdate,
}) => {
    // Flatten orders and their steps for display
    const visibleTasks = useMemo(() => {
        const tasks: any[] = [];

        orders.forEach(order => {
            // Add the order itself as a parent task
            tasks.push({
                ...order,
                isParent: true,
                level: 0,
                type: 'order',
            });

            // Add steps if order is expanded
            if (order.expanded !== false && order.steps) {
                order.steps.forEach((step: any) => {
                    tasks.push({
                        ...step,
                        parentId: order.id,
                        orderId: order.id,
                        level: 1,
                        type: 'step',
                    });
                });
            }
        });

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
        <div className="gantt-view flex h-full bg-background border-b">
            {/* Left Panel - Task Grid */}
            <div className="gantt-grid-container w-[610px] flex-shrink-0 border-r">
                <ScrollContainer id="gantt-grid" axis="y">
                    <GanttGrid
                        tasks={visibleTasks}
                        onTaskToggle={(taskId) => {
                            // Handle expand/collapse
                            const order = orders.find(o => o.id === taskId);
                            if (order) {
                                onStepUpdate(taskId, { expanded: !order.expanded });
                            }
                        }}
                    />
                </ScrollContainer>
            </div>

            {/* Right Panel - Timeline */}
            <div className="gantt-timeline-container flex-1 overflow-hidden">
                <ScrollContainer id="gantt-timeline" axis="xy">
                    <GanttTimeline
                        tasks={visibleTasks}
                        viewConfig={viewConfig}
                        zoomLevel={zoomLevel}
                        timelineWidth={timelineWidth}
                        onStepUpdate={onStepUpdate}
                    />
                </ScrollContainer>
            </div>
        </div>
    );
};

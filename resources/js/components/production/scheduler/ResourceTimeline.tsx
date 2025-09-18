import React, { useMemo } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { WorkCell } from '@/types/production';
import { ProductionSchedule } from '@/types/scheduler';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
    workCells: WorkCell[];
    schedules: ProductionSchedule[];
    timeRange: {
        start: Date;
        end: Date;
    };
    zoomLevel: number;
}

export default function ResourceTimeline({
    workCells,
    schedules,
    timeRange,
    zoomLevel,
}: Props) {
    // Calculate timeline dimensions
    const totalMinutes = differenceInMinutes(timeRange.end, timeRange.start);
    const pixelsPerMinute = (800 * zoomLevel) / totalMinutes; // Base width of 800px
    const timelineWidth = 800 * zoomLevel;

    // Group schedules by work cell
    const schedulesByWorkCell = useMemo(() => {
        const groups = new Map<number, ProductionSchedule[]>();

        schedules.forEach(schedule => {
            if (schedule.work_cell_id) {
                if (!groups.has(schedule.work_cell_id)) {
                    groups.set(schedule.work_cell_id, []);
                }
                groups.get(schedule.work_cell_id)!.push(schedule);
            }
        });

        // Sort schedules within each work cell by start time
        groups.forEach(scheduleList => {
            scheduleList.sort((a, b) =>
                new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
            );
        });

        return groups;
    }, [schedules]);

    // Calculate position and width for a schedule
    const getSchedulePosition = (schedule: ProductionSchedule) => {
        const start = new Date(schedule.scheduled_start);
        const end = new Date(schedule.scheduled_end);
        const startOffset = differenceInMinutes(start, timeRange.start);
        const duration = differenceInMinutes(end, start);

        return {
            left: startOffset * pixelsPerMinute,
            width: Math.max(duration * pixelsPerMinute, 20), // Minimum width for visibility
        };
    };

    // Calculate work cell utilization
    const getWorkCellUtilization = (workCellId: number) => {
        const cellSchedules = schedulesByWorkCell.get(workCellId) || [];
        if (cellSchedules.length === 0) return 0;

        let totalScheduledMinutes = 0;
        cellSchedules.forEach(schedule => {
            const duration = differenceInMinutes(
                new Date(schedule.scheduled_end),
                new Date(schedule.scheduled_start)
            );
            totalScheduledMinutes += duration;
        });

        return Math.round((totalScheduledMinutes / totalMinutes) * 100);
    };

    // Render work cell row
    const renderWorkCellRow = (workCell: WorkCell) => {
        const cellSchedules = schedulesByWorkCell.get(workCell.id) || [];
        const utilization = getWorkCellUtilization(workCell.id);

        return (
            <div key={workCell.id} className="flex border-b">
                {/* Work cell info */}
                <div className="w-48 flex-shrink-0 p-2 border-r bg-muted/30">
                    <div className="flex flex-col gap-1">
                        <div className="font-medium text-sm">{workCell.code}</div>
                        <div className="text-xs text-muted-foreground truncate">
                            {workCell.name}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                                Utilization:
                            </div>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all",
                                        utilization > 80 && "bg-red-500",
                                        utilization > 60 && utilization <= 80 && "bg-yellow-500",
                                        utilization <= 60 && "bg-green-500"
                                    )}
                                    style={{ width: `${utilization}%` }}
                                />
                            </div>
                            <span className="text-xs">{utilization}%</span>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 relative h-16" style={{ width: timelineWidth }}>
                    {cellSchedules.map(schedule => {
                        const position = getSchedulePosition(schedule);
                        const step = schedule.manufacturing_step;
                        const order = step.manufacturing_route.manufacturing_order;

                        return (
                            <TooltipProvider key={schedule.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "absolute h-12 top-2 rounded text-xs px-1 flex items-center justify-center",
                                                "hover:shadow-md hover:z-10 cursor-pointer",
                                                step.status === 'completed' && "bg-green-500 text-white",
                                                step.status === 'in_progress' && "bg-blue-500 text-white",
                                                step.status === 'on_hold' && "bg-yellow-500",
                                                !['completed', 'in_progress', 'on_hold'].includes(step.status) && "bg-gray-400 text-white"
                                            )}
                                            style={{
                                                left: position.left,
                                                width: position.width,
                                            }}
                                        >
                                            <span className="truncate">
                                                {order.order_number}
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="text-sm">
                                            <div className="font-medium">{order.order_number}</div>
                                            <div className="text-xs">{step.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(schedule.scheduled_start), 'MMM d, HH:mm')} -
                                                {format(new Date(schedule.scheduled_end), 'HH:mm')}
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}

                    {/* Unavailable periods (placeholder for shift/maintenance windows) */}
                    {/* These would be rendered based on work cell shift data */}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full border-t">
            {/* Header */}
            <div className="flex items-center px-2 py-1 border-b bg-muted/30">
                <div className="font-medium text-sm">Resource Allocation</div>
            </div>

            {/* Work cells */}
            <ScrollArea className="flex-1">
                <div className="min-h-full">
                    {workCells.map(renderWorkCellRow)}

                    {workCells.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            No work cells available
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

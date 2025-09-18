import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { format, startOfDay, differenceInMinutes, addMinutes } from 'date-fns';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ManufacturingOrder } from '@/types/production';
import { ProductionSchedule } from '@/types/scheduler';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface ScheduledOrder {
    order: ManufacturingOrder;
    schedules: ProductionSchedule[];
}

interface Props {
    schedules: ProductionSchedule[];
    orders: ScheduledOrder[];
    workCells: unknown[];
    timeRange: {
        start: Date;
        end: Date;
    };
    zoomLevel: number;
    selectedSchedule: ProductionSchedule | null;
    onScheduleUpdate: (scheduleId: number, newStart: Date, newEnd: Date) => void;
    onScheduleSelect: (schedule: ProductionSchedule | null) => void;
    onToggleLock: (scheduleId: number) => void;
}

export default function SchedulerTimeline({
    schedules,
    orders,
    workCells: _workCells,
    timeRange,
    zoomLevel,
    selectedSchedule,
    onScheduleUpdate,
    onScheduleSelect,
    onToggleLock: _onToggleLock,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [draggedSchedule, setDraggedSchedule] = useState<ProductionSchedule | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    // Initialize with all orders expanded to show hierarchy by default
    const [expandedOrders] = useState<Set<number>>(() => {
        return new Set(orders.map(o => o.order.id));
    });

    // Calculate timeline dimensions
    const totalMinutes = differenceInMinutes(timeRange.end, timeRange.start);
    const pixelsPerMinute = (containerWidth * zoomLevel) / totalMinutes;
    const timelineWidth = containerWidth * zoomLevel;

    // Update container width on resize
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Toggle order expansion - removed since we're not using it in the simplified version

    // Group schedules by order
    const schedulesGroupedByOrder = useMemo(() => {
        const groups = new Map<number, ProductionSchedule[]>();

        schedules.forEach(schedule => {
            const orderId = schedule.manufacturing_step.manufacturing_route.manufacturing_order_id;
            if (!groups.has(orderId)) {
                groups.set(orderId, []);
            }
            groups.get(orderId)!.push(schedule);
        });

        // Sort schedules within each group by step display order
        groups.forEach(scheduleList => {
            scheduleList.sort((a, b) =>
                a.manufacturing_step.display_order - b.manufacturing_step.display_order
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

    // Generate time scale markers
    const timeMarkers = useMemo(() => {
        const markers = [];
        const hoursInRange = totalMinutes / 60;
        let interval = 1; // Default to hourly

        if (hoursInRange > 48) {
            interval = 24; // Daily for long ranges
        } else if (hoursInRange > 12) {
            interval = 4; // Every 4 hours
        }

        let currentTime = startOfDay(timeRange.start);
        while (currentTime <= timeRange.end) {
            const offset = differenceInMinutes(currentTime, timeRange.start);
            if (offset >= 0) {
                markers.push({
                    time: currentTime,
                    position: offset * pixelsPerMinute,
                    label: interval >= 24
                        ? format(currentTime, 'MMM d')
                        : format(currentTime, 'HH:mm'),
                });
            }
            currentTime = addMinutes(currentTime, interval * 60);
        }

        return markers;
    }, [timeRange, totalMinutes, pixelsPerMinute]);

    // Handle drag start
    const handleDragStart = (e: React.MouseEvent, schedule: ProductionSchedule) => {
        if (schedule.is_locked) return;

        const rect = e.currentTarget.getBoundingClientRect();
        setDraggedSchedule(schedule);
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        setDragPosition({ x: e.clientX, y: e.clientY });
        setIsDragging(true);

        // Prevent text selection during drag
        e.preventDefault();
    };

    // Handle drag move
    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !draggedSchedule) return;

        setDragPosition({ x: e.clientX, y: e.clientY });
    }, [isDragging, draggedSchedule]);

    // Handle drag end
    const handleDragEnd = useCallback((e: MouseEvent) => {
        if (!isDragging || !draggedSchedule || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - containerRect.left - dragOffset.x;

        // Calculate new start time based on position
        const minutesFromStart = Math.max(0, relativeX / pixelsPerMinute);
        const newStart = addMinutes(timeRange.start, minutesFromStart);

        // Calculate duration
        const duration = differenceInMinutes(
            new Date(draggedSchedule.scheduled_end),
            new Date(draggedSchedule.scheduled_start)
        );
        const newEnd = addMinutes(newStart, duration);

        // Check if new time is within bounds
        if (newEnd <= timeRange.end) {
            onScheduleUpdate(draggedSchedule.id, newStart, newEnd);
        }

        // Reset drag state
        setDraggedSchedule(null);
        setIsDragging(false);
    }, [isDragging, draggedSchedule, dragOffset, pixelsPerMinute, timeRange, onScheduleUpdate]);

    // Add and remove global event listeners for drag
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleDragMove);
                document.removeEventListener('mouseup', handleDragEnd);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Render timeline header with time scale
    const renderTimeScale = () => (
        <div className="h-10 border-b bg-muted/30 relative" style={{ width: timelineWidth }}>
            {timeMarkers.map((marker, index) => (
                <div
                    key={index}
                    className="absolute top-0 h-full border-l border-muted"
                    style={{ left: marker.position }}
                >
                    <span className="absolute top-2 left-1 text-xs text-muted-foreground whitespace-nowrap">
                        {marker.label}
                    </span>
                </div>
            ))}
        </div>
    );

    // Render a single schedule bar
    const renderScheduleBar = (schedule: ProductionSchedule, rowIndex: number) => {
        const position = getSchedulePosition(schedule);
        const isSelected = selectedSchedule?.id === schedule.id;
        const step = schedule.manufacturing_step;
        const order = step.manufacturing_route.manufacturing_order;

        return (
            <TooltipProvider key={schedule.id}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={cn(
                                "absolute h-7 rounded cursor-pointer transition-all flex items-center px-2 gap-1",
                                "hover:shadow-md hover:z-10",
                                isSelected && "ring-2 ring-primary z-20",
                                schedule.is_locked && "cursor-not-allowed opacity-80",
                                step.status === 'completed' && "bg-green-500 text-white",
                                step.status === 'in_progress' && "bg-blue-500 text-white",
                                step.status === 'on_hold' && "bg-yellow-500",
                                !['completed', 'in_progress', 'on_hold'].includes(step.status) && "bg-gray-400 text-white"
                            )}
                            style={{
                                left: position.left,
                                width: position.width,
                                top: rowIndex * 35 + 4,
                                opacity: isDragging && draggedSchedule?.id === schedule.id ? 0.5 : 1,
                                cursor: schedule.is_locked ? 'not-allowed' : 'grab',
                            }}
                            onClick={() => !isDragging && onScheduleSelect(schedule)}
                            onMouseDown={(e) => handleDragStart(e, schedule)}
                        >
                            {schedule.is_locked && (
                                <Lock className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span className="text-xs truncate flex-1">
                                {step.name}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="text-sm">
                            <div className="font-medium">{step.name}</div>
                            <div className="text-xs text-muted-foreground">
                                {order.order_number} - {order.item?.name}
                            </div>
                            <div className="text-xs mt-1">
                                {format(new Date(schedule.scheduled_start), 'MMM d, HH:mm')} -
                                {format(new Date(schedule.scheduled_end), 'HH:mm')}
                            </div>
                            {schedule.work_cell && (
                                <div className="text-xs">
                                    Work Cell: {schedule.work_cell.name}
                                </div>
                            )}
                            {schedule.is_locked && (
                                <div className="text-xs text-yellow-600 mt-1">
                                    Position locked
                                </div>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    // Render order rows with hierarchy
    const renderOrderRows = () => {
        let rowIndex = 0;
        const rows: React.ReactNode[] = [];

        orders.forEach((scheduledOrder) => {
            const orderSchedules = schedulesGroupedByOrder.get(scheduledOrder.order.id) || [];
            const isExpanded = expandedOrders.has(scheduledOrder.order.id);
            const hasSchedules = orderSchedules.length > 0;

            // Render the manufacturing order header row
            rows.push(
                <div
                    key={`order-${scheduledOrder.order.id}`}
                    className="relative h-[40px] border-b hover:bg-muted/20 bg-muted/5"
                    style={{ width: timelineWidth }}
                >
                    {/* Order-level timeline visualization */}
                    {hasSchedules && orderSchedules.length > 0 && (
                        <div
                            className="absolute h-1 bg-primary/20 rounded top-[18px]"
                            style={{
                                left: Math.min(...orderSchedules.map(s => getSchedulePosition(s).left)),
                                width: Math.max(...orderSchedules.map(s => {
                                    const pos = getSchedulePosition(s);
                                    return pos.left + pos.width;
                                })) - Math.min(...orderSchedules.map(s => getSchedulePosition(s).left)),
                            }}
                        />
                    )}
                </div>
            );
            rowIndex++;

            // Render individual step rows if expanded
            if (isExpanded && hasSchedules) {
                orderSchedules.forEach((schedule) => {
                    const currentStepRowIndex = rowIndex;

                    rows.push(
                        <div
                            key={`step-${schedule.id}`}
                            className="relative h-[35px] border-b hover:bg-muted/10"
                            style={{ width: timelineWidth }}
                        >
                            {/* Timeline bar for the step */}
                            {renderScheduleBar(schedule, currentStepRowIndex)}
                        </div>
                    );
                    rowIndex++;
                });
            }
        });

        return rows;
    };

    return (
        <div ref={containerRef} className="flex flex-col h-full overflow-auto bg-background">
            {/* Time scale header */}
            <div className="sticky top-0 z-10 bg-background">
                {renderTimeScale()}
            </div>

            {/* Timeline content */}
            <div className="flex-1 relative">
                {schedules.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                            <p className="text-lg mb-2">No schedules created yet</p>
                            <p className="text-sm">Click "Run Scheduler" to generate schedules for the manufacturing orders</p>
                        </div>
                    </div>
                ) : (
                    renderOrderRows()
                )}

                {/* Grid lines */}
                <div className="absolute inset-0 pointer-events-none" style={{ width: timelineWidth }}>
                    {timeMarkers.map((marker, index) => (
                        <div
                            key={index}
                            className="absolute top-0 bottom-0 border-l border-muted/50"
                            style={{ left: marker.position }}
                        />
                    ))}
                </div>
            </div>

            {/* Drag preview */}
            {isDragging && draggedSchedule && (
                <div
                    className="fixed pointer-events-none z-50 opacity-80"
                    style={{
                        left: dragPosition.x - dragOffset.x,
                        top: dragPosition.y - dragOffset.y,
                    }}
                >
                    <div
                        className={cn(
                            "h-8 rounded px-2 flex items-center gap-1 shadow-lg",
                            "bg-blue-500 text-white"
                        )}
                        style={{
                            width: getSchedulePosition(draggedSchedule).width,
                        }}
                    >
                        <span className="text-xs truncate">
                            {draggedSchedule.manufacturing_step.name}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

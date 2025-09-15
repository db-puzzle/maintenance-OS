import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useScheduler } from '@/hooks/production/useScheduler';
import { format, startOfDay, endOfDay, eachDayOfInterval, eachHourOfInterval, addDays } from 'date-fns';
import { Lock } from 'lucide-react';

interface DragState {
    stepId: number;
    initialX: number;
    initialY: number;
    offsetX: number;
    offsetY: number;
}

export function SchedulerTimeline() {
    const scheduler = useScheduler();
    const timelineRef = useRef<HTMLDivElement>(null);
    const [viewportWidth, setViewportWidth] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [dropTarget, setDropTarget] = useState<{ workCellId: number; time: Date } | null>(null);

    useEffect(() => {
        const updateViewport = () => {
            if (timelineRef.current) {
                setViewportWidth(timelineRef.current.clientWidth);
                setViewportHeight(timelineRef.current.clientHeight);
            }
        };

        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    const getTimeScale = () => {
        const start = new Date(scheduler.dateRange.start);
        const end = new Date(scheduler.dateRange.end);
        
        switch (scheduler.zoomLevel) {
            case 'hour':
                return {
                    intervals: eachHourOfInterval({ start, end }),
                    width: 60,
                    format: (date: Date) => format(date, 'HH:mm'),
                };
            case 'day':
            default:
                return {
                    intervals: eachDayOfInterval({ start, end }),
                    width: 120,
                    format: (date: Date) => format(date, 'MMM dd'),
                };
            case 'week':
                return {
                    intervals: eachDayOfInterval({ start, end }).filter((_, i) => i % 7 === 0),
                    width: 200,
                    format: (date: Date) => `Week ${format(date, 'w')}`,
                };
            case 'month':
                return {
                    intervals: eachDayOfInterval({ start, end }).filter(d => d.getDate() === 1),
                    width: 300,
                    format: (date: Date) => format(date, 'MMM yyyy'),
                };
        }
    };

    const timeScale = getTimeScale();
    const totalWidth = timeScale.intervals.length * timeScale.width;

    const getPositionForDate = (date: Date): number => {
        const start = new Date(scheduler.dateRange.start);
        const diffMs = date.getTime() - start.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        switch (scheduler.zoomLevel) {
            case 'hour':
                return (diffMs / (1000 * 60 * 60)) * timeScale.width;
            case 'day':
            default:
                return diffDays * timeScale.width;
            case 'week':
                return (diffDays / 7) * timeScale.width;
            case 'month':
                return (diffDays / 30) * timeScale.width;
        }
    };

    const getDateForPosition = (x: number): Date => {
        const start = new Date(scheduler.dateRange.start);
        
        switch (scheduler.zoomLevel) {
            case 'hour':
                return new Date(start.getTime() + (x / timeScale.width) * 60 * 60 * 1000);
            case 'day':
            default:
                return new Date(start.getTime() + (x / timeScale.width) * 24 * 60 * 60 * 1000);
            case 'week':
                return new Date(start.getTime() + (x / timeScale.width) * 7 * 24 * 60 * 60 * 1000);
            case 'month':
                return new Date(start.getTime() + (x / timeScale.width) * 30 * 24 * 60 * 60 * 1000);
        }
    };

    const handleStepDragStart = (e: React.MouseEvent, stepId: number) => {
        const step = scheduler.getStepById(stepId);
        if (!step || step.schedule?.is_locked) return;

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setDragState({
            stepId,
            initialX: e.clientX,
            initialY: e.clientY,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState) return;

        const x = e.clientX - dragState.offsetX + scrollLeft;
        const y = e.clientY - dragState.offsetY + scrollTop;

        // Find which work cell row we're over
        const rowHeight = 60;
        const rowIndex = Math.floor(y / rowHeight);
        const workCell = scheduler.workCells[rowIndex];

        if (workCell) {
            const time = getDateForPosition(x);
            setDropTarget({ workCellId: workCell.id, time });
        } else {
            setDropTarget(null);
        }
    };

    const handleMouseUp = async () => {
        if (!dragState || !dropTarget) {
            setDragState(null);
            setDropTarget(null);
            return;
        }

        const step = scheduler.getStepById(dragState.stepId);
        if (!step) return;

        // Calculate new end time based on step duration
        const duration = step.setup_time_minutes + (step.cycle_time_minutes * step.order_quantity);
        const endTime = new Date(dropTarget.time.getTime() + duration * 60 * 1000);

        await scheduler.updateSchedule(dragState.stepId, {
            scheduled_start: dropTarget.time.toISOString(),
            scheduled_end: endTime.toISOString(),
            work_cell_id: dropTarget.workCellId,
        });

        setDragState(null);
        setDropTarget(null);
    };

    const renderTimeHeader = () => {
        return (
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex" style={{ width: `${totalWidth}px` }}>
                    {timeScale.intervals.map((interval, index) => (
                        <div
                            key={index}
                            className="border-r px-2 py-1 text-xs font-medium"
                            style={{ width: `${timeScale.width}px` }}
                        >
                            {timeScale.format(interval)}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderWorkCellRows = () => {
        const rowHeight = 60;

        return scheduler.workCells.map((workCell, index) => {
            const y = index * rowHeight;
            const cellSchedules = scheduler.getSchedulesForWorkCell(workCell.id);

            return (
                <div
                    key={workCell.id}
                    className="absolute border-b"
                    style={{
                        top: `${y}px`,
                        height: `${rowHeight}px`,
                        width: `${totalWidth}px`,
                    }}
                >
                    {/* Work cell background */}
                    <div className="absolute inset-0 hover:bg-accent/5" />

                    {/* Scheduled steps */}
                    {cellSchedules.map((schedule) => {
                        const x = getPositionForDate(new Date(schedule.scheduled_start));
                        const width = getPositionForDate(new Date(schedule.scheduled_end)) - x;
                        const step = scheduler.getStepById(schedule.manufacturing_step_id);
                        if (!step) return null;

                        const isHighlighted = scheduler.highlightedItem?.type === 'step' && 
                                            scheduler.highlightedItem.id === step.id;

                        return (
                            <div
                                key={schedule.id}
                                className={cn(
                                    "absolute top-1 bottom-1 rounded px-2 py-1 cursor-move",
                                    "bg-primary text-primary-foreground",
                                    "hover:shadow-lg transition-shadow",
                                    schedule.is_locked && "cursor-not-allowed opacity-80",
                                    isHighlighted && "ring-2 ring-offset-2 ring-primary",
                                    dragState?.stepId === step.id && "opacity-50"
                                )}
                                style={{
                                    left: `${x}px`,
                                    width: `${width}px`,
                                }}
                                onMouseDown={(e) => handleStepDragStart(e, step.id)}
                            >
                                <div className="flex items-center gap-1 h-full">
                                    {schedule.is_locked && <Lock className="h-3 w-3" />}
                                    <div className="truncate text-xs">
                                        <div className="font-medium">{step.name}</div>
                                        <div className="opacity-80">{step.order_number}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Drop target indicator */}
                    {dropTarget && dropTarget.workCellId === workCell.id && (
                        <div
                            className="absolute top-1 bottom-1 bg-primary/20 border-2 border-primary border-dashed rounded"
                            style={{
                                left: `${getPositionForDate(dropTarget.time)}px`,
                                width: '100px',
                            }}
                        />
                    )}
                </div>
            );
        });
    };

    const renderOrderBars = () => {
        return scheduler.orders.map((order) => {
            const steps = scheduler.getStepsForOrder(order.id);
            if (steps.length === 0) return null;

            const scheduledSteps = steps.filter(s => s.schedule);
            if (scheduledSteps.length === 0) return null;

            const earliestStart = Math.min(...scheduledSteps.map(s => 
                getPositionForDate(new Date(s.schedule!.scheduled_start))
            ));
            const latestEnd = Math.max(...scheduledSteps.map(s => 
                getPositionForDate(new Date(s.schedule!.scheduled_end))
            ));

            const isHighlighted = scheduler.highlightedItem?.type === 'order' && 
                                scheduler.highlightedItem.id === order.id;

            return (
                <div
                    key={`order-bar-${order.id}`}
                    className={cn(
                        "absolute h-1 bg-muted-foreground/20 rounded",
                        isHighlighted && "bg-primary/30 h-2"
                    )}
                    style={{
                        left: `${earliestStart}px`,
                        width: `${latestEnd - earliestStart}px`,
                        top: '-4px',
                    }}
                />
            );
        });
    };

    return (
        <div
            ref={timelineRef}
            className="h-full overflow-auto relative"
            onScroll={(e) => {
                setScrollLeft(e.currentTarget.scrollLeft);
                setScrollTop(e.currentTarget.scrollTop);
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                if (dragState) {
                    setDragState(null);
                    setDropTarget(null);
                }
            }}
        >
            {/* Time header */}
            {renderTimeHeader()}

            {/* Timeline content */}
            <div className="relative" style={{ height: `${scheduler.workCells.length * 60}px` }}>
                {/* Grid lines */}
                <div className="absolute inset-0 pointer-events-none">
                    {timeScale.intervals.map((_, index) => (
                        <div
                            key={index}
                            className="absolute top-0 bottom-0 border-r border-muted"
                            style={{ left: `${index * timeScale.width}px` }}
                        />
                    ))}
                </div>

                {/* Order bars */}
                {renderOrderBars()}

                {/* Work cell rows */}
                {renderWorkCellRows()}
            </div>
        </div>
    );
}
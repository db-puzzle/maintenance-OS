import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ScrollContainer } from '@/components/production/scheduler-v2/components/shared/ScrollContainer';
import { TimeAxisWithoutDates } from './TimeAxisWithoutDates';
import { Dependencies } from '@/components/production/scheduler-v2/components/GanttView/GanttTimeline/Dependencies';
import { NonWorkingTime } from '@/components/production/scheduler-v2/components/GanttView/GanttTimeline/NonWorkingTime';
import { calculateTimelineLayout } from '@/components/production/scheduler-v2/utils/timelineCalculations';
import { cn } from '@/lib/utils';
import { ZoomLevel } from '@/components/production/scheduler-v2/utils/zoomConfig';
import { AlertCircle, Lock } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface GanttTask {
    id: string | number;
    type: 'order' | 'step';
    name: string;
    order_number?: string;
    duration_hours: number;
    status?: string;
    is_fictitious?: boolean;
    has_missing_times?: boolean;
    is_locked?: boolean;
    level?: number;
    orderId?: number;
}

interface GanttRow {
    type: 'order' | 'step';
    data: GanttTask;
    level: number;
    id: string;
    orderId?: number;
}

interface GanttTimelineProps {
    tasks: GanttTask[];
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: ZoomLevel;
    timelineWidth: number;
    onStepUpdate: (stepId: string, updates: Record<string, unknown>) => void;
    showDependencies?: boolean;
    onScrollContainerRef?: (container: HTMLElement | null) => void;
}

// Custom StepBar component with validation indicators
const ValidationStepBar: React.FC<{
    step: GanttTask;
    x: number;
    y: number;
    width: number;
    height: number;
    isSelected: boolean;
    isDragging: boolean;
    onSelect: () => void;
    onDragStart: (e: React.MouseEvent) => void;
}> = ({
    step,
    x,
    y,
    width,
    height,
    isSelected,
    isDragging,
    onSelect,
    onDragStart,
}) => {
        const isFictitious = step.is_fictitious || step.has_missing_times;
        const isStep = step.type === 'step';

        const getStatusColor = (status: string, isFictitious: boolean): string => {
            if (isFictitious) {
                return 'bg-yellow-100 dark:bg-yellow-900/20';
            }

            switch (status) {
                case 'pending':
                    return 'bg-gray-400';
                case 'ready':
                case 'queued':
                    return 'bg-yellow-400';
                case 'in_progress':
                    return 'bg-blue-400';
                case 'completed':
                    return 'bg-green-400';
                case 'on_hold':
                    return 'bg-orange-400';
                default:
                    return 'bg-gray-300';
            }
        };

        const getBorderStyle = (isFictitious: boolean, isSelected: boolean): string => {
            if (isFictitious) {
                return cn(
                    "border-2 border-dashed border-yellow-500 dark:border-yellow-400",
                    isSelected && "ring-2 ring-yellow-500/20"
                );
            }
            return cn(
                "border-2",
                isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent"
            );
        };

        return (
            <TooltipProvider>
                <div
                    className={cn(
                        "absolute flex items-center group",
                        isDragging && "opacity-50",
                        !step.is_locked && isStep && "cursor-pointer"
                    )}
                    style={{
                        left: `${x}px`,
                        top: `${y + 8}px`,
                        width: `${width}px`,
                        height: `${height - 16}px`,
                    }}
                    onClick={onSelect}
                    onMouseDown={isStep ? onDragStart : undefined}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={cn(
                                    "relative h-full rounded shadow-sm overflow-hidden",
                                    "transition-all",
                                    getStatusColor(step.status || 'pending', isFictitious || false),
                                    getBorderStyle(isFictitious || false, isSelected || false),
                                    "hover:shadow-md"
                                )}
                                style={{ width: '100%' }}
                            >
                                {/* Content */}
                                <div className="absolute inset-0 px-2 flex items-center justify-between">
                                    <span className={cn(
                                        "text-xs font-medium truncate",
                                        isFictitious ? "text-yellow-700 dark:text-yellow-300" : "text-gray-700 dark:text-gray-300"
                                    )}>
                                        {step.name || step.order_number}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {isFictitious && (
                                            <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                        )}
                                        {step.is_locked && (
                                            <Lock className="h-3 w-3 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="text-sm">
                                <p className="font-medium">{step.name || step.order_number}</p>
                                {isFictitious && (
                                    <p className="text-yellow-600 dark:text-yellow-400 mt-1">
                                        ⚠️ Time parameters not configured
                                    </p>
                                )}
                                {isStep && (
                                    <p className="text-muted-foreground mt-1">
                                        Duration: {step.duration_hours.toFixed(1)} hours
                                        {isFictitious && ' (estimated)'}
                                    </p>
                                )}
                                {isStep && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Click to configure time parameters
                                    </p>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
        );
    };

export const TimeParametersGanttTimeline: React.FC<GanttTimelineProps> = ({
    tasks,
    viewConfig,
    zoomLevel,
    timelineWidth,
    onStepUpdate,
    showDependencies = false,
    onScrollContainerRef,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [draggedStep, _setDraggedStep] = useState<GanttTask | null>(null);

    // Calculate timeline dimensions and layout
    const timelineLayout = calculateTimelineLayout({
        startDate: viewConfig.startDate,
        endDate: viewConfig.endDate,
        zoomLevel,
        containerWidth: timelineWidth,
    });

    // Tasks are already flattened in GanttView, so we can use them directly
    const rows: GanttRow[] = useMemo(() => {
        return tasks.map((task, _index) => ({
            type: task.type,
            data: task,
            level: task.level || 0,
            id: task.type === 'order' ? `order-${task.id}` : `step-${task.id}`,
            orderId: task.orderId,
        }));
    }, [tasks]);

    const rowHeight = 45;
    const timelineHeight = rows.length * rowHeight;

    // Handle step click for editing
    const handleStepClick = (step: GanttTask) => {
        if (step.type === 'step') {
            setSelectedStepId(String(step.id));
            onStepUpdate(String(step.id), {});
        }
    };

    // Handle step drag (disabled for time parameters view)
    const handleStepDragStart = (e: React.MouseEvent, _step: GanttTask) => {
        e.preventDefault(); // Disable dragging in time parameters view
    };

    useEffect(() => {
        const scrollContainer = document.querySelector('#gantt-timeline .scroll-container') as HTMLElement;
        if (scrollContainer && onScrollContainerRef) {
            onScrollContainerRef(scrollContainer);
        }
    }, [onScrollContainerRef]);

    return (
        <div className="relative h-full flex flex-col bg-background">
            {/* Time axis header - matches GanttGrid header height (60px) */}
            <div className="h-[60px] border-b bg-muted/50 overflow-hidden flex-shrink-0">
                <TimeAxisWithoutDates
                    startDate={viewConfig.startDate}
                    endDate={viewConfig.endDate}
                    zoomLevel={zoomLevel}
                    width={timelineLayout.totalWidth}
                />
            </div>

            {/* Timeline body */}
            <ScrollContainer id="gantt-timeline" axis="xy" className="flex-1">
                <div
                    className="relative"
                    style={{
                        width: `${timelineLayout.totalWidth}px`,
                        height: `${timelineHeight}px`,
                        minHeight: '100%',
                    }}
                >
                    {/* Background grid */}
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 pointer-events-none"
                        width={timelineLayout.totalWidth}
                        height={timelineHeight}
                        style={{
                            width: `${timelineLayout.totalWidth}px`,
                            height: `${timelineHeight}px`,
                        }}
                    />

                    {/* Non-working time overlay */}
                    <NonWorkingTime
                        startDate={viewConfig.startDate}
                        endDate={viewConfig.endDate}
                        layout={timelineLayout}
                        height={timelineHeight}
                    />

                    {/* Row backgrounds */}
                    {rows.map((row, index) => {
                        const y = index * rowHeight;
                        const isEven = index % 2 === 0;

                        return (
                            <div
                                key={row.id}
                                className={cn(
                                    "absolute left-0 right-0 border-b",
                                    isEven ? "bg-background" : "bg-muted/5"
                                )}
                                style={{
                                    top: `${y}px`,
                                    height: `${rowHeight}px`,
                                }}
                            />
                        );
                    })}

                    {/* Render tasks (orders and steps) */}
                    {rows.map((row, index) => {
                        const y = index * rowHeight;

                        if (row.type === 'order') {
                            const order = row.data;

                            // Get all dates from order and its steps
                            const getAllDatesFromOrder = (order: GanttTask & { planned_start_date?: string; planned_end_date?: string; steps?: Array<{ planned_start_date?: string; planned_end_date?: string }>; children?: Array<GanttTask & { planned_start_date?: string; planned_end_date?: string; steps?: Array<{ planned_start_date?: string; planned_end_date?: string }>; children?: unknown[] }> }): { starts: Date[], ends: Date[] } => {
                                const dates = { starts: [] as Date[], ends: [] as Date[] };

                                // Add order dates if available
                                if (order.planned_start_date && order.planned_end_date) {
                                    dates.starts.push(new Date(order.planned_start_date));
                                    dates.ends.push(new Date(order.planned_end_date));
                                }

                                // Add step dates
                                if (order.steps) {
                                    order.steps.forEach((step) => {
                                        if (step.planned_start_date && step.planned_end_date) {
                                            dates.starts.push(new Date(step.planned_start_date));
                                            dates.ends.push(new Date(step.planned_end_date));
                                        }
                                    });
                                }

                                // Add child order dates recursively
                                if (order.children) {
                                    order.children.forEach((child) => {
                                        const childDates = getAllDatesFromOrder(child as any);
                                        dates.starts.push(...childDates.starts);
                                        dates.ends.push(...childDates.ends);
                                    });
                                }

                                return dates;
                            };

                            const allDates = getAllDatesFromOrder(order as GanttTask & { planned_start_date?: string; planned_end_date?: string; steps?: Array<{ planned_start_date?: string; planned_end_date?: string }>; children?: Array<GanttTask & { planned_start_date?: string; planned_end_date?: string; steps?: Array<{ planned_start_date?: string; planned_end_date?: string }>; children?: unknown[] }> });

                            // Skip if no dates found
                            if (allDates.starts.length === 0) return null;

                            const earliestStart = new Date(Math.min(...allDates.starts.map(d => d.getTime())));
                            const latestEnd = new Date(Math.max(...allDates.ends.map(d => d.getTime())));

                            const startX = timelineLayout.getPositionForDate(earliestStart);
                            const endX = timelineLayout.getPositionForDate(latestEnd);
                            const barWidth = endX - startX;

                            return (
                                <ValidationStepBar
                                    key={row.id}
                                    step={order}
                                    x={startX}
                                    y={y}
                                    width={barWidth}
                                    height={rowHeight}
                                    isSelected={selectedStepId === order.id}
                                    isDragging={draggedStep?.id === order.id}
                                    onSelect={() => { }}
                                    onDragStart={(e) => e.preventDefault()}
                                />
                            );
                        } else if (row.type === 'step') {
                            // Render step bar
                            const step = row.data;

                            if (!(step as any).planned_start_date || !(step as any).planned_end_date) return null;

                            const startDate = new Date((step as any).planned_start_date);
                            const endDate = new Date((step as any).planned_end_date);

                            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

                            const x = timelineLayout.getPositionForDate(startDate);
                            const width = timelineLayout.getPositionForDate(endDate) - x;

                            if (width <= 0) return null;

                            return (
                                <ValidationStepBar
                                    key={row.id}
                                    step={step}
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={rowHeight}
                                    isSelected={selectedStepId === step.id}
                                    isDragging={draggedStep?.id === step.id}
                                    onSelect={() => handleStepClick(step)}
                                    onDragStart={(e) => handleStepDragStart(e, step)}
                                />
                            );
                        }

                        return null;
                    })}

                    {/* Dependencies */}
                    {showDependencies && (
                        <Dependencies
                            steps={tasks.filter(t => t.type === 'step') as any}
                            rows={rows as any}
                            layout={timelineLayout}
                            rowHeight={rowHeight}
                        />
                    )}
                </div>
            </ScrollContainer>
        </div>
    );
};

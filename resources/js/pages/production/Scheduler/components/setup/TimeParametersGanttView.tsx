import React, { useMemo, useState, useRef, useCallback } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ImperativePanelGroupHandle } from '@/components/ui/resizable';
import { GanttGrid } from '@/components/production/scheduler-v2/components/GanttView/GanttGrid/GanttGrid';
import { TimeParametersGanttTimeline } from './TimeParametersGanttTimeline';
import { ScrollSyncProvider, useScrollSync } from '@/components/production/scheduler-v2/contexts/ScrollSyncContext';
import { ZoomLevel, getDefaultZoomLevel, ZOOM_LEVELS, getNextZoomLevel, getZoomLevelById } from '@/components/production/scheduler-v2/utils/zoomConfig';
import { calculateTimelineLayout } from '@/components/production/scheduler-v2/utils/timelineCalculations';
import { addHours } from 'date-fns';
import { AlertCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TimeParameterOrder {
    id: number;
    order_number: string;
    item: any;
    quantity: number;
    status: string;
    has_route: boolean;
    time_parameter_status: 'valid' | 'partial' | 'missing';
    steps: Array<{
        id: number;
        name: string;
        work_cell_id: number | null;
        work_cell: any;
        has_step_time: boolean;
        setup_time_minutes: number | null;
        cycle_time_minutes: number | null;
        use_workcell_throughput: boolean | null;
        has_work_cell_rate: boolean;
        work_cell_rate: any;
        effective_time_source: 'step' | 'work_cell' | null;
        effective_setup_time: number | null;
        effective_cycle_time: number | null;
        effective_total_time: number | null;
    }>;
    issues: Array<{
        type: string;
        step_id?: number;
        step_name?: string;
        message: string;
    }>;
    children?: TimeParameterOrder[];
}

interface TimeParametersGanttViewProps {
    orders: TimeParameterOrder[];
    startDate: string;
    endDate: string;
    onEditStep?: (orderId: number, stepId: number, step: any) => void;
    onRefresh?: () => void;
}

export const TimeParametersGanttView: React.FC<TimeParametersGanttViewProps> = ({
    orders,
    startDate,
    endDate,
    onEditStep,
    onRefresh: _onRefresh,
}) => {
    const [leftPanelSize, setLeftPanelSize] = useState(30);
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(
        new Set(orders.map(o => o.id))
    );
    const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(getDefaultZoomLevel());

    // Calculate viewConfig first, before using it in other hooks
    const viewConfig = useMemo(() => {
        // Ensure we always have valid dates
        let start: Date;
        let end: Date;

        try {
            start = startDate ? new Date(startDate) : new Date();
            end = endDate ? new Date(endDate) : new Date();

            // If end is not after start, set it to 3 months after start
            if (!startDate || !endDate || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
                start = new Date();
                end = new Date();
                end.setMonth(end.getMonth() + 3);
            }
        } catch (error) {
            start = new Date();
            end = new Date();
            end.setMonth(end.getMonth() + 3);
        }

        return {
            startDate: start,
            endDate: end,
        };
    }, [startDate, endDate]);

    // Calculate fictitious duration for missing time parameters
    const calculateFictitiousDuration = useCallback((
        entity: { type: 'order' | 'step'; data: any },
        allOrders: any[],
        parentOrder?: any
    ): number => {
        if (entity.type === 'step') {
            const step = entity.data;
            // If step has valid time, use it
            if (step.effective_total_time !== null) {
                return step.effective_total_time / 60; // Convert minutes to hours
            }

            // Find sibling steps with valid times
            if (parentOrder && parentOrder.steps) {
                const validSiblings = parentOrder.steps.filter((s: any) =>
                    s.id !== step.id && s.effective_total_time !== null
                );
                if (validSiblings.length > 0) {
                    const avgMinutes = validSiblings.reduce((sum: number, s: any) =>
                        sum + s.effective_total_time, 0
                    ) / validSiblings.length;
                    return avgMinutes / 60;
                }
            }

            // Default for steps: 8 hours
            return 8;
        } else {
            const order = entity.data;

            // Calculate total duration from steps if they have times
            const stepsWithTimes = order.steps?.filter((s: any) => s.effective_total_time !== null) || [];
            if (stepsWithTimes.length > 0) {
                const totalMinutes = stepsWithTimes.reduce((sum: number, s: any) =>
                    sum + s.effective_total_time, 0
                );

                // If all steps have times, return the sum
                if (stepsWithTimes.length === order.steps?.length) {
                    return totalMinutes / 60;
                }

                // Otherwise, extrapolate based on average
                const avgPerStep = totalMinutes / stepsWithTimes.length;
                const estimatedTotal = avgPerStep * (order.steps?.length || 1);
                return estimatedTotal / 60;
            }

            // Find sibling orders at same level
            const findSiblings = (searchOrders: any[], targetId: number, parentId?: number): any[] => {
                const siblings: any[] = [];
                for (const o of searchOrders) {
                    if (o.id !== targetId && o.parent_id === parentId) {
                        siblings.push(o);
                    }
                    if (o.children) {
                        siblings.push(...findSiblings(o.children, targetId, parentId));
                    }
                }
                return siblings;
            };

            const siblings = findSiblings(allOrders, order.id, (order as any).parent_id);
            const validSiblings = siblings.filter(s => {
                const siblingSteps = s.steps?.filter((step: any) => step.effective_total_time !== null) || [];
                return siblingSteps.length > 0;
            });

            if (validSiblings.length > 0) {
                const durations = validSiblings.map(s => {
                    const totalMinutes = s.steps.reduce((sum: number, step: any) =>
                        sum + (step.effective_total_time || 0), 0
                    );
                    return totalMinutes / 60;
                });
                return durations.reduce((sum, d) => sum + d, 0) / durations.length;
            }

            // Default for orders: 24 hours
            return 24;
        }
    }, []);

    // Transform orders to Gantt format
    const transformedData = useMemo(() => {
        const tasks: any[] = [];

        // If no orders, return empty array
        if (!orders || orders.length === 0) {
            return [];
        }

        let currentDate = new Date(viewConfig.startDate);

        const processOrder = (order: TimeParameterOrder, parentLevel: number = 0, parentId?: number, parentStartDate?: Date): Date => {
            const orderId = order.id;
            const isExpanded = expandedOrders.has(orderId);

            // Start date for this order
            const orderStartDate = parentStartDate || currentDate;
            let orderEndDate = orderStartDate;

            // Determine if order has missing times
            const hasMissingTimes = order.time_parameter_status !== 'valid';

            // Create a placeholder for the order task (we'll update its end date later)
            const orderTaskIndex = tasks.length;
            tasks.push({
                id: orderId,
                order_number: order.order_number,
                name: order.item?.name || order.order_number,
                status: order.status,
                priority: 50,
                requested_date: orderStartDate.toISOString(), // Will update later
                quantity: order.quantity,
                parent_order_id: (order as any).parent_id,
                parentId: parentId, // For hierarchy display
                isParent: true,
                level: parentLevel,
                type: 'order',
                hasChildren: !!(order.children?.length || order.steps?.length),
                expanded: isExpanded,
                steps: [],
                // Time parameter validation
                time_parameter_status: order.time_parameter_status,
                has_missing_times: hasMissingTimes,
                is_fictitious: hasMissingTimes,
                // For timeline - will update end date later
                planned_start_date: orderStartDate.toISOString(),
                planned_end_date: orderStartDate.toISOString(), // Placeholder
                percent_complete: 0,
            });

            let lastStepEndDate = orderStartDate;
            let maxChildEndDate = orderStartDate;

            // Process steps 
            if (order.steps && order.steps.length > 0) {
                let stepStartDate = orderStartDate;

                order.steps.forEach((step, index) => {
                    const stepDuration = step.effective_total_time !== null
                        ? step.effective_total_time / 60
                        : calculateFictitiousDuration({ type: 'step', data: step }, orders, order);

                    const stepEndDate = addHours(stepStartDate, stepDuration);
                    const isFictitious = step.effective_total_time === null;

                    // Only add steps to the task list if the order is expanded
                    if (isExpanded) {
                        tasks.push({
                            id: `${orderId}-${step.id}`,
                            manufacturing_step_id: step.id,
                            sequence_number: index + 1,
                            name: step.name,
                            description: '',
                            work_cell_id: step.work_cell_id,
                            work_cell: step.work_cell,
                            parentId: orderId,
                            orderId: orderId,
                            level: parentLevel + 1,
                            type: 'step',
                            // Calculated times
                            planned_start_date: stepStartDate.toISOString(),
                            planned_end_date: stepEndDate.toISOString(),
                            duration_hours: stepDuration,
                            setup_time_hours: (step.setup_time_minutes || 0) / 60,
                            // Validation status
                            has_valid_time: !isFictitious,
                            is_fictitious: isFictitious,
                            // Progress
                            percent_complete: 0,
                            status: 'pending',
                            // Dependencies (simplified for now)
                            predecessors: [],
                            successors: [],
                        });
                    }

                    stepStartDate = stepEndDate;
                    lastStepEndDate = stepEndDate;
                });
            }

            // Process child orders recursively
            if (order.children && order.children.length > 0) {
                // Child orders start after parent's steps
                const childStartDate = lastStepEndDate;

                order.children.forEach(childOrder => {
                    const childEndDate = processOrder(childOrder, parentLevel + 1, orderId, childStartDate);
                    if (childEndDate > maxChildEndDate) {
                        maxChildEndDate = childEndDate;
                    }
                });
            }

            // Determine the actual end date for this order
            // It should be the maximum of: steps end date, children end date, or calculated duration
            const calculatedDuration = calculateFictitiousDuration({ type: 'order', data: order }, orders);
            const calculatedEndDate = addHours(orderStartDate, calculatedDuration);

            orderEndDate = new Date(Math.max(
                lastStepEndDate.getTime(),
                maxChildEndDate.getTime(),
                calculatedEndDate.getTime()
            ));

            // Update the order task with the correct end date
            tasks[orderTaskIndex].planned_end_date = orderEndDate.toISOString();
            tasks[orderTaskIndex].requested_date = orderEndDate.toISOString();

            // Update current date for next root order (only for top-level orders)
            if (parentLevel === 0 && !parentId) {
                currentDate = addHours(orderEndDate, 4); // 4 hour gap between root orders
            }

            return orderEndDate;
        };

        // Process only root orders (those without parent_id in the current list)
        // The children will be processed recursively
        orders.forEach(order => {
            // Check if this order has a parent in the current list
            const hasParentInList = orders.some(o => o.children?.some(child => child.id === order.id));
            if (!hasParentInList) {
                processOrder(order, 0);
            }
        });

        return tasks;
    }, [orders, expandedOrders, calculateFictitiousDuration, viewConfig.startDate]);

    // Filter tasks to only show visible ones based on expanded state
    const visibleTasks = useMemo(() => {
        // The transformedData already contains only the visible tasks
        // because we only add steps and child orders when their parent is expanded
        return transformedData;
    }, [transformedData]);

    const handleOrderToggle = useCallback((orderId: number) => {
        setExpandedOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    }, []);

    const handleStepUpdate = useCallback((step: any) => {
        // Extract order ID and step ID from the combined ID
        const [orderIdStr, stepIdStr] = step.id.split('-');
        const orderId = parseInt(orderIdStr);
        const stepId = parseInt(stepIdStr);

        // Find the original step data
        const order = orders.find(o => o.id === orderId);
        const originalStep = order?.steps.find(s => s.id === stepId);

        if (originalStep && onEditStep) {
            onEditStep(orderId, stepId, originalStep);
        }
    }, [orders, onEditStep]);

    // Zoom controls handlers
    const handleZoomIn = useCallback(() => {
        const nextLevel = getNextZoomLevel(zoomLevel.id, 'in');
        if (nextLevel) {
            setZoomLevel(nextLevel);
        }
    }, [zoomLevel]);

    const handleZoomOut = useCallback(() => {
        const nextLevel = getNextZoomLevel(zoomLevel.id, 'out');
        if (nextLevel) {
            setZoomLevel(nextLevel);
        }
    }, [zoomLevel]);

    const handleZoomReset = useCallback(() => {
        setZoomLevel(getDefaultZoomLevel());
    }, []);

    const handleZoomLevelChange = useCallback((levelId: string) => {
        const level = getZoomLevelById(levelId);
        if (level) {
            setZoomLevel(level);
        }
    }, []);

    // Check if we have valid date inputs
    if (!startDate || !endDate) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Invalid date range provided</p>
            </div>
        );
    }

    return (
        <ScrollSyncProvider>
            <div className="h-full flex flex-col">
                {/* Instructions and zoom controls */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-start gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-dashed border-yellow-500 rounded" />
                            <span className="text-muted-foreground">Missing time parameters</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-solid border-blue-500 rounded bg-blue-500" />
                            <span className="text-muted-foreground">Configured time parameters</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            <span className="text-muted-foreground">Click on steps to configure times</span>
                        </div>
                    </div>

                    {/* Zoom controls */}
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <ZoomIn className="h-4 w-4 mr-2" />
                                    {zoomLevel.name}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {ZOOM_LEVELS.map((level) => (
                                    <DropdownMenuItem
                                        key={level.id}
                                        onClick={() => handleZoomLevelChange(level.id)}
                                        className={cn(
                                            level.id === zoomLevel.id && "bg-accent"
                                        )}
                                    >
                                        {level.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleZoomOut}
                            disabled={zoomLevel.id === ZOOM_LEVELS[ZOOM_LEVELS.length - 1].id}
                            title="Zoom Out"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleZoomReset}
                            title="Reset Zoom"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleZoomIn}
                            disabled={zoomLevel.id === ZOOM_LEVELS[0].id}
                            title="Zoom In"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Gantt Chart */}
                <div className="flex-1 border rounded-lg overflow-hidden">
                    <ResizablePanelGroup
                        direction="horizontal"
                        className="h-full"
                        ref={panelGroupRef}
                    >
                        <ResizablePanel
                            defaultSize={leftPanelSize}
                            minSize={20}
                            maxSize={50}
                            onResize={setLeftPanelSize}
                        >
                            <GanttGrid
                                tasks={visibleTasks}
                                onTaskToggle={(taskId) => {
                                    const numId = typeof taskId === 'string' ? parseInt(taskId) : taskId;
                                    handleOrderToggle(numId);
                                }}
                            />
                        </ResizablePanel>

                        <ResizableHandle />

                        <ResizablePanel defaultSize={100 - leftPanelSize}>
                            <TimelineWithValidation
                                tasks={visibleTasks}
                                viewConfig={viewConfig}
                                zoomLevel={zoomLevel}
                                onStepUpdate={handleStepUpdate}
                            />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
        </ScrollSyncProvider>
    );
};

// Custom timeline component with validation indicators
const TimelineWithValidation: React.FC<{
    tasks: any[];
    viewConfig: any;
    zoomLevel: ZoomLevel;
    onStepUpdate: (step: any) => void;
}> = ({ tasks, viewConfig, zoomLevel, onStepUpdate }) => {
    const { registerScrollContainer: _registerScrollContainer } = useScrollSync();

    // Calculate timeline width based on view config and zoom level
    const timelineLayout = useMemo(() => {
        try {
            // Ensure viewConfig has valid dates
            if (!viewConfig || !viewConfig.startDate || !viewConfig.endDate) {
                const now = new Date();
                const later = new Date();
                later.setMonth(later.getMonth() + 3);

                return calculateTimelineLayout({
                    startDate: now,
                    endDate: later,
                    zoomLevel,
                    containerWidth: 2000,
                });
            }

            return calculateTimelineLayout({
                startDate: viewConfig.startDate,
                endDate: viewConfig.endDate,
                zoomLevel,
                containerWidth: 2000, // Base width
            });
        } catch (error) {
            // Return a default layout
            const now = new Date();
            const later = new Date();
            later.setMonth(later.getMonth() + 3);

            return {
                totalWidth: 2000,
                pixelsPerDay: 100,
                pixelsPerHour: 100 / 24,
                pixelsPerUnit: 100,
                daysInView: 90,
                unitsInView: 90,
                timeScale: 'day',
                getPositionForDate: (date: Date) => {
                    const daysDiff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                    return Math.max(0, daysDiff * 100);
                },
                getDateForPosition: (x: number) => {
                    const daysToAdd = x / 100;
                    const result = new Date(now);
                    result.setDate(result.getDate() + daysToAdd);
                    return result;
                },
                getUnitBoundaries: () => [],
            };
        }
    }, [viewConfig, zoomLevel]);

    return (
        <div className="relative h-full">
            <TimeParametersGanttTimeline
                tasks={tasks}
                viewConfig={viewConfig}
                zoomLevel={zoomLevel}
                timelineWidth={timelineLayout.totalWidth}
                onStepUpdate={onStepUpdate}
                showDependencies={false}
            />
        </div>
    );
};

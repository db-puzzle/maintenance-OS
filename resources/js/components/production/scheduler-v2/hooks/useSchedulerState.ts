import { useMemo } from 'react';
import { ZoomLevel, type TimeScaleType } from '../utils/zoomConfig';

/**
 * Step interface matching what GanttView expects
 */
interface Step {
    id: string;
    planned_start_date: string;
    planned_end_date: string;
}

/**
 * Order interface matching what GanttView expects
 */
export interface Order {
    id: number;
    expanded?: boolean;
    steps?: Step[];
    children?: Order[];
}

/**
 * Allocation interface matching what SchedulerView expects
 */
export interface Allocation {
    id: string;
    is_locked?: boolean;
    planned_start_date: string;
    planned_end_date: string;
}

/**
 * WorkCell interface matching what SchedulerView expects
 */
export interface WorkCellState {
    id: number;
    name: string;
    cell_type: string;
    has_finite_capacity: boolean;
    current_utilization?: number;
    scheduled_steps?: Allocation[];
}

/**
 * Return type for useSchedulerState hook
 */
export interface SchedulerStateReturn {
    visibleOrders: Order[];
    workCells: WorkCellState[];
    allocations: Allocation[];
    timeScale: TimeScaleType;
    zoomLevel: ZoomLevel;
}

interface UseSchedulerStateProps {
    orders: Order[];
    workCells: WorkCellState[];
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: ZoomLevel;
}

export const useSchedulerState = ({
    orders,
    workCells,
    viewConfig,
    zoomLevel,
}: UseSchedulerStateProps) => {
    // Filter orders based on date range
    const visibleOrders = useMemo(() => {
        const filtered = orders.filter(order => {
            // Check if any of the order's steps fall within the view range
            if (!order.steps || order.steps.length === 0) {
                return false;
            }

            const hasVisibleSteps = order.steps?.some((step: Step) => {
                const stepStart = new Date(step.planned_start_date);
                const stepEnd = new Date(step.planned_end_date);
                return stepEnd >= viewConfig.startDate && stepStart <= viewConfig.endDate;
            }) ?? false;

            // Also check child orders recursively
            const hasVisibleChildren = order.children?.some((child: Order) => {
                return child.steps?.some((step: Step) => {
                    const stepStart = new Date(step.planned_start_date);
                    const stepEnd = new Date(step.planned_end_date);
                    return stepEnd >= viewConfig.startDate && stepStart <= viewConfig.endDate;
                }) ?? false;
            }) ?? false;

            return hasVisibleSteps || hasVisibleChildren;
        });

        return filtered;
    }, [orders, viewConfig]);

    // Flatten all steps for allocation view
    const allocations = useMemo(() => {
        const allAllocations: Allocation[] = [];

        const collectSteps = (orderList: Order[]) => {
            orderList.forEach(order => {
                if (order.steps) {
                    const orderAllocations: Allocation[] = order.steps.map(step => ({
                        id: step.id,
                        planned_start_date: step.planned_start_date,
                        planned_end_date: step.planned_end_date,
                    }));
                    allAllocations.push(...orderAllocations);
                }
                if (order.children) {
                    collectSteps(order.children);
                }
            });
        };

        collectSteps(visibleOrders);
        return allAllocations;
    }, [visibleOrders]);

    // Use time scale from zoom level configuration
    const timeScale = useMemo(() => {
        return zoomLevel.timeScale;
    }, [zoomLevel]);

    return {
        visibleOrders,
        workCells,
        allocations,
        timeScale,
        zoomLevel,
    } satisfies SchedulerStateReturn;
};


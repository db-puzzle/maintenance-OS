import { useMemo } from 'react';
import { ZoomLevel } from '../utils/zoomConfig';

interface Step {
    planned_start_date: string;
    planned_end_date: string;
}

interface Order {
    steps: Step[];
    children?: Order[];
}

interface WorkCell {
    id: number;
    name: string;
}

interface UseSchedulerStateProps {
    orders: Order[];
    workCells: WorkCell[];
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

            const hasVisibleSteps = order.steps.some((step: Step) => {
                const stepStart = new Date(step.planned_start_date);
                const stepEnd = new Date(step.planned_end_date);
                return stepEnd >= viewConfig.startDate && stepStart <= viewConfig.endDate;
            });

            // Also check child orders recursively
            const hasVisibleChildren = order.children?.some((child: Order) => {
                return child.steps.some((step: Step) => {
                    const stepStart = new Date(step.planned_start_date);
                    const stepEnd = new Date(step.planned_end_date);
                    return stepEnd >= viewConfig.startDate && stepStart <= viewConfig.endDate;
                });
            });

            return hasVisibleSteps || hasVisibleChildren;
        });

        return filtered;
    }, [orders, viewConfig]);

    // Flatten all steps for allocation view
    const allocations = useMemo(() => {
        const allSteps: Step[] = [];

        const collectSteps = (orderList: Order[]) => {
            orderList.forEach(order => {
                allSteps.push(...order.steps);
                if (order.children) {
                    collectSteps(order.children);
                }
            });
        };

        collectSteps(visibleOrders);
        return allSteps;
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
    };
};


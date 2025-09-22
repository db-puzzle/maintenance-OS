import { useMemo } from 'react';

interface UseSchedulerStateProps {
    orders: any[];
    workCells: any[];
    viewConfig: {
        startDate: Date;
        endDate: Date;
    };
    zoomLevel: number;
}

export const useSchedulerState = ({
    orders,
    workCells,
    viewConfig,
    zoomLevel,
}: UseSchedulerStateProps) => {
    // Filter orders based on date range
    const visibleOrders = useMemo(() => {
        return orders.filter(order => {
            // Check if any of the order's steps fall within the view range
            const hasVisibleSteps = order.steps.some((step: any) => {
                const stepStart = new Date(step.planned_start_date);
                const stepEnd = new Date(step.planned_end_date);
                return stepEnd >= viewConfig.startDate && stepStart <= viewConfig.endDate;
            });

            // Also check child orders recursively
            const hasVisibleChildren = order.children?.some((child: any) => {
                return child.steps.some((step: any) => {
                    const stepStart = new Date(step.planned_start_date);
                    const stepEnd = new Date(step.planned_end_date);
                    return stepEnd >= viewConfig.startDate && stepStart <= viewConfig.endDate;
                });
            });

            return hasVisibleSteps || hasVisibleChildren;
        });
    }, [orders, viewConfig]);

    // Flatten all steps for allocation view
    const allocations = useMemo(() => {
        const allSteps: any[] = [];

        const collectSteps = (orderList: any[]) => {
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

    // Calculate time scale based on zoom level
    const timeScale = useMemo(() => {
        if (zoomLevel >= 2) return 'hour';
        if (zoomLevel >= 1.5) return 'day';
        if (zoomLevel >= 1) return 'week';
        return 'month';
    }, [zoomLevel]);

    return {
        visibleOrders,
        workCells,
        allocations,
        timeScale,
    };
};


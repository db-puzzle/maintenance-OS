import { ManufacturingOrderTreeNode, RouteCompleteness, RouteStatus } from './types';

export const canBeReleased = (order: ManufacturingOrderTreeNode): boolean => {
    return ['draft', 'planned'].includes(order.status) &&
        !!order.manufacturing_route &&
        !!order.manufacturing_route.steps &&
        order.manufacturing_route.steps.length > 0;
};

export const canBeCancelled = (order: ManufacturingOrderTreeNode): boolean => {
    return !['draft', 'completed', 'cancelled'].includes(order.status);
};

export const canBeDeleted = (order: ManufacturingOrderTreeNode): boolean => {
    return order.status === 'draft' && (!order.children || order.children.length === 0);
};

export const getRouteCompleteness = (order: ManufacturingOrderTreeNode): RouteCompleteness => {
    if (!order.manufacturing_route) {
        return { configured: 0, required: 0, percentage: 0 };
    }

    const steps = order.manufacturing_route.steps || [];
    const configuredSteps = steps.filter((step) => step.work_cell_id).length;
    const requiredSteps = steps.filter((step) => step.step_type !== 'rework').length;

    return {
        configured: configuredSteps,
        required: requiredSteps || steps.length,
        percentage: steps.length > 0 ? Math.round((configuredSteps / steps.length) * 100) : 0
    };
};

export const getRouteStatus = (order: ManufacturingOrderTreeNode): RouteStatus => {
    const completeness = getRouteCompleteness(order);

    if (!order.manufacturing_route) {
        return 'no-route';
    } else if (completeness.percentage === 100) {
        return 'complete';
    } else if (completeness.percentage > 0) {
        return 'in-progress';
    } else {
        return 'empty';
    }
};

export const getStatusColor = (status: RouteStatus): string => {
    switch (status) {
        case 'complete': return 'text-green-600';
        case 'in-progress': return 'text-yellow-600';
        case 'no-route': return 'text-red-600';
        case 'empty': return 'text-orange-600';
        default: return 'text-gray-600';
    }
};

export const countAllOrders = (orderList: ManufacturingOrderTreeNode[]): number => {
    let count = orderList.length;
    orderList.forEach(order => {
        if (order.children && order.children.length > 0) {
            count += countAllOrders(order.children);
        }
    });
    return count;
};

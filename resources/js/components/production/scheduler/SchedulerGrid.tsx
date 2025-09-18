import React, { useMemo } from 'react';
import { ChevronRight, ChevronDown, Package, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ManufacturingOrder } from '@/types/production';
import { ProductionSchedule } from '@/types/scheduler';

interface ScheduledOrder {
    order: ManufacturingOrder;
    schedules: ProductionSchedule[];
}

interface Props {
    orders: ScheduledOrder[];
    selectedOrders: number[];
    onOrderSelect: (orderIds: number[]) => void;
    onScheduleSelect: (schedule: ProductionSchedule | null) => void;
}

interface OrderNode {
    order: ManufacturingOrder;
    schedules: ProductionSchedule[];
    children: OrderNode[];
    isExpanded: boolean;
}

export default function SchedulerGrid({
    orders,
    selectedOrders,
    onOrderSelect,
    onScheduleSelect,
}: Props) {
    const [expandedOrders, setExpandedOrders] = React.useState<Set<number>>(new Set());

    // Build hierarchical structure
    const orderTree = useMemo(() => {
        const orderMap = new Map<number, OrderNode>();
        const rootOrders: OrderNode[] = [];

        // First pass: create all nodes
        orders.forEach(({ order, schedules }) => {
            orderMap.set(order.id, {
                order,
                schedules,
                children: [],
                isExpanded: expandedOrders.has(order.id),
            });
        });

        // Second pass: build hierarchy
        orderMap.forEach((node) => {
            if (node.order.parent_id) {
                const parent = orderMap.get(node.order.parent_id);
                if (parent) {
                    parent.children.push(node);
                } else {
                    rootOrders.push(node);
                }
            } else {
                rootOrders.push(node);
            }
        });

        return rootOrders;
    }, [orders, expandedOrders]);

    const toggleExpand = (orderId: number) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const toggleOrderSelection = (orderId: number) => {
        if (selectedOrders.includes(orderId)) {
            onOrderSelect(selectedOrders.filter(id => id !== orderId));
        } else {
            onOrderSelect([...selectedOrders, orderId]);
        }
    };

    const getOrderProgress = (schedules: ProductionSchedule[]) => {
        if (schedules.length === 0) return 0;
        const completed = schedules.filter(s =>
            s.manufacturing_step.status === 'completed'
        ).length;
        return Math.round((completed / schedules.length) * 100);
    };

    const getOrderStatus = (order: ManufacturingOrder, schedules: ProductionSchedule[]) => {
        // Check if any schedule is late
        const requestedDate = order.requested_date ? new Date(order.requested_date) : null;
        if (requestedDate && schedules.length > 0) {
            const lastSchedule = schedules.reduce((latest, schedule) => {
                const scheduleEnd = new Date(schedule.scheduled_end);
                const latestEnd = new Date(latest.scheduled_end);
                return scheduleEnd > latestEnd ? schedule : latest;
            });

            if (new Date(lastSchedule.scheduled_end) > requestedDate) {
                return 'late';
            }
        }

        // Check order status
        if (order.status === 'in_progress') return 'active';
        if (order.status === 'on_hold') return 'hold';
        if (order.status === 'completed') return 'completed';
        return 'scheduled';
    };

    const renderOrderNode = (node: OrderNode, level: number = 0) => {
        const { order, schedules, children, isExpanded } = node;
        const hasChildren = children.length > 0;
        const progress = getOrderProgress(schedules);
        const status = getOrderStatus(order, schedules);
        const isSelected = selectedOrders.includes(order.id);

        return (
            <div key={order.id}>
                <div
                    className={cn(
                        "flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 cursor-pointer border-b",
                        isSelected && "bg-primary/10"
                    )}
                    style={{ paddingLeft: `${level * 20 + 8}px` }}
                >
                    {/* Expand/Collapse */}
                    <button
                        onClick={() => toggleExpand(order.id)}
                        className={cn(
                            "p-0.5 hover:bg-muted rounded",
                            !hasChildren && "invisible"
                        )}
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                        ) : (
                            <ChevronRight className="h-3 w-3" />
                        )}
                    </button>

                    {/* Selection checkbox */}
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOrderSelection(order.id)}
                        className="h-4 w-4"
                    />

                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">
                                {order.order_number}
                            </span>
                            {status === 'late' && (
                                <AlertCircle className="h-3 w-3 text-destructive" />
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                            {order.item?.name || 'No item'}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2">
                        <div className="w-16">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all",
                                        status === 'completed' && "bg-green-500",
                                        status === 'active' && "bg-blue-500",
                                        status === 'hold' && "bg-yellow-500",
                                        status === 'scheduled' && "bg-gray-400",
                                        status === 'late' && "bg-red-500",
                                    )}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                            {progress}%
                        </span>
                    </div>

                    {/* Status badge */}
                    <Badge
                        variant={
                            status === 'completed' ? 'success' :
                                status === 'active' ? 'default' :
                                    status === 'hold' ? 'warning' :
                                        status === 'late' ? 'destructive' :
                                            'secondary'
                        }
                        className="text-xs h-5"
                    >
                        {status}
                    </Badge>
                </div>

                {/* Steps */}
                {isExpanded && order.manufacturing_route?.steps && order.manufacturing_route.steps.length > 0 && (
                    <div className="border-l ml-6">
                        {order.manufacturing_route.steps
                            .sort((a, b) => a.display_order - b.display_order)
                            .map((step) => {
                                // Find if this step has a schedule
                                const schedule = schedules.find(s => s.manufacturing_step.id === step.id);

                                return (
                                    <div
                                        key={step.id}
                                        className="flex items-center gap-2 px-2 py-1 hover:bg-muted/30 cursor-pointer text-sm"
                                        style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                                        onClick={() => schedule && onScheduleSelect(schedule)}
                                    >
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="flex-1 truncate">
                                            {step.name}
                                        </span>
                                        {schedule?.work_cell && (
                                            <span className="text-xs text-muted-foreground">
                                                {schedule.work_cell.code}
                                            </span>
                                        )}
                                        {schedule?.is_locked && (
                                            <Badge variant="outline" className="text-xs h-4 px-1">
                                                Locked
                                            </Badge>
                                        )}
                                        {!schedule && (
                                            <Badge variant="outline" className="text-xs h-4 px-1">
                                                Not scheduled
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                )}

                {/* Child orders */}
                {isExpanded && children.map(child => renderOrderNode(child, level + 1))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full border-r">
            {/* Header */}
            <div className="flex items-center px-2 py-2 border-b bg-muted/30">
                <div className="flex-1 font-medium text-sm">Manufacturing Orders</div>
                <Badge variant="secondary" className="text-xs">
                    {orders.length} orders
                </Badge>
            </div>

            {/* Grid content */}
            <ScrollArea className="flex-1">
                <div className="min-w-[300px]">
                    {orderTree.map(node => renderOrderNode(node))}
                </div>
            </ScrollArea>
        </div>
    );
}

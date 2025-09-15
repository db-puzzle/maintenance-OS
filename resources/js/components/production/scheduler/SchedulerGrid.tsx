import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Package, Wrench } from 'lucide-react';
import { useScheduler } from '@/hooks/production/useScheduler';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManufacturingOrderNode {
    id: number;
    order_number: string;
    item: {
        name: string;
        code: string;
    };
    quantity: number;
    quantity_completed: number;
    status: string;
    priority: number;
    requested_date: string | null;
    children: ManufacturingOrderNode[];
    steps: ManufacturingStep[];
    isExpanded?: boolean;
    level?: number;
}

interface ManufacturingStep {
    id: number;
    name: string;
    step_number: number;
    status: string;
    work_cell?: {
        id: number;
        name: string;
    };
    schedule?: {
        id: number;
        scheduled_start: string;
        scheduled_end: string;
        is_locked: boolean;
    };
}

export function SchedulerGrid() {
    const scheduler = useScheduler();
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
    const [selectedItem, setSelectedItem] = useState<{ type: 'order' | 'step'; id: number } | null>(null);

    const toggleOrder = (orderId: number) => {
        const newExpanded = new Set(expandedOrders);
        if (newExpanded.has(orderId)) {
            newExpanded.delete(orderId);
        } else {
            newExpanded.add(orderId);
        }
        setExpandedOrders(newExpanded);
    };

    const handleItemClick = (type: 'order' | 'step', id: number) => {
        setSelectedItem({ type, id });
        scheduler.highlightItem(type, id);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            draft: 'outline',
            planned: 'secondary',
            released: 'default',
            in_progress: 'default',
            completed: 'outline',
            cancelled: 'destructive',
        };

        const colors: Record<string, string> = {
            draft: 'text-gray-600',
            planned: 'text-blue-600',
            released: 'text-green-600',
            in_progress: 'text-yellow-600',
            completed: 'text-green-600',
            cancelled: 'text-red-600',
        };

        return (
            <Badge variant={variants[status] || 'default'} className={cn('text-xs', colors[status])}>
                {status.replace('_', ' ')}
            </Badge>
        );
    };

    const renderOrder = (order: ManufacturingOrderNode, level: number = 0): React.ReactNode => {
        const isExpanded = expandedOrders.has(order.id);
        const hasChildren = order.children.length > 0 || order.steps.length > 0;
        const isSelected = selectedItem?.type === 'order' && selectedItem.id === order.id;

        return (
            <div key={`order-${order.id}`}>
                {/* Order Row */}
                <div
                    className={cn(
                        "flex items-center px-2 py-1.5 hover:bg-accent cursor-pointer border-b",
                        isSelected && "bg-accent",
                        level > 0 && "border-l-2 border-l-muted-foreground/20"
                    )}
                    style={{ paddingLeft: `${level * 20 + 8}px` }}
                    onClick={() => handleItemClick('order', order.id)}
                >
                    <button
                        className="p-0.5 hover:bg-accent-foreground/10 rounded"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleOrder(order.id);
                        }}
                    >
                        {hasChildren ? (
                            isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )
                        ) : (
                            <div className="w-4" />
                        )}
                    </button>

                    <Package className="h-4 w-4 mx-2 text-muted-foreground" />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                                {order.order_number}
                            </span>
                            {getStatusBadge(order.status)}
                            {order.priority > 70 && (
                                <Badge variant="destructive" className="text-xs">
                                    High Priority
                                </Badge>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                            {order.item.name} - Qty: {order.quantity_completed}/{order.quantity}
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground ml-2">
                        {order.requested_date && new Date(order.requested_date).toLocaleDateString()}
                    </div>
                </div>

                {/* Child Orders */}
                {isExpanded && order.children.map((child) => renderOrder(child, level + 1))}

                {/* Steps */}
                {isExpanded && order.steps.map((step) => {
                    const isStepSelected = selectedItem?.type === 'step' && selectedItem.id === step.id;

                    return (
                        <div
                            key={`step-${step.id}`}
                            className={cn(
                                "flex items-center px-2 py-1.5 hover:bg-accent cursor-pointer border-b",
                                isStepSelected && "bg-accent"
                            )}
                            style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                            onClick={() => handleItemClick('step', step.id)}
                        >
                            <div className="w-4" />
                            <Wrench className="h-4 w-4 mx-2 text-muted-foreground" />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                        #{step.step_number} - {step.name}
                                    </span>
                                    {getStatusBadge(step.status)}
                                    {step.schedule?.is_locked && (
                                        <Badge variant="outline" className="text-xs">
                                            Locked
                                        </Badge>
                                    )}
                                </div>
                                {step.work_cell && (
                                    <div className="text-xs text-muted-foreground">
                                        {step.work_cell.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center px-4 py-2 border-b bg-muted/50">
                <h3 className="font-medium text-sm">Manufacturing Orders</h3>
            </div>

            {/* Grid Content */}
            <ScrollArea className="flex-1">
                <div className="min-w-[280px]">
                    {scheduler.orders.map((order) => renderOrder(order))}
                </div>
            </ScrollArea>
        </div>
    );
}
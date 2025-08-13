import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ManufacturingOrder } from '@/types/production';
import { MOStatusBadge } from './MOStatusBadge';
import { MOPriorityBadge } from './MOPriorityBadge';
import { MOProgressBar } from './MOProgressBar';
import { format, parseISO } from 'date-fns';
import {
    Play,
    FileText,
    MoreHorizontal,
    Package,
    Clock,
    AlertCircle,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MOCardViewProps {
    orders: ManufacturingOrder[];
    onOrderClick: (order: ManufacturingOrder) => void;
    onAction: (action: string, order: ManufacturingOrder) => void;
}

export function MOCardView({ orders, onOrderClick, onAction }: MOCardViewProps) {
    const getActionButton = (order: ManufacturingOrder) => {
        switch (order.status) {
            case 'released':
                return (
                    <Button
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction('start', order);
                        }}
                    >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                    </Button>
                );
            case 'in_progress':
                return (
                    <Button
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction('report', order);
                        }}
                    >
                        <FileText className="w-4 h-4 mr-1" />
                        Report
                    </Button>
                );
            default:
                return null;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => {
                const isOverdue = order.requested_date &&
                    parseISO(order.requested_date) < new Date() &&
                    !['completed', 'cancelled'].includes(order.status);

                return (
                    <Card
                        key={order.id}
                        className={cn(
                            "cursor-pointer hover:shadow-lg transition-shadow",
                            isOverdue && "border-red-500"
                        )}
                        onClick={() => onOrderClick(order)}
                    >
                        <CardContent className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-lg">
                                            {order.order_number}
                                        </h3>
                                        {order.has_route && (
                                            <Package className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <MOStatusBadge status={order.status} className="mt-1" />
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOrderClick(order);
                                    }}
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Item Info */}
                            <div className="flex items-start gap-3 mb-3">
                                {order.item?.primaryImage && (
                                    <img
                                        src={order.item.primaryImage.thumbnail_url || order.item.primaryImage.url}
                                        alt={order.item.name}
                                        className="w-16 h-16 object-cover rounded"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                        {order.item?.item_number}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {order.item?.name}
                                    </p>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-3">
                                <MOProgressBar
                                    completed={order.quantity_completed}
                                    scrapped={order.quantity_scrapped}
                                    total={order.quantity}
                                    showPercentage
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{order.quantity_completed} of {order.quantity}</span>
                                    <span>{order.unit_of_measure}</span>
                                </div>
                            </div>

                            {/* Current Step (for routed MOs) */}
                            {order.has_route && order.current_step && (
                                <div className="mb-3 p-2 bg-accent rounded-md">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm">
                                            <p className="font-medium">{order.current_step.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {order.current_step.work_cell?.name || 'No work cell'}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t">
                                <div className="flex items-center gap-3 text-sm">
                                    <MOPriorityBadge priority={order.priority} />
                                    {order.requested_date && (
                                        <div className={cn(
                                            "flex items-center gap-1",
                                            isOverdue && "text-red-600 font-medium"
                                        )}>
                                            {isOverdue ? (
                                                <AlertCircle className="w-4 h-4" />
                                            ) : (
                                                <Clock className="w-4 h-4" />
                                            )}
                                            {format(parseISO(order.requested_date), 'MMM d')}
                                        </div>
                                    )}
                                </div>
                                {getActionButton(order)}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

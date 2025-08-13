import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ManufacturingOrder } from '@/types/production';
import { MOStatusBadge } from './MOStatusBadge';
import { MOPriorityBadge } from './MOPriorityBadge';
import { MOProgressBar } from './MOProgressBar';
import { format, parseISO } from 'date-fns';
import { router } from '@inertiajs/react';
import {
    Play,
    FileText,
    CheckCircle2,
    Pause,
    Package,
    Calendar,
    AlertTriangle,
    ChevronRight,
    ExternalLink
} from 'lucide-react';

interface MODetailPanelProps {
    order: ManufacturingOrder;
    onClose: () => void;
    onAction: (action: string, order: ManufacturingOrder) => void;
    canUpdate: boolean;
}

export function MODetailPanel({ order, onClose, onAction, canUpdate }: MODetailPanelProps) {
    const getAvailableActions = () => {
        const actions = [];

        switch (order.status) {
            case 'released':
                actions.push({
                    key: 'start',
                    label: 'Start Production',
                    icon: Play,
                    variant: 'default' as const
                });
                break;
            case 'in_progress':
                actions.push({
                    key: 'report',
                    label: 'Report Production',
                    icon: FileText,
                    variant: 'default' as const
                });
                actions.push({
                    key: 'hold',
                    label: 'Put on Hold',
                    icon: Pause,
                    variant: 'outline' as const
                });
                if (!order.has_route || (order.quantity_remaining && order.quantity_remaining > 0)) {
                    actions.push({
                        key: 'complete',
                        label: 'Complete Order',
                        icon: CheckCircle2,
                        variant: 'outline' as const
                    });
                }
                break;
        }

        if (['released', 'in_progress'].includes(order.status)) {
            actions.push({
                key: 'scrap',
                label: 'Report Scrap',
                icon: AlertTriangle,
                variant: 'destructive' as const
            });
        }

        return actions;
    };

    const actions = getAvailableActions();

    return (
        <Sheet open={true} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle className="flex items-center justify-between">
                        <span>Manufacturing Order Details</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.visit(route('production.orders.show', order.id))}
                        >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Full Details
                        </Button>
                    </SheetTitle>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                    <div className="space-y-6">
                        {/* Order Info */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Order Information</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Order Number</span>
                                    <span className="font-medium">{order.order_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <MOStatusBadge status={order.status} />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Priority</span>
                                    <MOPriorityBadge priority={order.priority} />
                                </div>
                                {order.has_route && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Type</span>
                                        <span className="flex items-center gap-1">
                                            <Package className="w-4 h-4" />
                                            Routed
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Item Info */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Item Details</h3>
                            <div className="space-y-3">
                                {order.item?.primaryImage && (
                                    <img
                                        src={order.item.primaryImage.medium_url || order.item.primaryImage.url}
                                        alt={order.item.name}
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                )}
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">SKU</span>
                                        <span className="font-medium">{order.item?.item_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Name</span>
                                        <span className="font-medium text-right">{order.item?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">UOM</span>
                                        <span className="font-medium">{order.unit_of_measure}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Progress */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Production Progress</h3>
                            <div className="space-y-3">
                                <MOProgressBar
                                    completed={order.quantity_completed}
                                    scrapped={order.quantity_scrapped}
                                    total={order.quantity}
                                    showPercentage
                                />
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-green-600">
                                            {order.quantity_completed}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Completed</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {order.quantity_remaining || 0}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Remaining</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-red-600">
                                            {order.quantity_scrapped}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Scrapped</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Current Step (for routed MOs) */}
                        {order.has_route && order.current_step && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Current Step</h3>
                                    <div className="p-3 bg-accent rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">{order.current_step.name}</span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Work Cell</span>
                                                <span>{order.current_step.work_cell?.name || 'Not assigned'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Step Type</span>
                                                <span className="capitalize">{order.current_step.step_type.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <Separator />

                        {/* Dates */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Timeline</h3>
                            <div className="space-y-2">
                                {order.requested_date && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Requested Date</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {format(parseISO(order.requested_date), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                )}
                                {order.actual_start_date && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Started</span>
                                        <span>{format(parseISO(order.actual_start_date), 'MMM d, yyyy HH:mm')}</span>
                                    </div>
                                )}
                                {order.actual_end_date && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Completed</span>
                                        <span>{format(parseISO(order.actual_end_date), 'MMM d, yyyy HH:mm')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Source Info */}
                        {order.source_type && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Source</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Type</span>
                                            <span className="capitalize">{order.source_type.replace('_', ' ')}</span>
                                        </div>
                                        {order.source_reference && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Reference</span>
                                                <span>{order.source_reference}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <Separator />

                        {/* Actions */}
                        {canUpdate && actions.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Actions</h3>
                                <div className="space-y-2">
                                    {actions.map(action => {
                                        const Icon = action.icon;
                                        return (
                                            <Button
                                                key={action.key}
                                                variant={action.variant}
                                                className="w-full justify-start"
                                                onClick={() => onAction(action.key, order)}
                                            >
                                                <Icon className="w-4 h-4 mr-2" />
                                                {action.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

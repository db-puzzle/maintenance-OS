import React from 'react';
import { Link, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/number';
import { ManufacturingOrderTreeNode } from './types';
import { OrderCardActions } from './OrderCardActions';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import { RouteStatusIndicator } from './RouteStatusIndicator';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: string | number | Record<string, string | number>) => string;

interface OrderCardStandardProps {
    order: ManufacturingOrderTreeNode;
    isSelected: boolean;
    showImages: boolean;
    enhancedMode: 'standard' | 'planning';
    onOrderClick?: (order: ManufacturingOrderTreeNode) => void;
    onOrderSelect?: (orderId: number, multiSelect: boolean) => void;
    permissions: {
        canRelease: boolean;
        canCancel: boolean;
        canUpdate: boolean;
        canDelete: boolean;
    };
    onReleaseOrder: (order: ManufacturingOrderTreeNode) => void;
    onCancelOrder: (order: ManufacturingOrderTreeNode) => void;
}

export function OrderCardStandard({
    order,
    isSelected,
    showImages,
    enhancedMode,
    onOrderClick,
    onOrderSelect,
    permissions,
    onReleaseOrder,
    onCancelOrder,
}: OrderCardStandardProps) {

    const handleClick = (e: React.MouseEvent) => {
        if (onOrderSelect && enhancedMode === 'planning') {
            e.stopPropagation();
            onOrderSelect(order.id, e.ctrlKey || e.metaKey);
        } else if (onOrderClick) {
            onOrderClick(order);
        }
    };

    const hasAnyPermission = permissions.canRelease ||
        permissions.canCancel || permissions.canUpdate || permissions.canDelete;

    return (
        <div
            className={cn(
                "w-full p-3 border rounded-lg transition-all hover:bg-muted/50",
                onOrderClick && "cursor-pointer",
                isSelected && "border-ring ring-ring/10 ring-[2px]",
                enhancedMode === 'planning' && isSelected && "border-ring ring-ring/10 ring-[2px]"
            )}
            onClick={handleClick}
        >
            <div className={cn(
                "grid gap-2 items-center w-full",
                showImages ? "grid-cols-[60px_3fr_3fr_1fr_1fr_2fr_1fr_1fr]" : "grid-cols-12"
            )}>
                {/* Image */}
                {showImages && (
                    <div className="flex items-center justify-center">
                        {order.item && (
                            <ItemImagePreview
                                primaryImageUrl={order.item.primary_image_thumbnail_url || order.item.primary_image_url}
                                imageCount={order.item.images?.length || 0}
                                className="w-12 h-12 cursor-pointer"
                                onClick={(e) => {
                                    e?.stopPropagation();
                                    if (order.item?.id) {
                                        router.visit(route('production.items.show', order.item.id));
                                    }
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Order Number */}
                <div className={showImages ? "" : "col-span-3"}>
                    <Link
                        href={route('production.orders.show', order.id)}
                        className="font-medium text-primary hover:underline text-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {order.order_number}
                    </Link>
                    {order.source_reference && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                            Ref: {order.source_reference}
                        </div>
                    )}
                </div>

                {/* Item Details */}
                <div className={showImages ? "" : "col-span-3"}>
                    <div className="text-sm font-medium">{order.item?.item_number}</div>
                    <div className="text-xs text-muted-foreground">{order.item?.name}</div>
                </div>

                {/* Quantity */}
                <div className={cn("text-right", !showImages && "col-span-1")}>
                    <div className="text-sm font-medium">{formatNumber(order.quantity)}</div>
                </div>

                {/* Unit of Measure */}
                <div className={!showImages ? "col-span-1" : ""}>
                    <div className="text-sm text-muted-foreground">{order.unit_of_measure}</div>
                </div>

                {/* Route Name */}
                <div className={!showImages ? "col-span-2" : ""}>
                    {enhancedMode === 'planning' ? (
                        <div className="flex items-center justify-center space-x-2">
                            <RouteStatusIndicator />
                            <div className="flex flex-col items-center">
                                <div className="text-sm">
                                    {order.manufacturing_route ? (
                                        <span className="font-medium text-foreground">
                                            {order.manufacturing_route.name}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground italic">
                                            No route
                                        </span>
                                    )}
                                </div>
                                {order.manufacturing_route && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                        {order.manufacturing_route.steps?.length || 0} step{(order.manufacturing_route.steps?.length || 0) !== 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-center">
                            {order.manufacturing_route ? (
                                <span className="font-medium text-foreground">
                                    {order.manufacturing_route.name}
                                </span>
                            ) : (
                                <span className="text-muted-foreground italic">
                                    Nenhuma rota
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Status */}
                <div className={cn("flex items-center justify-center", !showImages && "col-span-1")}>
                    {enhancedMode === 'planning' ? (
                        <Badge
                            variant={order.status === 'planned' ? 'default' : order.status === 'draft' ? 'secondary' : 'default'}
                            className={cn("text-xs", order.status === 'planned' && "bg-green-100 text-green-800")}
                        >
                            {order.status.toUpperCase()}
                        </Badge>
                    ) : (
                        <span className="text-sm font-medium">{order.status.toUpperCase()}</span>
                    )}
                </div>

                {/* Actions */}
                <div className={cn("flex items-center justify-center", !showImages && "col-span-1")}>
                    {hasAnyPermission ? (
                        <OrderCardActions
                            order={order}
                            permissions={permissions}
                            onReleaseOrder={onReleaseOrder}
                            onCancelOrder={onCancelOrder}
                        />
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center">
                                        {order.manufacturing_route ? (
                                            order.manufacturing_route.steps && order.manufacturing_route.steps.length > 0 ? (
                                                <List className="h-4 w-4 text-gray-600" />
                                            ) : (
                                                <List className="h-4 w-4 text-gray-600" />
                                            )
                                        ) : (
                                            <div className="h-4 w-4" />
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {order.manufacturing_route ? (
                                        order.manufacturing_route.steps && order.manufacturing_route.steps.length > 0 ? (
                                            `Rota criada com ${order.manufacturing_route.steps.length} passo${order.manufacturing_route.steps.length > 1 ? 's' : ''}`
                                        ) : (
                                            'Rota criada mas sem passos configurados'
                                        )
                                    ) : (
                                        'Nenhuma rota criada'
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>

            {/* Additional info row */}
            {(order.planned_start_date || order.actual_start_date) && (
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                        {order.planned_start_date && (
                            <div>
                                Planned: {new Date(order.planned_start_date).toLocaleDateString()}
                            </div>
                        )}
                        {order.actual_start_date && (
                            <div>
                                Started: {new Date(order.actual_start_date).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

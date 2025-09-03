import React from 'react';
import { Link, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/number';
import { ManufacturingOrderTreeNode } from './types';
import { RouteStatusIndicator } from './RouteStatusIndicator';
import { OrderCardActions } from './OrderCardActions';
import { getRouteStatus, getRouteCompleteness } from './utils';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: string | number | Record<string, string | number>) => string;

interface OrderCardCompactProps {
    order: ManufacturingOrderTreeNode;
    isSelected: boolean;
    enhancedMode: 'standard' | 'planning';
    showThumbnails?: boolean;
    onOrderClick?: (order: ManufacturingOrderTreeNode) => void;
    onOrderSelect?: (orderId: number, multiSelect: boolean) => void;
    canManageRoute: boolean;
    permissions: {
        canRelease: boolean;
        canCancel: boolean;
        canUpdate: boolean;
        canDelete: boolean;
    };
    onApplyTemplate: (order: ManufacturingOrderTreeNode) => void;
    onCreateCustomRoute: (order: ManufacturingOrderTreeNode) => void;
    onRemoveRoute: (order: ManufacturingOrderTreeNode) => void;
    onReleaseOrder: (order: ManufacturingOrderTreeNode) => void;
    onCancelOrder: (order: ManufacturingOrderTreeNode) => void;
}

export function OrderCardCompact({
    order,
    isSelected,
    enhancedMode,
    showThumbnails = false,
    onOrderClick,
    onOrderSelect,
    canManageRoute,
    permissions,
    onApplyTemplate,
    onCreateCustomRoute,
    onRemoveRoute,
    onReleaseOrder,
    onCancelOrder,
}: OrderCardCompactProps) {
    const routeStatus = getRouteStatus(order);
    const routeCompleteness = getRouteCompleteness(order);

    const handleClick = (e: React.MouseEvent) => {
        if (onOrderSelect && enhancedMode === 'planning') {
            e.stopPropagation();
            onOrderSelect(order.id, e.ctrlKey || e.metaKey);
        } else if (onOrderClick) {
            onOrderClick(order);
        }
    };

    return (
        <div
            className={cn(
                "w-full p-2 border rounded-md transition-all hover:bg-muted/50",
                onOrderClick && "cursor-pointer",
                isSelected && "ring-2 ring-primary bg-primary/5",
                enhancedMode === 'planning' && isSelected && "border-primary"
            )}
            onClick={handleClick}
        >
            {/* Compact layout */}
            <div className="flex items-center justify-between gap-2">
                {/* Thumbnail */}
                {showThumbnails && order.item && (
                    <div className="flex-shrink-0">
                        <ItemImagePreview
                            primaryImageUrl={order.item.primary_image_thumbnail_url || order.item.primary_image_url}
                            imageCount={order.item.images?.length || 0}
                            className="w-10 h-10 cursor-pointer"
                            onClick={(e) => {
                                e?.stopPropagation();
                                if (order.item?.id) {
                                    router.visit(route('production.items.show', order.item.id));
                                }
                            }}
                        />
                    </div>
                )}

                {/* Left side - Order info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('production.orders.show', order.id)}
                            className="font-medium text-sm text-primary hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {order.order_number}
                        </Link>
                        <span className="text-xs text-muted-foreground truncate">
                            {order.item?.item_number}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                            {formatNumber(order.quantity)} {order.unit_of_measure}
                        </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {order.item?.name}
                    </div>
                </div>

                {/* Right side - Route status and actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Route Status */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                    <RouteStatusIndicator status={routeStatus} />
                                    {order.manufacturing_route && (
                                        <span className="text-xs text-muted-foreground">
                                            {routeCompleteness.configured}/{routeCompleteness.required}
                                        </span>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-xs">
                                    <div className="font-medium">
                                        {order.manufacturing_route?.name || 'No route'}
                                    </div>
                                    {order.manufacturing_route && (
                                        <div className="mt-1">
                                            {routeCompleteness.configured} of {routeCompleteness.required} steps configured
                                            {routeCompleteness.percentage === 100 && " ✓"}
                                        </div>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Status Badge */}
                    <Badge
                        variant={order.status === 'planned' ? 'default' : order.status === 'draft' ? 'secondary' : 'default'}
                        className={cn("text-xs shrink-0", order.status === 'planned' && "bg-green-100 text-green-800")}
                    >
                        {order.status.toUpperCase()}
                    </Badge>

                    {/* Actions */}
                    <OrderCardActions
                        order={order}
                        canManageRoute={canManageRoute}
                        permissions={permissions}
                        onApplyTemplate={onApplyTemplate}
                        onCreateCustomRoute={onCreateCustomRoute}
                        onRemoveRoute={onRemoveRoute}
                        onReleaseOrder={onReleaseOrder}
                        onCancelOrder={onCancelOrder}
                        size="sm"
                    />
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/number';
import { ManufacturingOrderTreeNode } from './types';
import { OrderCardActions } from './OrderCardActions';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import { ImageWithBlurEffect } from '@/components/production/ImageWithBlurEffect';
import { PriorityEditor } from './PriorityEditor';
import { toast } from 'sonner';
import StackIcon from '@/components/stack-icon';
import { Copy } from 'lucide-react';

interface OrderCardCompactProps {
    order: ManufacturingOrderTreeNode;
    isSelected: boolean;
    enhancedMode: 'standard' | 'planning';
    showThumbnails?: boolean;
    onOrderClick?: (order: ManufacturingOrderTreeNode) => void;
    onOrderSelect?: (orderId: number, multiSelect: boolean, shiftSelect: boolean) => void;
    permissions: {
        canRelease: boolean;
        canCancel: boolean;
        canUpdate: boolean;
        canDelete: boolean;
    };
    onReleaseOrder: (order: ManufacturingOrderTreeNode) => void;
    onCancelOrder: (order: ManufacturingOrderTreeNode) => void;
    onPriorityChange?: (orderId: number, priority: number) => void;
    currentPriority?: number;
    currentRouteSteps?: Array<{ id: string | number; sequence: number; name: string;[key: string]: unknown }>;
}

export function OrderCardCompact({
    order,
    isSelected,
    enhancedMode,
    showThumbnails = false,
    onOrderClick,
    onOrderSelect,
    permissions,
    onReleaseOrder,
    onCancelOrder,
    onPriorityChange,
    currentPriority,
    currentRouteSteps,
}: OrderCardCompactProps) {
    // Use currentPriority if provided (for unsaved changes), otherwise use order priority
    const displayPriority = currentPriority !== undefined ? currentPriority : (order.priority || 50);

    const handleClick = (e: React.MouseEvent) => {
        if (onOrderSelect && enhancedMode === 'planning') {
            e.stopPropagation();
            const multiSelect = e.ctrlKey || e.metaKey;
            const shiftSelect = e.shiftKey;
            onOrderSelect(order.id, multiSelect, shiftSelect);
        } else if (onOrderClick) {
            onOrderClick(order);
        }
    };

    const handlePriorityChange = (newPriority: number) => {
        // Check if order can be updated
        if (!['draft', 'planned', 'scheduled'].includes(order.status)) {
            toast.error('Only draft, planned, or scheduled orders can be updated');
            return;
        }

        // Just notify parent of the change
        onPriorityChange?.(order.id, newPriority);
    };

    return (
        <div
            className={cn(
                "w-full p-2 border rounded-md transition-all hover:bg-muted/50",
                onOrderClick && "cursor-pointer",
                isSelected && "border-ring ring-ring/10 ring-[2px]",
                enhancedMode === 'planning' && isSelected && "border-ring ring-ring/10 ring-[2px]"
            )}
            onClick={handleClick}
        >
            {/* Compact layout */}
            <div className="flex items-center justify-between gap-2">
                {/* Thumbnail */}
                {showThumbnails && order.item && (
                    <div className="flex-shrink-0">
                        <HoverCard openDelay={500} closeDelay={200}>
                            <HoverCardTrigger asChild>
                                <div className="pointer-events-none">
                                    <ItemImagePreview
                                        primaryImageUrl={order.item.primary_image_thumbnail_url || order.item.primary_image_url || order.item.thumbnail_url}
                                        imageCount={order.item.media?.length || 0}
                                        className="w-10 h-10 pointer-events-auto"
                                    />
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent
                                className="w-80 p-0 overflow-hidden pointer-events-none"
                                side="right"
                                align="start"
                            >
                                <div className="pointer-events-auto">
                                    {(order.item.primary_image_url || order.item.thumbnail_url) ? (
                                        <div>
                                            <ImageWithBlurEffect
                                                src={order.item.primary_image_url || order.item.thumbnail_url || ''}
                                                alt={`${order.item.name} - imagem ampliada`}
                                                containerClassName="w-full h-80"
                                            />
                                            <div className="p-3 border-t">
                                                <h4 className="font-medium text-sm select-none">{order.order_number}</h4>
                                                <p className="text-xs text-muted-foreground mt-1 select-none">
                                                    {order.item.item_number && <span className="font-medium">{order.item.item_number} - </span>}
                                                    {order.item.name}
                                                </p>
                                                {order.item.media && order.item.media.length > 1 && (
                                                    <p className="text-xs text-muted-foreground mt-2 select-none">
                                                        {order.item.media.length} imagens disponíveis
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-80 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                            <span className="select-none">N/A</span>
                                        </div>
                                    )}
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    </div>
                )}

                {/* Left side - Order info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-primary truncate select-none">
                            {order.order_number}
                        </span>

                        {/* Quantity Indicator */}
                        <TooltipProvider delayDuration={700}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Copy className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground select-none">
                                            {formatNumber(order.quantity)} {order.unit_of_measure}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">
                                        Quantidade: {formatNumber(order.quantity)} {order.unit_of_measure}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Route Steps Indicator */}
                        {(order.manufacturing_route || currentRouteSteps !== undefined) && (() => {
                            const stepCount = currentRouteSteps?.length ?? order.manufacturing_route?.steps?.length ?? 0;
                            const hasNoSteps = stepCount === 0;

                            return (
                                <TooltipProvider delayDuration={700}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <StackIcon className={cn("h-3 w-3", hasNoSteps ? "text-red-500" : "text-muted-foreground")} />
                                                <span className={cn("text-xs select-none", hasNoSteps ? "text-red-500" : "text-muted-foreground")}>
                                                    {stepCount}
                                                </span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">
                                                {stepCount} {stepCount === 1 ? 'etapa' : 'etapas'} configuradas
                                                {currentRouteSteps && ' (unsaved)'}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        })()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 select-none">
                        {order.item && (() => {
                            const itemNumber = order.item.item_number || '';
                            const itemName = order.item.name || '';
                            const fullText = itemNumber ? `${itemNumber} - ${itemName}` : itemName;
                            const shouldTruncate = fullText.length > 35;

                            if (shouldTruncate) {
                                return (
                                    <TooltipProvider delayDuration={700}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-block">
                                                    {itemNumber && <span className="font-medium">{itemNumber.substring(0, Math.min(itemNumber.length, 35 - itemName.length - 3))} - </span>}
                                                    {itemName.substring(0, Math.max(0, 35 - (itemNumber ? itemNumber.length + 3 : 0) - 3))}...
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="max-w-sm">
                                                    {itemNumber && <span className="font-medium">{itemNumber} - </span>}
                                                    {itemName}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            } else {
                                return (
                                    <>
                                        {itemNumber && <span className="font-medium">{itemNumber} - </span>}
                                        {itemName}
                                    </>
                                );
                            }
                        })()}
                    </div>
                </div>

                {/* Right side - Priority, status and actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Priority Editor */}
                    {permissions.canUpdate && (
                        <PriorityEditor
                            priority={displayPriority}
                            onChange={handlePriorityChange}
                            disabled={!['draft', 'planned', 'scheduled'].includes(order.status)}
                            compact={false}
                        />
                    )}

                    {/* Status Badge */}
                    <Badge
                        variant={order.status === 'planned' ? 'default' : order.status === 'draft' ? 'secondary' : 'default'}
                        className={cn("text-xs shrink-0 select-none", order.status === 'planned' && "bg-green-100 text-green-800")}
                    >
                        {order.status.toUpperCase()}
                    </Badge>

                    {/* Actions */}
                    <OrderCardActions
                        order={order}
                        permissions={permissions}
                        onReleaseOrder={onReleaseOrder}
                        onCancelOrder={onCancelOrder}
                        size="sm"
                    />
                </div>
            </div>
        </div>
    );
}

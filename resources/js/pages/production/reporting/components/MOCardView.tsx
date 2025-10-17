import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ManufacturingOrder } from '@/types/production';
import { MOStatusBadge } from './MOStatusBadge';
import { MOPriorityBadge } from './MOPriorityBadge';
import { MOProgressBar } from './MOProgressBar';
import { MODetailsDialog } from './MODetailsDialog';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import { format, parseISO } from 'date-fns';
import {
    Play,
    FileText,
    MoreHorizontal,
    Clock,
    AlertCircle,
    ChevronRight,
    Waypoints
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MOCardViewProps {
    orders: ManufacturingOrder[];
    onOrderClick: (order: ManufacturingOrder) => void;
    onAction: (action: string, order: ManufacturingOrder) => void;
    showImages?: boolean;
}

export function MOCardView({ orders, onOrderClick, onAction, showImages = true }: MOCardViewProps) {
    const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [imageOverlays, setImageOverlays] = useState<Record<number, boolean>>({});
    const [overlayAnimations, setOverlayAnimations] = useState<Record<number, 'entering' | 'exiting' | null>>({});

    // Helper function to get image URL
    const getItemImageUrl = (item: ManufacturingOrder['item'], preferThumbnail: boolean = true) => {
        if (!item) return null;

        // Check for primaryImage object first
        if (item.primaryImage) {
            if (preferThumbnail) {
                return item.primaryImage.thumbnail_url || item.primaryImage.url;
            } else {
                return item.primaryImage.url;
            }
        }

        // Fallback to direct URL properties
        if (preferThumbnail) {
            return item.primary_image_thumbnail_url || item.primary_image_url;
        } else {
            return item.primary_image_url;
        }
    };

    // Handler to open dialog with selected order
    const handleCardClick = (order: ManufacturingOrder) => {
        setSelectedOrder(order);
        setIsDialogOpen(true);
    };

    // Handler to toggle image overlay
    const toggleImageOverlay = (orderId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click

        const isCurrentlyVisible = imageOverlays[orderId];

        if (isCurrentlyVisible) {
            // Start exit animation
            setOverlayAnimations(prev => ({ ...prev, [orderId]: 'exiting' }));
            // Hide after animation completes
            setTimeout(() => {
                setImageOverlays(prev => ({ ...prev, [orderId]: false }));
                setOverlayAnimations(prev => ({ ...prev, [orderId]: null }));
            }, 300);
        } else {
            // Show and start enter animation
            setImageOverlays(prev => ({ ...prev, [orderId]: true }));
            setOverlayAnimations(prev => ({ ...prev, [orderId]: 'entering' }));
            // Clear animation state after it completes
            setTimeout(() => {
                setOverlayAnimations(prev => ({ ...prev, [orderId]: null }));
            }, 300);
        }
    };

    const getActionButton = (order: ManufacturingOrder) => {
        switch (order.status) {
            case 'released':
                return (
                    <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 text-white"
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
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction('report', order);
                        }}
                    >
                        <FileText className="w-4 h-4 mr-1" />
                        Report
                    </Button>
                );
            case 'on_hold':
                return (
                    <Button
                        size="sm"
                        variant="default"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction('resume', order);
                        }}
                    >
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                    </Button>
                );
            default:
                return null;
        }
    };

    const getStatusColors = (status: string) => {
        switch (status) {
            case 'draft':
                return 'border-gray-300 dark:border-gray-600 bg-gray-100/20 dark:bg-gray-800/30';
            case 'planned':
                return 'border-yellow-300 dark:border-yellow-600 bg-yellow-100/20 dark:bg-yellow-900/30';
            case 'released':
                return 'border-blue-300 dark:border-blue-500 bg-blue-100/30 dark:bg-blue-900/40';
            case 'in_progress':
                return 'border-amber-300 dark:border-amber-500 bg-amber-100/20 dark:bg-amber-900/30';
            case 'on_hold':
                return 'border-orange-300 dark:border-orange-500 bg-orange-100/20 dark:bg-orange-900/30';
            case 'completed':
                return 'border-green-400 dark:border-green-500 bg-green-100/20 dark:bg-green-900/30';
            case 'cancelled':
                return 'border-red-300 dark:border-red-500 bg-red-100/20 dark:bg-red-900/30';
            default:
                return '';
        }
    };

    const renderCardFront = (order: ManufacturingOrder, isOverdue: boolean) => {
        const imageUrl = getItemImageUrl(order.item);
        const showOverlay = imageOverlays[order.id] || false;
        const animationState = overlayAnimations[order.id];
        const statusColors = getStatusColors(order.status);

        return (
            <CardContent className="p-4 h-[400px] flex flex-col relative">
                {/* Image Overlay */}
                {showOverlay && imageUrl && (
                    <div
                        className={`absolute inset-0 z-10 rounded-lg cursor-pointer transition-opacity duration-300 ease-in-out ${animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
                            }`}
                        onClick={(e) => toggleImageOverlay(order.id, e)}
                    >
                        {/* Solid background layer to hide card content */}
                        <div className="absolute inset-0 bg-background rounded-lg" />
                        {/* Status-colored overlay */}
                        <div className={`absolute inset-0 rounded-lg ${statusColors}`} />
                        {/* Image */}
                        <div className="relative w-full h-full p-4">
                            <ItemImagePreview
                                primaryImageData={order.item?.primary_image_data}
                                primaryImageUrl={getItemImageUrl(order.item, false) || ''}
                                imageCount={0}
                                className={`w-full h-full transition-all duration-300 ease-in-out ${animationState === 'exiting' ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}
                            />
                        </div>
                    </div>
                )}

                {/* Header - Always the same */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                            {order.order_number}
                        </h3>
                        {order.has_route && (
                            <Waypoints className="w-4 h-4 text-muted-foreground" />
                        )}
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

                {/* Item Info Section - Always present */}
                <div className="flex items-start gap-3 mb-3">
                    {showImages && (
                        <ItemImagePreview
                            primaryImageData={order.item?.primary_image_data}
                            primaryImageUrl={imageUrl || ''}
                            imageCount={0}
                            className="w-16 h-16 cursor-pointer"
                            onClick={(e) => toggleImageOverlay(order.id, e!)}
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

                {/* Progress Bar - Always present */}
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

                {/* Current Step - Show when available */}
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

                {/* Spacer to push footer to bottom */}
                <div className="flex-1" />

                {/* Footer - Always at bottom */}
                <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-3 text-sm">
                        <MOStatusBadge status={order.status} />
                        {order.requested_date && (
                            <div className={cn(
                                "flex items-center gap-1",
                                isOverdue && "text-orange-600 font-medium"
                            )}>
                                {isOverdue ? (
                                    <AlertCircle className="w-4 h-4 text-orange-600" />
                                ) : (
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                )}
                                {format(parseISO(order.requested_date), 'MMM d')}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {getActionButton(order)}
                        <MOPriorityBadge priority={order.priority} />
                    </div>
                </div>
            </CardContent>
        );
    };



    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map(order => {
                    const isOverdue = !!(order.requested_date &&
                        parseISO(order.requested_date) < new Date() &&
                        !['completed', 'cancelled'].includes(order.status));

                    return (
                        <Card
                            key={order.id}
                            variant='compact'
                            className={cn(
                                "cursor-pointer hover:shadow-lg transition-shadow border-2 relative h-[400px] overflow-hidden",
                                getStatusColors(order.status),
                                isOverdue && "!border-orange-500"
                            )}
                            onClick={() => handleCardClick(order)}
                        >
                            {renderCardFront(order, isOverdue)}
                        </Card>
                    );
                })}
            </div>

            {/* Dialog for order details */}
            <MODetailsDialog
                order={selectedOrder}
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onAction={onAction}
            />
        </>
    );
}
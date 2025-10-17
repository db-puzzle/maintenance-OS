import React from 'react';
import { ManufacturingOrder } from '@/types/production';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
    Play,
    FileText,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { MOStatusBadge } from './MOStatusBadge';
import { MOPriorityBadge } from './MOPriorityBadge';

interface MODetailsDialogProps {
    order: ManufacturingOrder | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAction: (action: string, order: ManufacturingOrder) => void;
    canUpdate?: boolean;
}

export function MODetailsDialog({
    order,
    isOpen,
    onOpenChange,
    onAction,
    canUpdate = true
}: MODetailsDialogProps) {
    if (!order) return null;

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

    const isOverdue = order.requested_date &&
        parseISO(order.requested_date) < new Date() &&
        !['completed', 'cancelled'].includes(order.status);

    const renderDialogContent = () => {
        return (
            <div className="h-full flex gap-6">
                {/* Left Side - Image Section */}
                <div className="w-1/2 flex-shrink-0 flex flex-col">
                    {getItemImageUrl(order.item, false) ? (
                        <div className="bg-gray-50 rounded-lg h-full flex items-center justify-center">
                            <img
                                src={getItemImageUrl(order.item, false)!}
                                alt={order.item?.name || 'Product'}
                                className="w-full h-full object-contain rounded-lg"
                            />
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-4 h-full flex items-center justify-center">
                            <div className="text-center text-gray-400">
                                <Package className="w-16 h-16 mx-auto mb-2" />
                                <p className="text-sm">No image available</p>
                            </div>
                        </div>
                    )}
                    {/* TODO: Add thumbnail gallery when multiple images are available */}
                </div>

                {/* Right Side - Information Section */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Fixed Header */}
                    <div className="pb-4 flex-shrink-0">
                        <h2 className="text-xl font-semibold">{order.order_number}</h2>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-muted-foreground min-w-0 flex-1 truncate">
                                {order.item?.item_number && (
                                    <>
                                        <span className="font-medium">{order.item.item_number}</span>
                                        <span className="mx-2">•</span>
                                    </>
                                )}
                                {order.item?.name}
                            </p>
                            {order.has_route && (
                                <div className="flex items-center gap-1 text-primary flex-shrink-0">
                                    <Package className="w-3 h-3" />
                                    <span className="text-xs font-medium">Routed</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <ScrollArea className="flex-1">
                        <div>
                            {/* Status Overview */}
                            <div className="mb-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MOStatusBadge status={order.status} />
                                        {isOverdue && (
                                            <div className="flex items-center gap-1 text-orange-600">
                                                <AlertCircle className="w-3 h-3" />
                                                <span className="text-xs font-medium">Overdue</span>
                                            </div>
                                        )}
                                    </div>
                                    <MOPriorityBadge priority={order.priority} />
                                </div>
                            </div>

                            <Separator className="my-4" />

                            {/* Details Grid */}
                            <div className="space-y-4">
                                <div>
                                    <div className="grid grid-cols-3 gap-x-6 text-sm mb-3">
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Order Quantity</p>
                                            <p className="font-medium truncate">
                                                {order.quantity} {order.unit_of_measure}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Completed</p>
                                            <p className="font-medium truncate">
                                                {order.quantity_completed} {order.unit_of_measure}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Remaining</p>
                                            <p className="font-medium truncate">
                                                {order.quantity_remaining || 0} {order.unit_of_measure}
                                            </p>
                                        </div>
                                    </div>
                                    {order.quantity_scrapped > 0 && (
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Scrapped</p>
                                            <p className="font-medium text-red-600">
                                                {order.quantity_scrapped} {order.unit_of_measure}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                <div>
                                    <div className="grid grid-cols-3 gap-x-6 text-sm">
                                        {order.requested_date && (
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">Due Date</p>
                                                <p className="font-medium truncate">
                                                    {format(parseISO(order.requested_date), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        )}
                                        {order.actual_start_date && (
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">Start Date</p>
                                                <p className="font-medium truncate">
                                                    {format(parseISO(order.actual_start_date), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        )}
                                        {order.requested_date && !order.actual_end_date && (
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">Remaining Days</p>
                                                {(() => {
                                                    const remainingDays = differenceInDays(parseISO(order.requested_date), new Date());
                                                    const isOverdue = remainingDays < 0;
                                                    return (
                                                        <p className={`font-medium truncate ${isOverdue
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : remainingDays <= 3
                                                                ? 'text-orange-600 dark:text-orange-400'
                                                                : 'text-green-600 dark:text-green-400'
                                                            }`}>
                                                            {remainingDays} days
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        {order.actual_end_date && (
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">End Date</p>
                                                <p className="font-medium truncate">
                                                    {format(parseISO(order.actual_end_date), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Production Information */}
                                {order.source_type && (
                                    <>
                                        <Separator />
                                        <div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                                {order.source_type && (
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">Source Type</p>
                                                        <p className="font-medium capitalize">{order.source_type.replace('_', ' ')}</p>
                                                    </div>
                                                )}
                                                {order.source_reference && (
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">Source Reference</p>
                                                        <p className="font-medium truncate">{order.source_reference}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Route Information */}
                                {order.has_route && order.manufacturing_route?.steps && order.manufacturing_route.steps.length > 0 && (
                                    <>
                                        <Separator />
                                        <div>
                                            <p className="text-sm font-medium mb-3">Route Steps</p>
                                            <div className="space-y-2">
                                                {order.manufacturing_route.steps.map((step) => {
                                                    // Determine if this is the current step
                                                    const isCurrentStep = order.current_step?.id === step.id;

                                                    // Determine step status colors
                                                    const getStepColors = () => {
                                                        switch (step.status) {
                                                            case 'completed':
                                                                return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
                                                            case 'in_progress':
                                                                return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
                                                            case 'on_hold':
                                                                return 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800';
                                                            case 'failed':
                                                                return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
                                                            case 'skipped':
                                                                return 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800';
                                                            default: // pending, queued
                                                                return 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800';
                                                        }
                                                    };

                                                    // Determine step icon
                                                    const getStepIcon = () => {
                                                        switch (step.status) {
                                                            case 'completed':
                                                                return <CheckCircle className="w-4 h-4 text-green-600" />;
                                                            case 'in_progress':
                                                                return <Play className="w-4 h-4 text-blue-600" />;
                                                            case 'on_hold':
                                                                return <AlertCircle className="w-4 h-4 text-orange-600" />;
                                                            case 'failed':
                                                                return <AlertCircle className="w-4 h-4 text-red-600" />;
                                                            default:
                                                                return <ChevronRight className="w-4 h-4 text-gray-400" />;
                                                        }
                                                    };

                                                    return (
                                                        <div
                                                            key={step.id}
                                                            className={`p-3 rounded-md border ${getStepColors()} ${isCurrentStep ? 'ring-2 ring-primary' : ''}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-medium text-muted-foreground">
                                                                            Step {step.step_number}
                                                                        </span>
                                                                        {isCurrentStep && (
                                                                            <span className="text-xs font-medium text-primary">
                                                                                Current
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-medium text-sm truncate">{step.name}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {step.step_type && step.step_type !== 'standard' && (
                                                                            <>{step.step_type.replace('_', ' ')}</>
                                                                        )}
                                                                        {step.step_type && step.step_type !== 'standard' && step.status !== 'pending' && ' • '}
                                                                        {step.status !== 'pending' && (
                                                                            <>{step.status.replace('_', ' ')}</>
                                                                        )}
                                                                    </p>
                                                                    {/* Show timing information if available */}
                                                                    {(!step.use_workcell_throughput && (step.setup_time_minutes > 0 || step.cycle_time_minutes > 0)) && (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            {step.setup_time_minutes > 0 && (
                                                                                <>Setup: {step.setup_time_minutes}min</>
                                                                            )}
                                                                            {step.setup_time_minutes > 0 && step.cycle_time_minutes > 0 && ' • '}
                                                                            {step.cycle_time_minutes > 0 && (
                                                                                <>Cycle: {step.cycle_time_minutes}min</>
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                    {step.use_workcell_throughput && (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            Using work cell throughput
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                {getStepIcon()}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Notes/Comments Section - TODO: Add when notes field is available */}
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Action Buttons Section */}
                    {canUpdate && (
                        <div className="pt-4 flex-shrink-0">
                            {/* Primary Actions */}
                            <div className="flex gap-3 flex-col sm:flex-row">
                                {order.status === 'released' && (
                                    <Button
                                        variant="default"
                                        size="default"
                                        className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base"
                                        onClick={() => onAction('start', order)}
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        Start Production
                                    </Button>
                                )}
                                {order.status === 'in_progress' && (
                                    <>
                                        <Button
                                            variant="default"
                                            size="default"
                                            className="flex-1 h-12 text-base"
                                            onClick={() => onAction('report', order)}
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Report Progress
                                        </Button>
                                        {(!order.has_route || (order.quantity_remaining && order.quantity_remaining > 0)) && (
                                            <Button
                                                variant="outline"
                                                size="default"
                                                className="flex-1 h-12 text-base"
                                                onClick={() => onAction('complete', order)}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Complete
                                            </Button>
                                        )}
                                    </>
                                )}


                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[800px] !w-[90vw] !h-[80vh] p-6 gap-0 sm:max-w-[1200px] overflow-hidden">
                {renderDialogContent()}
            </DialogContent>
        </Dialog>
    );
}

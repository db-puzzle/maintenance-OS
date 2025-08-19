import React from 'react';
import { ManufacturingOrder } from '@/types/production';
import { format, parseISO } from 'date-fns';
import {
    Play,
    FileText,
    Pause,
    CheckCircle,
    X,
    Printer,
    MessageSquare,
    AlertTriangle,
    RotateCcw,
    UserPlus,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { MOStatusBadge } from './MOStatusBadge';
import { MOPriorityBadge } from './MOPriorityBadge';
import { MOProgressBar } from './MOProgressBar';

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
                <div className="w-1/3 flex-shrink-0 flex flex-col">
                    {getItemImageUrl(order.item, false) ? (
                        <div className="bg-gray-50 rounded-lg p-4 h-full flex items-center justify-center">
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
                        <p className="text-sm text-muted-foreground">{order.item?.name}</p>
                    </div>

                    {/* Scrollable Content */}
                    <ScrollArea className="flex-1">
                        <div className="pr-4">
                            {/* Status Overview */}
                            <div className="mb-4 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <MOStatusBadge status={order.status} />
                                    <MOPriorityBadge priority={order.priority} />
                                    {order.has_route && (
                                        <div className="flex items-center gap-1 text-primary">
                                            <Package className="w-3 h-3" />
                                            <span className="text-xs font-medium">Routed</span>
                                        </div>
                                    )}
                                    {isOverdue && (
                                        <div className="flex items-center gap-1 text-orange-600">
                                            <AlertCircle className="w-3 h-3" />
                                            <span className="text-xs font-medium">Overdue</span>
                                        </div>
                                    )}
                                </div>
                                <MOProgressBar
                                    completed={order.quantity_completed}
                                    scrapped={order.quantity_scrapped}
                                    total={order.quantity}
                                    showPercentage
                                    className="w-full"
                                />
                            </div>

                            <Separator className="my-4" />

                            {/* Details Grid */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-3 text-sm">Order Details</h3>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Item Number</p>
                                            <p className="font-medium truncate">{order.item?.item_number}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Order Quantity</p>
                                            <p className="font-medium truncate">
                                                {order.quantity} {order.unit_of_measure}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Completed</p>
                                            <p className="font-medium text-green-600">
                                                {order.quantity_completed} {order.unit_of_measure}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Remaining</p>
                                            <p className="font-medium text-blue-600">
                                                {order.quantity_remaining || 0} {order.unit_of_measure}
                                            </p>
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
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="font-semibold mb-3 text-sm">Schedule Information</h3>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                        {order.requested_date && (
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">Due Date</p>
                                                <p className="font-medium">
                                                    {format(parseISO(order.requested_date), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        )}
                                        {order.actual_start_date && (
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">Start Date</p>
                                                <p className="font-medium">
                                                    {format(parseISO(order.actual_start_date), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        )}
                                        {order.actual_end_date && (
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">End Date</p>
                                                <p className="font-medium">
                                                    {format(parseISO(order.actual_end_date), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Production Information */}
                                {(order.current_step?.work_cell || order.source_type) && (
                                    <>
                                        <Separator />
                                        <div>
                                            <h3 className="font-semibold mb-3 text-sm">Production Information</h3>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                                {order.current_step?.work_cell && (
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">Work Cell</p>
                                                        <p className="font-medium truncate">{order.current_step.work_cell.name}</p>
                                                    </div>
                                                )}
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
                                {order.has_route && order.current_step && (
                                    <>
                                        <Separator />
                                        <div>
                                            <h3 className="font-semibold mb-3 text-sm">Route Progress</h3>
                                            <div className="space-y-2">
                                                <div className="p-3 bg-primary/10 rounded-md">
                                                    <div className="flex items-center justify-between">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-sm truncate">Current: {order.current_step.name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {order.current_step.work_cell?.name || 'No work cell'}
                                                                {order.current_step.step_type && (
                                                                    <> • {order.current_step.step_type.replace('_', ' ')}</>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                                                    </div>
                                                </div>
                                                {/* TODO: Add previous/next steps when available */}
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
                        <div className="pt-4 flex-shrink-0 border-t">
                            {/* Primary Actions */}
                            <div className="flex gap-2">
                                {order.status === 'released' && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => onAction('start', order)}
                                    >
                                        <Play className="w-3 h-3 mr-1" />
                                        Start Production
                                    </Button>
                                )}
                                {order.status === 'in_progress' && (
                                    <>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => onAction('report', order)}
                                        >
                                            <FileText className="w-3 h-3 mr-1" />
                                            Report Progress
                                        </Button>
                                        {(!order.has_route || (order.quantity_remaining && order.quantity_remaining > 0)) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => onAction('complete', order)}
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Complete
                                            </Button>
                                        )}
                                    </>
                                )}

                                {/* More Actions Dropdown */}
                                {['released', 'in_progress', 'on_hold'].includes(order.status) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                More Actions
                                                <ChevronRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56" align="end">
                                            {order.status === 'in_progress' && (
                                                <DropdownMenuItem onClick={() => onAction('hold', order)}>
                                                    <Pause className="w-4 h-4 mr-2" />
                                                    Put on Hold
                                                </DropdownMenuItem>
                                            )}
                                            {order.status === 'on_hold' && (
                                                <DropdownMenuItem onClick={() => onAction('resume', order)}>
                                                    <Play className="w-4 h-4 mr-2" />
                                                    Resume Production
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => onAction('cancel', order)}>
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel Order
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {['released', 'in_progress'].includes(order.status) && (
                                                <>
                                                    <DropdownMenuItem onClick={() => onAction('scrap', order)}>
                                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                                        Report Scrap
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                </>
                                            )}
                                            <DropdownMenuItem onClick={() => onAction('rework', order)}>
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Initiate Rework
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onAction('quality-issue', order)}>
                                                <AlertTriangle className="w-4 h-4 mr-2" />
                                                Report Quality Issue
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => onAction('add-note', order)}>
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Add Note/Comment
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onAction('print', order)}>
                                                <Printer className="w-4 h-4 mr-2" />
                                                Print Work Instructions
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => onAction('assign-resources', order)}>
                                                <UserPlus className="w-4 h-4 mr-2" />
                                                Assign Resources
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onAction('change-priority', order)}>
                                                <AlertCircle className="w-4 h-4 mr-2" />
                                                Change Priority
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
            <DialogContent className="!max-w-[1200px] !w-[90vw] !h-[80vh] p-6 gap-0 sm:max-w-[1200px] overflow-hidden">
                {renderDialogContent()}
            </DialogContent>
        </Dialog>
    );
}

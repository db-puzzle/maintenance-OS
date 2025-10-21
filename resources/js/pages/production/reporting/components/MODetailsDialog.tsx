import React, { useState, useEffect } from 'react';
import { ManufacturingOrder } from '@/types/production';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
    Play,
    FileText,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Package,
    Clock,
    Timer,
    Zap,
    Plus,
    Minus,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MOStatusBadge } from './MOStatusBadge';
import { MOPriorityBadge } from './MOPriorityBadge';
import { useForm, router } from '@inertiajs/react';
import { createFormAdapter } from '@/utils/form-adapters';
import { TextInput } from '@/components/TextInput';
import { TextArea } from '@/components/TextArea';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/number';
import { MOCompletionDialog } from './MOCompletionDialog';

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
    const [showReporting, setShowReporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'production' | 'scrap'>('production');
    const [showCompletionDialog, setShowCompletionDialog] = useState(false);

    const { data, setData, post, processing, errors, clearErrors, reset } = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        scrap_reason: '',
        time_spent: '',
        notes: '',
        mark_complete: false as boolean
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    // Automatically show reporting interface for in-progress orders
    useEffect(() => {
        if (order && order.status === 'in_progress') {
            setShowReporting(true);
        }
    }, [order?.status]);

    if (!order) return null;

    // Helper function to get image URL
    const getItemImageUrl = (item: ManufacturingOrder['item'], preferThumbnail: boolean = true) => {
        if (!item) return null;

        // Check for primary_image_data object first
        if (item.primary_image_data?.url) {
            if (preferThumbnail) {
                return item.primary_image_thumbnail_url || item.primary_image_data.url;
            } else {
                return item.primary_image_data.url;
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

    // Calculate max quantities
    const maxQuantity = order.quantity - order.quantity_completed - order.quantity_scrapped;
    const remainingAfterReport = maxQuantity - (data.quantity_completed + data.quantity_scrapped);

    // Handlers
    const handleStartProduction = () => {
        post(route('production.reporting.start', order.id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setShowReporting(true);
            },
            onError: (errors) => {
                console.error('Error starting production:', errors);
            }
        });
    };

    const handleReportProduction = () => {
        // Check if this report will complete all remaining items
        const totalReported = order.quantity_completed + order.quantity_scrapped + data.quantity_completed + data.quantity_scrapped;
        const willCompleteOrder = totalReported >= order.quantity;

        if (willCompleteOrder && !data.mark_complete) {
            // Show completion dialog
            setShowCompletionDialog(true);
        } else {
            // Submit directly
            submitProductionReport(false);
        }
    };

    const submitProductionReport = (markComplete: boolean) => {
        // Prepare the data, excluding scrap_reason if no scrap is being reported
        const submitData: {
            quantity_completed: number;
            mark_complete: boolean;
            time_spent?: string;
            notes?: string;
            quantity_scrapped?: number;
            scrap_reason?: string;
        } = {
            quantity_completed: data.quantity_completed || 0,
            mark_complete: markComplete
        };

        // Only include optional fields if they have values
        if (data.time_spent) {
            submitData.time_spent = data.time_spent;
        }

        if (data.notes) {
            submitData.notes = data.notes;
        }

        // Only include scrap-related fields if there's actually scrap to report
        if (data.quantity_scrapped && data.quantity_scrapped > 0) {
            submitData.quantity_scrapped = data.quantity_scrapped;
            if (data.scrap_reason) {
                submitData.scrap_reason = data.scrap_reason;
            }
        }

        console.log('Submitting data:', submitData); // Debug log

        // Use router.post instead of form post to have better control over the data
        router.post(route('production.reporting.report', order.id), submitData, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                reset();
                setShowCompletionDialog(false);
                // Keep showing the reporting interface after submission
                // The updated order data will show the new quantities
            },
            onError: (errors) => {
                console.error('Error reporting production:', errors);
                console.error('Submitted data was:', submitData); // Debug log
                setShowCompletionDialog(false);
            }
        });
    };

    const handleCompletionConfirm = () => {
        // Submit with mark_complete as true
        submitProductionReport(true);
    };

    const handleCompletionCancel = () => {
        // Submit with mark_complete as false
        submitProductionReport(false);
    };

    const handleQuickQuantity = (qty: number) => {
        const newQty = Math.min(data.quantity_completed + qty, maxQuantity);
        setData('quantity_completed', newQty);
    };

    const adjustQuantity = (field: 'quantity_completed' | 'quantity_scrapped', delta: number) => {
        const currentValue = data[field];
        const newValue = Math.max(0, currentValue + delta);

        if (field === 'quantity_completed') {
            setData(field, Math.min(newValue, maxQuantity));
        } else {
            setData(field, Math.min(newValue, maxQuantity - data.quantity_completed));
        }
    };

    const renderDialogContent = () => {
        return (
            <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-6">
                {/* Top/Left Side - Image Section */}
                <div className="w-full lg:w-1/2 flex-shrink-0 flex flex-col h-64 lg:h-auto">
                    {getItemImageUrl(order.item, false) ? (
                        <div className="bg-gray-50 rounded-lg h-full flex items-center justify-center overflow-hidden">
                            <img
                                src={getItemImageUrl(order.item, false)!}
                                alt={order.item?.name || 'Product'}
                                className="max-w-full max-h-full object-contain rounded-lg"
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

                {/* Bottom/Right Side - Information Section */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Fixed Header */}
                    <div className="pb-4 flex-shrink-0">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-semibold">{order.order_number}</h2>
                                <MOStatusBadge status={order.status} />
                            </div>
                            <MOPriorityBadge priority={order.priority} />
                        </div>
                        <p className="text-sm text-muted-foreground min-w-0 flex-1 truncate">
                            {order.item?.item_number && (
                                <>
                                    <span className="font-medium">{order.item.item_number}</span>
                                    <span className="mx-2">•</span>
                                </>
                            )}
                            {order.item?.name}
                        </p>
                    </div>

                    {/* Scrollable Content */}
                    <ScrollArea className="flex-1">
                        <div>
                            {/* Overdue Indicator */}
                            {isOverdue && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-1 text-orange-600">
                                        <AlertCircle className="w-3 h-3" />
                                        <span className="text-xs font-medium">Overdue</span>
                                    </div>
                                </div>
                            )}

                            {/* Details Grid */}
                            <div className="space-y-4">
                                <div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-x-6 text-sm">
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Order Quantity</p>
                                            <p className="font-medium truncate">
                                                {formatNumber(order.quantity)} {order.unit_of_measure}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Completed</p>
                                            <p className="font-medium truncate">
                                                {formatNumber(order.quantity_completed)} {order.unit_of_measure}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Remaining</p>
                                            <p className="font-medium truncate">
                                                {formatNumber(order.quantity_remaining || 0)} {order.unit_of_measure}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">Scrapped</p>
                                            <p className={`font-medium truncate ${order.quantity_scrapped > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                                {formatNumber(order.quantity_scrapped)} {order.unit_of_measure}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-x-6 text-sm">
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
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-6 sm:gap-y-3 text-sm">
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
                                            <div className="space-y-2 p-2">
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
                                                                return <Play className="w-4 h-4 text-gray-400" />;
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
                                                                    {/* Show timing information prominently */}
                                                                    {!step.use_workcell_throughput && (step.setup_time_minutes > 0 || step.cycle_time_minutes > 0) && (
                                                                        <div className="mt-2 flex gap-3">
                                                                            {step.setup_time_minutes > 0 && (
                                                                                <div className="bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded flex items-center gap-1">
                                                                                    <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                                                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                                                        Setup: {formatNumber(step.setup_time_minutes)}min
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {step.cycle_time_minutes > 0 && (
                                                                                <div className="bg-green-50 dark:bg-green-950 px-2 py-1 rounded flex items-center gap-1">
                                                                                    <Timer className="w-3 h-3 text-green-600 dark:text-green-400" />
                                                                                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                                                                        Cycle: {formatNumber(step.cycle_time_minutes)}min
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {step.use_workcell_throughput && (
                                                                        <div className="mt-2">
                                                                            <div className="bg-purple-50 dark:bg-purple-950 px-2 py-1 rounded inline-flex items-center gap-1">
                                                                                <Zap className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                                                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                                                                    Using work cell throughput
                                                                                </span>
                                                                            </div>
                                                                        </div>
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

                            </div>
                        </div>
                    </ScrollArea>

                    {/* Production Reporting Section */}
                    {canUpdate && (
                        <div className="pt-4 flex-shrink-0 border-t">
                            {order.status === 'released' && !showReporting && (
                                <div className="pt-4">
                                    <Button
                                        variant="default"
                                        size="default"
                                        className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
                                        onClick={handleStartProduction}
                                        disabled={processing}
                                    >
                                        <Play className="w-4 h-4 mr-2" />
                                        Start Production
                                    </Button>
                                </div>
                            )}

                            {(order.status === 'in_progress' || showReporting) && (
                                <div className="pt-4 space-y-4">
                                    <h3 className="text-base font-semibold">Report Production</h3>

                                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'production' | 'scrap')} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="production">Production</TabsTrigger>
                                            <TabsTrigger value="scrap">Scrap</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="production" className="space-y-4 mt-4">
                                            {/* Quantity Input with +/- buttons */}
                                            <div className="flex items-center justify-center gap-4">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-12 w-12"
                                                    onClick={() => adjustQuantity('quantity_completed', -1)}
                                                    disabled={data.quantity_completed <= 0}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>

                                                <div className="text-center">
                                                    <input
                                                        type="number"
                                                        value={data.quantity_completed}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setData('quantity_completed', Math.min(val, maxQuantity));
                                                        }}
                                                        className="w-24 h-14 text-2xl font-bold text-center border rounded-md"
                                                        min="0"
                                                        max={maxQuantity}
                                                    />
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {order.unit_of_measure}
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-12 w-12"
                                                    onClick={() => adjustQuantity('quantity_completed', 1)}
                                                    disabled={data.quantity_completed >= maxQuantity}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Quick quantity buttons */}
                                            <div className="flex gap-2 justify-center">
                                                {[10, 25, 50, 100].map((qty) => (
                                                    <Button
                                                        key={qty}
                                                        variant="outline"
                                                        size="sm"
                                                        className="min-w-[60px]"
                                                        onClick={() => handleQuickQuantity(qty)}
                                                        disabled={qty > maxQuantity}
                                                    >
                                                        {qty}
                                                    </Button>
                                                ))}
                                            </div>

                                            {/* Production notes */}
                                            <TextArea
                                                form={formAdapter}
                                                name="notes"
                                                label="Notes (optional)"
                                                placeholder="Add any production notes..."
                                                rows={3}
                                            />
                                        </TabsContent>

                                        <TabsContent value="scrap" className="space-y-4 mt-4">
                                            {/* Scrap quantity controls */}
                                            <div className="flex items-center justify-center gap-4">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-12 w-12"
                                                    onClick={() => adjustQuantity('quantity_scrapped', -1)}
                                                    disabled={data.quantity_scrapped <= 0}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>

                                                <div className="text-center">
                                                    <input
                                                        type="number"
                                                        value={data.quantity_scrapped}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setData('quantity_scrapped', Math.min(val, maxQuantity - data.quantity_completed));
                                                        }}
                                                        className="w-24 h-14 text-2xl font-bold text-center border rounded-md text-red-600"
                                                        min="0"
                                                        max={maxQuantity - data.quantity_completed}
                                                    />
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {order.unit_of_measure}
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-12 w-12"
                                                    onClick={() => adjustQuantity('quantity_scrapped', 1)}
                                                    disabled={data.quantity_scrapped >= (maxQuantity - data.quantity_completed)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Scrap reason */}
                                            <TextArea
                                                form={formAdapter}
                                                name="scrap_reason"
                                                label="Reason for scrap"
                                                placeholder="Describe why items were scrapped..."
                                                rows={3}
                                                required={data.quantity_scrapped > 0}
                                            />

                                            <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md">
                                                <p className="text-sm text-red-700 dark:text-red-300">
                                                    <strong>Note:</strong> Scrapped items will be permanently recorded and deducted from the total quantity.
                                                </p>
                                            </div>
                                        </TabsContent>
                                    </Tabs>



                                    {/* Submit button */}
                                    <Button
                                        variant="default"
                                        size="default"
                                        className="w-full h-12 text-base"
                                        onClick={handleReportProduction}
                                        disabled={processing || (data.quantity_completed === 0 && data.quantity_scrapped === 0) || (data.quantity_scrapped > 0 && !data.scrap_reason?.trim())}
                                    >
                                        Submit Report
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="!max-w-[95vw] sm:!max-w-[90vw] lg:!max-w-[85vw] w-[95vw] sm:w-[90vw] lg:w-[85vw] !h-[90vh] sm:!h-[85vh] p-0 gap-0 overflow-hidden">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Manufacturing Order Details</DialogTitle>
                        <DialogDescription>View and manage manufacturing order details and production progress</DialogDescription>
                    </DialogHeader>
                    <div className="p-4 sm:p-6 h-full">
                        {renderDialogContent()}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Completion Confirmation Dialog */}
            <MOCompletionDialog
                isOpen={showCompletionDialog}
                onOpenChange={setShowCompletionDialog}
                orderNumber={order?.order_number || ''}
                totalQuantity={order?.quantity || 0}
                unitOfMeasure={order?.unit_of_measure || ''}
                onConfirm={handleCompletionConfirm}
                onCancel={handleCompletionCancel}
            />
        </>
    );
}

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/number';
import { ItemImagePreview } from '@/components/production/ItemImagePreview';
import {
    Clock,
    Factory,
    AlertCircle,
    Edit2,
    AlertTriangle,
    Package
} from 'lucide-react';

interface TimeParameterData {
    id: number;
    order_number: string;
    item: {
        id: number;
        name: string;
        item_number: string;
    };
    quantity: number;
    status: string;
    has_route: boolean;
    time_parameter_status: 'valid' | 'partial' | 'missing';
    steps: Array<{
        id: number;
        name: string;
        work_cell_id: number | null;
        work_cell: {
            id: number;
            name: string;
        } | null;
        has_step_time: boolean;
        setup_time_minutes: number | null;
        cycle_time_minutes: number | null;
        use_workcell_throughput: boolean | null;
        has_work_cell_rate: boolean;
        work_cell_rate: {
            production_rate_per_hour?: number;
        } | null;
        effective_time_source: 'step' | 'work_cell' | null;
        effective_setup_time: number | null;
        effective_cycle_time: number | null;
        effective_total_time: number | null;
    }>;
    issues: Array<{
        type: string;
        step_id?: number;
        step_name?: string;
        message: string;
    }>;
    // Hierarchical properties
    parent_id?: number | null;
    children?: TimeParameterData[];
}

interface TimeParameterOrderCardProps {
    order: TimeParameterData;
    isSelected: boolean;
    showThumbnails?: boolean;
    onEditStep: (orderId: number, stepId: number, step: TimeParameterData['steps'][0]) => void;
    expanded?: boolean;
    onToggleExpand?: () => void;
    depth?: number;
}

export function TimeParameterOrderCard({
    order,
    isSelected,
    showThumbnails = true,
    onEditStep,
    expanded = false,
    onToggleExpand,
    depth: _depth = 0,
}: TimeParameterOrderCardProps) {
    // const getStatusIcon = (status: 'valid' | 'partial' | 'missing') => {
    //     switch (status) {
    //         case 'valid':
    //             return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    //         case 'partial':
    //             return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    //         case 'missing':
    //             return <AlertCircle className="w-4 h-4 text-red-500" />;
    //     }
    // };

    const getStatusBadge = (status: 'valid' | 'partial' | 'missing') => {
        switch (status) {
            case 'valid':
                return (
                    <Badge variant="default" className="bg-green-500 text-white">
                        All Configured
                    </Badge>
                );
            case 'partial':
                return (
                    <Badge variant="default" className="bg-yellow-500 text-white">
                        Partial
                    </Badge>
                );
            case 'missing':
                return (
                    <Badge variant="destructive">
                        Missing Times
                    </Badge>
                );
        }
    };

    const formatTime = (minutes: number | null) => {
        if (minutes === null) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const getTimeSourceIcon = (source: 'step' | 'work_cell' | null) => {
        if (source === 'step') {
            return <Clock className="w-3 h-3 text-blue-500" />;
        } else if (source === 'work_cell') {
            return <Factory className="w-3 h-3 text-purple-500" />;
        }
        return null;
    };

    return (
        <div
            className={cn(
                "w-full border rounded-lg transition-all",
                isSelected && "border-ring ring-ring/10 ring-[2px]",
                order.time_parameter_status === 'missing' && "border-red-200 dark:border-red-900",
                order.time_parameter_status === 'partial' && "border-yellow-200 dark:border-yellow-900"
            )}
        >
            {/* Order Header */}
            <div className="p-3 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    {showThumbnails && order.item && (
                        <div className="flex-shrink-0">
                            <ItemImagePreview
                                primaryImageUrl={order.item.primary_image_thumbnail_url || order.item.primary_image_url}
                                imageCount={order.item.media?.length || 0}
                                className="w-12 h-12"
                            />
                        </div>
                    )}

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-primary">
                                {order.order_number}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Qty: {formatNumber(order.quantity)}
                            </span>
                            {order.item && (
                                <Badge variant="outline" className="text-xs">
                                    {order.item.item_number}
                                </Badge>
                            )}
                        </div>
                        {order.item && (
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {order.item.name}
                            </div>
                        )}
                    </div>

                    {/* Status Badge and Expand Button */}
                    <div className="flex items-center gap-2">
                        {getStatusBadge(order.time_parameter_status)}
                        {onToggleExpand && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleExpand}
                                className="h-7 w-7 p-0"
                            >
                                <span className={cn(
                                    "text-xs transition-transform",
                                    expanded && "rotate-90"
                                )}>
                                    ▶
                                </span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Issues Summary */}
                {!expanded && order.issues.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                        {order.issues.filter(i => i.type !== 'using_default_time').length > 0 && (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <AlertCircle className="w-3 h-3" />
                                <span>{order.issues.filter(i => i.type !== 'using_default_time').length} error{order.issues.filter(i => i.type !== 'using_default_time').length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {order.issues.filter(i => i.type === 'using_default_time').length > 0 && (
                            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{order.issues.filter(i => i.type === 'using_default_time').length} warning{order.issues.filter(i => i.type === 'using_default_time').length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t px-3 py-3 space-y-3">
                    {!order.has_route ? (
                        <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            No manufacturing route defined
                        </div>
                    ) : (
                        <>
                            {/* Issues */}
                            {order.issues.length > 0 && (
                                <div className="space-y-2">
                                    {/* Separate errors and warnings */}
                                    {order.issues.filter(issue => issue.type !== 'using_default_time').length > 0 && (
                                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-3">
                                            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                Errors:
                                            </h4>
                                            <ul className="list-disc list-inside space-y-1">
                                                {order.issues
                                                    .filter(issue => issue.type !== 'using_default_time')
                                                    .map((issue, idx) => (
                                                        <li key={idx} className="text-sm text-red-700 dark:text-red-300">
                                                            {issue.message}
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>
                                    )}
                                    {order.issues.filter(issue => issue.type === 'using_default_time').length > 0 && (
                                        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md p-3">
                                            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Warnings:
                                            </h4>
                                            <ul className="list-disc list-inside space-y-1">
                                                {order.issues
                                                    .filter(issue => issue.type === 'using_default_time')
                                                    .map((issue, idx) => (
                                                        <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                                                            {issue.message}
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Steps */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Manufacturing Steps
                                </h4>
                                {order.steps.map((step) => (
                                    <div
                                        key={step.id}
                                        className={cn(
                                            "border rounded-md p-2 text-sm",
                                            !step.effective_time_source && "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{step.name}</span>
                                                {step.work_cell && (
                                                    <span className="text-xs text-muted-foreground">
                                                        ({step.work_cell.name})
                                                    </span>
                                                )}
                                                {step.effective_time_source && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                {getTimeSourceIcon(step.effective_time_source)}
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs">
                                                                    Using {step.effective_time_source === 'step' ? 'step-specific times' : 'work cell rate'}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onEditStep(order.id, step.id, step)}
                                                className="h-6 px-2"
                                            >
                                                <Edit2 className="w-3 h-3 mr-1" />
                                                Edit
                                            </Button>
                                        </div>

                                        {step.effective_time_source ? (
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>Setup: {formatTime(step.effective_setup_time)}</span>
                                                <span>Cycle: {formatTime(step.effective_cycle_time)}</span>
                                                <span className="font-medium">
                                                    Total: {formatTime(step.effective_total_time)}
                                                </span>
                                                {step.use_workcell_throughput && (
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-xs",
                                                            step.work_cell_rate?.is_default && "border-yellow-500 text-yellow-700 dark:text-yellow-400"
                                                        )}
                                                    >
                                                        <Factory className="w-3 h-3 mr-1" />
                                                        {step.work_cell_rate?.is_default ? 'Default Rate' : 'Work Cell Rate'}
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-red-600 dark:text-red-400">
                                                No time parameters configured
                                                {step.use_workcell_throughput && !step.has_work_cell_rate && (
                                                    <span className="ml-2">(Work cell rate not set)</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

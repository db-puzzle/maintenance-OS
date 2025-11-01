import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ImageZoom } from '@/components/ui/image-zoom';
import { ManufacturingStep, ManufacturingStepExecution, ManufacturingOrder, Item } from '@/types/production';
import { cn } from '@/lib/utils';
import {
    Clock,
    PlayCircle,
    PauseCircle,
    ClipboardCheck,
    Wrench,
    CheckCircle2,
    FlaskRound
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface StepExecutionCardProps {
    step: ManufacturingStep;
    order: ManufacturingOrder;
    execution?: ManufacturingStepExecution | null;
    canExecute: boolean;
    cannotExecuteReason?: string | null;
    onClick: () => void;
}

export function StepExecutionCard({
    step,
    order,
    execution,
    canExecute,
    cannotExecuteReason,
    onClick
}: StepExecutionCardProps) {
    // Get state colors based on step status
    const getStateColors = (status: string) => {
        switch (status) {
            case 'queued':
                return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700';
            case 'in_progress':
                return 'border-green-500 bg-green-50 dark:bg-green-950/30 dark:border-green-700';
            case 'on_hold':
                return 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700';
            case 'awaiting_quality':
                return 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-700';
            default:
                return '';
        }
    };

    // Get status icon based on step status
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'queued':
                return <Clock className="h-5 w-5" />;
            case 'in_progress':
                return <PlayCircle className="h-5 w-5" />;
            case 'on_hold':
                return <PauseCircle className="h-5 w-5" />;
            case 'awaiting_quality':
                return <ClipboardCheck className="h-5 w-5" />;
            default:
                return null;
        }
    };

    // Get step type icon
    const getStepTypeIcon = (type: string) => {
        switch (type) {
            case 'standard':
                return <Wrench className="h-4 w-4" />;
            case 'quality_check':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'rework':
                return <FlaskRound className="h-4 w-4" />;
            default:
                return null;
        }
    };

    const stateColors = getStateColors(step.status);
    const isOverdue = order.requested_date &&
        parseISO(order.requested_date) < new Date() &&
        !['completed', 'cancelled'].includes(order.status);

    // Get item image URL
    const getItemImageUrl = (item?: Item) => {
        if (!item) return null;
        return item.primary_image_url || item.primary_image_thumbnail_url || item.thumbnail_url;
    };

    const imageUrl = getItemImageUrl(order.item);

    return (
        <Card
            className={cn(
                "cursor-pointer hover:shadow-lg transition-all duration-200 border-2 relative",
                stateColors,
                isOverdue && "ring-2 ring-orange-500",
                !canExecute && "opacity-75"
            )}
            onClick={(e) => {
                // Prevent card click if clicking on the image
                if ((e.target as HTMLElement).closest('[data-image-zoom]')) return;
                onClick();
            }}
        >
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">{order.order_number}</h3>
                        <p className="text-sm text-muted-foreground">
                            Step {step.display_position || step.id}: {step.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusIcon(step.status)}
                        <Badge variant={step.status === 'in_progress' ? 'default' : 'outline'}>
                            {step.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                            {getStepTypeIcon(step.step_type)}
                            {step.step_type.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="flex gap-4">
                    {/* Item image with zoom capability */}
                    {imageUrl && (
                        <ImageZoom
                            src={imageUrl}
                            alt={order.item?.name || ''}
                            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                            data-image-zoom
                        />
                    )}

                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{order.item?.name}</p>
                        <p className="text-sm text-muted-foreground">
                            Quantity: {order.quantity} {order.unit_of_measure}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Work Cell: {step.work_cell?.name || 'Not assigned'}
                        </p>
                    </div>
                </div>

                {/* Progress bar for in-progress steps */}
                {step.status === 'in_progress' && execution && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{execution.progress_percentage || 0}%</span>
                        </div>
                        <Progress
                            value={execution.progress_percentage || 0}
                            className="h-2"
                        />
                    </div>
                )}

                {/* Quality check indicator */}
                {(step.status as string) === 'awaiting_quality' && (
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <ClipboardCheck className="h-4 w-4" />
                        <span className="text-sm font-medium">Quality check required</span>
                    </div>
                )}

                {/* Cannot execute reason */}
                {!canExecute && cannotExecuteReason && (
                    <p className="text-xs text-muted-foreground italic">
                        {cannotExecuteReason}
                    </p>
                )}

                {/* Order priority and due date */}
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Priority: {order.priority}</span>
                    {order.requested_date && (
                        <span className={cn(isOverdue && "text-orange-600 font-medium")}>
                            Due: {format(parseISO(order.requested_date), 'MMM d')}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

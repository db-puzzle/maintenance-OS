import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ManufacturingStep } from '@/types/production';
import { Clock, MapPin, CheckCircle, AlertCircle, Timer, Trash2 } from 'lucide-react';
import { StepStatusBadge } from './StepStatusBadge';
import { StepTypeBadge } from './StepTypeBadge';

interface StepCardProps {
    step: ManufacturingStep;
    onClick?: () => void;
    onDelete?: () => void;
    selected?: boolean;
    disabled?: boolean;
    showStatus?: boolean;
    showType?: boolean;
    showWorkCell?: boolean;
    showTime?: boolean;
    className?: string;
    canDelete?: boolean;
}

export function StepCard({
    step,
    onClick,
    onDelete,
    selected = false,
    disabled = false,
    showStatus = true,
    showType = true,
    showWorkCell = true,
    showTime = true,
    className,
    canDelete = false,
}: StepCardProps) {
    return (
        <Card
            className={cn(
                'relative p-4 transition-all duration-200 group w-2/3',
                onClick && !disabled && 'cursor-pointer hover:shadow-md',
                selected && 'ring-2 ring-primary',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            onClick={() => !disabled && onClick?.()}
        >
            {/* Step Number Badge */}
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {step.step_number}
            </div>

            {/* Delete Button */}
            {canDelete && onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-transparent flex items-center justify-center transition-colors duration-200 hover:text-destructive z-10"
                    title="Excluir etapa"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            )}

            <div className="space-y-3 pl-2">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm flex-1">{step.name}</h4>
                    {showStatus && <StepStatusBadge status={step.status} />}
                </div>

                {/* Type Badge */}
                {showType && step.step_type !== 'standard' && (
                    <StepTypeBadge type={step.step_type} />
                )}

                {/* Details */}
                <div className="space-y-2 text-sm text-muted-foreground">
                    {showWorkCell && step.work_cell && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{step.work_cell.name}</span>
                        </div>
                    )}

                    {showTime && (
                        <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>{step.cycle_time_minutes} min</span>
                            {step.setup_time_minutes > 0 && (
                                <span className="text-xs">(+{step.setup_time_minutes} min setup)</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Status Indicators */}
                {step.status === 'completed' && (
                    <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-green-500" />
                )}
                {step.status === 'in_progress' && (
                    <Timer className="absolute top-2 right-2 h-5 w-5 text-blue-500 animate-pulse" />
                )}
                {step.quality_result === 'failed' && (
                    <AlertCircle className="absolute top-2 right-2 h-5 w-5 text-destructive" />
                )}
            </div>
        </Card>
    );
} 
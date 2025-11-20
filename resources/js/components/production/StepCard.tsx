import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ManufacturingStep } from '@/types/production';
import { Clock, MapPin, CheckCircle, AlertCircle, Timer, Trash2, Truck, Building } from 'lucide-react';
import { StepStatusBadge } from './StepStatusBadge';
import { StepTypeBadge } from './StepTypeBadge';
import { ExternalStepBadge } from './external-step-badge';
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
    const isExternal = step.execution_location === 'external';
    
    return (
        <Card
            className={cn(
                'relative p-4 transition-all duration-200 group w-2/3',
                onClick && !disabled && 'cursor-pointer hover:shadow-md',
                selected && 'border-ring ring-ring/10 ring-[2px] bg-input-focus',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            onClick={() => !disabled && onClick?.()}
        >
            {/* Step Number Badge */}
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {step.display_position}
            </div>
            
            {/* Execution Location Icon Badge */}
            <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                {isExternal ? <Truck className="h-3.5 w-3.5" /> : <Building className="h-3.5 w-3.5" />}
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
                    <div className="flex items-center gap-2">
                    {showStatus && <StepStatusBadge status={step.status} />}
                        {step.execution_location === 'external' && step.external_status && (
                            <ExternalStepBadge status={step.external_status} />
                        )}
                    </div>
                </div>
                {/* Type Badge */}
                {showType && step.step_type !== 'standard' && (
                    <StepTypeBadge type={step.step_type} />
                )}
                {/* Details */}
                <div className="space-y-2 text-sm text-muted-foreground">
                    {/* Show work cell and time only for internal steps */}
                    {!isExternal && (
                        <>
                            {showWorkCell && step.work_cell && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3" />
                                    <span>{step.work_cell.name}</span>
                                </div>
                            )}
                            {showTime && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    {step.use_workcell_throughput ? (
                                        <span className="text-muted-foreground">Using work cell throughput</span>
                                    ) : (
                                        <>
                                            <span>{step.cycle_time_minutes} min</span>
                                            {step.setup_time_minutes > 0 && (
                                                <span className="text-xs">(+{step.setup_time_minutes} min setup)</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* External Step Information */}
                    {isExternal && (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                                <Truck className="h-3 w-3" />
                                <span className="font-medium">
                                    {step.manufacturer?.name || 'Fabricante não atribuído'}
                                </span>
                            </div>
                            {step.expected_lead_time_days && (
                                <div className="text-xs text-muted-foreground">
                                    Lead time: {step.expected_lead_time_days} dias
                                </div>
                            )}
                            {step.total_quantity_shipped !== undefined && step.total_quantity_shipped > 0 && (
                                <div className="text-xs">
                                    Enviado: {step.total_quantity_shipped} | Recebido: {step.total_quantity_received || 0}
                                </div>
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
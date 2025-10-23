import React from 'react';
import { ManufacturingStep, ManufacturingStepExecution } from '@/types/production';
import {
    CheckCircle,
    Play,
    AlertCircle,
    Clock,
    Timer,
    Zap,
    Activity,
    Pause,
    SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/number';
import { Badge } from '@/components/ui/badge';

interface StepWithStatus extends ManufacturingStep {
    can_start: boolean;
    dependency_info?: string;
    active_execution?: ManufacturingStepExecution;
}

interface StepCardProps {
    step: StepWithStatus;
    isActive: boolean;
    onClick: () => void;
}

export function StepCard({ step, isActive, onClick }: StepCardProps) {
    // Determine step status colors
    const getStepColors = () => {
        // Special case: pending but can start
        if (step.status === 'pending' && step.can_start) {
            return 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800';
        }

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
            case 'queued':
                return 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800';
            default: // pending
                return 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800';
        }
    };

    // Determine step icon
    const getStepIcon = () => {
        // Special case: pending but can start
        if (step.status === 'pending' && step.can_start) {
            return <Play className="w-5 h-5 text-purple-600" />;
        }

        switch (step.status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'in_progress':
                return <Activity className="w-5 h-5 text-blue-600 animate-pulse" />;
            case 'on_hold':
                return <Pause className="w-5 h-5 text-orange-600" />;
            case 'failed':
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'skipped':
                return <SkipForward className="w-5 h-5 text-gray-400" />;
            case 'queued':
                return <Play className="w-5 h-5 text-purple-600" />;
            default:
                return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStepTypeBadge = () => {
        switch (step.step_type) {
            case 'quality_check':
                return <Badge variant="secondary" className="text-xs">Quality Check</Badge>;
            case 'rework':
                return <Badge variant="secondary" className="text-xs">Rework</Badge>;
            default:
                return null;
        }
    };

    const progressPercentage = step.manufacturing_route?.manufacturing_order?.quantity
        ? ((step.cumulative_quantity_completed || 0) / step.manufacturing_route.manufacturing_order.quantity) * 100
        : 0;

    return (
        <div
            className={cn(
                'p-4 rounded-lg border-2 cursor-pointer transition-all',
                getStepColors(),
                isActive && 'ring-2 ring-primary ring-offset-2',
                'hover:shadow-md'
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                            Step {step.step_number}
                        </span>
                        {getStepTypeBadge()}
                        {step.active_execution && (
                            <Badge variant="outline" className="text-xs">
                                Active
                            </Badge>
                        )}
                    </div>

                    <h5 className="font-medium text-sm mb-1">{step.name}</h5>

                    {step.work_cell && (
                        <p className="text-xs text-muted-foreground mb-2">
                            {step.work_cell.name}
                        </p>
                    )}

                    {/* Progress bar for steps with progress */}
                    {['in_progress', 'completed'].includes(step.status) && progressPercentage > 0 && (
                        <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                    className="bg-current h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatNumber(step.cumulative_quantity_completed || 0)} units
                            </p>
                        </div>
                    )}

                    {/* Dependency info */}
                    {step.dependency_info && step.status === 'pending' && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                            {step.dependency_info}
                        </p>
                    )}

                    {/* Timing information */}
                    {!step.use_workcell_throughput && (step.setup_time_seconds > 0 || step.cycle_time_seconds > 0) && (
                        <div className="mt-2 flex gap-2">
                            {step.setup_time_seconds > 0 && (
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                        {formatNumber(step.setup_time_seconds / 60)}m
                                    </span>
                                </div>
                            )}
                            {step.cycle_time_seconds > 0 && (
                                <div className="flex items-center gap-1">
                                    <Timer className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                        {formatNumber(step.cycle_time_seconds / 60)}m
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {step.use_workcell_throughput && (
                        <div className="mt-2 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-purple-600" />
                            <span className="text-xs text-purple-600">Throughput</span>
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0">
                    {getStepIcon()}
                </div>
            </div>
        </div>
    );
}

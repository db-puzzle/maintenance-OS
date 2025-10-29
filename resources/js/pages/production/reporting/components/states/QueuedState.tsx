import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, SkipForward, ArrowUpDown, FileText } from 'lucide-react';
import { StepStateInfo, StateTransitionAction } from '@/types/production-states';
import { formatNumber } from '@/utils/number';

interface QueuedStateProps {
    stateInfo: StepStateInfo;
    stepName?: string;
    stepDescription?: string;
    workCell?: string;
    estimatedDuration?: number;
    queuePosition?: number;
    onAction: (action: StateTransitionAction) => void;
}

export function QueuedState({
    stateInfo: _stateInfo,
    stepName,
    stepDescription,
    workCell,
    estimatedDuration,
    queuePosition,
    onAction,
}: QueuedStateProps) {
    // Map custom variants to button variants
    const getButtonVariant = (variant: StateTransitionAction['variant']) => {
        switch (variant) {
            case 'success': return 'default';
            case 'warning': return 'warning';
            default: return variant;
        }
    };
    const actions: StateTransitionAction[] = [
        {
            action: 'start_execution',
            label: 'Start Step Execution',
            icon: 'Play',
            variant: 'default',
        },
        {
            action: 'skip_step',
            label: 'Skip This Step',
            icon: 'SkipForward',
            variant: 'outline',
            requiresPermission: 'skip_steps',
            requiresReason: true,
            confirmMessage: 'Are you sure you want to skip this step? This action may affect subsequent steps.',
        },
        {
            action: 'change_priority',
            label: 'Change Queue Priority',
            icon: 'ArrowUpDown',
            variant: 'ghost',
            requiresPermission: 'manage_queue_priority',
        },
        {
            action: 'view_instructions',
            label: 'View Work Instructions',
            icon: 'FileText',
            variant: 'ghost',
        },
    ];

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                <Play className="h-16 w-16 text-blue-500 mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Ready to Start</h3>

                {stepName && (
                    <Card className="p-6 w-full max-w-md mb-6">
                        <h4 className="text-lg font-semibold mb-2">{stepName}</h4>
                        {stepDescription && (
                            <p className="text-sm text-muted-foreground mb-4">{stepDescription}</p>
                        )}
                        <div className="space-y-2">
                            {workCell && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Work Cell</span>
                                    <span className="text-sm font-medium">{workCell}</span>
                                </div>
                            )}
                            {estimatedDuration && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Estimated Duration</span>
                                    <span className="text-sm font-medium">
                                        {formatNumber(estimatedDuration)} min
                                    </span>
                                </div>
                            )}
                            {queuePosition !== undefined && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Queue Position</span>
                                    <span className="text-sm font-medium">#{queuePosition}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-2 mt-6">
                <Button
                    className="w-full h-12 text-base font-semibold gap-2"
                    variant={getButtonVariant(actions[0].variant)}
                    onClick={() => onAction(actions[0])}
                >
                    <Play className="h-5 w-5" />
                    {actions[0].label}
                </Button>
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        variant={getButtonVariant(actions[1].variant)}
                        onClick={() => onAction(actions[1])}
                        className="gap-1"
                        size="sm"
                    >
                        <SkipForward className="h-4 w-4" />
                        Skip
                    </Button>
                    <Button
                        variant={getButtonVariant(actions[2].variant)}
                        onClick={() => onAction(actions[2])}
                        className="gap-1"
                        size="sm"
                    >
                        <ArrowUpDown className="h-4 w-4" />
                        Priority
                    </Button>
                    <Button
                        variant={getButtonVariant(actions[3].variant)}
                        onClick={() => onAction(actions[3])}
                        className="gap-1"
                        size="sm"
                    >
                        <FileText className="h-4 w-4" />
                        Instructions
                    </Button>
                </div>
            </div>
        </div>
    );
}

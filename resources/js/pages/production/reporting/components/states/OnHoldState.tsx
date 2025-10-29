import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pause, Play, XCircle, Edit, History } from 'lucide-react';
import { StepStateInfo, StateTransitionAction } from '@/types/production-states';

interface OnHoldStateProps {
    stateInfo: StepStateInfo;
    onAction: (action: StateTransitionAction) => void;
}

export function OnHoldState({ stateInfo, onAction }: OnHoldStateProps) {
    // Map custom variants to button variants
    const getButtonVariant = (variant: StateTransitionAction['variant']) => {
        switch (variant) {
            case 'success': return 'default';
            case 'warning': return 'warning';
            default: return variant;
        }
    };
    const [duration, setDuration] = useState(stateInfo.holdInfo?.duration || 0);

    useEffect(() => {
        const interval = setInterval(() => {
            setDuration((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const actions: StateTransitionAction[] = [
        {
            action: 'resume',
            label: 'Resume Step',
            icon: 'Play',
            variant: 'default',
        },
        {
            action: 'cancel',
            label: 'Cancel This Step',
            icon: 'XCircle',
            variant: 'destructive',
            requiresPermission: 'cancel_steps',
            confirmMessage: 'Are you sure you want to cancel this step? This will also affect any dependent steps.',
        },
        {
            action: 'change_hold_reason',
            label: 'Update Hold Reason',
            icon: 'Edit',
            variant: 'outline',
            requiresReason: true,
        },
        {
            action: 'view_hold_history',
            label: 'Hold History',
            icon: 'History',
            variant: 'ghost',
        },
    ];

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                <Pause className="h-16 w-16 text-orange-500 mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Step On Hold</h3>

                {stateInfo.holdInfo && (
                    <Card className="p-6 w-full max-w-md">
                        <div className="space-y-4">
                            {/* Hold Reason */}
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                                    Hold Reason
                                </h4>
                                <p className="text-base">{stateInfo.holdInfo.reason}</p>
                            </div>

                            {/* Duration */}
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                                    Hold Duration
                                </h4>
                                <p className="text-2xl font-mono font-semibold text-orange-600">
                                    {formatDuration(duration)}
                                </p>
                            </div>

                            {/* Previous State */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Previous State</span>
                                <span className="text-sm font-medium capitalize">
                                    {stateInfo.holdInfo.previousState.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Held By */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Held By</span>
                                <span className="text-sm font-medium">{stateInfo.holdInfo.heldBy.name}</span>
                            </div>

                            {/* Held At */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Held At</span>
                                <span className="text-sm font-medium">
                                    {new Date(stateInfo.holdInfo.heldAt).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-2 mt-6">
                <Button
                    className="w-full h-12 text-base font-semibold gap-2"
                    onClick={() => onAction(actions[0])}
                >
                    <Play className="h-5 w-5" />
                    {actions[0].label}
                </Button>
                <Button
                    className="w-full gap-2"
                    variant={getButtonVariant(actions[1].variant)}
                    onClick={() => onAction(actions[1])}
                >
                    <XCircle className="h-4 w-4" />
                    {actions[1].label}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={getButtonVariant(actions[2].variant)}
                        onClick={() => onAction(actions[2])}
                        className="gap-2"
                        size="sm"
                    >
                        <Edit className="h-4 w-4" />
                        {actions[2].label}
                    </Button>
                    <Button
                        variant={getButtonVariant(actions[3].variant)}
                        onClick={() => onAction(actions[3])}
                        className="gap-2"
                        size="sm"
                    >
                        <History className="h-4 w-4" />
                        {actions[3].label}
                    </Button>
                </div>
            </div>
        </div>
    );
}

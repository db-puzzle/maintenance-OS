import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SkipForward, Undo, FileText } from 'lucide-react';
import { StepStateInfo, StateTransitionAction } from '@/types/production-states';

interface SkippedStateProps {
    stateInfo: StepStateInfo;
    onAction: (action: StateTransitionAction) => void;
}

export function SkippedState({ stateInfo, onAction }: SkippedStateProps) {
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
            action: 'revert_skip',
            label: 'Revert Skip Decision',
            icon: 'Undo',
            variant: 'warning',
            requiresPermission: 'revert_skip',
            confirmMessage: 'Are you sure you want to revert this skip decision? The step will return to queued state.',
        },
        {
            action: 'view_justification',
            label: 'View Full Justification',
            icon: 'FileText',
            variant: 'outline',
        },
    ];

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                <SkipForward className="h-16 w-16 text-gray-500 mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Step Skipped</h3>

                {stateInfo.skipInfo && (
                    <Card className="p-6 w-full max-w-md">
                        <div className="space-y-4">
                            {/* Skip Reason */}
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                                    Skip Reason
                                </h4>
                                <p className="text-base">{stateInfo.skipInfo.reason}</p>
                            </div>

                            {/* Skip Details */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Skipped by</span>
                                    <span className="text-sm font-medium">
                                        {stateInfo.skipInfo.skippedBy.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Skipped at</span>
                                    <span className="text-sm font-medium">
                                        {new Date(stateInfo.skipInfo.skippedAt).toLocaleString()}
                                    </span>
                                </div>
                                {stateInfo.skipInfo.authorizedBy && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Authorized by</span>
                                        <span className="text-sm font-medium">
                                            {stateInfo.skipInfo.authorizedBy.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-2 mt-6">
                <Button
                    className="w-full gap-2"
                    variant={getButtonVariant(actions[0].variant)}
                    onClick={() => onAction(actions[0])}
                >
                    <Undo className="h-4 w-4" />
                    {actions[0].label}
                </Button>
                <Button
                    className="w-full gap-2"
                    variant={getButtonVariant(actions[1].variant)}
                    onClick={() => onAction(actions[1])}
                >
                    <FileText className="h-4 w-4" />
                    {actions[1].label}
                </Button>
            </div>
        </div>
    );
}

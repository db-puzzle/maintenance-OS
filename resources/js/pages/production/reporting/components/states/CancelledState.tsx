import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { XCircle, Info, Download } from 'lucide-react';
import { StepStateInfo, StateTransitionAction } from '@/types/production-states';

interface CancelledStateProps {
    stateInfo: StepStateInfo;
    onAction: (action: StateTransitionAction) => void;
}

export function CancelledState({ stateInfo, onAction }: CancelledStateProps) {
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
            action: 'view_details',
            label: 'View Details',
            icon: 'Info',
            variant: 'outline',
        },
        {
            action: 'export_report',
            label: 'Export Report',
            icon: 'Download',
            variant: 'ghost',
        },
    ];

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                <XCircle className="h-16 w-16 text-red-500 mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Step Cancelled</h3>

                {stateInfo.cancellationInfo && (
                    <Card className="p-6 w-full max-w-md">
                        <div className="space-y-4">
                            {/* Cancellation Reason */}
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                                    Cancellation Reason
                                </h4>
                                <p className="text-base">{stateInfo.cancellationInfo.reason}</p>
                            </div>

                            {/* Cancellation Details */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Cancelled by</span>
                                    <span className="text-sm font-medium">
                                        {stateInfo.cancellationInfo.cancelledBy.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Cancelled at</span>
                                    <span className="text-sm font-medium">
                                        {new Date(stateInfo.cancellationInfo.cancelledAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Affected Steps */}
                            {stateInfo.cancellationInfo.affectedSteps.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                                        Affected Dependent Steps
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {stateInfo.cancellationInfo.affectedSteps.map((step, index) => (
                                            <li key={index} className="text-sm text-muted-foreground">
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 mt-6">
                <Button
                    variant={getButtonVariant(actions[0].variant)}
                    onClick={() => onAction(actions[0])}
                    className="gap-2"
                >
                    <Info className="h-4 w-4" />
                    {actions[0].label}
                </Button>
                <Button
                    variant={getButtonVariant(actions[1].variant)}
                    onClick={() => onAction(actions[1])}
                    className="gap-2"
                >
                    <Download className="h-4 w-4" />
                    {actions[1].label}
                </Button>
            </div>
        </div>
    );
}

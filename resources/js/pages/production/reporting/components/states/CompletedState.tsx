import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, FileText, Image, Printer, ArrowRight } from 'lucide-react';
import { StepStateInfo, StateTransitionAction } from '@/types/production-states';
import { formatNumber } from '@/utils/number';
import { cn } from '@/lib/utils';

interface CompletedStateProps {
    stateInfo: StepStateInfo;
    hasNextStep?: boolean;
    onAction: (action: StateTransitionAction) => void;
}

export function CompletedState({ stateInfo, hasNextStep = false, onAction }: CompletedStateProps) {
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
            label: 'View Full Report',
            icon: 'FileText',
            variant: 'default',
        },
        {
            action: 'view_photos',
            label: 'View Photos Taken',
            icon: 'Image',
            variant: 'outline',
        },
        {
            action: 'print_report',
            label: 'Print Report',
            icon: 'Printer',
            variant: 'outline',
        },
        {
            action: 'next_step',
            label: 'Go to Next Step',
            icon: 'ArrowRight',
            variant: 'ghost',
            enabled: hasNextStep,
        },
    ];

    const efficiencyColor = (efficiency: number) => {
        if (efficiency >= 95) return 'text-green-600';
        if (efficiency >= 80) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Step Completed</h3>

                {stateInfo.completionInfo && (
                    <Card className="p-6 w-full max-w-md">
                        <div className="space-y-4">
                            {/* Production Summary */}
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Produced</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatNumber(stateInfo.completionInfo.quantityProduced)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Scrapped</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {formatNumber(stateInfo.completionInfo.quantityScraped)}
                                    </p>
                                </div>
                            </div>

                            {/* Time and Efficiency */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Actual Duration</span>
                                    <span className="text-sm font-medium">
                                        {Math.round(stateInfo.completionInfo.actualDuration / 60)} min
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Estimated Duration</span>
                                    <span className="text-sm font-medium">
                                        {Math.round(stateInfo.completionInfo.estimatedDuration / 60)} min
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Efficiency</span>
                                    <span
                                        className={cn(
                                            'text-sm font-bold',
                                            efficiencyColor(stateInfo.completionInfo.efficiency)
                                        )}
                                    >
                                        {stateInfo.completionInfo.efficiency}%
                                    </span>
                                </div>
                            </div>

                            {/* Completion Info */}
                            <div className="pt-2 border-t">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Completed by</span>
                                    <span className="text-sm font-medium">
                                        {stateInfo.completionInfo.completedBy.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-sm text-muted-foreground">Completed at</span>
                                    <span className="text-sm font-medium">
                                        {new Date(stateInfo.completionInfo.completedAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>
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
                    <FileText className="h-5 w-5" />
                    {actions[0].label}
                </Button>
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        variant={getButtonVariant(actions[1].variant)}
                        onClick={() => onAction(actions[1])}
                        className="gap-1"
                        size="sm"
                    >
                        <Image className="h-4 w-4" />
                        Photos
                    </Button>
                    <Button
                        variant={getButtonVariant(actions[2].variant)}
                        onClick={() => onAction(actions[2])}
                        className="gap-1"
                        size="sm"
                    >
                        <Printer className="h-4 w-4" />
                        Print
                    </Button>
                    <Button
                        variant={getButtonVariant(actions[3].variant)}
                        onClick={() => onAction(actions[3])}
                        className="gap-1"
                        size="sm"
                        disabled={!actions[3].enabled}
                    >
                        Next
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Clipboard, CheckCircle, XCircle, RotateCw,
    PieChart, Pause, Paperclip, UserCheck
} from 'lucide-react';
import { StepStateInfo, StateTransitionAction } from '@/types/production-states';
import { formatNumber } from '@/utils/number';

interface AwaitingQualityStateProps {
    stateInfo: StepStateInfo;
    quantityCompleted?: number;
    onAction: (action: StateTransitionAction) => void;
}

export function AwaitingQualityState({
    stateInfo,
    quantityCompleted = 0,
    onAction
}: AwaitingQualityStateProps) {
    // Map custom variants to button variants
    const getButtonVariant = (variant: StateTransitionAction['variant']) => {
        switch (variant) {
            case 'success': return 'default';
            case 'warning': return 'warning';
            default: return variant;
        }
    };
    const mainActions: StateTransitionAction[] = [
        {
            action: 'quality_pass',
            label: 'Pass Quality Check',
            icon: 'CheckCircle',
            variant: 'success',
            confirmMessage: 'Confirm that all items have passed quality inspection?',
        },
        {
            action: 'quality_fail_scrap',
            label: 'Fail - Scrap All',
            icon: 'Trash2',
            variant: 'destructive',
            requiresReason: true,
            confirmMessage: 'This will mark all items as scrap. Are you sure?',
        },
        {
            action: 'quality_fail_rework',
            label: 'Fail - Rework Required',
            icon: 'RotateCw',
            variant: 'warning',
            requiresReason: true,
            confirmMessage: 'This will create a rework step. Continue?',
        },
    ];

    const secondaryActions: StateTransitionAction[] = [
        {
            action: 'partial_pass',
            label: 'Record Partial Results',
            icon: 'PieChart',
            variant: 'outline',
            enabled: true, // Could be based on settings
        },
        {
            action: 'put_on_hold',
            label: 'Hold Quality Check',
            icon: 'Pause',
            variant: 'outline',
            requiresReason: true,
        },
        {
            action: 'attach_report',
            label: 'Attach Report',
            icon: 'Paperclip',
            variant: 'ghost',
        },
        {
            action: 'request_reinspection',
            label: 'Request Different Inspector',
            icon: 'UserCheck',
            variant: 'ghost',
            requiresReason: true,
        },
    ];

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                <Clipboard className="h-16 w-16 text-purple-500 mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Awaiting Quality Check</h3>

                <Card className="p-6 w-full max-w-md mb-6">
                    <div className="space-y-4">
                        {/* Quantity Info */}
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Quantity to Inspect</p>
                            <p className="text-3xl font-bold">{formatNumber(quantityCompleted)}</p>
                        </div>

                        {/* Quality Requirements */}
                        {stateInfo.qualityRequirements && (
                            <>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">Quality Requirements</h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {stateInfo.qualityRequirements.specifications.map((spec, index) => (
                                            <li key={index} className="text-sm text-muted-foreground">
                                                {spec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Quality Form Link */}
                                {stateInfo.qualityRequirements.formRequired && (
                                    <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-md">
                                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                            Quality form required
                                        </p>
                                        {stateInfo.qualityRequirements.formUrl && (
                                            <a
                                                href={stateInfo.qualityRequirements.formUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-purple-600 hover:underline"
                                            >
                                                Open Quality Form →
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Inspector Assignment */}
                                {stateInfo.qualityRequirements.inspectorAssigned && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Inspector</span>
                                        <span className="text-sm font-medium">
                                            {stateInfo.qualityRequirements.inspectorAssigned.name}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Actions */}
            <div className="space-y-3 mt-6">
                {/* Main Quality Actions */}
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        className="h-12 flex flex-col items-center justify-center gap-1"
                        variant="default"
                        onClick={() => onAction(mainActions[0])}
                    >
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-xs">Pass</span>
                    </Button>
                    <Button
                        className="h-12 flex flex-col items-center justify-center gap-1"
                        variant="destructive"
                        onClick={() => onAction(mainActions[1])}
                    >
                        <XCircle className="h-5 w-5" />
                        <span className="text-xs">Fail-Scrap</span>
                    </Button>
                    <Button
                        className="h-12 flex flex-col items-center justify-center gap-1"
                        variant="outline"
                        onClick={() => onAction(mainActions[2])}
                    >
                        <RotateCw className="h-5 w-5" />
                        <span className="text-xs">Fail-Rework</span>
                    </Button>
                </div>

                {/* Partial Pass (if enabled) */}
                {secondaryActions[0].enabled && (
                    <Button
                        className="w-full"
                        variant={getButtonVariant(secondaryActions[0].variant)}
                        onClick={() => onAction(secondaryActions[0])}
                    >
                        <PieChart className="h-4 w-4 mr-2" />
                        {secondaryActions[0].label}
                    </Button>
                )}

                {/* Other Secondary Actions */}
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAction(secondaryActions[1])}
                        className="gap-1"
                    >
                        <Pause className="h-4 w-4" />
                        Hold
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAction(secondaryActions[2])}
                        className="gap-1"
                    >
                        <Paperclip className="h-4 w-4" />
                        Attach
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAction(secondaryActions[3])}
                        className="gap-1"
                    >
                        <UserCheck className="h-4 w-4" />
                        Re-inspect
                    </Button>
                </div>
            </div>
        </div>
    );
}

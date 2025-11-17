import React from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { StepStateInfo } from '@/types/production-states';
import { ManufacturingStep, ManufacturingStepExecution, ManufacturingOrder } from '@/types/production';
import {
    PendingState,
    QueuedState,
    OnHoldState,
    AwaitingQualityState,
    CompletedState,
    SkippedState,
    CancelledState
} from '../states';
import { MOStepProductionActions } from './MOStepProductionActions';
import { MOStepActionButtons } from './MOStepActionButtons';
import { UseMOStepQuantityReportingReturn } from '../hooks/useMOStepQuantityReporting';
import { UseMOStepPhotoManagementReturn } from '../hooks/useMOStepPhotoManagement';
import { UseMOStepStateTransitionsReturn } from '../hooks/useMOStepStateTransitions';

interface MOStepStateContentProps {
    stepStateInfo: StepStateInfo | null;
    currentStep: ManufacturingStep | null;
    activeExecution: ManufacturingStepExecution | null;
    order: ManufacturingOrder;
    quantityReporting: UseMOStepQuantityReportingReturn;
    photoManagement: UseMOStepPhotoManagementReturn;
    stateTransitions: UseMOStepStateTransitionsReturn;
}

export function MOStepStateContent({
    stepStateInfo,
    currentStep,
    activeExecution,
    order,
    quantityReporting,
    photoManagement,
    stateTransitions
}: MOStepStateContentProps) {
    // Render in-progress state content
    const renderInProgressState = () => {
        // If we don't have a valid execution, show a message
        if (!activeExecution || !activeExecution.id || activeExecution.id === 0) {
            return (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Loading Execution Data</h3>
                        <p className="text-muted-foreground">
                            Please wait while we load the execution data for this step...
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="relative flex-1 flex flex-col">
                <div className="flex-1 flex flex-col space-y-6">
                    <MOStepProductionActions
                        order={order}
                        currentStep={currentStep!}
                        activeExecution={activeExecution}
                        quantityReporting={quantityReporting}
                    />

                    {/* Spacer to push action buttons to bottom */}
                    <div className="flex-1" />

                    {/* Action Buttons */}
                    <MOStepActionButtons
                        onPrintLabels={() => stateTransitions.labelDialog.onOpenChange(true)}
                        onTakePhoto={() => photoManagement.captureDialog.open()}
                        onPutOnHold={() => stateTransitions.handleStateAction({
                            action: 'put_on_hold',
                            label: 'Put On Hold',
                            icon: 'Pause',
                            variant: 'outline',
                            requiresReason: true,
                        })}
                        onReportIssue={() => {
                            // TODO: Implement report issue
                            console.log('Report issue clicked');
                        }}
                        photoLimitReached={photoManagement.photos.length >= 3}
                        disabled={quantityReporting.isReporting}
                    />
                </div>

                {/* Loading overlay when reporting quantities */}
                {quantityReporting.isReporting && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-sm font-medium">Updating quantities...</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!stepStateInfo) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Step</h3>
                    <p className="text-muted-foreground">
                        This manufacturing order doesn't have any steps to execute.
                    </p>
                </div>
            </div>
        );
    }

    const content = (() => {
        switch (stepStateInfo.state) {
            case 'pending':
                return <PendingState stateInfo={stepStateInfo} onAction={stateTransitions.handleStateAction} />;

            case 'queued':
                return (
                    <QueuedState
                        stateInfo={stepStateInfo}
                        stepName={currentStep?.name}
                        stepDescription={currentStep?.description}
                        workCell={currentStep?.work_cell?.name}
                        estimatedDuration={(currentStep?.setup_time_minutes || 0) + (currentStep?.cycle_time_minutes || 0)}
                        queuePosition={undefined} // TODO: Add queue_position to interface
                        onAction={stateTransitions.handleStateAction}
                    />
                );

            case 'in_progress':
                return renderInProgressState();

            case 'on_hold':
                return <OnHoldState stateInfo={stepStateInfo} onAction={stateTransitions.handleStateAction} />;

            case 'awaiting_quality':
                return (
                    <AwaitingQualityState
                        stateInfo={stepStateInfo}
                        quantityCompleted={currentStep?.cumulative_quantity_completed}
                        onAction={stateTransitions.handleStateAction}
                    />
                );

            case 'completed':
                return (
                    <CompletedState
                        stateInfo={stepStateInfo}
                        hasNextStep={!!currentStep?.next_step}
                        onAction={stateTransitions.handleStateAction}
                    />
                );

            case 'skipped':
                return <SkippedState stateInfo={stepStateInfo} onAction={stateTransitions.handleStateAction} />;

            case 'cancelled':
                return <CancelledState stateInfo={stepStateInfo} onAction={stateTransitions.handleStateAction} />;

            default:
                return (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-muted-foreground">Unknown state: {stepStateInfo.state}</p>
                    </div>
                );
        }
    })();

    // Add loading overlay during transitions
    return (
        <div className="relative flex-1">
            {content}
            {stateTransitions.transitionLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">Updating...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

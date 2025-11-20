import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ManufacturingOrder, ManufacturingStepExecution } from '@/types/production';
import { StateTransitionAction } from '@/types/production-states';
import { UseMOStepDataReturn } from './useMOStepData';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface UseMOStepStateTransitionsParams {
    stepData: UseMOStepDataReturn;
    order: ManufacturingOrder | null;
    onStateChanged?: () => void;
}

export interface UseMOStepStateTransitionsReturn {
    transitionLoading: boolean;
    handleStateAction: (action: StateTransitionAction) => void;
    reasonDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        pendingAction: StateTransitionAction | null;
        reason: string;
        onReasonChange: (reason: string) => void;
        onConfirm: () => void;
    };
    labelDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        order?: ManufacturingOrder;
    };
}

export function useMOStepStateTransitions({
    stepData,
    order,
    onStateChanged
}: UseMOStepStateTransitionsParams): UseMOStepStateTransitionsReturn {
    const [transitionLoading, setTransitionLoading] = useState(false);
    const [showReasonDialog, setShowReasonDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<StateTransitionAction | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [showLabels, setShowLabels] = useState(false);

    const {
        currentStep,
        activeExecution,
        setCurrentStep,
        setActiveExecution,
        setStepStateInfo,
        initializeDialog
    } = stepData;

    // Handle state action requests
    const handleStateAction = (action: StateTransitionAction) => {
        // Check if action requires a reason
        if (action.requiresReason) {
            setPendingAction(action);
            setShowReasonDialog(true);
            return;
        }

        // Show confirmation if needed
        if (action.confirmMessage && !confirm(action.confirmMessage)) {
            return;
        }

        // Execute the action
        executeStateTransition(action);
    };

    // Execute state transition
    const executeStateTransition = (action: StateTransitionAction, reason?: string) => {
        if (!currentStep) {
            return;
        }

        setTransitionLoading(true);

        // Handle specific actions
        switch (action.action) {
            case 'start_execution':
                startExecution();
                break;

            case 'force_start':
                forceStartExecution();
                break;

            case 'skip_step':
                skipStep(reason || 'Skipped by operator');
                break;

            case 'put_on_hold':
                putOnHold(reason || 'Put on hold by operator');
                break;

            case 'resume':
                resumeExecution();
                break;

            case 'quality_pass':
                recordQualityResult('passed');
                break;

            case 'quality_fail_scrap':
                recordQualityResult('failed', 'scrap', reason);
                break;

            case 'quality_fail_rework':
                recordQualityResult('failed', 'rework', reason);
                break;

            default:
                // Action not implemented yet
                setTransitionLoading(false);
        }

        // Clear dialog states
        setShowReasonDialog(false);
        setPendingAction(null);
        setActionReason('');
    };

    // Start execution
    const startExecution = () => {
        if (!currentStep || !order) {
            return;
        }

        router.post(route('production.reporting.steps.start'), {
            manufacturing_order_id: order.id,
            manufacturing_step_id: currentStep.id,
        }, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: (page) => {
                // Check if we got execution data in the response
                const pageProps = page.props as { execution?: ManufacturingStepExecution; flash?: unknown };

                if (pageProps.execution) {
                    // Update local state optimistically
                    setActiveExecution(pageProps.execution);

                    // Update step status locally
                    if (currentStep) {
                        setCurrentStep({
                            ...currentStep,
                            status: 'in_progress'
                        });
                    }

                    // Update state info to in_progress
                    setStepStateInfo({
                        state: 'in_progress',
                        canStart: false,
                        cannotStartReason: undefined
                    });
                }

                setTransitionLoading(false);

                // Notify parent to refresh (it will update our order prop)
                if (onStateChanged) {
                    onStateChanged();
                }
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    // Force start execution
    const forceStartExecution = () => {
        if (!currentStep || !order) return;

        router.post(route('production.reporting.steps.force-start'), {
            manufacturing_order_id: order.id,
            manufacturing_step_id: currentStep.id,
        }, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: () => {
                setTransitionLoading(false);
                // Let parent handle the refresh - no double refresh
                if (onStateChanged) {
                    onStateChanged();
                }
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    // Skip step
    const skipStep = (reason: string) => {
        if (!currentStep) return;

        router.post(route('production.reporting.steps.skip', { step: currentStep.id }), {
            reason,
        }, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: () => {
                setTransitionLoading(false);
                // Let parent handle the refresh - no double refresh
                if (onStateChanged) {
                    onStateChanged();
                }
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    // Put on hold
    const putOnHold = (reason: string) => {
        if (!activeExecution) return;

        router.post(route('production.reporting.steps.hold', { step: currentStep!.id }), {
            execution_id: activeExecution.id,
            reason,
        }, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: () => {
                setTransitionLoading(false);
                // Let parent handle the refresh - no double refresh
                if (onStateChanged) {
                    onStateChanged();
                }
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    // Resume execution
    const resumeExecution = () => {
        if (!currentStep) return;

        router.post(route('production.reporting.steps.resume', { step: currentStep.id }), {}, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: () => {
                setTransitionLoading(false);
                // Let parent handle the refresh - no double refresh
                if (onStateChanged) {
                    onStateChanged();
                }
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    // Record quality result
    const recordQualityResult = (result: 'passed' | 'failed', action?: 'scrap' | 'rework', reason?: string) => {
        if (!activeExecution) return;

        router.post(route('production.reporting.steps.quality-result', { step: currentStep!.id }), {
            execution_id: activeExecution.id,
            result,
            action,
            reason,
        }, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: () => {
                setTransitionLoading(false);
                // Let parent handle the refresh - no double refresh
                if (onStateChanged) {
                    onStateChanged();
                }
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    // Confirm reason dialog
    const confirmReasonDialog = () => {
        if (pendingAction && actionReason.trim()) {
            executeStateTransition(pendingAction, actionReason);
        }
    };

    return {
        transitionLoading,
        handleStateAction,
        reasonDialog: {
            isOpen: showReasonDialog,
            onOpenChange: setShowReasonDialog,
            pendingAction,
            reason: actionReason,
            onReasonChange: setActionReason,
            onConfirm: confirmReasonDialog
        },
        labelDialog: {
            isOpen: showLabels,
            onOpenChange: setShowLabels,
            order: order || undefined
        }
    };
}

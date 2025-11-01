import React, { useState, useEffect } from 'react';
import { ManufacturingOrder, ManufacturingStep, ManufacturingStepExecution } from '@/types/production';
import { Media } from '@/types/media';
import { useForm, router } from '@inertiajs/react';
import { formatNumber } from '@/utils/number';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Camera, Printer, Pause, AlertCircle,
    Package, CheckCircle, XCircle
} from 'lucide-react';
import { StepPhotoCapture } from './StepPhotoCapture';
import { StepPhotoViewer } from './StepPhotoViewer';
import { cn } from '@/lib/utils';
// Remove axios import - using Inertia instead

// Import state components
import {
    PendingState,
    QueuedState,
    OnHoldState,
    AwaitingQualityState,
    CompletedState,
    SkippedState,
    CancelledState
} from './states';

// Import new components
import { ProductionSummary } from './ProductionSummary';
import { QuantityReportDialog } from './QuantityReportDialog';

// Import types
import { StepStateType, StepStateInfo, StateTransitionAction } from '@/types/production-states';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

// Type for current execution data from MO viewer
interface CurrentExecutionData {
    id: number;
    status: string;
    started_at: string;
    quantity_completed?: number;
    quantity_scrapped?: number;
}

interface MOStepActionDialogProps {
    order: ManufacturingOrder | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeStepId?: number;
    onStateChanged?: () => void; // Callback when step state changes
}

/**
 * Manufacturing Order Details Dialog
 * Displays detailed execution information for routed orders with full state management
 */
export function MOStepActionDialog({ order, isOpen, onOpenChange, activeStepId, onStateChanged }: MOStepActionDialogProps) {
    // State management
    const [activeExecution, setActiveExecution] = useState<ManufacturingStepExecution | null>(null);
    const [currentStep, setCurrentStep] = useState<ManufacturingStep | null>(null);
    const [stepStateInfo, setStepStateInfo] = useState<StepStateInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [transitionLoading, setTransitionLoading] = useState(false); // New state for smooth transitions
    const [showLabels, setShowLabels] = useState(false);
    const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
    const [stepPhotos, setStepPhotos] = useState<Media[]>([]);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [showingStepPhotos, setShowingStepPhotos] = useState(false);
    const [showReasonDialog, setShowReasonDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<StateTransitionAction | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [showProductionDialog, setShowProductionDialog] = useState(false);
    const [showScrapDialog, setShowScrapDialog] = useState(false);

    // Form for quantity reporting (in_progress state)
    const { data, setData, post, reset } = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        scrap_reason: '',
        notes: '',
        time_spent: 0,
        mark_complete: false as boolean,
    });


    // Initialize from props
    useEffect(() => {
        if (order && isOpen) {
            initializeDialog();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.id, isOpen, activeStepId]); // Only re-init if order ID changes, not the order object

    const initializeDialog = async () => {
        if (!order) {
            return;
        }

        setLoading(true);
        try {
            // If we need to fetch fresh order data (e.g., after state transition)
            // This would require an API endpoint that returns the full order with executions
            // For now, we'll work with what we have

            // Find the current step
            let step: ManufacturingStep | null = null;
            let execution: ManufacturingStepExecution | null = null;

            if (activeStepId) {
                // Find step by ID if provided
                step = order.manufacturing_route?.steps?.find(s => s.id === activeStepId) || null;
            } else {
                // Find active step
                const activeStepData = findActiveStep(order);
                step = activeStepData.step;
                execution = activeStepData.execution;
            }

            // Check if step is in_progress but we don't have execution data
            if (step?.status === 'in_progress' && !execution) {
                // First check if step has current_execution from MO viewer
                const stepWithExec = step as ManufacturingStep & { current_execution?: CurrentExecutionData };
                if (stepWithExec.current_execution) {
                    const currentExecData = stepWithExec.current_execution;
                    execution = {
                        id: currentExecData.id,
                        manufacturing_step_id: step.id,
                        manufacturing_order_id: order.id,
                        status: currentExecData.status,
                        started_at: currentExecData.started_at,
                        quantity_completed: currentExecData.quantity_completed || 0,
                        quantity_scrapped: currentExecData.quantity_scrapped || 0,
                        total_hold_duration: 0,
                        media: []
                    } as ManufacturingStepExecution;
                }
                // Otherwise check if we have executions in the step data
                else if (step.executions && step.executions.length > 0) {
                    // Find the in_progress execution
                    execution = step.executions.find(
                        (e: ManufacturingStepExecution) => e.status === 'in_progress'
                    ) || step.executions[0]; // Fallback to first execution
                } else {
                    // If we have an in_progress step without execution data, we need to fetch it
                    // For now, we'll leave execution as null and handle it differently
                    execution = null;
                }
            }

            setCurrentStep(step);
            setActiveExecution(execution);
            setStepPhotos(execution?.media || []);

            // Determine step state and fetch additional info
            if (step) {
                const stateInfo = await determineStepState(step, execution);
                setStepStateInfo(stateInfo);
            }
        } catch {
            // Handle error silently
        } finally {
            setLoading(false);
        }
    };

    const findActiveStep = (order: ManufacturingOrder): { step: ManufacturingStep | null; execution: ManufacturingStepExecution | null } => {
        const route = order.manufacturing_route;
        if (!route?.steps) {
            return { step: null, execution: null };
        }

        // First check for in_progress or awaiting_quality steps
        for (const step of route.steps) {
            // Check if step has current_execution from MO viewer data
            const stepWithExec = step as ManufacturingStep & { current_execution?: CurrentExecutionData };
            if (step.status === 'in_progress' && stepWithExec.current_execution) {
                const currentExecData = stepWithExec.current_execution;
                const execution = {
                    id: currentExecData.id,
                    manufacturing_step_id: step.id,
                    manufacturing_order_id: order.id,
                    status: currentExecData.status,
                    started_at: currentExecData.started_at,
                    quantity_completed: currentExecData.quantity_completed || 0,
                    quantity_scrapped: currentExecData.quantity_scrapped || 0,
                    total_hold_duration: 0,
                    media: []
                } as ManufacturingStepExecution;
                return { step, execution };
            }

            // Check if step has executions array
            const execution = step.executions?.find(
                (e: ManufacturingStepExecution) => ['in_progress', 'awaiting_quality'].includes(e.status)
            );
            if (execution) {
                return { step, execution };
            }
        }

        // Then check for queued steps
        const queuedStep = route.steps.find(s => s.status === 'queued');
        if (queuedStep) {
            return { step: queuedStep, execution: null };
        }

        // Then check for pending steps that can start
        const pendingStep = route.steps.find(s => s.status === 'pending' && s.can_start);
        if (pendingStep) {
            return { step: pendingStep, execution: null };
        }

        // Default to first non-completed step
        const nextStep = route.steps.find(s => !['completed', 'skipped', 'cancelled'].includes(s.status));
        return { step: nextStep || null, execution: null };
    };

    const determineStepState = async (step: ManufacturingStep, execution: ManufacturingStepExecution | null): Promise<StepStateInfo> => {
        // Base state info
        const stateInfo: StepStateInfo = {
            state: (execution?.status || step.status) as StepStateType,
            canStart: step.can_start !== false,
            cannotStartReason: step.cannot_start_reason,
        };

        // Add state-specific information
        switch (stateInfo.state) {
            case 'pending':
                // Dependencies should be loaded with the step data
                // If not available, we'll need to fetch them via Inertia
                break;

            case 'on_hold':
                if (execution?.hold_reason) {
                    stateInfo.holdInfo = {
                        reason: execution.hold_reason,
                        duration: execution.total_hold_duration || 0,
                        previousState: 'in_progress' as StepStateType, // TODO: Add previous_state to interface
                        heldBy: execution.executed_by_user || { id: 0, name: 'Unknown' },
                        heldAt: execution.on_hold_at || new Date().toISOString(),
                    };
                }
                break;

            case 'awaiting_quality':
                // Quality requirements should be loaded with the step data
                // If not available, we'll need to fetch them via Inertia
                break;

            case 'completed':
                if (step.actual_end_time) {
                    stateInfo.completionInfo = {
                        quantityProduced: step.cumulative_quantity_completed || 0,
                        quantityScraped: step.cumulative_quantity_scrapped || 0,
                        actualDuration: step.actual_duration_minutes || 0,
                        estimatedDuration: (step.setup_time_minutes + step.cycle_time_minutes) || 0,
                        efficiency: 100, // TODO: Calculate actual efficiency
                        completedBy: { id: 0, name: 'Unknown' }, // TODO: Add completed_by to interface
                        completedAt: step.actual_end_time,
                    };
                }
                break;

            case 'skipped':
                // TODO: Add skip_reason fields to ManufacturingStep interface
                stateInfo.skipInfo = {
                    reason: 'Step was skipped', // TODO: Get actual skip reason
                    skippedBy: { id: 0, name: 'Unknown' },
                    skippedAt: new Date().toISOString(),
                    authorizedBy: undefined,
                };
                break;

            case 'cancelled':
                // TODO: Add cancellation fields to ManufacturingStep interface
                stateInfo.cancellationInfo = {
                    reason: 'Step was cancelled', // TODO: Get actual cancellation reason
                    cancelledBy: { id: 0, name: 'Unknown' },
                    cancelledAt: new Date().toISOString(),
                    affectedSteps: [],
                };
                break;
        }

        return stateInfo;
    };

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

    const executeStateTransition = (action: StateTransitionAction, reason?: string) => {
        if (!currentStep) return;

        setTransitionLoading(true); // Use transition loading instead

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

    // Action handlers
    const startExecution = () => {
        if (!currentStep || !order) return;


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

                    setTransitionLoading(false);

                    // Then notify parent after dialog has updated
                    if (onStateChanged) {
                        onStateChanged();
                    }
                } else {
                    // If we didn't get execution data back, we need to reload the dialog
                    // to fetch the proper execution data
                    initializeDialog().then(() => {
                        setTransitionLoading(false);
                        if (onStateChanged) {
                            onStateChanged();
                        }
                    });
                }
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    const forceStartExecution = () => {
        if (!currentStep || !order) return;

        router.post(route('production.reporting.steps.force-start'), {
            manufacturing_order_id: order.id,
            manufacturing_step_id: currentStep.id,
        }, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: () => {
                initializeDialog().then(() => {
                    setTransitionLoading(false);
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    const skipStep = (reason: string) => {
        if (!currentStep) return;

        router.post(route('production.reporting.steps.skip', { step: currentStep.id }), {
            reason,
        }, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: () => {
                initializeDialog().then(() => {
                    setTransitionLoading(false);
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    const putOnHold = (reason: string) => {
        if (!activeExecution) return;

        router.post(route('production.reporting.steps.hold', { step: currentStep!.id }), {
            execution_id: activeExecution.id,
            reason,
        }, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: () => {
                initializeDialog().then(() => {
                    setTransitionLoading(false);
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

    const resumeExecution = () => {
        if (!currentStep) return;

        router.post(route('production.reporting.steps.resume', { step: currentStep.id }), {}, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: () => {
                initializeDialog().then(() => {
                    setTransitionLoading(false);
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };

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
                initializeDialog().then(() => {
                    setTransitionLoading(false);
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };


    const getRemainingQuantity = () => {
        if (!activeExecution || !order) return 0;

        const cumulative = currentStep?.cumulative_quantity_completed || 0;
        const cumulativeScrap = currentStep?.cumulative_quantity_scrapped || 0;

        return order.quantity - cumulative - cumulativeScrap;
    };

    const handleSubmit = () => {
        if (!activeExecution || !activeExecution.id || activeExecution.id === 0) {
            console.error('[MOStepActionDialog] No valid execution to report progress');
            return;
        }

        post(route('production.reporting.steps.report', { execution: activeExecution.id }), {
            preserveUrl: true,
            onSuccess: (_page) => {
                reset();
                initializeDialog().then(() => {
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: (errors) => {
                console.error('[MOStepActionDialog] Submit errors:', errors);
            }
        });
    };

    const handleProductionReport = (quantity: number) => {
        if (!activeExecution || !activeExecution.id) return;

        // Store previous data for potential revert
        const previousData = { ...data };

        // Update the form data
        setData({
            quantity_completed: quantity,
            quantity_scrapped: 0,
            scrap_reason: '',
            notes: '',
            time_spent: 0,
            mark_complete: false,
        });

        // Submit using the form's post method which uses the data from useForm
        post(route('production.reporting.steps.report', { execution: activeExecution.id }), {
            preserveUrl: true,
            onSuccess: () => {
                // Reset form after successful submission
                reset();
                initializeDialog().then(() => {
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: () => {
                // Revert on error
                setData(previousData);
            }
        });
    };

    const handleScrapReport = (quantity: number, reason?: string) => {
        if (!activeExecution || !activeExecution.id) return;

        // Store previous data for potential revert
        const previousData = { ...data };

        // Update the form data
        setData({
            quantity_completed: 0,
            quantity_scrapped: quantity,
            scrap_reason: reason || '',
            notes: '',
            time_spent: 0,
            mark_complete: false,
        });

        // Submit using the form's post method which uses the data from useForm
        post(route('production.reporting.steps.report', { execution: activeExecution.id }), {
            preserveUrl: true,
            onSuccess: () => {
                // Reset form after successful submission
                reset();
                initializeDialog().then(() => {
                    if (onStateChanged) onStateChanged();
                });
            },
            onError: () => {
                // Revert on error
                setData(previousData);
            }
        });
    };

    const handlePhotoAdded = (photo: File) => {
        if (!activeExecution) return;

        const formData = new FormData();
        formData.append('photo', photo);

        router.post(route('production.reporting.steps.upload-photo', { execution: activeExecution.id }), formData, {
            preserveUrl: true,
            onSuccess: (page) => {
                const pageProps = page.props as { newPhoto?: typeof stepPhotos[0] };
                if (pageProps.newPhoto) {
                    setStepPhotos(prev => [...prev, pageProps.newPhoto!]);
                }
            }
        });
    };

    const handleDeletePhoto = (photo: Media) => {
        if (!activeExecution || !photo.id) return;

        if (confirm('Are you sure you want to delete this photo?')) {
            router.delete(route('production.reporting.steps.delete-photo', {
                execution: activeExecution.id,
                media: photo.id
            }), {
                preserveUrl: true,
                onSuccess: () => {
                    setStepPhotos(prev => prev.filter(p => p.id !== photo.id));
                    setSelectedPhotoIndex(null);
                }
            });
        }
    };

    const handlePrintLabels = () => {
        setShowLabels(true);
    };

    // Render in-progress state content
    const renderInProgressState = () => {
        const gateQuantity = order?.quantity || 0;
        const totalCompleted = (currentStep?.cumulative_quantity_completed || 0) + data.quantity_completed;
        const canProceed = totalCompleted >= gateQuantity;

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
            <>
                <div className="flex-1 flex flex-col space-y-6">
                    {/* Production Summary */}
                    <ProductionSummary
                        orderQuantity={gateQuantity}
                        quantityCompleted={currentStep?.cumulative_quantity_completed || 0}
                        quantityScrapped={currentStep?.cumulative_quantity_scrapped || 0}
                        currentSessionCompleted={data.quantity_completed}
                        currentSessionScrapped={data.quantity_scrapped}
                        unitOfMeasure={order?.unit_of_measure}
                    />

                    {/* Report Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            size="lg"
                            className="h-16 text-base font-semibold"
                            onClick={() => setShowProductionDialog(true)}
                            disabled={getRemainingQuantity() === 0}
                        >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Report Production
                        </Button>
                        <Button
                            variant="destructive"
                            size="lg"
                            className="h-16 text-base font-semibold"
                            onClick={() => setShowScrapDialog(true)}
                            disabled={getRemainingQuantity() === 0}
                        >
                            <XCircle className="h-5 w-5 mr-2" />
                            Report Scrap
                        </Button>
                    </div>

                    {/* Mark Complete Button */}
                    {(canProceed || (activeExecution && !currentStep?.next_step)) && (
                        <Button
                            variant="outline"
                            className="w-full h-12 text-base font-medium"
                            onClick={() => {
                                setData('mark_complete', true);
                                handleSubmit();
                            }}
                        >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Mark Step Complete
                        </Button>
                    )}

                    {/* Spacer to push action buttons to bottom */}
                    <div className="flex-1" />

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-[72px] flex flex-col items-center justify-center gap-1 p-3"
                                onClick={handlePrintLabels}
                            >
                                <Printer className="h-5 w-5" />
                                <div className="text-center">
                                    <div className="text-xs leading-tight">PRINT</div>
                                    <div className="text-xs leading-tight">QR CODE</div>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-[72px] flex flex-col items-center justify-center gap-1 p-3"
                                onClick={() => setPhotoCaptureOpen(true)}
                                disabled={stepPhotos.length >= 3}
                            >
                                <Camera className="h-5 w-5" />
                                <div className="text-center">
                                    <div className="text-xs leading-tight">TAKE</div>
                                    <div className="text-xs leading-tight">PICTURE</div>
                                </div>
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-[72px] flex flex-col items-center justify-center gap-1 p-3"
                                onClick={() => handleStateAction({
                                    action: 'put_on_hold',
                                    label: 'Put On Hold',
                                    icon: 'Pause',
                                    variant: 'outline',
                                    requiresReason: true,
                                })}
                            >
                                <Pause className="h-5 w-5" />
                                <div className="text-center">
                                    <div className="text-xs leading-tight">PUT</div>
                                    <div className="text-xs leading-tight">ON HOLD</div>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-[72px] flex flex-col items-center justify-center gap-1 p-3"
                                onClick={() => {
                                    // TODO: Implement report issue
                                    console.log('Report issue clicked');
                                }}
                            >
                                <AlertCircle className="h-5 w-5" />
                                <div className="text-center">
                                    <div className="text-xs leading-tight">REPORT</div>
                                    <div className="text-xs leading-tight">ISSUE</div>
                                </div>
                            </Button>
                        </div>
                    </div>
                </div>
            </>
        );
    };

    // Render state-specific content
    const renderStateContent = () => {
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
                    return <PendingState stateInfo={stepStateInfo} onAction={handleStateAction} />;

                case 'queued':
                    return (
                        <QueuedState
                            stateInfo={stepStateInfo}
                            stepName={currentStep?.name}
                            stepDescription={currentStep?.description}
                            workCell={currentStep?.work_cell?.name}
                            estimatedDuration={(currentStep?.setup_time_minutes || 0) + (currentStep?.cycle_time_minutes || 0)}
                            queuePosition={undefined} // TODO: Add queue_position to interface
                            onAction={handleStateAction}
                        />
                    );

                case 'in_progress':
                    return renderInProgressState();

                case 'on_hold':
                    return <OnHoldState stateInfo={stepStateInfo} onAction={handleStateAction} />;

                case 'awaiting_quality':
                    return (
                        <AwaitingQualityState
                            stateInfo={stepStateInfo}
                            quantityCompleted={currentStep?.cumulative_quantity_completed}
                            onAction={handleStateAction}
                        />
                    );

                case 'completed':
                    return (
                        <CompletedState
                            stateInfo={stepStateInfo}
                            hasNextStep={!!currentStep?.next_step}
                            onAction={handleStateAction}
                        />
                    );

                case 'skipped':
                    return <SkippedState stateInfo={stepStateInfo} onAction={handleStateAction} />;

                case 'cancelled':
                    return <CancelledState stateInfo={stepStateInfo} onAction={handleStateAction} />;

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
                {transitionLoading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-sm text-muted-foreground">Updating...</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!order || loading) {
        return null;
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="!max-w-[90vw] w-[80vw] max-h-[90vh] p-0 gap-0 sm:!max-w-[90vw] flex flex-col">
                    <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
                        <div className="flex items-start justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-semibold">{order.order_number}</DialogTitle>
                                <DialogDescription className="sr-only">
                                    Manufacturing order step execution dialog
                                </DialogDescription>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-sm text-muted-foreground">
                                        {order.item?.name || 'Unknown Item'} · Qty: {formatNumber(order.quantity)}
                                    </span>
                                    <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                        {order.status}
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {currentStep?.work_cell?.name || 'No work cell assigned'}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col p-6 overflow-y-auto min-h-0">
                        <div className="flex min-h-[600px] gap-6">
                            {/* Left - Dynamic State Content */}
                            <div className="flex-1 flex flex-col pr-6 border-r">
                                {renderStateContent()}
                            </div>

                            {/* Right Column - Picture and Current Step */}
                            <div className="flex-1 flex flex-col gap-4 pl-6">
                                {/* Top Right - Picture */}
                                <div className="flex flex-col h-[280px] overflow-hidden">
                                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                                        <h3 className="text-base font-semibold uppercase">{order.item?.name || 'PICTURE'}</h3>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8"
                                                onClick={() => {
                                                    if (showingStepPhotos && stepPhotos.length > 0) {
                                                        const currentIndex = selectedPhotoIndex ?? 0;
                                                        const prevIndex = currentIndex > 0 ? currentIndex - 1 : stepPhotos.length - 1;
                                                        setSelectedPhotoIndex(prevIndex);
                                                    }
                                                }}
                                                disabled={!showingStepPhotos || stepPhotos.length === 0}
                                            >
                                                <span className="text-xl">‹</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8"
                                                onClick={() => {
                                                    if (showingStepPhotos && stepPhotos.length > 0) {
                                                        const currentIndex = selectedPhotoIndex ?? 0;
                                                        const nextIndex = currentIndex < stepPhotos.length - 1 ? currentIndex + 1 : 0;
                                                        setSelectedPhotoIndex(nextIndex);
                                                    }
                                                }}
                                                disabled={!showingStepPhotos || stepPhotos.length === 0}
                                            >
                                                <span className="text-xl">›</span>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                                        {showingStepPhotos && stepPhotos.length > 0 && selectedPhotoIndex !== null ? (
                                            <div className="flex flex-col items-center justify-center h-full w-full relative">
                                                <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg" />
                                                <div className="relative flex-1 w-full flex items-center justify-center p-4">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-background/40 blur-2xl rounded-full scale-150" />
                                                        <img
                                                            src={stepPhotos[selectedPhotoIndex]?.url}
                                                            alt={`Step photo ${selectedPhotoIndex + 1}`}
                                                            className="relative max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-center mt-4 flex-shrink-0 relative z-10">
                                                    <p className="text-sm font-medium">PICTURE {selectedPhotoIndex + 1}</p>
                                                    <p className="text-xs text-muted-foreground">Step Photo</p>
                                                </div>
                                            </div>
                                        ) : (order.item?.primary_image_url || order.item?.media?.[0]?.original_url) ? (
                                            <div className="flex flex-col items-center justify-center h-full w-full relative">
                                                <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg" />
                                                <div className="relative flex-1 w-full flex items-center justify-center p-4">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-background/40 blur-2xl rounded-full scale-150" />
                                                        <img
                                                            src={order.item.primary_image_url || order.item.media?.[0]?.original_url}
                                                            alt={order.item.name}
                                                            className="relative max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full w-full relative">
                                                <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg" />
                                                <div className="relative">
                                                    <Package className="h-20 w-20 text-muted-foreground/50" />
                                                    <p className="text-sm text-muted-foreground mt-2">No image available</p>
                                                </div>
                                            </div>
                                        )}

                                        {stepPhotos.length > 0 && (
                                            <div className="mt-6 text-center">
                                                <Button
                                                    variant="ghost"
                                                    className="text-sm text-muted-foreground"
                                                    onClick={() => {
                                                        setShowingStepPhotos(!showingStepPhotos);
                                                        if (!showingStepPhotos && selectedPhotoIndex === null) {
                                                            setSelectedPhotoIndex(0);
                                                        }
                                                    }}
                                                >
                                                    {showingStepPhotos ? 'SHOW ITEM' : 'SHOW PICTURES'}
                                                </Button>

                                                {showingStepPhotos && (
                                                    <div className="flex gap-2 mt-2 justify-center">
                                                        {stepPhotos.map((_, index) => (
                                                            <div
                                                                key={index}
                                                                className={cn(
                                                                    "w-2 h-2 rounded-full bg-muted-foreground/30 cursor-pointer",
                                                                    selectedPhotoIndex === index && "bg-primary"
                                                                )}
                                                                onClick={() => setSelectedPhotoIndex(index)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Horizontal Separator */}
                                <Separator className="my-2" />

                                {/* Bottom Right - Current Step */}
                                <div className="flex flex-col flex-1">
                                    <h3 className="text-base font-semibold uppercase mb-2">CURRENT STEP</h3>

                                    <div className="flex-1 flex flex-col justify-center">
                                        {currentStep && (
                                            <div className="space-y-6">
                                                <div className="text-center p-6 bg-background rounded-lg">
                                                    <p className="text-sm text-muted-foreground mb-2">GATE</p>
                                                    <p className="text-3xl font-bold">{currentStep.name}</p>
                                                    {currentStep.description && (
                                                        <p className="text-sm text-muted-foreground mt-2">{currentStep.description}</p>
                                                    )}
                                                </div>

                                                {currentStep.next_step && (
                                                    <div className="text-center p-6 bg-background/50 rounded-lg">
                                                        <p className="text-sm text-muted-foreground mb-2">NEXT STEP</p>
                                                        <p className="text-xl font-medium">{currentStep.next_step.name}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reason Dialog */}
            {showReasonDialog && pendingAction && (
                <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{pendingAction.label}</DialogTitle>
                            <DialogDescription>
                                Please provide a reason for this action.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Enter reason..."
                                rows={3}
                                className="w-full p-2 border rounded-md"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowReasonDialog(false);
                                        setPendingAction(null);
                                        setActionReason('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (actionReason.trim()) {
                                            executeStateTransition(pendingAction, actionReason);
                                        }
                                    }}
                                    disabled={!actionReason.trim()}
                                >
                                    Confirm
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Photo Capture Dialog */}
            {photoCaptureOpen && (
                <StepPhotoCapture
                    isOpen={photoCaptureOpen}
                    onClose={() => setPhotoCaptureOpen(false)}
                    onPhotoAdded={handlePhotoAdded}
                />
            )}

            {/* Photo Viewer */}
            {selectedPhotoIndex !== null && (
                <StepPhotoViewer
                    photos={stepPhotos.map(photo => ({
                        id: parseInt(photo.id) || 0,
                        url: photo.url,
                        display_url: photo.url,
                        uploaded_at: photo.uploaded_at
                    }))}
                    selectedIndex={selectedPhotoIndex}
                    onIndexChange={setSelectedPhotoIndex}
                    onDelete={(photoId) => {
                        const photo = stepPhotos.find(p => parseInt(p.id) === photoId);
                        if (photo) {
                            handleDeletePhoto(photo);
                        }
                    }}
                />
            )}

            {/* Label Print Preview */}
            {showLabels && (
                <Dialog open={showLabels} onOpenChange={setShowLabels}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Print Labels</DialogTitle>
                        </DialogHeader>
                        <div className="p-4">
                            <p>Label printing functionality coming soon...</p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Production Report Dialog */}
            <QuantityReportDialog
                isOpen={showProductionDialog}
                onOpenChange={setShowProductionDialog}
                type="production"
                maxQuantity={getRemainingQuantity()}
                currentQuantity={currentStep?.cumulative_quantity_completed || 0}
                onSubmit={handleProductionReport}
                unitOfMeasure={order?.unit_of_measure}
            />

            {/* Scrap Report Dialog */}
            <QuantityReportDialog
                isOpen={showScrapDialog}
                onOpenChange={setShowScrapDialog}
                type="scrap"
                maxQuantity={getRemainingQuantity()}
                currentQuantity={currentStep?.cumulative_quantity_scrapped || 0}
                onSubmit={handleScrapReport}
                unitOfMeasure={order?.unit_of_measure}
            />
        </>
    );
}

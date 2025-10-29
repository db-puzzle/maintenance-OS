import React, { useState, useEffect } from 'react';
import { ManufacturingOrder, ManufacturingStep, ManufacturingStepExecution } from '@/types/production';
import { useForm, router } from '@inertiajs/react';
import { createFormAdapter } from '@/utils/form-adapters';
import { formatNumber } from '@/utils/number';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TextArea } from '@/components/TextArea';
import { Separator } from '@/components/ui/separator';
import {
    Plus, Minus, Camera, Printer, Pause, AlertCircle,
    Package
} from 'lucide-react';
import { StepPhotoCapture } from './StepPhotoCapture';
import { StepPhotoViewer } from './StepPhotoViewer';
import { cn } from '@/lib/utils';
import axios from 'axios';

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

// Import types
import { StepStateType, StepStateInfo, StateTransitionAction } from '@/types/production-states';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface MOStepActionDialogProps {
    order: ManufacturingOrder | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeStepId?: number;
}

/**
 * Manufacturing Order Details Dialog
 * Displays detailed execution information for routed orders with full state management
 */
export function MOStepActionDialog({ order, isOpen, onOpenChange, activeStepId }: MOStepActionDialogProps) {
    // State management
    const [activeTab, setActiveTab] = useState<'production' | 'scrap'>('production');
    const [activeExecution, setActiveExecution] = useState<ManufacturingStepExecution | null>(null);
    const [currentStep, setCurrentStep] = useState<ManufacturingStep | null>(null);
    const [stepStateInfo, setStepStateInfo] = useState<StepStateInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [showLabels, setShowLabels] = useState(false);
    const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
    const [stepPhotos, setStepPhotos] = useState<Array<{ id: number; url: string; thumb_url?: string; original_url?: string }>>([]);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [showingStepPhotos, setShowingStepPhotos] = useState(false);
    const [showReasonDialog, setShowReasonDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<StateTransitionAction | null>(null);
    const [actionReason, setActionReason] = useState('');

    // Form for quantity reporting (in_progress state)
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        scrap_reason: '',
        notes: '',
        time_spent: 0,
        mark_complete: false,
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    // Initialize from props
    useEffect(() => {
        if (order && isOpen) {
            console.log('[MOStepActionDialog] Initializing with order', {
                orderId: order?.id,
                orderNumber: order?.order_number,
                activeStepId,
                hasRoute: !!order?.manufacturing_route,
                stepsCount: order?.manufacturing_route?.steps?.length || 0
            });
            initializeDialog();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order, isOpen, activeStepId]);

    const initializeDialog = async () => {
        if (!order) return;

        setLoading(true);
        try {
            // Find the current step
            let step: ManufacturingStep | null = null;
            let execution: ManufacturingStepExecution | null = null;

            if (activeStepId) {
                // Find step by ID if provided
                step = order.manufacturing_route?.steps?.find(s => s.id === activeStepId) || null;
                console.log('[MOStepActionDialog] Looking for step by activeStepId', {
                    activeStepId,
                    found: !!step,
                    stepStatus: step?.status,
                    stepName: step?.name
                });
            } else {
                // Find active step
                const activeStepData = findActiveStep(order);
                step = activeStepData.step;
                execution = activeStepData.execution;
                console.log('[MOStepActionDialog] Found active step', {
                    stepId: step?.id,
                    stepStatus: step?.status,
                    executionStatus: execution?.status,
                    stepName: step?.name
                });
            }

            setCurrentStep(step);
            setActiveExecution(execution);
            setStepPhotos(execution?.media || []);

            // Determine step state and fetch additional info
            if (step) {
                console.log('[MOStepActionDialog] Determining step state', {
                    stepId: step.id,
                    stepStatus: step.status,
                    executionStatus: execution?.status,
                    canStart: step.can_start,
                    cannotStartReason: step.cannot_start_reason
                });
                const stateInfo = await determineStepState(step, execution);
                console.log('[MOStepActionDialog] State determined', {
                    state: stateInfo.state,
                    canStart: stateInfo.canStart,
                    cannotStartReason: stateInfo.cannotStartReason
                });
                setStepStateInfo(stateInfo);
            }
        } catch (error) {
            console.error('[MOStepActionDialog] Initialization error:', error);
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
        // Log the raw input for debugging
        console.log('[MOStepActionDialog] determineStepState - raw input', {
            stepId: step.id,
            stepStatus: step.status,
            executionStatus: execution?.status,
            canStart: step.can_start,
            cannotStartReason: step.cannot_start_reason
        });

        // Base state info
        const stateInfo: StepStateInfo = {
            state: (execution?.status || step.status) as StepStateType,
            canStart: step.can_start !== false,
            cannotStartReason: step.cannot_start_reason,
        };

        console.log('[MOStepActionDialog] determineStepState - derived state', {
            derivedState: stateInfo.state,
            fromExecution: !!execution?.status,
            fromStep: !execution?.status
        });

        // Add state-specific information
        switch (stateInfo.state) {
            case 'pending':
                // Fetch dependencies
                try {
                    const response = await axios.get(
                        route('production.reporting.steps.dependencies', { step: step.id })
                    );
                    stateInfo.dependencies = response.data.dependencies;
                } catch (error) {
                    console.error('Failed to fetch dependencies:', error);
                }
                break;

            case 'on_hold':
                if (execution?.hold_reason) {
                    stateInfo.holdInfo = {
                        reason: execution.hold_reason,
                        duration: execution.hold_duration || 0,
                        previousState: execution.previous_state as StepStateType,
                        heldBy: execution.held_by || { id: 0, name: 'Unknown' },
                        heldAt: execution.held_at || new Date().toISOString(),
                    };
                }
                break;

            case 'awaiting_quality':
                // Fetch quality requirements
                try {
                    const response = await axios.get(
                        route('production.reporting.steps.quality-requirements', { step: step.id })
                    );
                    stateInfo.qualityRequirements = response.data.requirements;
                } catch (error) {
                    console.error('Failed to fetch quality requirements:', error);
                }
                break;

            case 'completed':
                if (step.actual_end_time) {
                    stateInfo.completionInfo = {
                        quantityProduced: step.cumulative_quantity_completed || 0,
                        quantityScraped: step.cumulative_quantity_scrapped || 0,
                        actualDuration: step.actual_duration || 0,
                        estimatedDuration: step.estimated_duration || 0,
                        efficiency: step.efficiency || 100,
                        completedBy: step.completed_by || { id: 0, name: 'Unknown' },
                        completedAt: step.actual_end_time,
                    };
                }
                break;

            case 'skipped':
                if (step.skip_reason) {
                    stateInfo.skipInfo = {
                        reason: step.skip_reason,
                        skippedBy: step.skipped_by || { id: 0, name: 'Unknown' },
                        skippedAt: step.skipped_at || new Date().toISOString(),
                        authorizedBy: step.authorized_by,
                    };
                }
                break;

            case 'cancelled':
                if (step.cancellation_reason) {
                    stateInfo.cancellationInfo = {
                        reason: step.cancellation_reason,
                        cancelledBy: step.cancelled_by || { id: 0, name: 'Unknown' },
                        cancelledAt: step.cancelled_at || new Date().toISOString(),
                        affectedSteps: step.affected_steps || [],
                    };
                }
                break;
        }

        return stateInfo;
    };

    const handleStateAction = async (action: StateTransitionAction) => {
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
        await executeStateTransition(action);
    };

    const executeStateTransition = async (action: StateTransitionAction, reason?: string) => {
        if (!currentStep) return;

        setLoading(true);
        try {

            // Handle specific actions
            switch (action.action) {
                case 'start_execution':
                    await startExecution();
                    break;

                case 'force_start':
                    await forceStartExecution();
                    break;

                case 'skip_step':
                    await skipStep(reason || 'Skipped by operator');
                    break;

                case 'put_on_hold':
                    await putOnHold(reason || 'Put on hold by operator');
                    break;

                case 'resume':
                    await resumeExecution();
                    break;

                case 'quality_pass':
                    await recordQualityResult('passed');
                    break;

                case 'quality_fail_scrap':
                    await recordQualityResult('failed', 'scrap', reason);
                    break;

                case 'quality_fail_rework':
                    await recordQualityResult('failed', 'rework', reason);
                    break;

                default:
                    console.log(`Action ${action.action} not implemented yet`);
            }

            // Refresh dialog state
            await initializeDialog();
        } catch (error) {
            console.error(`Failed to execute ${action.action}:`, error);
            alert(`Failed to ${action.label}: ${error.message}`);
        } finally {
            setLoading(false);
            setShowReasonDialog(false);
            setPendingAction(null);
            setActionReason('');
        }
    };

    // Action handlers
    const startExecution = async () => {
        if (!currentStep || !order) return;

        const response = await axios.post(route('production.reporting.steps.start'), {
            manufacturing_order_id: order.id,
            manufacturing_step_id: currentStep.id,
        });

        if (response.data.success) {
            setActiveExecution(response.data.execution);
            router.reload({ preserveUrl: true });
        }
    };

    const forceStartExecution = async () => {
        if (!currentStep || !order) return;

        const response = await axios.post(route('production.reporting.steps.force-start'), {
            manufacturing_order_id: order.id,
            manufacturing_step_id: currentStep.id,
        });

        if (response.data.success) {
            setActiveExecution(response.data.execution);
            router.reload({ preserveUrl: true });
        }
    };

    const skipStep = async (reason: string) => {
        if (!currentStep) return;

        await axios.post(route('production.reporting.steps.skip', { step: currentStep.id }), {
            reason,
        });

        router.reload({ preserveUrl: true });
    };

    const putOnHold = async (reason: string) => {
        if (!activeExecution) return;

        await axios.post(route('production.reporting.steps.hold', { step: currentStep.id }), {
            execution_id: activeExecution.id,
            reason,
        });

        router.reload({ preserveUrl: true });
    };

    const resumeExecution = async () => {
        if (!currentStep) return;

        await axios.post(route('production.reporting.steps.resume', { step: currentStep.id }));
        router.reload({ preserveUrl: true });
    };

    const recordQualityResult = async (result: 'passed' | 'failed', action?: 'scrap' | 'rework', reason?: string) => {
        if (!activeExecution) return;

        await axios.post(route('production.reporting.steps.quality-result', { step: currentStep.id }), {
            execution_id: activeExecution.id,
            result,
            action,
            reason,
        });

        router.reload({ preserveUrl: true });
    };

    // In-progress state specific handlers
    const handleQuantityChange = (field: 'quantity_completed' | 'quantity_scrapped', delta: number) => {
        const newValue = Math.max(0, data[field] + delta);
        const maxRemaining = getRemainingQuantity();

        const otherField = field === 'quantity_completed' ? 'quantity_scrapped' : 'quantity_completed';
        const total = newValue + data[otherField];

        if (total <= maxRemaining) {
            setData(field, newValue);
        }
    };

    const getRemainingQuantity = () => {
        if (!activeExecution || !order) return 0;

        const cumulative = currentStep?.cumulative_quantity_completed || 0;
        const cumulativeScrap = currentStep?.cumulative_quantity_scrapped || 0;

        return order.quantity - cumulative - cumulativeScrap;
    };

    const handleSubmit = () => {
        if (!activeExecution) return;

        post(route('production.reporting.steps.report', { execution: activeExecution.id }), {
            preserveUrl: true,
            onSuccess: (_page) => {
                reset();
                initializeDialog();
            },
            onError: (errors) => {
                console.error('[MOStepActionDialog] Submit errors:', errors);
            }
        });
    };

    const handlePhotoAdded = (photo: File) => {
        if (!activeExecution) return;

        const formData = new FormData();
        formData.append('photo', photo);

        router.post(route('production.reporting.steps.upload-photo', { execution: activeExecution.id }), formData, {
            preserveUrl: true,
            onSuccess: (_page) => {
                const pageProps = page.props as { newPhoto?: typeof stepPhotos[0] };
                if (pageProps.newPhoto) {
                    setStepPhotos(prev => [...prev, pageProps.newPhoto!]);
                }
            }
        });
    };

    const handleDeletePhoto = (photo: typeof stepPhotos[0]) => {
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

        return (
            <>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'production' | 'scrap')} className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="production" className="text-base">PRODUÇÃO</TabsTrigger>
                        <TabsTrigger value="scrap" className="text-base">SCRAP</TabsTrigger>
                    </TabsList>

                    <TabsContent value="production" className="flex-1 flex flex-col">
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex items-center gap-8">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-16 w-16 text-2xl"
                                    onClick={() => handleQuantityChange('quantity_completed', -1)}
                                    disabled={data.quantity_completed === 0}
                                >
                                    <Minus className="h-8 w-8" />
                                </Button>

                                <div className="text-center">
                                    <div className="text-7xl font-bold tabular-nums">
                                        {formatNumber(data.quantity_completed)}
                                    </div>
                                    <div className="text-lg text-muted-foreground mt-2">
                                        of {formatNumber(getRemainingQuantity())} remaining
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-16 w-16 text-2xl"
                                    onClick={() => handleQuantityChange('quantity_completed', 1)}
                                    disabled={data.quantity_completed + data.quantity_scrapped >= getRemainingQuantity()}
                                >
                                    <Plus className="h-8 w-8" />
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="scrap" className="flex-1 flex flex-col">
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center justify-center gap-8">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-16 w-16 text-2xl"
                                    onClick={() => handleQuantityChange('quantity_scrapped', -1)}
                                    disabled={data.quantity_scrapped === 0}
                                >
                                    <Minus className="h-8 w-8" />
                                </Button>

                                <div className="text-center">
                                    <div className="text-7xl font-bold tabular-nums text-destructive">
                                        {formatNumber(data.quantity_scrapped)}
                                    </div>
                                    <div className="text-lg text-muted-foreground mt-2">scrapped</div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-16 w-16 text-2xl"
                                    onClick={() => handleQuantityChange('quantity_scrapped', 1)}
                                    disabled={data.quantity_completed + data.quantity_scrapped >= getRemainingQuantity()}
                                >
                                    <Plus className="h-8 w-8" />
                                </Button>
                            </div>

                            {data.quantity_scrapped > 0 && (
                                <div className="mt-4">
                                    <TextArea
                                        form={formAdapter}
                                        name="scrap_reason"
                                        placeholder="Enter reason for scrap..."
                                        required
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="space-y-3 mt-6">
                    <Button
                        className="w-full h-12 text-base font-semibold"
                        onClick={handleSubmit}
                        disabled={processing || (data.quantity_completed === 0 && data.quantity_scrapped === 0)}
                    >
                        SUBMIT
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full h-10 text-sm font-medium border border-muted-foreground/20"
                        onClick={() => setData('mark_complete', !data.mark_complete)}
                        disabled={!canProceed && !(activeExecution && !currentStep?.next_step)}
                    >
                        {data.mark_complete ? "✓ MARK COMPLETE" : "MARK COMPLETE"}
                    </Button>

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
                        estimatedDuration={currentStep?.estimated_duration}
                        queuePosition={currentStep?.queue_position}
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
    };

    if (!order || loading) {
        return null;
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="!max-w-[90vw] w-[80vw] max-h-[90vh] p-0 gap-0 sm:!max-w-[90vw] flex flex-col">
                    <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-semibold">{order.order_number}</DialogTitle>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-muted-foreground">
                                        {order.item?.name || 'Unknown Item'} • Qty: {formatNumber(order.quantity)}
                                    </span>
                                    <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="ml-2">
                                        {order.status}
                                    </Badge>
                                </div>
                                <DialogDescription className="mt-1">
                                    {currentStep?.work_cell?.name || 'No work cell assigned'}
                                </DialogDescription>
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
                                        <h3 className="text-base font-semibold uppercase">PICTURE</h3>
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
                                            <div className="flex flex-col items-center max-h-full">
                                                <div className="relative h-32 w-32 flex-shrink-0">
                                                    <img
                                                        src={stepPhotos[selectedPhotoIndex]?.url || stepPhotos[selectedPhotoIndex]?.original_url}
                                                        alt={`Step photo ${selectedPhotoIndex + 1}`}
                                                        className="w-full h-full object-contain rounded"
                                                    />
                                                </div>
                                                <div className="text-center mt-2">
                                                    <p className="text-sm font-medium">PICTURE {selectedPhotoIndex + 1}</p>
                                                    <p className="text-xs text-muted-foreground">Step Photo</p>
                                                </div>
                                            </div>
                                        ) : order.item?.media?.[0] ? (
                                            <div className="flex flex-col items-center max-h-full">
                                                <div className="relative h-32 w-32 flex-shrink-0">
                                                    <img
                                                        src={order.item.media[0].original_url}
                                                        alt={order.item.name}
                                                        className="w-full h-full object-contain rounded"
                                                    />
                                                </div>
                                                <div className="text-center mt-2">
                                                    <p className="text-sm font-medium">ITEM</p>
                                                    <p className="text-xs text-muted-foreground">{order.item.name}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <Package className="h-20 w-20 text-muted-foreground/50 mx-auto mb-2" />
                                                <p className="text-sm text-muted-foreground">No item image available</p>
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
                            <TextArea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Enter reason..."
                                rows={3}
                                className="w-full"
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
                    photos={stepPhotos}
                    selectedIndex={selectedPhotoIndex}
                    onIndexChange={setSelectedPhotoIndex}
                    onDelete={(photoId) => {
                        const photo = stepPhotos.find(p => p.id === photoId);
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
        </>
    );
}

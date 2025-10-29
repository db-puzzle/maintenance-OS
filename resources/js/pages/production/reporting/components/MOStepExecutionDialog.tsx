import React, { useState, useEffect, useCallback } from 'react';
import { ManufacturingOrder, ManufacturingStep, ManufacturingStepExecution } from '@/types/production';
import {
    Play,
    CheckCircle,
    AlertCircle,
    Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { MOStatusBadge } from './MOStatusBadge';
import { MOPriorityBadge } from './MOPriorityBadge';
import { formatNumber } from '@/utils/number';
import { StepCard } from './StepCard';
import { StepReportingInterface } from './StepReportingInterface';
import axios from 'axios';

interface StepWithStatus extends ManufacturingStep {
    can_start: boolean;
    dependency_info?: string;
    active_execution?: ManufacturingStepExecution;
}

interface MOStepExecutionDialogProps {
    order: ManufacturingOrder | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    canUpdate?: boolean;
}

export function MOStepExecutionDialog({
    order,
    isOpen,
    onOpenChange,
    canUpdate = true
}: MOStepExecutionDialogProps) {
    const [steps, setSteps] = useState<StepWithStatus[]>([]);
    const [activeStep, setActiveStep] = useState<StepWithStatus | null>(null);
    const [activeExecution, setActiveExecution] = useState<ManufacturingStepExecution | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Load step status when dialog opens or order changes
    useEffect(() => {
        if (order?.has_route && isOpen) {
            loadStepStatus();
        }
    }, [order?.id, order?.has_route, isOpen, refreshKey, loadStepStatus]);

    // Automatically set active step based on current execution
    useEffect(() => {
        if (steps.length > 0) {
            // Find step with active execution or first available step
            const stepWithExecution = steps.find(step => step.active_execution);
            const firstAvailableStep = steps.find(step =>
                step.can_start && step.status !== 'completed' && step.status !== 'skipped'
            );

            setActiveStep(stepWithExecution || firstAvailableStep || steps[0]);
            setActiveExecution(stepWithExecution?.active_execution || null);
        }
    }, [steps]);

    const loadStepStatus = useCallback(async () => {
        if (!order) return;

        try {
            const response = await axios.get(window.route('production.reporting.steps.order-status', order.id));
            setSteps(response.data.steps || []);
        } catch (error) {
            console.error('Failed to load step status:', error);
        }
    }, [order]);

    const handleStartStep = async (step: StepWithStatus) => {
        try {
            const response = await axios.post(window.route('production.reporting.steps.start', step.id));
            setActiveExecution(response.data.execution);
            // Refresh step status
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Failed to start step:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                alert(axiosError.response?.data?.message || 'Failed to start step execution');
            } else {
                alert('Failed to start step execution');
            }
        }
    };

    const handleStepReportSubmit = () => {
        // Refresh step status after report
        setRefreshKey(prev => prev + 1);
    };

    if (!order) return null;

    // Removed unused getItemImageUrl function

    // Removed unused isOverdue variable

    const renderDialogContent = () => {
        // Check if order has a route
        if (!order.has_route) {
            return (
                <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">No Route Defined</p>
                        <p className="text-sm text-muted-foreground">
                            This manufacturing order doesn't have a route with steps.
                            Step-level execution is not available.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col">
                {/* Header with MO context */}
                <div className="pb-4 flex-shrink-0">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">{order.order_number}</h2>
                            <MOStatusBadge status={order.status} />
                        </div>
                        <MOPriorityBadge priority={order.priority} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {order.item?.item_number && (
                            <span>{order.item.item_number}</span>
                        )}
                        <span>•</span>
                        <span>{order.item?.name}</span>
                        <span>•</span>
                        <span>{formatNumber(order.quantity)} {order.unit_of_measure}</span>
                    </div>

                    {/* Overall progress bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Overall Progress</span>
                            <span>{formatNumber(order.quantity_completed)} / {formatNumber(order.quantity)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(order.quantity_completed / order.quantity) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Main content area */}
                <div className="flex-1 flex gap-6 pt-4 overflow-hidden">
                    {/* Active Step Section (Primary Focus) */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {activeStep ? (
                            <>
                                {/* Active Step Header */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Step {activeStep.step_number}
                                        </span>
                                        <Activity className="w-4 h-4 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold">{activeStep.name}</h3>
                                    {activeStep.work_cell && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Work Cell: {activeStep.work_cell.name}
                                        </p>
                                    )}
                                </div>

                                {/* Step Progress */}
                                <div className="mb-6">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span>Step Progress</span>
                                        <span className="font-medium">
                                            {formatNumber(activeStep.cumulative_quantity_completed || 0)} / {formatNumber(order.quantity)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${((activeStep.cumulative_quantity_completed || 0) / order.quantity) * 100}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Reporting Interface */}
                                <div className="flex-1">
                                    {(activeStep.status === 'queued' || (activeStep.status === 'pending' && activeStep.can_start)) && !activeExecution && canUpdate && (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <p className="text-sm text-muted-foreground mb-4">
                                                This step is ready to begin execution
                                            </p>
                                            <Button
                                                size="lg"
                                                onClick={() => handleStartStep(activeStep)}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Play className="w-4 h-4 mr-2" />
                                                Start Step Execution
                                            </Button>
                                        </div>
                                    )}

                                    {activeStep.status === 'in_progress' && activeExecution && canUpdate && (
                                        <StepReportingInterface
                                            step={activeStep}
                                            execution={activeExecution}
                                            order={order}
                                            onSubmit={handleStepReportSubmit}
                                        />
                                    )}

                                    {activeStep.status === 'completed' && (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                                            <p className="text-lg font-medium mb-2">Step Completed</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatNumber(activeStep.cumulative_quantity_completed || 0)} units completed
                                            </p>
                                        </div>
                                    )}

                                    {activeStep.status === 'pending' && !activeStep.can_start && (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <AlertCircle className="w-16 h-16 text-orange-600 mb-4" />
                                            <p className="text-lg font-medium mb-2">Step Not Ready</p>
                                            {activeStep.dependency_info && (
                                                <p className="text-sm text-muted-foreground text-center">
                                                    {activeStep.dependency_info}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">No active step selected</p>
                            </div>
                        )}
                    </div>

                    {/* Route Steps List (Secondary) */}
                    <div className="w-80 flex-shrink-0 border-l pl-6">
                        <h4 className="font-medium mb-4">Route Steps</h4>
                        <ScrollArea className="h-full">
                            <div className="space-y-2 pr-4">
                                {steps.map((step) => (
                                    <StepCard
                                        key={step.id}
                                        step={step}
                                        isActive={activeStep?.id === step.id}
                                        onClick={() => setActiveStep(step)}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[95vw] sm:!max-w-[90vw] lg:!max-w-[85vw] w-[95vw] sm:w-[90vw] lg:w-[85vw] !h-[90vh] sm:!h-[85vh] p-0 gap-0 overflow-hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>Manufacturing Order Step Execution</DialogTitle>
                    <DialogDescription>Execute manufacturing steps and track progress</DialogDescription>
                </DialogHeader>
                <div className="p-4 sm:p-6 h-full">
                    {renderDialogContent()}
                </div>
            </DialogContent>
        </Dialog>
    );
}

import React, { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Route, PlayCircle, FlagTriangleRight } from 'lucide-react';
import { StepCard } from './StepCard';
import { GateIndicator } from './GateIndicator';
import { ManufacturingOrder, ManufacturingStep } from '@/types/production';

interface GateConfiguration {
    dependency_type: 'none' | 'all_children_completed' | 'children_quantity';
    minimum_quantity?: number;
}

interface GateStatus {
    isMet: boolean;
    currentProgress?: number;
    requiredProgress?: number;
    message?: string;
}

interface StepNavigatorProps {
    order: ManufacturingOrder;
    currentStepId: number;
    onStepChange: (stepId: number) => void;
    className?: string;
}

interface RouteStep {
    id: number;
    name: string;
    display_position?: number;
    status: string;
    work_cell: {
        id: number;
        name: string;
    } | null;
    quantity_completed: number;
    quantity_scrapped: number;
    quantity_total: number;
    rejection_rate: number;
    has_quality_issue: boolean;
    has_delay: boolean;
    cumulative_quantity_completed?: number;
    child_order_dependency_type?: string;
    child_order_minimum_quantity?: number;
}

/**
 * Step Navigator Component
 * Displays previous, current, and next route steps in vertical layout with gates
 * Allows navigation between steps by clicking
 */
export function StepNavigator({
    order,
    currentStepId,
    onStepChange,
    className
}: StepNavigatorProps) {
    // Convert manufacturing steps to route steps format
    const routeSteps: RouteStep[] = useMemo(() => {
        if (!order.manufacturing_route?.steps) return [];

        return order.manufacturing_route.steps.map((step: ManufacturingStep) => ({
            id: step.id,
            name: step.name,
            display_position: step.display_position,
            status: step.status,
            work_cell: step.work_cell || null,
            quantity_completed: step.cumulative_quantity_completed || 0,
            quantity_scrapped: step.cumulative_quantity_scrapped || 0,
            quantity_total: order.quantity,
            rejection_rate: 0, // Calculate if needed
            has_quality_issue: false, // Set based on step data if available
            has_delay: false, // Set based on step data if available
            cumulative_quantity_completed: step.cumulative_quantity_completed,
            child_order_dependency_type: step.child_order_dependency_type,
            child_order_minimum_quantity: step.child_order_minimum_quantity,
        }));
    }, [order]);

    // Get current step index
    const currentStepIndex = useMemo(() => {
        return routeSteps.findIndex(s => s.id === currentStepId);
    }, [routeSteps, currentStepId]);

    // Calculate gate status
    const calculateGateStatus = useCallback((
        gate: GateConfiguration,
        precedingStep: RouteStep,
        _order: ManufacturingOrder
    ): GateStatus => {
        switch (gate.dependency_type) {
            case 'all_children_completed': {
                // Check if all child orders have completed the corresponding step
                const allChildrenComplete = order.children?.every(
                    child => child.manufacturing_route?.steps?.some(
                        childStep => childStep.display_position === precedingStep.display_position
                            && childStep.status === 'completed'
                    )
                ) ?? true;

                return {
                    isMet: allChildrenComplete,
                    message: allChildrenComplete
                        ? 'Todas as ordens filhas concluídas'
                        : 'Aguardando ordens filhas',
                };
            }

            case 'children_quantity': {
                const currentQty = precedingStep.cumulative_quantity_completed || 0;
                const requiredQty = gate.minimum_quantity || 0;

                return {
                    isMet: currentQty >= requiredQty,
                    currentProgress: currentQty,
                    requiredProgress: requiredQty,
                    message: `${currentQty} / ${requiredQty} concluído`,
                };
            }

            case 'none':
            default:
                return {
                    isMet: true,
                    message: 'Sem restrição de gate',
                };
        }
    }, [order]);

    // Get gate configuration from step
    const getGateFromStep = useCallback((step: RouteStep): GateConfiguration => {
        if (!step.child_order_dependency_type || step.child_order_dependency_type === 'none') {
            return { dependency_type: 'none' };
        }

        if (step.child_order_dependency_type === 'all_children_completed') {
            return { dependency_type: 'all_children_completed' };
        }

        if (step.child_order_dependency_type === 'children_quantity') {
            return {
                dependency_type: 'children_quantity',
                minimum_quantity: step.child_order_minimum_quantity || 0,
            };
        }

        // Default
        return { dependency_type: 'all_children_completed' };
    }, []);

    // Calculate gate for each step
    const getGateForStep = useCallback((stepIndex: number): { gate: GateConfiguration; status: GateStatus } | null => {
        if (stepIndex < 0 || stepIndex >= routeSteps.length) return null;

        const step = routeSteps[stepIndex];
        const gate = getGateFromStep(step);
        const status = calculateGateStatus(gate, step, order);
        return { gate, status };
    }, [routeSteps, order, getGateFromStep, calculateGateStatus]);

    // Handle step click
    const handleStepClick = useCallback((stepId: number) => {
        onStepChange(stepId);
    }, [onStepChange]);

    // Check if all steps are completed
    const allStepsCompleted = useMemo(() => {
        return routeSteps.every(step => step.status === 'completed');
    }, [routeSteps]);

    // Check if first step is ready to start or has been started
    const firstStepActive = useMemo(() => {
        if (routeSteps.length === 0) return false;
        const firstStepStatus = routeSteps[0].status;
        // Green when queued (ready to start) or already started/completed
        return ['queued', 'in_progress', 'paused', 'completed'].includes(firstStepStatus);
    }, [routeSteps]);

    // Empty state
    if (!order.manufacturing_route?.steps?.length) {
        return (
            <div className={cn("flex items-center justify-center h-full", className)}>
                <p className="text-muted-foreground text-sm">
                    Nenhuma rota definida para esta ordem
                </p>
            </div>
        );
    }

    // Current step not found state
    if (currentStepIndex === -1) {
        return (
            <div className={cn("flex items-center justify-center h-full", className)}>
                <p className="text-muted-foreground text-sm">
                    Etapa atual não encontrada na rota
                </p>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header */}
            <div className="bg-background flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Route className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <h3 className="text-sm font-medium">Progresso da Rota</h3>
                        <p className="text-xs text-muted-foreground">
                            Etapa {currentStepIndex + 1} de {routeSteps.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1 h-0">
                <div className="py-6 px-4 flex flex-col items-center gap-0 min-h-full">
                    {/* Route Start Indicator */}
                    <div className={cn(
                        "w-48 mb-4 px-4 py-2 border-2 rounded-full text-center transition-colors",
                        firstStepActive
                            ? "bg-green-500/10 border-green-500"
                            : "bg-primary/10 border-primary"
                    )}>
                        <div className="flex items-center justify-center gap-2">
                            <PlayCircle className={cn(
                                "h-3.5 w-3.5",
                                firstStepActive ? "text-green-600" : "text-primary"
                            )} />
                            <span className={cn(
                                "text-xs font-semibold uppercase tracking-wide",
                                firstStepActive ? "text-green-600" : "text-primary"
                            )}>
                                Início da Rota
                            </span>
                        </div>
                    </div>

                    {/* All Steps */}
                    {routeSteps.map((step, index) => (
                        <React.Fragment key={step.id}>
                            <StepCard
                                step={step}
                                stepNumber={index + 1}
                                totalSteps={routeSteps.length}
                                isCurrent={index === currentStepIndex}
                                onClick={() => handleStepClick(step.id)}
                            />

                            {/* Gate after this step (if not the last step) */}
                            {index < routeSteps.length - 1 && (() => {
                                const gateInfo = getGateForStep(index);
                                const nextStep = routeSteps[index + 1];
                                const isNextStepReady = nextStep && ['queued', 'in_progress', 'paused', 'completed'].includes(nextStep.status);
                                return gateInfo ? (
                                    <GateIndicator
                                        gate={gateInfo.gate}
                                        gateStatus={gateInfo.status}
                                        nextStepReady={isNextStepReady}
                                    />
                                ) : null;
                            })()}
                        </React.Fragment>
                    ))}

                    {/* Final gate for parent order dependency - always shown */}
                    {(() => {
                        // Get parent dependency gate configuration
                        const parentGate = order.parent_dependency_gate || {
                            has_parent: false,
                            dependency_type: 'none',
                            minimum_quantity: 0,
                        };

                        // Calculate if parent gate is met
                        const calculateParentGateStatus = (): GateStatus => {
                            if (parentGate.dependency_type === 'none') {
                                return {
                                    isMet: true,
                                    message: 'Sem dependência da ordem pai',
                                };
                            }

                            if (parentGate.dependency_type === 'all_children_completed') {
                                const isComplete = order.status === 'completed';
                                return {
                                    isMet: isComplete,
                                    message: isComplete
                                        ? 'Ordem concluída - gate liberado'
                                        : 'Aguardando conclusão desta ordem',
                                };
                            }

                            if (parentGate.dependency_type === 'children_quantity') {
                                const currentQty = order.quantity_completed || 0;
                                const requiredQty = parentGate.minimum_quantity || 0;
                                return {
                                    isMet: currentQty >= requiredQty,
                                    currentProgress: currentQty,
                                    requiredProgress: requiredQty,
                                    message: `${currentQty} / ${requiredQty} concluído`,
                                };
                            }

                            return {
                                isMet: false,
                                message: 'Condição desconhecida',
                            };
                        };

                        const parentGateConfig: GateConfiguration = {
                            dependency_type: parentGate.dependency_type as 'none' | 'all_children_completed' | 'children_quantity',
                            minimum_quantity: parentGate.minimum_quantity,
                        };

                        const parentGateStatus = calculateParentGateStatus();

                        return (
                            <GateIndicator
                                gate={parentGateConfig}
                                gateStatus={parentGateStatus}
                                nextStepReady={false}
                                isFinalGate={true}
                            />
                        );
                    })()}

                    {/* Route End Indicator */}
                    <div className={cn(
                        "w-48 mt-4 px-4 py-2 border-1 rounded-full text-center transition-colors",
                        allStepsCompleted
                            ? "bg-green-500/10 border-green-500"
                            : "bg-muted/50 border-muted-foreground/30"
                    )}>
                        <div className="flex items-center justify-center gap-2">
                            <FlagTriangleRight className={cn(
                                "h-3.5 w-3.5",
                                allStepsCompleted ? "text-green-600" : "text-muted-foreground"
                            )} />
                            <span className={cn(
                                "text-xs font-semibold uppercase tracking-wide",
                                allStepsCompleted ? "text-green-600" : "text-muted-foreground"
                            )}>
                                Fim da Rota
                            </span>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}


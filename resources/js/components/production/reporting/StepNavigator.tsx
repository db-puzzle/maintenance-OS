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

    // Get the three steps to display
    const displaySteps = useMemo(() => {
        const currentIndex = routeSteps.findIndex(s => s.id === currentStepId);
        
        if (currentIndex === -1) {
            // If current step not found, return empty
            return {
                previous: null,
                current: null,
                next: null,
                currentIndex: -1,
            };
        }

        return {
            previous: currentIndex > 0 ? routeSteps[currentIndex - 1] : null,
            current: routeSteps[currentIndex],
            next: currentIndex < routeSteps.length - 1 ? routeSteps[currentIndex + 1] : null,
            currentIndex,
        };
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

    // Calculate gates
    const gates = useMemo(() => {
        const result = {
            beforeCurrent: null as { gate: GateConfiguration; status: GateStatus } | null,
            afterCurrent: null as { gate: GateConfiguration; status: GateStatus } | null,
        };

        if (displaySteps.previous && displaySteps.current) {
            const gate = getGateFromStep(displaySteps.previous);
            const status = calculateGateStatus(gate, displaySteps.previous, order);
            result.beforeCurrent = { gate, status };
        }

        if (displaySteps.current && displaySteps.next) {
            const gate = getGateFromStep(displaySteps.current);
            const status = calculateGateStatus(gate, displaySteps.current, order);
            result.afterCurrent = { gate, status };
        }

        return result;
    }, [displaySteps, order, getGateFromStep, calculateGateStatus]);

    // Handle step click
    const handleStepClick = useCallback((stepId: number) => {
        onStepChange(stepId);
    }, [onStepChange]);

    // Check if we're at the first or last step
    const isFirstStep = displaySteps.currentIndex === 0;
    const isLastStep = displaySteps.currentIndex === routeSteps.length - 1;

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
    if (!displaySteps.current) {
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
            <div className="px-4 py-3 border-b bg-background">
                <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <h3 className="text-sm font-medium">Progresso da Rota</h3>
                        <p className="text-xs text-muted-foreground">
                            Etapa {displaySteps.currentIndex + 1} de {routeSteps.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1">
                <div className="py-6 px-4 flex flex-col items-center gap-0 min-h-full">
                    {/* Route Start Indicator */}
                    {isFirstStep && (
                        <div className="w-48 mb-4 px-4 py-2 bg-primary/10 border-2 border-primary rounded-full text-center">
                            <div className="flex items-center justify-center gap-2">
                                <PlayCircle className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                    Início da Rota
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Previous Step */}
                    {displaySteps.previous && (
                        <>
                            <StepCard
                                step={displaySteps.previous}
                                stepNumber={displaySteps.currentIndex}
                                totalSteps={routeSteps.length}
                                isCurrent={false}
                                onClick={() => handleStepClick(displaySteps.previous!.id)}
                            />
                            
                            {/* Gate before current */}
                            {gates.beforeCurrent && (
                                <GateIndicator
                                    gate={gates.beforeCurrent.gate}
                                    gateStatus={gates.beforeCurrent.status}
                                />
                            )}
                        </>
                    )}

                    {/* Current Step */}
                    <StepCard
                        step={displaySteps.current}
                        stepNumber={displaySteps.currentIndex + 1}
                        totalSteps={routeSteps.length}
                        isCurrent={true}
                        onClick={() => handleStepClick(displaySteps.current!.id)}
                    />

                    {/* Next Step */}
                    {displaySteps.next && (
                        <>
                            {/* Gate after current */}
                            {gates.afterCurrent && (
                                <GateIndicator
                                    gate={gates.afterCurrent.gate}
                                    gateStatus={gates.afterCurrent.status}
                                />
                            )}
                            
                            <StepCard
                                step={displaySteps.next}
                                stepNumber={displaySteps.currentIndex + 2}
                                totalSteps={routeSteps.length}
                                isCurrent={false}
                                onClick={() => handleStepClick(displaySteps.next!.id)}
                            />
                        </>
                    )}

                    {/* Route End Indicator */}
                    {isLastStep && (
                        <div className="w-48 mt-4 px-4 py-2 bg-green-500/10 border-2 border-green-500 rounded-full text-center">
                            <div className="flex items-center justify-center gap-2">
                                <FlagTriangleRight className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                                    Fim da Rota
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}


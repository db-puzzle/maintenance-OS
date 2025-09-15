import React, { useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { StepCard } from './StepCard';
import { GateCard, GateConfiguration } from './GateCard';
import { ManufacturingStep } from '@/types/production';
import { cn } from '@/lib/utils';

export interface ExtendedManufacturingStep extends ManufacturingStep {
    isNew?: boolean;
    gate_after?: GateConfiguration;
}

interface RouteFlowViewProps {
    steps: ExtendedManufacturingStep[];
    selectedStep: ExtendedManufacturingStep | null;
    selectedGateId: string | null;
    onStepSelect: (step: ExtendedManufacturingStep | null) => void;
    onGateSelect: (gateId: string) => void;
    onStepAdd: () => void;
    onStepDelete: (step: ExtendedManufacturingStep) => void;
    onStepUpdate: (stepId: number, updates: Partial<ExtendedManufacturingStep>) => void;
    onGateUpdate: (stepId: number, gate: GateConfiguration) => void;
    canEdit: boolean;
    viewMode?: boolean;
}

export default function RouteFlowView({
    steps,
    selectedStep,
    selectedGateId,
    onStepSelect,
    onGateSelect,
    onStepAdd,
    onStepDelete,
    onStepUpdate,
    onGateUpdate,
    canEdit,
    viewMode = false
}: RouteFlowViewProps) {
    // Handle step click
    const handleStepClick = useCallback((step: ExtendedManufacturingStep) => {
        if (!viewMode) {
            onStepSelect(step.id === selectedStep?.id ? null : step);
        }
    }, [selectedStep, onStepSelect, viewMode]);

    // Handle gate click
    const handleGateClick = useCallback((gateId: string) => {
        if (!viewMode) {
            onGateSelect(gateId);
        }
    }, [onGateSelect, viewMode]);

    // Handle gate update
    const handleGateChange = useCallback((stepId: number, gate: GateConfiguration) => {
        onGateUpdate(stepId, gate);
    }, [onGateUpdate]);

    // Handle background click to deselect
    const handleBackgroundClick = useCallback(() => {
        onStepSelect(null);
    }, [onStepSelect]);

    return (
        <div className="flex flex-col h-full bg-muted/20">
            {/* Header */}
            <div className="border-b bg-background px-4 py-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Fluxo de Produção</h3>
                    {canEdit && !viewMode && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onStepAdd}
                            className="h-8"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar Etapa
                        </Button>
                    )}
                </div>
            </div>

            {/* Flow View */}
            <ScrollArea
                className="flex-1"
                onClick={handleBackgroundClick}
            >
                <div className="p-8 min-h-full">
                    {steps.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <p className="text-muted-foreground mb-4">
                                    Nenhuma etapa criada ainda
                                </p>
                                {canEdit && !viewMode && (
                                    <Button
                                        variant="outline"
                                        onClick={onStepAdd}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Criar Primeira Etapa
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto">
                            {steps.map((step, index) => (
                                <div key={step.id} className="relative">
                                    {/* Step Card */}
                                    <div
                                        className="relative"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <StepCard
                                            step={step}
                                            onClick={() => handleStepClick(step)}
                                            onDelete={canEdit && !viewMode ? () => onStepDelete(step) : undefined}
                                            selected={selectedStep?.id === step.id}
                                            disabled={viewMode}
                                            showStatus={false}
                                            canDelete={canEdit && !viewMode && steps.length > 1}
                                            className={cn(
                                                "mx-auto transition-all",
                                                selectedStep?.id === step.id && "scale-[1.02]"
                                            )}
                                        />
                                    </div>

                                    {/* Gate after step */}
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <GateCard
                                            gate={step.gate_after || { dependency_type: 'all_children_completed' }}
                                            isSelected={selectedGateId === `gate-after-${step.id}`}
                                            onClick={() => handleGateClick(`gate-after-${step.id}`)}
                                            disabled={viewMode || !canEdit}
                                            isFinalGate={index === steps.length - 1}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

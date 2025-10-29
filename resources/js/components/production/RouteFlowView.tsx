import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { StepCard } from './StepCard';
import { GateCard, GateConfiguration } from './GateCard';
import { ParentMOContinuationCard } from './ParentMOContinuationCard';
import { ManufacturingStep, ManufacturingOrder } from '@/types/production';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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
    onStepUpdate?: (stepId: number, updates: Partial<ExtendedManufacturingStep>) => void;
    onGateUpdate: (stepId: number, gate: GateConfiguration) => void;
    canEdit: boolean;
    viewMode?: boolean;
    parentMO?: Pick<ManufacturingOrder, 'id' | 'order_number' | 'item'> | null;
    onParentMOClick?: () => void;
    itemCategoryName?: string;
}

export default function RouteFlowView({
    steps,
    selectedStep,
    selectedGateId,
    onStepSelect,
    onGateSelect,
    onStepAdd,
    onStepDelete,
    onStepUpdate: _onStepUpdate,
    onGateUpdate: _onGateUpdate,
    canEdit,
    viewMode = false,
    parentMO,
    onParentMOClick,
    itemCategoryName
}: RouteFlowViewProps) {
    // State for delete confirmation dialog
    const [stepToDelete, setStepToDelete] = useState<ExtendedManufacturingStep | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Handle step click
    const handleStepClick = useCallback((step: ExtendedManufacturingStep) => {
        if (!viewMode) {
            onStepSelect(step.id === selectedStep?.id ? null : step);
        }
    }, [selectedStep, onStepSelect, viewMode]);

    // Handle delete confirmation
    const handleDeleteClick = useCallback((step: ExtendedManufacturingStep) => {
        setStepToDelete(step);
        setShowDeleteDialog(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (stepToDelete) {
            onStepDelete(stepToDelete);
            setShowDeleteDialog(false);
            setStepToDelete(null);
        }
    }, [stepToDelete, onStepDelete]);

    // Handle gate click
    const handleGateClick = useCallback((gateId: string) => {
        if (!viewMode) {
            onGateSelect(gateId);
        }
    }, [onGateSelect, viewMode]);

    // Handle gate update is passed directly to components

    // Handle background click to deselect
    const handleBackgroundClick = useCallback(() => {
        onStepSelect(null);
    }, [onStepSelect]);

    return (
        <div className="flex flex-col h-full bg-muted/20 overflow-hidden">
            {/* Header */}
            <div className="border-b bg-background px-4 py-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium">Fluxo de Produção</h3>
                        {itemCategoryName && (
                            <p className="text-xs text-muted-foreground mt-0.5">{itemCategoryName}</p>
                        )}
                    </div>
                    {canEdit && !viewMode && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onStepAdd();
                            }}
                            className="h-8"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar Etapa
                        </Button>
                    )}
                </div>
            </div>

            {/* Flow View */}
            <div
                className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-corner]:bg-transparent"
                onClick={handleBackgroundClick}
            >
                <div
                    className="p-8 pb-24"
                    onClick={(e) => {
                        // Only trigger background click if clicking directly on this div
                        if (e.target === e.currentTarget) {
                            handleBackgroundClick();
                        }
                    }}
                >
                    {steps.length === 0 ? (
                        parentMO && onParentMOClick ? (
                            // Empty route with parent MO - show direct flow
                            <div className="relative flex flex-col items-center">
                                {/* Long solid line with button */}
                                <div className="relative h-32 flex flex-col items-center justify-center">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-0.5 h-full bg-border" />
                                    </div>

                                    {/* Button on the line */}
                                    {canEdit && !viewMode && (
                                        <Button
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onStepAdd();
                                            }}
                                            className="relative z-10 bg-background"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Criar Primeira Etapa
                                        </Button>
                                    )}
                                </div>

                                {/* Parent MO Card */}
                                <ParentMOContinuationCard
                                    parentMO={parentMO}
                                    onClick={onParentMOClick}
                                    showConnectionLine={false}
                                />
                            </div>
                        ) : (
                            // No parent MO - show original empty state
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <p className="text-muted-foreground mb-4">
                                        Nenhuma etapa criada ainda
                                    </p>
                                    {canEdit && !viewMode && (
                                        <Button
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onStepAdd();
                                            }}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Criar Primeira Etapa
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
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
                                            onDelete={canEdit && !viewMode ? () => handleDeleteClick(step) : undefined}
                                            selected={selectedStep?.id === step.id}
                                            disabled={viewMode}
                                            showStatus={false}
                                            canDelete={canEdit && !viewMode}
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

                            {/* Parent MO Continuation Card - shown after the last gate */}
                            {parentMO && onParentMOClick && steps.length > 0 && (
                                <div
                                    className="relative mt-8"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ParentMOContinuationCard
                                        parentMO={parentMO}
                                        onClick={onParentMOClick}
                                        className="mx-auto"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar exclusão</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-1">
                                <div>Tem certeza que deseja excluir a etapa "{stepToDelete?.name}"?</div>
                                <div>Esta ação não pode ser desfeita.</div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                        >
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

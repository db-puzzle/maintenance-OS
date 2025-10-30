import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StateButton from '@/components/StateButton';

import { ManufacturingStep } from '@/types/production';
import { GateConfiguration } from '@/components/production/GateCard';
import { cn } from '@/lib/utils';
import { CheckCircle2, Package, AlignStartVerticalIcon } from 'lucide-react';
import { formatNumber, parseNumber } from '@/utils/number';

interface GatePropertiesPanelProps {
    selectedGate: GateConfiguration | null;
    precedingStep: ManufacturingStep | null;
    followingStep?: ManufacturingStep | null;
    gateId: string | null;
    onGateUpdate: (gate: GateConfiguration) => void;
    isOpen: boolean;
    viewMode?: boolean;
    manufacturingOrderQuantity?: number;
}

export default function GatePropertiesPanel({
    selectedGate,
    precedingStep,
    followingStep,
    onGateUpdate,
    isOpen,
    viewMode = false,
    manufacturingOrderQuantity
}: GatePropertiesPanelProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [lastSelectedGate, setLastSelectedGate] = useState<GateConfiguration | null>(null);

    // Keep the last valid precedingStep and followingStep for animation/save purposes
    const [lastPrecedingStep, setLastPrecedingStep] = useState<ManufacturingStep | null>(null);
    const [lastFollowingStep, setLastFollowingStep] = useState<ManufacturingStep | null>(null);

    // Form for gate configuration
    const gateForm = useForm<{
        dependency_type: GateConfiguration['dependency_type'];
        minimum_quantity: number;
        description?: string;
    }>({
        dependency_type: 'all_children_completed',
        minimum_quantity: 0,
        description: ''
    });

    // Keep track of the last selected gate for animation purposes
    useEffect(() => {
        if (selectedGate) {
            setLastSelectedGate(selectedGate);
            gateForm.setData({
                dependency_type: selectedGate.dependency_type,
                minimum_quantity: selectedGate.minimum_quantity || 0,
                description: ''
            });
        }
    }, [selectedGate]);

    // Handle panel visibility animation
    useEffect(() => {
        if (isOpen) {
            // Show the component
            setShouldRender(true);
            // Small delay to ensure the DOM is ready for animation
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 10);
            return () => clearTimeout(timer);
        } else {
            // Hide with animation
            setIsVisible(false);
            // Remove from DOM after animation completes
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300); // Match the animation duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (precedingStep) {
            setLastPrecedingStep(precedingStep);
        }
        if (followingStep !== undefined) {
            setLastFollowingStep(followingStep);
        }
    }, [precedingStep, followingStep]);

    // Use the current selected gate or the last one during exit animation
    const displayGate = selectedGate || lastSelectedGate;

    // Use current or last valid data
    const displayPrecedingStep = precedingStep || lastPrecedingStep;
    const displayFollowingStep = followingStep !== undefined ? followingStep : lastFollowingStep;

    // Don't render if not supposed to
    if (!shouldRender) {
        return null;
    }

    // Safety check - but only if we truly have no data at all
    if (!displayGate || !displayPrecedingStep) {
        return null;
    }

    const isFinalGate = !displayFollowingStep;

    const handleDependencyTypeChange = (value: GateConfiguration['dependency_type']) => {
        const newGate: GateConfiguration = {
            dependency_type: value,
        };

        // Only keep minimum_quantity if the type is children_quantity
        if (value === 'children_quantity') {
            // Ensure minimum quantity is at least 1 when switching to this type
            let currentQty = Math.max(1, gateForm.data.minimum_quantity || 0);

            // Also ensure it doesn't exceed the manufacturing order quantity
            if (manufacturingOrderQuantity !== undefined && currentQty > manufacturingOrderQuantity) {
                currentQty = manufacturingOrderQuantity;
            }

            newGate.minimum_quantity = currentQty;
            gateForm.setData('minimum_quantity', newGate.minimum_quantity);
        }

        gateForm.setData('dependency_type', value);
        onGateUpdate(newGate);
    };

    const handleMinimumQuantityChange = (value: number) => {
        // Ensure minimum value is always at least 1
        let validatedValue = Math.max(1, value);

        // If we have a manufacturing order quantity, ensure we don't exceed it
        if (manufacturingOrderQuantity !== undefined && validatedValue > manufacturingOrderQuantity) {
            validatedValue = manufacturingOrderQuantity;
        }

        gateForm.setData('minimum_quantity', validatedValue);
        if (gateForm.data.dependency_type === 'children_quantity') {
            onGateUpdate({
                dependency_type: 'children_quantity',
                minimum_quantity: validatedValue
            });
        }
    };

    return (
        <div className={cn(
            "w-[28rem] h-full flex-shrink-0 border-l bg-background flex flex-col overflow-hidden",
            "transform transition-all duration-300 ease-out",
            isVisible
                ? "translate-x-0"
                : "translate-x-full"
        )}>

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-corner]:bg-transparent">
                <div className="p-4 space-y-4">
                    {/* Dependency Type Selection */}
                    <div className="space-y-4">

                        {/* Information Panel */}
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-2">
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Como funcionam os gates?
                            </h4>
                            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                <li>• Gates controlam quando etapas podem iniciar baseado em dependências</li>
                                <li>• Ordens filhas são criadas quando a ordem pai tem múltiplos componentes</li>
                                <li>• A configuração de quantidade permite produção paralela eficiente</li>
                                {isFinalGate && (
                                    <li>• O gate pai determina quando a ordem principal pode começar a consumir a produção desta ordem</li>
                                )}
                            </ul>
                        </div>

                        <h3 className="text-sm font-medium">
                            {isFinalGate
                                ? 'Quando a ordem pai pode começar a usar esta produção?'
                                : `Quando ${displayFollowingStep?.name || 'próxima etapa'} pode iniciar?`
                            }
                        </h3>

                        <div className="space-y-3">
                            <StateButton
                                icon={CheckCircle2}
                                title={isFinalGate ? 'Ordem completa' : 'Todas as unidades completas'}
                                description={isFinalGate
                                    ? 'Toda esta ordem deve ser concluída antes de iniciar a próxima etapa'
                                    : 'Todas as unidades devem ser concluídas antes de iniciar a próxima etapa'
                                }
                                selected={gateForm.data.dependency_type === 'all_children_completed'}
                                onClick={() => handleDependencyTypeChange('all_children_completed')}
                                disabled={viewMode}
                                variant="default"
                            />

                            <StateButton
                                icon={Package}
                                title={isFinalGate ? 'Quantidade mínima produzida' : 'Quantidade mínima produzida'}
                                description={isFinalGate
                                    ? 'Ordem pai pode iniciar após a quantidade mínima requerida ser produzida'
                                    : 'Aguardar quantidade mínima de produção para iniciar a próxima etapa'
                                }
                                selected={gateForm.data.dependency_type === 'children_quantity'}
                                onClick={() => handleDependencyTypeChange('children_quantity')}
                                disabled={viewMode}
                                variant="default"
                            />
                            {gateForm.data.dependency_type === 'children_quantity' && (
                                <div className="border-l border-gray-200">
                                    <div className="ml-6 space-y-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="gate-min-qty" className="text-sm font-medium">
                                                Quantidade Mínima Requerida
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="gate-min-qty"
                                                    type="text"
                                                    value={formatNumber(gateForm.data.minimum_quantity)}
                                                    onChange={(e) => {
                                                        const parsedValue = parseNumber(e.target.value);
                                                        if (!isNaN(parsedValue) && parsedValue >= 1) {
                                                            handleMinimumQuantityChange(parsedValue);
                                                        }
                                                    }}
                                                    disabled={viewMode}
                                                    placeholder="1"
                                                    min="1"
                                                    max={manufacturingOrderQuantity}
                                                    className="flex-1"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {isFinalGate
                                                    ? 'A Order Pai poderá ser iniciada quando TODAS as ordens filhas tiverem pelo menos esta quantidade completa'
                                                    : 'Quantidade mínima necessária para a próxima etapa iniciar'
                                                }
                                                {manufacturingOrderQuantity !== undefined && (
                                                    <span className="block mt-1 text-orange-600 dark:text-orange-400">
                                                        Máximo: {formatNumber(manufacturingOrderQuantity)} (quantidade da ordem)
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <StateButton
                                icon={AlignStartVerticalIcon}
                                title="Simultâneo"
                                description={isFinalGate
                                    ? 'A ordem pai pode iniciar imediatamente após o início da etapa anterior'
                                    : 'A próxima etapa pode iniciar imediatamente após o início da etapa anterior'
                                }
                                selected={gateForm.data.dependency_type === 'none'}
                                onClick={() => handleDependencyTypeChange('none')}
                                disabled={viewMode}
                                variant="default"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

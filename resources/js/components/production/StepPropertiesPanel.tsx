import React, { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { ItemSelect } from '@/components/ItemSelect';
import CreateWorkCellSheet from '@/components/production/CreateWorkCellSheet';
import { ManufacturingRoute, ManufacturingStep, WorkCell } from '@/types/production';
import { Form } from '@/types/work-order';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import StateButton from '@/components/StateButton';
import { Timer, Zap, Building, Truck } from 'lucide-react';
import { useFeature, FEATURES } from '@/utils/features';

interface ExtendedManufacturingStep extends ManufacturingStep {
    isNew?: boolean;
}

interface Props {
    selectedStep: ExtendedManufacturingStep | null;
    steps: ExtendedManufacturingStep[];
    stepForm: ReturnType<typeof useForm<{
        name: string;
        description: string;
        step_type: string;
        work_cell_id: string;
        setup_time_minutes: number;
        cycle_time_minutes: number;
        depends_on_step_id: string;
        can_start_when_dependency: 'completed';
        quality_check_mode?: string;
        sampling_size?: number;
        form_id?: string;
        use_workcell_throughput?: boolean;
        execution_location?: string;
        manufacturer_id?: number | null;
        expected_lead_time_days?: number | null;
    }>>;
    stepTypes: Record<string, string>;
    workCells: WorkCell[];
    forms: Form[];
    routing: ManufacturingRoute;
    plants?: {
        id: number;
        name: string;
    }[];
    shifts?: {
        id: number;
        name: string;
    }[];
    manufacturers?: {
        id: number;
        name: string;
    }[];
    unitsOfMeasure?: {
        id: number;
        code: string;
        name: string;
        symbol?: string;
        uom_type: 'COUNT' | 'MASS' | 'LENGTH' | 'AREA' | 'VOLUME' | 'TIME';
    }[];

    isSaving: boolean;
    onLocalStepUpdate: (stepId: number, updates: Partial<ExtendedManufacturingStep>) => void;
    isOpen: boolean;
    viewMode?: boolean;
}

export default function StepPropertiesPanel({
    selectedStep,
    steps,
    stepForm,
    stepTypes,
    workCells,
    forms,
    routing,
    plants,
    shifts,
    manufacturers,
    unitsOfMeasure,

    isSaving,
    onLocalStepUpdate,
    isOpen,
    viewMode = false
}: Props) {
    // Feature flags
    const hasAdvancedStepTypes = useFeature(FEATURES.PRODUCTION_STEP_TYPES_ADVANCED);
    const hasFormsEngine = useFeature(FEATURES.PRODUCTION_FORMS_ENGINE);
    const hasScheduler = useFeature(FEATURES.PRODUCTION_SCHEDULER);

    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [lastSelectedStep, setLastSelectedStep] = useState<ExtendedManufacturingStep | null>(null);
    const [workCellSheetOpen, setWorkCellSheetOpen] = useState(false);
    const workCellSelectRef = useRef<HTMLButtonElement>(null);


    // Keep track of the last selected step for animation purposes
    useEffect(() => {
        if (selectedStep) {
            setLastSelectedStep(selectedStep);
        }
    }, [selectedStep]);


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

    // Don't render if not supposed to
    if (!shouldRender) {
        return null;
    }

    // Use the current selected step or the last one during exit animation
    const displayStep = selectedStep || lastSelectedStep;

    // Safety check
    if (!displayStep) {
        return null;
    }

    return (
        <div className={cn(
            "w-[28rem] h-full flex-shrink-0 border-l bg-background flex flex-col overflow-hidden",
            "transform transition-all duration-300 ease-out",
            isVisible
                ? "translate-x-0 opacity-100"
                : "translate-x-full opacity-0"
        )}>

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-corner]:bg-transparent">
                <div className="p-4 space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input
                                    value={stepForm.data.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        stepForm.setData('name', newName);

                                        // Update local state immediately
                                        if (displayStep) {
                                            onLocalStepUpdate(displayStep.id, { name: newName });
                                        }
                                    }}
                                    disabled={isSaving || viewMode}
                                    className={cn((isSaving || viewMode) && "opacity-50")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo de Etapa</Label>
                                <Select
                                    value={stepForm.data.step_type}
                                    onValueChange={(value) => {
                                        stepForm.setData('step_type', value);
                                        if (displayStep) {
                                            onLocalStepUpdate(displayStep.id, { step_type: value as ManufacturingStep['step_type'] });
                                        }
                                    }}
                                    disabled={viewMode || !hasAdvancedStepTypes}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(stepTypes).map(([value, label]) => {
                                            // If advanced step types are not enabled, only show 'standard'
                                            if (!hasAdvancedStepTypes && value !== 'standard') {
                                                return null;
                                            }
                                            return (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Execution Location */}
                    <div className="space-y-3">
                        <Label>Local de Execução</Label>
                        <div className="space-y-3">
                            <StateButton
                                icon={Building}
                                title="Execução Interna"
                                description="Executado nas suas instalações"
                                selected={stepForm.data.execution_location !== 'external'}
                                onClick={() => {
                                    stepForm.setData('execution_location', 'internal');
                                    stepForm.setData('manufacturer_id', null);
                                    stepForm.setData('expected_lead_time_days', null);
                                    if (displayStep) {
                                        onLocalStepUpdate(displayStep.id, {
                                            execution_location: 'internal',
                                            manufacturer_id: null,
                                            expected_lead_time_days: null,
                                        });
                                    }
                                }}
                                disabled={isSaving || viewMode}
                            />

                            {stepForm.data.execution_location !== 'external' && (
                                <div className="border-l border-gray-200">
                                    <div className="ml-6 space-y-4">
                                        <div className="space-y-2">
                                            <ItemSelect
                                                ref={workCellSelectRef}
                                                label="Célula de Trabalho"
                                                items={workCells.map(wc => ({
                                                    id: wc.id,
                                                    name: wc.name,
                                                }))}
                                                value={stepForm.data.work_cell_id}
                                                onValueChange={(value) => {
                                                    stepForm.setData('work_cell_id', value);
                                                    if (displayStep) {
                                                        const selectedWorkCell = value ? workCells.find(wc => wc.id === parseInt(value)) : undefined;
                                                        onLocalStepUpdate(displayStep.id, {
                                                            work_cell_id: value ? parseInt(value) : undefined,
                                                            work_cell: selectedWorkCell
                                                        });
                                                    }
                                                }}
                                                onCreateClick={handleCreateWorkCellClick}
                                                placeholder={viewMode && !stepForm.data.work_cell_id ? 'Célula não selecionada' : 'Selecione uma célula...'}
                                                disabled={viewMode}
                                                canClear={!viewMode}
                                                view={viewMode}
                                            />
                                        </div>

                                        {/* Time Settings - Nested under Internal Execution - Only show if scheduler feature is enabled */}
                                        {hasScheduler && (
                                            <div className="space-y-3">
                                                <StateButton
                                                    icon={Timer}
                                                    title="Tempo de Fabricação Específico"
                                                    description="Definir tempo de setup e ciclo para esta etapa"
                                                    selected={!stepForm.data.use_workcell_throughput}
                                                    onClick={() => {
                                                        stepForm.setData('use_workcell_throughput', false);

                                                        if (displayStep) {
                                                            // Always update use_workcell_throughput to trigger unsaved state
                                                            const updates: Partial<ExtendedManufacturingStep> = {
                                                                use_workcell_throughput: false
                                                            };

                                                            // When switching back to specific times, restore the original values if they were zero
                                                            if (stepForm.data.setup_time_minutes === 0 && stepForm.data.cycle_time_minutes === 0) {
                                                                // Restore original values from the selected step
                                                                const originalSetupTime = displayStep.setup_time_minutes || 0;
                                                                const originalCycleTime = displayStep.cycle_time_minutes || 0;
                                                                stepForm.setData('setup_time_minutes', originalSetupTime);
                                                                stepForm.setData('cycle_time_minutes', originalCycleTime);
                                                                updates.setup_time_minutes = originalSetupTime;
                                                                updates.cycle_time_minutes = originalCycleTime;
                                                            }

                                                            onLocalStepUpdate(displayStep.id, updates);
                                                        }
                                                    }}
                                                    disabled={isSaving || viewMode}
                                                    size="compact"
                                                />
                                                {!stepForm.data.use_workcell_throughput && (
                                                    <div className="border-l border-gray-200">
                                                        <div className="ml-6 space-y-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label>Tempo de Setup (min)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={stepForm.data.setup_time_minutes}
                                                                        onChange={(e) => {
                                                                            const value = parseInt(e.target.value) || 0;
                                                                            stepForm.setData('setup_time_minutes', value);
                                                                            if (displayStep) {
                                                                                onLocalStepUpdate(displayStep.id, { setup_time_minutes: value });
                                                                            }
                                                                        }}
                                                                        disabled={viewMode}
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label>Tempo de Ciclo (min)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={stepForm.data.cycle_time_minutes}
                                                                        onChange={(e) => {
                                                                            const value = parseInt(e.target.value) || 0;
                                                                            stepForm.setData('cycle_time_minutes', value);
                                                                            if (displayStep) {
                                                                                onLocalStepUpdate(displayStep.id, { cycle_time_minutes: value });
                                                                            }
                                                                        }}
                                                                        disabled={viewMode}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="bg-muted rounded-lg p-3">
                                                                <p className="text-sm">
                                                                    <span className="text-muted-foreground">Tempo total estimado:</span>{' '}
                                                                    <span className="font-medium">
                                                                        {stepForm.data.setup_time_minutes + (stepForm.data.cycle_time_minutes * (routing.manufacturing_order?.quantity || 1))} min
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <StateButton
                                                    icon={Zap}
                                                    title="Utilizar Throughput Padrão da Célula"
                                                    description="Usar a taxa de produção padrão da célula de trabalho"
                                                    selected={stepForm.data.use_workcell_throughput === true}
                                                    onClick={() => {
                                                        stepForm.setData('use_workcell_throughput', true);
                                                        // Set setup and cycle times to zero when using workcell throughput
                                                        stepForm.setData('setup_time_minutes', 0);
                                                        stepForm.setData('cycle_time_minutes', 0);
                                                        if (displayStep) {
                                                            const updates = {
                                                                use_workcell_throughput: true,
                                                                setup_time_minutes: 0,
                                                                cycle_time_minutes: 0
                                                            };
                                                            onLocalStepUpdate(displayStep.id, updates);
                                                        }
                                                    }}
                                                    disabled={isSaving || viewMode || !stepForm.data.work_cell_id}
                                                    size="compact"
                                                />
                                                {stepForm.data.use_workcell_throughput && stepForm.data.work_cell_id && (
                                                    <div className="border-l border-gray-200">
                                                        <div className="ml-6 space-y-4">
                                                            {(() => {
                                                                const selectedWorkCell = workCells.find(wc => wc.id === parseInt(stepForm.data.work_cell_id));
                                                                if (!selectedWorkCell) return null;

                                                                return (
                                                                    <>
                                                                        <div className="bg-muted rounded-lg p-3 space-y-2">
                                                                            <p className="text-sm">
                                                                                <span className="text-muted-foreground">Taxa de Produção:</span>{' '}
                                                                                <span className="font-medium">
                                                                                    {selectedWorkCell.default_production_rate_per_hour || 'Não definida'} {selectedWorkCell.default_unit_of_measure}/hora
                                                                                </span>
                                                                            </p>
                                                                            <p className="text-sm">
                                                                                <span className="text-muted-foreground">Tempo de Setup Padrão:</span>{' '}
                                                                                <span className="font-medium">
                                                                                    {selectedWorkCell.default_setup_time_minutes || 0} min
                                                                                </span>
                                                                            </p>
                                                                            {selectedWorkCell.default_production_rate_per_hour && routing.manufacturing_order?.quantity && (
                                                                                <p className="text-sm">
                                                                                    <span className="text-muted-foreground">Tempo total estimado:</span>{' '}
                                                                                    <span className="font-medium">
                                                                                        {Math.ceil((routing.manufacturing_order.quantity / selectedWorkCell.default_production_rate_per_hour) * 60) + (selectedWorkCell.default_setup_time_minutes || 0)} min
                                                                                    </span>
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        {!selectedWorkCell.default_production_rate_per_hour && (
                                                                            <p className="text-sm text-amber-600">
                                                                                A célula selecionada não possui taxa de produção configurada.
                                                                            </p>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                                {stepForm.data.use_workcell_throughput && !stepForm.data.work_cell_id && (
                                                    <div className="border-l border-gray-200">
                                                        <div className="ml-6">
                                                            <p className="text-sm text-muted-foreground">
                                                                Selecione uma célula de trabalho para usar o throughput padrão.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <StateButton
                                icon={Truck}
                                title="Execução Externa"
                                description="Executado por fabricante terceirizado"
                                selected={stepForm.data.execution_location === 'external'}
                                onClick={() => {
                                    stepForm.setData('execution_location', 'external');
                                    if (displayStep) {
                                        onLocalStepUpdate(displayStep.id, {
                                            execution_location: 'external',
                                        });
                                    }
                                }}
                                disabled={isSaving || viewMode}
                            />

                            {stepForm.data.execution_location === 'external' && (
                                <div className="border-l border-gray-200">
                                    <div className="ml-6 space-y-4">
                                        <div className="space-y-2">
                                            <ItemSelect
                                                label="Fabricante"
                                                items={manufacturers?.map(m => ({
                                                    id: m.id,
                                                    name: m.name,
                                                })) || []}
                                                value={stepForm.data.manufacturer_id?.toString() || ''}
                                                onValueChange={(value) => {
                                                    const manufacturerId = value ? parseInt(value) : null;
                                                    stepForm.setData('manufacturer_id', manufacturerId);
                                                    if (displayStep) {
                                                        const selectedManufacturer = value
                                                            ? manufacturers?.find(m => m.id === parseInt(value))
                                                            : undefined;
                                                        onLocalStepUpdate(displayStep.id, {
                                                            manufacturer_id: manufacturerId,
                                                            manufacturer: selectedManufacturer
                                                        });
                                                    }
                                                }}
                                                placeholder="Selecione um fabricante..."
                                                disabled={viewMode}
                                                canClear={!viewMode}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Lead Time Esperado (dias)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={stepForm.data.expected_lead_time_days || ''}
                                                onChange={(e) => {
                                                    const value = parseInt(e.target.value) || null;
                                                    stepForm.setData('expected_lead_time_days', value);
                                                    if (displayStep) {
                                                        onLocalStepUpdate(displayStep.id, {
                                                            expected_lead_time_days: value
                                                        });
                                                    }
                                                }}
                                                disabled={viewMode}
                                                placeholder="Ex: 10"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Tempo estimado para o fabricante processar e retornar os itens
                                            </p>
                                        </div>

                                        {stepForm.data.manufacturer_id && (
                                            <div className="bg-muted rounded-lg p-3">
                                                <p className="text-sm">
                                                    <span className="text-muted-foreground">Fabricante:</span>{' '}
                                                    <span className="font-medium">
                                                        {manufacturers?.find(m => m.id === stepForm.data.manufacturer_id)?.name}
                                                    </span>
                                                </p>
                                                {stepForm.data.expected_lead_time_days && (
                                                    <p className="text-sm mt-1">
                                                        <span className="text-muted-foreground">Lead Time:</span>{' '}
                                                        <span className="font-medium">
                                                            {stepForm.data.expected_lead_time_days} dias
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quality Check Settings */}
                    {stepForm.data.step_type === 'quality_check' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Modo de Verificação</Label>
                                    <Select
                                        value={stepForm.data.quality_check_mode}
                                        onValueChange={(value) => {
                                            stepForm.setData('quality_check_mode', value);
                                            if (displayStep) {
                                                onLocalStepUpdate(displayStep.id, {
                                                    quality_check_mode: value as ManufacturingStep['quality_check_mode']
                                                });
                                            }
                                        }}
                                        disabled={viewMode}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="every_part">Cada Peça</SelectItem>
                                            <SelectItem value="entire_lot">Lote Inteiro</SelectItem>
                                            <SelectItem value="sampling">Amostragem</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {stepForm.data.quality_check_mode === 'sampling' && (
                                    <div className="space-y-2">
                                        <Label>Tamanho da Amostra</Label>
                                        <Input
                                            type="number"
                                            value={stepForm.data.sampling_size}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value) || 0;
                                                stepForm.setData('sampling_size', value);
                                                if (displayStep) {
                                                    onLocalStepUpdate(displayStep.id, { sampling_size: value });
                                                }
                                            }}
                                            disabled={viewMode}
                                        />
                                    </div>
                                )}
                            </div>
                            {stepForm.data.quality_check_mode === 'sampling' && (
                                <p className="text-xs text-muted-foreground">
                                    Deixe 0 para usar ISO 2859
                                </p>
                            )}
                        </div>
                    )}

                    {/* Form Association - Only show if forms engine feature is enabled */}
                    {hasFormsEngine && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Formulário Associado</Label>
                                <ItemSelect
                                    items={forms.map(f => ({
                                        id: f.id,
                                        name: f.name,
                                        value: f.id.toString(),
                                    }))}
                                    value={stepForm.data.form_id || ''}
                                    onValueChange={(value) => {
                                        stepForm.setData('form_id', value);
                                        if (displayStep) {
                                            onLocalStepUpdate(displayStep.id, {
                                                form_id: value ? parseInt(value) : undefined
                                            });
                                        }
                                    }}
                                    placeholder="Nenhum formulário"
                                    disabled={viewMode}
                                />
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea
                                value={stepForm.data.description}
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    stepForm.setData('description', newValue);
                                    if (displayStep) {
                                        onLocalStepUpdate(displayStep.id, { description: newValue });
                                    }
                                }}
                                rows={2}
                                disabled={viewMode}
                            />
                        </div>
                    </div>

                    {/* Dependencies */}
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label>Depende da etapa</Label>
                            <div className="min-h-[40px] px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
                                {(displayStep.display_position || 1) === 1 ? (
                                    "Nenhuma dependência"
                                ) : stepForm.data.depends_on_step_id ? (
                                    (() => {
                                        const dependentStep = steps.find(s => s.id === parseInt(stepForm.data.depends_on_step_id));
                                        return dependentStep ? `${dependentStep.display_position || 1}. ${dependentStep.name}` : "Etapa não encontrada";
                                    })()
                                ) : (
                                    <span className="text-muted-foreground">Use o arrastar e soltar para definir dependências</span>
                                )}
                            </div>
                        </div>
                    </div>



                </div>
            </div>

            {/* CreateWorkCellSheet */}
            <CreateWorkCellSheet
                isOpen={workCellSheetOpen}
                onOpenChange={setWorkCellSheetOpen}
                isNew={true}
                onSuccess={(newWorkCell) => handleWorkCellCreated(newWorkCell)}
                plants={plants}
                shifts={shifts}
                manufacturers={manufacturers}
                unitsOfMeasure={unitsOfMeasure}
            />
        </div>
    );

    // Handler functions
    function handleCreateWorkCellClick() {
        // Blur the current active element to release focus
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setWorkCellSheetOpen(true);
    }

    function handleWorkCellCreated(newWorkCell?: WorkCell) {
        setWorkCellSheetOpen(false);

        // If we received the new work cell directly, use it
        if (newWorkCell && displayStep) {
            // Set the newly created work cell ID in the form
            stepForm.setData('work_cell_id', newWorkCell.id.toString());

            // Update the local state with the new work cell
            onLocalStepUpdate(displayStep.id, {
                work_cell_id: newWorkCell.id,
                work_cell: newWorkCell
            });

            // Focus and highlight the work cell select field
            setTimeout(() => {
                const selectButton = workCellSelectRef.current;
                if (selectButton) {
                    selectButton.focus();
                    // Add a temporary highlight effect with smooth transition
                    selectButton.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
                    setTimeout(() => {
                        selectButton.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                        // Remove transition classes after animation completes
                        setTimeout(() => {
                            selectButton.classList.remove('transition-all', 'duration-300');
                        }, 300);
                    }, 2000);
                }
            }, 100);

            // Reload to get the updated work cells list for the select
            // This preserves state while updating the workCells prop
            router.reload({
                only: ['workCells']
            });
        }
    }
}
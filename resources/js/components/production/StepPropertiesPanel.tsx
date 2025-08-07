import React, { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

import { ItemSelect } from '@/components/ItemSelect';
import CreateWorkCellSheet from '@/components/CreateWorkCellSheet';
import { ManufacturingRoute, ManufacturingStep, WorkCell } from '@/types/production';
import { Form } from '@/types/work-order';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';

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
    }>>;
    stepTypes: Record<string, string>;
    workCells: WorkCell[];
    forms: Form[];
    routing: ManufacturingRoute;

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

    isSaving,
    onLocalStepUpdate,
    isOpen,
    viewMode = false
}: Props) {
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
            "w-[35rem] h-full flex-shrink-0 border-l bg-background flex flex-col overflow-hidden",
            "transform transition-all duration-300 ease-out",
            isVisible
                ? "translate-x-0 opacity-100"
                : "translate-x-full opacity-0"
        )}>


            <ScrollArea className="flex-1 overflow-y-auto">
                <div className={cn(
                    "p-4 space-y-4 transition-all duration-300 delay-100",
                    isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                )}>
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
                                    disabled={viewMode}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(stepTypes).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>



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
                    </div>

                    {/* Form Association */}
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

                    {/* Time Settings */}
                    <div className="space-y-3">
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
                                {displayStep.step_number === 1 ? (
                                    "Nenhuma dependência"
                                ) : stepForm.data.depends_on_step_id ? (
                                    (() => {
                                        const dependentStep = steps.find(s => s.id === parseInt(stepForm.data.depends_on_step_id));
                                        return dependentStep ? `${dependentStep.step_number}. ${dependentStep.name}` : "Etapa não encontrada";
                                    })()
                                ) : (
                                    <span className="text-muted-foreground">Use o arrastar e soltar para definir dependências</span>
                                )}
                            </div>
                        </div>
                    </div>


                </div>
            </ScrollArea>

            {/* CreateWorkCellSheet */}
            <CreateWorkCellSheet
                open={workCellSheetOpen}
                onOpenChange={setWorkCellSheetOpen}
                mode="create"
                onSuccess={handleWorkCellCreated}
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

        if (newWorkCell) {
            // Set the new work cell in the form
            stepForm.setData('work_cell_id', newWorkCell.id.toString());

            // Update local state
            if (selectedStep || lastSelectedStep) {
                const step = selectedStep || lastSelectedStep;
                if (step) {
                    onLocalStepUpdate(step.id, {
                        work_cell_id: newWorkCell.id,
                        work_cell: newWorkCell
                    });
                }
            }

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
        } else {
            // Reload to get the updated work cells
            router.reload({
                only: ['workCells']
            });
        }
    }
}
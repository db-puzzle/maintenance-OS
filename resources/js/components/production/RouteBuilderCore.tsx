import React, { useState, useEffect } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, X, ZoomIn, ZoomOut, Maximize, Edit } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ManufacturingRoute, ManufacturingStep, WorkCell } from '@/types/production';
import { Form } from '@/types/work-order';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import RouteBuilderCanvas from './RouteBuilderCanvas';
import StepPropertiesPanel from './StepPropertiesPanel';
import { StepDeleteDialog } from './StepDeleteDialog';
interface Props {
    routing: ManufacturingRoute & {
        steps: ManufacturingStep[];
    };
    workCells: WorkCell[];
    stepTypes: Record<string, string>;
    forms: Form[];
    can: {
        manage_steps: boolean;
    };
    embedded?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
    viewMode?: boolean;
    onEdit?: () => void;
}
interface ExtendedManufacturingStep extends ManufacturingStep {
    isNew?: boolean;
}
export default function RouteBuilderCore({
    routing,
    workCells,
    stepTypes,
    forms = [],
    can,
    embedded = false,
    onSave,
    onCancel,
    viewMode = false,
    onEdit
}: Props) {
    const [selectedStep, setSelectedStep] = useState<ExtendedManufacturingStep | null>(null);
    const [steps, setSteps] = useState<ExtendedManufacturingStep[]>(
        (routing.steps || []).sort((a, b) => a.step_number - b.step_number)
    );
    const [zoom, setZoom] = useState(100);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedStep, setDraggedStep] = useState<ExtendedManufacturingStep | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // Track deleted steps
    const [deletedStepIds, setDeletedStepIds] = useState<number[]>([]);
    // Track if there are unsaved changes
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [stepToDelete, setStepToDelete] = useState<ExtendedManufacturingStep | null>(null);
    const form = useForm({
        name: routing.name,
        description: routing.description || '',
        is_active: routing.is_active,
    });
    const stepForm = useForm<{
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
    }>({
        name: '',
        description: '',
        step_type: 'standard',
        work_cell_id: '',
        setup_time_minutes: 0,
        cycle_time_minutes: 0,
        depends_on_step_id: '',
        can_start_when_dependency: 'completed',
        quality_check_mode: 'every_part',
        sampling_size: 0,
        form_id: '',
    });
    useEffect(() => {
        if (selectedStep) {
            stepForm.setData({
                name: selectedStep.name || '',
                description: selectedStep.description || '',
                step_type: selectedStep.step_type || 'standard',
                work_cell_id: selectedStep.work_cell_id?.toString() || '',
                setup_time_minutes: selectedStep.setup_time_minutes || 0,
                cycle_time_minutes: selectedStep.cycle_time_minutes || 0,
                depends_on_step_id: selectedStep.depends_on_step_id?.toString() || '',
                can_start_when_dependency: selectedStep.can_start_when_dependency || 'completed',
                quality_check_mode: selectedStep.quality_check_mode || 'every_part',
                sampling_size: selectedStep.sampling_size || 0,
                form_id: selectedStep.form_id?.toString() || '',
            });
        }
    }, [selectedStep]);
    const handleSave = () => {
        // Validate that all non-first steps have dependencies
        const invalidSteps = steps.filter(step => step.step_number > 1 && !step.depends_on_step_id);
        if (invalidSteps.length > 0) {
            toast.error(`As seguintes etapas precisam ter dependências: ${invalidSteps.map(s => s.name).join(', ')}`);
            return;
        }
        setIsSaving(true);
        // Prepare the data for batch save
        const saveData = {
            // Route info
            route_name: form.data.name,
            route_description: form.data.description,
            is_active: form.data.is_active,
            // Steps to delete
            deleted_step_ids: deletedStepIds,
            // Steps to create/update
            steps: steps.map(step => ({
                id: step.isNew ? null : step.id,
                step_number: step.step_number,
                name: step.name,
                description: step.description,
                step_type: step.step_type,
                work_cell_id: step.work_cell_id,
                setup_time_minutes: step.setup_time_minutes,
                cycle_time_minutes: step.cycle_time_minutes,
                depends_on_step_id: step.depends_on_step_id,
                can_start_when_dependency: step.can_start_when_dependency,
                quality_check_mode: step.quality_check_mode,
                sampling_size: step.sampling_size,
                form_id: step.form_id,
                is_new: step.isNew || false,
            }))
        };
        // Make a single request to save everything
        router.post(route('production.routing.batch-update', routing.id), saveData, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Roteiro salvo com sucesso');
                setHasUnsavedChanges(false);
                // If we have an onSave callback, call it instead of reloading
                if (onSave) {
                    onSave();
                } else {
                    // Reload to get fresh data from server
                    router.reload();
                }
            },
            onError: (errors) => {
                toast.error('Erro ao salvar roteiro');
                console.error(errors);
            },
            onFinish: () => {
                setIsSaving(false);
            }
        });
    };
    const handleCancel = () => {
        if (embedded && onCancel) {
            onCancel();
            return;
        }
        window.history.back();
    };
    const handleAddStep = () => {
        // Find the maximum step number to ensure uniqueness
        const maxStepNumber = steps.reduce((max, step) =>
            Math.max(max, step.step_number), 0
        );
        // Find the step with the highest step_number to use as dependency
        const previousStep = steps.reduce((prev, current) =>
            (!prev || current.step_number > prev.step_number) ? current : prev,
            null as ExtendedManufacturingStep | null
        );
        const newStep: ExtendedManufacturingStep = {
            id: Date.now(), // Temporary ID
            manufacturing_route_id: routing.id,
            step_number: maxStepNumber + 1, // Use max + 1 instead of array length
            name: `Nova Etapa ${maxStepNumber + 1}`,
            step_type: 'standard',
            status: 'pending',
            setup_time_minutes: 0,
            cycle_time_minutes: 0,
            depends_on_step_id: previousStep ? previousStep.id : undefined,
            can_start_when_dependency: 'completed',
            isNew: true, // Mark as new step
        };
        setSteps([...steps, newStep]);
        setSelectedStep(newStep);
        setHasUnsavedChanges(true);
    };
    const updateStepInLocalState = (stepId: number, updates: Partial<ExtendedManufacturingStep>) => {
        const updatedSteps = steps.map(step =>
            step.id === stepId ? { ...step, ...updates } : step
        );
        setSteps(updatedSteps);
        setHasUnsavedChanges(true);
        // Update selected step if it's the one being modified
        if (selectedStep?.id === stepId) {
            const updatedStep = updatedSteps.find(s => s.id === stepId);
            if (updatedStep) {
                setSelectedStep(updatedStep);
            }
        }
    };
    const handleShowDeleteDialog = (step: ExtendedManufacturingStep) => {
        setStepToDelete(step);
        setDeleteDialogOpen(true);
    };
    const handleConfirmDelete = async () => {
        if (!stepToDelete) return;
        const stepId = stepToDelete.id;
        if (!stepToDelete.isNew) {
            // Track existing step for deletion on save
            setDeletedStepIds([...deletedStepIds, stepId]);
        }
        // Find the step before the one being deleted to update dependencies
        const deletedStepNumber = stepToDelete.step_number;
        const previousStep = steps
            .filter(s => s.step_number < deletedStepNumber)
            .sort((a, b) => b.step_number - a.step_number)[0];
        // Remove from local state and update dependencies
        const updatedSteps = steps
            .filter(step => step.id !== stepId)
            .map((step, index) => {
                const newStep = { ...step, step_number: index + 1 };
                // If this step depended on the deleted step, update its dependency
                if (step.depends_on_step_id === stepId) {
                    newStep.depends_on_step_id = previousStep?.id || undefined;
                    // If this is now the second step and has no dependency, that's an error
                    if (newStep.step_number > 1 && !newStep.depends_on_step_id) {
                        // Find the step with step_number = 1
                        const firstStep = steps.find(s => s.id !== stepId && s.step_number === 1);
                        if (firstStep) {
                            newStep.depends_on_step_id = firstStep.id;
                        }
                    }
                }
                return newStep;
            });
        setSteps(updatedSteps);
        setHasUnsavedChanges(true);
        if (selectedStep?.id === stepId) {
            setSelectedStep(null);
        }
        setStepToDelete(null);
    };
    const handleStepReorder = (updatedSteps: ExtendedManufacturingStep[]) => {
        setSteps(updatedSteps);
        setHasUnsavedChanges(true);
    };
    return (
        <div className={embedded ? "flex flex-col h-full overflow-hidden" : "h-[calc(100vh-8rem)] flex flex-col overflow-hidden"}>
            {/* Fixed Header Bar */}
            <div className="flex-shrink-0 bg-background border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {viewMode ? (
                        <h2 className="text-lg font-medium">{form.data.name}</h2>
                    ) : (
                        <Input
                            value={form.data.name}
                            onChange={(e) => {
                                form.setData('name', e.target.value);
                                setHasUnsavedChanges(true);
                            }}
                            className="text-lg font-medium w-64"
                        />
                    )}
                    {viewMode ? (
                        <Badge variant={routing.is_active ? 'default' : 'secondary'}>
                            {routing.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Switch
                                id="route-active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) => {
                                    form.setData('is_active', checked);
                                    setHasUnsavedChanges(true);
                                }}
                            />
                            <Label htmlFor="route-active" className="text-sm">
                                {form.data.is_active ? 'Ativo' : 'Rascunho'}
                            </Label>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.max(50, zoom - 10))}
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground w-12 text-center">
                        {zoom}%
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.min(150, zoom + 10))}
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(100)}
                    >
                        <Maximize className="h-4 w-4" />
                    </Button>
                    <div className="ml-4 flex gap-2">
                        {viewMode ? (
                            <>
                                {!embedded && (
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Voltar
                                    </Button>
                                )}
                                {can.manage_steps && onEdit && (
                                    <Button
                                        onClick={onEdit}
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={cn(hasUnsavedChanges && "animate-pulse")}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSaving ? 'Salvando...' : (hasUnsavedChanges ? 'Salvar Alterações' : 'Salvar')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex-1 flex overflow-hidden relative">
                {/* Main Canvas with transition */}
                <div className={cn(
                    "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-out",
                    selectedStep ? "pr-[35rem]" : "pr-0"
                )}>
                    <RouteBuilderCanvas
                        steps={steps}
                        selectedStep={selectedStep}
                        zoom={zoom}
                        can={can}
                        onStepSelect={setSelectedStep}
                        onStepAdd={handleAddStep}
                        onStepReorder={handleStepReorder}
                        onStepDelete={handleShowDeleteDialog}
                        isDragging={isDragging}
                        onDragStart={setIsDragging}
                        draggedStep={draggedStep}
                        onDraggedStepChange={setDraggedStep}
                        isPanelOpen={!!selectedStep}
                        viewMode={viewMode}
                    />
                </div>
                {/* Right Sidebar - Properties Panel */}
                <div className="absolute inset-y-0 right-0 z-10">
                    <StepPropertiesPanel
                        selectedStep={selectedStep}
                        steps={steps}
                        stepForm={stepForm}
                        stepTypes={stepTypes}
                        workCells={workCells}
                        forms={forms}
                        routing={routing}
                        isSaving={isSaving}
                        onLocalStepUpdate={updateStepInLocalState}
                        isOpen={!!selectedStep}
                        viewMode={viewMode}
                    />
                </div>
            </div>
            {/* Delete Confirmation Dialog */}
            <StepDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                stepName={stepToDelete?.name || ''}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
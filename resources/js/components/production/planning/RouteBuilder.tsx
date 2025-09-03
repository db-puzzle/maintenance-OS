import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Save,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    ZoomIn,
    ZoomOut,
    Maximize,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import CreateWorkCellSheet from '@/components/production/CreateWorkCellSheet';
import { ManufacturingOrder, WorkCell } from '@/types';
import RouteBuilderCanvas from '@/components/production/RouteBuilderCanvas';
import StepPropertiesPanel from '@/components/production/StepPropertiesPanel';

interface RouteStep {
    id: string | number;
    sequence: number;
    name: string;
    description?: string;
    work_cell_id: number | null;
    setup_time_minutes?: number;
    cycle_time_minutes?: number;
    step_type: 'standard' | 'quality_check' | 'rework';
    is_required: boolean;
}

interface RouteTemplate {
    id: number;
    name: string;
    description?: string;
    steps: RouteStep[];
}

interface RouteBuilderProps {
    manufacturingOrder: ManufacturingOrder;
    workCells: WorkCell[];
    onDirtyChange: (isDirty: boolean) => void;
    onSave?: () => void;
    permissions: {
        canEditRoute: boolean;
        canSaveAsTemplate: boolean;
        canCreateWorkCell: boolean;
    };
}

export default function RouteBuilder({
    manufacturingOrder,
    workCells,
    onDirtyChange,
    onSave,
    permissions,
}: RouteBuilderProps) {
    const [steps, setSteps] = useState<RouteStep[]>([]);
    const [selectedStep, setSelectedStep] = useState<RouteStep | null>(null);
    const [showCreateWorkCell, setShowCreateWorkCell] = useState(false);
    const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedStep, setDraggedStep] = useState<RouteStep | null>(null);
    const [zoom, setZoom] = useState(100);

    // Form for editing step details
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

    // Load existing route
    useEffect(() => {
        if (manufacturingOrder.manufacturingRoute) {
            const routeSteps: RouteStep[] = (manufacturingOrder.manufacturingRoute.steps || []).map((step, index) => ({
                id: step.id?.toString() || `existing-${index}`,
                sequence: step.sequence || index + 1,
                name: step.name,
                description: step.description,
                work_cell_id: step.work_cell_id,
                setup_time_minutes: step.setup_time_minutes,
                cycle_time_minutes: step.cycle_time_minutes,
                step_type: step.step_type || 'standard',
                is_required: step.is_required ?? true,
            }));
            setSteps(routeSteps);
        }
    }, [manufacturingOrder]);

    // Track dirty state
    useEffect(() => {
        const hasChanges = JSON.stringify(steps) !== JSON.stringify(manufacturingOrder.manufacturingRoute?.steps || []);
        onDirtyChange(hasChanges);
    }, [steps, manufacturingOrder.manufacturingRoute?.steps, onDirtyChange]);

    // Calculate route statistics
    const routeStats = useMemo(() => {
        const configuredSteps = steps.filter(s => s.work_cell_id).length;
        const totalSetupTime = steps.reduce((sum, s) => sum + (s.setup_time_minutes || 0), 0);
        const totalCycleTime = steps.reduce((sum, s) => sum + (s.cycle_time_minutes || 0), 0);

        return {
            totalSteps: steps.length,
            configuredSteps,
            totalSetupTime,
            totalCycleTime,
            totalTime: totalSetupTime + totalCycleTime,
            isComplete: configuredSteps === steps.length && steps.length > 0,
        };
    }, [steps]);

    // Add new step
    const handleAddStep = useCallback(() => {
        const newStep: RouteStep = {
            id: `temp-${Date.now()}`,
            sequence: steps.length + 1,
            name: `Step ${steps.length + 1}`,
            work_cell_id: null,
            step_type: 'standard',
            is_required: true,
        };
        setSteps([...steps, newStep]);
        setSelectedStep(newStep);
    }, [steps]);

    // Delete step
    const handleDeleteStep = useCallback((index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        // Update sequence numbers
        newSteps.forEach((step, i) => {
            step.sequence = i + 1;
        });
        setSteps(newSteps);

        // Clear selection if deleted step was selected
        if (selectedStep && steps[index].id === selectedStep.id) {
            setSelectedStep(null);
        }
    }, [steps, selectedStep]);

    // Save route
    const handleSaveRoute = async () => {
        setIsSaving(true);

        try {
            await router.post(
                route('production.planning.orders.save-route', manufacturingOrder.id),
                {
                    steps: steps.map(step => ({
                        sequence: step.sequence,
                        name: step.name,
                        description: step.description,
                        work_cell_id: step.work_cell_id,
                        setup_time_minutes: step.setup_time_minutes || 0,
                        cycle_time_minutes: step.cycle_time_minutes || 0,
                        step_type: step.step_type,
                        is_required: step.is_required,
                    })),
                },
                {
                    onSuccess: () => {
                        toast.success('Route saved successfully');
                        if (onSave) onSave();
                    },
                    onError: () => {
                        toast.error('Failed to save route');
                    },
                    onFinish: () => {
                        setIsSaving(false);
                    },
                }
            );
        } catch (error) {
            console.error('Error saving route:', error);
            setIsSaving(false);
        }
    };

    // Save as template
    const handleSaveAsTemplate = async () => {
        if (!templateName) {
            toast.error('Please enter a template name');
            return;
        }

        setIsSaving(true);

        try {
            await router.post(
                route('production.planning.routes.save-as-template'),
                {
                    name: templateName,
                    description: templateDescription,
                    manufacturing_order_id: manufacturingOrder.id,
                    steps: steps.map(step => ({
                        sequence: step.sequence,
                        name: step.name,
                        description: step.description,
                        work_cell_id: step.work_cell_id,
                        setup_time_minutes: step.setup_time_minutes || 0,
                        cycle_time_minutes: step.cycle_time_minutes || 0,
                        step_type: step.step_type,
                        is_required: step.is_required,
                    })),
                },
                {
                    onSuccess: () => {
                        toast.success('Template saved successfully');
                        setShowSaveAsTemplate(false);
                        setTemplateName('');
                        setTemplateDescription('');
                    },
                    onError: () => {
                        toast.error('Failed to save template');
                    },
                    onFinish: () => {
                        setIsSaving(false);
                    },
                }
            );
        } catch (error) {
            console.error('Error saving template:', error);
            setIsSaving(false);
        }
    };

    // Convert steps to canvas format
    const canvasSteps = useMemo(() => steps.map(step => ({
        id: step.id.toString(),
        step_number: step.sequence,
        name: step.name,
        depends_on_step_id: step.sequence > 1 ? steps[step.sequence - 2]?.id?.toString() : undefined,
        can_start_when_dependency: 'completed' as const,
        work_cell: step.work_cell_id ? workCells.find(wc => wc.id === step.work_cell_id) : undefined,
        setup_time_minutes: step.setup_time_minutes || 0,
        cycle_time_minutes: step.cycle_time_minutes || 0,
        is_quality_check: step.step_type === 'quality_check',
        require_validation: false,
        instructions: step.description || '',
        is_required: step.is_required,
        step_type: step.step_type,
        status: 'pending' as const,
    })), [steps, workCells]);

    // Convert selected step to canvas format
    const canvasSelectedStep = useMemo(() => {
        if (!selectedStep) return null;
        return canvasSteps.find(s => s.id === selectedStep.id.toString()) || null;
    }, [selectedStep, canvasSteps]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h3 className="text-lg font-medium">Route Configuration</h3>
                            <p className="text-sm text-muted-foreground">
                                {manufacturingOrder.item_number} - {manufacturingOrder.item?.name}
                            </p>
                        </div>
                        <Badge
                            variant={routeStats.isComplete ? "default" : "secondary"}
                            className={routeStats.isComplete ? "bg-green-100 text-green-800" : ""}
                        >
                            {routeStats.configuredSteps}/{routeStats.totalSteps} steps configured
                        </Badge>
                        <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Total time: {routeStats.totalTime} min
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Zoom Controls */}
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
                            {permissions.canSaveAsTemplate && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowSaveAsTemplate(true)}
                                    disabled={steps.length === 0}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Save as Template
                                </Button>
                            )}
                            {permissions.canEditRoute && (
                                <Button
                                    size="sm"
                                    onClick={handleSaveRoute}
                                    disabled={isSaving}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSaving ? 'Saving...' : 'Save Route'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Route Status */}
                <div className="flex items-center gap-4 mt-4">
                    <Badge
                        variant={routeStats.isComplete ? "default" : "secondary"}
                        className={cn(
                            "gap-1",
                            routeStats.isComplete ? "bg-green-100 text-green-800" : ""
                        )}
                    >
                        {routeStats.isComplete ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {routeStats.isComplete ? "Ready" : "In Progress"}
                    </Badge>
                </div>
            </div>

            {/* Main Content - Canvas and Properties Panel */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Canvas area with transition */}
                <div className={cn(
                    "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-out",
                    selectedStep ? "pr-[35rem]" : "pr-0"
                )}>
                    <RouteBuilderCanvas
                        steps={canvasSteps}
                        selectedStep={canvasSelectedStep}
                        zoom={zoom}
                        can={{ manage_steps: permissions.canEditRoute }}
                        onStepSelect={(step) => {
                            if (step) {
                                const routeStep = steps.find(s => s.id.toString() === step.id);
                                setSelectedStep(routeStep || null);
                            } else {
                                setSelectedStep(null);
                            }
                        }}
                        onStepAdd={handleAddStep}
                        onStepReorder={(updatedSteps) => {
                            const newSteps = updatedSteps.map((step, index) => ({
                                id: step.id,
                                sequence: index + 1,
                                name: step.name,
                                description: step.instructions,
                                work_cell_id: step.work_cell?.id || null,
                                setup_time_minutes: step.setup_time_minutes,
                                cycle_time_minutes: step.cycle_time_minutes,
                                step_type: step.step_type || 'standard',
                                is_required: step.is_required ?? true,
                            }));
                            setSteps(newSteps);
                        }}
                        onStepDelete={(step) => {
                            const index = steps.findIndex(s => s.id.toString() === step.id);
                            if (index >= 0) {
                                handleDeleteStep(index);
                            }
                        }}
                        isDragging={isDragging}
                        onDragStart={setIsDragging}
                        draggedStep={draggedStep ? canvasSteps.find(s => s.id === draggedStep.id.toString()) || null : null}
                        onDraggedStepChange={(step) => {
                            if (step) {
                                const routeStep = steps.find(s => s.id.toString() === step.id);
                                setDraggedStep(routeStep || null);
                            } else {
                                setDraggedStep(null);
                            }
                        }}
                        isPanelOpen={!!selectedStep}
                        viewMode={!permissions.canEditRoute}
                    />
                </div>

                {/* Step Properties Panel - Absolute positioned */}
                <div className="absolute inset-y-0 right-0 z-10">
                    <StepPropertiesPanel
                        selectedStep={canvasSelectedStep}
                        steps={canvasSteps}
                        stepForm={stepForm}
                        stepTypes={{
                            standard: 'Standard',
                            quality_check: 'Quality Check',
                            rework: 'Rework'
                        }}
                        workCells={workCells}
                        forms={[]}
                        routing={{
                            id: manufacturingOrder.manufacturingRoute?.id || 0,
                            name: manufacturingOrder.manufacturingRoute?.name || '',
                        }}
                        plants={[]}
                        shifts={[]}
                        manufacturers={[]}
                        isSaving={isSaving}
                        onLocalStepUpdate={(stepId, updates) => {
                            const index = steps.findIndex(s => s.id.toString() === stepId.toString());
                            if (index >= 0) {
                                const newSteps = [...steps];
                                newSteps[index] = {
                                    ...steps[index],
                                    name: updates.name || steps[index].name,
                                    description: updates.instructions || steps[index].description,
                                    work_cell_id: updates.work_cell?.id || steps[index].work_cell_id,
                                    setup_time_minutes: updates.setup_time_minutes ?? steps[index].setup_time_minutes,
                                    cycle_time_minutes: updates.cycle_time_minutes ?? steps[index].cycle_time_minutes,
                                    is_required: updates.is_required ?? steps[index].is_required,
                                    step_type: updates.step_type || steps[index].step_type,
                                };
                                setSteps(newSteps);
                                setSelectedStep(newSteps[index]);
                            }
                        }}
                        isOpen={!!selectedStep}
                        viewMode={!permissions.canEditRoute}
                    />
                </div>
            </div>

            {/* Create Work Cell Sheet */}
            {permissions.canCreateWorkCell && (
                <CreateWorkCellSheet
                    isOpen={showCreateWorkCell}
                    onOpenChange={setShowCreateWorkCell}
                    onSuccess={(_newWorkCell) => {
                        setShowCreateWorkCell(false);
                    }}
                />
            )}

            {/* Save as Template Dialog */}
            <AlertDialog open={showSaveAsTemplate} onOpenChange={setShowSaveAsTemplate}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save Route as Template</AlertDialogTitle>
                        <AlertDialogDescription>
                            Create a reusable template from this route configuration.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input
                                id="template-name"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g., Standard Assembly Route"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="template-description">Description (Optional)</Label>
                            <Textarea
                                id="template-description"
                                value={templateDescription}
                                onChange={(e) => setTemplateDescription(e.target.value)}
                                placeholder="Describe when to use this template..."
                                className="mt-1"
                                rows={3}
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSaveAsTemplate}>
                            Save Template
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}